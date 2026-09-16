# Loja de Carros

Site de uma loja de carros seminovos, com a linguagem visual dos grandes
portais de classificados: cor de ação forte, busca em destaque, cards com
foto, preço e ficha, filtros laterais. Nome, logo, cores, contatos e endereço
são da loja — editados no painel. Roda inteiro no Cloudflare Workers.

| Camada | Tecnologia |
|---|---|
| Interface | React 19 · React Router 8 (framework mode, SSR) · Tailwind CSS 4 |
| Servidor | Cloudflare Workers |
| Banco | Cloudflare D1 (SQLite) via Drizzle ORM |
| Fotos | Cloudflare R2 |

Nenhum serviço externo pago: sem provedor de autenticação, sem serviço de
imagem, sem banco fora da Cloudflare.

---

## O que tem

**Site público**
- Início com busca por marca/modelo/preço/ano, vitrine de destaques, categorias, marcas e faixas de preço
- Estoque (`/carros`, `/carros/toyota`, `/carros/toyota/corolla`) com filtros, ordenação e paginação
- Página do veículo com galeria, ficha técnica, opcionais, botão de WhatsApp com a mensagem já escrita, telefone e formulário de contato
- A loja, Contato (com mapa e formulário), Termos e Privacidade
- Botão flutuante de WhatsApp, SEO completo (Open Graph, `schema.org/Car`, sitemap, canonical)

**Painel (`/admin`)** — só para a equipe; não existe cadastro público
- Estoque: busca, abas por situação, destacar, pausar, marcar vendido, excluir
- Cadastro e edição de veículo com até 20 fotos (setas para reordenar; a primeira é a capa)
- Mensagens recebidas pelo site, com resposta rápida por WhatsApp, telefone ou e-mail
- Dados da loja: nome, frase de destaque, texto "sobre", WhatsApp, telefone, endereço, horário, CNPJ, redes
- **Aparência:** logo (PNG, JPG, WebP ou SVG), logo para fundo escuro, banner da home e cores — com
  prévia ao vivo, combinações prontas e sugestão de cores tirada da própria logo
- **Integrações:** Meta Pixel, Google Ads (tag + rótulos de conversão), GA4, Google Tag Manager,
  aviso de cookies (LGPD) e webhook para CRM com assinatura HMAC e botão de teste
- Equipe: dar e remover acessos · Minha senha

Situações de um veículo: **à venda** (aparece em tudo), **pausado** (some do
site; o link dá 404 para visitantes), **vendido** (sai da busca e do sitemap,
mas o link continua abrindo com o aviso de vendido — links já compartilhados
não quebram).

---

## Rodar localmente

```bash
npm install
cp .dev.vars.example .dev.vars   # gere um SESSION_SECRET aleatório
npm run db:migrate               # cria as tabelas no D1 local
npm run db:seed                  # loja, marcas, modelos e 32 carros de exemplo
npm run dev                      # http://localhost:5173
```

Painel: http://localhost:5173/admin — `admin@loja.com` / `demo12345`.

D1 e R2 são emulados pelo `@cloudflare/vite-plugin`, com os dados em
`.wrangler/state`. `npm run db:reset` apaga o banco local e recria do zero.

---

## Publicar no Cloudflare

```bash
npx wrangler login
npx wrangler d1 create loja-de-carros          # copie o database_id para o wrangler.jsonc
npx wrangler r2 bucket create loja-de-carros-imagens
npx wrangler secret put SESSION_SECRET         # valor aleatório longo
npm run db:migrate:remote
npm run acesso -- voce@sualoja.com.br "Seu nome" --remote   # primeiro acesso ao painel
npm run deploy
```

Depois, entre em `/admin/loja` e preencha os dados da loja. O mesmo
`npm run acesso` redefine a senha de quem esqueceu (e derruba as sessões
abertas dessa pessoa).

---

## Personalizar

| O quê | Onde |
|---|---|
| Nome, contatos, endereço, textos | Painel → Dados da loja |
| Logo, banner e cores | Painel → Aparência (a paleta completa sai de duas cores, em `app/lib/cores.ts`) |
| Tags de anúncio e CRM | Painel → Integrações |
| Diferenciais da home ("Seu carro na troca"…) | `DIFERENCIAIS` em `app/routes/home.tsx` |
| Marcas e modelos do catálogo | `scripts/gerar-seed.mjs` |
| Opcionais, cores, carrocerias | `app/lib/veiculos.ts` |

---

## Integrações

**Eventos das tags** (só carregam depois do “Aceitar” no aviso de cookies, se
a opção estiver ligada):

| Momento | Meta | Google | dataLayer (GTM) |
|---|---|---|---|
| Toda página | `PageView` | `page_view` | `pagina` |
| Página de um carro | `ViewContent` | `view_item` | `veiculo` |
| Clique no WhatsApp | `Contact` | `contact` + conversão “WhatsApp” | `whatsapp` |
| Clique no telefone | `Contact` | `contact` | `telefone` |
| Formulário enviado | `Lead` | `generate_lead` + conversão “formulário” | `lead` |

**Webhook do CRM.** A cada mensagem recebida, `POST` em JSON com `lead`,
`veiculo` (ou `null` na página de contato), `rastreio` (utm_*, gclid, fbclid,
página de entrada) e `loja`. Com segredo configurado, o cabeçalho
`X-Assinatura: sha256=<HMAC-SHA256 do corpo>` permite ao CRM conferir a
origem. O envio usa `waitUntil`: o visitante não espera o CRM responder. O
resultado da última entrega aparece no painel. URL e segredo nunca vão para o
navegador.

---

## Estrutura

```
app/
  .server/        código que só roda no Worker (banco, sessão, senha, R2, loja)
  components/     cabeçalho, rodapé, cards, galeria, gerenciador de fotos, campos
  lib/            formatação, filtros de busca, listas fechadas
  routes/
    site.tsx      layout público: carrega a loja uma vez para todas as páginas
    admin/        painel com layout próprio
migrations/       SQL gerado pelo Drizzle, aplicado pelo wrangler
scripts/          gerador do seed e criação de acesso
workers/app.ts    entrada do Worker
```

O React Router **quebra o build** se um componente do navegador importar algo
de `app/.server/`. É a garantia de que banco, senha e segredo nunca vão para o
bundle do cliente.

---

## Decisões que valem saber

**Por que SSR.** Colar o link de um carro no WhatsApp precisa mostrar foto,
modelo e preço. O robô que monta essa prévia não executa JavaScript, então as
tags Open Graph têm de sair prontas do servidor.

**URLs de busca indexáveis.** Marca e modelo ficam no caminho
(`/carros/toyota/corolla`); o resto dos filtros na query. Parâmetros vazios são
removidos, para cada resultado ter uma URL só.

**Fotos reduzidas no navegador.** Redimensionar imagem na Cloudflare é pago. O
gerenciador reduz para no máximo 1600px em WebP antes de enviar. O servidor
valida o formato pelos primeiros bytes do arquivo, não pelo tipo declarado.

**Senha.** PBKDF2-SHA256 com 100.000 iterações via Web Crypto — o teto do
Workers. As iterações ficam gravadas junto do hash, então dá para migrar de
algoritmo depois sem invalidar senhas.

**Sessão.** Cookie `HttpOnly`, `SameSite=Lax`, assinado. O banco guarda só o
SHA-256 do token. Login sempre cria sessão nova; trocar a senha derruba as
sessões dos outros aparelhos; remover alguém da equipe derruba as dele na hora.
Visitantes do site não recebem cookie nenhum.

### Armadilha do D1

`db.batch()` do Drizzle sobre D1 recebe as linhas como objeto chaveado pelo
nome da coluna. Um `SELECT` com `JOIN` que traz duas colunas de mesmo nome
(`marcas.nome` e `modelos.nome`) **perde uma delas e desloca os campos
seguintes, sem erro**. Para leitura com `JOIN`, use `Promise.all`. Detalhes em
`app/.server/db.ts`.

---

## Proteções testadas

- Todo o `/admin` exige sessão; sem ela, vai para o login e volta depois
- Formulários recusam requisição de outra origem
- Login: mesma mensagem e mesmo tempo para conta existente ou não; 8 tentativas por e-mail e 20 por IP em 15 minutos
- Mensagens: 8 por hora por IP, campo invisível contra robô
- Redirecionamento pós-login só para caminho interno
- Ninguém remove o próprio acesso nem o último acesso da loja
- `/imagens/` só serve o prefixo público do R2

---

## Fotos de demonstração

O seed usa fotos do [Unsplash](https://unsplash.com/license) (uso comercial
livre, sem atribuição obrigatória), escolhidas por carroceria e cor parecidas
com cada carro — **não são fotos dos veículos anunciados**. Ficam como URL
externa e não ocupam o R2; basta substituir pelas fotos reais no cadastro do
veículo. O banner padrão e as categorias da home também vêm de lá.

---

## O que ainda não existe

- Recuperação de senha por e-mail (use `npm run acesso`)
- Simulador de financiamento e formulário de avaliação do carro na troca
- Integração com a tabela FIPE
