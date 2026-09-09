import type { ChildProfile } from "../child/profile";
import type { VoiceProvider, VoiceState, Transcript } from "./VoiceProvider";
export class MockVoiceProvider implements VoiceProvider {
  private connected = false;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private states = new Set<(state: VoiceState) => void>();
  private transcripts = new Set<(transcript: Transcript) => void>();
  private errors = new Set<(error: Error) => void>();
  private emit(state: VoiceState) {
    this.states.forEach((fn) => fn(state));
  }
  async connect() {
    this.emit("connecting");
    this.connected = true;
  }
  disconnect() {
    this.stopConversation();
    this.connected = false;
  }
  startConversation(profile: ChildProfile) {
    if (!this.connected) {
      this.emit("error");
      this.errors.forEach((fn) =>
        fn(new Error("A conversa não está conectada.")),
      );
      return;
    }
    this.stopConversation();
    this.emit("listening");
    this.timers.push(setTimeout(() => this.emit("thinking"), 2000));
    this.timers.push(
      setTimeout(() => {
        this.emit("speaking");
        const phrases: Record<string, string> = {
          Animais: "O cachorro faz au au! Vamos fazer au au?",
          Música: "Lá, lá, lá! Vamos cantar?",
          Bola: "Uma bola grande! Vamos rolar a bola?",
          Carros: "O carro faz vrum! Vamos fazer vrum?",
          Dinossauros: "Um dinossauro grande! Como ele faz?",
          Comida: "Uma banana amarelinha! Você gosta de banana?",
          Natureza: "Olha a flor! Que cor ela tem?",
          Histórias: "Era uma vez um gatinho. Como o gatinho faz?",
        };
        this.transcripts.forEach((fn) =>
          fn({
            role: "assistant",
            text: `Oi, ${profile.name}! ${phrases[profile.interests[0]] ?? "Eu sou o Lumi! Vamos brincar?"}`,
          }),
        );
      }, 3200),
    );
    this.timers.push(
      setTimeout(() => {
        this.timers = [];
        this.emit("idle");
      }, 7000),
    );
  }
  stopConversation() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.emit("idle");
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
}
