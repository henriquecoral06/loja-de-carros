import { eq } from "drizzle-orm";
import { db, schema } from "./db";

export async function obterIntegracoes() {
  const [linha] = await db.select().from(schema.integracoes).where(eq(schema.integracoes.id, 1)).limit(1);
  return linha ?? {
    id: 1, metaPixelId: "", googleAdsId: "", googleAdsRotuloLead: "", googleAdsRotuloWhatsapp: "", ga4Id: "", gtmId: "",
    exigirConsentimento: true, webhookUrl: "", webhookSegredo: "", webhookUltimoStatus: null, webhookUltimoEm: null,
    webhookUltimaResposta: "", atualizadoEm: 0,
  };
}

/** Só o que o navegador precisa para carregar as tags. Webhook fica de fora. */
export async function rastreamentoPublico() {
  const i = await obterIntegracoes();
  return {
    metaPixelId: i.metaPixelId, googleAdsId: i.googleAdsId, googleAdsRotuloLead: i.googleAdsRotuloLead,
    googleAdsRotuloWhatsapp: i.googleAdsRotuloWhatsapp, ga4Id: i.ga4Id, gtmId: i.gtmId,
    exigirConsentimento: i.exigirConsentimento,
  };
}

export type ConfigRastreamento = Awaited<ReturnType<typeof rastreamentoPublico>>;
