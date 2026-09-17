import { eq } from "drizzle-orm";
import { CORES_PADRAO } from "~/lib/cores";
import { db, schema } from "./db";
import { urlImagem } from "./imagens";

const PADRAO: typeof schema.loja.$inferSelect = {
  id: 1, nome: "Sua Loja de Carros", slogan: "", sobre: "", cnpj: "",
  whatsappDdi: "55", whatsapp: "", telefoneDdi: "55", telefone: "", email: "",
  endereco: "", bairro: "", cidade: "", uf: "", cep: "", horario: "",
  instagram: "", facebook: "", tiktok: "", youtube: "",
  corPrimaria: CORES_PADRAO.primaria, corSecundaria: CORES_PADRAO.secundaria, corEscura: CORES_PADRAO.escura,
  logoChave: "", logoClaroChave: "",
  whatsappFlutuante: true, whatsappMensagem: "Olá! Vim pelo site e gostaria de mais informações.",
  heroTitulo: "", heroSubtitulo: "", bannerChave: "", heroVideo: "", textoVendaCarro: "",
  feedAtivo: false, feedToken: "",
  atualizadoEm: 0,
};

/** Banner padrão da home enquanto a loja não envia o seu (foto do Unsplash, licença livre). */
export const BANNER_PADRAO = "https://images.unsplash.com/photo-1627097170492-1041ecd6c3c5?auto=format&fit=crop&w=2000&q=70";

/** Linha crua da loja (com o token do feed). Só para o servidor e o painel. */
export async function lojaCompleta() {
  const [linha] = await db.select().from(schema.loja).where(eq(schema.loja.id, 1)).limit(1);
  return linha ?? PADRAO;
}

/**
 * Dados públicos da loja, com as URLs de logo e banner prontas. Vai para
 * o navegador em todas as páginas: nada sigiloso aqui.
 */
export async function obterLoja() {
  const { feedToken, feedAtivo, ...loja } = await lojaCompleta();
  return {
    ...loja,
    logo: loja.logoChave ? urlImagem(loja.logoChave) : null,
    logoClaro: loja.logoClaroChave ? urlImagem(loja.logoClaroChave) : null,
    banner: loja.bannerChave ? urlImagem(loja.bannerChave) : BANNER_PADRAO,
  };
}

export type DadosLoja = Awaited<ReturnType<typeof obterLoja>>;

export async function salvarLoja(valores: Partial<typeof schema.loja.$inferInsert>) {
  const atual = await lojaCompleta();
  const dados = { ...valores, atualizadoEm: Date.now() };
  if (atual.atualizadoEm) await db.update(schema.loja).set(dados).where(eq(schema.loja.id, 1));
  else await db.insert(schema.loja).values({ ...PADRAO, ...dados, id: 1 });
}
