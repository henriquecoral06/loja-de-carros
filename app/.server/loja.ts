import { eq } from "drizzle-orm";
import { CORES_PADRAO } from "~/lib/cores";
import { db, schema } from "./db";
import { urlImagem } from "./imagens";

const PADRAO = {
  id: 1, nome: "Sua Loja de Carros", slogan: "", sobre: "", whatsapp: "", telefone: "", email: "",
  endereco: "", bairro: "", cidade: "", uf: "", cep: "", horario: "", cnpj: "", instagram: "", facebook: "",
  corPrimaria: CORES_PADRAO.primaria, corEscura: CORES_PADRAO.escura, logoChave: "", logoClaroChave: "", bannerChave: "",
  atualizadoEm: 0,
};

/** Banner padrão da home enquanto a loja não envia o seu (foto do Unsplash, licença livre). */
export const BANNER_PADRAO = "https://images.unsplash.com/photo-1627097170492-1041ecd6c3c5?auto=format&fit=crop&w=2000&q=70";

/**
 * Dados da loja (linha única). Se o banco ainda não foi populado, devolve
 * um padrão para o site não quebrar — o painel mostra o aviso para
 * preencher.
 */
export async function obterLoja() {
  const [linha] = await db.select().from(schema.loja).where(eq(schema.loja.id, 1)).limit(1);
  const loja = linha ?? PADRAO;
  return {
    ...loja,
    logo: loja.logoChave ? urlImagem(loja.logoChave) : null,
    logoClaro: loja.logoClaroChave ? urlImagem(loja.logoClaroChave) : null,
    banner: loja.bannerChave ? urlImagem(loja.bannerChave) : BANNER_PADRAO,
  };
}

export type DadosLoja = Awaited<ReturnType<typeof obterLoja>>;
