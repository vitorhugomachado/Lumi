# Space 3 — lumi-ui

Worktree: `lumi-app-lumi-ui`, branch `lumi-ui`, baseado no commit `ee1ac1f` de `voice-gemini`. As etapas anteriores permanecem em seus próprios worktrees.

## Entregue

- Personagem provisório com respiração e piscadas sutis, inclinação ao ouvir, estrela/brilho e pontos ao pensar, movimento durante a fala e estado de erro calmo.
- Barras de volume ligadas ao áudio real: entrada medida nos blocos do microfone; saída medida por AnalyserNode durante a reprodução. Elas mostram a intensidade sonora, não uma transcrição ou um espectrograma.
- Movimento do personagem ligado ao mesmo nível, com silêncio real sem animação artificial das barras.
- Mock com níveis explicitamente simulados, sem microfone ou API.
- `AudioLevelStore`: snapshots imutáveis para React, amplitude limitada e unsubscribe. Nenhuma amostra é persistida.
- Analisador preserva a saída de som e seu medidor é cancelado ao drenar, interromper ou fechar a sessão.
- Respeito a `prefers-reduced-motion`: sem piscadas, balanço, pulsos ou transições; texto e barras instantâneas continuam informando o estado.
- Arte oficial opcional via `LumiArtworkProvider`: ausência usa o personagem provisório imediatamente, sem tentar carregar um PNG inexistente. Falha de carregamento também preserva o fallback.

## Arte oficial pendente

Nenhuma arte oficial foi fornecida. Não foi criada uma imagem nova nem apresentada a ilustração provisória como oficial. Para completar essa parte, adicionar `public/lumi/lumi.png` e reiniciar o dev server (ou refazer o build). Um PNG transparente funciona melhor. Ajustar o brilho da estrela em `.chest-glow` se a posição no desenho oficial for diferente.

## Teste e prévia

```sh
npm ci
npm run dev -- --port 3002
npm run lint
npm test
npm run build
```

Prévia: http://127.0.0.1:3002. O perfil da porta 3001 não é transferido automaticamente; cadastrar um perfil de demonstração novamente. A configuração `.env.local` é exclusiva da máquina e ignorada pelo Git, como na etapa anterior.

21 testes automatizados passam, incluindo RMS, limitação e estabilidade de snapshots, isolamento entre entrada/saída, cancelamento de medidores e preservação do caminho de reprodução. Lint e build passam. Inspeção visual manual e integração da arte oficial permanecem pendentes.

Não foram alterados modelo Gemini, emissão de tokens, consentimento, limites de sessão ou armazenamento do perfil. Sem publicação da branch; o site hospedado continua na foundation. `safety` ainda não foi iniciado.
