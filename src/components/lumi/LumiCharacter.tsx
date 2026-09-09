"use client";
import Image from "next/image";
import { useState } from "react";
import type { VoiceState } from "@/lib/voice/VoiceProvider";
export function LumiCharacter({ state }: { state: VoiceState }) {
  const [missing, setMissing] = useState(false);
  return (
    <div className={`character-stage ${state}`}>
      <span className="spark spark-one" aria-hidden="true">
        ✦
      </span>
      <span className="spark spark-two" aria-hidden="true">
        ✧
      </span>
      <span className="orbit" aria-hidden="true" />
      <div
        className="character"
        role="img"
        aria-label="Lumi, seu amigo de palavras"
      >
        {missing ? (
          <div className="placeholder">
            <span className="eyes" aria-hidden="true">
              • •
            </span>
            <span className="smile" aria-hidden="true">
              ⌣
            </span>
            <span className="chest-star" aria-hidden="true">
              ★
            </span>
          </div>
        ) : (
          <Image
            src="/lumi/lumi.png"
            alt=""
            width={220}
            height={250}
            unoptimized
            onError={() => setMissing(true)}
          />
        )}
      </div>
      <span className="ground" aria-hidden="true" />
    </div>
  );
}
