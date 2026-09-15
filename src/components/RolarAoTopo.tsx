import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Numa SPA o navegador não reposiciona a rolagem ao trocar de rota: quem
 * clicava num carro no meio da listagem chegava no meio da página do
 * carro.
 *
 * Só reage à mudança de CAMINHO, nunca à query string — filtrar o
 * estoque altera a URL, e pular para o topo a cada filtro marcado
 * afastaria a pessoa justamente do resultado que ela acabou de pedir.
 */
export default function RolarAoTopo() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return null;
}
