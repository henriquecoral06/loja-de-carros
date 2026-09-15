import { useEffect } from "react";
import { useConfig } from "@/hooks/useConfig";

/**
 * Aplica a identidade visual guardada no banco sobre os tokens CSS.
 * É o que faz o mesmo código servir revendas diferentes: quem remixa
 * troca as cores pelo painel, sem tocar em arquivo nenhum.
 */
export function TemaDaRevenda() {
  const { data: config } = useConfig();

  useEffect(() => {
    if (!config) return;
    const raiz = document.documentElement;
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
