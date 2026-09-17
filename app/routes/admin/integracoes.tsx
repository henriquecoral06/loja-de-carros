import { Check, Copy, KeyRound, Send } from "lucide-react";
import { useState } from "react";
import { data, Form, useFetcher, useNavigation } from "react-router";
import { enviarEmail } from "~/.server/email";
import { ultimosEnvios } from "~/.server/envios";
import { obterIntegracoes, salvarIntegracoes } from "~/.server/integracoes";
import { lojaCompleta } from "~/.server/loja";
import { enviarEventoMeta } from "~/.server/meta";
import { exigirUsuario } from "~/.server/sessao";
import { dentroDoLimite, exigirMesmaOrigem } from "~/.server/seguranca";
import { novoToken, sha256Hex } from "~/.server/token";
import { entregarWebhook, type PayloadLead } from "~/.server/webhook";
import { Aviso, BarraSalvar, Cabecalho, classeTabela as t, Secao } from "~/components/admin/ui";
import { CampoTexto } from "~/components/Campo";
import {
  DESCRICAO_CONVERSAO, EVENTOS_META, lerConversoes, TIPOS_CONVERSAO, validarEventoPersonalizado, validarRotuloGoogle, type Conversoes,
} from "~/lib/conversoes";
import { dataHora } from "~/lib/formato";
import { metaAdmin } from "~/lib/site";
import { cn } from "~/lib/ui";
import type { Route } from "./+types/integracoes";

export function meta({ matches }: Route.MetaArgs) {
  return metaAdmin("Integrações", matches);
}

export async function loader({ request }: Route.LoaderArgs) {
  await exigirUsuario(request);
  const [i, envios] = await Promise.all([obterIntegracoes(), ultimosEnvios(12)]);
  // Segredos não voltam para a tela: só se existem.
  return {
    webhookUrl: i.webhookUrl, temSegredo: Boolean(i.webhookSegredo),
    api: { ativo: Boolean(i.apiTokenHash), final: i.apiTokenFinal, criadoEm: i.apiTokenCriadoEm },
    metaPixelId: i.metaPixelId, metaCodigoTeste: i.metaCodigoTeste, temTokenCapi: Boolean(i.metaTokenCapi),
    googleAdsId: i.googleAdsId, ga4Id: i.ga4Id, gtmId: i.gtmId, exigirConsentimento: i.exigirConsentimento,
    conversoes: lerConversoes(i.conversoes),
    temResend: Boolean(i.resendApiKey), resendRemetente: i.resendRemetente, resendDestinatarios: i.resendDestinatarios,
    envios, origem: new URL(request.url).origin,
  };
}

type Erros = Record<string, string>;

const FORMATOS: Record<string, [RegExp, string]> = {
  metaPixelId: [/^\d{10,20}$/, "O ID do Pixel tem só números."],
  metaCodigoTeste: [/^TEST\w{2,20}$/i, "Formato TEST12345."],
  googleAdsId: [/^AW-\d{6,15}$/, "Formato AW-123456789."],
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

// Data fixa no exemplo exibido: servidor e navegador precisam renderizar o mesmo texto.
const exemplo = (nomeLoja: string, origem: string, evento: PayloadLead["evento"] = "teste", criadoEm = "2026-09-17T12:00:00.000Z"): PayloadLead => ({
  evento, id: "8f0c2d1e-…", criado_em: criadoEm, origem: "veiculo", status: "novo",
  lead: { nome: "Lead de Teste", email: "teste@exemplo.com", telefone: "5548999990000", mensagem: "Olá, o carro ainda está disponível?" },
  veiculo: { id: "…", codigo: "0001", titulo: "Toyota Corolla XEi 2.0 Flex CVT 2023", marca: "Toyota", modelo: "Corolla", versao: "XEi 2.0 Flex CVT", ano_modelo: 2023, preco: 139900, url: `${origem}/carros` },
  vendedor: { nome: "Carlos", whatsapp: "5548999990001", email: "carlos@loja.com.br" },
  landing_page: null,
  rastreio: { utm_source: "google", utm_medium: "cpc", utm_campaign: "corolla-2023", pagina_entrada: "/carros" },
  loja: { nome: nomeLoja },
});

export async function action({ request }: Route.ActionArgs) {
  exigirMesmaOrigem(request);
  const usuario = await exigirUsuario(request);
  const form = await request.formData();
  const intencao = String(form.get("intencao") ?? "salvar");
  const atual = await obterIntegracoes();
  const origem = new URL(request.url).origin;

  if (intencao === "gerar-token") {
    const token = novoToken("lds");
    await salvarIntegracoes({ apiTokenHash: await sha256Hex(token), apiTokenFinal: token.slice(-4), apiTokenCriadoEm: Date.now() });
    return { token };
  }
  if (intencao === "revogar-token") {
    await salvarIntegracoes({ apiTokenHash: "", apiTokenFinal: "", apiTokenCriadoEm: null });
    return { ok: true };
  }

  if (intencao.startsWith("testar-")) {
    if (!(await dentroDoLimite(`teste-integracao:${usuario.id}`, 15, 600_000))) return data({ teste: { ok: false, texto: "Muitos testes seguidos. Aguarde alguns minutos." } }, { status: 429 });
    const loja = await lojaCompleta();
    let r: { ok: boolean; status: number; texto: string };
    if (intencao === "testar-webhook") {
      if (!atual.webhookUrl) return { teste: { ok: false, texto: "Salve a URL do webhook antes de testar." } };
      r = await entregarWebhook(atual.webhookUrl, atual.webhookSegredo, exemplo(loja.nome, origem, "teste", new Date().toISOString()));
    } else if (intencao === "testar-email") {
      r = await enviarEmail(atual, `Teste de e-mail — ${loja.nome}`, [["Status", "Se você recebeu este e-mail, os avisos de novos leads estão funcionando."]]);
    } else {
      if (!atual.metaCodigoTeste) return { teste: { ok: false, texto: "Preencha e salve o código de evento de teste: sem ele o evento entraria nos seus relatórios." } };
      r = await enviarEventoMeta(atual, request, { nome: "Lead", eventId: crypto.randomUUID(), url: origem, email: "teste@exemplo.com", nomePessoa: "Lead Teste" });
    }
    return { teste: { ok: r.ok, texto: r.ok ? `Enviado (HTTP ${r.status}).` : r.status ? `Falhou: HTTP ${r.status}. ${r.texto}` : r.texto } };
  }

  // ---- salvar ----
  const txt = (k: string) => String(form.get(k) ?? "").trim();
  const erros: Erros = {};
  const v = {
    webhookUrl: txt("webhookUrl"), metaPixelId: txt("metaPixelId"), metaCodigoTeste: txt("metaCodigoTeste").toUpperCase(),
    googleAdsId: txt("googleAdsId").toUpperCase(), ga4Id: txt("ga4Id").toUpperCase(), gtmId: txt("gtmId").toUpperCase(),
    resendRemetente: txt("resendRemetente"), resendDestinatarios: txt("resendDestinatarios"),
    exigirConsentimento: form.get("exigirConsentimento") === "on",
  };
  for (const [campo, [regex, msg]] of Object.entries(FORMATOS)) {
    const valor = v[campo as keyof typeof v] as string;
    if (valor && !regex.test(valor)) erros[campo] = msg;
  }
  if (v.webhookUrl) { const p = urlWebhookValida(v.webhookUrl); if (p) erros.webhookUrl = p; }
  if (v.resendRemetente && !/^([^<>]{1,80}<)?[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+>?$/.test(v.resendRemetente)) erros.resendRemetente = "Ex.: Loja <leads@seudominio.com.br>";
  const destinos = v.resendDestinatarios.split(",").map((e) => e.trim()).filter(Boolean);
  if (destinos.some((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) || destinos.length > 10) erros.resendDestinatarios = "E-mails separados por vírgula (até 10).";

  const conversoes = {} as Conversoes;
  for (const tipo of TIPOS_CONVERSAO) {
    const eventoMeta = txt(`${tipo}.eventoMeta`);
    const personalizado = txt(`${tipo}.eventoPersonalizado`);
    const rotulo = txt(`${tipo}.rotuloGoogle`);
    if (personalizado && !validarEventoPersonalizado(personalizado)) erros[`${tipo}.eventoPersonalizado`] = "Letras, números e _ (sem espaço).";
    if (eventoMeta === "personalizado" && !personalizado) erros[`${tipo}.eventoPersonalizado`] = "Informe o nome do evento.";
    if (rotulo && !validarRotuloGoogle(rotulo)) erros[`${tipo}.rotuloGoogle`] = "Só o rótulo, sem o AW- nem a barra.";
    conversoes[tipo] = {
      rastrear: form.get(`${tipo}.rastrear`) === "on",
      eventoMeta: EVENTOS_META.some((e) => e.valor === eventoMeta) ? eventoMeta : "Lead",
      eventoPersonalizado: personalizado, rotuloGoogle: rotulo,
    };
  }
  if (Object.keys(erros).length) return data({ erros }, { status: 400 });

  // Segredo: campo vazio mantém o atual; "remover" apaga; outro valor substitui.
  const segredo = (campo: "webhookSegredo" | "metaTokenCapi" | "resendApiKey") =>
    form.get(`remover_${campo}`) === "on" ? "" : txt(campo) || atual[campo];

  await salvarIntegracoes({
    ...v, conversoes: JSON.stringify(conversoes),
    webhookSegredo: segredo("webhookSegredo"), metaTokenCapi: segredo("metaTokenCapi"), resendApiKey: segredo("resendApiKey"),
  });
  return { ok: true };
}

type Resposta = { ok?: boolean; erros?: Erros; token?: string; teste?: { ok: boolean; texto: string } };

export default function Integracoes({ loaderData: d, actionData }: Route.ComponentProps) {
  const resposta = actionData as Resposta | undefined;
  const erros = resposta?.erros ?? {};
  const enviando = useNavigation().state === "submitting";

  const estados = [
    { nome: "Webhook (CRM)", ativo: Boolean(d.webhookUrl) },
    { nome: "API de leads", ativo: d.api.ativo },
    { nome: "Meta Pixel", ativo: Boolean(d.metaPixelId), extra: d.temTokenCapi ? "com API de Conversões" : undefined },
    { nome: "Google Ads", ativo: Boolean(d.googleAdsId) },
    { nome: "E-mail (Resend)", ativo: d.temResend && Boolean(d.resendDestinatarios) },
  ];

  return (
    <div>
      <Cabecalho titulo="Integrações" descricao="Conecte o site ao seu CRM, e-mail e plataformas de anúncios." />
      {resposta?.ok && <Aviso tipo="sucesso">Integrações salvas.</Aviso>}
      {Object.keys(erros).length > 0 && <Aviso tipo="erro">Revise os campos marcados.</Aviso>}

      <ul className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {estados.map((e) => (
          <li key={e.nome} className="flex items-center gap-3 rounded-xl border border-linha bg-white px-4 py-3">
            <span className={cn("size-2.5 shrink-0 rounded-full", e.ativo ? "bg-sucesso" : "bg-linha-forte")} aria-hidden="true" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-tinta">{e.nome}</span>
              <span className={cn("block text-xs", e.ativo ? "text-sucesso" : "text-suave")}>{e.ativo ? e.extra ? `Ativo · ${e.extra}` : "Ativo" : "Não configurado"}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Form method="post" noValidate id="form-integracoes" className="grid min-w-0 gap-5">
          <Secao titulo="Webhook de leads (CRM)" descricao="A cada lead recebido, o site envia um POST JSON para a URL abaixo. Cole aqui a URL de webhook do seu CRM, Make, n8n ou Zapier.">
            <div className="grid gap-4">
              <CampoTexto id="webhookUrl" rotulo="URL do webhook" type="url" placeholder="https://hook.seu-crm.com/…" defaultValue={d.webhookUrl} erro={erros.webhookUrl} />
              <CampoSecreto id="webhookSegredo" rotulo="Segredo (opcional)" configurado={d.temSegredo}
                dica="Enviado nos cabeçalhos X-Webhook-Secret e X-Webhook-Signature (HMAC-SHA256 do corpo)." gerar />
              <details className="rounded-lg bg-fundo">
                <summary className="cursor-pointer px-4 py-2.5 text-sm font-semibold text-tinta">Exemplo de payload</summary>
                <pre className="overflow-x-auto px-4 pb-4 text-xs leading-relaxed text-texto">{JSON.stringify(exemplo("Sua loja", d.origem, "lead.novo"), null, 2)}</pre>
              </details>
            </div>
          </Secao>

          <Secao titulo="Meta (Facebook/Instagram)" descricao="O pixel é instalado em todas as páginas do site. Com o token da API de Conversões, o evento de formulário também é enviado pelo servidor, com deduplicação por event_id.">
            <div className="grid gap-4 md:grid-cols-2">
              <CampoTexto id="metaPixelId" rotulo="ID do Pixel" inputMode="numeric" placeholder="123456789012345" defaultValue={d.metaPixelId} erro={erros.metaPixelId} />
              <CampoTexto id="metaCodigoTeste" rotulo="Código de evento de teste (opcional)" placeholder="TEST12345" defaultValue={d.metaCodigoTeste} erro={erros.metaCodigoTeste}
                dica="Do Gerenciador de Eventos → Testar eventos. Remova em produção." />
              <div className="md:col-span-2">
                <CampoSecreto id="metaTokenCapi" rotulo="Token da API de Conversões" configurado={d.temTokenCapi} dica="Gerado em Gerenciador de Eventos → Configurações → API de Conversões." />
              </div>
            </div>
          </Secao>

          <Secao titulo="Google" descricao="Informe o ID da tag do Google Ads (formato AW-XXXXXXXXX). Os rótulos de conversão são definidos por tipo de conversão, abaixo.">
            <div className="grid gap-4 md:grid-cols-3">
              <CampoTexto id="googleAdsId" rotulo="ID de conversão (tag do Google)" placeholder="AW-123456789" defaultValue={d.googleAdsId} erro={erros.googleAdsId} />
              <CampoTexto id="ga4Id" rotulo="Google Analytics 4 (opcional)" placeholder="G-XXXXXXXXXX" defaultValue={d.ga4Id} erro={erros.ga4Id} />
              <CampoTexto id="gtmId" rotulo="Tag Manager (opcional)" placeholder="GTM-XXXXXXX" defaultValue={d.gtmId} erro={erros.gtmId} />
            </div>
          </Secao>

          <Secao titulo="Conversões" descricao="Escolha o que rastrear e qual evento disparar em cada plataforma.">
            <div className="grid gap-3">
              {TIPOS_CONVERSAO.map((tipo) => <Conversao key={tipo} tipo={tipo} c={d.conversoes[tipo]} erros={erros} />)}
            </div>
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-linha p-4">
              <input type="checkbox" name="exigirConsentimento" defaultChecked={d.exigirConsentimento} className="mt-0.5 size-4 accent-marca-600" />
              <span>
                <span className="block text-sm font-semibold text-tinta">Pedir consentimento de cookies antes de carregar as tags</span>
                <span className="block text-sm text-suave">Recomendado pela LGPD: o Pixel e as tags do Google só carregam depois do “Aceitar”. A API de Conversões (servidor) não depende do aviso.</span>
              </span>
            </label>
          </Secao>

          <Secao titulo="E-mail de novos leads (Resend)" descricao="Receba um e-mail a cada lead do formulário. Crie uma chave em resend.com e verifique seu domínio para usar um remetente próprio.">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2"><CampoSecreto id="resendApiKey" rotulo="API key do Resend" configurado={d.temResend} /></div>
              <CampoTexto id="resendRemetente" rotulo="Remetente" placeholder="Minha Loja <leads@seudominio.com.br>" defaultValue={d.resendRemetente} erro={erros.resendRemetente}
                dica="Sem domínio verificado, use onboarding@resend.dev (só entrega para o e-mail da conta Resend)." />
              <CampoTexto id="resendDestinatarios" rotulo="Destinatários" placeholder="vendas@minhaloja.com.br" defaultValue={d.resendDestinatarios} erro={erros.resendDestinatarios}
                dica="Separe vários e-mails por vírgula." />
            </div>
          </Secao>
        </Form>

        <aside className="grid gap-5">
          <ApiLeads api={d.api} origem={d.origem} />
          <Testes />
          <Secao titulo="Últimos envios">
            {d.envios.length === 0 ? (
              <p className="py-2 text-center text-sm text-suave">Nenhum envio ainda.</p>
            ) : (
              <table className="w-full text-sm">
                <thead><tr>{["Canal", "Status", "Quando"].map((h) => <th key={h} className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-suave">{h}</th>)}</tr></thead>
                <tbody>
                  {d.envios.map((e) => (
                    <tr key={e.id} className="border-t border-linha" title={e.detalhe}>
                      <td className="py-2 pr-2 capitalize text-texto">{e.canal === "meta" ? "Meta CAPI" : e.canal === "email" ? "E-mail" : "Webhook"}</td>
                      <td className={cn("numeros py-2 pr-2 font-semibold", e.sucesso ? "text-sucesso" : "text-erro")}>{e.status || "falha"}</td>
                      <td className="numeros py-2 text-xs text-suave">{dataHora(e.criadoEm)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Secao>
        </aside>
      </div>

      <BarraSalvar>
        <button type="submit" form="form-integracoes" disabled={enviando} className="botao-primario h-10 min-w-44 px-5 text-sm">{enviando ? "Salvando…" : "Salvar integrações"}</button>
      </BarraSalvar>
    </div>
  );
}

function CampoSecreto({ id, rotulo, configurado, dica, gerar }: { id: string; rotulo: string; configurado: boolean; dica?: string; gerar?: boolean }) {
  const [valor, setValor] = useState("");
  return (
    <div>
      <label htmlFor={id} className="rotulo">{rotulo}</label>
      <div className="flex gap-2">
        <input id={id} name={id} value={valor} onChange={(e) => setValor(e.target.value)} autoComplete="off" spellCheck={false}
          placeholder={configurado ? "Configurado •••••• (deixe vazio para manter)" : "Não configurado"} className="campo numeros text-sm" />
        {gerar && (
          <button type="button" className="botao-secundario h-11 shrink-0 px-3" title="Gerar segredo aleatório" aria-label="Gerar segredo aleatório"
            onClick={() => setValor([...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, "0")).join(""))}>
            <KeyRound className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-suave">{valor && gerar ? "Copie agora: depois de salvar ele não aparece de novo." : dica}</p>
        {configurado && (
          <label className="flex items-center gap-1.5 text-xs text-texto">
            <input type="checkbox" name={`remover_${id}`} className="size-3.5 accent-marca-600" /> Remover
          </label>
        )}
      </div>
    </div>
  );
}

function Conversao({ tipo, c, erros }: { tipo: (typeof TIPOS_CONVERSAO)[number]; c: Conversoes[keyof Conversoes]; erros: Erros }) {
  const [rastrear, setRastrear] = useState(c.rastrear);
  const [evento, setEvento] = useState(c.eventoMeta);
  const info = DESCRICAO_CONVERSAO[tipo];
  return (
    <div className={cn("rounded-xl border border-linha p-4", !rastrear && "bg-fundo/60")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-tinta">{info.titulo}</h3>
          <p className="text-xs text-suave">{info.texto}</p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-tinta">
          <input type="checkbox" name={`${tipo}.rastrear`} checked={rastrear} onChange={(e) => setRastrear(e.target.checked)} className="size-4 accent-marca-600" /> Rastrear
        </label>
      </div>
      <fieldset disabled={!rastrear} className="mt-3 grid gap-3 disabled:opacity-60 md:grid-cols-3">
        <div>
          <label htmlFor={`${tipo}-evento`} className="rotulo">Evento Meta</label>
          <select id={`${tipo}-evento`} name={`${tipo}.eventoMeta`} value={evento} onChange={(e) => setEvento(e.target.value)} className="campo text-sm">
            {EVENTOS_META.map((e) => <option key={e.valor} value={e.valor}>{e.rotulo}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`${tipo}-personalizado`} className="rotulo">Nome do evento personalizado</label>
          <input id={`${tipo}-personalizado`} name={`${tipo}.eventoPersonalizado`} defaultValue={c.eventoPersonalizado} placeholder="LeadWhatsApp"
            disabled={evento !== "personalizado"} className="campo text-sm" aria-invalid={erros[`${tipo}.eventoPersonalizado`] ? true : undefined} />
          <p className={cn("mt-1 text-xs", erros[`${tipo}.eventoPersonalizado`] ? "text-erro" : "text-suave")}>{erros[`${tipo}.eventoPersonalizado`] ?? "Usado só com “Evento personalizado”."}</p>
        </div>
        <div>
          <label htmlFor={`${tipo}-rotulo`} className="rotulo">Rótulo de conversão Google Ads</label>
          <input id={`${tipo}-rotulo`} name={`${tipo}.rotuloGoogle`} defaultValue={c.rotuloGoogle} placeholder="AbC-D_efGhIjKlMn" className="campo text-sm"
            aria-invalid={erros[`${tipo}.rotuloGoogle`] ? true : undefined} />
          <p className={cn("mt-1 text-xs", erros[`${tipo}.rotuloGoogle`] ? "text-erro" : "text-suave")}>{erros[`${tipo}.rotuloGoogle`] ?? "A parte após a barra em AW-XXXX/rótulo."}</p>
        </div>
      </fieldset>
      {/* Campo desabilitado não vai no POST: mantém o valor salvo quando a conversão está desligada. */}
      {!rastrear && (
        <>
          <input type="hidden" name={`${tipo}.eventoMeta`} value={evento} />
          <input type="hidden" name={`${tipo}.eventoPersonalizado`} value={c.eventoPersonalizado} />
          <input type="hidden" name={`${tipo}.rotuloGoogle`} value={c.rotuloGoogle} />
        </>
      )}
      {rastrear && evento !== "personalizado" && <input type="hidden" name={`${tipo}.eventoPersonalizado`} value={c.eventoPersonalizado} />}
    </div>
  );
}

function ApiLeads({ api, origem }: { api: { ativo: boolean; final: string; criadoEm: number | null }; origem: string }) {
  const fetcher = useFetcher<Resposta>();
  const [copiado, setCopiado] = useState(false);
  const token = fetcher.data?.token;
  const endpoint = `${origem}/api/leads`;

  return (
    <Secao titulo="API de leads" descricao={<>URL para CRMs e automações lerem os leads (JSON). Aceita <code className="text-xs">?since=ISO</code>, <code className="text-xs">?status=</code> e <code className="text-xs">?limit=</code>.</>}>
      <p className="numeros break-all rounded-lg bg-fundo px-3 py-2 text-xs text-texto">GET {endpoint}<br />Authorization: Bearer &lt;token&gt;</p>
      {token ? (
        <div className="mt-3 rounded-lg border border-sucesso/30 bg-sucesso-fundo p-3">
          <p className="text-xs font-semibold text-sucesso">Copie o token agora — ele não aparece de novo.</p>
          <div className="mt-2 flex gap-2">
            <input readOnly value={token} onFocus={(e) => e.currentTarget.select()} aria-label="Token da API" className="campo numeros h-9 text-xs" />
            <button type="button" className="botao-secundario h-9 shrink-0 px-2.5" aria-label="Copiar token"
              onClick={() => { navigator.clipboard.writeText(token); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }}>
              {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-suave">{api.ativo ? `Token ativo terminado em …${api.final}${api.criadoEm ? `, criado em ${dataHora(api.criadoEm)}` : ""}.` : "Nenhum token ativo."}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <fetcher.Form method="post" onSubmit={(e) => { if (api.ativo && !confirm("Gerar um novo token? O atual para de funcionar.")) e.preventDefault(); }}>
          <button name="intencao" value="gerar-token" className="botao-secundario h-9 px-3 text-sm"><KeyRound className="size-4" aria-hidden="true" /> {api.ativo ? "Gerar novo token" : "Gerar token"}</button>
        </fetcher.Form>
        {api.ativo && (
          <fetcher.Form method="post" onSubmit={(e) => { if (!confirm("Revogar o token? Integrações que usam a API param de funcionar.")) e.preventDefault(); }}>
            <button name="intencao" value="revogar-token" className="botao-fantasma h-9 px-3 text-sm text-erro">Revogar</button>
          </fetcher.Form>
        )}
      </div>
    </Secao>
  );
}

function Testes() {
  const fetcher = useFetcher<Resposta>();
  const emTeste = fetcher.formData?.get("intencao");
  const botoes = [["testar-webhook", "Testar webhook"], ["testar-email", "Testar e-mail"], ["testar-meta", "Testar API de Conversões"]] as const;
  return (
    <Secao titulo="Testar envios" descricao="Usa as credenciais já salvas.">
      <fetcher.Form method="post" className="flex flex-wrap gap-2">
        {botoes.map(([valor, rotulo]) => (
          <button key={valor} name="intencao" value={valor} disabled={fetcher.state !== "idle"} className="botao-secundario h-9 px-3 text-sm">
            <Send className="size-4" aria-hidden="true" /> {emTeste === valor ? "Enviando…" : rotulo}
          </button>
        ))}
      </fetcher.Form>
      {fetcher.data?.teste && (
        <p role="status" className={cn("mt-3 rounded-lg px-3 py-2 text-sm", fetcher.data.teste.ok ? "bg-sucesso-fundo text-sucesso" : "bg-erro-fundo text-erro")}>{fetcher.data.teste.texto}</p>
      )}
    </Secao>
  );
}

export { ErroPainel as ErrorBoundary } from "~/components/admin/ErroPainel";
