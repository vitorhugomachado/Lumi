import Link from "next/link";
export default function Page() {
  return (
    <main className="ref-screen">
      <Link href="/criar-conta">← Voltar</Link>
      <h1>Termos de uso</h1>
      <p className="fine">Versão de 9 de setembro de 2026</p>
      <p>
        Lumi oferece brincadeiras com palavras e conversa por inteligência
        artificial. Não fornece diagnóstico, terapia ou avaliação do
        desenvolvimento.
      </p>
      <p>
        Criar uma conta é opcional. Ao cadastrar-se, informe dados corretos e
        guarde sua senha. A conta permite recuperar seu perfil e progresso em
        outro aparelho usando e-mail e senha.
      </p>
      <p>
        A conversa pode cometer erros e possui limites de duração e filtros
        automáticos. Áudio e perfil preenchido são enviados ao Google Gemini
        quando você inicia a voz.
      </p>
      <p>
        Pagamento, login social e recuperação de senha por e-mail ainda não
        estão disponíveis nesta versão.
      </p>
    </main>
  );
}
