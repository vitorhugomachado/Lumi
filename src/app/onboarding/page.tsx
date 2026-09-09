import Link from "next/link";
import { ChildProfileForm } from "@/components/onboarding/ChildProfileForm";
function Onboarding() {
  return (
    <main className="page">
      <div className="eyebrow">VAMOS NOS CONHECER</div>
      <h1>
        Conheça um pouquinho
        <br />
        sobre seu pequeno
      </h1>
      <p className="intro">Cada descoberta começa com algo que ele adora.</p>
      <p className="fine">
        Personalização opcional. Você já pode brincar sem preencher.
      </p>
      <Link className="button secondary" href="/inicio">
        Continuar sem preencher
      </Link>
      <ChildProfileForm />
    </main>
  );
}

export default function ProtectedPage() {
  return <Onboarding />;
}
