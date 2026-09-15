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
