import type { ChildProfile } from "../child/profile";
export type VoiceState =
  "idle" | "connecting" | "listening" | "thinking" | "speaking" | "error";
export type Transcript = { role: "assistant" | "user"; text: string };
export type Unsubscribe = () => void;
export interface VoiceProvider {
  connect(): Promise<void>;
  disconnect(): void;
  startConversation(profile: ChildProfile): void;
  stopConversation(): void;
  onStateChange(listener: (state: VoiceState) => void): Unsubscribe;
  onTranscript(listener: (transcript: Transcript) => void): Unsubscribe;
  onError(listener: (error: Error) => void): Unsubscribe;
}
