import { eq } from "drizzle-orm";
import { lerConversoes } from "~/lib/conversoes";
import { db, schema } from "./db";

const PADRAO: typeof schema.integracoes.$inferSelect = {
  id: 1, webhookUrl: "", webhookSegredo: "", apiTokenHash: "", apiTokenFinal: "", apiTokenCriadoEm: null,
  metaPixelId: "", metaCodigoTeste: "", metaTokenCapi: "", googleAdsId: "", ga4Id: "", gtmId: "",
  conversoes: "{}", exigirConsentimento: true, resendApiKey: "", resendRemetente: "", resendDestinatarios: "",
  atualizadoEm: 0,
};

export async function obterIntegracoes() {
  const [linha] = await db.select().from(schema.integracoes).where(eq(schema.integracoes.id, 1)).limit(1);
  return linha ?? PADRAO;
}

export async function salvarIntegracoes(valores: Partial<typeof schema.integracoes.$inferInsert>) {
  const dados = { ...valores, atualizadoEm: Date.now() };
  await db.insert(schema.integracoes).values({ ...PADRAO, ...dados, id: 1 })
    .onConflictDoUpdate({ target: schema.integracoes.id, set: dados });
}

/** Só o que o navegador precisa para carregar as tags. Tokens e webhook ficam de fora. */
export async function rastreamentoPublico() {
  const i = await obterIntegracoes();
  return {
    metaPixelId: i.metaPixelId, googleAdsId: i.googleAdsId, ga4Id: i.ga4Id, gtmId: i.gtmId,
    exigirConsentimento: i.exigirConsentimento, conversoes: lerConversoes(i.conversoes),
  };
}

export type ConfigRastreamento = Awaited<ReturnType<typeof rastreamentoPublico>>;
