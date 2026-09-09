import { childId } from "@/lib/server/children";
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
  const child = await childId(request, user.id);
  const result = await db().query(
    "SELECT id,category,word,seconds,happened_at AS at FROM lumi_activities WHERE account_id=$1 AND child_id=$2 ORDER BY happened_at DESC,id DESC LIMIT 500",
    [user.id, child],
  );
  return json({ activities: result.rows.reverse() });
});
export const POST = api(async (request) => {
  const user = await account(request);
  const child = await childId(request, user.id);
  const input = await body(request);
  if (!validActivity(input)) throw new ApiError(400, "Atividade inválida.");
  await limit(`write:${user.id}`, 60, 60);
  const result = await transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [user.id]);
    await client.query(
      "INSERT INTO lumi_activities(id,account_id,category,word,seconds,child_id) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(account_id,id) DO NOTHING",
      [input.id, user.id, input.category, input.word, input.seconds, child],
    );
    await client.query(
      "DELETE FROM lumi_activities WHERE account_id=$1 AND child_id=$2 AND id NOT IN (SELECT id FROM lumi_activities WHERE account_id=$1 AND child_id=$2 ORDER BY happened_at DESC,id DESC LIMIT 500)",
      [user.id, child],
    );
    return client.query(
      "SELECT id,category,word,seconds,happened_at AS at FROM lumi_activities WHERE account_id=$1 AND child_id=$2 AND id=$3",
      [user.id, child, input.id],
    );
  });
  if (!result.rows[0])
    throw new ApiError(409, "Esta atividade já pertence a outro perfil.");
  return json({ activity: result.rows[0] }, 201);
});
export const DELETE = api(async (request) => {
  requireOrigin(request);
  const user = await account(request);
  const child = await childId(request, user.id);
  await db().query(
    "DELETE FROM lumi_activities WHERE account_id=$1 AND child_id=$2",
    [user.id, child],
  );
  return json({ ok: true });
});
