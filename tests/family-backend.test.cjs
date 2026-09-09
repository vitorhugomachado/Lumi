/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const ts = require("typescript");
const { PGlite } = require("@electric-sql/pglite");
require.extensions[".ts"] = (module, filename) => {
  const source = fs
    .readFileSync(filename, "utf8")
    .replaceAll(
      '"@/',
      '"' + path.resolve(__dirname, "../src").replaceAll("\\", "/") + "/",
    );
  module._compile(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    filename,
  );
};
const security = require("../src/lib/server/security.ts");
test("Postgres migration, child isolation and account recovery use real SQL", async (t) => {
  const pg = new PGlite();
  const query = async (sql, params) => {
    const result = await pg.query(sql, params);
    return { ...result, rowCount: result.affectedRows ?? result.rows.length };
  };
  global.lumiPool = { query, connect: async () => ({ query, release() {} }) };
  process.env.DATABASE_URL = "test-only";
  process.env.APP_ORIGIN = "https://lumi.example";
  const owner = randomUUID(),
    other = randomUUID(),
    activity = randomUUID();
  const token = security.newSessionToken();
  let cookie = `lumi_session=${token}`;
  const profile = {
    name: "Sofia",
    ageMonths: 24,
    interests: ["Animais"],
    knownWords: ["gato"],
  };
  const migrations = fs
    .readdirSync(path.resolve(__dirname, "../migrations"))
    .sort();
  for (const name of migrations.slice(0, 3))
    await pg.exec(
      fs.readFileSync(path.resolve(__dirname, "../migrations", name), "utf8"),
    );
  await query(
    "INSERT INTO lumi_accounts(id,is_guest) VALUES($1,true),($2,true)",
    [owner, other],
  );
  await query(
    "INSERT INTO lumi_profiles(account_id,name,age_months,interests,known_words) VALUES($1,$2,$3,$4,$5)",
    [
      owner,
      profile.name,
      24,
      JSON.stringify(profile.interests),
      JSON.stringify(profile.knownWords),
    ],
  );
  await query(
    "INSERT INTO lumi_activities(id,account_id,category,word,seconds) VALUES($1,$2,'sons','A',8)",
    [activity, owner],
  );
  for (const name of migrations.slice(3))
    await pg.exec(
      fs.readFileSync(path.resolve(__dirname, "../migrations", name), "utf8"),
    );
  await query(
    "INSERT INTO lumi_sessions(token_hash,account_id,expires_at) VALUES($1,$2,now()+interval '1 day')",
    [security.digest(token), owner],
  );
  const profiles = require("../src/app/api/profile/route.ts");
  const children = require("../src/app/api/children/route.ts");
  const activities = require("../src/app/api/activities/route.ts");
  const access = require("../src/app/api/account-access/route.ts");
  async function call(route, method = "GET", data, child) {
    const response = await route[method](
      new Request("https://lumi.example/api/test/", {
        method,
        headers: {
          origin: process.env.APP_ORIGIN,
          cookie,
          "Content-Type": "application/json",
          ...(child ? { "x-lumi-child": child } : {}),
        },
        body: data === undefined ? undefined : JSON.stringify(data),
      }),
    );
    return { status: response.status, data: await response.json() };
  }
  let first, second;
  try {
    await t.test(
      "migration preserves existing profile/history and anonymous owners",
      async () => {
        first = (await call(children)).data.children[0].id;
        assert.deepEqual((await call(profiles)).data.profile, profile);
        assert.equal((await call(activities)).data.activities[0].id, activity);
        assert.equal(
          (await query("SELECT count(*)::int AS n FROM lumi_profiles")).rows[0]
            .n,
          2,
        );
      },
    );
    await t.test(
      "profiles and progress are isolated, including forged IDs",
      async () => {
        const made = await call(children, "POST", {
          ...profile,
          name: "Lucas",
          knownWords: [],
        });
        assert.equal(made.status, 201);
        second = made.data.id;
        assert.deepEqual(
          (await call(activities, "GET", undefined, second)).data.activities,
          [],
        );
        assert.equal(
          (await call(profiles, "GET", undefined, second)).data.profile.name,
          "Lucas",
        );
        const foreign = (
          await query("SELECT id FROM lumi_profiles WHERE account_id=$1", [
            other,
          ])
        ).rows[0].id;
        for (const route of [profiles, activities])
          assert.equal(
            (await call(route, "GET", undefined, foreign)).status,
            404,
          );
        assert.equal(
          (await call(profiles, "PUT", profile, foreign)).status,
          404,
        );
        assert.equal(
          (await call(children, "DELETE", { confirm: true }, foreign)).status,
          404,
        );
        assert.equal(
          (
            await call(
              activities,
              "POST",
              { id: activity, category: "sons", word: "B", seconds: 8 },
              second,
            )
          ).status,
          409,
        );
        assert.equal(
          (
            await call(
              activities,
              "POST",
              { id: randomUUID(), category: "sons", word: "B", seconds: 8 },
              second,
            )
          ).status,
          201,
        );
        assert.equal(
          (await call(activities, "GET", undefined, first)).data.activities
            .length,
          1,
        );
        assert.equal(
          (await call(children, "DELETE", { confirm: true }, second)).status,
          200,
        );
        assert.equal(
          (await call(profiles, "GET", undefined, second)).status,
          404,
        );
        assert.equal(
          (await call(activities, "GET", undefined, first)).data.activities
            .length,
          1,
        );
        await call(profiles, "DELETE", undefined, first);
        assert.equal(
          (await call(profiles, "GET", undefined, first)).data.profile,
          null,
        );
      },
    );
    await t.test(
      "password change revokes sessions and checks current password",
      async () => {
        await query(
          "UPDATE lumi_accounts SET is_guest=false,email='test@example.invalid',password_hash=$2 WHERE id=$1",
          [owner, await security.hashPassword("old-password-example")],
        );
        assert.equal(
          (
            await call(access, "POST", {
              action: "change-password",
              currentPassword: "wrong",
              password: "new-password-example",
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await call(access, "POST", {
              action: "change-password",
              currentPassword: "old-password-example",
              password: "new-password-example",
            })
          ).status,
          200,
        );
        assert.equal((await call(profiles)).status, 401);
        assert.equal(
          (
            await query(
              "SELECT count(*)::int AS n FROM lumi_sessions WHERE account_id=$1",
              [owner],
            )
          ).rows[0].n,
          0,
        );
      },
    );
    await t.test(
      "recovery is single use, expires, hides tokens and does not enumerate accounts",
      async () => {
        assert.equal(
          (
            await call(access, "POST", {
              action: "request-reset",
              email: "test@example.invalid",
            })
          ).status,
          503,
        );
        process.env.RESEND_API_KEY = "test-secret";
        process.env.MAIL_FROM = "Lumi <test@example.invalid>";
        const originalFetch = global.fetch;
        let mail;
        global.fetch = async (_url, options) => {
          mail = JSON.parse(options.body);
          return new Response("{}", { status: 200 });
        };
        try {
          const sent = await call(access, "POST", {
            action: "request-reset",
            email: "test@example.invalid",
          });
          const missing = await call(access, "POST", {
            action: "request-reset",
            email: "absent@example.invalid",
          });
          assert.deepEqual(sent, missing);
          const resetToken = mail.text.match(/#token=([a-f0-9]{64})/)[1];
          assert(!JSON.stringify(sent).includes(resetToken));
          assert.equal(
            (await query("SELECT token_hash FROM lumi_account_tokens")).rows[0]
              .token_hash,
            security.digest(resetToken),
          );
          const redemption = {
            action: "reset",
            token: resetToken,
            password: "reset-password-example",
          };
          assert.equal((await call(access, "POST", redemption)).status, 200);
          assert.equal((await call(access, "POST", redemption)).status, 400);
          const stored = (
            await query(
              "SELECT password_hash,email_verified_at FROM lumi_accounts WHERE id=$1",
              [owner],
            )
          ).rows[0];
          assert(
            await security.verifyPassword(
              redemption.password,
              stored.password_hash,
            ),
          );
          assert(stored.email_verified_at);
          await call(access, "POST", {
            action: "request-reset",
            email: "test@example.invalid",
          });
          const expired = mail.text.match(/#token=([a-f0-9]{64})/)[1];
          await query(
            "UPDATE lumi_account_tokens SET expires_at=now()-interval '1 minute'",
          );
          assert.equal(
            (await call(access, "POST", { ...redemption, token: expired }))
              .status,
            400,
          );
          const fresh = security.newSessionToken();
          cookie = `lumi_session=${fresh}`;
          await query(
            "INSERT INTO lumi_sessions(token_hash,account_id,expires_at) VALUES($1,$2,now()+interval '1 day')",
            [security.digest(fresh), owner],
          );
          await query("DELETE FROM lumi_rate_limits");
          assert.equal(
            (await call(access, "POST", { action: "request-verify" })).status,
            200,
          );
          const verify = mail.text.match(/#token=([a-f0-9]{64})/)[1];
          assert.equal(
            (
              await call(access, "POST", {
                action: "reset",
                token: verify,
                password: "wrong-purpose-password",
              })
            ).status,
            400,
          );
          assert.equal(
            (await call(access, "POST", { action: "verify", token: verify }))
              .status,
            200,
          );
          assert.equal(
            (await call(access, "POST", { action: "verify", token: verify }))
              .status,
            400,
          );
        } finally {
          global.fetch = originalFetch;
        }
      },
    );
  } finally {
    delete process.env.RESEND_API_KEY;
    delete process.env.MAIL_FROM;
    delete global.lumiPool;
    await pg.close();
  }
});
