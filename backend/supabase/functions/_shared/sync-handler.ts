import {
  endpoint,
  HttpError,
  readBody,
  UUID,
  type Authenticator,
} from "./http.ts";
type Result = {
  operation_id: unknown;
  expense_id: unknown;
  status: "accepted" | "duplicate" | "rejected";
  version?: number;
  error_code?: string;
};
export function createSyncHandler(
  authenticate: Authenticator,
  origins: string[],
) {
  return endpoint(origins, async (req) => {
    const { client, role } = await authenticate(req);
    if (role !== "seller") throw new HttpError(403, "FORBIDDEN");
    const body = await readBody(req);
    if (
      typeof body.device_id !== "string" ||
      !UUID.test(body.device_id) ||
      !Array.isArray(body.operations) ||
      body.operations.length < 1 ||
      body.operations.length > 100
    )
      throw new HttpError(400, "INVALID_ENVELOPE");
    const store = req.headers.get("x-store-id");
    const version = req.headers.get("x-store-assignment-version");
    if (
      (store && !UUID.test(store)) ||
      (version &&
        (!/^\d+$/.test(version) ||
          Number(version) < 1 ||
          Number(version) > 2147483647))
    )
      throw new HttpError(400, "INVALID_STORE_CONTEXT");
    const results: Result[] = [];
    for (const raw of body.operations) {
      const op =
        raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
      const fallback: Result = {
        operation_id: op.operation_id ?? null,
        expense_id: op.expense?.id ?? null,
        status: "rejected",
        error_code: "INTERNAL_ERROR",
      };
      try {
        const { data, error } = await client.rpc("sync_expense", {
          operation: op,
          context_store: store,
          context_version: version ? Number(version) : null,
        });
        if (error || !data) results.push(fallback);
        else results.push(data as Result);
      } catch {
        results.push(fallback);
      }
    }
    if (
      results.every((r) => r.status === "accepted" || r.status === "duplicate")
    ) {
      const { error } = await client.rpc("finish_expense_sync", {
        device: body.device_id,
        operation_ids: results.map((r) => r.operation_id),
      });
      if (error) throw new HttpError(500, "SYNC_FINALIZATION_FAILED");
    }
    return { results, server_time: new Date().toISOString() };
  });
}
