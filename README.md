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
supabase start          # sobe Postgres, Auth, Storage e Edge Functions
./scripts/seed-fotos.sh # placeholders para os veículos de demonstração
npm run dev             # http://localhost:8080
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

Crie o primeiro usuário em `/admin/login` pelo "Primeiro acesso" — ele vira
admin automaticamente. Para recomeçar do zero:

```bash
supabase db reset && ./scripts/seed-fotos.sh
```

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
histórico, e personalização da revenda.

## O que falta

- Rotina mensal de sincronização da base FIPE (hoje o seed traz uma amostra)
- Importação em lote por CSV e feed XML para portais (fases 2 e 3 do escopo)
- Tela de gestão de usuários: hoje o papel de um novo vendedor é liberado
  inserindo a linha em `user_roles` pelo Studio
- E-mail transacional como canal de reserva da notificação de lead
- Roteamento de robôs para a função `seo` no proxy do domínio (ver acima)

O escopo completo está em [`docs/ESCOPO.md`](docs/ESCOPO.md).
