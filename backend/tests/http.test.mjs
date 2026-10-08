import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createSyncHandler } from "../supabase/functions/_shared/sync-handler.ts";
import { HttpError } from "../supabase/functions/_shared/http.ts";
import { createAdminUsersHandler } from "../supabase/functions/_shared/admin-users-handler.ts";
const origin = "http://localhost:5173";
const op = () => ({
  operation_id: randomUUID(),
  type: "create",
  expense: {
    id: randomUUID(),
    amount_uzs: 1200,
    note: "Test",
    expense_date: "2026-01-01",
    occurred_at: "2026-01-01T00:00:00Z",
  },
});
const request = (body, headers = {}) =>
  new Request("http://localhost/sync", {
    method: "POST",
    headers: { "content-type": "application/json", origin, ...headers },
    body: JSON.stringify(body),
  });
test("HTTP sync acks each independent operation and never finalizes partial failure", async () => {
  let calls = 0,
    finalized = false;
  const operations = [op(), op(), op()];
  const handler = createSyncHandler(
    async () => ({
      userId: randomUUID(),
      role: "seller",
      client: {
        rpc: async (name, args) => {
          if (name === "finish_expense_sync") {
            finalized = true;
            return { data: null, error: null };
          }
          calls++;
          if (calls === 2)
            return { data: null, error: { message: "transport interruption" } };
          return {
            data: {
              operation_id: args.operation.operation_id,
              expense_id: args.operation.expense.id,
              status: "accepted",
              version: 1,
            },
            error: null,
          };
        },
      },
    }),
    [origin],
  );
  const response = await handler(
    request({ device_id: randomUUID(), operations }),
  );
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.deepEqual(
    data.results.map((r) => r.status),
    ["accepted", "rejected", "accepted"],
  );
  assert.equal(data.results[1].error_code, "INTERNAL_ERROR");
  assert.equal(finalized, false);
  assert.ok(data.server_time);
});
test("HTTP successful duplicates finalize and preserve captured context", async () => {
  const store = randomUUID();
  let finalized = false;
  const handler = createSyncHandler(
    async () => ({
      userId: randomUUID(),
      role: "seller",
      client: {
        rpc: async (name, args) => {
          if (name === "finish_expense_sync") {
            finalized = true;
            return { data: "now", error: null };
          }
          assert.equal(args.context_store, store);
          assert.equal(args.context_version, 2);
          return {
            data: {
              operation_id: args.operation.operation_id,
              expense_id: args.operation.expense.id,
              status: "duplicate",
              version: 3,
            },
            error: null,
          };
        },
      },
    }),
    [origin],
  );
  const response = await handler(
    request(
      { device_id: randomUUID(), operations: [op()] },
      { "x-store-id": store, "x-store-assignment-version": "2" },
    ),
  );
  assert.equal(response.status, 200);
  assert.equal(finalized, true);
});
test("HTTP rejects unauthenticated, admin, invalid envelope, origin and oversized body", async () => {
  const make = (role = "seller") =>
    createSyncHandler(
      async () => ({
        userId: "id",
        role,
        client: {
          rpc: async () => {
            throw new Error("must not call");
          },
        },
      }),
      [origin],
    );
  assert.equal(
    (await make()(request({ device_id: "bad", operations: [] }))).status,
    400,
  );
  assert.equal((await make("admin")(request({}))).status, 403);
  assert.equal(
    (await make()(request({}, { origin: "https://untrusted.example" }))).status,
    403,
  );
  assert.equal(
    (await make()(request({ padding: "x".repeat(131073) }))).status,
    413,
  );
  const denied = createSyncHandler(async () => {
    throw new HttpError(401, "UNAUTHORIZED");
  }, [origin]);
  assert.equal((await denied(request({}))).status, 401);
  assert.equal(
    (
      await make()(
        new Request("http://local", { method: "OPTIONS", headers: { origin } }),
      )
    ).status,
    204,
  );
});
test("seller cannot provision Auth users and admin request has strict validation", async () => {
  let created = false;
  const make = (role) =>
    createAdminUsersHandler(
      async () => ({
        role,
        userId: "id",
        client: { rpc: async () => ({ data: null, error: null }) },
      }),
      () => {
        created = true;
        throw new Error("Must not create");
      },
      [origin],
    );
  assert.equal((await make("seller")(request({}))).status, 403);
  assert.equal(
    (await make("admin")(request({ email: "bad", password: "short" }))).status,
    400,
  );
  assert.equal(created, false);
});
test("Auth user cleanup compensates both database errors and thrown network errors", async () => {
  for (const mode of ["error", "throw"]) {
    const id = randomUUID();
    let removed = null;
    const handler = createAdminUsersHandler(
      async () => ({
        role: "admin",
        userId: "admin",
        client: {
          rpc: async () => {
            if (mode === "throw") throw new Error("network");
            return { data: null, error: { message: "INACTIVE_STORE" } };
          },
        },
      }),
      () => ({
        createUser: async () => ({ data: { user: { id } }, error: null }),
        deleteUser: async (userId) => {
          removed = userId;
          return { error: null };
        },
      }),
      [origin],
    );
    const response = await handler(
      request({
        email: "seller@example.test",
        password: "temporary-long-password",
        full_name: "Sotuvchi",
        store_id: randomUUID(),
      }),
    );
    assert.equal(response.status, 400);
    assert.equal(removed, id);
    assert.equal((await response.json()).error_code, "PROFILE_CREATION_FAILED");
  }
});
