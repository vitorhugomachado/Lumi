/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
async function main() {
  const origin = process.env.TEST_APP_ORIGIN;
  if (!origin) throw new Error("Set TEST_APP_ORIGIN");
  let cookie, other;
  async function call(path, method = "GET", data, child, session = cookie) {
    const r = await fetch(origin + path, {
      method,
      headers: {
        origin,
        ...(session ? { cookie: session } : {}),
        "Content-Type": "application/json",
        ...(child ? { "x-lumi-child": child } : {}),
      },
      body: data === undefined ? undefined : JSON.stringify(data),
      signal: AbortSignal.timeout(20000),
    });
    return {
      status: r.status,
      data: await r.json(),
      cookie: r.headers.get("set-cookie")?.split(";")[0],
    };
  }
  try {
    const guest = await call("/api/guest/", "POST", {});
    assert.equal(guest.status, 200);
    cookie = guest.cookie;
    const secondGuest = await call("/api/guest/", "POST", {}, null, "");
    assert.equal(secondGuest.status, 200);
    other = secondGuest.cookie;
    const first = (await call("/api/children/")).data.children[0].id;
    const foreign = (
      await call("/api/children/", "GET", undefined, null, other)
    ).data.children[0].id;
    const profile = {
      name: "Sofia",
      ageMonths: 24,
      interests: ["Animais"],
      knownWords: ["gato"],
    };
    assert.equal(
      (await call("/api/profile/", "PUT", profile, first)).status,
      200,
    );
    const made = await call("/api/children/", "POST", {
      ...profile,
      name: "Lucas",
      interests: ["Bola"],
    });
    assert.equal(made.status, 201);
    const child = made.data.id;
    assert.equal(
      (
        await call(
          "/api/activities/",
          "POST",
          { id: randomUUID(), category: "sons", word: "A", seconds: 8 },
          first,
        )
      ).status,
      201,
    );
    assert.deepEqual(
      (await call("/api/activities/", "GET", undefined, child)).data.activities,
      [],
    );
    assert.equal(
      (await call("/api/profile/", "GET", undefined, foreign)).status,
      404,
    );
    assert.equal(
      (await call("/api/children/", "DELETE", { confirm: true }, foreign))
        .status,
      404,
    );
    if (process.env.TEST_GEMINI === "1") {
      const voice = await call(
        "/api/gemini-token/",
        "POST",
        { profile: { ...profile, name: "forged" } },
        child,
      );
      assert.equal(voice.status, 200);
      assert.equal(voice.data.profile.name, "Lucas");
      assert.deepEqual(voice.data.profile.interests, ["Bola"]);
      const anonymous = await call(
        "/api/gemini-token/",
        "POST",
        {},
        foreign,
        other,
      );
      assert.equal(anonymous.status, 200);
      assert.equal(anonymous.data.profile, null);
    }
    assert.equal(
      (await call("/api/children/", "DELETE", { confirm: true }, child)).status,
      200,
    );
    assert.equal(
      (await call("/api/profile/", "GET", undefined, child)).status,
      404,
    );
    assert.equal(
      (await call("/api/activities/", "GET", undefined, first)).data.activities
        .length,
      1,
    );
    assert.equal(
      (await call("/api/profile/", "GET", undefined, first)).data.profile.name,
      "Sofia",
    );
    console.log(
      "Family integration passed: child ownership, separate progress, deletion and optional Gemini profile binding.",
    );
  } finally {
    for (const session of [cookie, other].filter(Boolean)) {
      const removed = await call(
        "/api/account/",
        "DELETE",
        { confirm: true },
        null,
        session,
      );
      assert.equal(removed.status, 200, "Temporary test account cleanup");
    }
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
