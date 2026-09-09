/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const { randomUUID, randomBytes } = require("node:crypto");
async function main() {
  const origin = process.env.TEST_APP_ORIGIN;
  if (!origin) throw new Error("Set TEST_APP_ORIGIN");
  let cookie,
    registered = false;
  const password = randomBytes(24).toString("hex"),
    email = `auth-test-${randomUUID()}@example.invalid`;
  async function api(path, method = "GET", data, session = cookie) {
    const r = await fetch(origin + path, {
      method,
      headers: {
        origin,
        ...(session ? { cookie: session } : {}),
        ...(data === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: data === undefined ? undefined : JSON.stringify(data),
      signal: AbortSignal.timeout(20000),
    });
    return {
      status: r.status,
      data: await r.json(),
      setCookie: r.headers.get("set-cookie"),
    };
  }
  try {
    const guest = await api("/api/guest/", "POST", {});
    assert.equal(guest.status, 200);
    cookie = guest.setCookie.split(";")[0];
    const oldCookie = cookie;
    const profile = {
      name: "Teste",
      ageMonths: 24,
      interests: ["Animais"],
      knownWords: ["bola"],
    };
    assert.equal((await api("/api/profile/", "PUT", profile)).status, 200);
    assert.equal(
      (
        await api("/api/activities/", "POST", {
          id: randomUUID(),
          category: "sons",
          word: "A",
          seconds: 8,
        })
      ).status,
      201,
    );
    const data = {
      action: "register",
      name: "Família Teste",
      email,
      password,
      acceptTerms: true,
    };
    assert.equal(
      (await api("/api/account/", "POST", { ...data, acceptTerms: false }))
        .status,
      400,
    );
    const created = await api("/api/account/", "POST", data);
    assert.equal(created.status, 200);
    registered = true;
    cookie = created.setCookie.split(";")[0];
    assert.equal(created.data.user.id, guest.data.user.id);
    assert.equal(created.data.user.display_name, data.name);
    assert.equal(created.data.user.is_guest, false);
    assert.notEqual(cookie, oldCookie);
    assert.equal(
      (await api("/api/profile/", "GET", undefined, oldCookie)).status,
      401,
    );
    assert.deepEqual((await api("/api/profile/")).data.profile, profile);
    assert.equal((await api("/api/activities/")).data.activities.length, 1);
    assert.equal(
      (await api("/api/account/", "POST", data, undefined)).status,
      409,
    );
    assert.equal(
      (
        await api("/api/account/", "POST", {
          action: "login",
          email,
          password: "incorrect-password",
        })
      ).status,
      401,
    );
    const login = await api("/api/account/", "POST", {
      action: "login",
      email,
      password,
      remember: false,
    });
    assert.equal(login.status, 200);
    cookie = login.setCookie.split(";")[0];
    assert.doesNotMatch(login.setCookie, /Max-Age|Expires/);
    const refreshed = await api("/api/guest/", "POST", {});
    assert.equal(refreshed.status, 200);
    assert.doesNotMatch(refreshed.setCookie, /Max-Age|Expires/);
    assert.deepEqual((await api("/api/profile/")).data.profile, profile);
    console.log(
      "Auth passed: terms, guest upgrade, preserved profile/history, rotated cookie, duplicate email, wrong password, login and remember preference.",
    );
  } finally {
    if (cookie) {
      const removed = await api(
        "/api/account/",
        "DELETE",
        registered ? { password } : { confirm: true },
      );
      assert.equal(removed.status, 200);
      console.log("Temporary account removed.");
    }
  }
}
main().catch(() => {
  console.error("Auth check failed; no credentials logged.");
  process.exitCode = 1;
});
