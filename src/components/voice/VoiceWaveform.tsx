import type { VoiceState } from "@/lib/voice/VoiceProvider";
const shape = [
  0.2, 0.32, 0.5, 0.37, 0.66, 0.85, 0.62, 1, 0.78, 0.9, 0.68, 0.42, 0.57, 0.3,
  0.2,
];
export function VoiceWaveform({
  state,
  level = 0,
  mock = false,
}: {
  state: VoiceState;
  level?: number;
  mock?: boolean;
}) {
  const active = state === "listening" || state === "speaking";
  const intensity =
    active && Number.isFinite(level) ? Math.max(0, Math.min(1, level)) : 0;
  return (
    <div className="waveform-area">
      <div
        aria-hidden="true"
        className={`waveform waveform-meter ${state}`}
        data-level={intensity.toFixed(3)}
      >
        {shape.map((weight, i) => (
          <i key={i} style={{ height: 4 + intensity * weight * 40 }} />
        ))}
      </div>
      <span className="waveform-caption">
        {state === "speaking"
          ? "A voz do Lumi"
          : state === "listening"
            ? "Sua vez de falar"
            : state === "thinking"
              ? "Uma ideia chegando..."
              : state === "connecting"
                ? "Quase prontos"
                : state === "error"
                  ? "Vamos recomeçar?"
                  : "Uma conversa de cada vez"}
        {mock && active ? " · simulação" : ""}
      </span>
    </div>
  );
}
