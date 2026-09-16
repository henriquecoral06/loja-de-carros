import { useRouteLoaderData } from "react-router";
import type { loader } from "~/root";

/** Dados da loja carregados pelo loader raiz. */
export function useLoja() {
  const dados = useRouteLoaderData<typeof loader>("root");
  if (!dados) throw new Error("useLoja() sem os dados da raiz");
  return dados.loja;
}

export function useRastreamento() {
  return useRouteLoaderData<typeof loader>("root")?.rastreamento;
}
