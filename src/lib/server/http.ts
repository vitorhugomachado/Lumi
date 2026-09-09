import { db } from "./db";
import { digest, sessionToken, validOrigin } from "./security";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const json = (
  body: unknown,
  status = 200,
  extra: Record<string, string> = {},
) =>
  Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      ...extra,
    },
  });
export function api(fn: (request: Request) => Promise<Response>) {
  return async (request: Request) => {
    try {
      return await fn(request);
    } catch (error) {
      if (error instanceof ApiError)
        return json({ error: error.message }, error.status);
      console.error("Lumi API request failed.");
      return json(
        { error: "Não foi possível concluir. Tente novamente em instantes." },
        503,
      );
    }
  };
}
export function requireOrigin(request: Request) {
  if (!validOrigin(request)) throw new ApiError(403, "Origem não autorizada.");
}
export async function body(request: Request): Promise<unknown> {
  requireOrigin(request);
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json")
    throw new ApiError(415, "Envie JSON.");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "Solicitação vazia.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 32768) {
      await reader.cancel();
      throw new ApiError(413, "Solicitação muito grande.");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ApiError(400, "JSON inválido.");
  }
}
export async function account(request: Request) {
  const token = sessionToken(request);
  if (!token) throw new ApiError(401, "Entre na conta do responsável.");
  const result = await db().query(
    "SELECT a.id,a.email FROM lumi_sessions s JOIN lumi_accounts a ON a.id=s.account_id WHERE s.token_hash=$1 AND s.expires_at>now()",
    [digest(token)],
  );
  if (!result.rows[0])
    throw new ApiError(401, "Sua sessão terminou. Entre novamente.");
  return result.rows[0] as { id: string; email: string };
}
export async function limit(key: string, max: number, seconds: number) {
  const result = await db().query(
    "INSERT INTO lumi_rate_limits(key,count,expires_at) VALUES($1,1,now()+$2*interval '1 second') ON CONFLICT(key) DO UPDATE SET count=CASE WHEN lumi_rate_limits.expires_at<=now() THEN 1 ELSE lumi_rate_limits.count+1 END, expires_at=CASE WHEN lumi_rate_limits.expires_at<=now() THEN excluded.expires_at ELSE lumi_rate_limits.expires_at END RETURNING count",
    [digest(key), seconds],
  );
  if (result.rows[0].count > max)
    throw new ApiError(429, "Muitas tentativas. Aguarde alguns minutos.");
}
