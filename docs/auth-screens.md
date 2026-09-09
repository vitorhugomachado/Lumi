# Login e criar conta

Rotas /login e /criar-conta seguem as referências fornecidas, com personagem existente, fundo lilás, nuvens, mensagens de apoio, cartão claro e campos acessíveis. Links disponíveis na família e configurações; continuar sem conta permanece disponível.

Formulários reais: nome completo da conta (distinto do nome infantil), e-mail, senha, confirmação no cadastro, aceite de termos/privacidade, mostrar/ocultar senha, estados de erro/espera. A migração 003 guarda nome, versão/data do aceite e preferência de persistência da sessão. O cadastro promove o visitante atual na mesma transação e renova a credencial, preservando perfil e atividades e invalidando o cookie antigo. Login em conta existente usa os dados dessa conta, sem mesclar históricos de outros visitantes.

Lembrar de mim marcado mantém o cookie por 7 dias. Desmarcado usa cookie de sessão sem Max-Age e validade no banco de 24h, renovada ao abrir o app. Alguns navegadores restauram cookies de sessão ao restaurar abas. Logout revoga a sessão corrente. A chave do Gemini não é enviada ao cliente.

Google e Apple aparecem com Em breve e botões desabilitados: não há OAuth configurado. Esqueci minha senha explica a indisponibilidade atual de recuperação por e-mail. Nenhum e-mail é enviado. No ambiente local sem DATABASE_URL, a interface abre normalmente e aponta para o site publicado para autenticar; não salva senhas no navegador nem simula contas.

Termos e privacidade descrevem o funcionamento atual, inclusive envio do perfil infantil e áudio ao Gemini. Nenhuma promessa de dados nunca compartilhados foi copiada da referência.

Validação: lint, build, npm test; scripts/check-auth.cjs opt-in testa cadastro, preservação dos dados de visitante, rotação de sessão, duplicidade, login, senha incorreta e preferência de cookie, removendo a conta de teste no final.
