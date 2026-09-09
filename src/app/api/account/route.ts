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
  if (!process.env.DATABASE_URL)
    throw new ApiError(
      503,
      "Para entrar ou criar uma conta, use a versão online do Lumi.",
    );
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
  let user: {
    id: string;
    email: string;
    display_name?: string | null;
    is_guest?: boolean;
  };
  const remember = !("remember" in input) || input.remember !== false;
  const duration = remember ? SESSION_SECONDS : 86400;
  const token = newSessionToken();
  if (input.action === "register") {
    if (
      !("name" in input) ||
      typeof input.name !== "string" ||
      !input.name.trim() ||
      input.name.trim().length > 100
    )
      throw new ApiError(400, "Informe seu nome (até 100 caracteres).");
    if (!("acceptTerms" in input) || input.acceptTerms !== true)
      throw new ApiError(
        400,
        "Leia e aceite os termos e a política de privacidade.",
      );
    await limit("register-global", 10, 3600);
    const name = input.name.trim();
    const hash = await hashPassword(input.password);
    let current: Awaited<ReturnType<typeof account>> | null = null;
    try {
      current = await account(request);
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
    }
    try {
      user = await transaction(async (client) => {
        const id = current?.is_guest ? current.id : randomUUID();
        // Lock and promote the same guest owner, preserving its profile/history.
        const result = current?.is_guest
          ? await client.query(
              "UPDATE lumi_accounts SET email=$2,password_hash=$3,display_name=$4,is_guest=false,terms_version='2026-09-09',terms_accepted_at=now() WHERE id=$1 AND is_guest=true RETURNING id,email,display_name,is_guest",
              [id, email, hash, name],
            )
          : await client.query(
              "INSERT INTO lumi_accounts(id,email,password_hash,display_name,terms_version,terms_accepted_at) VALUES($1,$2,$3,$4,'2026-09-09',now()) RETURNING id,email,display_name,is_guest",
              [id, email, hash, name],
            );
        if (!result.rows[0])
          throw new ApiError(
            409,
            "Esta sessão já criou uma conta. Entre para continuar.",
          );
        await client.query("DELETE FROM lumi_sessions WHERE account_id=$1", [
          id,
        ]);
        await client.query(
          "INSERT INTO lumi_sessions(token_hash,account_id,expires_at,remember_me) VALUES($1,$2,now()+$3*interval '1 second',$4)",
          [digest(token), id, duration, remember],
        );
        return result.rows[0];
      });
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "23505"
      )
        throw new ApiError(409, "Este e-mail já tem uma conta. Use Entrar.");
      throw error;
    }
  } else {
    const result = await db().query(
      "SELECT id,email,password_hash,display_name FROM lumi_accounts WHERE email=$1",
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
    user = {
      id: found.id,
      email: found.email,
      display_name: found.display_name,
      is_guest: false,
    };
    await transaction(async (client) => {
      await client.query(
        "INSERT INTO lumi_sessions(token_hash,account_id,expires_at,remember_me) VALUES($1,$2,now()+$3*interval '1 second',$4)",
        [digest(token), user.id, duration, remember],
      );
      await client.query(
        "DELETE FROM lumi_sessions WHERE account_id=$1 AND token_hash NOT IN (SELECT token_hash FROM lumi_sessions WHERE account_id=$1 ORDER BY created_at DESC LIMIT 5)",
        [user.id],
      );
    });
  }
  return json({ user }, 200, { "Set-Cookie": cookie(token, false, remember) });
});

export const DELETE = api(async (request) => {
  const user = await account(request);
  const input = await body(request);
  if (user.is_guest) {
    if (
      !input ||
      typeof input !== "object" ||
      !("confirm" in input) ||
      input.confirm !== true
    )
      throw new ApiError(400, "Confirme a exclusão dos seus dados.");
    await db().query(
      "DELETE FROM lumi_accounts WHERE id=$1 AND is_guest=true",
      [user.id],
    );
    return json({ ok: true }, 200, { "Set-Cookie": cookie("", true) });
  }

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
