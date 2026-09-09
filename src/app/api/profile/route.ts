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
  const result = await db().query(
    'SELECT name,age_months AS "ageMonths",interests,known_words AS "knownWords" FROM lumi_profiles WHERE account_id=$1',
    [user.id],
  );
  return json({ profile: result.rows[0] ?? null });
});
export const PUT = api(async (request) => {
  const user = await account(request);
  const input = await body(request);
  if (!isChildProfile(input))
    throw new ApiError(400, "Confira o nome, a idade e os interesses.");
  await limit(`write:${user.id}`, 60, 60);
  const profile = { ...input, name: input.name.trim() };
  await db().query(
    "INSERT INTO lumi_profiles(account_id,name,age_months,interests,known_words) VALUES($1,$2,$3,$4,$5) ON CONFLICT(account_id) DO UPDATE SET name=excluded.name,age_months=excluded.age_months,interests=excluded.interests,known_words=excluded.known_words,updated_at=now()",
    [
      user.id,
      profile.name,
      profile.ageMonths,
      JSON.stringify(profile.interests),
      JSON.stringify(profile.knownWords),
    ],
  );
  return json({ profile });
});
export const DELETE = api(async (request) => {
  requireOrigin(request);
  const user = await account(request);
  await db().query("DELETE FROM lumi_profiles WHERE account_id=$1", [user.id]);
  return json({ ok: true });
});
