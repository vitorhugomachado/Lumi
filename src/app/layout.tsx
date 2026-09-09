import { ParentAccessProvider } from "@/components/safety/ParentGate";
import type { Metadata } from "next";
import Link from "next/link";
import { existsSync } from "node:fs";
import path from "node:path";
import { LumiArtworkProvider } from "@/components/lumi/LumiArtworkProvider";
import "./globals.css";
import "@/components/lumi/lumi.css";
export const metadata: Metadata = {
  title: "Lumi · Pequenas palavras",
  description:
    "Um protótipo para brincar com palavras e voz. Para testes com adultos.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <LumiArtworkProvider
          src={
            existsSync(path.join(process.cwd(), "public/lumi/lumi.png"))
              ? "/lumi/lumi.png"
              : null
          }
        >
          <div className="app-shell">
            <header>
              <Link className="brand" href="/" aria-label="Lumi, início">
                <span aria-hidden="true">✦</span> lumi
                <span className="brand-dot">.</span>
              </Link>
              <Link className="parent-link" href="/pais">
                Área dos pais <span aria-hidden="true">↗</span>
              </Link>
            </header>
            <ParentAccessProvider>{children}</ParentAccessProvider>
            <footer>Um pouquinho de conversa. Um montão de carinho.</footer>
          </div>
        </LumiArtworkProvider>
      </body>
    </html>
  );
}
