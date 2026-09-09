export type AudioLevels = Readonly<{ input: number; output: number }>;
export const SILENT_LEVELS: AudioLevels = Object.freeze({
  input: 0,
  output: 0,
});

export function rms(samples: ArrayLike<number>): number {
  if (!samples.length) return 0;
  let energy = 0;
  for (let i = 0; i < samples.length; i++) energy += samples[i] * samples[i];
  return Math.sqrt(energy / samples.length);
}

/** A small noise floor and gain make conversational levels legible, not louder. */
export function meterLevel(value: number): number {
  return Number.isFinite(value)
    ? Math.max(0, Math.min(1, (value - 0.006) * 4))
    : 0;
}

/** Stable immutable snapshots for useSyncExternalStore; no samples are retained. */
export class AudioLevelStore {
  private value: AudioLevels = SILENT_LEVELS;
  private listeners = new Set<(levels: AudioLevels) => void>();
  getSnapshot() {
    return this.value;
  }
  update(next: Partial<AudioLevels>) {
    const clamp = (value: number) =>
      Number.isFinite(value)
        ? Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000
        : 0;
    const input = clamp(next.input ?? this.value.input);
    const output = clamp(next.output ?? this.value.output);
    if (input === this.value.input && output === this.value.output) return;
    this.value = Object.freeze({ input, output });
    this.listeners.forEach((fn) => fn(this.value));
  }
  reset() {
    this.update(SILENT_LEVELS);
  }
  subscribe(fn: (levels: AudioLevels) => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
}
