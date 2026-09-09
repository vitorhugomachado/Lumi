"use client";
import { useEffect } from "react";
import { Icon } from "./Icon";
import Link from "next/link";
import { usePathname } from "next/navigation";
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  useEffect(() => {
    try {
      document.documentElement.classList.toggle(
        "large-text",
        localStorage.getItem("lumi.large") === "on",
      );
    } catch {}
  }, []);
  const tabs = [
    ["/inicio", "home", "Início"],
    ["/progresso", "progress", "Progresso"],
    ["/conquistas", "trophy", "Conquistas"],
    ["/configuracoes", "user", "Perfil"],
  ];
  const show = [
    "/inicio",
    "/familia",
    "/progresso",
    "/conquistas",
    "/configuracoes",
  ].includes(path.replace(/\/$/, ""));
  return (
    <div
      className={`app-shell ${show ? "with-tabs" : ""} ${/^\/(login|criar-conta)\/?$/.test(path) ? "auth-shell" : ""}`}
    >
      <div className="device-top" aria-hidden="true">
        <span>Lumi</span>
        <span>✦ ✧ ✦</span>
      </div>
      {children}
      {show && (
        <nav className="bottom-tabs" aria-label="Navegação principal">
          {tabs.map(([href, icon, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={path.startsWith(href) ? "page" : undefined}
            >
              <Icon name={icon} />
              {label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
