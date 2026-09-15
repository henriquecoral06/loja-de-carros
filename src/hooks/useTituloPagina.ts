import { useEffect } from "react";
import { useConfig } from "@/hooks/useConfig";

/**
 * Cada página declara o próprio título. Deixar isso a cargo de um efeito
 * no layout não funciona: em React o efeito do filho roda antes do
 * efeito do pai, então o layout sobrescreveria o título da página.
 *
 * Sem isto, sair da página de um veículo levava o nome dele para todas
 * as rotas seguintes — na aba do navegador e no histórico.
 */
export function useTituloPagina(titulo?: string | null) {
  const { data: config } = useConfig();

  useEffect(() => {
    const marca = config?.meta_title ?? config?.nome ?? "Revenda";
    document.title = titulo ? `${titulo} — ${config?.nome ?? "Revenda"}` : marca;
  }, [titulo, config]);
}
