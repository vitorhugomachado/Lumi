# Arte do Lumi

Ainda não há arte oficial neste diretório. A aplicação mostra o personagem provisório imediatamente.

Para integrar a arte fornecida pelo usuário:

1. Salvar a imagem como `public/lumi/lumi.png` (preferencialmente PNG com fundo transparente).
2. Reiniciar `npm run dev` ou refazer `npm run build`. A presença da imagem é resolvida no servidor.
3. Verificar recorte e proporção: o componente usa `object-fit: contain`, sem deformar a arte.
4. Se necessário, ajustar `.chest-glow` em `src/components/lumi/lumi.css` para alinhar o brilho à estrela da imagem.

A mesma imagem é usada nos estados idle/listening/thinking/speaking/error, com movimento aplicado ao contêiner. Sem lip-sync. Se a imagem não carregar, o personagem provisório permanece visível.
