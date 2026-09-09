import { flagContent, SAFETY_LIMITS } from "./rules";

/** Holds a bounded turn until its output transcript has passed local checks. */
export class ReplyBuffer {
  private chunks: string[] = [];
  private text = "";
  private bytes = 0;
  appendText(text: string) {
    this.text += text;
    if (
      this.text.length > SAFETY_LIMITS.maxReplyChars ||
      flagContent(this.text)
    )
      throw new Error("unsafe-reply");
  }
  appendAudio(data: string) {
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(data) || data.length % 4)
      throw new Error("invalid-audio");
    const bytes =
      (data.length / 4) * 3 -
      (data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0);
    if (!bytes || bytes % 2) throw new Error("invalid-audio");
    this.bytes += bytes;
    if (this.bytes > SAFETY_LIMITS.maxReplyAudioBytes)
      throw new Error("long-reply");
    this.chunks.push(data);
  }
  approve() {
    const text = this.text.trim();
    if (!text || !this.chunks.length || flagContent(text))
      throw new Error("unverified-reply");
    const result = { text, chunks: this.chunks };
    this.reset();
    return result;
  }
  reset() {
    this.chunks = [];
    this.text = "";
    this.bytes = 0;
  }
}
