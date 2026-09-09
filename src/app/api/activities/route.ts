import { db, transaction } from "@/lib/server/db";
import {
  account,
  api,
  ApiError,
  body,
  json,
  limit,
  requireOrigin,
} from "@/lib/server/http";
import { validActivity } from "@/lib/server/security";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = api(async (request) => {
  const user = await account(request);
  const result = await db().query(
    "SELECT id,category,word,seconds,happened_at AS at FROM lumi_activities WHERE account_id=$1 ORDER BY happened_at DESC,id DESC LIMIT 500",
    [user.id],
  );
  return json({ activities: result.rows.reverse() });
});
export const POST = api(async (request) => {
  const user = await account(request);
  const input = await body(request);
  if (!validActivity(input)) throw new ApiError(400, "Atividade inválida.");
  await limit(`write:${user.id}`, 60, 60);
  const result = await transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [user.id]);
    await client.query(
      "INSERT INTO lumi_activities(id,account_id,category,word,seconds) VALUES($1,$2,$3,$4,$5) ON CONFLICT(account_id,id) DO NOTHING",
      [input.id, user.id, input.category, input.word, input.seconds],
    );
    await client.query(
      "DELETE FROM lumi_activities WHERE account_id=$1 AND id NOT IN (SELECT id FROM lumi_activities WHERE account_id=$1 ORDER BY happened_at DESC,id DESC LIMIT 500)",
      [user.id],
    );
    return client.query(
      "SELECT id,category,word,seconds,happened_at AS at FROM lumi_activities WHERE account_id=$1 AND id=$2",
      [user.id, input.id],
    );
  });
  return json({ activity: result.rows[0] }, 201);
});
export const DELETE = api(async (request) => {
  requireOrigin(request);
  const user = await account(request);
  await db().query("DELETE FROM lumi_activities WHERE account_id=$1", [
    user.id,
  ]);
  return json({ ok: true });
});
