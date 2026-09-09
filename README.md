# Lumi — Space 3: lumi-ui

Interface reativa à voz, em worktree `lumi-app-lumi-ui` e branch `lumi-ui`, baseada na etapa `voice-gemini`. As branches anteriores permanecem preservadas. As barras de volume usam o microfone e o áudio realmente reproduzido; o personagem acompanha os estados. Esta etapa é exclusivamente para testes com adultos; não está liberada para coleta de áudio de crianças.

Veja `docs/space-3-lumi-ui.md` para alterações e validação. **A arte oficial ainda não foi fornecida**: o personagem provisório continua disponível, preparado para receber `public/lumi/lumi.png`.

## Executar localmente

Requer Node.js 20.9+ e npm (validado com Node 24). Neste worktree:

```sh
npm ci
```

Copie `.env.example` para `.env.local` e configure localmente:

```dotenv
NEXT_PUBLIC_VOICE_PROVIDER=gemini
GEMINI_API_KEY=sua_chave_do_google_ai_studio
```

Não compartilhe a chave no chat nem adicione `.env.local` ao Git. A chave existe apenas no servidor; o navegador recebe uma credencial efêmera de uso único. Reinicie o servidor após alterar a configuração.

```sh
npm run dev -- --port 3002
```

Abra **http://127.0.0.1:3002**. Cadastre um perfil de demonstração, confirme que está testando com sua própria voz adulta e toque em Conversar. Permita o microfone quando solicitado. Lumi faz uma saudação, responde com áudio e aceita novas falas até você parar. Use fones para reduzir eco. O botão de parada, sair da página ou trocar de aba encerra a sessão e libera o microfone.

O perfil de `localhost:3000`, `127.0.0.1:3002` e da prévia hospedada não é compartilhado: o localStorage pertence a cada origem. Cadastre novamente o perfil nesta prévia.

## Implementação

- `src/lib/voice/VoiceProvider.ts`: contrato independente do fornecedor, preservado.
- `src/lib/voice/GeminiLiveProvider.ts`: conexão, streaming, transcrições, interrupções, erros, timeout, encerramento e descarte de callbacks tardios.
- `src/lib/voice/audio/BrowserAudio.ts`: Web Audio, microfone mono e fila de reprodução com limite de 30 segundos.
- `public/audio/pcm-capture.js`: AudioWorklet com blocos de 2048 amostras; saída local silenciosa para não monitorar o próprio microfone.
- `src/lib/voice/audio/pcm.ts`: codificação PCM16 little-endian e decodificação dos blocos de saída.
- `src/lib/voice/geminiConfig.ts`: modelo `gemini-3.1-flash-live-preview`, API `v1beta`, transcrições e configuração fixa de teste em português.
- `src/lib/voice/tokenService.ts` e `src/app/api/gemini-token/route.ts`: emissão de token com chave no servidor, uso único, início em até 60 segundos e expiração em três minutos; configuração de sessão vinculada ao token; respostas `no-store`; erros sanitizados.
- `src/app/conversar/page.tsx`: consentimento de teste com adulto, estados reais, resposta e transcrição temporárias, encerramento ao ocultar a página.
- `tests/gemini.test.cjs`: testes isolados do protocolo, áudio, cancelamento, falhas e emissão de tokens.
- `scripts/check-gemini.cjs`: teste opcional contra o Gemini real, sem microfone.

O áudio de entrada é PCM16 mono na taxa real do AudioContext (24 kHz solicitados); Gemini aceita essa taxa e faz a conversão. Saída PCM16 a 24 kHz é agendada em sequência no relógio do AudioContext. `speaking` permanece até a fila terminar, mesmo depois de `turnComplete`. Interrupções descartam áudio ainda na fila. O estado `thinking` após silêncio é uma estimativa visual; o VAD automático do Gemini define os turnos.

O único pacote de runtime adicionado é o SDK oficial `@google/genai` (2.21.0 no lockfile). Nenhuma chave, token, gravação ou transcrição é registrada em logs pelo aplicativo. O áudio fica somente na fila temporária de reprodução; as transcrições ficam na memória da página até sair ou recarregar. O perfil não é enviado ao servidor nem ao Gemini; a contextualização dinâmica fica para uma etapa posterior.

## Modo mock

Use `NEXT_PUBLIC_VOICE_PROVIDER=mock` e reinicie. O mock continua funcionando sem chave, permissão de microfone, chamadas ao Google ou consentimento de envio. Os testes de foundation continuam incluídos.

## Qualidade e teste real

```sh
npm run lint
npm test
npm run build
npm start -- --port 3002
```

Não rode dev e start na mesma porta ao mesmo tempo. O build agora contém uma rota dinâmica de servidor e não pode ser exportado como site estático. `LUMI_STATIC_EXPORT` não é mais utilizado nesta branch.

Teste opcional **com consumo de API**, após configurar a chave:

```sh
node --env-file=.env.local scripts/check-gemini.cjs
```

Esse teste cria um token, abre uma sessão, envia um pequeno bloco de silêncio e uma mensagem fixa e verifica áudio e transcrição de saída. Não grava nem reproduz áudio, não usa o perfil e não imprime credenciais. Não faz parte de `npm test`.

Validação nesta entrega: 21 testes automatizados, lint e build aprovados. Na etapa voice-gemini anterior, o teste Live real recebeu 12 blocos de áudio e transcrição, e a rota HTTP emitiu token com `no-store`. A validação de microfone físico, reprodução nos alto-falantes, eco e permissão no navegador depende de teste manual com um adulto. O SDK 2.21.0 ainda imprime um aviso mencionando `v1alpha`; mantemos `v1beta` conforme a documentação oficial atual e o teste real bem-sucedido.

## Hospedagem e limites desta etapa

**A prévia `lumi-app.vitorhugomateo.chatgpt.site` continua na foundation, em modo mock.** Ela é estática e não consegue executar a rota de tokens. Nenhuma publicação da branch de voz foi realizada.

Os comandos dev/start vinculam o servidor a `127.0.0.1`. O emissor exige origem local correspondente e limita a cinco tentativas por minuto por processo. Isso é uma barreira de teste local, **não autenticação para um servidor público**. Não exponha a porta por túnel ou proxy. Antes de hospedar voz, será necessário um runtime compatível com Next.js no servidor, controle de acesso verificado e limitação persistente no emissor. O manifesto Sites mantém o mesmo projeto, sem declarar uma saída estática inexistente.

Sessões de teste terminam em até três minutos. Erros não reconectam automaticamente; o adulto inicia uma nova sessão. Esta etapa não implementa retomada de sessões longas, arte oficial, lip-sync, PWA offline ou parent gate.

O consentimento atual é uma confirmação para testes com adultos, não um parent gate. O prompt fixo é somente uma base; não substitui a etapa `safety`, nem torna o produto apropriado para uso por crianças.

## Próximas etapas

1. Validar microfone e reprodução com adulto no navegador local e preparar hospedagem com servidor e acesso controlado.
2. Integrar a arte oficial fornecida pelo usuário e validar a aparência em celular.
3. `safety`: prompt contextual revisado, controles parentais e avaliação das proteções antes de testes com crianças.

## Referências oficiais consultadas

- [Tokens efêmeros](https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens)
- [Áudio, transcrições, VAD e interrupções](https://ai.google.dev/gemini-api/docs/live-api/capabilities)



