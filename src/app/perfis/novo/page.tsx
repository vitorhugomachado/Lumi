import Link from "next/link";
import { ChildProfileForm } from "@/components/onboarding/ChildProfileForm";
export default function NewChild() {
  return (
    <main className="page">
      <Link
        className="back-round"
        href="/perfis"
        aria-label="Voltar aos perfis"
      >
        ←
      </Link>
      <h1>Mais uma pequena voz</h1>
      <p>Um perfil só para suas descobertas.</p>
      <ChildProfileForm create />
    </main>
  );
}
