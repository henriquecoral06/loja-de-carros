import { env } from "cloudflare:workers";

export const TAMANHO_MAXIMO = 8 * 1024 * 1024;

type Tipo = { mime: string; extensao: string };

/**
 * Identifica o formato pelos primeiros bytes, não pelo Content-Type que o
 * navegador declara — esse vem do cliente e pode ser qualquer coisa.
 */
function detectar(bytes: Uint8Array): Tipo | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mime: "image/jpeg", extensao: "jpg" };
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { mime: "image/png", extensao: "png" };
  const riff = String.fromCharCode(...bytes.slice(0, 4));
  const webp = String.fromCharCode(...bytes.slice(8, 12));
  if (riff === "RIFF" && webp === "WEBP") return { mime: "image/webp", extensao: "webp" };
  return null;
}

export type ErroImagem = "vazia" | "grande" | "formato";

export async function validarImagem(arquivo: File): Promise<{ ok: true; bytes: ArrayBuffer; tipo: Tipo } | { ok: false; erro: ErroImagem }> {
  if (!arquivo.size) return { ok: false, erro: "vazia" };
  if (arquivo.size > TAMANHO_MAXIMO) return { ok: false, erro: "grande" };
  const bytes = await arquivo.arrayBuffer();
  const tipo = detectar(new Uint8Array(bytes.slice(0, 16)));
  return tipo ? { ok: true, bytes, tipo } : { ok: false, erro: "formato" };
}

export async function salvarFotoAnuncio(anuncioId: string, bytes: ArrayBuffer, tipo: Tipo) {
  const chave = `anuncios/${anuncioId}/${crypto.randomUUID()}.${tipo.extensao}`;
  await env.IMAGENS.put(chave, bytes, {
    httpMetadata: { contentType: tipo.mime, cacheControl: "public, max-age=31536000, immutable" },
  });
  return chave;
}

/**
 * Logo e banner da loja. SVG é aceito para logo (é o formato que a
 * maioria das agências entrega), mas só se não tiver nada executável; e
 * a rota /imagens ainda o serve com CSP que bloqueia script.
 */
export const TAMANHO_MAXIMO_LOGO = 1024 * 1024;

export async function validarLogo(arquivo: File, { aceitaSvg }: { aceitaSvg: boolean }) {
  if (!arquivo.size) return { ok: false as const, erro: "Arquivo vazio." };
  const limite = aceitaSvg ? TAMANHO_MAXIMO_LOGO : TAMANHO_MAXIMO;
  if (arquivo.size > limite) return { ok: false as const, erro: `O arquivo passa de ${aceitaSvg ? "1 MB" : "8 MB"}.` };
  const bytes = await arquivo.arrayBuffer();
  const tipo = detectar(new Uint8Array(bytes.slice(0, 16)));
  if (tipo) return { ok: true as const, bytes, tipo };
  if (aceitaSvg) {
    const texto = new TextDecoder().decode(bytes).trim();
    const pareceSvg = /^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE svg[^>]*>\s*)?<svg[\s>]/i.test(texto);
    const perigoso = /<script|<foreignObject|\son[a-z]+\s*=|javascript:|<iframe|<embed|<object|(?:xlink:)?href\s*=\s*["']\s*(?!#|data:image\/(?:png|jpe?g|webp|gif);)/i.test(texto);
    if (pareceSvg && !perigoso) return { ok: true as const, bytes, tipo: { mime: "image/svg+xml", extensao: "svg" } };
    if (pareceSvg) return { ok: false as const, erro: "Este SVG tem scripts ou links externos. Exporte de novo como SVG simples ou envie PNG." };
  }
  return { ok: false as const, erro: aceitaSvg ? "Envie PNG, JPG, WebP ou SVG." : "Envie JPG, PNG ou WebP." };
}

export async function salvarArquivoLoja(prefixo: "logo" | "logo-claro" | "banner", bytes: ArrayBuffer, tipo: Tipo) {
  const chave = `loja/${prefixo}-${crypto.randomUUID()}.${tipo.extensao}`;
  await env.IMAGENS.put(chave, bytes, {
    httpMetadata: { contentType: tipo.mime, cacheControl: "public, max-age=31536000, immutable" },
  });
  return chave;
}

/** Remove do R2. Fotos de exemplo apontam para URL externa e são ignoradas. */
export async function removerObjetos(chaves: string[]) {
  const doBucket = chaves.filter((c) => c && !/^https?:\/\//.test(c));
  if (doBucket.length) await env.IMAGENS.delete(doBucket);
}

/**
 * URL pública de uma chave. As fotos do seed de demonstração guardam a URL
 * completa de um banco de imagens; as enviadas pelo painel ficam no R2.
 */
export const urlImagem = (chave: string) => (/^https?:\/\//.test(chave) ? chave : `/imagens/${chave}`);
