# Sistema visual Lumi

Referência: conjunto de telas fornecido em 9/9/2026. A base usa fundos creme com luz rosa/lilás, títulos violetas, ilustração amarela, cartões suaves e seis cores pastel. Não altera rotas, permissões de microfone, cadastro opcional ou comportamento de voz.

## Fonte única

Nunito variável (200–900), auto-hospedada com next/font/local. Títulos 800, botões 800, texto 500. A fonte e sua licença OFL ficam em public/fonts. Fonte: https://github.com/google/fonts/tree/main/ofl/nunito . Nenhuma requisição do navegador a um servidor externo de fontes.

## Tokens

src/styles/tokens.css é a fonte dos valores compartilhados. src/styles/components.css define os controles comuns e a composição responsiva. Estilos são importados uma única vez no layout, em ordem fixa; telas não carregam versões concorrentes de regras globais.

| Papel | Valor |
|---|---|
| Marca | #6031dc |
| Títulos | #5125cd |
| Texto | #43336c |
| Texto secundário | #71618b |
| Papel | #fffdf8 |
| Borda | #e9dff7 |
| Seleção | #f1eaff |
| Ação | Gradiente #8654d9 → #7040df |
| Espaçamento | 4, 8, 12, 16, 24, 32 px |
| Raio campo / botão / cartão / tela | 16 / 22 / 24 / 36 px |
| Toque mínimo / controle principal | 44 / 52 px |

A cor de ação foi escurecida em relação à referência para manter a leitura dos rótulos brancos. Desabilitado usa lilás suave com texto escuro. Foco visível violeta; movimento reduzido respeitado. Categorias usam pêssego, lilás, menta, amarelo, azul e rosa.

## Aplicação

Entrada e boas-vindas mantêm tratamento ilustrado. Seleções e perfil usam os mesmos campos e cartões. Início tem céu pastel e base verde suave, com personagem e CTA em destaque. Família mantém mensagem, gráfico e dica antes do acesso opcional à conta. Bibliotecas, exercícios, progresso, configurações, login/cadastro e conversa usam os mesmos papéis visuais.

Preservar artes existentes. Não usar roxos independentes para títulos/ações em novas telas: usar tokens. Gradientes decorativos específicos pertencem à ilustração, não à semântica dos controles. Áreas de formulário podem rolar em telas baixas e nunca escondem ações para caber na referência.
