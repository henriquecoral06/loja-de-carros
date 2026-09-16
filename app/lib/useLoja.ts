import { useRouteLoaderData } from "react-router";
import type { loader } from "~/routes/site";

/** Dados da loja carregados pelo layout público. Só existe dentro de routes/site.tsx. */
export function useLoja() {
  const dados = useRouteLoaderData<typeof loader>("routes/site");
  if (!dados) throw new Error("useLoja() usado fora do layout do site");
  return dados.loja;
}
