import { decodePcm, encodePcm } from "./pcm";
import { rms } from "./levels";

export interface AudioIO {
  open(signal: AbortSignal): Promise<void>;
  onChunk: (data: string, sampleRate: number, level: number) => void;
  onDrain: () => void;
  onFailure: (error: Error) => void;
  onOutputLevel: (level: number) => void;
  readonly playing: boolean;
  play(data: string): void;
  interrupt(): void;
  close(): void;
}

/** Owns microphone tracks, the worklet and every queued playback source. */
export class BrowserAudio implements AudioIO {
  onChunk: AudioIO["onChunk"] = () => {};
  onDrain = () => {};
  onFailure: AudioIO["onFailure"] = () => {};
  onOutputLevel: AudioIO["onOutputLevel"] = () => {};
  private analyser?: AnalyserNode;
  private meterSamples = new Float32Array(512);
  private meterFrame?: number;
  private lastMeterTime = -Infinity;
  private context?: AudioContext;
  private stream?: MediaStream;
  private input?: MediaStreamAudioSourceNode;
  private worklet?: AudioWorkletNode;
  private sources = new Set<AudioBufferSourceNode>();
  private nextStart = 0;
  private detachAbort?: () => void;
  get playing() {
    return this.sources.size > 0;
  }

  async open(signal: AbortSignal) {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      throw new Error(
        "O microfone precisa de HTTPS ou localhost e de um navegador compatível.",
      );
    }
    signal.throwIfAborted();
    // Created/resumed synchronously from the user's click for browser autoplay policies.
    this.context = new AudioContext({ sampleRate: 24000 });
    const context = this.context;
    const close = () => this.close();
    signal.addEventListener("abort", close, { once: true });
    this.detachAbort = () => signal.removeEventListener("abort", close);
    const resumed = context.resume();
    // Attach a rejection handler immediately while the permission dialog is open.
    void resumed.catch(() => {});
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      if (signal.aborted) {
        stream.getTracks().forEach((track) => track.stop());
        signal.throwIfAborted();
      }
      this.stream = stream;
      for (const track of stream.getAudioTracks())
        track.onended = () =>
          this.onFailure(
            new Error(
              "O microfone foi desconectado. Conecte-o e tente novamente.",
            ),
          );
      await resumed;
      signal.throwIfAborted();
      await context.audioWorklet.addModule("/audio/pcm-capture.js");
      signal.throwIfAborted();
      this.worklet = new AudioWorkletNode(context, "lumi-pcm-capture");
      // Only model playback enters this analyser, never the microphone.
      this.analyser = context.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.connect(context.destination);
      this.worklet.onprocessorerror = () =>
        this.onFailure(new Error("Não foi possível processar o microfone."));
      this.worklet.port.onmessage = ({ data }: MessageEvent<Float32Array>) => {
        if (signal.aborted) return;
        let energy = 0;
        for (const sample of data) energy += sample * sample;
        this.onChunk(
          encodePcm(data),
          context.sampleRate,
          Math.sqrt(energy / data.length),
        );
      };
      this.input = context.createMediaStreamSource(stream);
      this.input.connect(this.worklet);
      this.worklet.connect(context.destination);
      context.onstatechange = () => {
        if (!signal.aborted && context.state === "suspended")
          this.onFailure(
            new Error(
              "O navegador pausou o áudio. Toque em Conversar para retomar.",
            ),
          );
      };
    } catch (error) {
      this.close();
      if (error instanceof DOMException && error.name === "NotAllowedError")
        throw new Error(
          "Permita o microfone nas configurações do navegador e tente novamente.",
        );
      if (error instanceof DOMException && error.name === "NotFoundError")
        throw new Error("Nenhum microfone foi encontrado neste dispositivo.");
      throw error;
    }
  }

  play(data: string) {
    const context = this.context;
    if (!context || context.state === "closed") return;
    const samples = decodePcm(data);
    const start = Math.max(context.currentTime + 0.015, this.nextStart);
    if (start - context.currentTime + samples.length / 24000 > 30)
      throw new Error("A resposta de áudio excedeu o limite de reprodução.");
    const buffer = context.createBuffer(1, samples.length, 24000);
    buffer.copyToChannel(samples, 0);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.analyser ?? context.destination);
    this.sources.add(source);
    source.onended = () => {
      source.disconnect();
      this.sources.delete(source);
      if (!this.sources.size) {
        this.stopMeter();
        this.onDrain();
      }
    };
    source.start(start);
    this.nextStart = start + buffer.duration;
    this.startMeter();
  }

  private startMeter() {
    if (this.meterFrame !== undefined || !this.analyser) return;
    const measure = (time: number) => {
      if (!this.analyser || !this.sources.size) {
        this.meterFrame = undefined;
        return;
      }
      if (time - this.lastMeterTime >= 50) {
        this.analyser.getFloatTimeDomainData(this.meterSamples);
        this.onOutputLevel(rms(this.meterSamples));
        this.lastMeterTime = time;
      }
      this.meterFrame = requestAnimationFrame(measure);
    };
    this.meterFrame = requestAnimationFrame(measure);
  }

  private stopMeter() {
    if (this.meterFrame !== undefined) cancelAnimationFrame(this.meterFrame);
    this.meterFrame = undefined;
    this.lastMeterTime = -Infinity;
    this.onOutputLevel(0);
  }

  interrupt() {
    this.stopMeter();
    for (const source of this.sources) {
      source.onended = null;
      source.stop();
      source.disconnect();
    }
    this.sources.clear();
    this.nextStart = 0;
  }

  close() {
    this.detachAbort?.();
    this.detachAbort = undefined;
    this.interrupt();
    if (this.worklet) {
      this.worklet.port.onmessage = null;
      this.worklet.onprocessorerror = null;
      this.worklet.port.close();
      this.worklet.disconnect();
    }
    this.input?.disconnect();
    this.analyser?.disconnect();
    this.analyser = undefined;
    this.stream?.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });
    if (this.context) {
      this.context.onstatechange = null;
      if (this.context.state !== "closed")
        void this.context.close().catch(() => {});
    }
    this.context = undefined;
    this.stream = undefined;
    this.input = undefined;
    this.worklet = undefined;
  }
}
