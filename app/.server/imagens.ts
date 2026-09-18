import { env } from "cloudflare:workers";

/**
 * Onde as imagens ficam:
 * - com o binding IMAGENS (R2 ativado na conta), no R2;
 * - sem ele, na tabela `arquivos` do D1 — o sistema funciona completo sem R2.
 * As chaves são as mesmas nos dois casos, então dá para migrar depois.
 */
const r2 = () => (env as { IMAGENS?: R2Bucket }).IMAGENS;

/** O D1 guarda até 2 MB por linha; o R2 não tem esse limite prático. */
export const tamanhoMaximo = () => (r2() ? 8 * 1024 * 1024 : 1_900_000);
export const TAMANHO_MAXIMO = 8 * 1024 * 1024;

/** O D1 aceita até 2 MB por linha: arquivos maiores (PDF) vão em partes `chave#p001`, `#p002`… */
const PARTE = 1_800_000;
const chaveParte = (chave: string, n: number) => `${chave}#p${String(n).padStart(3, "0")}`;

async function guardar(chave: string, bytes: ArrayBuffer, mime: string) {
  const bucket = r2();
  if (bucket) {
    await bucket.put(chave, bytes, { httpMetadata: { contentType: mime, cacheControl: "public, max-age=31536000, immutable" } });
    return;
  }
  const inserir = "insert into arquivos (chave, tipo, tamanho, dados, criado_em) values (?, ?, ?, ?, ?)";
  // Primeira parte na linha principal (com o tamanho total); o resto em linhas próprias.
  const agora = Date.now();
  await env.DB.prepare(inserir).bind(chave, mime, bytes.byteLength, bytes.slice(0, PARTE), agora).run();
  for (let i = 1; i * PARTE < bytes.byteLength; i++) {
    await env.DB.prepare(inserir).bind(chaveParte(chave, i), mime, 0, bytes.slice(i * PARTE, (i + 1) * PARTE), agora).run();
  }
}

const paraBytes = (dados: ArrayBuffer | number[]): Uint8Array<ArrayBuffer> => (Array.isArray(dados) ? Uint8Array.from(dados) : new Uint8Array(dados));

/** Lê uma imagem guardada. `null` se não existe. */
export async function lerArquivo(chave: string): Promise<{ tipo: string; corpo: ReadableStream | Uint8Array<ArrayBuffer>; etag: string } | null> {
  const bucket = r2();
  if (bucket) {
    const objeto = await bucket.get(chave);
    if (objeto) return { tipo: objeto.httpMetadata?.contentType ?? "application/octet-stream", corpo: objeto.body, etag: objeto.httpEtag };
  }
  const linha = await env.DB.prepare("select tipo, tamanho, dados from arquivos where chave = ?").bind(chave).first<{ tipo: string; tamanho: number; dados: ArrayBuffer | number[] }>();
  if (!linha) return null;
  let dados = paraBytes(linha.dados);
  if (linha.tamanho > dados.byteLength) {
    // Arquivo em partes: uma consulta por parte, para nenhuma resposta passar do limite do D1.
    const completo = new Uint8Array(new ArrayBuffer(linha.tamanho));
    completo.set(dados, 0);
    let pos = dados.byteLength;
    for (let i = 1; pos < linha.tamanho; i++) {
      const parte = await env.DB.prepare("select dados from arquivos where chave = ?").bind(chaveParte(chave, i)).first<{ dados: ArrayBuffer | number[] }>();
      if (!parte) return null;
      const b = paraBytes(parte.dados);
      completo.set(b, pos);
      pos += b.byteLength;
    }
    dados = completo;
  }
  return { tipo: linha.tipo, corpo: dados, etag: `"${chave.split("/").pop()}"` };
}

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
  if (arquivo.size > tamanhoMaximo()) return { ok: false, erro: "grande" };
  const bytes = await arquivo.arrayBuffer();
  const tipo = detectar(new Uint8Array(bytes.slice(0, 16)));
  return tipo ? { ok: true, bytes, tipo } : { ok: false, erro: "formato" };
}

export async function salvarFotoAnuncio(anuncioId: string, bytes: ArrayBuffer, tipo: Tipo) {
  const chave = `anuncios/${anuncioId}/${crypto.randomUUID()}.${tipo.extensao}`;
  await guardar(chave, bytes, tipo.mime);
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
  const limite = aceitaSvg ? TAMANHO_MAXIMO_LOGO : tamanhoMaximo();
  if (arquivo.size > limite) return { ok: false as const, erro: `O arquivo passa de ${(limite / 1_000_000).toFixed(limite < 2_000_000 ? 1 : 0).replace(".", ",")} MB. Envie uma imagem menor.` };
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

/** Imagens e material (PDF) das landing pages. */
export async function salvarArquivoLP(bytes: ArrayBuffer, tipo: Tipo) {
  const chave = `lp/${crypto.randomUUID()}.${tipo.extensao}`;
  await guardar(chave, bytes, tipo.mime);
  return chave;
}

export const TAMANHO_MAXIMO_PDF = 10 * 1024 * 1024;

export async function validarPdf(arquivo: File) {
  if (!arquivo.size) return { ok: false as const, erro: "Arquivo vazio." };
  if (arquivo.size > TAMANHO_MAXIMO_PDF) return { ok: false as const, erro: "O PDF passa de 10 MB. Comprima o arquivo e envie de novo." };
  const bytes = await arquivo.arrayBuffer();
  const cabecalho = String.fromCharCode(...new Uint8Array(bytes.slice(0, 5)));
  if (cabecalho !== "%PDF-") return { ok: false as const, erro: "Envie um arquivo PDF." };
  return { ok: true as const, bytes, tipo: { mime: "application/pdf", extensao: "pdf" } };
}

export async function salvarArquivoLoja(prefixo: "logo" | "logo-claro" | "banner" | "vendedor", bytes: ArrayBuffer, tipo: Tipo) {
  const chave = `loja/${prefixo}-${crypto.randomUUID()}.${tipo.extensao}`;
  await guardar(chave, bytes, tipo.mime);
  return chave;
}

/** Apaga imagens guardadas. Fotos de exemplo apontam para URL externa e são ignoradas. */
/**
 * Cache da borda para `/imagens/...`. A chave não depende do domínio (o site
 * pode abrir por mais de um), para a exclusão conseguir limpar a cópia.
 */
export const cacheImagens = () => (globalThis as { caches?: { default?: Cache } }).caches?.default;
export const chaveCacheImagem = (chave: string) => new Request(`https://imagens.interno/${chave}`, { method: "GET" });

export async function removerObjetos(chaves: string[]) {
  const nossas = chaves.filter((c) => c && !/^https?:\/\//.test(c));
  if (!nossas.length) return;
  const cache = cacheImagens();
  if (cache) await Promise.all(nossas.map((c) => cache.delete(chaveCacheImagem(c)).catch(() => false)));
  const bucket = r2();
  if (bucket) await bucket.delete(nossas);
  // Sempre limpa o D1 também: cobre imagens enviadas antes de ativar o R2.
  // Em lotes de 40: o D1 aceita no máximo 100 parâmetros por consulta (cada chave usa dois).
  for (let i = 0; i < nossas.length; i += 40) {
    const lote = nossas.slice(i, i + 40);
    const marcas = lote.map(() => "?").join(",");
    // `substr(...)` pega as partes `chave#p001…` de arquivos grandes.
    await env.DB.prepare(`delete from arquivos where chave in (${marcas}) or (instr(chave, '#p') > 0 and substr(chave, 1, instr(chave, '#p') - 1) in (${marcas}))`)
      .bind(...lote, ...lote).run();
  }
}

/**
 * URL pública de uma chave. As fotos do seed de demonstração guardam a URL
 * completa de um banco de imagens; as enviadas pelo painel são servidas
 * por /imagens.
 */
export const urlImagem = (chave: string) => (/^https?:\/\//.test(chave) ? chave : `/imagens/${chave}`);

/** Chave guardada a partir da URL pública (`/imagens/lp/…` → `lp/…`); `null` se não é nossa. */
export const chaveDaUrl = (url: string) => (url.startsWith("/imagens/") ? url.slice("/imagens/".length) : null);
