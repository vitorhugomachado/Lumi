"use client";
import { useCallback, useSyncExternalStore } from "react";
import type { VoiceProvider, VoiceState } from "@/lib/voice/VoiceProvider";
import { SILENT_LEVELS } from "@/lib/voice/audio/levels";
import { LumiCharacter } from "./LumiCharacter";
import { VoiceWaveform } from "../voice/VoiceWaveform";

export function LumiScene({
  provider,
  state,
  mock,
}: {
  provider: VoiceProvider | null;
  state: VoiceState;
  mock: boolean;
}) {
  const subscribe = useCallback(
    (notify: () => void) => provider?.onAudioLevels(notify) ?? (() => {}),
    [provider],
  );
  const getSnapshot = useCallback(
    () => provider?.getAudioLevels() ?? SILENT_LEVELS,
    [provider],
  );
  const levels = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => SILENT_LEVELS,
  );
  const level =
    state === "speaking"
      ? levels.output
      : state === "listening"
        ? levels.input
        : 0;
  return (
    <>
      <LumiCharacter state={state} level={level} />
      <VoiceWaveform state={state} level={level} mock={mock} />
    </>
  );
}
