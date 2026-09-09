import { randomUUID } from "node:crypto";
import { db, transaction } from "@/lib/server/db";
import { account, api, ApiError, body, json, limit } from "@/lib/server/http";
import {
  cookie,
  digest,
  hashPassword,
  newSessionToken,
  SESSION_SECONDS,
  sessionToken,
  validCredentials,
  verifyPassword,
} from "@/lib/server/security";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = api(async (request) => {
  if (!process.env.DATABASE_URL) return json({ enabled: false, user: null });
  try {
    return json({ enabled: true, user: await account(request) });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401)
      return json({ enabled: true, user: null });
    throw error;
  }
});
export const POST = api(async (request) => {
  const input = await body(request);
  if (
    input &&
    typeof input === "object" &&
    "action" in input &&
    input.action === "logout"
  ) {
    const token = sessionToken(request);
    if (token)
      await db().query("DELETE FROM lumi_sessions WHERE token_hash=$1", [
        digest(token),
      ]);
    return json({ ok: true }, 200, { "Set-Cookie": cookie("", true) });
  }
  if (!validCredentials(input))
    throw new ApiError(
      400,
      "Informe um e-mail válido e uma senha de 10 a 128 caracteres.",
    );
  const email = input.email.trim().toLowerCase();
  await limit("account-global", 60, 60);
  await limit(`account:${email}`, 10, 900);
  await db().query("DELETE FROM lumi_sessions WHERE expires_at<now()");
  await db().query(
    "DELETE FROM lumi_rate_limits WHERE expires_at<now()-interval '1 day'",
  );
  let user: { id: string; email: string };
  const token = newSessionToken();
  if (input.action === "register") {
    if (!("adult" in input) || input.adult !== true)
      throw new ApiError(
        400,
        "O cadastro deve ser feito por um responsável adulto.",
      );
    await limit("register-global", 10, 3600);
    const id = randomUUID();
    const hash = await hashPassword(input.password);
    const created = await transaction(async (client) => {
      const result = await client.query(
        "INSERT INTO lumi_accounts(id,email,password_hash) VALUES($1,$2,$3) ON CONFLICT(email) DO NOTHING RETURNING id,email",
        [id, email, hash],
      );
      if (!result.rows[0])
        throw new ApiError(
          409,
          "Não foi possível cadastrar este e-mail. Tente entrar na sua conta.",
        );
      await client.query(
        "INSERT INTO lumi_sessions(token_hash,account_id,expires_at) VALUES($1,$2,now()+$3*interval '1 second')",
        [digest(token), id, SESSION_SECONDS],
      );
      return result.rows[0];
    });
    user = created;
  } else {
    const result = await db().query(
      "SELECT id,email,password_hash FROM lumi_accounts WHERE email=$1",
      [email],
    );
    const found = result.rows[0];
    const dummy = `${"0".repeat(32)}:${"0".repeat(128)}`;
    const valid = await verifyPassword(
      input.password,
      found?.password_hash ?? dummy,
    );
    if (!found || !valid)
      throw new ApiError(401, "E-mail ou senha incorretos.");
    user = { id: found.id, email: found.email };
    await transaction(async (client) => {
      await client.query(
        "INSERT INTO lumi_sessions(token_hash,account_id,expires_at) VALUES($1,$2,now()+$3*interval '1 second')",
        [digest(token), user.id, SESSION_SECONDS],
      );
      await client.query(
        "DELETE FROM lumi_sessions WHERE account_id=$1 AND token_hash NOT IN (SELECT token_hash FROM lumi_sessions WHERE account_id=$1 ORDER BY created_at DESC LIMIT 5)",
        [user.id],
      );
    });
  }
  return json({ user }, 200, { "Set-Cookie": cookie(token) });
});

export const DELETE = api(async (request) => {
  const user = await account(request);
  const input = await body(request);
  if (
    !input ||
    typeof input !== "object" ||
    !("password" in input) ||
    typeof input.password !== "string" ||
    input.password.length > 128
  )
    throw new ApiError(400, "Confirme sua senha.");
  await limit(`account:${user.email}`, 10, 900);
  const result = await db().query(
    "SELECT password_hash FROM lumi_accounts WHERE id=$1",
    [user.id],
  );
  if (
    !result.rows[0] ||
    !(await verifyPassword(input.password, result.rows[0].password_hash))
  )
    throw new ApiError(401, "Senha incorreta.");
  await db().query("DELETE FROM lumi_accounts WHERE id=$1", [user.id]);
  return json({ ok: true }, 200, { "Set-Cookie": cookie("", true) });
});
