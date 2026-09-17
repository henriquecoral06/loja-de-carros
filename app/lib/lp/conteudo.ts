/** Listas em JSON das landing pages. Compartilhado entre editor e página pública. */

export type Pergunta = { pergunta: string; resposta: string };
export type Destaque = { rotulo: string; icone: string };
export type Numero = { valor: string; rotulo: string };
export type Etapa = { titulo: string; texto: string };
export type Depoimento = { nome: string; texto: string; contexto: string };

export const LIMITES = { faq: 12, destaques: 16, numeros: 8, etapas: 8, depoimentos: 6 } as const;

function lista(json: string | null | undefined): Record<string, unknown>[] {
  try {
    const v = json ? JSON.parse(json) : [];
    return Array.isArray(v) ? v.filter((x) => x && typeof x === "object") : [];
  } catch {
    return [];
  }
}
const txt = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export const lerFaq = (json: string | null | undefined): Pergunta[] =>
  lista(json).map((x) => ({ pergunta: txt(x.pergunta, 160), resposta: txt(x.resposta, 1000) })).filter((x) => x.pergunta && x.resposta).slice(0, LIMITES.faq);

export const lerDestaques = (json: string | null | undefined): Destaque[] =>
  lista(json).map((x) => ({ rotulo: txt(x.rotulo, 40), icone: txt(x.icone, 40) || "Check" })).filter((x) => x.rotulo).slice(0, LIMITES.destaques);

export const lerNumeros = (json: string | null | undefined): Numero[] =>
  lista(json).map((x) => ({ valor: txt(x.valor, 24), rotulo: txt(x.rotulo, 60) })).filter((x) => x.valor).slice(0, LIMITES.numeros);

export const lerEtapas = (json: string | null | undefined): Etapa[] =>
  lista(json).map((x) => ({ titulo: txt(x.titulo, 80), texto: txt(x.texto, 300) })).filter((x) => x.titulo).slice(0, LIMITES.etapas);

export const lerDepoimentos = (json: string | null | undefined): Depoimento[] =>
  lista(json).map((x) => ({ nome: txt(x.nome, 80), texto: txt(x.texto, 400), contexto: txt(x.contexto, 80) })).filter((x) => x.texto).slice(0, LIMITES.depoimentos);

/** Link de vídeo do YouTube, Vimeo ou arquivo .mp4/.webm para o player com controles. */
export function videoIncorporado(url: string | null | undefined): { tipo: "iframe" | "arquivo"; src: string } | null {
  if (!url) return null;
  let u: URL;
  try { u = new URL(url.trim()); } catch { return null; }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.replace(/^www\./, "");
  let yt: string | null = null;
  if (host === "youtu.be") yt = u.pathname.slice(1);
  if (host === "youtube.com" || host === "m.youtube.com") yt = u.searchParams.get("v") ?? u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]+)/)?.[1] ?? null;
  if (yt && /^[\w-]{6,20}$/.test(yt)) return { tipo: "iframe", src: `https://www.youtube-nocookie.com/embed/${yt}?rel=0` };
  const vimeo = host === "vimeo.com" ? u.pathname.match(/^\/(\d+)/)?.[1] : host === "player.vimeo.com" ? u.pathname.match(/\/video\/(\d+)/)?.[1] : null;
  if (vimeo) return { tipo: "iframe", src: `https://player.vimeo.com/video/${vimeo}?dnt=1` };
  if (/\.(mp4|webm)$/i.test(u.pathname)) return { tipo: "arquivo", src: u.toString() };
  return null;
}
