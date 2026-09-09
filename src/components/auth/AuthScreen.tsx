"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Mascot } from "@/components/app/Mascot";
import { cloud, hydrateCloud } from "@/lib/cloud";
function FieldIcon({ kind }: { kind: "email" | "name" | "lock" | "eye" }) {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === "email" ? (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 6 9 7 9-7" />
        </>
      ) : kind === "name" ? (
        <>
          <circle cx="12" cy="7" r="4" />
          <path d="M4 21v-3a8 8 0 0 1 16 0v3Z" />
        </>
      ) : kind === "lock" ? (
        <>
          <rect x="5" y="10" width="14" height="11" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" />
        </>
      ) : (
        <>
          <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}
export function AuthScreen({ register = false }: { register?: boolean }) {
  const router = useRouter();
  const [shown, setShown] = useState(false);
  const [confirmationShown, setConfirmationShown] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const recovery = useRef<HTMLDialogElement>(null);
  return (
    <main
      className={`auth-screen ${register ? "auth-register" : "auth-login"}`}
    >
      <header className="auth-hero">
        <Link
          href="/inicio"
          className="auth-brand"
          aria-label="Lumi, voltar ao início"
        >
          <span>
            Lumi<i>★</i>
          </span>
          <small>Comunicação que ilumina</small>
        </Link>
        <div className="auth-sparkles" aria-hidden="true">
          ✦<b>✧</b>
          <i>✦</i>
          <em>✧</em>
        </div>
        <span className="auth-star star-left" aria-hidden="true">
          🌟
        </span>
        <span className="auth-star star-right" aria-hidden="true">
          🌟
        </span>
        <p className="auth-bubble bubble-left">
          {register ? (
            <>
              Grandes
              <br />
              conquistas
              <br />
              começam
              <br />
              com você!
            </>
          ) : (
            <>
              Juntos
              <br />
              por um futuro
              <br />
              com mais
              <br />
              vozes!
            </>
          )}
          <span>♡</span>
        </p>
        <p className="auth-bubble bubble-right">
          {register ? (
            <>
              Você
              <br />
              faz parte
              <br />
              dessa jornada!
            </>
          ) : (
            <>
              Você
              <br />
              conseguiu!
            </>
          )}
          <span>♡</span>
        </p>
        <Mascot className="auth-mascot" />
        <div className="auth-cloud cloud-left" />
        <div className="auth-cloud cloud-right" />
      </header>
      <section className="auth-card" aria-labelledby="auth-title">
        <h1 id="auth-title">
          {register ? "Crie sua conta" : "Bem-vindo à Lumi"}
        </h1>
        <p className="auth-intro">
          {register ? (
            <>
              Cadastre-se para começar a jornada
              <br />
              de fala, aprendizado e descobertas.
            </>
          ) : (
            <>
              Entre para continuar a jornada
              <br />
              de fala e descobertas.
            </>
          )}
        </p>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (pending) return;
            setError("");
            const form = event.currentTarget;
            const data = new FormData(form);
            const password = String(data.get("password") ?? "");
            if (register && password !== data.get("confirmation")) {
              setError("As senhas precisam ser iguais.");
              return;
            }
            if (!cloud.enabled) {
              setError(
                "Entre ou crie sua conta na versão online do Lumi pelo link abaixo.",
              );
              return;
            }
            setPending(true);
            try {
              const response = await fetch("/api/account/", {
                method: "POST",
                credentials: "same-origin",
                cache: "no-store",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: register ? "register" : "login",
                  email: String(data.get("email")).trim(),
                  password,
                  name: data.get("name"),
                  acceptTerms: data.get("terms") === "on",
                  remember: register || data.get("remember") === "on",
                }),
              });
              const result = await response.json();
              if (!response.ok)
                throw new Error(
                  result.error || "Não foi possível entrar. Tente novamente.",
                );
              cloud.version++;
              cloud.profile = null;
              cloud.activities = [];
              cloud.user = result.user;
              await hydrateCloud();
              form.reset();
              router.replace("/inicio");
            } catch (e) {
              setError(
                e instanceof Error
                  ? e.message
                  : "Não foi possível conectar. Tente novamente.",
              );
            } finally {
              setPending(false);
            }
          }}
        >
          <fieldset disabled={pending}>
            {register && (
              <label className="auth-field">
                Nome completo
                <span className="auth-input">
                  <FieldIcon kind="name" />
                  <input
                    name="name"
                    placeholder="Seu nome"
                    autoComplete="name"
                    maxLength={100}
                    required
                  />
                </span>
              </label>
            )}
            <label className="auth-field">
              E-mail
              <span className="auth-input">
                <FieldIcon kind="email" />
                <input
                  name="email"
                  type="email"
                  placeholder="seu@email.com"
                  autoComplete="email"
                  maxLength={254}
                  required
                />
              </span>
            </label>
            <label className="auth-field">
              Senha
              <span className="auth-input">
                <FieldIcon kind="lock" />
                <input
                  name="password"
                  type={shown ? "text" : "password"}
                  placeholder={register ? "Crie uma senha" : "Sua senha"}
                  autoComplete={register ? "new-password" : "current-password"}
                  minLength={10}
                  maxLength={128}
                  aria-describedby={register ? "password-help" : undefined}
                  required
                />
                <button
                  type="button"
                  className="auth-eye"
                  aria-label={shown ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={shown}
                  onClick={() => setShown(!shown)}
                >
                  <FieldIcon kind="eye" />
                </button>
              </span>
            </label>
            {register && (
              <>
                <p id="password-help" className="auth-password-hint">
                  Use pelo menos 10 caracteres.
                </p>
                <label className="auth-field">
                  Confirmar senha
                  <span className="auth-input">
                    <FieldIcon kind="lock" />
                    <input
                      name="confirmation"
                      type={confirmationShown ? "text" : "password"}
                      placeholder="Repita sua senha"
                      autoComplete="new-password"
                      minLength={10}
                      maxLength={128}
                      required
                    />
                    <button
                      type="button"
                      className="auth-eye"
                      aria-label={
                        confirmationShown
                          ? "Ocultar confirmação da senha"
                          : "Mostrar confirmação da senha"
                      }
                      aria-pressed={confirmationShown}
                      onClick={() => setConfirmationShown(!confirmationShown)}
                    >
                      <FieldIcon kind="eye" />
                    </button>
                  </span>
                </label>
              </>
            )}
            <div className="auth-options">
              {register ? (
                <label className="auth-check">
                  <input name="terms" type="checkbox" required />
                  <span>
                    Li e aceito os{" "}
                    <Link href="/termos" target="_blank">
                      Termos
                    </Link>{" "}
                    e a{" "}
                    <Link href="/privacidade" target="_blank">
                      Política de Privacidade
                    </Link>
                    .
                  </span>
                </label>
              ) : (
                <>
                  <label className="auth-check">
                    <input name="remember" type="checkbox" defaultChecked />
                    <span>Lembrar de mim</span>
                  </label>
                  <button
                    className="auth-text"
                    type="button"
                    onClick={() => recovery.current?.showModal()}
                  >
                    Esqueci minha senha?
                  </button>
                </>
              )}
            </div>
            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="auth-submit" disabled={pending}>
              {pending ? "Aguarde…" : register ? "Criar conta" : "Entrar"}
              <span aria-hidden="true">→</span>
            </button>
          </fieldset>
        </form>
        <Link
          className="auth-alternate"
          href={register ? "/login" : "/criar-conta"}
        >
          {register ? "Já tenho conta" : "Criar conta"}
        </Link>
        <div className="auth-divider">
          <span>ou</span>
        </div>
        <div
          className="auth-socials"
          aria-label="Outras formas de entrar, em breve"
        >
          <button type="button" disabled>
            <b className="google-mark" aria-hidden="true">
              G
            </b>
            <span>Continuar com Google</span>
            <small>Em breve</small>
          </button>
          <button type="button" disabled>
            <svg
              width="21"
              height="22"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M17 2c.2 2-1.4 4-3.5 4 .1-2 1.5-3.7 3.5-4ZM20.8 17.5c-.7 1.7-2.3 4.4-4 4.5-1 .1-1.7-.7-3-.7s-2.1.7-3.1.7c-1.8-.1-4.3-3.8-4.8-7.1-.7-4.1 1.7-6.9 4.2-6.9 1.2 0 2.2.8 3.1.8 1 0 2.6-1 4-1 1.3.1 2.5.7 3.3 1.8-3 1.7-2.4 6.2.3 7.9Z" />
            </svg>
            <span>Continuar com Apple</span>
            <small>Em breve</small>
          </button>
        </div>
        <footer className="auth-footer">
          <span aria-hidden="true">🛡️</span>
          <p>
            Um espaço para famílias e descobertas
            <small>
              Veja como cuidamos dos dados na{" "}
              <Link href="/privacidade">política de privacidade</Link>.
            </small>
          </p>
        </footer>
        <Link className="auth-guest" href="/inicio">
          Continuar sem conta →
        </Link>
        {!cloud.enabled && (
          <p className="auth-local">
            Contas estão disponíveis no site publicado.{" "}
            <a
              href={`https://lumi-production-86eb.up.railway.app/${register ? "criar-conta" : "login"}/`}
            >
              Abrir versão online
            </a>
          </p>
        )}
      </section>
      <dialog ref={recovery} className="auth-dialog">
        <h2>Recuperar senha</h2>
        <p>
          A recuperação por e-mail ainda não está disponível. Você pode
          continuar sem conta; o acesso ao perfil da conta exige sua senha.
        </p>
        <button
          className="auth-submit"
          onClick={() => recovery.current?.close()}
        >
          Entendi
        </button>
      </dialog>
    </main>
  );
}
