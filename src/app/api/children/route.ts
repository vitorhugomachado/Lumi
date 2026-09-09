import { db, transaction } from "@/lib/server/db";
import { account, api, ApiError, body, json, limit } from "@/lib/server/http";
import { childId, ensureChild } from "@/lib/server/children";
import { isChildProfile } from "@/lib/child/profile";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = api(async (request) => {
  const user = await account(request);
  await ensureChild(user.id);
  const result = await db().query(
    'SELECT id,name,age_months AS "ageMonths" FROM lumi_profiles WHERE account_id=$1 ORDER BY created_at,id',
    [user.id],
  );
  return json({ children: result.rows });
});
export const POST = api(async (request) => {
  const user = await account(request);
  const input = await body(request);
  if (!isChildProfile(input))
    throw new ApiError(400, "Confira os dados da criança.");
  await limit(`write:${user.id}`, 60, 60);
  const result = await transaction(async (client) => {
    await client.query("SELECT id FROM lumi_accounts WHERE id=$1 FOR UPDATE", [
      user.id,
    ]);
    const count = await client.query(
      "SELECT count(*)::int AS n FROM lumi_profiles WHERE account_id=$1",
      [user.id],
    );
    if (count.rows[0].n >= 6)
      throw new ApiError(
        400,
        "Você pode guardar até 6 perfis. Edite um perfil existente.",
      );
    return client.query(
      "INSERT INTO lumi_profiles(account_id,name,age_months,interests,known_words) VALUES($1,$2,$3,$4,$5) RETURNING id",
      [
        user.id,
        input.name.trim(),
        input.ageMonths,
        JSON.stringify(input.interests),
        JSON.stringify(input.knownWords),
      ],
    );
  });
  return json({ id: result.rows[0].id }, 201);
});
export const DELETE = api(async (request) => {
  const user = await account(request);
  const input = await body(request);
  if (
    !input ||
    typeof input !== "object" ||
    !("confirm" in input) ||
    input.confirm !== true
  )
    throw new ApiError(
      400,
      "Confirme a exclusão do perfil e de seu progresso.",
    );
  if (!request.headers.get("x-lumi-child"))
    throw new ApiError(400, "Escolha o perfil que deseja excluir.");
  const id = await childId(request, user.id);
  await db().query("DELETE FROM lumi_profiles WHERE account_id=$1 AND id=$2", [
    user.id,
    id,
  ]);
  return json({ ok: true });
});
