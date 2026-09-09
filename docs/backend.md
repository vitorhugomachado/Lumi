# Backend Lumi

Next.js Route Handlers + node-postgres; PostgreSQL privado do Railway.

## API

| Rota | Métodos | Uso |
|---|---|---|
| /api/account | GET, POST, DELETE | Estado da sessão; registrar, entrar e sair; excluir conta com senha |
| /api/profile | GET, PUT, DELETE | Perfil da conta autenticada |
| /api/activities | GET, POST, DELETE | Últimas 500 atividades, inserção idempotente por UUID e exclusão |
| /api/gemini-token | POST | Credencial efêmera; requer conta em produção |
| /api/health | GET | Prontidão da aplicação e do banco |

Todas as mutações exigem Origin igual ao APP_ORIGIN configurado. POST/PUT exigem JSON, limite de 32 KiB. Identificadores de proprietário vêm exclusivamente da sessão; nenhum account_id enviado pelo cliente é usado. Dados de atividades usam horário do servidor e UUID do cliente para evitar duplicações. O microfone dos exercícios apenas mede volume, sem avaliar pronúncia.

Contas possuem hashes scrypt com sal aleatório. Cookies HttpOnly, SameSite=Lax e Secure em HTTPS. Apenas o hash SHA-256 do token aleatório é salvo no banco. Sessões expiram em sete dias; no máximo cinco por conta. As consultas usam parâmetros. Cotas de login, cadastro, escrita e voz ficam no PostgreSQL, compartilhadas entre réplicas. As cotas globais são conservadoras para este protótipo e precisam ser dimensionadas antes de ampliar o público.

## Migrações e operação

`npm run db:migrate`: executa migrations/*.sql em transação, usando lock para impedir concorrência. A tabela lumi_migrations registra versões aplicadas. Use novas migrações para mudanças futuras. Não editar uma migração já aplicada.

`npm start`: escuta em 0.0.0.0 e PORT no Railway; em loopback fora do Railway. O pool usa no máximo cinco conexões por processo. Credenciais nunca ficam no código ou no cliente. DATABASE_URL é uma referência ao serviço Postgres existente, sem abrir acesso TCP público ao banco.

## Testes

`npm run lint`, `npm test`, `npm run build`.

`TEST_APP_ORIGIN=https://seu-app node scripts/check-backend.cjs`: teste opt-in que cria duas contas temporárias em example.invalid, verifica autenticação, persistência, isolamento entre famílias, idempotência, origem, saída e reentrada, e depois remove ambas pela API. TEST_GEMINI=1 também verifica a criação de credencial efêmera sem registrar o token e sem enviar áudio.

## Limites atuais

Um perfil por responsável. Recuperação de senha e verificação de e-mail não estão implementadas; a interface informa isso. Não existe autenticação social, cobrança ou autorização para uso clínico. Som, fonte e escolhas iniciais de interface permanecem preferências do aparelho. O histórico local anterior não é importado automaticamente. O protótipo continua destinado a testes com adultos.

O DELETE de conta exige senha e apaga a conta, o perfil, as atividades e as sessões por cascata. A interface atual oferece apagar perfil/progresso; exclusão da conta está disponível na API. Backups e recuperação operacional devem ser configurados no Railway conforme o uso esperado.

Referências: https://node-postgres.com/features/queries ; https://node-postgres.com/features/pooling ; https://docs.railway.com/databases/postgresql ; https://docs.railway.com/config-as-code/reference .
