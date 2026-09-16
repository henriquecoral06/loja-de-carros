import { CAMBIOS, CARROCERIAS, COMBUSTIVEIS, UFS, type Cambio, type Carroceria, type Combustivel } from "./veiculos";

export const ORDENACOES = [
  { valor: "recentes", rotulo: "Mais recentes" },
  { valor: "menor-preco", rotulo: "Menor preço" },
  { valor: "maior-preco", rotulo: "Maior preço" },
  { valor: "menor-km", rotulo: "Menor quilometragem" },
  { valor: "mais-novo", rotulo: "Ano mais novo" },
] as const;

export type Ordenacao = (typeof ORDENACOES)[number]["valor"];

export type Filtros = {
  q?: string;
  marca?: string;
  modelo?: string;
  precoMin?: number;
  precoMax?: number;
  anoMin?: number;
  anoMax?: number;
  kmMax?: number;
  cambio: Cambio[];
  combustivel: Combustivel[];
  carroceria: Carroceria[];
  uf?: string;
  vendedor?: "particular" | "loja";
  ordem: Ordenacao;
  pagina: number;
};

const inteiroPositivo = (v: string | null) => {
  if (!v) return undefined;
  const n = Number(v.replace(/\D/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

/** Só aceita valores das listas fechadas: filtro vindo da URL é entrada do usuário. */
const daLista = <T extends string>(valores: string[], lista: readonly T[]) =>
  valores.filter((v): v is T => (lista as readonly string[]).includes(v));

/**
 * Marca e modelo vêm do caminho (/carros/toyota/corolla), o resto da
 * query string. Assim a página de uma marca tem URL própria e indexável.
 */
export function lerFiltros(url: URL, params: { marca?: string; modelo?: string } = {}): Filtros {
  const sp = url.searchParams;
  const ordem = sp.get("ordem");
  const uf = sp.get("uf")?.toUpperCase();
  const vendedor = sp.get("vendedor");

  return {
    q: sp.get("q")?.trim().slice(0, 80) || undefined,
    marca: params.marca,
    modelo: params.modelo,
    precoMin: inteiroPositivo(sp.get("preco_min")),
    precoMax: inteiroPositivo(sp.get("preco_max")),
    anoMin: inteiroPositivo(sp.get("ano_min")),
    anoMax: inteiroPositivo(sp.get("ano_max")),
    kmMax: inteiroPositivo(sp.get("km_max")),
    cambio: daLista(sp.getAll("cambio"), CAMBIOS),
    combustivel: daLista(sp.getAll("combustivel"), COMBUSTIVEIS),
    carroceria: daLista(sp.getAll("carroceria"), CARROCERIAS),
    uf: uf && (UFS as readonly string[]).includes(uf) ? uf : undefined,
    vendedor: vendedor === "particular" || vendedor === "loja" ? vendedor : undefined,
    ordem: ORDENACOES.some((o) => o.valor === ordem) ? (ordem as Ordenacao) : "recentes",
    pagina: Math.min(inteiroPositivo(sp.get("pagina")) ?? 1, 500),
  };
}

/** Caminho de busca preservando os filtros atuais, trocando só o que foi pedido. */
export function urlBusca(atual: URL, mudancas: Record<string, string | string[] | null>, caminho?: string) {
  const sp = new URLSearchParams(atual.search);
  for (const [chave, valor] of Object.entries(mudancas)) {
    sp.delete(chave);
    if (Array.isArray(valor)) valor.forEach((v) => sp.append(chave, v));
    else if (valor !== null && valor !== "") sp.set(chave, valor);
  }
  if (!("pagina" in mudancas)) sp.delete("pagina");
  const qs = sp.toString();
  return `${caminho ?? atual.pathname}${qs ? `?${qs}` : ""}`;
}
