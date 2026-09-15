# Revenda de Veículos

Site de estoque + CRM de leads para revendas de automóveis. Feito para ser
**remixado**: cada loja clona o projeto, aponta para o próprio Supabase e
configura a identidade visual pelo painel, sem editar código.

Stack: **Vite + React + TypeScript + Tailwind + shadcn/ui + Supabase** — a
mesma que o Lovable gera e entende, para que o projeto continue editável lá.

---

## Rodar localmente

Precisa de Docker rodando e do [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
npm install
supabase start                # sobe Postgres, Auth, Storage e Edge Functions
./scripts/criar-admin-local.sh # admin@revenda.local / revenda123
./scripts/seed-fotos.sh        # placeholders dos veículos de demonstração
./scripts/seed-banners.sh      # banners de demonstração do carrossel
npm run dev                    # http://localhost:8080
```

O `supabase start` imprime a `anon key`. Coloque-a no `.env`:

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>
VITE_SITE_URL=http://localhost:8080
```

Endereços úteis:

| O quê | Onde |
|---|---|
| Site | http://localhost:8080 |
| Painel | http://localhost:8080/admin |
| Supabase Studio | http://127.0.0.1:54323 |
| E-mails de teste (Inbucket) | http://127.0.0.1:54324 |

O `criar-admin-local.sh` já deixa um administrador pronto. Se preferir criar
pela tela, use "Primeiro acesso" em `/admin/login`: o primeiro usuário do
projeto vira admin automaticamente.

### Aplicando uma migração nova

Para rodar só as migrações pendentes, **sem perder nada**:

```bash
supabase migration up
```

`supabase db reset` é outra coisa: ele **recria o banco do zero**, apagando
usuários, leads e todas as fotos enviadas pelo painel. Use apenas quando quiser
mesmo voltar ao estado inicial, ou quando precisar validar que as migrações
rodam limpas num banco vazio:

```bash
supabase db reset && ./scripts/criar-admin-local.sh && ./scripts/seed-fotos.sh && ./scripts/seed-banners.sh
```

As fotos ficam no storage e as linhas em `veiculo_fotos`; o reset leva as duas.

---

## Como remixar para uma nova loja

1. **Remix no Lovable** (ou fork deste repositório).
2. **Crie um projeto novo no Supabase.** Um projeto por loja: os dados de uma
   revenda nunca ficam no banco da outra.
3. **Rode as migrações** — `supabase/migrations/` na ordem. Pelo CLI:
   ```bash
   supabase link --project-ref SEU_REF && supabase db push
   ```
4. **Preencha o `.env`** a partir de `.env.example` (só as chaves `VITE_`).
5. **Crie o primeiro usuário** pelo Supabase Auth. Ele vira `admin`
   automaticamente; os seguintes entram sem papel e precisam ser liberados.
6. **Troque os dados da loja** na tabela `config` e apague os veículos
   `DEMO-001` e `DEMO-002` do seed.
7. **Configure os secrets das edge functions** (abaixo).

---

## Secrets das edge functions

Em *Supabase → Settings → Edge Functions → Secrets*. Nenhum deles vai para o
navegador — a anon key é a única chave que o bundle carrega.

| Secret | Para quê |
|---|---|
| `EVOLUTION_API_URL` | URL da sua instância da Evolution API |
| `EVOLUTION_API_KEY` | Chave da instância |
| `EVOLUTION_INSTANCE` | Nome da instância conectada |
| `WHATSAPP_NOTIFICACAO` | Número que recebe o aviso de lead novo (`5511999999999`) |
| `SITE_URL` | Domínio público, usado no sitemap e nas tags OG |

### Sobre a Evolution API

A Evolution conecta um WhatsApp comum por QR code, **fora dos termos da Meta**.
Consequências reais, assumidas no projeto:

- o número pode ser bloqueado pelo WhatsApp;
- a integração quebra quando o protocolo muda;
- não existe SLA nem suporte.

Por isso `enviarWhatsApp()` nunca lança exceção para cima: a falha é registrada
e o fluxo continua. **Um lead jamais é perdido porque a notificação falhou.**
Use um chip dedicado, não o número principal da loja.

---

## Prévia de link no WhatsApp e SEO

O stack é uma SPA: o HTML inicial vem vazio. O Googlebot executa JavaScript,
mas **o robô que gera a prévia de link do WhatsApp não executa**. Sem tratar
isso, colar o link de um carro no WhatsApp mostra um card vazio.

Quem resolve é a edge function `seo`, que devolve HTML com as tags Open Graph e
o schema.org já preenchidos. Falta só rotear os robôs até ela. Exemplo com
Cloudflare Worker no domínio da loja:

```js
const ROBOS = /facebookexternalhit|WhatsApp|Twitterbot|Slackbot|TelegramBot|LinkedInBot|Discordbot/i;
const FUNCAO = "https://SEU-PROJETO.supabase.co/functions/v1/seo";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const ua = request.headers.get("user-agent") || "";

    if (url.pathname === "/sitemap.xml" || url.pathname === "/robots.txt") {
      return fetch(`${FUNCAO}${url.pathname}`);
    }
    if (ROBOS.test(ua) && url.pathname.startsWith("/carros/")) {
      const slug = url.pathname.replace("/carros/", "");
      return fetch(`${FUNCAO}?slug=${encodeURIComponent(slug)}`);
    }
    return fetch(request); // visitante humano recebe o SPA
  },
};
```

Na Vercel ou Netlify o mesmo efeito sai com um rewrite por `User-Agent`.

---

## Dois padrões visuais, de propósito

O projeto tem duas peles, e elas não se misturam:

| | Site público | Portal (`/admin`) |
|---|---|---|
| Gramática | Corporativa-automotiva — ver [`docs/DESIGN-SITE.md`](docs/DESIGN-SITE.md) | Conversão Extrema — ver [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md) |
| Paleta | Derivada da cor de marca em `config` | Fixa: esmeralda |
| Tokens | `--s-*`, em `src/styles/site.css` | `--c-*` em canais RGB, em `src/styles/design-system.css` |
| Tipografia | Inter 700 / 300 | Geist |
| Raio | 0px em tudo | Escala `.ds-app` |
| Tema | Claro sempre | Claro e escuro |

### A home é o carrossel

A primeira seção do site é só imagem: um carrossel de banners, sem texto e sem
botão por cima. Quem remixa sobe as imagens em **Banner** no painel, arrasta a
ordem e a home inteira muda de cara sem tocar em código. Sem nenhum banner, a
home abre numa faixa na cor da marca com o nome da loja — o estado do template
recém-remixado.

Como não há texto visível na abertura, duas coisas viram obrigação e não
detalhe:

- a página ainda precisa de um `h1`, então ele existe escondido (`sr-only`),
  montado com o nome da loja e o que ela vende;
- o **texto alternativo de cada banner é campo do cadastro**, porque é a única
  descrição que sobra para o leitor de tela e para o Google. O painel avisa
  quando um banner ativo está sem descrição.

Logo e favicon também são upload pelo painel, direto para o bucket `marca` —
nada de colar URL nem hospedar imagem em outro lugar. Trocar o logo atualiza o
site na hora.

### Como a paleta do site é derivada

O documento do site fixa a marca em azul e manda não usar outra cor de ação.
Aqui a instrução do cliente vence: o que herdamos é a **gramática** — retângulo
de 0px, contraste 700/300, faixa escura de herói, zero sombra, ritmo de 80px,
link em caixa alta. A **paleta** vem do cadastro de cada revenda.

O truque está em `src/lib/cores.ts`: o sistema original não traz uma cor, traz
uma *relação* entre cores. O azul corporativo é `hsl(217 77% 47%)` e a faixa
escura é `hsl(214 21% 13%)` — mesmo matiz, saturação em 28% da original,
luminosidade travada em 13%. `faixaEscura()` reproduz essa proporção sobre a
cor de qualquer revenda, e é isso que faz o site parecer daquela loja sem
perder a gramática.

As cores ficam em cache no `localStorage` e são aplicadas pelo script
anti-flash antes da primeira pintura. Sem isso o site pintava com a cor de
fallback e animava até a cor da marca na frente do visitante.

Quem remixa o projeto troca as cores do **site** pelo painel, sem tocar em código.
O **portal** é o produto e não muda de loja para loja — por isso ele é o único que
segue o design system.

O tema claro/escuro vive na classe `dark` do `<html>`, com script anti-flash no
`index.html`. O toggle fica no portal, mas a classe é global: o site público já
tem paleta escura definida e acompanha.

---

## Como os papéis são separados

A anon key vai embutida no bundle. Quem segura o acesso é a RLS — e ela é
herdada por todo mundo que remixar, então mexa com cuidado.

| Objeto | Quem lê |
|---|---|
| `veiculos_publicos` (view) | Todos. Sem `preco_custo`, `placa` e `chassi` |
| `veiculos_vendedor` (view) | Staff autenticado, sem dados de custo |
| `veiculos_admin` (view) | Só admin — para vendedor volta vazia |
| `veiculos` (tabela) | `SELECT` só para admin; vendedor escreve mas não lê |
| `leads` | Admin vê todos; vendedor vê só os dele |

Dois detalhes que não são preciosismo:

- **Papel fica em `user_roles`, nunca em `profiles`.** Papel numa tabela que o
  próprio usuário edita é escalada de privilégio.
- **O corte admin/vendedor não sai de `GRANT`**, porque os dois logam como o
  mesmo papel Postgres (`authenticated`). Quem separa é o filtro dentro da view.
- Vendedor não tem `SELECT` na tabela `veiculos`. Ao atualizar um veículo pelo
  painel, não peça retorno: `.update(...)` sem `.select()`.

---

## O que já está construído

**Banco** — schema completo com RLS, views por papel, auditoria, storage,
grants explícitos e seed de demonstração.

**Edge functions** — `registrar-lead` (validação, honeypot, limite por IP,
deduplicação por telefone), `notificar-whatsapp` (Evolution API) e `seo`
(Open Graph, schema.org e sitemap).

**Site público** — home, estoque com filtros na URL, página do veículo com
galeria, contato, privacidade, termos, 404 e banner de cookies.

**Painel** — login com papéis, dashboard, gestão de estoque, cadastro de
veículo com cascata FIPE, upload e ordenação de fotos, pipeline de leads com
histórico, configuração do negócio e gerador de prompt do banner.

### Configuração do negócio e gerador de banner

`/admin/config` guarda mais que contato e cores: guarda **posicionamento** —
o que a loja vende, para quem, diferenciais, oferta principal, provas numéricas
e tom de voz. Isso não é cadastro decorativo: é a matéria-prima de
`/admin/banner`, que monta o pedido de imagem do banner da home.

O gerador sabe três coisas que um prompt escrito à mão costuma esquecer, e são
elas que separam um banner que funciona de um que atrapalha:

1. **A imagem não pode ter texto.** O site escreve o título por cima; texto
   gerado sai deformado e ainda repete o que já está escrito.
2. **Existe uma área que precisa ficar vazia** — o terço esquerdo no desktop, a
   metade superior no celular — porque é onde o título e os botões entram.
3. **O banner é exibido a 30% de opacidade.** Cena escura ou cheia de detalhe
   vira mancha cinza depois do rebaixamento.

Diferenciais entram como sensação a transmitir, nunca como lista literal:
"aceitamos seu usado na troca" é argumento de venda, não elemento de cena.

## O que falta

- Rotina mensal de sincronização da base FIPE. O seed já traz 33 marcas,
  221 modelos e 445 versões do mercado brasileiro — suficiente para operar,
  mas é uma fotografia, não uma base que se atualiza sozinha
- Importação em lote por CSV e feed XML para portais (fases 2 e 3 do escopo)
- Tela de gestão de usuários: hoje o papel de um novo vendedor é liberado
  inserindo a linha em `user_roles` pelo Studio
- E-mail transacional como canal de reserva da notificação de lead
- Roteamento de robôs para a função `seo` no proxy do domínio (ver acima)

O escopo completo está em [`docs/ESCOPO.md`](docs/ESCOPO.md).
