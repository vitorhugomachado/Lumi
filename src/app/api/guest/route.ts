import { randomUUID } from "node:crypto";
import { db, transaction } from "@/lib/server/db";
import { account, api, ApiError, body, json, limit } from "@/lib/server/http";
import {
  cookie,
  digest,
  newSessionToken,
  SESSION_SECONDS,
  sessionToken,
} from "@/lib/server/security";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = api(async (request) => {
  await body(request);
  // Reuse and refresh the current owner, including existing registered accounts.
  try {
    const user = await account(request);
    const token = sessionToken(request)!;
    await db().query(
      "UPDATE lumi_sessions SET expires_at=now()+$2*interval '1 second' WHERE token_hash=$1",
      [digest(token), SESSION_SECONDS],
    );
    return json({ user }, 200, { "Set-Cookie": cookie(token) });
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
  }
  await limit("guest-create-global", 100, 3600);
  const token = newSessionToken();
  const user = { id: randomUUID(), email: null, is_guest: true };
  await transaction(async (client) => {
    await client.query(
      "INSERT INTO lumi_accounts(id,is_guest) VALUES($1,true)",
      [user.id],
    );
    await client.query(
      "INSERT INTO lumi_sessions(token_hash,account_id,expires_at) VALUES($1,$2,now()+$3*interval '1 second')",
      [digest(token), user.id, SESSION_SECONDS],
    );
  });
  return json({ user }, 200, { "Set-Cookie": cookie(token) });
});
