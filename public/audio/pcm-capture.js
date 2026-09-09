/* AudioWorklet: mono capture in bounded ~43 ms chunks at 24 kHz.
   The output remains silent: microphone audio is never monitored locally. */
class PcmCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.chunk = new Float32Array(1024);
    this.offset = 0;
  }
  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel) return true;
    for (let i = 0; i < channel.length; i++) {
      this.chunk[this.offset++] = channel[i];
      if (this.offset === this.chunk.length) {
        this.port.postMessage(this.chunk, [this.chunk.buffer]);
        this.chunk = new Float32Array(1024);
        this.offset = 0;
      }
    }
    return true;
  }
}
registerProcessor("lumi-pcm-capture", PcmCapture);
