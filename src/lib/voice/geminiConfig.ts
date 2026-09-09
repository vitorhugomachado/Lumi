import type { ChildProfile } from "../child/profile";
import { profileInstruction } from "./profileContext";
import { LUMI_SYSTEM_PROMPT } from "../../prompts/lumiSystemPrompt";
import {
  ActivityHandling,
  Modality,
  ThinkingLevel,
  type LiveConnectConfig,
} from "@google/genai";

export const GEMINI_MODEL = "gemini-3.1-flash-live-preview";
export const GEMINI_API_VERSION = "v1beta";
export const SESSION_SECONDS = 180;

/** Fresh session context, constrained in the server-issued ephemeral token. */
export function liveConfig(
  profile: ChildProfile | null = null,
): LiveConnectConfig {
  return {
    responseModalities: [Modality.AUDIO],
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
    realtimeInputConfig: {
      activityHandling: ActivityHandling.START_OF_ACTIVITY_INTERRUPTS,
      automaticActivityDetection: {
        disabled: false,
        prefixPaddingMs: 100,
        silenceDurationMs: 500,
      },
    },
    systemInstruction: `${LUMI_SYSTEM_PROMPT}\n\n${profileInstruction(profile)}`,
  };
}
