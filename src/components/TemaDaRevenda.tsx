import { useEffect } from "react";
import { useConfig } from "@/hooks/useConfig";
import {
  escreverHsl, faixaEscura, faixaEscuraElevada, lerHsl, pressionada, textoSobre,
} from "@/lib/cores";

/**
 * Aplica a identidade da revenda sobre os tokens do site em runtime.
 * É o que faz o mesmo código servir revendas diferentes: quem remixa
 * troca as cores pelo painel, sem tocar em arquivo nenhum.
 *
 * Escreve dois conjuntos: os tokens --s-* do site (gramática BMW) e os
 * tokens shadcn que ainda restam em partes do site.
 */
export function TemaDaRevenda() {
  const { data: config } = useConfig();

  useEffect(() => {
    if (!config) return;
    const raiz = document.documentElement;
    const primaria = lerHsl(config.cor_primaria);
    if (!primaria) return;

    const frente = lerHsl(config.cor_primaria_fg) ?? textoSobre(primaria);

    const cores: Record<string, string> = {
      "--s-primary": escreverHsl(primaria),
      "--s-primary-active": escreverHsl(pressionada(primaria)),
      "--s-on-primary": escreverHsl(frente),
      "--s-surface-dark": escreverHsl(faixaEscura(primaria)),
      "--s-surface-dark-elevated": escreverHsl(faixaEscuraElevada(primaria)),
    };
    for (const [chave, valor] of Object.entries(cores)) raiz.style.setProperty(chave, valor);

    // Guarda para a próxima visita já abrir na cor certa, e só então
    // devolve as transições — senão a troca de cor vira animação.
    try { localStorage.setItem("marca-cores", JSON.stringify(cores)); } catch { /* modo privado */ }
    requestAnimationFrame(() => raiz.removeAttribute("data-marca"));

    // Tokens shadcn remanescentes
    raiz.style.setProperty("--primary", config.cor_primaria);
    raiz.style.setProperty("--primary-foreground", config.cor_primaria_fg);
    raiz.style.setProperty("--ring", config.cor_primaria);
    raiz.style.setProperty("--accent", config.cor_destaque);

    if (config.meta_title) document.title = config.meta_title;
    const descricao = document.querySelector('meta[name="description"]');
    if (descricao && config.meta_description) descricao.setAttribute("content", config.meta_description);
  }, [config]);

  return null;
}
