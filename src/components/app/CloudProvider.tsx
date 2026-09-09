"use client";
import { useEffect, useState } from "react";
import { cloud, hydrateCloud, requestJson } from "@/lib/cloud";
import { Mascot } from "./Mascot";
// Share startup during Strict Mode remounts so only one guest is created.
let startup: Promise<void> | null = null;
function prepare() {
  if (!startup) {
    startup = (async () => {
      await requestJson("/api/guest", "POST", {});
      await hydrateCloud();
    })().finally(() => {
      startup = null;
    });
  }
  return startup;
}
export function CloudProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  const [state, setState] = useState(enabled ? "loading" : "local");
  const [error, setError] = useState("");
  useEffect(() => {
    cloud.enabled = enabled;
    if (!enabled) return;
    let alive = true;
    let pending = false;
    async function start() {
      if (pending) return;
      pending = true;
      setState("loading");
      setError("");
      try {
        await prepare();
        if (alive) setState("ready");
      } catch {
        if (alive) {
          setError("Não foi possível conectar ao Lumi. Tente novamente.");
          setState("error");
        }
      } finally {
        pending = false;
      }
    }
    const expire = () => {
      if (pending) return;
      cloud.version++;
      cloud.profile = null;
      cloud.activities = [];
      void start();
    };
    window.addEventListener("lumi-session-expired", expire);
    void start();
    return () => {
      alive = false;
      window.removeEventListener("lumi-session-expired", expire);
    };
  }, [enabled]);
  if (!enabled || state === "ready") return children;
  return (
    <main className="ref-screen">
      <Mascot className="account-mascot" />
      <h1>
        {state === "error"
          ? "Vamos tentar de novo?"
          : "Preparando suas descobertas…"}
      </h1>
      <p role="status">{error || "O Lumi já está chegando."}</p>
      {state === "error" && (
        <button
          className="button primary"
          onClick={() => window.location.reload()}
        >
          Tentar novamente
        </button>
      )}
    </main>
  );
}
