import { db } from "@/lib/server/db";
import { profileSnapshot } from "@/lib/voice/profileContext";
import { createTokenHandler } from "@/lib/voice/tokenService";
import { account, api, body, limit, requireOrigin } from "@/lib/server/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const local = createTokenHandler();
const authenticated = createTokenHandler(
  undefined,
  undefined,
  undefined,
  async (request) => {
    requireOrigin(request);
    const user = await account(request);
    await limit(`voice:${user.id}`, 5, 60);
    return null;
  },
  async (request) => {
    // Ignore submitted profile/owner IDs in hosted mode. The cookie is the owner.
    await body(request);
    const user = await account(request);
    const result = await db().query(
      'SELECT name,age_months AS "ageMonths",interests,known_words AS "knownWords" FROM lumi_profiles WHERE account_id=$1',
      [user.id],
    );
    return profileSnapshot(result.rows[0] ?? null);
  },
);
export const POST = api(async (request) =>
  process.env.DATABASE_URL ? authenticated(request) : local(request),
);
