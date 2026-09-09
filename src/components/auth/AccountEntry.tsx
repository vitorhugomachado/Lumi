"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cloud, logoutCloud } from "@/lib/cloud";
import "./auth.css";
export function AccountEntry() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const user = cloud.user;
  return (
    <section className="account-entry" aria-label="Sua conta">
      {user && !user.is_guest ? (
        <>
          <strong>Olá, {user.display_name || "família"}!</strong>
          <p>{user.email}</p>
          <button
            disabled={pending}
            onClick={async () => {
              setPending(true);
              try {
                await logoutCloud();
                router.push("/login");
              } catch {
                setError("Não foi possível sair. Tente novamente.");
                setPending(false);
              }
            }}
          >
            {pending ? "Saindo…" : "Sair da conta"}
          </button>
        </>
      ) : (
        <>
          <strong>Suas descobertas, sempre com você</strong>
          <p>
            Uma conta guarda seu perfil e progresso para continuar em outro
            aparelho.
          </p>
          <Link href="/login">Entrar na minha conta →</Link>
          <Link href="/criar-conta">Criar conta</Link>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
