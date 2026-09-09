import Link from "next/link";
export default function Page() {
  return (
    <main className="ref-screen">
      <Link href="/criar-conta">← Voltar</Link>
      <h1>Privacidade no Lumi</h1>
      <p className="fine">Versão de 9 de setembro de 2026</p>
      <p>
        Ao criar uma conta, salvamos nome, e-mail, senha protegida por hash,
        aceite dos termos, perfis opcionais das crianças e atividades separadas
        por criança no PostgreSQL. O cookie de sessão identifica seu acesso.
      </p>
      <p>
        Na conversa por voz, enviamos áudio, nome, idade, interesses e palavras
        conhecidas somente do perfil infantil selecionado ao Google Gemini para
        responder. O nome completo da conta e sua senha não fazem parte desse
        perfil de voz.
      </p>
      <p>
        O app não grava áudio, vídeo ou transcrições no banco. Os provedores
        envolvidos processam os dados necessários ao funcionamento do serviço.
      </p>
      <p>
        Quando o envio de e-mails estiver ativado, o serviço Resend receberá seu
        e-mail e o link temporário solicitado para recuperação de senha ou
        confirmação do endereço. Os links expiram em 30 minutos. Não enviamos
        perfis infantis nesses e-mails.
      </p>
      <p>
        Em Família → Perfis das crianças, você pode excluir uma criança com todo
        o seu progresso. Você pode apagar o perfil e o progresso em
        Configurações, na seção Privacidade e segurança. O acesso sem conta é
        vinculado ao navegador; limpar cookies ou deixar a sessão expirar perde
        o acesso aos dados de visitante.
      </p>
    </main>
  );
}
