"use client";

import { createContext, useContext } from "react";
const Artwork = createContext<string | null>(null);
export const useLumiArtwork = () => useContext(Artwork);
export function LumiArtworkProvider({
  src,
  children,
}: {
  src: string | null;
  children: React.ReactNode;
}) {
  return <Artwork.Provider value={src}>{children}</Artwork.Provider>;
}
