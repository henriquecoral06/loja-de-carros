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
| Fotos | Cloudflare D1 (ou R2, se configurado) |

Nenhum serviço externo pago: sem provedor de autenticação, sem serviço de
imagem, sem banco fora da Cloudflare.

---

## O que tem

**Site público**
- Início com banner (foto ou vídeo de fundo), busca, vitrine de destaques, categorias, marcas e faixas de preço
- Estoque (`/carros`, `/carros/toyota`, `/carros/toyota/corolla`) com filtros, ordenação e paginação
- Página do veículo com galeria, ficha, opcionais, WhatsApp do vendedor responsável (ou da loja), telefone e formulário
- **Venda seu carro**: formulário de avaliação (marca/modelo, ano, km) que vira lead
- **Landing pages** (`/lp/...`): uma página por carro para tráfego pago, com 8 estilos (Editorial, Vibrante, Clean, Luxo,
  Noturno, Tech, Moderno, Boutique), tema de 13 cores, seções que podem ser ocultadas e reordenadas, ficha técnica,
  vídeo, mapa, depoimentos, dúvidas e material em PDF que só é liberado depois do contato (vira lead)
- A loja, Contato, Termos e Privacidade; botão flutuante de WhatsApp configurável; SEO completo

**Painel (`/admin`)** — barra lateral escura, só para a equipe
- **Dashboard**: leads novos, leads em 30 dias, veículos à venda, landing pages ativas, atalhos e últimos leads
- **Veículos**: tabela com busca por marca/modelo/código, filtros, status editável na linha, destaque, exclusão;
  código sequencial (0001, 0002…); **exportação XML** para portais com link protegido por token
- **Landing Pages**: criar em 2 etapas (carro + ponto de partida + estilo, depois o editor por seções com painel de
  cores, rascunho/ativa, pré-visualização e aviso de alterações não salvas), duplicar, copiar link, visitas
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
npx wrangler secret put SESSION_SECRET         # valor aleatório longo
npm run db:migrate:remote
npm run acesso -- voce@sualoja.com.br "Seu nome" --remote   # primeiro acesso ao painel
npm run deploy
```

Depois, entre em `/admin/loja` e preencha os dados da loja. O mesmo
`npm run acesso` redefine a senha de quem esqueceu (e derruba as sessões
abertas dessa pessoa).

---

## Testar antes de publicar

```bash
npm run test:e2e                                                  # local (conta demo do seed)
BASE=https://sua-loja.workers.dev EMAIL=voce@loja.com SENHA=... npm run test:e2e   # produção
```

Abre o Chrome instalado (sem janela) e usa o sistema como uma pessoa usaria: busca e filtros, página do
carro, os quatro formulários do site, menu e filtros no celular; no painel, cadastro de veículo com e sem
fotos, status, destaque, edição, feed XML, landing page (criar, trocar estilo, ocultar seção, PDF de 3 MB, download pela página, duplicar, excluir), leads (status, anotação,
CSV), vendedores, integrações (salvar, token da API, testes), configurações, acessos e senha errada.
Falha se aparecer erro de servidor, erro de JavaScript ou tela de erro. Tudo que ele cria leva o prefixo
`E2E` e é apagado no fim.

O site limita 8 mensagens por hora por IP; o teste envia 4. Para rodar várias vezes seguidas no local,
limpe o limite: `npx wrangler d1 execute DB --local --command "delete from limites"`.

### Armadilhas do Cloudflare Workers que o teste pegou

- `new Date()` no topo de um módulo vale **1970** no Workers. Anos, datas e prazos são sempre
  calculados dentro do componente ou do loader (`listaAnos()` em `app/lib/veiculos.ts`).
- `db.batch([])` vazio funciona no D1 local e **falha no remoto**.
- O D1 aceita no máximo **100 parâmetros** por consulta: nada de `IN (...)` com listas longas.
- Trocar o `database_id` em `wrangler.jsonc` faz o ambiente local usar outro banco (vazio).
- Migração que recria tabela (`DROP` + `RENAME`, como o drizzle-kit gera ao mudar um default) dispara os
  `ON DELETE` das chaves estrangeiras: por isso `0002` só usa `ADD COLUMN`.
- Componente declarado dentro de outro (`const Bloco = () => ...` no corpo do componente) remonta a cada
  render; se tiver `useFetcher` dentro, entra em loop ("Maximum update depth exceeded").

### Onde ficam as imagens

Fotos, logo, banner e fotos de vendedores enviadas pelo painel ficam **no próprio D1** (tabela `arquivos`),
então o site funciona completo sem ativar o R2. O navegador reduz cada foto para ~200–400 KB antes de
enviar (o D1 aceita até 2 MB por imagem) e `/imagens/...` responde com cache de um ano na borda da
Cloudflare. Se a conta tiver R2, adicione o binding `IMAGENS` no `wrangler.jsonc`: o código passa a
guardar no R2 sozinho.

Arquivos maiores que o limite de uma linha do D1 (o PDF de material das landing pages, até 10 MB) são
gravados em partes (`chave#p001`, `#p002`…) e remontados na leitura. Uploads de uma landing page só são
apagados quando nenhuma outra página (por exemplo, uma duplicada) ainda usa o arquivo.

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

**Remarketing do Google Ads.** Numa “tag do Google” com vários destinos, o `page_view` automático vai só para o GA4. Por isso o site envia também `gtag('event','page_view',{send_to:"AW-…"})` a cada página — sem isso, a lista de público do Ads fica vazia (as conversões funcionam de qualquer jeito, porque já usam `send_to`).

**Como conferir.** O `page_view` da primeira página sai da própria tag (igual ao código oficial do Google e ao `fbq('track','PageView')` do Meta); as navegações seguintes são enviadas pelo `app/lib/rastreamento.ts`. O Google Ads só envia dados em **conversões** (formulário e WhatsApp) — a cada página, quem envia é o GA4 ligado à mesma tag, então depuradores como o Tag Assistant listam só o GA4 até acontecer uma conversão.

**Eventos das tags.** O código das tags vai no `<head>` de toda página pública (o painel não é medido), então o Tag Assistant, o diagnóstico do Google Ads e o Pixel Helper encontram a instalação. Com “pedir consentimento” ligado, elas começam em Modo de Consentimento (Google `denied`, Meta `revoke`) e o “Aceitar” libera os cookies; o Google ainda mede conversões sem cookies, de forma modelada. O teste ponta a ponta bloqueia as chamadas ao Google e ao Meta, para não gerar conversão falsa. Os de
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

**Formato do webhook.** O padrão é o JSON completo da loja. CRMs que exigem outro formato (ex.: `{ "entity": "Lead", "data": { … } }`) usam **Formato do envio → Personalizado**: um modelo JSON com marcadores `{{lead.nome}}`, `{{veiculo.titulo}}`, `{{rastreio.utm_campaign}}`… (lista completa na tela, código em `app/lib/webhook-modelo.ts`). Um valor que é só o marcador mantém o tipo (preço continua número). A tela mostra a prévia do que o CRM recebe.

**Feed XML.** `GET /feed/estoque.xml?token=…` (ativado em Veículos → Exportar para portais): veículos à venda
com código, marca, modelo, versão, anos, km, preço, câmbio, combustível, carroceria, cor, portas, opcionais,
descrição, URL e fotos. Formato genérico — cada portal tem o seu; adapte `app/routes/feed.ts` ao do integrador. Em Veículos → Exportar para portais, **Verificar feed** lê o link como um portal leria e confere XML, quantidade, campos obrigatórios e se as fotos abrem, sem precisar de conta em portal.

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
