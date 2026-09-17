/** Utilidades de imagem que rodam só no navegador (canvas). */

/**
 * Reduz a foto antes de enviar. Foto de celular sai com 4 a 8 MB; em WebP
 * de 1600px fica em torno de 250 KB. O upload fica rápido no 4G e o armazenamento
 * guarda menos — sem pagar serviço de redimensionamento.
 */
export async function reduzirImagem(arquivo: File, ladoMaximo = 1600): Promise<File> {
  try {
    const bitmap = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
    const escala = Math.min(1, ladoMaximo / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/webp", 0.82));
    // Safari antigo não gera WebP e devolve PNG enorme: nesse caso JPEG.
    const final = blob && blob.type === "image/webp"
      ? blob
      : await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
    if (!final) return arquivo;
    const ext = final.type === "image/webp" ? "webp" : "jpg";
    return new File([final], arquivo.name.replace(/\.[^.]+$/, "") + `.${ext}`, { type: final.type });
  } catch {
    return arquivo; // formato que o navegador não decodifica: o servidor decide
  }
}

const hex = (r: number, g: number, b: number) => `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;

/**
 * Cores predominantes de um logo, da mais presente para a menos. Ignora
 * transparência e o fundo branco típico de PNG/JPG. Funciona com SVG.
 */
export async function coresDaImagem(url: string, maximo = 6): Promise<string[]> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = url;
  await img.decode();

  const lado = 96;
  const escala = Math.min(1, lado / Math.max(img.naturalWidth || lado, img.naturalHeight || lado));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round((img.naturalWidth || lado) * escala));
  canvas.height = Math.max(1, Math.round((img.naturalHeight || lado) * escala));
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Agrupa em "caixas" de 24 tons por canal para juntar o antisserrilhado.
  const caixas = new Map<string, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    if (a < 200) continue;
    if (r > 235 && g > 235 && b > 235) continue;
    const chave = `${r >> 5}-${g >> 5}-${b >> 5}`;
    const c = caixas.get(chave) ?? { n: 0, r: 0, g: 0, b: 0 };
    c.n++; c.r += r; c.g += g; c.b += b;
    caixas.set(chave, c);
  }

  const ordenadas = [...caixas.values()].sort((x, y) => y.n - x.n).map((c) => [c.r / c.n, c.g / c.n, c.b / c.n].map(Math.round));
  const escolhidas: number[][] = [];
  for (const cor of ordenadas) {
    // Descarta tons quase iguais a um já escolhido.
    if (escolhidas.every((e) => Math.hypot(e[0] - cor[0], e[1] - cor[1], e[2] - cor[2]) > 48)) escolhidas.push(cor);
    if (escolhidas.length >= maximo) break;
  }
  return escolhidas.map(([r, g, b]) => hex(r, g, b));
}
