# Interface Lumi da referência

Implementada na branch design-reference sobre safety. Preview local: http://127.0.0.1:3003/.

## Telas

- `/`: abertura com marca Lumi.
- `/boas-vindas`: apresentação.
- `/publico` e `/objetivos`: escolha do público e múltiplos objetivos; acesso do responsável.
- `/onboarding`: perfil local existente, seguido de `/inicio`.
- `/inicio`: categorias e acesso à conversa Gemini em `/conversar`.
- `/familia`: resumo da família e acesso à área dos responsáveis.
- `/sons`, `/palavras`, `/animais`, `/objetos`: filtros, cartões e exercício selecionável.
- Cada exercício possui exemplo, minha vez (microfone e câmera opcional) e celebração. O microfone é fechado ao parar, sair, ocultar a aba ou completar 8 segundos. O medidor reflete o áudio real; não há gravação ou avaliação de pronúncia.
- `/historias`: três histórias com leitura em voz alta.
- `/musicas`: seleção de quatro letras e leitura; não contém gravações cantadas ou acompanhamento musical.
- `/progresso`: registros reais deste aparelho e período selecionável para totais. O gráfico identifica os últimos sete dias.
- `/conquistas`: desbloqueio por participação registrada.
- `/responsaveis` (também `/pais`): relatórios, orientações e perfil.
- `/configuracoes`: som da leitura, tamanho de texto, privacidade e exclusão confirmada de perfil/progresso.

## Fidelidade e limites

Paleta pastel, botões lilás, hierarquia, cartões arredondados e navegação inferior seguem a referência. A arte foi recriada a partir da imagem fornecida, não extraída como uma tela plana. Os ícones de catálogo usam emojis do dispositivo e podem diferir da referência. Textos e controles são elementos acessíveis e responsivos.

A foto da criança foi substituída por Lumi e uma opção explícita para mostrar a própria câmera ao vivo; nenhuma foto ilustrativa é apresentada como captura real. O protótipo permanece para testes com adultos. A faixa do perfil continua 2 a 4 anos; públicos mais velhos e suporte terapêutico aparecem identificados como indisponíveis. Não há conexão com profissionais, lembretes automáticos ou diagnóstico.

O Gemini e suas proteções permanecem no fluxo de conversa existente. Histórias e exemplos usam a síntese de voz disponível no navegador. A preferência de som controla essas leituras; a conversa Gemini mantém seus controles próprios. Progresso é participação, não desenvolvimento. Áudio/vídeo dos exercícios não saem do aparelho pelo app. O app não persiste áudio/transcrições.

Hospedagem permanece local: o emissor de tokens foi deliberadamente restrito a loopback na etapa anterior. O site público anterior não recebe esta atualização automaticamente.

## Arte

Gerada com a ferramenta integrada imagegen a partir da referência do usuário. Arquivos em `public/lumi/`: `lumi.png`, `story-atlas.png` (três painéis iguais) e `lumi-canoe.png`.

Prompt do personagem: Isolar Lumi da referência em PNG transparente, corpo inteiro, amarelo brilhante, duas antenas curvas, olhos grandes roxos, bochechas rosadas, boca aberta sorrindo, braços levantados, sem fundo, texto ou interface.

Prompt das histórias: Atlas quadrado com três painéis horizontais iguais, sem textos ou bordas: patinho amarelo em lago turquesa; avião vermelho e azul entre nuvens lilás; coelho, raposa e macaco em floresta verde pastel. Ilustração 3D suave coerente com a referência.

Prompt da música: Ilustração 3:2 de Lumi na canoa de madeira em água turquesa, céu azul pastel e notas musicais, preservando as antenas curvas, olhos roxos e sorriso, sem texto ou interface.

Validação: lint, build, testes de regressão e respostas HTTP das rotas. Microfone, câmera e leitura precisam de conferência no dispositivo por um adulto; não foram testados por automação de navegador nesta entrega.
