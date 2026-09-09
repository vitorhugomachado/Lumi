import { childId } from "@/lib/server/children";
import { db } from "@/lib/server/db";
import {
  account,
  api,
  ApiError,
  body,
  json,
  requireOrigin,
  limit,
} from "@/lib/server/http";
import { isChildProfile } from "@/lib/child/profile";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = api(async (request) => {
  const user = await account(request);
  const id = await childId(request, user.id);
  const result = await db().query(
    'SELECT name,age_months AS "ageMonths",interests,known_words AS "knownWords" FROM lumi_profiles WHERE account_id=$1 AND id=$2',
    [user.id, id],
  );
  return json({ profile: result.rows[0]?.name ? result.rows[0] : null });
});
export const PUT = api(async (request) => {
  const user = await account(request);
  const id = await childId(request, user.id);
  const input = await body(request);
  if (!isChildProfile(input))
    throw new ApiError(400, "Confira o nome, a idade e os interesses.");
  await limit(`write:${user.id}`, 60, 60);
  const profile = { ...input, name: input.name.trim() };
  await db().query(
    "UPDATE lumi_profiles SET name=$2,age_months=$3,interests=$4,known_words=$5,updated_at=now() WHERE account_id=$1 AND id=$6",
    [
      user.id,
      profile.name,
      profile.ageMonths,
      JSON.stringify(profile.interests),
      JSON.stringify(profile.knownWords),
      id,
    ],
  );
  return json({ profile });
});
export const DELETE = api(async (request) => {
  requireOrigin(request);
  const user = await account(request);
  const id = await childId(request, user.id);
  await db().query(
    "UPDATE lumi_profiles SET name=NULL,age_months=NULL,interests='[]',known_words='[]',updated_at=now() WHERE account_id=$1 AND id=$2",
    [user.id, id],
  );
  return json({ ok: true });
});
