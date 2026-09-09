import { CloudProvider } from "@/components/app/CloudProvider";
import { ParentAccessProvider } from "@/components/safety/ParentGate";
import type { Metadata } from "next";
import { AppShell } from "@/components/app/AppShell";
import { existsSync } from "node:fs";
import path from "node:path";
import { LumiArtworkProvider } from "@/components/lumi/LumiArtworkProvider";
import "./globals.css";
import "./reference.css";
import "@/components/lumi/lumi.css";
export const dynamic = "force-dynamic";
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
          <ParentAccessProvider>
            <AppShell>
              <CloudProvider enabled={Boolean(process.env.DATABASE_URL)}>
                {children}
              </CloudProvider>
            </AppShell>
          </ParentAccessProvider>
        </LumiArtworkProvider>
      </body>
    </html>
  );
}
