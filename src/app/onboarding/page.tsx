import { ChildProfileForm } from "@/components/onboarding/ChildProfileForm";
export default function Onboarding() {
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
