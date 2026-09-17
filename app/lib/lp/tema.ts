/**
 * Tema de cores, estilo dos botões e fontes das landing pages.
 * Compartilhado entre o editor do painel e a página pública.
 */

export type TemaLP = {
  fundo: string; // fundo da página
  titulo: string; // títulos sobre o fundo
  texto: string; // textos sobre o fundo
  fundoBloco: string; // fundo dos blocos de destaque
  tituloBloco: string; // títulos sobre os blocos de destaque
  textoBloco: string; // textos sobre os blocos de destaque
  botao: string;
  textoBotao: string;
  destaque: string; // linhas e ícones
  rotulo: string; // rótulos pequenos em caixa alta sobre a página
  rotuloBloco: string; // rótulos pequenos sobre os blocos de destaque
  fundoMenu: string;
  textoMenu: string;
};

export const GRUPOS_TEMA = ["Menu superior", "Página", "Blocos de destaque", "Botões", "Detalhes"] as const;

export const CAMPOS_TEMA: { chave: keyof TemaLP; rotulo: string; grupo: (typeof GRUPOS_TEMA)[number] }[] = [
  { chave: "fundoMenu", rotulo: "Fundo", grupo: "Menu superior" },
  { chave: "textoMenu", rotulo: "Texto e links", grupo: "Menu superior" },
  { chave: "fundo", rotulo: "Fundo", grupo: "Página" },
  { chave: "titulo", rotulo: "Títulos", grupo: "Página" },
  { chave: "texto", rotulo: "Textos", grupo: "Página" },
  { chave: "fundoBloco", rotulo: "Fundo", grupo: "Blocos de destaque" },
  { chave: "tituloBloco", rotulo: "Títulos", grupo: "Blocos de destaque" },
  { chave: "textoBloco", rotulo: "Textos", grupo: "Blocos de destaque" },
  { chave: "rotuloBloco", rotulo: "Rótulos pequenos", grupo: "Blocos de destaque" },
  { chave: "botao", rotulo: "Fundo", grupo: "Botões" },
  { chave: "textoBotao", rotulo: "Texto", grupo: "Botões" },
  { chave: "destaque", rotulo: "Linhas e ícones", grupo: "Detalhes" },
  { chave: "rotulo", rotulo: "Rótulos pequenos", grupo: "Detalhes" },
];

/** O estilo dos botões define também o arredondamento de cards e imagens. */
export const ESTILOS_BOTAO = [
  { valor: "pilula", rotulo: "Pílula", raio: "9999px", raioCard: "1.75rem" },
  { valor: "arredondado", rotulo: "Arredondado", raio: "0.75rem", raioCard: "1rem" },
  { valor: "quadrado", rotulo: "Quadrado", raio: "0", raioCard: "0" },
] as const;
export type EstiloBotao = (typeof ESTILOS_BOTAO)[number]["valor"];
export const VALORES_ESTILO_BOTAO = ESTILOS_BOTAO.map((b) => b.valor) as unknown as readonly [EstiloBotao, ...EstiloBotao[]];

const HEX = /^#[0-9a-fA-F]{6}$/;
export const ehHex = (v: unknown): v is string => typeof v === "string" && HEX.test(v);

/** Tema salvo como JSON; qualquer chave inválida cai no tema do estilo. */
export function lerTema(json: string | null | undefined, padrao: TemaLP): TemaLP {
  let salvo: Record<string, unknown> = {};
  try {
    const v = json ? JSON.parse(json) : null;
    if (v && typeof v === "object") salvo = v;
  } catch { /* tema corrompido: usa o padrão */ }
  return Object.fromEntries(CAMPOS_TEMA.map(({ chave }) => [chave, ehHex(salvo[chave]) ? String(salvo[chave]).toLowerCase() : padrao[chave]])) as TemaLP;
}

const INTER = "Inter, ui-sans-serif, system-ui, sans-serif";

/** Fontes por estilo (Google Fonts): títulos (`titulos`) e corpo (`corpo`). */
export const FONTES_ESTILO: Record<string, { titulos: string; corpo: string; href: string }> = {
  editorial: { titulos: "'Playfair Display', Georgia, serif", corpo: INTER, href: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&display=swap" },
  vibrante: { titulos: "'Nunito', Inter, sans-serif", corpo: INTER, href: "https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&display=swap" },
  clean: { titulos: INTER, corpo: INTER, href: "" },
  luxo: { titulos: "'Instrument Serif', Georgia, serif", corpo: INTER, href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap" },
  noturno: { titulos: "'Playfair Display', Georgia, serif", corpo: "'DM Sans', Inter, sans-serif", href: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400;1,500&family=DM+Sans:wght@300;400;500;600&display=swap" },
  tech: { titulos: INTER, corpo: INTER, href: "" },
  moderno: { titulos: "'Plus Jakarta Sans', Inter, sans-serif", corpo: "'Plus Jakarta Sans', Inter, sans-serif", href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" },
  boutique: { titulos: "'DM Serif Display', Georgia, serif", corpo: INTER, href: "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap" },
};

/** Fundo escuro? (luminância) — decide logo claro, linhas e cards translúcidos. */
export function fundoEscuro(hex: string) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return false;
  const [r, g, b] = [m[1], m[2], m[3]].map((x) => parseInt(x, 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.45;
}

/** Variáveis CSS aplicadas no contêiner da landing page. */
export function varsTema(tema: TemaLP, estiloBotao: string, estilo: string): Record<string, string> {
  const escuro = fundoEscuro(tema.fundo);
  const botao = ESTILOS_BOTAO.find((b) => b.valor === estiloBotao) ?? ESTILOS_BOTAO[1];
  const fonte = FONTES_ESTILO[estilo] ?? FONTES_ESTILO.clean;
  return {
    "--lp-linha": escuro ? "rgba(255,255,255,.14)" : "rgba(0,0,0,.08)",
    "--lp-card": escuro ? "rgba(255,255,255,.05)" : "#ffffff",
    "--lp-raio": botao.raio,
    "--lp-raio-card": botao.raioCard,
    "--lp-fonte-titulos": fonte.titulos,
    "--lp-fonte-corpo": fonte.corpo,
    "--lp-fundo": tema.fundo,
    "--lp-titulo": tema.titulo,
    "--lp-texto": tema.texto,
    "--lp-bloco": tema.fundoBloco,
    "--lp-titulo-bloco": tema.tituloBloco,
    "--lp-texto-bloco": tema.textoBloco,
    "--lp-botao": tema.botao,
    "--lp-texto-botao": tema.textoBotao,
    "--lp-destaque": tema.destaque,
    "--lp-rotulo": tema.rotulo,
    "--lp-rotulo-bloco": tema.rotuloBloco,
    "--lp-fundo-menu": tema.fundoMenu,
    "--lp-texto-menu": tema.textoMenu,
  };
}
