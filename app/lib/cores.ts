import type { CSSProperties } from "react";

/**
 * Paleta do site a partir de duas cores escolhidas no painel. Roda no
 * servidor (CSS injetado no <head>) e no navegador (prévia ao vivo em
 * Admin → Aparência), por isso não depende de nada além de matemática.
 */

export const COR_HEX = /^#[0-9a-f]{6}$/i;
export const CORES_PADRAO = { primaria: "#d3141f", escura: "#22232d" } as const;

type RGB = [number, number, number];

const paraRgb = (hex: string): RGB => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB;
const paraHex = (rgb: RGB) => `#${rgb.map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, "0")).join("")}`;

/** Mistura `a` com `b`; `t` = quanto de `b` (0 a 1). */
export const misturar = (a: string, b: string, t: number) => {
  const [x, y] = [paraRgb(a), paraRgb(b)];
  return paraHex(x.map((c, i) => c + (y[i] - c) * t) as RGB);
};

const luminancia = (hex: string) => {
  const [r, g, b] = paraRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** Razão de contraste WCAG entre duas cores (1 a 21). */
export const contraste = (a: string, b: string) => {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

const BRANCO = "#ffffff";
const PRETO = "#000000";
const TINTA = "#1b1d26";

/** Escurece até atingir o contraste pedido sobre branco. */
function escurecerAte(hex: string, alvo: number, minimo = 0) {
  let t = minimo;
  let cor = misturar(hex, PRETO, t);
  while (contraste(cor, BRANCO) < alvo && t < 1) {
    t += 0.04;
    cor = misturar(hex, PRETO, t);
  }
  return cor;
}

export function paleta(primariaEntrada: string, escuraEntrada: string) {
  const primaria = COR_HEX.test(primariaEntrada) ? primariaEntrada.toLowerCase() : CORES_PADRAO.primaria;
  const escura = COR_HEX.test(escuraEntrada) ? escuraEntrada.toLowerCase() : CORES_PADRAO.escura;

  // Texto sobre a cor principal: branco quando dá leitura; senão, grafite.
  const sobreMarca = contraste(primaria, BRANCO) >= 4.5 || contraste(primaria, BRANCO) >= contraste(primaria, TINTA) ? BRANCO : TINTA;

  return {
    "marca-50": misturar(primaria, BRANCO, 0.92),
    "marca-100": misturar(primaria, BRANCO, 0.84),
    "marca-200": misturar(primaria, BRANCO, 0.66),
    "marca-500": misturar(primaria, BRANCO, 0.12),
    "marca-600": primaria,
    // 700 e 800 aparecem como texto de link sobre branco: sempre legíveis.
    "marca-700": escurecerAte(primaria, 4.8, 0.12),
    "marca-800": escurecerAte(primaria, 7, 0.28),
    "marca-hover": misturar(primaria, sobreMarca === BRANCO ? PRETO : BRANCO, 0.14),
    "sobre-marca": sobreMarca,
    noite: escura,
    "noite-2": misturar(escura, BRANCO, 0.07),
  };
}

/** Bloco CSS com as variáveis do tema. Só produz hex validado: sem injeção de CSS. */
export function cssTema(primaria: string, escura: string) {
  const p = paleta(primaria, escura);
  return `:root{${Object.entries(p).map(([k, v]) => `--color-${k}:${v}`).join(";")}}`;
}

/** Variáveis como objeto de estilo React, para a prévia no painel. */
export function estiloTema(primaria: string, escura: string) {
  return Object.fromEntries(Object.entries(paleta(primaria, escura)).map(([k, v]) => [`--color-${k}`, v])) as CSSProperties;
}

/** Problemas de legibilidade que o painel mostra antes de salvar. */
export function avisosCores(primaria: string, escura: string) {
  const avisos: string[] = [];
  if (!COR_HEX.test(primaria) || !COR_HEX.test(escura)) return ["Use cores no formato #RRGGBB."];
  const p = paleta(primaria, escura);
  if (contraste(primaria, p["sobre-marca"]) < 4.5) avisos.push("O texto dos botões fica difícil de ler nessa cor principal. Prefira um tom mais escuro ou mais claro.");
  if (contraste(primaria, BRANCO) < 3) avisos.push("A cor principal é clara: botões e selos vão se destacar pouco do fundo branco.");
  if (contraste(escura, BRANCO) < 7) avisos.push("A cor escura precisa ser bem escura: textos brancos vão por cima dela no topo e no rodapé.");
  return avisos;
}

export const PREDEFINIDAS = [
  { nome: "Vermelho", primaria: "#d3141f", escura: "#22232d" },
  { nome: "Azul", primaria: "#0b5cd6", escura: "#0f1b2d" },
  { nome: "Verde", primaria: "#066c3c", escura: "#131211" },
  { nome: "Laranja", primaria: "#c2410c", escura: "#1c1917" },
  { nome: "Grafite", primaria: "#1f2937", escura: "#0b0f19" },
  { nome: "Roxo", primaria: "#6d28d9", escura: "#1a1333" },
] as const;
