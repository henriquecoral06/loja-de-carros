import { eq } from "drizzle-orm";
import { CircleCheck, CircleX, KeyRound, Send } from "lucide-react";
import { useState } from "react";
import { data, Form, useFetcher, useNavigation } from "react-router";
import { db, schema } from "~/.server/db";
import { obterIntegracoes } from "~/.server/integracoes";
import { obterLoja } from "~/.server/loja";
import { exigirUsuario } from "~/.server/sessao";
import { dentroDoLimite, exigirMesmaOrigem } from "~/.server/seguranca";
import { entregarWebhook, type PayloadLead } from "~/.server/webhook";
import { CampoTexto } from "~/components/Campo";
import { tempoRelativo } from "~/lib/formato";
import { metaAdmin } from "~/lib/site";
import type { Route } from "./+types/integracoes";

export function meta({ matches }: Route.MetaArgs) {
  return metaAdmin("Integrações", matches);
}

export async function loader({ request }: Route.LoaderArgs) {
  await exigirUsuario(request);
  const i = await obterIntegracoes();
  // O segredo não volta para a tela: só se existe.
  const { webhookSegredo, ...resto } = i;
  return { ...resto, temSegredo: Boolean(webhookSegredo) };
}

type Campo = "metaPixelId" | "googleAdsId" | "googleAdsRotuloLead" | "googleAdsRotuloWhatsapp" | "ga4Id" | "gtmId" | "webhookUrl" | "webhookSegredo";
type Erros = Partial<Record<Campo | "geral", string>>;

// Formatos fechados: esses valores vão para dentro de scripts no navegador.
const FORMATOS: Partial<Record<Campo, [RegExp, string]>> = {
  metaPixelId: [/^\d{10,20}$/, "O ID do Pixel tem só números (15 ou 16 dígitos)."],
  googleAdsId: [/^AW-\d{6,15}$/, "Formato AW-123456789."],
  googleAdsRotuloLead: [/^[\w-]{4,60}$/, "Cole só o rótulo, sem o AW- (ex.: AbCdEfGh123)."],
  googleAdsRotuloWhatsapp: [/^[\w-]{4,60}$/, "Cole só o rótulo, sem o AW- (ex.: AbCdEfGh123)."],
  ga4Id: [/^G-[A-Z0-9]{4,15}$/, "Formato G-XXXXXXXXXX."],
  gtmId: [/^GTM-[A-Z0-9]{4,12}$/, "Formato GTM-XXXXXXX."],
};

function urlWebhookValida(valor: string) {
  try {
    const u = new URL(valor);
    if (u.protocol !== "https:") return "Use um endereço https://.";
    if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[)/.test(u.hostname) || u.hostname.endsWith(".local")) return "Use o endereço público do CRM.";
    return null;
  } catch {
    return "Endereço inválido.";
  }
}

const exemplo = (nomeLoja: string, origem: string): PayloadLead => ({
  evento: "teste",
  id: crypto.randomUUID(),
  criado_em: new Date().toISOString(),
  origem: "teste",
  lead: { nome: "Lead de Teste", email: "teste@exemplo.com", telefone: "31999990000", mensagem: "Mensagem de teste enviada pelo painel." },
  veiculo: { id: "exemplo", titulo: "Toyota Corolla XEi 2.0 Flex CVT 2023", marca: "Toyota", modelo: "Corolla", versao: "XEi 2.0 Flex CVT", ano_modelo: 2023, preco: 139900, url: `${origem}/carros` },
  rastreio: { utm_source: "google", utm_medium: "cpc", utm_campaign: "teste", pagina_entrada: "/" },
  loja: { nome: nomeLoja },
});

export async function action({ request }: Route.ActionArgs) {
  exigirMesmaOrigem(request);
  const usuario = await exigirUsuario(request);
  const form = await request.formData();
  const atual = await obterIntegracoes();

  if (form.get("intencao") === "testar") {
    if (!atual.webhookUrl) return data({ teste: { ok: false, texto: "Salve a URL do webhook antes de testar." } }, { status: 400 });
    if (!(await dentroDoLimite(`webhook-teste:${usuario.id}`, 10, 600_000))) {
      return data({ teste: { ok: false, texto: "Muitos testes seguidos. Aguarde alguns minutos." } }, { status: 429 });
    }
    const r = await entregarWebhook(atual.webhookUrl, atual.webhookSegredo, exemplo((await obterLoja()).nome, new URL(request.url).origin));
    const ok = r.status >= 200 && r.status < 300;
    return { teste: { ok, texto: ok ? `Entregue: o CRM respondeu ${r.status}.` : r.status ? `O CRM respondeu ${r.status}. ${r.resposta}` : `Não conectou: ${r.resposta}` } };
  }

  const t = (k: Campo) => String(form.get(k) ?? "").trim();
  const v = {
    metaPixelId: t("metaPixelId"), googleAdsId: t("googleAdsId").toUpperCase(), googleAdsRotuloLead: t("googleAdsRotuloLead"),
    googleAdsRotuloWhatsapp: t("googleAdsRotuloWhatsapp"), ga4Id: t("ga4Id").toUpperCase(), gtmId: t("gtmId").toUpperCase(),
    webhookUrl: t("webhookUrl"),
  };
  const erros: Erros = {};
  for (const [campo, [regex, msg]] of Object.entries(FORMATOS) as [Campo, [RegExp, string]][]) {
    const valor = v[campo as keyof typeof v];
    if (valor && !regex.test(valor)) erros[campo] = msg;
  }
  if ((v.googleAdsRotuloLead || v.googleAdsRotuloWhatsapp) && !v.googleAdsId) erros.googleAdsId = "Informe o ID da conta (AW-…) para usar os rótulos.";
  if (v.webhookUrl) {
    const problema = urlWebhookValida(v.webhookUrl);
    if (problema) erros.webhookUrl = problema;
  }
  // Segredo: vazio mantém o atual; "apagar" remove; outro valor substitui.
  let segredo = atual.webhookSegredo;
  if (form.get("apagarSegredo") === "1") segredo = "";
  else if (t("webhookSegredo")) segredo = t("webhookSegredo");
  if (segredo.length > 200) erros.webhookSegredo = "Até 200 caracteres.";
  if (Object.keys(erros).length) return data({ erros, ok: false }, { status: 400 });

  const valores = { ...v, webhookSegredo: segredo, exigirConsentimento: form.get("exigirConsentimento") === "on", atualizadoEm: Date.now() };
  await db.insert(schema.integracoes).values({ id: 1, ...valores }).onConflictDoUpdate({ target: schema.integracoes.id, set: valores });
  return { erros: {} as Erros, ok: true };
}

type Resposta = { erros?: Erros; ok?: boolean; teste?: { ok: boolean; texto: string } };

export default function Integracoes({ loaderData: i, actionData }: Route.ComponentProps) {
  const resposta = actionData as Resposta | undefined;
  const erros = resposta?.erros ?? {};
  const enviando = useNavigation().state === "submitting";
  const teste = useFetcher<Resposta>();
  const [segredo, setSegredo] = useState("");
  const [apagarSegredo, setApagarSegredo] = useState(false);

  const secao = "cartao p-5 sm:p-6";
  const ultimoOk = i.webhookUltimoStatus !== null && i.webhookUltimoStatus >= 200 && i.webhookUltimoStatus < 300;

  return (
    <div className="grid gap-4 pb-24">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-tinta">Integrações</h1>
        <p className="text-suave">Tags de anúncio e envio automático dos contatos para o seu CRM.</p>
      </div>

      {resposta?.ok && <p role="status" className="rounded-xl border border-sucesso/20 bg-sucesso-fundo px-4 py-3 font-semibold text-sucesso">Integrações salvas.</p>}
      {Object.keys(erros).length > 0 && <p role="alert" className="rounded-xl border border-erro/20 bg-erro-fundo px-4 py-3 text-sm text-erro">Revise os campos marcados.</p>}

      <Form method="post" noValidate id="form-integracoes" className="grid gap-4">
        <section aria-labelledby="sec-meta" className={secao}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="sec-meta" className="text-lg font-bold text-tinta">Meta Ads (Facebook e Instagram)</h2>
            <Estado ativo={Boolean(i.metaPixelId)} />
          </div>
          <p className="mt-1 text-sm text-suave">Gerenciador de Eventos → Fontes de dados → seu Pixel → copie o ID.</p>
          <div className="mt-4 max-w-sm">
            <CampoTexto id="metaPixelId" rotulo="ID do Pixel" inputMode="numeric" placeholder="123456789012345" defaultValue={i.metaPixelId} erro={erros.metaPixelId} />
          </div>
          <Eventos itens={[["PageView", "toda página"], ["ViewContent", "página de um carro"], ["Contact", "clique no WhatsApp ou telefone"], ["Lead", "formulário enviado"]]} />
        </section>

        <section aria-labelledby="sec-google" className={secao}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="sec-google" className="text-lg font-bold text-tinta">Google Ads</h2>
            <Estado ativo={Boolean(i.googleAdsId)} />
          </div>
          <p className="mt-1 text-sm text-suave">
            Google Ads → Metas → Conversões → crie uma ação do tipo “Site” → “Instalar a tag manualmente”. O ID é o AW-…; o rótulo é o texto depois da barra em <code className="rounded bg-fundo px-1">send_to</code>.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <CampoTexto id="googleAdsId" rotulo="ID da tag (AW-…)" placeholder="AW-123456789" defaultValue={i.googleAdsId} erro={erros.googleAdsId} />
            <CampoTexto id="googleAdsRotuloLead" rotulo="Rótulo: formulário enviado" placeholder="AbCdEfGh123" defaultValue={i.googleAdsRotuloLead} erro={erros.googleAdsRotuloLead} />
            <CampoTexto id="googleAdsRotuloWhatsapp" rotulo="Rótulo: clique no WhatsApp" placeholder="XyZ987654" defaultValue={i.googleAdsRotuloWhatsapp} erro={erros.googleAdsRotuloWhatsapp} dica="Opcional." />
          </div>
        </section>

        <section aria-labelledby="sec-outros" className={secao}>
          <h2 id="sec-outros" className="text-lg font-bold text-tinta">Google Analytics e Tag Manager</h2>
          <p className="mt-1 text-sm text-suave">Opcionais. Com o Tag Manager, os eventos também vão para o dataLayer: <code className="rounded bg-fundo px-1">pagina</code>, <code className="rounded bg-fundo px-1">veiculo</code>, <code className="rounded bg-fundo px-1">whatsapp</code>, <code className="rounded bg-fundo px-1">telefone</code> e <code className="rounded bg-fundo px-1">lead</code>.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <CampoTexto id="ga4Id" rotulo="Google Analytics 4 (G-…)" placeholder="G-XXXXXXXXXX" defaultValue={i.ga4Id} erro={erros.ga4Id} />
            <CampoTexto id="gtmId" rotulo="Google Tag Manager (GTM-…)" placeholder="GTM-XXXXXXX" defaultValue={i.gtmId} erro={erros.gtmId} />
          </div>
          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-lg border border-linha p-4">
            <input type="checkbox" name="exigirConsentimento" defaultChecked={i.exigirConsentimento} className="mt-0.5 size-4 accent-marca-600" />
            <span>
              <span className="block font-semibold text-tinta">Pedir consentimento de cookies antes de carregar as tags</span>
              <span className="block text-sm text-suave">Recomendado pela LGPD. O visitante vê um aviso com “Aceitar” e “Recusar”; as tags só carregam se aceitar.</span>
            </span>
          </label>
        </section>

        <section aria-labelledby="sec-webhook" className={secao}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="sec-webhook" className="text-lg font-bold text-tinta">Webhook do CRM</h2>
            <Estado ativo={Boolean(i.webhookUrl)} />
          </div>
          <p className="mt-1 text-sm text-suave">A cada mensagem recebida pelo site, enviamos um POST em JSON para este endereço — funciona com RD Station, Pipedrive, HubSpot, Make, Zapier, n8n ou o CRM que aceitar webhook.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_280px]">
            <CampoTexto id="webhookUrl" rotulo="URL do webhook" type="url" placeholder="https://seu-crm.com/webhooks/leads" defaultValue={i.webhookUrl} erro={erros.webhookUrl} />
            <div>
              <label htmlFor="webhookSegredo" className="rotulo">Segredo de assinatura</label>
              <div className="flex gap-2">
                <input id="webhookSegredo" name="webhookSegredo" value={segredo} onChange={(e) => setSegredo(e.target.value)} autoComplete="off" spellCheck={false}
                  placeholder={i.temSegredo && !apagarSegredo ? "•••••••• (mantido)" : "Opcional"} className="campo numeros text-sm" />
                <button type="button" className="botao-secundario h-11 shrink-0 px-3" title="Gerar segredo aleatório" aria-label="Gerar segredo aleatório"
                  onClick={() => { setApagarSegredo(false); setSegredo([...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, "0")).join("")); }}>
                  <KeyRound className="size-4" aria-hidden="true" />
                </button>
              </div>
              {erros.webhookSegredo ? <p className="mt-1.5 text-sm text-erro">{erros.webhookSegredo}</p>
                : <p className="mt-1.5 text-xs text-suave">{segredo ? "Copie agora: depois de salvar ele não aparece de novo." : "Enviado como X-Assinatura: sha256=HMAC do corpo."}</p>}
              {i.temSegredo && !segredo && (
                <label className="mt-2 flex items-center gap-2 text-sm text-texto">
                  <input type="checkbox" checked={apagarSegredo} onChange={(e) => setApagarSegredo(e.target.checked)} className="size-4 accent-marca-600" /> Remover segredo
                </label>
              )}
              <input type="hidden" name="apagarSegredo" value={apagarSegredo ? "1" : ""} />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-lg bg-fundo px-4 py-3 text-sm">
            <span className="font-semibold text-tinta">Última entrega:</span>
            {i.webhookUltimoEm ? (
              <span className={ultimoOk ? "inline-flex items-center gap-1.5 text-sucesso" : "inline-flex items-center gap-1.5 text-erro"}>
                {ultimoOk ? <CircleCheck className="size-4" aria-hidden="true" /> : <CircleX className="size-4" aria-hidden="true" />}
                {i.webhookUltimoStatus ? `HTTP ${i.webhookUltimoStatus}` : "falhou"} · {tempoRelativo(i.webhookUltimoEm)}
              </span>
            ) : <span className="text-suave">nenhuma ainda</span>}
            {teste.data?.teste && (
              <span role="status" className={teste.data.teste.ok ? "text-sucesso" : "text-erro"}>{teste.data.teste.texto}</span>
            )}
          </div>

          <details className="mt-4 rounded-lg border border-linha">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-tinta">Ver exemplo do JSON enviado</summary>
            <pre className="overflow-x-auto border-t border-linha bg-noite p-4 text-xs leading-relaxed text-white/85">{JSON.stringify({ ...exemplo("Sua loja", "https://seusite.com.br"), evento: "lead.novo", origem: "pagina_do_veiculo", id: "8f0c…" }, null, 2)}</pre>
          </details>
        </section>
      </Form>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-linha bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-end gap-3 px-4 py-3 sm:px-6">
          <teste.Form method="post">
            <input type="hidden" name="intencao" value="testar" />
            <button type="submit" disabled={!i.webhookUrl || teste.state !== "idle"} className="botao-secundario"
              title={i.webhookUrl ? undefined : "Salve a URL do webhook primeiro"}>
              <Send className="size-4" aria-hidden="true" /> {teste.state !== "idle" ? "Enviando teste…" : "Testar webhook"}
            </button>
          </teste.Form>
          <button type="submit" form="form-integracoes" disabled={enviando} className="botao-primario min-w-44">{enviando ? "Salvando…" : "Salvar integrações"}</button>
        </div>
      </div>
    </div>
  );
}

function Estado({ ativo }: { ativo: boolean }) {
  return ativo
    ? <span className="rounded-full bg-sucesso-fundo px-2.5 py-1 text-xs font-bold text-sucesso">Ativo</span>
    : <span className="rounded-full bg-fundo px-2.5 py-1 text-xs font-bold text-suave">Não configurado</span>;
}

function Eventos({ itens }: { itens: [string, string][] }) {
  return (
    <div className="mt-4">
      <p className="text-sm font-medium text-tinta">Eventos enviados automaticamente</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {itens.map(([evento, quando]) => (
          <li key={evento} className="rounded-lg bg-fundo px-2.5 py-1.5 text-xs text-texto">
            <code className="font-semibold text-tinta">{evento}</code> · {quando}
          </li>
        ))}
      </ul>
    </div>
  );
}
