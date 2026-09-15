/* =====================================================================
   Deriva a paleta do site a partir da cor de marca cadastrada.

   O sistema BMW não traz uma cor: traz uma RELAÇÃO entre cores. O azul
   corporativo #1c69d4 é hsl(217 77% 47%); a faixa escura #1a2129 é
   hsl(214 21% 13%) — mesmo matiz, saturação em ~27% da original,
   luminosidade travada em 13%. O estado pressionado #0653b6 é o mesmo
   matiz com mais saturação e 10 pontos a menos de luz.

   Reproduzir essa relação sobre a cor de cada revenda é o que faz o
   site parecer daquela loja sem perder a gramática do sistema.
   ===================================================================== */

export interface Hsl { h: number; s: number; l: number; }

/** Lê o formato guardado no banco: "191 78% 21%". */
export function lerHsl(valor?: string | null): Hsl | null {
  if (!valor) return null;
  const m = valor.trim().match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (!m) return null;
  return { h: Number(m[1]), s: Number(m[2]), l: Number(m[3]) };
}

const limite = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
export const escreverHsl = ({ h, s, l }: Hsl) => `hsl(${h} ${s}% ${l}%)`;

/** Estado pressionado do botão primário. */
export const pressionada = (c: Hsl): Hsl => ({
  h: c.h,
  s: limite(c.s + 16, 0, 100),
  l: limite(c.l - 10, 6, 100),
});

/**
 * Faixa escura de herói. Não é a cor da marca escurecida — é um neutro
 * que carrega o matiz da marca. Saturação alta num bloco desse tamanho
 * vira parede colorida e engole a fotografia.
 */
export const faixaEscura = (c: Hsl): Hsl => ({
  h: c.h,
  s: limite(c.s * 0.28, 8, 26),
  l: 13,
});

export const faixaEscuraElevada = (c: Hsl): Hsl => ({
  ...faixaEscura(c),
  l: 18,
});

/** Luminância relativa, para decidir texto claro ou escuro por cima. */
function luminancia({ h, s, l }: Hsl): number {
  const sn = s / 100, ln = l / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const a = sn * Math.min(ln, 1 - ln);
    return ln - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  const canal = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * canal(f(0)) + 0.7152 * canal(f(8)) + 0.0722 * canal(f(4));
}

export const contraste = (a: Hsl, b: Hsl) => {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/** Texto legível sobre a cor, caso o cadastro não tenha definido. */
export const textoSobre = (c: Hsl): Hsl =>
  contraste(c, { h: 0, s: 0, l: 100 }) >= 4.5 ? { h: 0, s: 0, l: 100 } : { h: c.h, s: 20, l: 12 };

/* =====================================================================
   Extração de paleta a partir do logotipo.

   Roda inteiramente no navegador, em canvas — nenhum serviço externo,
   nenhuma chamada paga. O logo já está hospedado no bucket público, que
   devolve CORS liberado, então o canvas não fica marcado ("tainted") e
   dá para ler os pixels.
   ===================================================================== */

export interface Amostra {
  hsl: Hsl;
  hex: string;
  /** Fração dos pixels úteis ocupada por esta cor. */
  peso: number;
  /** Contraste do melhor texto possível sobre ela. */
  contrasteTexto: number;
  /** Serve como cor de botão sem reprovar o mínimo de 4.5:1. */
  serveComoPrimaria: boolean;
}

export function rgbParaHsl(r: number, g: number, b: number): Hsl {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0));
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hexParaHsl(hex: string): Hsl | null {
  const m = hex.trim().replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(m)) return null;
  return rgbParaHsl(parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16));
}

export function hslParaHex({ h, s, l }: Hsl): string {
  const sn = s / 100, ln = l / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const a = sn * Math.min(ln, 1 - ln);
    const v = ln - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * v).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

const BRANCO: Hsl = { h: 0, s: 0, l: 100 };
const TINTA: Hsl = { h: 0, s: 0, l: 12 };

/** Duas cores próximas demais para ficarem lado a lado como opções. */
const parecidas = (a: Hsl, b: Hsl) => {
  const dh = Math.min(Math.abs(a.h - b.h), 360 - Math.abs(a.h - b.h));
  return dh < 20 && Math.abs(a.l - b.l) < 14 && Math.abs(a.s - b.s) < 25;
};

export async function extrairPaleta(url: string, maximo = 6): Promise<Amostra[]> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = url;

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("nao_carregou"));
  });

  const lado = 72;
  const canvas = document.createElement("canvas");
  canvas.width = lado;
  canvas.height = lado;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("sem_canvas");
  ctx.drawImage(img, 0, 0, lado, lado);

  let dados: Uint8ClampedArray;
  try {
    dados = ctx.getImageData(0, 0, lado, lado).data;
  } catch {
    // Canvas marcado: a imagem veio de uma origem sem CORS liberado.
    throw new Error("sem_permissao");
  }

  // Agrupa em caixas de 4 bits por canal — 4096 gavetas. Quantizar antes
  // de contar é o que impede um degradê de virar mil cores distintas.
  const caixas = new Map<number, { r: number; g: number; b: number; n: number }>();
  let uteis = 0;

  for (let i = 0; i < dados.length; i += 4) {
    const a = dados[i + 3];
    if (a < 128) continue; // pixel transparente: fundo do logo, não cor da marca
    const r = dados[i], g = dados[i + 1], b = dados[i + 2];
    uteis++;
    const chave = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const atual = caixas.get(chave);
    if (atual) { atual.r += r; atual.g += g; atual.b += b; atual.n++; }
    else caixas.set(chave, { r, g, b, n: 1 });
  }

  if (!uteis) throw new Error("imagem_vazia");

  const todas = [...caixas.values()]
    .map((c) => {
      const hsl = rgbParaHsl(Math.round(c.r / c.n), Math.round(c.g / c.n), Math.round(c.b / c.n));
      const melhor = Math.max(contraste(hsl, BRANCO), contraste(hsl, TINTA));
      return {
        hsl, hex: hslParaHex(hsl), peso: c.n / uteis,
        contrasteTexto: melhor,
        serveComoPrimaria: contraste(hsl, BRANCO) >= 4.5 || contraste(hsl, TINTA) >= 4.5,
      } as Amostra;
    })
    .sort((a, b) => b.peso - a.peso);

  // Cinzas e extremos quase sempre são fundo ou contorno, não a cor da
  // marca. Ficam de fora enquanto houver cor de verdade.
  const coloridas = todas.filter((c) => c.hsl.s >= 15 && c.hsl.l >= 8 && c.hsl.l <= 92);
  const base = coloridas.length ? coloridas : todas;

  // Cor parecida não é descartada: o peso dela SOMA na que ficou. Sem
  // isto um logo com degradê espalha a mesma cor por dezenas de gavetas
  // e todas as amostras aparecem com "0% do logo".
  const escolhidas: Amostra[] = [];
  for (const c of base) {
    const irma = escolhidas.find((e) => parecidas(e.hsl, c.hsl));
    if (irma) { irma.peso += c.peso; continue; }
    if (escolhidas.length < maximo) escolhidas.push({ ...c });
  }
  return escolhidas.sort((a, b) => b.peso - a.peso);
}
