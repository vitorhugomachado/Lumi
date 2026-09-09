export function mailEnabled() {
  return Boolean(
    process.env.RESEND_API_KEY &&
    process.env.MAIL_FROM &&
    process.env.APP_ORIGIN?.startsWith("https://"),
  );
}
export async function sendAccountLink(
  email: string,
  token: string,
  purpose: "reset" | "verify",
) {
  if (!mailEnabled()) throw new Error("Mail unavailable");
  const route = purpose === "reset" ? "recuperar-senha" : "verificar-email";
  // Fragment never reaches HTTP access logs or Referer headers.
  const link = `${process.env.APP_ORIGIN}/${route}/#token=${token}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM,
      to: [email],
      subject:
        purpose === "reset"
          ? "Lumi: redefinir sua senha"
          : "Lumi: confirmar seu e-mail",
      text: `Abra este link para ${purpose === "reset" ? "redefinir sua senha" : "confirmar seu e-mail"}:\n${link}\n\nO link expira em 30 minutos e só pode ser usado uma vez. Se você não solicitou, ignore esta mensagem.`,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Mail delivery failed");
}
