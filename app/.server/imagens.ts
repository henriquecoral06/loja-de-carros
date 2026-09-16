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

export async function removerObjetos(chaves: string[]) {
  if (chaves.length) await env.IMAGENS.delete(chaves);
}

export const urlImagem = (chave: string) => `/imagens/${chave}`;
