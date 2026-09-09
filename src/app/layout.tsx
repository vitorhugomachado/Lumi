import localFont from "next/font/local";
import { CloudProvider } from "@/components/app/CloudProvider";
import type { Metadata } from "next";
import { AppShell } from "@/components/app/AppShell";
import { existsSync } from "node:fs";
import path from "node:path";
import { LumiArtworkProvider } from "@/components/lumi/LumiArtworkProvider";
import "@/styles/tokens.css";
import "./globals.css";
import "./reference.css";
import "@/components/lumi/lumi.css";
import "@/components/auth/auth.css";
import "@/styles/components.css";
const nunito = localFont({
  src: "../../public/fonts/Nunito-variable.ttf",
  variable: "--font-lumi",
  weight: "200 900",
  display: "swap",
});
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Lumi · Pequenas palavras",
  description: "Pequenas descobertas para brincar com palavras e voz.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={nunito.variable}>
      <body>
        <LumiArtworkProvider
          src={
            existsSync(path.join(process.cwd(), "public/lumi/lumi.png"))
              ? "/lumi/lumi.png"
              : null
          }
        >
          <AppShell>
            <CloudProvider enabled={Boolean(process.env.DATABASE_URL)}>
              {children}
            </CloudProvider>
          </AppShell>
        </LumiArtworkProvider>
      </body>
    </html>
  );
}
