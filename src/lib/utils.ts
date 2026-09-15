import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const moeda = (valor?: number | null) =>
  valor == null
    ? "Sob consulta"
    : valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export const numero = (valor?: number | null) =>
  valor == null ? "—" : valor.toLocaleString("pt-BR");

export const tituloVeiculo = (v: { marca?: string; modelo?: string; versao?: string | null }) =>
  [v.marca, v.modelo, v.versao].filter(Boolean).join(" ");

/** Link wa.me com a mensagem já escrita. Gratuito e sem API. */
export const linkWhatsApp = (numeroLoja: string, texto: string) =>
  `https://wa.me/${numeroLoja.replace(/\D/g, "")}?text=${encodeURIComponent(texto)}`;
