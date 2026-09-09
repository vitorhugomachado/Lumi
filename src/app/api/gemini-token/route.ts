import { createTokenHandler } from "@/lib/voice/tokenService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = createTokenHandler();
