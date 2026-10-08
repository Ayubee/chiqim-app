import { authenticate, origins } from "../_shared/runtime.ts";
import { createSyncHandler } from "../_shared/sync-handler.ts";
Deno.serve(createSyncHandler(authenticate, origins));
