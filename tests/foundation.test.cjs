/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
// Transpile only local TypeScript modules with the project's existing compiler.
require.extensions[".ts"] = (module, filename) => {
  const result = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  module._compile(result.outputText, filename);
};
const { MockVoiceProvider } = require("../src/lib/voice/MockVoiceProvider.ts");
const { isChildProfile } = require("../src/lib/child/profile.ts");
const {
  loadProfile,
  saveProfile,
  clearProfile,
} = require("../src/lib/child/storage.ts");
const profile = {
  name: "Sofia",
  ageMonths: 24,
  interests: ["Animais"],
  knownWords: ["bola"],
};

test("perfil persiste, rejeita conteúdo inválido e remove somente a chave Lumi", () => {
  const store = new Map([["unrelated", "keep"]]);
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => store.set(k, v),
      removeItem: (k) => store.delete(k),
    },
  });
  saveProfile(profile);
  assert.deepEqual(loadProfile(), profile);
  assert.equal(isChildProfile({ ...profile, ageMonths: -1 }), false);
  assert.equal(isChildProfile({ ...profile, name: " " }), false);
  assert.equal(isChildProfile({ ...profile, interests: ["unknown"] }), false);
  store.set("lumi.profile.v1", "{broken");
  assert.equal(loadProfile(), null);
  saveProfile(profile);
  clearProfile();
  assert.equal(loadProfile(), null);
  assert.equal(store.get("unrelated"), "keep");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      },
    },
  });
  assert.throws(() => loadProfile(), /blocked/);
  assert.throws(() => saveProfile(profile), /blocked/);
});

test("Sofia: ouvindo → pensando → falando, resposta em texto e retorno a idle", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const p = new MockVoiceProvider();
  const states = [];
  const transcripts = [];
  p.onStateChange((s) => states.push(s));
  p.onTranscript((t) => transcripts.push(t));
  await p.connect();
  p.startConversation(profile);
  assert.equal(states.at(-1), "listening");
  t.mock.timers.tick(1999);
  assert.equal(states.at(-1), "listening");
  t.mock.timers.tick(1);
  assert.equal(states.at(-1), "thinking");
  t.mock.timers.tick(1200);
  assert.equal(states.at(-1), "speaking");
  assert.match(transcripts[0].text, /Sofia.*cachorro/);
  t.mock.timers.tick(3800);
  assert.equal(states.at(-1), "idle");
  assert.deepEqual(states.slice(-4), [
    "listening",
    "thinking",
    "speaking",
    "idle",
  ]);
  p.disconnect();
});

test("parar, reiniciar e desconectar não deixam respostas atrasadas", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const p = new MockVoiceProvider();
  const transcripts = [];
  const states = [];
  const off = p.onTranscript((v) => transcripts.push(v));
  p.onStateChange((v) => states.push(v));
  await p.connect();
  p.startConversation(profile);
  t.mock.timers.tick(1000);
  p.stopConversation();
  t.mock.timers.tick(10000);
  assert.equal(transcripts.length, 0);
  assert.equal(states.at(-1), "idle");
  p.startConversation(profile);
  t.mock.timers.tick(2100);
  p.disconnect();
  t.mock.timers.tick(10000);
  assert.equal(transcripts.length, 0);
  assert.equal(states.at(-1), "idle");
  off();
  await p.connect();
  p.startConversation(profile);
  t.mock.timers.tick(7000);
  assert.equal(transcripts.length, 0);
  p.disconnect();
});

test("iniciar sem conectar emite erro", () => {
  const p = new MockVoiceProvider();
  const states = [];
  const errors = [];
  p.onStateChange((s) => states.push(s));
  p.onError((e) => errors.push(e));
  p.startConversation(profile);
  assert.deepEqual(states, ["error"]);
  assert.equal(errors.length, 1);
});
