/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
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
  GeminiLiveProvider,
} = require("../src/lib/voice/GeminiLiveProvider.ts");
const { createTokenHandler } = require("../src/lib/voice/tokenService.ts");
const { encodePcm, decodePcm } = require("../src/lib/voice/audio/pcm.ts");
const { BrowserAudio } = require("../src/lib/voice/audio/BrowserAudio.ts");
const {
  GEMINI_MODEL,
  SESSION_SECONDS,
} = require("../src/lib/voice/geminiConfig.ts");
const profile = {
  name: "Sofia",
  ageMonths: 24,
  interests: ["Animais"],
  knownWords: [],
};
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
};

function harness(overrides = {}) {
  const audio = {
    open: async () => {},
    closeCount: 0,
    close() {
      this.closeCount++;
      this.playing = false;
    },
    playing: false,
    played: [],
    play(data) {
      this.played.push(data);
      this.playing = true;
    },
    interrupt() {
      this.playing = false;
      this.interrupted = true;
    },
  };
  const session = {
    sent: [],
    closed: 0,
    sendRealtimeInput(input) {
      this.sent.push(input);
    },
    close() {
      this.closed++;
    },
  };
  let callbacks;
  let tokens = 0;
  const p = new GeminiLiveProvider({
    audio: () => audio,
    token: async () => {
      tokens++;
      return {
        token: "ephemeral-test",
        model: GEMINI_MODEL,
        expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000).toISOString(),
        sessionSeconds: SESSION_SECONDS,
      };
    },
    session: async (_, cb) => {
      callbacks = cb;
      return session;
    },
    ...overrides,
  });
  const states = [];
  const transcripts = [];
  const errors = [];
  p.onStateChange((s) => states.push(s));
  p.onTranscript((t) => transcripts.push(t));
  p.onError((e) => errors.push(e));
  return {
    p,
    audio,
    session,
    states,
    transcripts,
    errors,
    get callbacks() {
      return callbacks;
    },
    get tokens() {
      return tokens;
    },
  };
}

test("PCM16 usa little endian, clipping e decodificação correta", () => {
  const encoded = encodePcm(new Float32Array([-2, -1, -0.5, 0, 0.5, 1, 2]));
  const bytes = Buffer.from(encoded, "base64");
  assert.equal(bytes.readInt16LE(0), -32768);
  assert.equal(bytes.readInt16LE(10), 32767);
  const decoded = decodePcm(encoded);
  assert.equal(decoded[2], -0.5);
  assert.equal(decoded[4], 0.5);
  assert.equal(decoded[6], 32767 / 32768);
  assert.throws(() => decodePcm("AA=="), /PCM/);
});

test("Gemini envia PCM, processa partes múltiplas e só volta a ouvir após drenar áudio", async () => {
  const h = harness();
  await h.p.connect();
  h.p.startConversation(profile);
  assert.equal(h.states.at(-1), "thinking");
  assert.equal(JSON.stringify(h.session.sent).includes("Sofia"), false);
  h.audio.onChunk("AAAA", 24000, 0);
  assert.equal(h.session.sent.at(-1).audio.mimeType, "audio/pcm;rate=24000");
  h.callbacks.onmessage({
    serverContent: {
      modelTurn: {
        parts: [
          { inlineData: { mimeType: "audio/pcm;rate=24000", data: "AAA=" } },
          { inlineData: { mimeType: "audio/pcm;rate=24000", data: "AAA=" } },
        ],
      },
      outputTranscription: { text: "Oi!" },
      turnComplete: true,
    },
  });
  assert.equal(h.audio.played.length, 2);
  assert.equal(h.states.at(-1), "speaking");
  assert.equal(h.transcripts.at(-1).text, "Oi!");
  h.audio.playing = false;
  h.audio.onDrain();
  assert.equal(h.states.at(-1), "listening");
  h.p.disconnect();
});

test("interrupção cancela a fila e parar ignora eventos tardios", async () => {
  const h = harness();
  await h.p.connect();
  h.p.startConversation(profile);
  h.audio.playing = true;
  h.callbacks.onmessage({ serverContent: { interrupted: true } });
  assert.equal(h.audio.interrupted, true);
  assert.equal(h.states.at(-1), "listening");
  h.p.stopConversation();
  const count = h.states.length;
  h.callbacks.onclose();
  h.callbacks.onmessage({
    serverContent: { outputTranscription: { text: "late" } },
  });
  assert.equal(h.states.length, count);
  assert.equal(h.transcripts.length, 0);
  assert.equal(h.session.closed, 1);
  assert.ok(h.audio.closeCount > 0);
});

test("cancelar durante a permissão não solicita token", async () => {
  const permission = deferred();
  const audio = {
    open: () => permission.promise,
    close() {
      this.closed = true;
    },
  };
  const h = harness({ audio: () => audio });
  const connecting = h.p.connect();
  h.p.stopConversation();
  permission.resolve();
  await connecting;
  assert.equal(h.tokens, 0);
  assert.equal(audio.closed, true);
  assert.equal(h.states.at(-1), "idle");
});

test("sessão que resolve depois de cancelar é fechada imediatamente", async () => {
  const pending = deferred();
  const reached = deferred();
  const late = {
    closeCount: 0,
    close() {
      this.closeCount++;
    },
  };
  const h = harness({
    session: async () => {
      reached.resolve();
      return pending.promise;
    },
  });
  const connecting = h.p.connect();
  await reached.promise;
  h.p.stopConversation();
  pending.resolve(late);
  await connecting;
  assert.equal(late.closeCount, 1);
  assert.equal(h.states.at(-1), "idle");
});

test("falha do SDK não expõe credenciais e libera recursos", async () => {
  const h = harness({
    session: async () => {
      throw new Error("sensitive-token");
    },
  });
  await assert.rejects(h.p.connect(), /Não foi possível conectar/);
  assert.equal(h.errors.length, 1);
  assert.equal(h.errors[0].message.includes("sensitive-token"), false);
  assert.ok(h.audio.closeCount > 0);
});

test("timeout fecha áudio e rejeita eventos da conexão antiga", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const pending = deferred();
  const reached = deferred();
  const h = harness({
    session: async () => {
      reached.resolve();
      return pending.promise;
    },
  });
  const connecting = h.p.connect();
  await reached.promise;
  t.mock.timers.tick(20000);
  assert.equal(h.states.at(-1), "error");
  assert.ok(h.audio.closeCount > 0);
  const late = {
    close() {
      this.closed = true;
    },
  };
  pending.resolve(late);
  await connecting;
  assert.equal(late.closed, true);
});

test("expiração de sessão libera conexão e microfone", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const h = harness();
  await h.p.connect();
  h.p.startConversation(profile);
  t.mock.timers.tick(SESSION_SECONDS * 1000 + 1);
  assert.equal(h.states.at(-1), "error");
  assert.equal(h.session.closed, 1);
  assert.ok(h.audio.closeCount > 0);
});

const request = (
  origin = "http://127.0.0.1:3001",
  url = "http://127.0.0.1:3001/api/gemini-token/",
) =>
  new Request(url, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: "{}",
  });
test("token: sem chave, origem cruzada e hospedagem pública falham sem chamar o Google", async () => {
  let calls = 0;
  const handler = createTokenHandler(
    () => {
      calls++;
      throw new Error("unexpected");
    },
    () => ({}),
  );
  assert.equal((await handler(request())).status, 503);
  assert.equal((await handler(request("https://evil.example"))).status, 403);
  assert.equal(
    (
      await handler(
        request(
          "https://lumi.example",
          "https://lumi.example/api/gemini-token/",
        ),
      )
    ).status,
    403,
  );
  assert.equal(calls, 0);
});

test("token: uso único, expiração, configuração bloqueada, no-store e limite de requisições", async () => {
  let args;
  let clock = 1_000_000;
  const handler = createTokenHandler(
    () => ({
      authTokens: {
        create: async (input) => {
          args = input;
          return { name: "ephemeral-only" };
        },
      },
    }),
    () => ({ GEMINI_API_KEY: "server-secret" }),
    () => clock,
  );
  const response = await handler(request());
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control"), /no-store/);
  const body = await response.text();
  assert.equal(body.includes("server-secret"), false);
  assert.equal(args.config.uses, 1);
  assert.equal(args.config.liveConnectConstraints.model, GEMINI_MODEL);
  assert.equal(Date.parse(args.config.newSessionExpireTime), clock + 60000);
  for (let i = 0; i < 4; i++)
    assert.equal((await handler(request())).status, 200);
  assert.equal((await handler(request())).status, 429);
  clock += 60000;
  assert.equal((await handler(request())).status, 200);
});

test("erros do emissor de tokens são sanitizados", async () => {
  const handler = createTokenHandler(
    () => ({
      authTokens: {
        create: async () => {
          throw new Error("server-secret");
        },
      },
    }),
    () => ({ GEMINI_API_KEY: "server-secret" }),
  );
  const response = await handler(request());
  assert.equal(response.status, 502);
  assert.equal((await response.text()).includes("server-secret"), false);
});

test("BrowserAudio interrompido durante getUserMedia encerra a track que chega atrasada", async () => {
  const permission = deferred();
  let context;
  const track = {
    stopped: 0,
    stop() {
      this.stopped++;
    },
  };
  globalThis.window = { isSecureContext: true };
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { mediaDevices: { getUserMedia: () => permission.promise } },
  });
  const contexts = [];
  globalThis.AudioContext = class {
    constructor() {
      contexts.push(this);
      this.state = "running";
    }
    resume() {
      return Promise.resolve();
    }
    close() {
      this.state = "closed";
      return Promise.resolve();
    }
  };
  const audio = new BrowserAudio();
  const controller = new AbortController();
  const opening = audio.open(controller.signal);
  context = contexts[0];
  controller.abort();
  permission.resolve({ getTracks: () => [track] });
  await assert.rejects(opening, { name: "AbortError" });
  assert.equal(track.stopped, 1);
  assert.equal(context.state, "closed");
});

test("token aceita Host local quando Next normaliza a URL interna e rejeita host externo", async () => {
  const handler = createTokenHandler(() => ({ authTokens: { create: async () => ({ name: "test-token" }) } }), () => ({ GEMINI_API_KEY: "test-key" }));
  const local = new Request("http://localhost:3001/api/gemini-token/", { method: "POST", headers: { host: "127.0.0.1:3001", origin: "http://127.0.0.1:3001", "content-type": "application/json" } });
  assert.equal((await handler(local)).status, 200);
  const external = new Request("http://localhost:3001/api/gemini-token/", { method: "POST", headers: { host: "example.com", origin: "http://example.com", "content-type": "application/json" } });
  assert.equal((await handler(external)).status, 403);
});
