/**
 * Constantes do site. Nome, contatos e endereço da loja NÃO ficam aqui:
 * vêm da tabela `loja` e são editados em /admin/loja.
 */
export const SITE = {
  porPagina: 24,
  maxFotosPorAnuncio: 20,
} as const;

type LojaResumo = { nome: string; cidade: string; uf: string; slogan: string; whatsapp: string; telefone: string };

/**
 * Lê a loja carregada pelo layout `routes/site.tsx` a partir dos matches
 * de `meta` — evita consultar o banco de novo em cada página.
 */
export function lojaDasRotas(matches: ReadonlyArray<{ id: string; loaderData?: unknown } | undefined>): LojaResumo {
  const dados = matches.find((m) => m?.id === "routes/site")?.loaderData as { loja?: LojaResumo } | undefined;
  return dados?.loja ?? { nome: "Loja de Carros", cidade: "", uf: "", slogan: "", whatsapp: "", telefone: "" };
}

/**
 * Meta das páginas do painel. No React Router só vale o `meta` da rota
 * mais interna, então cada página do admin chama isto para levar o nome
 * da loja e o noindex juntos.
 */
export function metaAdmin(titulo: string, matches: ReadonlyArray<{ id: string; loaderData?: unknown } | undefined>) {
  const dados = matches.find((m) => m?.id === "routes/admin/layout")?.loaderData as { nomeLoja?: string } | undefined;
  return [{ title: `${titulo} · ${dados?.nomeLoja ?? "Painel"}` }, { name: "robots", content: "noindex" }];
}
