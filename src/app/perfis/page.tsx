"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cloud, type ChildSummary } from "@/lib/cloud";
import { listChildren, removeChild, selectChild } from "@/lib/child/family";
import { localChildId } from "@/lib/child/selection";
export default function Profiles() {
  const [children, setChildren] = useState<ChildSummary[]>([]);
  const [active, setActive] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<ChildSummary | null>(null);
  useEffect(() => {
    let alive = true;
    listChildren()
      .then((items) => {
        if (alive) {
          setChildren(items);
          setActive(cloud.enabled ? cloud.childId || "" : localChildId());
        }
      })
      .catch(() => {
        if (alive)
          setError(
            "Não foi possível carregar os perfis. Atualize a página para tentar novamente.",
          );
      });
    return () => {
      alive = false;
    };
  }, []);
  return (
    <main className="ref-screen family-profiles">
      <Link
        className="back-round"
        href="/familia"
        aria-label="Voltar à família"
      >
        ←
      </Link>
      <h1>Quem vai brincar?</h1>
      <p>Cada criança tem seu próprio perfil e progresso.</p>
      {!children.length && !error && <p role="status">Carregando perfis…</p>}
      {children.map((child, index) => (
        <section className="family-child" key={child.id}>
          <span className={`child-avatar pastel-${index}`} aria-hidden="true">
            {["🌟", "🌷", "🦋", "🌈", "🐣", "🌻"][index]}
          </span>
          <div>
            <h2>{child.name || "Pequeno explorador"}</h2>
            <p>
              {child.ageMonths
                ? `${Math.floor(child.ageMonths / 12)} anos`
                : "Sem personalização"}
              {active === child.id ? " · Em uso" : ""}
            </p>
          </div>
          <button
            className="button primary"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              try {
                selectChild(child.id);
              } catch {
                setBusy(false);
                setError(
                  "Permita o armazenamento deste navegador para escolher o perfil.",
                );
              }
            }}
          >
            Brincar com {child.name || "Lumi"}
          </button>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              try {
                selectChild(child.id, "/onboarding/");
              } catch {
                setBusy(false);
                setError("Não foi possível abrir o perfil.");
              }
            }}
          >
            Editar perfil
          </button>
          <button
            className="auth-text"
            disabled={busy}
            onClick={() => setDeleting(child)}
          >
            Excluir perfil
          </button>
        </section>
      ))}
      {children.length < 6 && (
        <Link className="button secondary" href="/perfis/novo">
          + Adicionar criança
        </Link>
      )}
      {deleting && (
        <section className="family-child" aria-label="Confirmar exclusão">
          <h2>Excluir {deleting.name || "este perfil"}?</h2>
          <p>
            O perfil e seu progresso serão apagados. Essa ação não pode ser
            desfeita.
          </p>
          <button
            className="button primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await removeChild(deleting.id);
              } catch {
                setError("Não foi possível excluir. Tente novamente.");
                setBusy(false);
              }
            }}
          >
            Excluir perfil e progresso
          </button>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => setDeleting(null)}
          >
            Cancelar
          </button>
        </section>
      )}
      {error && (
        <p role="alert" className="error-box">
          {error}
        </p>
      )}
      <p className="fine">
        Você pode continuar sem conta. Criar uma conta permite acessar esses
        perfis em outro aparelho.
      </p>
    </main>
  );
}
