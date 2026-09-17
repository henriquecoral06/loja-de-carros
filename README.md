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
- Início com banner (foto ou vídeo de fundo), busca, vitrine de destaques, categorias, marcas e faixas de preço
- Estoque (`/carros`, `/carros/toyota`, `/carros/toyota/corolla`) com filtros, ordenação e paginação
- Página do veículo com galeria, ficha, opcionais, WhatsApp do vendedor responsável (ou da loja), telefone e formulário
- **Venda seu carro**: formulário de avaliação (marca/modelo, ano, km) que vira lead
- **Landing pages** (`/lp/...`): uma página por carro, sem o menu do site, para tráfego pago — estilos Clássico, Escuro e Impacto
- A loja, Contato, Termos e Privacidade; botão flutuante de WhatsApp configurável; SEO completo

**Painel (`/admin`)** — barra lateral escura, só para a equipe
- **Dashboard**: leads novos, leads em 30 dias, veículos à venda, landing pages ativas, atalhos e últimos leads
- **Veículos**: tabela com busca por marca/modelo/código, filtros, status editável na linha, destaque, exclusão;
  código sequencial (0001, 0002…); **exportação XML** para portais com link protegido por token
- **Landing Pages**: criar em 3 passos (veículo, conteúdo, estilo), duplicar, copiar link, visitas
- **Leads**: status (Novo, Contatado, Em negociação, Vendido, Perdido) e anotações que salvam sozinhos,
  busca, filtro, origem (página do carro, contato, venda seu carro, landing page) e campanha (utm/gclid/fbclid),
  WhatsApp com um clique e **exportação CSV**
- **Vendedores**: nome, WhatsApp (com DDI), e-mail, foto, ativo/inativo
- **Integrações**: webhook de CRM (HMAC), **API de leads** com token, Meta Pixel + **API de Conversões**
  (deduplicação por event_id, código de teste), Google Ads/GA4/GTM, **conversões configuráveis** por tipo
  (formulário, WhatsApp, ligar), e-mail de novos leads pelo **Resend**, botões de teste e registro dos últimos envios
- **Configurações**: logo e logo para fundo escuro, nome, CNPJ, slogan, cores (principal, hover e escura, com
  sugestão tirada da logo), contatos com DDI, redes sociais, botão flutuante, textos e banner/vídeo da home,
  acessos ao painel e troca de senha

Situações de um veículo: **à venda**, **pausado** (some do site) e **vendido** (sai da busca, mas o link
continua abrindo com aviso — links compartilhados não quebram).

---

## Rodar localmente

```bash
npm install
cp .dev.vars.example .dev.vars   # gere um SESSION_SECRET aleatório
npm run db:migrate               # cria as tabelas no D1 local
npm run db:seed                  # loja, 32 carros, 2 vendedores, 5 leads e 1 landing page de exemplo
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
| Logo, banner, vídeo, cores, textos | Painel → Configurações (a paleta completa sai de `app/lib/cores.ts`) |
| Tags de anúncio, CRM, e-mail | Painel → Integrações |
| Diferenciais da home ("Seu carro na troca"…) | `DIFERENCIAIS` em `app/routes/home.tsx` |
| Marcas e modelos do catálogo | `scripts/gerar-seed.mjs` |
| Opcionais, cores, carrocerias | `app/lib/veiculos.ts` |

---

## Integrações

**Eventos das tags** (carregam depois do “Aceitar” no aviso de cookies, se a opção estiver ligada). Os de
conversão usam o evento do Meta e o rótulo do Google Ads escolhidos em Integrações → Conversões:

| Momento | Meta | Google | dataLayer (GTM) |
|---|---|---|---|
| Toda página | `PageView` | `page_view` | `pagina` |
| Página de um carro | `ViewContent` | `view_item` | `veiculo` |
| Formulário enviado | configurável (padrão `Lead`) | `generate_lead` + conversão | `formulario` |
| Clique no WhatsApp | configurável (padrão `Contact`) | `contact` + conversão | `whatsapp` |
| Clique no telefone | configurável (desligado por padrão) | `contact` + conversão | `ligar` |

**API de Conversões do Meta.** Com o token salvo, cada formulário também é enviado pelo servidor, com e-mail,
telefone e nome em SHA-256, IP, user agent e os cookies `_fbp`/`_fbc`. O `event_id` é o mesmo do Pixel no
navegador, então o Meta conta uma vez só. O botão de teste exige o código de evento de teste.

**Webhook do CRM.** A cada lead, `POST` JSON com `lead`, `veiculo`, `vendedor`, `landing_page`, `rastreio`
(utm, gclid, fbclid, página de entrada) e `loja`. Com segredo: `X-Webhook-Signature: sha256=<HMAC do corpo>`
e `X-Webhook-Secret` (para Make/Zapier/n8n, que só comparam cabeçalho). Webhook, e-mail e API de Conversões
rodam com `waitUntil`: o visitante não espera ninguém responder.

**API de leads.** `GET /api/leads?since=2026-09-01T00:00:00Z&status=novo&limit=100` com
`Authorization: Bearer <token>`. O banco guarda só o SHA-256 do token.

**Feed XML.** `GET /feed/estoque.xml?token=…` (ativado em Veículos → Exportar para portais): veículos à venda
com código, marca, modelo, versão, anos, km, preço, câmbio, combustível, carroceria, cor, portas, opcionais,
descrição, URL e fotos. Formato genérico — cada portal tem o seu; adapte `app/routes/feed.ts` ao do integrador.

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
- Envio automático para portais pela API de cada um (o feed XML genérico cobre quem importa por link)
- Simulador de financiamento e formulário de avaliação do carro na troca
- Integração com a tabela FIPE
