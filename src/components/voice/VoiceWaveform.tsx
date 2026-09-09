import type { VoiceState } from "@/lib/voice/VoiceProvider";
export function VoiceWaveform({ state }: { state: VoiceState }) {
  return (
    <div aria-hidden="true" className={`waveform ${state}`}>
      {[12, 20, 30, 18, 40, 26, 44, 26, 40, 18, 30, 20, 12].map((h, i) => (
        <i key={i} style={{ height: h, animationDelay: `${i * 70}ms` }} />
      ))}
    </div>
  );
}
