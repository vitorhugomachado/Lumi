# Lumi — V0 foundation

Protótipo web para testes com adultos: boas-vindas → perfil local → conversa simulada. Apenas o Space 1 está implementado. Next.js 16.3.4 (App Router), React 19, TypeScript strict e Tailwind CSS 4. Sem banco, autenticação, pagamentos ou analytics.

## Rodar

Requer Node.js 20.9 ou superior (validado com Node 24) e npm.

```sh
npm ci
npm run dev
```

Abra http://localhost:3000. Cadastre **Sofia**, **2 anos**, **Animais** e continue. Toque no microfone/Conversar: **ouvindo (~2 s) → pensando (~1,2 s) → falando (~3,8 s) → idle**. A resposta aparece em texto; nenhum áudio é capturado ou reproduzido. Atualizar a página mantém o perfil. O botão durante a conversa cancela o ciclo; sair da rota limpa os temporizadores.

## Arquitetura e arquivos

- `src/app/page.tsx`: boas-vindas.
- `src/app/onboarding/page.tsx` e `components/onboarding/ChildProfileForm.tsx`: cadastro e edição.
- `src/app/conversar/page.tsx`: ciclo de vida do provider e estados da conversa.
- `src/app/pais/page.tsx`: demonstração com números fixos, edição e exclusão do perfil local.
- `src/app/globals.css`: tokens de cores, controles, responsividade e movimento reduzido.
- `src/components/lumi/`: personagem temporário e rótulos acessíveis.
- `src/components/voice/`: botão e waveform simulados.
- `src/lib/child/`: modelo, validação e persistência em `lumi.profile.v1` no localStorage.
- `src/lib/voice/VoiceProvider.ts`: contrato independente de fornecedor, com conexão, início/parada, estados, transcrições, erros e unsubscribe.
- `src/lib/voice/MockVoiceProvider.ts`: única implementação nesta entrega, sem chamadas de rede.
- `src/lib/voice/createVoiceProvider.ts`: seleção centralizada do motor; valores diferentes de mock falham explicitamente.
- `public/lumi/README.md`: instruções para adicionar a arte oficial em `public/lumi/lumi.png`; a ausência ativa o placeholder.
- `tests/foundation.test.cjs`: persistência, validação, ciclo completo e cancelamento.
- `docs/space-1-prompt.md`: escopo do primeiro Space; `docs/original-brief.txt`: anexo original, como referência de roadmap.

## Ambiente e modo mock

O modo padrão é `mock`. Opcionalmente copie `.env.example` para `.env.local`:

```dotenv
NEXT_PUBLIC_VOICE_PROVIDER=mock
```

Arquivos `.env` reais são ignorados pelo Git. Não há credenciais nesta base. O nome, idade em meses (24–59), interesses e palavras conhecidas ficam exclusivamente no navegador, sem envio ao servidor. Bloqueio do armazenamento produz uma mensagem; conteúdo inválido é tratado como perfil ausente.

## Modo Gemini (Space 2, ainda não implementado)

Não configure `gemini` nesta V0: será exibido um erro explicando que o motor não está disponível. O próximo Space implementará `GeminiLiveProvider`, Web Audio, streaming e a rota segura de tokens efêmeros após verificar a documentação oficial. `GEMINI_API_KEY` deverá existir somente no servidor, nunca com prefixo `NEXT_PUBLIC_`. Nenhum endpoint fictício ou integração incompleta foi adicionado.

## Verificação

```sh
npm run lint
npm test
npm run build
npm start
```

O lint é separado do build. Os testes usam o executor nativo do Node e o compilador TypeScript já instalado, sem nova dependência. Para inspeção manual, abra em 375, 390 e 430 px e desktop; confira foco por teclado e preferência de movimento reduzido.

A prévia privada em Sites usa `LUMI_STATIC_EXPORT=1 npm run build` (PowerShell: `$env:LUMI_STATIC_EXPORT='1'; npm run build`), gerando `out/`. Essa variável é opcional e exclusiva do build; sem ela, `npm run build` e `npm start` continuam usando o servidor Next.js. No Space 2, a hospedagem precisará suportar a rota de tokens no servidor. Não execute `npm start` sobre a saída exportada; remova a variável e rode novamente o build normal.

## Limitações e próximos três Spaces

1. **voice-gemini**: microfone, reprodução, streaming e autenticação efêmera encapsulados no provider. Começar somente depois de aprovar foundation.
2. **lumi-ui**: arte oficial, animações refinadas, waveform real e estados visuais. Placeholder e animações básicas já existem somente para validar o fluxo.
3. **safety**: prompt infantil dinâmico, regras de conversa, limites de sessão e parent gate. A área dos pais atual é livre e não representa um controle de segurança.

Sem IA, reconhecimento de fala, gravação, lip-sync, offline/service worker ou instalação PWA nesta base. As métricas são fictícias. Não há diagnóstico, terapia, testes clínicos ou promessa de desenvolvimento.

**Esta V0 ainda não é apropriada para coleta de áudio real de crianças.** Testar somente como protótipo com adultos. O desenvolvimento posterior deve preservar supervisão dos responsáveis e minimização de dados.

## Organização

Repositório local `lumi-app`, branch `foundation`. Um Space remoto no Astra não foi criado por esta entrega. Importe o repositório nessa plataforma para continuar com worktrees separados. Os outros três Spaces não foram iniciados.
