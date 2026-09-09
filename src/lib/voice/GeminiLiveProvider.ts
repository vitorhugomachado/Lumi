import {
  GoogleGenAI,
  type LiveServerMessage,
  type Session,
} from "@google/genai";
import type { ChildProfile } from "../child/profile";
import type { Transcript, VoiceProvider, VoiceState } from "./VoiceProvider";
import { BrowserAudio, type AudioIO } from "./audio/BrowserAudio";
import { AudioLevelStore, meterLevel, type AudioLevels } from "./audio/levels";
import {
  GEMINI_API_VERSION,
  GEMINI_MODEL,
  SESSION_SECONDS,
  liveConfig,
} from "./geminiConfig";

type LiveSession = Pick<Session, "close" | "sendRealtimeInput">;
type Token = {
  token: string;
  model: string;
  expiresAt: string;
  sessionSeconds: number;
};
type Callbacks = {
  onmessage: (message: LiveServerMessage) => void;
  onerror: () => void;
  onclose: () => void;
};
export type GeminiDependencies = {
  audio: () => AudioIO;
  token: (signal: AbortSignal) => Promise<Token>;
  session: (token: Token, callbacks: Callbacks) => Promise<LiveSession>;
};
const defaults: GeminiDependencies = {
  audio: () => new BrowserAudio(),
  async token(signal) {
    const response = await fetch("/api/gemini-token/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      cache: "no-store",
      signal,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok)
      throw new Error(
        data?.error || "Não foi possível obter a credencial de voz.",
      );
    if (
      !data ||
      typeof data.token !== "string" ||
      !data.token ||
      data.model !== GEMINI_MODEL ||
      !Number.isFinite(Date.parse(data.expiresAt)) ||
      data.sessionSeconds !== SESSION_SECONDS
    )
      throw new Error("Credencial de voz inválida.");
    return data as Token;
  },
  async session(token, callbacks) {
    const ai = new GoogleGenAI({
      apiKey: token.token,
      httpOptions: { apiVersion: GEMINI_API_VERSION },
    });
    return ai.live.connect({
      model: token.model,
      config: liveConfig(),
      callbacks,
    });
  },
};

/** Audio and credentials exist in memory only, and are released on every exit. */
export class GeminiLiveProvider implements VoiceProvider {
  private levels = new AudioLevelStore();
  private states = new Set<(state: VoiceState) => void>();
  private transcripts = new Set<(transcript: Transcript) => void>();
  private errors = new Set<(error: Error) => void>();
  private controller?: AbortController;
  private audio?: AudioIO;
  private session?: LiveSession;
  private active = false;
  private turnComplete = false;
  private newTurn = true;
  private outputText = "";
  private inputText = "";
  private speechSeen = false;
  private silence?: ReturnType<typeof setTimeout>;
  private expiry?: ReturnType<typeof setTimeout>;
  private connectTimeout?: ReturnType<typeof setTimeout>;
  constructor(private deps: GeminiDependencies = defaults) {}
  private emit(state: VoiceState) {
    this.states.forEach((fn) => fn(state));
  }
  private fail(error: Error) {
    this.release();
    this.emit("error");
    this.errors.forEach((fn) => fn(error));
  }

  async connect() {
    this.release();
    const controller = new AbortController();
    this.controller = controller;
    const valid = () =>
      this.controller === controller && !controller.signal.aborted;
    this.emit("connecting");
    let phase: "audio" | "token" | "session" = "audio";
    try {
      const audio = this.deps.audio();
      this.audio = audio;
      audio.onOutputLevel = (level) => {
        if (valid()) this.levels.update({ output: meterLevel(level) });
      };
      audio.onFailure = (error) => {
        if (valid()) this.fail(error);
      };
      audio.onDrain = () => {
        if (valid() && this.active && this.turnComplete) this.emit("listening");
      };
      audio.onChunk = (data, rate, level) => {
        if (!valid() || !this.active || !this.session) return;
        this.levels.update({ input: meterLevel(level) });
        try {
          this.session.sendRealtimeInput({
            audio: { data, mimeType: `audio/pcm;rate=${rate}` },
          });
          // Cosmetic end-of-speech estimate only. Gemini's automatic VAD owns turns.
          if (level > 0.025) {
            this.speechSeen = true;
            clearTimeout(this.silence);
            this.silence = setTimeout(() => {
              if (valid() && this.active && !audio.playing && this.speechSeen)
                this.emit("thinking");
              this.speechSeen = false;
            }, 850);
          }
        } catch {
          this.fail(
            new Error("A conexão de áudio foi interrompida. Tente novamente."),
          );
        }
      };
      // Permission is requested before obtaining a paid session token.
      await audio.open(controller.signal);
      if (!valid()) return;
      this.connectTimeout = setTimeout(() => {
        if (valid())
          this.fail(
            new Error(
              "A conexão demorou demais. Verifique a rede e tente novamente.",
            ),
          );
      }, 20_000);
      phase = "token";
      const token = await this.deps.token(controller.signal);
      if (!valid()) return;
      phase = "session";
      const session = await this.deps.session(token, {
        onmessage: (message) => {
          if (valid()) this.handleMessage(message);
        },
        onerror: () => {
          if (valid())
            this.fail(
              new Error(
                "Falha na conexão Gemini. Verifique a rede e a disponibilidade do serviço.",
              ),
            );
        },
        onclose: () => {
          if (valid())
            this.fail(
              new Error(
                "A sessão de voz foi encerrada. Toque em Conversar para reconectar.",
              ),
            );
        },
      });
      if (!valid()) {
        session.close();
        return;
      }
      clearTimeout(this.connectTimeout);
      this.session = session;
      const remaining = Math.min(
        SESSION_SECONDS * 1000,
        Date.parse(token.expiresAt) - Date.now(),
      );
      if (remaining <= 0)
        throw new Error("A credencial expirou. Tente novamente.");
      this.expiry = setTimeout(() => {
        if (valid())
          this.fail(
            new Error(
              "A sessão de teste de três minutos terminou. Toque em Conversar para iniciar outra.",
            ),
          );
      }, remaining);
    } catch (error) {
      if (valid()) {
        const friendly =
          phase === "session"
            ? new Error(
                "Não foi possível conectar ao Gemini. Verifique a rede, a chave e o acesso ao modelo.",
              )
            : error instanceof Error
              ? error
              : new Error("Não foi possível iniciar o áudio.");
        this.fail(friendly);
        throw friendly;
      }
    }
  }

  startConversation(_profile: ChildProfile) {
    // Intentionally keeps the stored child profile off the network in this stage.
    void _profile;
    if (!this.session || !this.audio) return;
    this.active = true;
    this.turnComplete = false;
    this.newTurn = true;
    this.emit("thinking");
    try {
      this.session.sendRealtimeInput({
        text: "Comece a brincadeira: diga um oi bem curto e faça uma pergunta simples sobre um animal.",
      });
    } catch {
      this.fail(
        new Error("Não foi possível iniciar a conversa. Tente novamente."),
      );
    }
  }

  private handleMessage(message: LiveServerMessage) {
    if (!this.active) return;
    const content = message.serverContent;
    if (!content) return;
    try {
      if (content.interrupted) {
        this.audio?.interrupt();
        this.turnComplete = true;
        this.newTurn = true;
        this.outputText = "";
        this.emit("listening");
      }
      if (content.inputTranscription?.text) {
        this.inputText = (
          this.inputText + content.inputTranscription.text
        ).slice(-2000);
        this.transcripts.forEach((fn) =>
          fn({ role: "user", text: this.inputText }),
        );
      }
      if (
        content.modelTurn?.parts?.length ||
        content.outputTranscription?.text
      ) {
        if (this.newTurn) {
          this.outputText = "";
          this.inputText = "";
          this.newTurn = false;
        }
        this.turnComplete = false;
        clearTimeout(this.silence);
      }
      if (content.outputTranscription?.text) {
        this.outputText = (
          this.outputText + content.outputTranscription.text
        ).slice(-2000);
        this.transcripts.forEach((fn) =>
          fn({ role: "assistant", text: this.outputText }),
        );
      }
      for (const part of content.modelTurn?.parts ?? []) {
        if (
          part.inlineData?.data &&
          part.inlineData.mimeType?.startsWith("audio/pcm")
        ) {
          this.audio?.play(part.inlineData.data);
          this.emit("speaking");
        }
      }
      if (content.turnComplete) {
        this.turnComplete = true;
        this.newTurn = true;
        if (!this.audio?.playing) this.emit("listening");
      }
    } catch {
      this.fail(
        new Error(
          "Não foi possível reproduzir a resposta. Tente iniciar outra conversa.",
        ),
      );
    }
  }

  private release() {
    this.active = false;
    this.controller?.abort();
    this.controller = undefined;
    clearTimeout(this.silence);
    clearTimeout(this.expiry);
    clearTimeout(this.connectTimeout);
    this.audio?.close();
    this.audio = undefined;
    const session = this.session;
    this.session = undefined;
    try {
      session?.close();
    } catch {
      /* Resource already closed remotely. */
    }
    this.outputText = "";
    this.inputText = "";
    this.speechSeen = false;
    this.levels.reset();
  }
  stopConversation() {
    this.release();
    this.emit("idle");
  }
  disconnect() {
    this.stopConversation();
  }
  onStateChange(fn: (state: VoiceState) => void) {
    this.states.add(fn);
    return () => {
      this.states.delete(fn);
    };
  }
  onTranscript(fn: (transcript: Transcript) => void) {
    this.transcripts.add(fn);
    return () => {
      this.transcripts.delete(fn);
    };
  }
  onError(fn: (error: Error) => void) {
    this.errors.add(fn);
    return () => {
      this.errors.delete(fn);
    };
  }
  getAudioLevels() {
    return this.levels.getSnapshot();
  }
  onAudioLevels(fn: (levels: AudioLevels) => void) {
    return this.levels.subscribe(fn);
  }
}
