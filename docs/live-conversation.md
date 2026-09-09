# Conversa contínua

O microfone fica aberto durante toda a sessão, inclusive enquanto Lumi fala. Áudio PCM recebido é reproduzido em streaming, sem aguardar turnComplete. A transcrição aparece incrementalmente. O prompt usa comentários, reações e continuidade de assunto; não exige pergunta em toda resposta.

Gemini 3.1 Flash Live usa detecção automática de voz, silêncio de 500 ms, prefixo de 100 ms, interrupções START_OF_ACTIVITY_INTERRUPTS e thinkingLevel minimal. Captura envia blocos de 1024 amostras (~43 ms em 24 kHz). Nada depende de apertar o botão entre falas.

Interrupções limpam imediatamente a fila e preservam transcrições de entrada recebidas no mesmo evento. Se a geração já terminou mas ainda há áudio na fila, atividade de voz confirmada ou transcrição de entrada cancela essa cauda. O evento final e o esvaziamento da fila podem chegar em qualquer ordem. A sessão e seu contexto são mantidos ao interromper.

## Monitoramento e limites

Texto disponível no mesmo evento é verificado antes do áudio desse evento. Os filtros continuam acumulando fragmentos para detectar termos divididos. Como áudio e transcrição chegam de forma assíncrona, parte do áudio pode ser ouvida antes de um alerta ser detectado. Não há mais aprovação prévia da resposta inteira. Ao detectar conteúdo sinalizado, áudio inválido, excesso de tamanho ou ausência de transcrição ao final, a sessão e a reprodução são encerradas. Isso não é uma garantia de segurança semântica.

Permanecem limites de 3 minutos, 10 respostas completas e 60 segundos de inatividade, cookies privados, credencial efêmera e ausência de gravação pelo app. A pausa de segurança encerra a sessão; não é uma reconexão infinita. Nenhuma nova configuração é exigida da família.

## Validação

Testes cobrem reprodução antes de turnComplete/transcrição, microfone durante a fala, ordem de eventos, interrupção, reuso de sessão, cancelamento de áudio já gerado e filtros tardios. O teste opt-in scripts/check-live.cjs usa um visitante temporário e uma conexão Gemini real, sem gravar áudio ou transcrições. A percepção de ritmo e eco depende de microfone, navegador e rede e precisa de escuta no dispositivo.

Documentação oficial: https://ai.google.dev/gemini-api/docs/live-api/capabilities .
