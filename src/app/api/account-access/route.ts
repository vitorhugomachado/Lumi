import { db, transaction } from "@/lib/server/db";
import { account, api, ApiError, body, json, limit } from "@/lib/server/http";
import {
  digest,
  hashPassword,
  newSessionToken,
  verifyPassword,
} from "@/lib/server/security";
import { mailEnabled, sendAccountLink } from "@/lib/server/mail";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = api(async () => json({ emailEnabled: mailEnabled() }));
export const POST = api(async (request) => {
  const input = await body(request);
  if (!input || typeof input !== "object" || !("action" in input))
    throw new ApiError(400, "Solicitação inválida.");
  const data = input as Record<string, unknown>;
  if (data.action === "change-password") {
    const user = await account(request);
    if (user.is_guest)
      throw new ApiError(400, "Entre em sua conta para trocar a senha.");
    if (
      typeof data.currentPassword !== "string" ||
      data.currentPassword.length > 128 ||
      typeof data.password !== "string" ||
      data.password.length < 10 ||
      data.password.length > 128
    )
      throw new ApiError(
        400,
        "Confira a senha atual e use uma nova senha de 10 a 128 caracteres.",
      );
    await limit(`password:${user.id}`, 5, 900);
    const hash = await hashPassword(data.password);
    await transaction(async (client) => {
      const found = await client.query(
        "SELECT password_hash FROM lumi_accounts WHERE id=$1 FOR UPDATE",
        [user.id],
      );
      if (
        !found.rows[0] ||
        !(await verifyPassword(
          data.currentPassword as string,
          found.rows[0].password_hash,
        ))
      )
        throw new ApiError(400, "Senha atual incorreta.");
      await client.query(
        "UPDATE lumi_accounts SET password_hash=$2 WHERE id=$1",
        [user.id, hash],
      );
      await client.query("DELETE FROM lumi_sessions WHERE account_id=$1", [
        user.id,
      ]);
      await client.query(
        "DELETE FROM lumi_account_tokens WHERE account_id=$1",
        [user.id],
      );
    });
    return json({ ok: true });
  }
  if (data.action === "request-reset" || data.action === "request-verify") {
    if (!mailEnabled())
      throw new ApiError(
        503,
        "O envio de e-mails ainda não está disponível. Tente novamente mais tarde.",
      );
    await limit("mail-global", 30, 3600);
    let owner: string | undefined;
    let email: string;
    const purpose = data.action === "request-reset" ? "reset" : "verify";
    if (purpose === "verify") {
      const user = await account(request);
      if (user.is_guest || !user.email)
        throw new ApiError(400, "Entre em sua conta para confirmar o e-mail.");
      owner = user.id;
      email = user.email;
    } else {
      if (
        typeof data.email !== "string" ||
        data.email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())
      )
        throw new ApiError(400, "Informe um e-mail válido.");
      email = data.email.trim().toLowerCase();
      const found = await db().query(
        "SELECT id FROM lumi_accounts WHERE email=$1 AND is_guest=false",
        [email],
      );
      owner = found.rows[0]?.id;
    }
    await limit(`mail:${email}`, 3, 1800);
    if (owner) {
      const token = newSessionToken();
      await db().query(
        "INSERT INTO lumi_account_tokens(token_hash,account_id,purpose,expires_at) VALUES($1,$2,$3,now()+interval '30 minutes') ON CONFLICT(account_id,purpose) DO UPDATE SET token_hash=excluded.token_hash,expires_at=excluded.expires_at",
        [digest(token), owner, purpose],
      );
      try {
        await sendAccountLink(email, token, purpose);
      } catch {
        await db().query(
          "DELETE FROM lumi_account_tokens WHERE token_hash=$1",
          [digest(token)],
        );
        // Same public result for absent accounts and delivery failures.
        console.error("Account email could not be delivered.");
      }
    }
    return json({
      ok: true,
      message:
        "Se o e-mail estiver cadastrado, você receberá um link. Confira também o spam. Se não chegar, tente novamente mais tarde.",
    });
  }
  if (data.action !== "reset" && data.action !== "verify")
    throw new ApiError(400, "Solicitação inválida.");
  if (typeof data.token !== "string" || !/^[a-f0-9]{64}$/.test(data.token))
    throw new ApiError(400, "Link inválido ou expirado.");
  if (
    data.action === "reset" &&
    (typeof data.password !== "string" ||
      data.password.length < 10 ||
      data.password.length > 128)
  )
    throw new ApiError(400, "Use uma senha de 10 a 128 caracteres.");
  await limit("token-redemption", 60, 60);
  const hash =
    data.action === "reset"
      ? await hashPassword(data.password as string)
      : null;
  await transaction(async (client) => {
    const result = await client.query(
      "DELETE FROM lumi_account_tokens WHERE token_hash=$1 AND purpose=$2 AND expires_at>now() RETURNING account_id",
      [digest(data.token as string), data.action],
    );
    if (!result.rows[0])
      throw new ApiError(
        400,
        "Link inválido ou expirado. Solicite outro link.",
      );
    const owner = result.rows[0].account_id;
    if (hash) {
      await client.query(
        "UPDATE lumi_accounts SET password_hash=$2,email_verified_at=COALESCE(email_verified_at,now()) WHERE id=$1",
        [owner, hash],
      );
      await client.query("DELETE FROM lumi_sessions WHERE account_id=$1", [
        owner,
      ]);
      await client.query(
        "DELETE FROM lumi_account_tokens WHERE account_id=$1",
        [owner],
      );
    } else
      await client.query(
        "UPDATE lumi_accounts SET email_verified_at=now() WHERE id=$1",
        [owner],
      );
  });
  return json({ ok: true });
});
