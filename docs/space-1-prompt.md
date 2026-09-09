# Space 1 — foundation

Você é o engenheiro principal do Lumi. Use `original-brief.txt` como visão do produto, mas implemente exclusivamente a V0 base: Next.js App Router, TypeScript strict, Tailwind, rotas /, /onboarding, /conversar e /pais, design system, perfil em localStorage e modo mock.

Critério concreto: cadastrar Sofia, 2 anos, Animais; tocar em Conversar; observar listening → thinking → speaking com resposta simulada em texto. Perfil deve persistir ao recarregar. Suportar cancelar, repetir e sair da conversa sem temporizadores remanescentes.

Criar contrato VoiceProvider independente de fornecedor e apenas MockVoiceProvider. Adiar Gemini, acesso a microfone, áudio real, streaming, arte oficial, prompt infantil completo e parent gate para outros Spaces. Não iniciar os quatro em paralelo. Não adicionar funcionalidades extras.

Concluir somente com `npm run lint`, testes existentes e `npm run build` passando. Documentar arquitetura, instalação, limitações, comandos e próximos passos. Não fazer afirmações clínicas. Protótipo para adultos, sem coleta real de áudio infantil.
