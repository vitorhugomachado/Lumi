import { createTokenHandler } from "@/lib/voice/tokenService";
import { account, api, limit, requireOrigin } from "@/lib/server/http";
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
);
export const POST = api(async (request) =>
  process.env.DATABASE_URL ? authenticated(request) : local(request),
);
