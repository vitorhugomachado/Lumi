"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { loadProfile } from "@/lib/child/storage";
import type { VoiceState } from "@/lib/voice/VoiceProvider";
import { createVoiceProvider } from "@/lib/voice/createVoiceProvider";
import { LumiScene } from "@/components/lumi/LumiScene";
import { LumiState } from "@/components/lumi/LumiState";
import { MicrophoneButton } from "@/components/voice/MicrophoneButton";
const subscribe = () => () => {};
export default function ConversationPage() {
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return ready ? (
    <Conversation />
  ) : (
    <main>
      <p role="status">Preparando o Lumi...</p>
    </main>
  );
}
function Conversation() {
  const router = useRouter();
  const lifecycle = useRef({ generation: 0 });
  const isMock = (process.env.NEXT_PUBLIC_VOICE_PROVIDER ?? "mock") === "mock";
  const [consent, setConsent] = useState(false);
  const [initial] = useState(() => {
    try {
      return {
        profile: loadProfile(),
        provider: createVoiceProvider(),
        error: "",
      };
    } catch (e) {
      return {
        profile: null,
        provider: null,
        error:
          e instanceof Error
            ? e.message
            : "Não foi possível carregar o perfil local.",
      };
    }
  });
  const { profile, provider } = initial;
  const [state, setState] = useState<VoiceState>(
    initial.error ? "error" : "idle",
  );
  const [text, setText] = useState("");
  const [heard, setHeard] = useState("");
  const [error, setError] = useState(initial.error);
  useEffect(() => {
    if (!profile && !initial.error) router.replace("/onboarding");
    if (!provider) return;
    const off = [
      provider.onStateChange(setState),
      provider.onTranscript((t) =>
        t.role === "assistant" ? setText(t.text) : setHeard(t.text),
      ),
      provider.onError((e) => setError(e.message)),
    ];
    const session = lifecycle.current;
    const stop = () => {
      session.generation++;
      provider.stopConversation();
    };
    const hide = () => {
      if (document.visibilityState === "hidden") stop();
    };
    window.addEventListener("pagehide", stop);
    document.addEventListener("visibilitychange", hide);
    return () => {
      session.generation++;
      window.removeEventListener("pagehide", stop);
      document.removeEventListener("visibilitychange", hide);
      off.forEach((fn) => fn());
      provider.disconnect();
    };
  }, [profile, provider, initial.error, router]);
  const active = !["idle", "error"].includes(state);
  async function toggle() {
    if (!provider || !profile || (!isMock && !consent)) return;
    if (active) {
      lifecycle.current.generation++;
      provider.stopConversation();
      return;
    }
    const current = ++lifecycle.current.generation;
    setText("");
    setHeard("");
    setError("");
    try {
      await provider.connect();
      if (current === lifecycle.current.generation)
        provider.startConversation(profile);
    } catch (e) {
      if (current === lifecycle.current.generation) {
        setState("error");
        setError(e instanceof Error ? e.message : "Tente novamente.");
      }
    }
  }
  return (
    <main className="conversation">
      <div className="badge">
        ✦ {isMock ? "Conversa simulada" : "Conversa por voz · teste com adulto"}
      </div>
      <h1>Oi{profile ? `, ${profile.name}` : ""}!</h1>
      <p className="intro">Vamos conversar?</p>
      <LumiScene provider={provider} state={state} mock={isMock} />
      <div className="reply" aria-live="polite">
        {text || "Uma nova descoberta está por aqui."}
      </div>
      <LumiState state={state} />
      {profile && provider && (
        <MicrophoneButton
          active={active}
          onClick={toggle}
          mock={isMock}
          disabled={!isMock && !consent}
        />
      )}
      <p className="fine">
        {active ? "Toque para parar" : "Toque para começar uma brincadeira"}
      </p>
      {error && (
        <p className="error-box" role="alert">
          {error}
        </p>
      )}
      {!isMock && !active && (
        <label className="voice-consent">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>
            Sou adulto e aceito enviar minha voz ao Google Gemini para testar
            esta conversa.
          </span>
        </label>
      )}
      {!isMock && heard && (
        <p className="fine" aria-live="polite">
          Você disse: {heard}
        </p>
      )}
      <p className="fine">
        {isMock
          ? "Nesta demonstração, o microfone não é acessado."
          : "Use sua própria voz, sem crianças nesta etapa. O perfil continua neste navegador."}
        <br />
        {isMock
          ? "As respostas aparecem em texto."
          : "O app não salva áudio ou transcrições. Cada sessão dura até 3 minutos; trocar de aba encerra a conversa."}
      </p>
      <Link className="text-link" href="/onboarding">
        Editar perfil
      </Link>
    </main>
  );
}
