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

---

## Como colocar o sistema no ar (produção)

O Mercado Livre só aceita autorizar aplicativos com um endereço **HTTPS**
de verdade (não aceita mais `http://localhost`). Por isso, antes de
terminar de criar o aplicativo no Mercado Livre Developers, vamos publicar
o painel na internet — de graça, usando a [Vercel](https://vercel.com/).

### Passo 1 — Criar conta na Vercel e importar o projeto

1. Acesse **https://vercel.com/** e crie uma conta gratuita usando o
   **mesmo GitHub** onde está o código deste projeto (botão "Continue with
   GitHub").
2. Na tela inicial, clique em **"Add New..." → "Project"**.
3. Encontre o repositório **`Sistemamaxxi`** na lista e clique em
   **"Import"**.
4. Na tela de configuração do projeto:
   - **Root Directory**: pode deixar como está (raiz do projeto).
   - Ainda **não** clique em "Deploy" se aparecerem campos de variável de
     ambiente vazios — vamos preencher no próximo passo. Se não houver
     como evitar, pode clicar em Deploy mesmo assim: o primeiro deploy vai
     falhar (porque faltam as variáveis) e a gente corrige e reenvia
     depois, sem problema nenhum.

### Passo 2 — Criar o banco de dados (Postgres gratuito)

1. Ainda dentro do projeto na Vercel, vá na aba **"Storage"**.
2. Clique em **"Create Database"** → escolha **"Postgres"** (geralmente
   oferecido via Neon) → confirme a criação com o plano gratuito.
3. Depois de criado, a Vercel pergunta se quer **conectar ao projeto** —
   confirme. Isso adiciona automaticamente a variável `DATABASE_URL` (ou
   `POSTGRES_URL`) nas configurações do projeto.

   > Se a variável criada tiver outro nome (ex: `POSTGRES_URL`), vá em
   > **Settings → Environment Variables** e crie uma variável chamada
   > exatamente `DATABASE_URL` com o mesmo valor.

### Passo 3 — Preencher as outras variáveis de ambiente

Ainda em **Settings → Environment Variables** do projeto na Vercel,
adicione (uma por uma, marcando para "Production"):

| Nome | Valor |
| --- | --- |
| `SESSION_SECRET` | Uma frase longa e aleatória, só sua (ex: gere em https://1password.com/password-generator) |
| `APP_URL` | O endereço que a Vercel deu ao seu site, ex: `https://sistemamaxxi.vercel.app` |
| `ML_REDIRECT_URI` | O mesmo endereço + `/api/ml/oauth/callback`, ex: `https://sistemamaxxi.vercel.app/api/ml/oauth/callback` |

As variáveis `ML_CLIENT_ID` e `ML_CLIENT_SECRET` a gente preenche depois
de terminar de criar o aplicativo no Mercado Livre Developers (próximo
passo) — sem elas o botão de conectar conta só não vai funcionar ainda,
o resto do site funciona normalmente.

Depois de adicionar as variáveis, vá na aba **"Deployments"** e clique em
**"Redeploy"** no último deploy para aplicá-las.

### Passo 4 — Voltar ao Mercado Livre Developers

Agora que você tem um endereço `https://...` de verdade, volte para a
tela de criação do aplicativo em **developers.mercadolivre.com.br** e
use no campo **"URIs de redirect"**:

```
https://SEU-ENDERECO.vercel.app/api/ml/oauth/callback
```

(troque `SEU-ENDERECO.vercel.app` pelo endereço real que a Vercel te deu).

Nos **"Fluxos OAuth"**, marque:
- ✅ **Authorization Code**
- ✅ **Refresh Token** (importante — sem isso a conexão expira e você
  precisa reconectar toda vez)
- ✅ **PKCE** (nosso sistema já usa PKCE, que é uma camada extra de
  segurança recomendada)

Em **"Permissões"**, dê acesso de leitura (ou leitura e escrita) pelo
menos para o que envolve **itens/anúncios** — é o que o painel usa hoje.

Ao terminar, o Mercado Livre mostra o **Client ID** (ou App ID) e o
**Client Secret** (ou Secret Key). Guarde os dois.

### Passo 5 — Completar as variáveis na Vercel e reimplantar

Volte em **Settings → Environment Variables** na Vercel e adicione:

| Nome | Valor |
| --- | --- |
| `ML_CLIENT_ID` | O Client ID / App ID do passo anterior |
| `ML_CLIENT_SECRET` | O Client Secret / Secret Key do passo anterior |

Vá em **"Deployments" → "Redeploy"** mais uma vez para aplicar.

### Passo 6 — Primeiro acesso

Abra o endereço do seu site (ex: `https://sistemamaxxi.vercel.app`). Como
ainda não existe nenhum usuário, o sistema mostra automaticamente uma
tela de **"Bem-vindo!"** para você criar sua conta de acesso (nome,
e-mail e senha) — não precisa mexer em terminal nem em banco de dados.

Depois de criar sua conta, você já entra direto no painel. Clique em
**"Conectar conta"** para autorizar o acesso ao Mercado Livre — você será
levado para o site do Mercado Livre, vai revisar as permissões e
confirmar, depois volta automaticamente para o painel.

Clique em **"Sincronizar agora"** para importar todos os seus anúncios.

---

## Rodando localmente (opcional, para quem for mexer no código)

Isso não é necessário para o uso do dia a dia — é só para quem for testar
mudanças no sistema antes de publicar.

1. Instale o [Node.js](https://nodejs.org/) e um banco **PostgreSQL**
   (local ou um gratuito em nuvem, ex: [neon.com](https://neon.com/)).
2. Copie o arquivo de exemplo e preencha:
   ```bash
   cp .env.example .env
   ```
3. Instale as dependências e prepare o banco:
   ```bash
   npm install
   npx prisma migrate dev
   ```
4. Ligue o sistema:
   ```bash
   npm run dev
   ```
5. Abra **http://localhost:3000** — a primeira tela será a de criação da
   sua conta de acesso (igual ao Passo 6 acima).

---

## Segurança dos dados de acesso

- O `access_token`/`refresh_token` do Mercado Livre ficam guardados só no
  banco de dados, nunca expostos no navegador.
- O token de acesso expira sozinho e o sistema renova automaticamente
  usando o `refresh_token`, sem precisar reconectar.
- Se algum dia quiser revogar o acesso, dá para clicar em "Desconectar
  conta" no painel (em `/contas`) ou remover o aplicativo diretamente em
  developers.mercadolivre.com.br.
- O arquivo `.env` (usado só localmente) nunca é enviado para o GitHub.
  Em produção, as mesmas informações ficam guardadas como variáveis de
  ambiente na Vercel, também fora do código-fonte.

## Stack técnica (para referência)

- [Next.js](https://nextjs.org/) (React) com TypeScript.
- Banco de dados PostgreSQL via [Prisma ORM](https://www.prisma.io/).
- Tailwind CSS para o visual.
- Autenticação própria e simples (login + senha com sessão em cookie).
- Integração OAuth2 (com PKCE) + REST com a API do Mercado Livre.
- Hospedagem sugerida: [Vercel](https://vercel.com/) (grátis para este
  tamanho de uso).
