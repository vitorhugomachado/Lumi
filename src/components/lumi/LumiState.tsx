import type { VoiceState } from "@/lib/voice/VoiceProvider";
export const stateLabels: Record<VoiceState, string> = {
  idle: "Conversar",
  connecting: "Preparando...",
  listening: "Estou ouvindo...",
  thinking: "Hmm...",
  speaking: "Lumi está falando",
  error: "Vamos tentar de novo",
};
export function LumiState({ state }: { state: VoiceState }) {
  return (
    <p className="state-label" role="status" aria-live="polite">
      {stateLabels[state]}
    </p>
  );
}
