import type { VoiceProvider } from "./VoiceProvider";
import { MockVoiceProvider } from "./MockVoiceProvider";
import { GeminiLiveProvider } from "./GeminiLiveProvider";
export function createVoiceProvider(): VoiceProvider {
  const mode = process.env.NEXT_PUBLIC_VOICE_PROVIDER ?? "mock";
  if (mode === "gemini") return new GeminiLiveProvider();
  if (mode !== "mock")
    throw new Error(
      "Configure NEXT_PUBLIC_VOICE_PROVIDER como mock ou gemini.",
    );
  return new MockVoiceProvider();
}
