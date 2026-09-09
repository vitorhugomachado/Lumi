/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
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
  readActivities,
  recordActivity,
  clearActivities,
} = require("../src/lib/activity.ts");
function storage(t) {
  const data = new Map();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => data.set(key, value),
      removeItem: (key) => data.delete(key),
    },
  });
  t.after(() => delete globalThis.localStorage);
  return data;
}
test("activity history is bounded and clearing preserves the profile", (t) => {
  const data = storage(t);
  data.set("lumi.profile.v1", "profile");
  for (let i = 0; i < 503; i++) recordActivity("sons", String(i), 8);
  const list = readActivities();
  assert.equal(list.length, 500);
  assert.equal(list[0].word, "3");
  assert.equal(list.at(-1).word, "502");
  clearActivities();
  assert.deepEqual(readActivities(), []);
  assert.equal(data.get("lumi.profile.v1"), "profile");
});
test("invalid stored progress never becomes dashboard records", (t) => {
  const data = storage(t);
  data.set("lumi.activities.v1", "broken json");
  assert.deepEqual(readActivities(), []);
  data.set(
    "lumi.activities.v1",
    JSON.stringify([
      null,
      {},
      { category: "sons", word: "A", seconds: -1, at: "bad" },
      { category: "sons", word: "A", seconds: 8, at: "2026-09-09T10:00:00Z" },
    ]),
  );
  assert.equal(readActivities().length, 1);
});
