export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type RpcClient = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};
export type Identity = {
  client: RpcClient;
  userId: string;
  role: "admin" | "seller";
};
export type Authenticator = (req: Request) => Promise<Identity>;

export async function readBody(
  req: Request,
  maxBytes = 131072,
): Promise<Record<string, unknown>> {
  if (
    !req.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    throw new HttpError(400, "JSON_REQUIRED");
  const reader = req.body?.getReader();
  if (!reader) throw new HttpError(400, "INVALID_BODY");
  const parts: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new HttpError(413, "PAYLOAD_TOO_LARGE");
    }
    parts.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  try {
    const parsed = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    );
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new Error();
    return parsed;
  } catch {
    throw new HttpError(400, "INVALID_JSON");
  }
}
export function endpoint(
  origins: string[],
  handler: (req: Request) => Promise<unknown>,
) {
  return async (req: Request): Promise<Response> => {
    const origin = req.headers.get("origin");
    const allowed = !origin || origins.includes(origin);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      Vary: "Origin",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "authorization, apikey, content-type, x-client-info, x-store-id, x-store-assignment-version",
    };
    if (origin && allowed) headers["Access-Control-Allow-Origin"] = origin;
    try {
      if (!allowed) throw new HttpError(403, "ORIGIN_DENIED");
      if (req.method === "OPTIONS")
        return new Response(null, { status: 204, headers });
      if (req.method !== "POST") throw new HttpError(405, "METHOD_NOT_ALLOWED");
      return new Response(JSON.stringify(await handler(req)), { headers });
    } catch (error) {
      const known = error instanceof HttpError;
      if (!known)
        console.error(
          "Endpoint failed",
          error instanceof Error ? error.message : "unknown",
        );
      return new Response(
        JSON.stringify({
          error_code: known ? error.message : "INTERNAL_ERROR",
        }),
        { status: known ? error.status : 500, headers },
      );
    }
  };
}
