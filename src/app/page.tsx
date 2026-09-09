import Link from "next/link";
import { LumiCharacter } from "@/components/lumi/LumiCharacter";
export default function Welcome() {
  return (
    <main className="welcome">
      <div className="eyebrow">UM MUNDO PARA DESCOBRIR</div>
      <h1>
        Pequenas palavras.
        <br />
        <span>Grandes descobertas.</span>
      </h1>
      <p className="intro">
        Um novo amigo para brincar
        <br />
        com sons, palavras e imaginação.
      </p>
      <LumiCharacter state="idle" />
      <div className="welcome-bottom">
        <Link className="button primary" href="/onboarding">
          Começar <span aria-hidden="true">↗</span>
        </Link>
        <p className="fine">Feito para explorar juntos, com um responsável.</p>
        <div className="badge">
          ✦{" "}
          {process.env.NEXT_PUBLIC_VOICE_PROVIDER === "gemini"
            ? "Conversa por voz · teste com adulto"
            : "Protótipo com conversa simulada"}
        </div>
      </div>
    </main>
  );
}
