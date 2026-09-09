"use client";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { cloud } from "@/lib/cloud";
type Mode = "reset" | "verify" | "change";
const subscribe = () => () => {};
export function AccountAccess({ mode }: { mode: Mode }) {
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return ready ? (
    <AccessForm mode={mode} />
  ) : (
    <main className="page">
      <p role="status">Carregando…</p>
    </main>
  );
}
function AccessForm({ mode }: { mode: Mode }) {
  const [token] = useState(
    () => new URLSearchParams(window.location.hash.slice(1)).get("token") || "",
  );
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (token) window.history.replaceState(null, "", window.location.pathname);
    let alive = true;
    fetch("/api/account-access/")
      .then((r) => r.json())
      .then((data) => {
        if (alive) setEnabled(data.emailEnabled);
      })
      .catch(() => {
        if (alive) setEnabled(false);
      });
    return () => {
      alive = false;
    };
  }, [token]);
  const unavailable = !token && mode !== "change" && !enabled;
  return (
    <main className="page">
      <Link
        className="back-round"
        href={mode === "reset" ? "/login" : "/familia"}
        aria-label="Voltar"
      >
        ←
      </Link>
      <h1>
        {mode === "change"
          ? "Trocar senha"
          : mode === "verify"
            ? "Confirmar e-mail"
            : "Recuperar senha"}
      </h1>
      {unavailable && (
        <p role="status">
          {enabled === null
            ? "Carregando…"
            : "O envio de e-mails ainda não está disponível. Você pode continuar brincando sem conta."}
        </p>
      )}
      {!done && (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (pending) return;
            const data = new FormData(event.currentTarget);
            if (
              (mode === "change" || (token && mode === "reset")) &&
              data.get("password") !== data.get("confirmation")
            ) {
              setError("As senhas precisam ser iguais.");
              return;
            }
            setPending(true);
            setError("");
            setMessage("");
            try {
              const response = await fetch("/api/account-access/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action:
                    mode === "change"
                      ? "change-password"
                      : token
                        ? mode
                        : `request-${mode}`,
                  token,
                  email: data.get("email"),
                  currentPassword: data.get("currentPassword"),
                  password: data.get("password"),
                }),
              });
              const result = await response.json();
              if (!response.ok)
                throw new Error(result.error || "Não foi possível concluir.");
              if (mode === "change") {
                cloud.version++;
                cloud.user = null;
                cloud.profile = null;
                cloud.activities = [];
                cloud.childId = null;
              }
              setMessage(
                result.message ||
                  (mode === "verify"
                    ? "E-mail confirmado!"
                    : "Senha atualizada. Entre novamente com sua nova senha."),
              );
              setDone(true);
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Não foi possível conectar.",
              );
            } finally {
              setPending(false);
            }
          }}
        >
          <fieldset disabled={pending || unavailable}>
            {mode === "reset" && !token && (
              <>
                <label htmlFor="recovery-email">E-mail da conta</label>
                <input
                  id="recovery-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  required
                />
              </>
            )}
            {mode === "change" && (
              <>
                <label htmlFor="current-password">Senha atual</label>
                <input
                  id="current-password"
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  maxLength={128}
                  required
                />
              </>
            )}
            {(mode === "change" || (mode === "reset" && token)) && (
              <>
                <label htmlFor="new-password">
                  Nova senha (mínimo 10 caracteres)
                </label>
                <input
                  id="new-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={10}
                  maxLength={128}
                  required
                />
                <label htmlFor="confirm-password">Repita a nova senha</label>
                <input
                  id="confirm-password"
                  name="confirmation"
                  type="password"
                  autoComplete="new-password"
                  minLength={10}
                  maxLength={128}
                  required
                />
              </>
            )}
            {mode === "verify" && (
              <p>
                {token
                  ? "Confirme para validar o e-mail da sua conta."
                  : "Enviaremos um link para o e-mail da sua conta. Isso é opcional para continuar brincando."}
              </p>
            )}
            <button className="button primary" type="submit">
              {pending
                ? "Aguarde…"
                : mode === "change" || (mode === "reset" && token)
                  ? "Salvar nova senha"
                  : token
                    ? "Confirmar e-mail"
                    : "Enviar link por e-mail"}
            </button>
          </fieldset>
        </form>
      )}
      {message && <p role="status">{message}</p>}
      {error && (
        <p role="alert" className="error-box">
          {error}
        </p>
      )}
      {done && (
        <button
          className="button secondary"
          onClick={() =>
            window.location.assign(
              new URL(
                mode === "verify" ? "/familia/" : "/login/",
                window.location.origin,
              ).href,
            )
          }
        >
          {mode === "verify" ? "Voltar à família" : "Ir para o login"}
        </button>
      )}
      <button
        className="auth-guest"
        onClick={() =>
          window.location.assign(
            new URL("/inicio/", window.location.origin).href,
          )
        }
      >
        Continuar brincando →
      </button>
    </main>
  );
}
