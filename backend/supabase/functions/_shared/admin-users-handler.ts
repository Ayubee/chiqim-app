import {
  endpoint,
  HttpError,
  readBody,
  UUID,
  type Authenticator,
} from "./http.ts";
type UserAdmin = {
  createUser(data: {
    email: string;
    password: string;
    email_confirm: boolean;
  }): Promise<{ data: { user: { id: string } | null }; error: unknown }>;
  deleteUser(id: string): Promise<{ error: unknown }>;
};
export function createAdminUsersHandler(
  authenticate: Authenticator,
  getUserAdmin: () => UserAdmin,
  origins: string[],
) {
  return endpoint(origins, async (req) => {
    const { client, role } = await authenticate(req);
    if (role !== "admin") throw new HttpError(403, "FORBIDDEN");
    const data = await readBody(req, 8192);
    if (
      typeof data.email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) ||
      data.email.length > 254 ||
      typeof data.password !== "string" ||
      data.password.length < 12 ||
      data.password.length > 128 ||
      typeof data.full_name !== "string" ||
      !data.full_name.trim() ||
      data.full_name.trim().length > 120 ||
      typeof data.store_id !== "string" ||
      !UUID.test(data.store_id)
    )
      throw new HttpError(400, "INVALID_USER");
    const admin = getUserAdmin();
    const created = await admin.createUser({
      email: data.email.trim(),
      password: data.password,
      email_confirm: true,
    });
    if (created.error || !created.data.user)
      throw new HttpError(400, "USER_CREATION_FAILED");
    let saved;
    try {
      saved = await client.rpc("admin_command", {
        action: "save_seller",
        data: {
          id: created.data.user.id,
          full_name: data.full_name,
          store_id: data.store_id,
        },
      });
      if (saved.error) throw new Error("PROFILE_CREATION_FAILED");
    } catch {
      try {
        const cleanup = await admin.deleteUser(created.data.user.id);
        if (cleanup.error)
          console.error("Orphan auth user needs cleanup", created.data.user.id);
      } catch {
        console.error("Orphan auth user needs cleanup", created.data.user.id);
      }
      throw new HttpError(400, "PROFILE_CREATION_FAILED");
    }
    return { profile: saved.data };
  });
}
