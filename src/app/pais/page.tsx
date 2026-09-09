"use client";
import { ParentGate, useParentAccess } from "@/components/safety/ParentGate";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { clearProfile } from "@/lib/child/storage";
function Parents() {
  const router = useRouter();
  const access = useParentAccess();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  return (
    <main className="page parents">
      <div className="eyebrow">PARA QUEM CUIDA</div>
      <h1>
        Pequenas descobertas,
        <br />
        juntos.
      </h1>
      <p className="intro">Um olhar carinhoso para as brincadeiras.</p>
      <section className="panel">
        <h2>Conversas com pausas</h2>
        <p>
          A voz encerra em até 3 minutos, 10 respostas ou 1 minuto sem
          interação. Cada resposta aguarda a verificação de sua transcrição
          antes de tocar.
        </p>
        <p>
          O perfil fica neste navegador. Áudio e transcrições não são salvos
          pelo app; a voz é enviada ao Google Gemini durante o teste.
        </p>
        <button className="button secondary" onClick={() => access.lock()}>
          Bloquear acesso agora
        </button>
      </section>
      <div className="badge">Dados fictícios · demonstração</div>
      <div className="stats">
        <section>
          <span>Tempo conversando</span>
          <strong>
            4 <small>min</small> 12 <small>s</small>
          </strong>
        </section>
        <section>
          <span>Tentativas de fala</span>
          <strong>17</strong>
        </section>
      </div>
      <section className="panel">
        <h2>Palavras praticadas</h2>
        <div className="word-list">
          <span>bola</span>
          <span>grande</span>
          <span>cachorro</span>
        </div>
      </section>
      <section className="panel tip">
        <span className="eyebrow">UMA IDEIA PARA HOJE</span>
        <p>
          Experimente usar <strong>“bola grande”</strong> durante uma
          brincadeira.
        </p>
      </section>
      <p className="fine">
        Estes números são exemplos fixos. Não medimos fala ou desenvolvimento.
      </p>
      <Link className="button primary" href="/conversar">
        Voltar para o Lumi →
      </Link>
      <Link className="button secondary" href="/onboarding">
        Editar perfil local
      </Link>
      {confirm ? (
        <div className="panel">
          <p>Apagar o perfil salvo neste navegador?</p>
          <button
            className="button secondary"
            onClick={() => {
              try {
                clearProfile();
                router.push("/onboarding");
              } catch {
                setError(
                  "Não foi possível apagar o perfil. Confira as permissões do navegador.",
                );
              }
            }}
          >
            Sim, apagar perfil
          </button>
          <button className="text-link" onClick={() => setConfirm(false)}>
            Cancelar
          </button>
        </div>
      ) : (
        <button className="text-link" onClick={() => setConfirm(true)}>
          Apagar perfil local
        </button>
      )}
      {error && <p role="alert">{error}</p>}
      <p className="notice">
        Protótipo para testes com adultos. Esta V0 ainda não é apropriada para
        coleta de áudio real de crianças. Não oferece diagnóstico, terapia ou
        avaliação de desenvolvimento.
      </p>
    </main>
  );
}

export default function ProtectedPage() {
  return (
    <ParentGate>
      <Parents />
    </ParentGate>
  );
}
