/* eslint-disable @typescript-eslint/no-require-imports */
// Opt-in real Gemini check. No microphone, audio files or transcript logging.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const { GoogleGenAI } = require("@google/genai");
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    filename,
  );
const {
  GEMINI_API_VERSION,
  liveConfig,
} = require("../src/lib/voice/geminiConfig.ts");
async function main() {
  const origin = process.env.TEST_APP_ORIGIN;
  if (!origin) throw new Error("Set TEST_APP_ORIGIN.");
  let cookie, session, timer;
  async function api(path, body, method = "POST") {
    const response = await fetch(origin + path, {
      method,
      headers: {
        origin,
        "Content-Type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`Test API returned ${response.status}.`);
    return response;
  }
  try {
    const guest = await api("/api/guest/", {});
    cookie = guest.headers.get("set-cookie")?.split(";")[0];
    assert(cookie);
    const token = await (await api("/api/gemini-token/", {})).json();
    const ai = new GoogleGenAI({
      apiKey: token.token,
      httpOptions: { apiVersion: GEMINI_API_VERSION },
    });
    let resolve, reject;
    const done = new Promise((a, b) => {
      resolve = a;
      reject = b;
    });
    // Attach immediately in case the connection fails before it returns.
    void done.catch(() => {});
    const turns = [];
    let current = { chunks: 0, streamedBeforeEnd: false, transcript: false };
    timer = setTimeout(() => reject(new Error("Live test timed out.")), 45000);
    session = await ai.live.connect({
      model: token.model,
      config: liveConfig(),
      callbacks: {
        onerror: () => reject(new Error("Live connection failed.")),
        onclose: () => {
          if (turns.length < 2)
            reject(new Error("Live connection closed early."));
        },
        onmessage: (message) => {
          const c = message.serverContent;
          if (!c) return;
          if (c.outputTranscription?.text) current.transcript = true;
          for (const p of c.modelTurn?.parts ?? [])
            if (
              p.inlineData?.mimeType?.startsWith("audio/pcm") &&
              p.inlineData.data
            ) {
              current.chunks++;
              if (!c.turnComplete) current.streamedBeforeEnd = true;
            }
          if (c.turnComplete) {
            turns.push(current);
            current = {
              chunks: 0,
              streamedBeforeEnd: false,
              transcript: false,
            };
            if (turns.length === 1)
              session.sendRealtimeInput({
                text: "O gatinho pulou na almofada! Continue essa ideia com um comentário bem curto, sem pergunta.",
              });
            else resolve();
          }
        },
      },
    });
    session.sendRealtimeInput({
      text: "Diga um oi curto e um comentário sobre um gatinho, sem pergunta.",
    });
    await done;
    assert.equal(turns.length, 2);
    for (const turn of turns) {
      assert(turn.chunks > 0);
      assert(turn.streamedBeforeEnd);
      assert(turn.transcript);
    }
    console.log(
      "Live Gemini passed: two responses in one connection, streamed audio before turnComplete, output transcription present. No audio or transcript saved.",
    );
  } finally {
    clearTimeout(timer);
    session?.close();
    if (cookie) {
      await api("/api/account/", { confirm: true }, "DELETE");
      console.log("Temporary visitor removed.");
    }
  }
}
main().catch(() => {
  console.error("Live check failed; no credential or provider payload logged.");
  process.exitCode = 1;
});
