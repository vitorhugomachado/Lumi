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
  hashPassword,
  verifyPassword,
  validOrigin,
  validCredentials,
  validActivity,
  sessionToken,
  newSessionToken,
  digest,
  cookie,
} = require("../src/lib/server/security.ts");
const { account, body } = require("../src/lib/server/http.ts");
test("passwords have random salts and never verify incorrect input", async () => {
  const a = await hashPassword("correct-password-example");
  const b = await hashPassword("correct-password-example");
  assert.notEqual(a, b);
  assert(!a.includes("correct-password-example"));
  assert(await verifyPassword("correct-password-example", a));
  assert.equal(await verifyPassword("incorrect-password", a), false);
  assert.equal(await verifyPassword("test", "invalid"), false);
});
test("origin guard rejects cross-site, suffix and absent origins", () => {
  const origin = "https://lumi.example";
  for (const candidate of [
    null,
    "https://lumi.example.evil",
    "http://lumi.example",
  ]) {
    const req = new Request(origin, {
      headers: candidate ? { origin: candidate } : {},
    });
    assert.equal(validOrigin(req, origin), false);
  }
  assert(validOrigin(new Request(origin, { headers: { origin } }), origin));
  assert.equal(
    validOrigin(
      new Request(origin, {
        headers: { origin, "sec-fetch-site": "cross-site" },
      }),
      origin,
    ),
    false,
  );
});
test("session cookie is opaque, httpOnly and no session means unauthorized", async () => {
  const token = newSessionToken();
  assert.equal(token.length, 64);
  assert.notEqual(digest(token), token);
  assert.equal(
    sessionToken(
      new Request("http://local", {
        headers: { cookie: `other=x; lumi_session=${token}` },
      }),
    ),
    token,
  );
  assert.match(cookie(token), /HttpOnly/);
  assert.match(cookie(token, true), /Max-Age=0/);
  assert.equal(
    sessionToken(
      new Request("http://local", {
        headers: { cookie: "lumi_session=invalid" },
      }),
    ),
    null,
  );
  await assert.rejects(
    account(new Request("http://local")),
    (error) => error.status === 401,
  );
});
test("request parsing bounds bytes and rejects invalid JSON", async (t) => {
  const old = process.env.APP_ORIGIN;
  process.env.APP_ORIGIN = "https://lumi.example";
  t.after(() => {
    if (old === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = old;
  });
  const make = (data) =>
    new Request("https://lumi.example", {
      method: "POST",
      headers: {
        origin: "https://lumi.example",
        "content-type": "application/json",
      },
      body: data,
    });
  await assert.rejects(
    body(make("x".repeat(33000))),
    (error) => error.status === 413,
  );
  await assert.rejects(body(make("not json")), (error) => error.status === 400);
  assert.deepEqual(await body(make('{"ok":true}')), { ok: true });
});
test("credentials and activities reject malformed or unbounded input", () => {
  assert(
    validCredentials({
      action: "register",
      email: "parent@example.test",
      password: "ten-characters",
    }),
  );
  assert(
    !validCredentials({ action: "register", email: "bad", password: "short" }),
  );
  const activity = {
    id: require("node:crypto").randomUUID(),
    category: "sons",
    word: "A",
    seconds: 8,
  };
  assert(validActivity(activity));
  for (const invalid of [
    { ...activity, seconds: -1 },
    { ...activity, seconds: 181 },
    { ...activity, id: "1;drop table" },
    { ...activity, category: "unknown" },
    { ...activity, word: "x".repeat(81) },
  ])
    assert(!validActivity(invalid));
});
