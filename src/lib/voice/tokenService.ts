import type { ChildProfile } from "../child/profile";
import {
  ProfilePayloadError,
  profileSnapshot,
  readLocalVoiceProfile,
} from "./profileContext";
import { GoogleGenAI } from "@google/genai";
import {
  GEMINI_API_VERSION,
  GEMINI_MODEL,
  SESSION_SECONDS,
  liveConfig,
} from "./geminiConfig";

type TokenClient = Pick<GoogleGenAI, "authTokens">;
const headers = { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" };
const reply = (status: number, error: string) =>
  Response.json({ error }, { status, headers });

/** Global, bounded throttle for this local tester process; no IP/profile logging. */
export function createTokenHandler(
  makeClient: (key: string) => TokenClient = (key) =>
    new GoogleGenAI({
      apiKey: key,
      httpOptions: { apiVersion: GEMINI_API_VERSION, timeout: 15000 },
    }),
  env: () => NodeJS.ProcessEnv = () => process.env,
  now: () => number = Date.now,
  authorize?: (request: Request) => Promise<Response | null>,
  resolveProfile: (
    request: Request,
  ) => Promise<ChildProfile | null> = readLocalVoiceProfile,
) {
  let windowStart = 0;
  let count = 0;
  return async function POST(request: Request) {
    // Local mode stays restricted to loopback. Hosted mode supplies an
    // authorization callback that checks the origin, account and database quota.
    const url = new URL(request.url);
    // Next can normalize request.url to localhost even when the browser uses
    // 127.0.0.1. Validate the actual Host, never forwarded proxy headers.
    const host = request.headers.get("host") ?? url.host;
    const local = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/.test(host);
    if (authorize) {
      const denied = await authorize(request);
      if (denied) return denied;
    } else if (
      !local ||
      request.headers.get("origin") !== `${url.protocol}//${host}` ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      return reply(
        403,
        "A voz está disponível apenas no servidor local de testes.",
      );
    if (
      request.headers.get("content-type")?.split(";")[0] !== "application/json"
    )
      return reply(415, "Formato de solicitação inválido.");
    let profile: ChildProfile | null;
    try {
      profile = profileSnapshot(await resolveProfile(request));
    } catch (error) {
      if (error instanceof ProfilePayloadError)
        return reply(error.status, error.message);
      throw error;
    }
    const config = env();
    if (!config.GEMINI_API_KEY)
      return reply(
        503,
        "Configure GEMINI_API_KEY no .env.local do servidor e reinicie o aplicativo.",
      );
    if (now() - windowStart >= 60_000) {
      windowStart = now();
      count = 0;
    }
    if (count >= 5)
      return reply(429, "Aguarde um minuto antes de iniciar outra conversa.");
    count++;
    try {
      const expiresAt = new Date(now() + SESSION_SECONDS * 1000).toISOString();
      const token = await makeClient(config.GEMINI_API_KEY).authTokens.create({
        config: {
          uses: 1,
          expireTime: expiresAt,
          newSessionExpireTime: new Date(now() + 60_000).toISOString(),
          liveConnectConstraints: {
            model: GEMINI_MODEL,
            config: liveConfig(profile),
          },
        },
      });
      if (!token.name)
        return reply(
          502,
          "O Gemini não retornou uma credencial de sessão válida.",
        );
      return Response.json(
        {
          token: token.name,
          model: GEMINI_MODEL,
          expiresAt,
          sessionSeconds: SESSION_SECONDS,
          profile,
        },
        { headers },
      );
    } catch {
      // Never expose SDK errors: they can include request details or credentials.
      return reply(
        502,
        "Não foi possível abrir uma sessão Gemini. Verifique a chave, o acesso ao modelo e a cota no servidor.",
      );
    }
  };
}
