import { ne } from "drizzle-orm";
import { chaveDaUrl, removerObjetos } from "./imagens";
import { db, schema } from "./db";

type ComArquivos = { imagemTopo: string; secao2Imagem: string; logoTopo: string; materialChave: string };

/** Chaves guardadas por esta landing page (uploads próprios; fotos do carro não contam). */
export function arquivosDaLP(lp: ComArquivos) {
  return [lp.imagemTopo, lp.secao2Imagem, lp.logoTopo].map((u) => (u.startsWith("/imagens/lp/") ? chaveDaUrl(u) : null))
    .concat(lp.materialChave.startsWith("lp/") ? lp.materialChave : null)
    .filter((c): c is string => Boolean(c));
}

/**
 * Apaga arquivos que nenhuma outra landing page usa. Páginas duplicadas
 * compartilham os mesmos uploads: apagar de uma não pode quebrar a outra.
 */
export async function removerArquivosSemUso(chaves: string[], idAtual: string) {
  if (!chaves.length) return;
  const outras = await db.select({
    imagemTopo: schema.landingPages.imagemTopo, secao2Imagem: schema.landingPages.secao2Imagem,
    logoTopo: schema.landingPages.logoTopo, materialChave: schema.landingPages.materialChave,
  }).from(schema.landingPages).where(ne(schema.landingPages.id, idAtual));
  const emUso = new Set(outras.flatMap(arquivosDaLP));
  await removerObjetos(chaves.filter((c) => !emUso.has(c)));
}
