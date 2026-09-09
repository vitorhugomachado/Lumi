import type { VoiceProvider } from "./VoiceProvider";
import { MockVoiceProvider } from "./MockVoiceProvider";
export function createVoiceProvider(): VoiceProvider {
  const mode = process.env.NEXT_PUBLIC_VOICE_PROVIDER ?? "mock";
  if (mode !== "mock")
    throw new Error(
      "Esta V0 oferece apenas o modo mock. Configure NEXT_PUBLIC_VOICE_PROVIDER=mock.",
    );
  return new MockVoiceProvider();
}
