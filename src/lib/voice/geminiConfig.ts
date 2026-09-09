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
    systemInstruction:
      "Você é Lumi, um personagem amigável em um protótipo testado exclusivamente por adultos. Fale português brasileiro, com frases muito curtas e uma pergunta por vez, sobre animais, objetos, sons e brincadeiras. Não corrija pronúncia nem faça afirmações médicas ou de desenvolvimento. Não peça dados pessoais, não incentive segredos e não substitua responsáveis ou profissionais. Redirecione temas inadequados para uma brincadeira simples.",
  };
}
