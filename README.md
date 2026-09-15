# Gestor de Conta Mercado Livre

Painel web para gerenciar a conta da empresa no Mercado Livre. A primeira
versão foca em **anúncios e catálogo**: conecta com a sua conta via API
oficial do Mercado Livre, importa todos os seus anúncios e mostra um painel
com resumo (ativos, pausados, sem estoque, valor total em estoque) e uma
tabela pesquisável de todos os produtos anunciados.

> Este documento foi escrito para quem **não é programador**. Sempre que
> algo parecer técnico demais, pode colar a dúvida direto para o Claude
> Code continuar te ajudando.

## O que já existe hoje

- Login do painel (usuário e senha, só para quem você autorizar).
- Conexão segura com o Mercado Livre (OAuth2 — o mesmo tipo de "Entrar
  com..." que outros sites usam, mas com a conta do Mercado Livre).
- Botão "Sincronizar agora" que busca **todos** os anúncios da conta.
- Painel com:
  - Total de anúncios, ativos, pausados e anúncios ativos sem estoque.
  - Valor total em estoque (preço × quantidade disponível).
  - Tabela com busca por título e filtro por status.

## O que ainda vamos construir (próximas etapas)

- Financeiro (taxas, repasses, custo de frete).
- Reputação e atendimento (perguntas, reclamações, mensagens).
- Vendas e pedidos.
- Publicar o painel na internet (hoje ele roda só localmente).

---

## Passo 1 — Criar o aplicativo no Mercado Livre Developers

Isso é necessário para o sistema poder acessar os dados da sua conta pela
API oficial (não usamos usuário/senha do Mercado Livre em nenhum momento).

1. Acesse **https://developers.mercadolivre.com.br/** e faça login com a
   conta do Mercado Livre da empresa.
2. Vá em **"Minhas aplicações"** → **"Criar aplicação"**.
3. Preencha:
   - **Nome**: algo como "Gestor Maxxi Tacos".
   - **Descrição curta**: "Painel interno para gestão da conta".
   - **URL de redirect (redirect_uri)**: por enquanto, enquanto testamos
     localmente, use exatamente:
     ```
     http://localhost:3000/api/ml/oauth/callback
     ```
     (quando colocarmos o sistema no ar, trocamos essa URL pela do site
     real — te aviso quando chegarmos nessa etapa).
   - **Tópicos/Produtos**: marque pelo menos "Itens e Buscas" (`items`) e
     "Vendas" (`orders`), que são os escopos usados pelo painel.
4. Ao criar, o Mercado Livre vai te mostrar duas informações importantes:
   - **App ID / Client ID**
   - **Secret Key / Client Secret**

   Guarde as duas — vamos usá-las no próximo passo. A Secret Key é uma
   senha: não compartilhe com ninguém nem publique em lugar nenhum.

---

## Passo 2 — Configurar o arquivo `.env`

O arquivo `.env` guarda as informações sensíveis do sistema (senhas e
chaves) e **nunca é enviado para o GitHub** (ele está na lista de
arquivos ignorados).

1. Copie o arquivo de exemplo:
   ```bash
   cp .env.example .env
   ```
2. Abra o `.env` e preencha:
   - `ML_CLIENT_ID` e `ML_CLIENT_SECRET`: os valores do Passo 1.
   - `SESSION_SECRET`: qualquer frase longa e aleatória (usada só para
     assinar o login do painel).
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`: os dados do seu
     primeiro usuário de acesso ao painel.

---

## Passo 3 — Rodar o sistema pela primeira vez

Se for o Claude Code rodando por você, pode pedir para ele executar estes
comandos. Se for rodar você mesmo em um computador com Node.js instalado:

```bash
npm install          # instala tudo que o sistema precisa
npm run seed          # cria o seu usuário de login (ADMIN_EMAIL/ADMIN_PASSWORD do .env)
npm run dev            # liga o sistema
```

Depois abra **http://localhost:3000** no navegador, faça login com o
e-mail e senha definidos no `.env` e clique em **"Conectar conta"** para
autorizar o acesso ao Mercado Livre. Você será redirecionado para o site
do Mercado Livre, vai revisar as permissões pedidas e confirmar — depois
volta automaticamente para o painel.

Clique em **"Sincronizar agora"** para importar todos os anúncios.

---

## Banco de dados

Por enquanto os dados ficam guardados em um arquivo local
(`prisma/dev.db`), o que é ótimo para testar sem precisar configurar
nada. Quando formos publicar o sistema na internet para uso do dia a dia,
vamos trocar para um banco de dados hospedado (gratuito para o nosso
tamanho de uso) — isso é só uma etapa técnica que cuidamos juntos na hora
do deploy, sem perder nenhum dado.

## Segurança dos dados de acesso

- O `access_token`/`refresh_token` do Mercado Livre ficam guardados no
  banco de dados local, nunca expostos no navegador.
- O token de acesso expira sozinho e o sistema renova automaticamente
  usando o `refresh_token`, sem precisar reconectar.
- Se algum dia quiser revogar o acesso, dá para clicar em "Desconectar
  conta" no painel (em `/contas`) ou remover o aplicativo diretamente em
  developers.mercadolivre.com.br.

## Stack técnica (para referência)

- [Next.js](https://nextjs.org/) (React) com TypeScript.
- Banco de dados via [Prisma ORM](https://www.prisma.io/) (SQLite local
  por enquanto).
- Tailwind CSS para o visual.
- Autenticação própria e simples (login + senha com sessão em cookie).
- Integração OAuth2 + REST com a API do Mercado Livre.
