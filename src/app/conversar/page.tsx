"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { loadProfile } from "@/lib/child/storage";
import type { VoiceState } from "@/lib/voice/VoiceProvider";
import { createVoiceProvider } from "@/lib/voice/createVoiceProvider";
import { LumiCharacter } from "@/components/lumi/LumiCharacter";
import { LumiState } from "@/components/lumi/LumiState";
import { VoiceWaveform } from "@/components/voice/VoiceWaveform";
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
  const generation = useRef(0);
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
  const [error, setError] = useState(initial.error);
  useEffect(() => {
    if (!profile && !initial.error) router.replace("/onboarding");
    if (!provider) return;
    const off = [
      provider.onStateChange(setState),
      provider.onTranscript((t) => setText(t.text)),
      provider.onError((e) => setError(e.message)),
    ];
    return () => {
      // This counter deliberately invalidates pending connection promises on cleanup.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generation.current++;
      off.forEach((fn) => fn());
      provider.disconnect();
    };
  }, [profile, provider, initial.error, router]);
  const active = !["idle", "error"].includes(state);
  async function toggle() {
    if (!provider || !profile) return;
    if (active) {
      generation.current++;
      provider.stopConversation();
      return;
    }
    const current = ++generation.current;
    setText("");
    setError("");
    try {
      await provider.connect();
      if (current === generation.current) provider.startConversation(profile);
    } catch (e) {
      if (current === generation.current) {
        setState("error");
        setError(e instanceof Error ? e.message : "Tente novamente.");
      }
    }
  }
  return (
    <main className="conversation">
      <div className="badge">✦ Conversa simulada</div>
      <h1>Oi{profile ? `, ${profile.name}` : ""}!</h1>
      <p className="intro">Vamos conversar?</p>
      <LumiCharacter state={state} />
      <VoiceWaveform state={state} />
      <div className="reply" aria-live="polite">
        {text || "Uma nova descoberta está por aqui."}
      </div>
      <LumiState state={state} />
      {profile && provider && (
        <MicrophoneButton active={active} onClick={toggle} />
      )}
      <p className="fine">
        {active ? "Toque para parar" : "Toque para começar uma brincadeira"}
      </p>
      {error && (
        <p className="error-box" role="alert">
          {error}
        </p>
      )}
      <p className="fine">
        Nesta demonstração, o microfone não é acessado.
        <br />
        As respostas aparecem em texto.
      </p>
      <Link className="text-link" href="/onboarding">
        Editar perfil
      </Link>
    </main>
  );
}
