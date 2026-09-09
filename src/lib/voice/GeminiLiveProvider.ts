import { ReplyBuffer } from "../safety/ReplyBuffer";
import {
  flagContent,
  SAFETY_LIMITS,
  SessionLimiter,
  SESSION_END_MESSAGES,
  type SessionEndReason,
} from "../safety/rules";
import {
  GoogleGenAI,
  type LiveServerMessage,
  type Session,
} from "@google/genai";
import { isChildProfile, type ChildProfile } from "../child/profile";
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
  profile?: ChildProfile | null;
};
type Callbacks = {
  onmessage: (message: LiveServerMessage) => void;
  onerror: () => void;
  onclose: () => void;
};
export type GeminiDependencies = {
  audio: () => AudioIO;
  token: (signal: AbortSignal, profile?: ChildProfile | null) => Promise<Token>;
  session: (token: Token, callbacks: Callbacks) => Promise<LiveSession>;
};
const defaults: GeminiDependencies = {
  audio: () => new BrowserAudio(),
  async token(signal, profile) {
    const response = await fetch("/api/gemini-token/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile: profile ?? null }),
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
      data.sessionSeconds !== SESSION_SECONDS ||
      (data.profile != null && !isChildProfile(data.profile))
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
      config: liveConfig(token.profile ?? null),
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
  private reply = new ReplyBuffer();
  private reviewTimeout?: ReturnType<typeof setTimeout>;
  private limiter = new SessionLimiter((reason) => this.endSession(reason));
  private endSession(reason: SessionEndReason) {
    this.fail(new Error(SESSION_END_MESSAGES[reason]));
  }
  private awaitReply() {
    clearTimeout(this.reviewTimeout);
    this.reviewTimeout = setTimeout(
      () => this.endSession("unverified-response"),
      SAFETY_LIMITS.replyWaitMs,
    );
  }
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

  async connect(profile: ChildProfile | null = null) {
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
        if (valid() && this.active && this.turnComplete) {
          this.finishPlayback();
        }
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
            }, 550);
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
      const token = await this.deps.token(controller.signal, profile);
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
              "A sessão de três minutos terminou. Toque em Conversar para iniciar outra.",
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
    // Profile was attached to the constrained session during connect().
    void _profile;
    if (!this.session || !this.audio) return;
    this.active = true;
    this.limiter.start();
    this.awaitReply();
    this.turnComplete = false;
    this.newTurn = true;
    this.emit("thinking");
    try {
      this.session.sendRealtimeInput({
        text: "Cumprimente com um oi acolhedor e um comentário brincalhão bem curto, usando naturalmente o perfil se ele estiver disponível. Sem pergunta de abertura. Depois acompanhe o que eu disser numa conversa natural.",
      });
    } catch {
      this.fail(
        new Error("Não foi possível iniciar a conversa. Tente novamente."),
      );
    }
  }

  private finishPlayback() {
    if (!this.turnComplete) return;
    this.turnComplete = false;
    this.limiter.replyFinished();
    if (this.active) this.emit("listening");
  }

  private interruptPlayback() {
    this.audio?.interrupt();
    this.reply.reset();
    clearTimeout(this.reviewTimeout);
    this.reviewTimeout = undefined;
    clearTimeout(this.silence);
    this.speechSeen = false;
    this.turnComplete = false;
    this.newTurn = true;
    this.limiter.activity();
    this.emit("listening");
  }

  private handleMessage(message: LiveServerMessage) {
    if (!this.active) return;
    // Generation can finish before the speakers drain. Server interruption alone
    // cannot cancel that tail, so confirmed new speech also stops queued audio.
    if (
      message.voiceActivity?.voiceActivityType === "ACTIVITY_START" &&
      this.turnComplete &&
      this.audio?.playing
    )
      this.interruptPlayback();
    const content = message.serverContent;
    if (!content) return;
    try {
      if (content.interrupted) this.interruptPlayback();
      if (content.inputTranscription?.text) {
        if (this.turnComplete && this.audio?.playing) this.interruptPlayback();
        this.inputText += content.inputTranscription.text;
        if (this.inputText.length > 2000 || flagContent(this.inputText)) {
          this.endSession("safety");
          return;
        }
        this.limiter.activity();
        this.transcripts.forEach((fn) =>
          fn({ role: "user", text: this.inputText }),
        );
        this.awaitReply();
      }
      // Still process input in combined interruption events, but discard old output.
      if (content.interrupted) return;
      if (
        content.modelTurn?.parts?.length ||
        content.outputTranscription?.text
      ) {
        if (this.newTurn) {
          this.reply.reset();
          this.inputText = "";
          this.newTurn = false;
        }
        this.turnComplete = false;
        clearTimeout(this.silence);
        this.awaitReply();
      }
      // Check all available text before playing any audio from the same event.
      // Transcription can arrive after audio: this is live monitoring, not pre-approval.
      if (content.outputTranscription?.text) {
        this.reply.appendText(content.outputTranscription.text);
        this.transcripts.forEach((fn) =>
          fn({ role: "assistant", text: this.reply.transcript }),
        );
      }
      for (const part of content.modelTurn?.parts ?? []) {
        if (
          part.inlineData?.data &&
          part.inlineData.mimeType?.startsWith("audio/pcm")
        )
          this.reply.appendAudio(part.inlineData.data);
      }
      // Validate final metadata before playback if it accompanies the last chunk.
      if (content.turnComplete && !this.newTurn) {
        const finished = this.reply.approve();
        for (const chunk of finished.chunks) this.audio?.play(chunk);
        clearTimeout(this.reviewTimeout);
        this.reviewTimeout = undefined;
        this.turnComplete = true;
        this.newTurn = true;
        if (this.audio?.playing) this.emit("speaking");
        else this.finishPlayback();
      } else {
        const chunks = this.reply.drainAudio();
        for (const chunk of chunks) this.audio?.play(chunk);
        if (chunks.length) this.emit("speaking");
      }
    } catch (error) {
      this.endSession(
        error instanceof Error && error.message === "unsafe-reply"
          ? "safety"
          : "unverified-response",
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
    this.reply.reset();
    this.limiter.stop();
    clearTimeout(this.reviewTimeout);
    this.reviewTimeout = undefined;
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
