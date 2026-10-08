import { authenticate, origins, serviceClient } from "../_shared/runtime.ts";
import { createAdminUsersHandler } from "../_shared/admin-users-handler.ts";
Deno.serve(
  createAdminUsersHandler(
    authenticate,
    () => serviceClient().auth.admin,
    origins,
  ),
);
