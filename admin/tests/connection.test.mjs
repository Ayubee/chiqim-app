import { test } from "node:test";
import assert from "node:assert/strict";
import { readSupabaseConfig } from "../src/config.ts";
import { classifyFailure, loadAdminProfile } from "../src/auth.ts";
import { message } from "../src/format.ts";

// Synthetic fixtures only in unit tests, never installed as application env.
const jwt = (claims) =>
  `e30.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.test`;
const env = (key) => ({
  VITE_SUPABASE_URL: "http://127.0.0.1:54321",
  VITE_SUPABASE_PUBLISHABLE_KEY: key,
});
test("missing configuration names, legacy alias and privileged key guard", () => {
  assert.deepEqual(readSupabaseConfig({}).missing, [
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
  ]);
  assert.equal(
    readSupabaseConfig(env(jwt({ role: "service_role" }))).status,
    "invalid",
  );
  assert.equal(readSupabaseConfig(env("sb_secret_test")).status, "invalid");
  assert.equal(
    readSupabaseConfig({ VITE_SUPABASE_PUBLISHABLE_KEY: "sb_secret_test" })
      .status,
    "invalid",
  );
  assert.equal(
    readSupabaseConfig({
      ...env(jwt({ role: "anon" })),
      VITE_SUPABASE_ANON_KEY: jwt({ role: "service_role" }),
    }).status,
    "invalid",
  );
  assert.equal(readSupabaseConfig(env("YOUR_KEY")).status, "invalid");
  assert.equal(
    readSupabaseConfig({
      VITE_SUPABASE_URL: "https://first.supabase.co",
      VITE_SUPABASE_ANON_KEY: jwt({ role: "anon", ref: "second" }),
    }).status,
    "invalid",
  );
  assert.equal(
    readSupabaseConfig({
      VITE_SUPABASE_URL: "http://127.0.0.1:54321",
      VITE_SUPABASE_ANON_KEY: jwt({ role: "anon" }),
    }).status,
    "ready",
  );
});
test("credentials, server, key and missing schema produce different safe messages", () => {
  assert.equal(
    classifyFailure({ code: "invalid_credentials", status: 400 }, "login").code,
    "credentials",
  );
  const network = classifyFailure(new TypeError("Failed to fetch"), "login");
  assert.equal(network.code, "network");
  assert.equal(message(network), network.message);
  assert.equal(
    classifyFailure({ status: 401, message: "Invalid API key" }, "login").code,
    "api_key",
  );
  assert.equal(classifyFailure({ code: "PGRST202" }).code, "schema");
});
function client(profile, user = { id: "auth-id" }) {
  return {
    auth: { getUser: async () => ({ data: { user }, error: null }) },
    from(table) {
      assert.equal(table, "profiles");
      return {
        select: () => ({
          eq: (column, id) => {
            assert.equal(column, "id");
            assert.equal(id, user.id);
            return {
              maybeSingle: async () => ({ data: profile, error: null }),
            };
          },
        }),
      };
    },
  };
}
test("admin must be bound to server-validated Auth user and active admin profile", async () => {
  const active = { id: "auth-id", role: "admin", is_active: true };
  assert.equal(
    (await loadAdminProfile(client(active), "auth-id")).id,
    "auth-id",
  );
  for (const profile of [
    null,
    { ...active, id: "another-id" },
    { ...active, role: "seller" },
  ])
    await assert.rejects(
      loadAdminProfile(client(profile), "auth-id"),
      (error) => error.code === "admin_required",
    );
  await assert.rejects(
    loadAdminProfile(client({ ...active, is_active: false }), "auth-id"),
    (error) => error.code === "inactive",
  );
  await assert.rejects(
    loadAdminProfile(client(active, { id: "other" }), "auth-id"),
    (error) => error.code === "session",
  );
});
