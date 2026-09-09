import { LUMI_SYSTEM_PROMPT } from "../../prompts/lumiSystemPrompt";
import { Modality, type LiveConnectConfig } from "@google/genai";

export const GEMINI_MODEL = "gemini-3.1-flash-live-preview";
export const GEMINI_API_VERSION = "v1beta";
export const SESSION_SECONDS = 180;

/** Fixed adult-test instructions. No child profile or free-form prompt is sent. */
export function liveConfig(): LiveConnectConfig {
  return {
    responseModalities: [Modality.AUDIO],
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    realtimeInputConfig: {
      automaticActivityDetection: { silenceDurationMs: 800 },
    },
    systemInstruction: LUMI_SYSTEM_PROMPT,
  };
}
