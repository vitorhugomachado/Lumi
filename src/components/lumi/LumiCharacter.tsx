"use client";
import Image from "next/image";
import { useState, type CSSProperties } from "react";
import type { VoiceState } from "@/lib/voice/VoiceProvider";
import { useLumiArtwork } from "./LumiArtworkProvider";

function Artwork({ src }: { src: string | null }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <>
      <div
        className="placeholder"
        style={{ visibility: loaded && !failed ? "hidden" : "visible" }}
        aria-hidden="true"
      >
        <span className="eyes">• •</span>
        <span className="smile">⌣</span>
        <span className="chest-star">★</span>
      </div>
      {src && !failed && (
        <Image
          className="character-artwork"
          style={{ opacity: loaded ? 1 : 0 }}
          src={src}
          alt=""
          width={220}
          height={240}
          unoptimized
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
      <span className="chest-glow" aria-hidden="true" />
    </>
  );
}

export function LumiCharacter({
  state,
  level = 0,
}: {
  state: VoiceState;
  level?: number;
}) {
  const src = useLumiArtwork();
  const intensity = Number.isFinite(level)
    ? Math.max(0, Math.min(1, level))
    : 0;
  return (
    <div
      className={`character-stage ${state}`}
      data-voice-state={state}
      style={{ "--voice-level": intensity } as CSSProperties}
    >
      <span className="spark spark-one" aria-hidden="true">
        ✦
      </span>
      <span className="spark spark-two" aria-hidden="true">
        ✧
      </span>
      <span className="orbit" aria-hidden="true" />
      <span className="listening-ring" aria-hidden="true" />
      <div
        className="character"
        role="img"
        aria-label="Lumi, seu amigo de palavras"
      >
        <Artwork key={src ?? "placeholder"} src={src} />
      </div>
      <span className="ground" aria-hidden="true" />
      <span className="thinking-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}
