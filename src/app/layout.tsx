import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
export const metadata: Metadata = {
  title: "Lumi · Pequenas palavras",
  description:
    "Um protótipo para brincar com palavras. Experiência simulada para testes com adultos.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
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
          {children}
          <footer>Um pouquinho de conversa. Um montão de carinho.</footer>
        </div>
      </body>
    </html>
  );
}
