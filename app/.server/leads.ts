import { waitUntil } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { eventoMetaDe, lerConversoes } from "~/lib/conversoes";
import { apenasDigitos, internacional, moeda, telefone } from "~/lib/formato";
import { codigoVeiculo, ROTULO_ORIGEM, type OrigemLead } from "~/lib/veiculos";
import { db, schema } from "./db";
import { enviarEmail } from "./email";
import { obterIntegracoes } from "./integracoes";
import { lojaCompleta } from "./loja";
import { enviarEventoMeta } from "./meta";
import { entregarWebhook, type PayloadLead } from "./webhook";

export type ErrosLead = Partial<Record<"nome" | "email" | "telefone" | "texto", string>>;

const CAMPOS_RASTREIO = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid", "gbraid", "wbraid", "pagina_entrada", "referencia"];

/** Só chaves conhecidas e texto curto: o campo vem do navegador. */
function lerRastreio(valor: FormDataEntryValue | null): Record<string, string> {
  try {
    const bruto = JSON.parse(typeof valor === "string" && valor.length < 4000 ? valor : "{}") as Record<string, unknown>;
    return Object.fromEntries(CAMPOS_RASTREIO.filter((k) => typeof bruto[k] === "string" && bruto[k]).map((k) => [k, String(bruto[k]).slice(0, 200)]));
  } catch {
    return {};
  }
}

/** Validação única dos formulários do site. E-mail é opcional; telefone, não. */
export function validarLead(form: FormData, { textoObrigatorio = true } = {}) {
  const nome = String(form.get("nome") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const tel = apenasDigitos(String(form.get("telefone") ?? ""));
  const texto = String(form.get("texto") ?? "").trim();

  const erros: ErrosLead = {};
  if (nome.length < 2) erros.nome = "Informe seu nome.";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) erros.email = "Confira o e-mail.";
  if (tel.length < 10 || tel.length > 13) erros.telefone = "Informe o telefone com DDD.";
  if (textoObrigatorio && texto.length < 5) erros.texto = "Escreva uma mensagem.";
  if (texto.length > 2000) erros.texto = "A mensagem pode ter até 2.000 caracteres.";
  if (Object.keys(erros).length) return { erros };

  const eventId = String(form.get("event_id") ?? "");
  return {
    dados: { nome: nome.slice(0, 100), email: email.slice(0, 200), telefone: tel, texto },
    rastreio: lerRastreio(form.get("rastreio")),
    eventId: /^[\w-]{8,64}$/.test(eventId) ? eventId : crypto.randomUUID(),
  };
}

type NovoLead = {
  request: Request;
  origem: OrigemLead;
  anuncioId?: string | null;
  landingPageId?: string | null;
  dados: { nome: string; email: string; telefone: string; texto: string };
  rastreio: Record<string, string>;
  eventId: string;
};

/**
 * Grava o lead e dispara webhook, e-mail e API de Conversões em paralelo
 * com `waitUntil`: o visitante recebe a confirmação sem esperar ninguém.
 */
export async function criarLead(n: NovoLead) {
  const origemUrl = new URL(n.request.url).origin;
  const [veiculo] = n.anuncioId ? await db.select({
    id: schema.anuncios.id, codigo: schema.anuncios.codigo, slug: schema.anuncios.slug, versao: schema.anuncios.versao,
    anoModelo: schema.anuncios.anoModelo, preco: schema.anuncios.preco, vendedorId: schema.anuncios.vendedorId,
    marca: schema.marcas.nome, modelo: schema.modelos.nome,
  }).from(schema.anuncios)
    .innerJoin(schema.marcas, eq(schema.marcas.id, schema.anuncios.marcaId))
    .innerJoin(schema.modelos, eq(schema.modelos.id, schema.anuncios.modeloId))
    .where(eq(schema.anuncios.id, n.anuncioId)).limit(1) : [];
  const [vendedor] = veiculo?.vendedorId
    ? await db.select().from(schema.vendedores).where(eq(schema.vendedores.id, veiculo.vendedorId)).limit(1) : [];
  const [lp] = n.landingPageId
    ? await db.select({ titulo: schema.landingPages.titulo, slug: schema.landingPages.slug }).from(schema.landingPages).where(eq(schema.landingPages.id, n.landingPageId)).limit(1) : [];

  const id = crypto.randomUUID();
  const agora = Date.now();
  await db.insert(schema.leads).values({
    id, origem: n.origem, anuncioId: veiculo?.id ?? null, landingPageId: n.landingPageId ?? null, vendedorId: vendedor?.id ?? null,
    ...n.dados, rastreio: JSON.stringify(n.rastreio), criadoEm: agora, atualizadoEm: agora,
  });

  const [loja, integ] = await Promise.all([lojaCompleta(), obterIntegracoes()]);
  const tituloVeiculo = veiculo ? `${veiculo.marca} ${veiculo.modelo} ${veiculo.versao} ${veiculo.anoModelo}` : "";

  const payload: PayloadLead = {
    evento: "lead.novo", id, criado_em: new Date(agora).toISOString(), origem: n.origem, status: "novo",
    lead: { nome: n.dados.nome, email: n.dados.email, telefone: internacional(n.dados.telefone), mensagem: n.dados.texto },
    veiculo: veiculo ? {
      id: veiculo.id, codigo: codigoVeiculo(veiculo.codigo), titulo: tituloVeiculo, marca: veiculo.marca, modelo: veiculo.modelo,
      versao: veiculo.versao, ano_modelo: veiculo.anoModelo, preco: veiculo.preco, url: `${origemUrl}/carro/${veiculo.slug}`,
    } : null,
    vendedor: vendedor ? { nome: vendedor.nome, whatsapp: internacional(vendedor.whatsapp, vendedor.whatsappDdi), email: vendedor.email } : null,
    landing_page: lp ? { titulo: lp.titulo, url: `${origemUrl}/lp/${lp.slug}` } : null,
    rastreio: n.rastreio,
    loja: { nome: loja.nome },
  };

  const tarefas: Promise<unknown>[] = [];
  if (integ.webhookUrl) tarefas.push(entregarWebhook(integ.webhookUrl, integ.webhookSegredo, payload));

  if (integ.resendApiKey) {
    tarefas.push(enviarEmail(integ, `Novo lead: ${n.dados.nome}${veiculo ? ` — ${veiculo.marca} ${veiculo.modelo}` : ""}`, [
      ["Nome", n.dados.nome],
      ["Telefone", telefone(n.dados.telefone)],
      ...(n.dados.email ? [["E-mail", n.dados.email] as [string, string]] : []),
      ["Origem", ROTULO_ORIGEM[n.origem]],
      ...(veiculo ? [["Veículo", `${codigoVeiculo(veiculo.codigo)} · ${tituloVeiculo} · ${moeda(veiculo.preco)}`] as [string, string]] : []),
      ...(vendedor ? [["Vendedor", vendedor.nome] as [string, string]] : []),
      ...(n.dados.texto ? [["Mensagem", n.dados.texto] as [string, string]] : []),
      ...(n.rastreio.utm_campaign ? [["Campanha", n.rastreio.utm_campaign] as [string, string]] : []),
    ], `Responda pelo painel: ${origemUrl}/admin/leads`));
  }

  const evento = eventoMetaDe(lerConversoes(integ.conversoes).formulario);
  if (evento && integ.metaPixelId && integ.metaTokenCapi) {
    tarefas.push(enviarEventoMeta(integ, n.request, {
      nome: evento.nome, eventId: n.eventId, url: n.request.headers.get("Referer") ?? origemUrl,
      email: n.dados.email, telefoneInternacional: internacional(n.dados.telefone), nomePessoa: n.dados.nome,
      valor: veiculo?.preco, conteudo: tituloVeiculo || ROTULO_ORIGEM[n.origem],
    }));
  }

  if (tarefas.length) waitUntil(Promise.allSettled(tarefas));
  return id;
}
