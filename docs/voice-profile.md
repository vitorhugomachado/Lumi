# Perfil na conversa por voz

Ao iniciar uma sessão, Lumi recebe os quatro campos atuais da ficha: nome, idade em meses, interesses e palavras conhecidas. O prompt orienta linguagem e ritmo adequados à idade, temas de interesse e expansão de palavras, sem recitar a ficha ou transformar a interação em perguntas obrigatórias.

No Railway o endpoint de voz consulta o perfil atual no Postgres pelo proprietário da sessão HttpOnly. O corpo enviado pelo navegador não escolhe o proprietário nem substitui a ficha do banco. No modo local sem banco, o perfil vem do localStorage e passa por validação de estrutura, limites e tamanho do corpo (32 KiB). Campos estranhos são descartados; apenas os quatro campos da ficha entram no contexto.

A credencial efêmera é vinculada à configuração personalizada. O navegador recebe o mesmo snapshot para abrir a sessão com configuração idêntica. Nenhuma informação é mantida em variáveis globais entre usuários. Valores livres do perfil são apresentados como JSON não confiável, não como instruções de sistema. As regras de conteúdo permanecem fixas. Isso reduz confusão entre dados e comandos, mas não oferece garantia absoluta contra prompt injection.

Alterar ou apagar o perfil vale na próxima sessão. A sessão já aberta usa o contexto que recebeu ao começar. Sem perfil, a conversa continua normalmente, sem inventar idade ou identidade. O cadastro segue opcional.

Isso é contexto individual de conversa, não treinamento do modelo. A ficha salva é recarregada nas próximas sessões; não foi adicionada memória de conversas anteriores, gravação de áudio, transcrições persistentes ou inferência de diagnósticos. Contas de visitantes continuam vinculadas ao navegador, com as limitações de expiração e troca de aparelho descritas em backend.md.

## Verificação

npm test inclui perfil completo, campos adicionais descartados, JSON inválido/tamanho, atualização/remoção e prioridade do contexto vindo do servidor. TEST_GUEST=1 TEST_PROFILE_VOICE=1 TEST_APP_ORIGIN=... node scripts/check-backend.cjs valida dois visitantes reais, perfil forjado ignorado, ausência de perfil de outro usuário e mudanças refletidas na nova credencial. TEST_PROFILE_VOICE=1 no scripts/check-live.cjs abre Gemini com uma ficha de demonstração e confere áudio em streaming com duas falas. Os testes removem seus visitantes temporários e não registram credenciais ou transcrições.
