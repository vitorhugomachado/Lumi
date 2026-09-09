# Backend Lumi

Next.js Route Handlers + node-postgres; PostgreSQL privado do Railway.

## API

| Rota | Métodos | Uso |
|---|---|---|
| /api/guest | POST | Cria sessão anônima automaticamente ou reutiliza e renova a sessão atual |
| /api/account | GET, POST, DELETE | Estado da sessão; registrar, entrar e sair; excluir conta com senha (visitante usa confirm=true) |
| /api/profile | GET, PUT, DELETE | Perfil da conta autenticada |
| /api/activities | GET, POST, DELETE | Últimas 500 atividades, inserção idempotente por UUID e exclusão |
| /api/gemini-token | POST | Credencial efêmera; requer sessão automática em produção |
| /api/health | GET | Prontidão da aplicação e do banco |

Todas as mutações exigem Origin igual ao APP_ORIGIN configurado. POST/PUT exigem JSON, limite de 32 KiB. Identificadores de proprietário vêm exclusivamente da sessão; nenhum account_id enviado pelo cliente é usado. Dados de atividades usam horário do servidor e UUID do cliente para evitar duplicações. O microfone dos exercícios apenas mede volume, sem avaliar pronúncia.

Visitantes têm is_guest=true, sem e-mail nem senha. A migração 002 preserva contas existentes e permite identidade anônima. POST /api/guest valida Origin, limita novas sessões a 100/h globalmente e mantém o proprietário de sessões válidas, inclusive contas antigas. O cliente compartilha a inicialização para evitar duplicação no Strict Mode. Nenhum perfil é necessário para obter a credencial Gemini. Se preenchido, o perfil do proprietário é consultado no banco e incluído na configuração personalizada da sessão; veja voice-profile.md.

Contas cadastradas anteriormente possuem hashes scrypt com sal aleatório. Cookies HttpOnly, SameSite=Lax e Secure em HTTPS. Apenas o hash SHA-256 do token aleatório é salvo no banco. Sessões expiram em sete dias e são renovadas ao abrir o app. Limpar cookies ou deixar a sessão expirar perde o acesso aos dados do visitante; sincronização entre aparelhos e recuperação não fazem parte deste fluxo. Logins tradicionais mantêm no máximo cinco sessões por conta. As consultas usam parâmetros. Cotas de login, cadastro, escrita e voz ficam no PostgreSQL, compartilhadas entre réplicas. As cotas globais são conservadoras para este protótipo e precisam ser dimensionadas antes de ampliar o público.

## Migrações e operação

O serviço Lumi no Railway tem Pre-deploy Command `npm run db:migrate`, Start Command `npm start`, Healthcheck Path `/api/health/` e timeout de 120 segundos. Essas opções foram aplicadas diretamente ao serviço pela CLI/API. Em outro ambiente, configure-as antes de publicar. Novos serviços Railway não leem o antigo railway.json; ele não é usado aqui.

`npm run db:migrate`: executa migrations/*.sql em transação, usando lock para impedir concorrência. A tabela lumi_migrations registra versões aplicadas. Use novas migrações para mudanças futuras. Não editar uma migração já aplicada.

`npm start`: escuta em 0.0.0.0 e PORT no Railway; em loopback fora do Railway. O pool usa no máximo cinco conexões por processo. Credenciais nunca ficam no código ou no cliente. DATABASE_URL é uma referência ao serviço Postgres existente, sem abrir acesso TCP público ao banco.

## Testes

`npm run lint`, `npm test`, `npm run build`.

`TEST_APP_ORIGIN=https://seu-app node scripts/check-backend.cjs`: teste opt-in que cria duas contas temporárias em example.invalid, verifica autenticação, persistência, isolamento entre famílias, idempotência, origem, saída e reentrada, e depois remove ambas pela API. TEST_GEMINI=1 também verifica a criação de credencial efêmera sem registrar o token e sem enviar áudio.

TEST_GUEST=1 no mesmo script verifica visitantes sem formulário, renovação/reuso da identidade, Gemini sem perfil, persistência e isolamento. A limpeza remove apenas os dois visitantes criados pelo teste.

## Limites atuais

Um perfil opcional por visitante. Não há tela obrigatória de cadastro, perfil ou liberação. Recuperação de senha e verificação de e-mail não estão implementadas. Não existe autenticação social, cobrança ou autorização para uso clínico. Som, fonte e escolhas iniciais de interface permanecem preferências do aparelho. O histórico local anterior não é importado automaticamente. O fluxo de pagamento será implementado separadamente. Limites de conversa e filtros de conteúdo continuam automáticos.

O DELETE de conta exige senha para contas cadastradas ou confirmação explícita para o visitante autenticado, e apaga a conta, o perfil, as atividades e as sessões por cascata. A interface atual oferece apagar perfil/progresso; exclusão da conta está disponível na API. Backups e recuperação operacional devem ser configurados no Railway conforme o uso esperado.

Referências: https://node-postgres.com/features/queries ; https://node-postgres.com/features/pooling ; https://docs.railway.com/databases/postgresql ; https://docs.railway.com/config-as-code/reference .
