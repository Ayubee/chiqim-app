import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

test("V1 PostgreSQL migration, RLS, sync and admin invariants", async (t) => {
  const db = new PGlite();
  const admin = randomUUID(),
    seller = randomUUID(),
    other = randomUUID(),
    outsider = randomUUID(),
    store = randomUUID(),
    second = randomUUID();
  await db.exec(`create role anon; create role authenticated; create schema auth;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema public,auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;`);
  const migrations = (
    await readdir(new URL("../supabase/migrations/", import.meta.url))
  )
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of migrations)
    await db.exec(
      await readFile(
        new URL(`../supabase/migrations/${file}`, import.meta.url),
        "utf8",
      ),
    );
  await db.query("insert into auth.users values ($1),($2),($3),($4)", [
    admin,
    seller,
    other,
    outsider,
  ]);
  await db.query(
    "insert into public.profiles(id,full_name,role) values ($1,'Admin','admin')",
    [admin],
  );
  const user = async (id, fn) => {
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    await db.exec("set role authenticated");
    try {
      return await fn();
    } finally {
      await db.exec("reset role");
    }
  };
  const rpc = async (action, data = {}) =>
    (
      await db.query("select public.admin_command($1,$2) result", [
        action,
        data,
      ])
    ).rows[0].result;
  await t.test(
    "authenticated admin receives empty arrays from a new database",
    async () => {
      await user(admin, async () => {
        assert.deepEqual(await rpc("dashboard"), { stores: [], profiles: [] });
      });
    },
  );
  await db.query(
    "insert into public.stores(id,name) values ($1,'Chilonzor'),($2,'Yunusobod')",
    [store, second],
  );
  await db.query(
    `insert into public.profiles(id,full_name,store_id,role) values ($1,'Ali',$3,'seller'),($2,'Vali',$3,'seller')`,
    [seller, other, store],
  );
  const today = (
    await db.query(
      "select (clock_timestamp() at time zone 'Asia/Tashkent')::date::text d",
    )
  ).rows[0].d;
  const yesterday = (
    await db.query(
      "select ((clock_timestamp() at time zone 'Asia/Tashkent')::date-1)::text d",
    )
  ).rows[0].d;
  const operation = (amount = 12000, date = today) => ({
    operation_id: randomUUID(),
    type: "create",
    expense: {
      id: randomUUID(),
      amount_uzs: amount,
      note: "Yo‘l xarajati",
      expense_date: date,
      occurred_at: new Date().toISOString(),
    },
  });
  const sync = async (op, st = store, v = 1) =>
    (await db.query("select public.sync_expense($1,$2,$3) result", [op, st, v]))
      .rows[0].result;
  const first = operation();
  await t.test(
    "first create, duplicate, new operation same expense, content conflict",
    async () => {
      await user(seller, async () => {
        assert.equal((await sync(first)).status, "accepted");
        assert.equal((await sync(first)).status, "duplicate");
        assert.equal(
          (await sync({ ...first, operation_id: randomUUID() })).status,
          "duplicate",
        );
        assert.equal(
          (
            await sync({
              ...first,
              expense: { ...first.expense, amount_uzs: 9 },
            })
          ).error_code,
          "CONFLICT",
        );
        assert.equal(
          (
            await sync({
              ...first,
              expense: { ...first.expense, id: randomUUID() },
            })
          ).error_code,
          "CONFLICT",
        );
      });
      assert.equal(
        (
          await db.query(
            "select count(*)::int n,sum(amount_uzs)::text total from public.expenses",
          )
        ).rows[0].total,
        "12000",
      );
    },
  );
  await t.test(
    "RLS isolates profiles, expenses, audits, devices and stores",
    async () => {
      await user(other, async () => {
        assert.equal(
          (await db.query("select * from public.expenses")).rows.length,
          0,
        );
        assert.equal(
          (await db.query("select * from public.profiles")).rows.length,
          1,
        );
        assert.equal(
          (await db.query("select * from public.stores")).rows.length,
          1,
        );
        assert.equal(
          (await db.query("select * from public.expense_audit")).rows.length,
          0,
        );
        assert.equal((await sync(first)).error_code, "CONFLICT");
      });
      await user(outsider, async () =>
        assert.equal((await sync(operation())).error_code, "FORBIDDEN"),
      );
    },
  );
  await t.test(
    "clients cannot escalate role/store or bypass server writes",
    async () => {
      await user(seller, async () => {
        await assert.rejects(
          db.query(
            "update public.profiles set role='admin',store_id=$1 where id=$2",
            [second, seller],
          ),
          /permission denied/i,
        );
        await assert.rejects(
          rpc("save_store", { name: "attack" }),
          /FORBIDDEN/,
        );
        await assert.rejects(
          db.query("delete from public.expenses where id=$1", [
            first.expense.id,
          ]),
          /permission denied/i,
        );
        await assert.rejects(
          db.query("insert into public.stores(name) values ('attack')"),
          /permission denied/i,
        );
        await assert.rejects(
          db.query("select * from private.sync_operations"),
          /permission denied/i,
        );
      });
      await db.exec("set role anon");
      try {
        await assert.rejects(
          db.query("select public.sync_expense($1,null,null)", [first]),
          /permission denied/i,
        );
      } finally {
        await db.exec("reset role");
      }
    },
  );
  const late = operation(5000, yesterday),
    partner = operation(3000);
  await t.test(
    "partial sync retry, last sync requires committed operations",
    async () => {
      await user(seller, async () => {
        assert.equal((await sync(late)).status, "accepted");
        await assert.rejects(
          db.query("select public.finish_expense_sync($1,$2)", [
            randomUUID(),
            [randomUUID()],
          ]),
          /INVALID_OPERATION/,
        );
        assert.equal(
          (await db.query("select * from public.device_sync")).rows.length,
          0,
        );
        assert.equal((await sync(late)).status, "duplicate");
        assert.equal((await sync(first)).status, "duplicate");
        await db.query("select public.finish_expense_sync($1,$2)", [
          randomUUID(),
          [first.operation_id, late.operation_id],
        ]);
        assert.equal(
          (await db.query("select * from public.device_sync")).rows.length,
          1,
        );
      });
      await user(other, async () =>
        assert.equal((await sync(partner)).status, "accepted"),
      );
    },
  );
  await t.test(
    "Tashkent day boundary, late uploads, multi-seller sum",
    async () => {
      const day = (
        await db.query(
          "select ('2026-10-08T19:01:00Z'::timestamptz at time zone 'Asia/Tashkent')::date::text d",
        )
      ).rows[0].d;
      assert.equal(day, "2026-10-09");
      await user(admin, async () => {
        const dash = await rpc("dashboard");
        assert.equal(
          dash.stores.find((x) => x.id === store).today_total,
          "15000",
        );
        const report = await rpc("report", {
          store_id: store,
          from: yesterday,
          to: yesterday,
        });
        assert.equal(report.total, "5000");
        assert.equal(report.rows[0].expense_date, yesterday);
      });
    },
  );
  await t.test(
    "amount, note, dates, context and time validated on DB boundary",
    async () => {
      await user(seller, async () => {
        for (const [change, code] of [
          [{ amount_uzs: 0 }, "INVALID_AMOUNT"],
          [{ amount_uzs: 1.5 }, "INVALID_AMOUNT"],
          [{ amount_uzs: "4" }, "INVALID_AMOUNT"],
          [{ note: " " }, "INVALID_NOTE"],
          [{ expense_date: "2026-02-30" }, "INVALID_DATE"],
          [{ expense_date: "2999-01-01" }, "INVALID_DATE"],
          [{ occurred_at: "2026-01-01T00:00:00" }, "INVALID_TIME"],
        ]) {
          const op = operation();
          op.expense = { ...op.expense, ...change };
          assert.equal((await sync(op)).error_code, code);
        }
        assert.equal(
          (await sync(operation(), null, null)).error_code,
          "STORE_CONTEXT_REQUIRED",
        );
      });
    },
  );
  await t.test(
    "admin optimistic concurrency, cancellation and immutable audit",
    async () => {
      await user(admin, async () => {
        const edited = await rpc("edit_expense", {
          id: first.expense.id,
          expected_version: 1,
          amount_uzs: 14000,
          note: "Tuzatildi",
          expense_date: today,
        });
        assert.equal(edited.version, 2);
        await assert.rejects(
          rpc("edit_expense", {
            id: first.expense.id,
            expected_version: 1,
            amount_uzs: 1,
            note: "stale",
            expense_date: today,
          }),
          /VERSION_CONFLICT/,
        );
        const cancelled = await rpc("cancel_expense", {
          id: first.expense.id,
          expected_version: 2,
        });
        assert.equal(cancelled.version, 3);
        assert.ok(cancelled.deleted_at);
        const audit = (
          await db.query(
            "select * from public.expense_audit where expense_id=$1 order by id",
            [first.expense.id],
          )
        ).rows;
        assert.equal(audit.length, 3);
        assert.equal(audit[1].old_values.amount_uzs, 12000);
        assert.equal(audit[2].actor_id, admin);
        assert.equal(
          (await rpc("dashboard")).stores.find((x) => x.id === store)
            .today_total,
          "3000",
        );
        await assert.rejects(
          db.query("delete from public.expense_audit"),
          /permission denied/i,
        );
      });
      await user(seller, async () => {
        const r = await sync(first);
        assert.equal(r.status, "duplicate");
        assert.equal(r.version, 3);
      });
    },
  );
  await t.test(
    "assignment change rejects pending creates, preserves acknowledged duplicate",
    async () => {
      const pending = operation();
      await user(admin, () =>
        rpc("save_seller", {
          id: seller,
          full_name: "Ali",
          store_id: second,
          is_active: true,
          expected_assignment_version: 1,
        }),
      );
      await user(seller, async () => {
        assert.equal(
          (await sync(pending)).error_code,
          "STORE_ASSIGNMENT_CHANGED",
        );
        assert.equal((await sync(first)).status, "duplicate");
        assert.equal((await sync(operation(), second, 2)).status, "accepted");
      });
      await user(admin, () =>
        rpc("save_seller", {
          id: seller,
          full_name: "Ali",
          store_id: store,
          is_active: true,
          expected_assignment_version: 2,
        }),
      );
      await user(seller, async () =>
        assert.equal(
          (await sync(pending)).error_code,
          "STORE_ASSIGNMENT_CHANGED",
        ),
      );
    },
  );
  await t.test(
    "deactivated profile and store cannot sync, admin can resolve historical expense",
    async () => {
      await user(admin, () =>
        rpc("save_seller", {
          id: seller,
          full_name: "Ali",
          store_id: store,
          is_active: false,
          expected_assignment_version: 3,
        }),
      );
      await user(seller, async () => {
        assert.equal(
          (await sync(operation(), store, 3)).error_code,
          "INACTIVE_PROFILE",
        );
        assert.equal(
          (await db.query("select * from public.expenses")).rows.length,
          0,
        );
      });
      await user(admin, async () => {
        await rpc("save_seller", {
          id: seller,
          full_name: "Ali",
          store_id: store,
          is_active: true,
          expected_assignment_version: 3,
        });
        await rpc("save_store", {
          id: store,
          name: "Chilonzor",
          is_active: false,
        });
      });
      await user(seller, async () =>
        assert.equal(
          (await sync(operation(), store, 3)).error_code,
          "INACTIVE_STORE",
        ),
      );
      await user(admin, async () => {
        const deactivated = await rpc("save_seller", {
          id: seller,
          full_name: "Ali",
          store_id: store,
          is_active: false,
          expected_assignment_version: 3,
        });
        assert.equal(deactivated.is_active, false);
        const op = operation();
        const resolved = await rpc("admin_record_expense", {
          ...op.expense,
          seller_id: seller,
          store_id: store,
        });
        assert.equal(resolved.store_id, store);
        assert.equal(
          (
            await db.query(
              "select * from public.expense_audit where expense_id=$1",
              [resolved.id],
            )
          ).rows[0].actor_id,
          admin,
        );
      });
    },
  );
  await t.test(
    "expense + audit + operation acknowledgement rollback atomically",
    async () => {
      await user(admin, () =>
        rpc("save_store", { id: store, name: "Chilonzor", is_active: true }),
      );
      const failed = operation();
      failed.expense.note = "FORCE_ROLLBACK";
      await db.exec(`create function private.test_failure() returns trigger language plpgsql as $$ begin if new.note='FORCE_ROLLBACK' then raise exception 'SIMULATED_FAILURE'; end if; return new; end $$;
  create trigger zz_test_failure after insert on public.expenses for each row execute function private.test_failure();`);
      await user(
        other,
        async () => await assert.rejects(sync(failed), /SIMULATED_FAILURE/),
      );
      assert.equal(
        (
          await db.query("select * from public.expenses where id=$1", [
            failed.expense.id,
          ])
        ).rows.length,
        0,
      );
      assert.equal(
        (
          await db.query(
            "select * from private.sync_operations where operation_id=$1",
            [failed.operation_id],
          )
        ).rows.length,
        0,
      );
      assert.equal(
        (
          await db.query(
            "select * from public.expense_audit where expense_id=$1",
            [failed.expense.id],
          )
        ).rows.length,
        0,
      );
      await db.exec(
        "drop trigger zz_test_failure on public.expenses; drop function private.test_failure();",
      );
      await user(other, async () =>
        assert.equal((await sync(failed)).status, "accepted"),
      );
    },
  );
  await t.test(
    "admin SQL report pages count all records and uses exact numeric totals",
    async () => {
      await user(admin, async () => {
        const r = await rpc("report", {
          store_id: store,
          from: yesterday,
          to: today,
          limit: 1,
          offset: 0,
        });
        assert.equal(r.rows.length, 1);
        assert.ok(r.count > 1);
        assert.match(r.total, /^\d+$/);
        const exported = await rpc("export", {
          store_id: store,
          from: yesterday,
          to: today,
        });
        assert.ok(exported.rows.every((row) => !row.deleted_at));
        assert.equal(
          exported.rows
            .reduce((sum, row) => sum + BigInt(row.amount_uzs), 0n)
            .toString(),
          exported.total,
        );
        assert.equal(exported.rows.length, exported.count);
      });
    },
  );
  await db.close();
});
