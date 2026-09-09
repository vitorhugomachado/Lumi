/* eslint-disable @typescript-eslint/no-require-imports */
// Explicit opt-in integration check against a running database-backed deployment.
// Creates only two temporary test accounts, and removes them with their data.
const assert = require("node:assert/strict");
const { randomUUID, randomBytes } = require("node:crypto");
async function main() {
  const origin = process.env.TEST_APP_ORIGIN;
  if (!origin) throw new Error("Set TEST_APP_ORIGIN.");
  const users = [];
  const guestMode = process.env.TEST_GUEST === "1";
  async function request(path, method = "GET", data, session) {
    const response = await fetch(origin + path, {
      method,
      headers: {
        origin,
        ...(data === undefined ? {} : { "Content-Type": "application/json" }),
        ...(session ? { cookie: session.cookie } : {}),
      },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    return {
      status: response.status,
      data: await response.json(),
      cookie: response.headers.get("set-cookie")?.split(";")[0],
    };
  }
  try {
    assert.equal((await request("/api/health")).data.database, "connected");
    assert.equal((await request("/api/profile")).status, 401);
    assert.equal((await request("/api/activities")).status, 401);
    assert.equal((await request("/api/gemini-token", "POST", {})).status, 401);
    for (let i = 0; i < 2; i++) {
      const email = `lumi-test-${randomUUID()}@example.invalid`;
      const password = randomBytes(24).toString("hex");
      const result = guestMode
        ? await request("/api/guest", "POST", {})
        : await request("/api/account", "POST", {
            action: "register",
            email,
            password,
            adult: true,
          });
      assert.equal(result.status, 200);
      users.push({ email, password, cookie: result.cookie });
      assert(result.cookie);
      const reused = await request("/api/guest", "POST", {}, users[i]);
      assert.equal(reused.status, 200);
      assert.equal(reused.data.user.id, result.data.user.id);
      assert.equal(reused.data.user.is_guest, guestMode);
      assert.equal(reused.cookie, result.cookie);
      assert.equal(
        (await request("/api/profile", "GET", undefined, users[i])).data
          .profile,
        null,
      );
    }
    const [a, b] = users;
    const deniedGuest = await fetch(origin + "/api/guest/", {
      method: "POST",
      headers: {
        origin: "https://different.example",
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    assert.equal(deniedGuest.status, 403);
    if (guestMode)
      assert.equal(
        (await request("/api/account", "DELETE", {}, a)).status,
        400,
      );

    if (process.env.TEST_GEMINI === "1") {
      const credential = await request("/api/gemini-token", "POST", {}, a);
      assert.equal(credential.status, 200);
      assert.equal(typeof credential.data.token, "string");
      console.log(
        "Authenticated Gemini credential verified (token not logged).",
      );
    }
    assert.equal(
      (
        await request(
          "/api/profile",
          "PUT",
          {
            name: "Teste",
            ageMonths: 24,
            interests: ["Animais"],
            knownWords: [],
          },
          a,
        )
      ).status,
      200,
    );
    assert.equal(
      (await request("/api/profile", "GET", undefined, b)).data.profile,
      null,
    );
    const activity = {
      id: randomUUID(),
      category: "sons",
      word: "A",
      seconds: 8,
    };
    assert.equal(
      (await request("/api/activities", "POST", activity, a)).status,
      201,
    );
    assert.equal(
      (await request("/api/activities", "POST", activity, a)).status,
      201,
    );
    assert.equal(
      (await request("/api/activities", "GET", undefined, a)).data.activities
        .length,
      1,
    );
    assert.equal(
      (await request("/api/activities", "GET", undefined, b)).data.activities
        .length,
      0,
    );
    const denied = await fetch(origin + "/api/profile", {
      method: "DELETE",
      headers: { origin: "https://different.example", cookie: a.cookie },
    });
    assert.equal(denied.status, 403);
    assert.equal(
      (await request("/api/profile", "DELETE", undefined, b)).status,
      200,
    );
    assert.equal(
      (await request("/api/profile", "GET", undefined, a)).data.profile.name,
      "Teste",
    );
    if (!guestMode) {
      assert.equal(
        (await request("/api/account", "POST", { action: "logout" }, a)).status,
        200,
      );
      assert.equal(
        (await request("/api/profile", "GET", undefined, a)).status,
        401,
      );
      const login = await request("/api/account", "POST", {
        action: "login",
        email: a.email,
        password: a.password,
      });
      assert.equal(login.status, 200);
      a.cookie = login.cookie;
      assert.equal(
        (await request("/api/profile", "GET", undefined, a)).data.profile.name,
        "Teste",
      );
    }
    console.log(
      guestMode
        ? "Guest integration passed: automatic session, reuse, no profile prerequisite, persistence, isolation, idempotency and CSRF."
        : "Account integration passed: auth, persistence, isolation, idempotency, CSRF, logout and login.",
    );
  } finally {
    let failures = 0;
    for (const user of users) {
      try {
        const removed = await request(
          "/api/account",
          "DELETE",
          guestMode ? { confirm: true } : { password: user.password },
          user,
        );
        if (removed.status !== 200) failures++;
      } catch {
        failures++;
      }
    }
    if (failures)
      throw new Error(
        "Temporary test-account cleanup failed; inspect the database.",
      );
    console.log("Temporary test accounts removed.");
  }
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Backend test failed.",
  );
  process.exitCode = 1;
});
