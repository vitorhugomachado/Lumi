/* eslint-disable @typescript-eslint/no-require-imports */
// Opt-in paid integration smoke test. Never logs tokens, profile or audio.
const fs = require("node:fs");
const ts = require("typescript");
const { GoogleGenAI } = require("@google/genai");
require.extensions[".ts"] = (module, filename) => {
  const result = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  module._compile(result.outputText, filename);
};
const {
  GEMINI_MODEL,
  GEMINI_API_VERSION,
  liveConfig,
} = require("../src/lib/voice/geminiConfig.ts");

async function main() {
  if (!process.env.GEMINI_API_KEY) throw new Error("Chave ausente");
  const server = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: { apiVersion: GEMINI_API_VERSION, timeout: 15000 },
  });
  const token = await server.authTokens.create({
    config: {
      uses: 1,
      expireTime: new Date(Date.now() + 180000).toISOString(),
      newSessionExpireTime: new Date(Date.now() + 60000).toISOString(),
      liveConnectConstraints: { model: GEMINI_MODEL, config: liveConfig() },
    },
  });
  if (!token.name) throw new Error("Token ausente");
  const client = new GoogleGenAI({
    apiKey: token.name,
    httpOptions: { apiVersion: GEMINI_API_VERSION },
  });
  let session;
  let timer;
  let audioChunks = 0;
  let transcript = false;
  let finished = false;
  let resolveDone;
  let rejectDone;
  const done = new Promise((resolve, reject) => {
    resolveDone = resolve;
    rejectDone = reject;
  });
  // Mark rejection as handled even if setup has not resolved yet.
  void done.catch(() => {});
  timer = setTimeout(() => {
    finished = true;
    rejectDone(new Error("Tempo esgotado"));
    session?.close();
  }, 30000);
  try {
    session = await client.live.connect({
      model: GEMINI_MODEL,
      config: liveConfig(),
      callbacks: {
        onmessage(message) {
          const content = message.serverContent;
          for (const part of content?.modelTurn?.parts ?? [])
            if (
              part.inlineData?.mimeType?.startsWith("audio/pcm") &&
              part.inlineData.data
            )
              audioChunks++;
          if (content?.outputTranscription?.text) transcript = true;
          if (content?.turnComplete) {
            finished = true;
            resolveDone();
          }
        },
        onerror() {
          finished = true;
          rejectDone(new Error("Falha Live"));
        },
        onclose() {
          if (!finished) rejectDone(new Error("Conexão encerrada"));
        },
      },
    });
    if (finished) throw new Error("Conexão encerrada durante setup");
    session.sendRealtimeInput({
      audio: {
        data: Buffer.alloc(4800).toString("base64"),
        mimeType: "audio/pcm;rate=24000",
      },
    });
    session.sendRealtimeInput({ audioStreamEnd: true });
    session.sendRealtimeInput({
      text: "Diga apenas um oi curto para este teste de conexão.",
    });
    await done;
    if (!audioChunks || !transcript) throw new Error("Resposta incompleta");
    console.log(
      JSON.stringify({
        liveSession: "passed",
        audioChunks,
        outputTranscriptionReceived: transcript,
        microphoneUsed: false,
      }),
    );
  } finally {
    clearTimeout(timer);
    finished = true;
    session?.close();
  }
}
main().catch(() => {
  console.error(
    "Teste Live falhou. Verifique a chave, a cota, o modelo e a conectividade. Credenciais e respostas não foram registradas.",
  );
  process.exitCode = 1;
});
