export const SAFETY_LIMITS = Object.freeze({
  sessionMs: 180_000,
  silenceMs: 60_000,
  maxTurns: 10,
  maxReplyChars: 500,
  maxReplyAudioBytes: 720_000,
  replyWaitMs: 20_000,
  parentAccessMs: 300_000,
  gateCooldownMs: 30_000,
});
export type SessionEndReason =
  "time-limit" | "inactivity" | "turn-limit" | "safety" | "unverified-response";
export const SESSION_END_MESSAGES: Record<SessionEndReason, string> = {
  "time-limit":
    "Nossa conversa terminou por hoje. Vamos fazer uma pausa juntos?",
  inactivity:
    "Vamos fazer uma pausa. Chame um responsável quando quiser voltar.",
  "turn-limit":
    "Já brincamos bastante! Agora é hora de uma pausa com um responsável.",
  safety: "Vamos pausar a conversa e chamar um responsável.",
  "unverified-response":
    "Não conseguimos verificar a resposta. Vamos chamar um responsável antes de continuar.",
};

export const normalizeSafetyText = (text: string) =>
  text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u200b-\u200f\ufeff]/g, "")
    .toLowerCase();

/** Conservative lexical tripwires, NOT semantic moderation or a child-safety guarantee. */
export function flagContent(
  text: string,
): "privacy" | "secrecy" | "danger" | "clinical" | null {
  const value = normalizeSafetyText(text);
  if (
    /\b(sobrenome|endereco|telefone|celular|cpf|documento|localizacao|nome completo|senha|escola onde|onde (voce )?mora)\b/.test(
      value,
    ) ||
    /\bmande (uma )?foto\b/.test(value) ||
    /https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[a-z]{2,}/.test(value) ||
    /(?:\d[\s().-]*){7,}/.test(value)
  )
    return "privacy";
  if (
    /\b(segredo|segredinho|nao conte|nao diga (para|pra)|so entre nos|esconda (da|do))\b/.test(
      value,
    )
  )
    return "secrecy";
  if (
    /\b(sexo|sexual|pornografia|nudez|pelad[oa]|matar|suicidio|me machucar|me machuquei|arma|uma faca|veneno|sangue|abuso|bater em|machucar (alguem|voce))\b/.test(
      value,
    )
  )
    return "danger";
  if (
    /\b(diagnostico|diagnosticar|terapia|tratamento|remedio|medicamento|autismo|atraso de fala|cura|voce errou|falou errado)\b/.test(
      value,
    )
  )
    return "clinical";
  return null;
}

export class SessionLimiter {
  private total?: ReturnType<typeof setTimeout>;
  private silence?: ReturnType<typeof setTimeout>;
  private active = false;
  private turns = 0;
  constructor(private onEnd: (reason: SessionEndReason) => void) {}
  start() {
    this.stop();
    this.active = true;
    this.turns = 0;
    this.total = setTimeout(
      () => this.end("time-limit"),
      SAFETY_LIMITS.sessionMs,
    );
    this.activity();
  }
  activity() {
    if (!this.active) return;
    clearTimeout(this.silence);
    this.silence = setTimeout(
      () => this.end("inactivity"),
      SAFETY_LIMITS.silenceMs,
    );
  }
  replyFinished() {
    if (!this.active) return;
    if (++this.turns >= SAFETY_LIMITS.maxTurns) this.end("turn-limit");
    else this.activity();
  }
  private end(reason: SessionEndReason) {
    if (!this.active) return;
    this.stop();
    this.onEnd(reason);
  }
  stop() {
    this.active = false;
    clearTimeout(this.total);
    clearTimeout(this.silence);
  }
}
