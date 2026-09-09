import { ParentGate } from "@/components/safety/ParentGate";
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
      <ChildProfileForm />
    </main>
  );
}

export default function ProtectedPage() {
  return (
    <ParentGate>
      <Onboarding />
    </ParentGate>
  );
}
