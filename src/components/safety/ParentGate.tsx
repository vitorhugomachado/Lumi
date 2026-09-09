"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import {
  ParentAccessStore,
  LOCKED_ACCESS,
  makeChallenge,
  checkChallenge,
} from "@/lib/safety/ParentAccessStore";
import { SAFETY_LIMITS } from "@/lib/safety/rules";
const Context = createContext<ParentAccessStore | null>(null);
export function ParentAccessProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [store] = useState(() => new ParentAccessStore());
  useEffect(() => () => store.lock(), [store]);
  return <Context.Provider value={store}>{children}</Context.Provider>;
}
export function useParentAccess() {
  const store = useContext(Context);
  if (!store) throw new Error("ParentAccessProvider ausente");
  return store;
}
export function ParentGate({ children }: { children: React.ReactNode }) {
  const store = useParentAccess();
  const access = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    () => LOCKED_ACCESS,
  );
  return access.unlocked ? children : <GateForm message={access.message} />;
}
function GateForm({ message }: { message: string }) {
  const store = useParentAccess();
  // Start with a stable SSR shell. Randomness is only requested after a click.
  const [challenge, setChallenge] = useState<ReturnType<
    typeof makeChallenge
  > | null>(null);
  const [answer, setAnswer] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => {
      setCooldown(false);
      setAttempts(0);
      setChallenge(null);
      setError("");
    }, SAFETY_LIMITS.gateCooldownMs);
    return () => clearTimeout(timer);
  }, [cooldown]);
  return (
    <main className="page parent-gate">
      <div className="eyebrow">UM MOMENTO COM QUEM CUIDA</div>
      <h1>Chame um responsável</h1>
      <p className="intro">
        Para configurar o perfil ou iniciar a voz, peça a um adulto para
        continuar.
      </p>
      {message && (
        <p className="panel" role="status">
          {message}
        </p>
      )}
      {!challenge ? (
        <button
          className="button primary"
          onClick={() => setChallenge(makeChallenge())}
        >
          Sou responsável · continuar
        </button>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (cooldown) return;
            if (checkChallenge(challenge, answer)) {
              store.unlock();
              return;
            }
            const next = attempts + 1;
            setAttempts(next);
            setAnswer("");
            setError(
              next >= 3
                ? "Aguarde 30 segundos antes de tentar novamente."
                : "Confira a conta e tente novamente.",
            );
            if (next >= 3) setCooldown(true);
            else setChallenge(makeChallenge());
          }}
        >
          <label htmlFor="parent-answer">
            Quanto é {challenge.a} + {challenge.b}?
          </label>
          <input
            id="parent-answer"
            inputMode="numeric"
            autoComplete="off"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            maxLength={3}
            disabled={cooldown}
            required
            aria-describedby="parent-error"
          />
          <p id="parent-error" role="status" className="hint">
            {error || "Digite o resultado para liberar o acesso por 5 minutos."}
          </p>
          <button className="button primary" disabled={cooldown} type="submit">
            Liberar acesso
          </button>
        </form>
      )}
      <p className="fine">
        Esta verificação ajuda a evitar toques acidentais. Não substitui a
        supervisão de um adulto.
      </p>
      <Link className="text-link" href="/">
        Voltar ao início
      </Link>
    </main>
  );
}
