# Contas e múltiplos perfis

Família → Perfis das crianças permite criar, escolher, editar e excluir até seis perfis. Não exige conta. O primeiro perfil preserva todos os dados e atividades anteriores. A exclusão de uma criança remove somente seu perfil e progresso, após confirmação explícita.

O perfil ativo é uma preferência por aba (sessionStorage), vinculada ao ID da conta. O servidor valida o cabeçalho x-lumi-child contra o proprietário autenticado em toda leitura/escrita e na emissão do token Gemini. A troca faz uma navegação completa para descartar o microfone e o estado anterior. Nenhum ID informado pelo navegador substitui a autorização. Sem preferência selecionada, usa-se o primeiro perfil. No modo local, as chaves antigas representam o primeiro perfil; os demais possuem chaves próprias.

As migrações 004 e 005 preservam os dados existentes. Atividades possuem chave estrangeira composta de conta e criança, com exclusão em cascata. O limite de 500 atividades é por criança. O usuário visitante pode transformar sua conta em cadastro e manter todos os filhos e históricos.

## Acesso

- Login/cadastro com e-mail e senha continuam disponíveis; cadastrar-se é opcional.
- Trocar senha exige a senha atual e invalida todas as sessões e links pendentes. Login é serializado com alterações de senha.
- Recuperação e confirmação de e-mail implementadas, mas inativas até configurar o envio real.
- Configure RESEND_API_KEY e MAIL_FROM no Railway, com remetente de domínio verificado. APP_ORIGIN deve ser a origem HTTPS pública. Não são configurações para o responsável dentro do produto.
- Integração segue https://resend.com/docs/api-reference/emails/send-email . Não foram enviados e-mails reais na validação.
- Links opacos de 256 bits, hash no banco, validade de 30 minutos, uso único, finalidade vinculada e quotas. Token no fragmento do URL para evitar logs HTTP e removido da barra após carregar a tela. Confirmação exige ação explícita, evitando consumo por verificadores automáticos de links.
- Resposta da solicitação não revela a existência de uma conta. Erros de envio geram log genérico sem destinatário, link ou credencial.
- Google/Apple permanecem indisponíveis, pois exigem aplicativos e credenciais dos provedores ainda não fornecidos.

## Validação

Testes de migração e APIs executam SQL PostgreSQL em memória via PGlite (apenas dependência de desenvolvimento). Cobrem preservação do perfil/histórico, autorização entre contas, isolamento entre crianças, exclusão em cascata, links expirados/repetidos/finalidade incorreta e revogação de sessões. O envio de e-mail é simulado. Os testes não afirmam entrega real ou funcionamento de OAuth.
