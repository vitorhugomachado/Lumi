/** Raw little-endian signed PCM16, as required by Gemini Live. */
export function encodePcm(samples: Float32Array): string {
  const bytes = new Uint8Array(samples.length * 2);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < samples.length; i++) {
    const value = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(
      i * 2,
      Math.round(value < 0 ? value * 32768 : value * 32767),
      true,
    );
  }
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function decodePcm(data: string): Float32Array<ArrayBuffer> {
  if (data.length > 2_000_000) throw new Error("Bloco de áudio muito grande.");
  const binary = atob(data);
  if (!binary.length || binary.length % 2)
    throw new Error("Áudio PCM inválido.");
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const view = new DataView(bytes.buffer);
  const samples = new Float32Array(bytes.length / 2);
  for (let i = 0; i < samples.length; i++)
    samples[i] = view.getInt16(i * 2, true) / 32768;
  return samples;
}
