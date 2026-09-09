"use client";
import { useEffect, useState } from "react";
import { cloud, hydrateCloud, requestJson } from "@/lib/cloud";
import { useParentAccess } from "@/components/safety/ParentGate";
import { Mascot } from "./Mascot";
export function CloudProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  const access = useParentAccess();
  const [state, setState] = useState(enabled ? "loading" : "local");
  const [error, setError] = useState("");
  useEffect(() => {
    cloud.enabled = enabled;
    if (!enabled) return;
    let alive = true;
    const expire = () => {
      cloud.version++;
      cloud.profile = null;
      cloud.activities = [];
      access.lock();
      setState("account");
    };
    window.addEventListener("lumi-session-expired", expire);
    async function start() {
      try {
        const result = await requestJson("/api/account");
        if (result.user) {
          await hydrateCloud();
          if (alive) setState("ready");
        } else if (alive) setState("account");
      } catch {
        if (alive) {
          setError("Não foi possível conectar à sua conta. Tente novamente.");
          setState("error");
        }
      }
    }
    void start();
    return () => {
      alive = false;
      window.removeEventListener("lumi-session-expired", expire);
    };
  }, [enabled, access]);
  if (!enabled || state === "ready") return children;
  if (state === "account")
    return (
      <AccountForm
        onReady={() => {
          access.unlock();
          setState("ready");
        }}
      />
    );
  return (
    <main className="ref-screen">
      <Mascot className="account-mascot" />
      <h1>
        {state === "error"
          ? "Vamos tentar de novo?"
          : "Preparando suas descobertas…"}
      </h1>
      <p role="status">{error || "Conectando à conta da família."}</p>
      {state === "error" && (
        <button
          className="button primary"
          onClick={() => window.location.reload()}
        >
          Tentar novamente
        </button>
      )}
    </main>
  );
}
function AccountForm({ onReady }: { onReady: () => void }) {
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adult, setAdult] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <main className="ref-screen account-screen">
      <Mascot className="account-mascot" />
      <h1>{register ? "Crie a conta da família" : "Olá, responsável!"}</h1>
      <p>Guarde o perfil e as descobertas para continuar em outro aparelho.</p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setError("");
          try {
            await requestJson("/api/account", "POST", {
              action: register ? "register" : "login",
              email,
              password,
              adult,
            });
            await hydrateCloud();
            setPassword("");
            onReady();
          } catch (error) {
            setError(
              error instanceof Error
                ? error.message
                : "Não foi possível entrar.",
            );
          } finally {
            setPending(false);
          }
        }}
      >
        <label htmlFor="account-email">E-mail do responsável</label>
        <input
          id="account-email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={pending}
        />
        <label htmlFor="account-password">Senha</label>
        <input
          id="account-password"
          type="password"
          autoComplete={register ? "new-password" : "current-password"}
          required
          minLength={10}
          maxLength={128}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={pending}
        />
        <p className="fine">
          Use de 10 a 128 caracteres. Guarde sua senha; a recuperação por e-mail
          ainda não está disponível.
        </p>
        {register && (
          <label className="voice-consent">
            <input
              type="checkbox"
              checked={adult}
              onChange={(event) => setAdult(event.target.checked)}
              required
              disabled={pending}
            />
            <span>
              Sou responsável adulto. Vou testar o Lumi com minha própria voz.
            </span>
          </label>
        )}
        {error && (
          <p className="error-box" role="alert">
            {error}
          </p>
        )}
        <button
          className="button primary"
          disabled={pending || (register && !adult)}
        >
          {pending ? "Aguarde…" : register ? "Criar conta" : "Entrar"}
        </button>
      </form>
      <button
        className="text-link"
        disabled={pending}
        onClick={() => {
          setRegister(!register);
          setError("");
        }}
      >
        {register ? "Já tenho uma conta" : "Criar minha conta"}
      </button>
      <p className="fine">
        O perfil e a participação serão salvos na sua conta. Áudio e vídeo dos
        exercícios não são gravados. A conversa Gemini pede consentimento
        separado.
      </p>
    </main>
  );
}
