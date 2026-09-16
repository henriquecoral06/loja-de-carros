# Loja de Carros

Marketplace de carros usados e seminovos: qualquer pessoa ou loja cria conta,
anuncia com fotos e recebe mensagens dos compradores. Roda inteiro no
Cloudflare Workers.

| Camada | Tecnologia |
|---|---|
| Interface | React 19 · React Router 8 (framework mode, SSR) · Tailwind CSS 4 |
| Servidor | Cloudflare Workers |
| Banco | Cloudflare D1 (SQLite) via Drizzle ORM |
| Fotos | Cloudflare R2 |

Nada de serviço externo pago: sem provedor de autenticação, sem serviço de
imagem, sem banco fora da Cloudflare.

---

## Rodar localmente

```bash
npm install
cp .dev.vars.example .dev.vars   # gere um SESSION_SECRET aleatório
npm run db:migrate               # cria as tabelas no D1 local
npm run db:seed                  # marcas, modelos, anunciantes e anúncios de exemplo
npm run dev                      # http://localhost:5173
```

D1 e R2 são emulados localmente pelo `@cloudflare/vite-plugin`, com os dados
em `.wrangler/state`. `npm run db:reset` apaga o banco local e recria do zero.

**Contas de demonstração** — senha `demo12345` para todas:

| E-mail | Tipo |
|---|---|
| `loja@demo.com` | Loja (Prime Veículos, BH) |
| `sul@demo.com` | Loja (Sul Seminovos, Curitiba) |
| `marina@demo.com` | Particular (São Paulo) |
| `diego@demo.com` | Particular (Rio de Janeiro) |

---

## Publicar no Cloudflare

```bash
npx wrangler login
npx wrangler d1 create loja-de-carros          # copie o database_id para o wrangler.jsonc
npx wrangler r2 bucket create loja-de-carros-imagens
npx wrangler secret put SESSION_SECRET         # valor aleatório longo
npm run db:migrate:remote
npm run deploy
```

Para popular produção com os dados de exemplo:
`npx wrangler d1 execute DB --remote --file=./seed/seed.sql` (gere antes com
`node scripts/gerar-seed.mjs`). Em produção de verdade, pule esse passo.

---

## Estrutura

```
app/
  .server/        código que só roda no Worker (banco, sessão, senha, R2)
  components/     cabeçalho, cards, galeria, gerenciador de fotos, campos
  lib/            formatação, filtros de busca e listas fechadas (câmbio, UF…)
  routes/         páginas e rotas de recurso (/imagens, /sitemap.xml, /robots.txt)
migrations/       SQL gerado pelo Drizzle, aplicado pelo wrangler
scripts/          gerador do seed
workers/app.ts    entrada do Worker
```

O React Router **quebra o build** se um componente do navegador importar algo
de `app/.server/`. É a garantia de que banco, senha e segredo nunca vão para o
bundle do cliente.

---

## Decisões que valem saber

**Por que SSR.** Colar o link de um anúncio no WhatsApp precisa mostrar foto,
modelo e preço. O robô que monta essa prévia não executa JavaScript, então as
tags Open Graph têm de sair prontas do servidor. Com React Router em modo SSR
no Workers, isso vem de graça — junto de título, canonical e dados
estruturados (`schema.org/Car`) para o Google.

**URLs de busca indexáveis.** Marca e modelo ficam no caminho
(`/carros/toyota/corolla`); o resto dos filtros na query. Parâmetros vazios são
removidos, para cada resultado ter uma URL só.

**Fotos reduzidas no navegador.** Redimensionar imagem no servidor da
Cloudflare é pago. O gerenciador de fotos reduz para no máximo 1600px em WebP
antes de enviar: foto de celular de 4–8 MB vira algumas centenas de KB. O
servidor valida o formato pelos primeiros bytes do arquivo, não pelo tipo que
o navegador declara.

**Senha.** PBKDF2-SHA256 com 100.000 iterações, via Web Crypto. É o **teto** do
Workers — acima disso o `crypto.subtle` recusa. A OWASP recomenda 600.000; as
iterações ficam gravadas junto do hash, então dá para migrar de algoritmo
depois sem invalidar as senhas existentes.

**Sessão.** Cookie `HttpOnly`, `SameSite=Lax`, assinado. O banco guarda só o
SHA-256 do token — um vazamento do banco não entrega sessões válidas. Login
sempre cria sessão nova; trocar a senha derruba as sessões dos outros
aparelhos.

**Contato do anunciante.** O telefone não está no HTML da página: aparece
depois de um clique, com limite por IP. Isso tira os anunciantes das listas de
robô de spam.

### Armadilha do D1

`db.batch()` do Drizzle sobre D1 recebe as linhas como objeto chaveado pelo
nome da coluna. Um `SELECT` com `JOIN` que traz duas colunas de mesmo nome
(`marcas.nome` e `modelos.nome`) **perde uma delas e desloca todos os campos
seguintes, sem erro**. Foi um bug real deste projeto: os cards da busca saíam
"COROLLA LOJA" com selo de particular. Para leitura com `JOIN`, use
`Promise.all`. Detalhes em `app/.server/db.ts`.

---

## Proteções testadas

- Uma conta não abre, edita, pausa nem exclui anúncio de outra (responde 404)
- Formulários recusam requisição de outra origem
- Login: mesma mensagem e mesmo tempo de resposta para conta existente ou não;
  8 tentativas por e-mail em 15 minutos, mesmo trocando de IP
- Limites por IP para cadastro, revelar telefone e enviar mensagem
- Campo invisível contra robô de formulário
- Redirecionamento pós-login só para caminho interno
- `/imagens/` só serve o prefixo público do R2

---

## O que ainda não existe

- Recuperação de senha e confirmação de e-mail (exigem envio de e-mail)
- Favoritos, comparador e alerta de busca
- Painel de moderação — a coluna `papel` já existe, a interface não
- Integração com a tabela FIPE: o catálogo tem 24 marcas e 109 modelos de
  exemplo, ampliável em `scripts/gerar-seed.mjs`
- Anúncio em destaque ou planos pagos
