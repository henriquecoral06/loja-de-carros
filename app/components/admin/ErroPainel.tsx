import { RotateCcw, TriangleAlert } from "lucide-react";
import { isRouteErrorResponse, Link, useRouteError } from "react-router";

/**
 * Erro dentro de uma tela do painel. Fica no lugar do conteúdo, com o menu
 * lateral intacto, e mostra o motivo para a equipe (só usuários logados
 * chegam aqui).
 */
export function ErroPainel() {
  const erro = useRouteError();
  const naoEncontrado = isRouteErrorResponse(erro) && erro.status === 404;
  const detalhe = isRouteErrorResponse(erro)
    ? typeof erro.data === "string" ? erro.data : `HTTP ${erro.status}`
    : erro instanceof Error ? erro.message : "";

  return (
    <div role="alert" className="max-w-2xl rounded-xl border border-erro/20 bg-white p-6 sm:p-8">
      <p className="flex items-center gap-2 text-sm font-semibold text-erro"><TriangleAlert className="size-4" aria-hidden="true" /> {naoEncontrado ? "Não encontrado" : "Erro"}</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-tinta">{naoEncontrado ? "Esse item não existe mais" : "Não foi possível carregar esta tela"}</h1>
      <p className="mt-2 text-suave">{naoEncontrado ? "Ele pode ter sido excluído por outra pessoa da equipe." : "Nada foi perdido. Tente de novo; se continuar, envie a mensagem abaixo para o suporte."}</p>
      {detalhe && !naoEncontrado && <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-lg bg-fundo p-3 text-xs text-texto">{detalhe}</pre>}
      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" onClick={() => window.location.reload()} className="botao-primario h-10 px-4 text-sm"><RotateCcw className="size-4" aria-hidden="true" /> Tentar de novo</button>
        <Link to="/admin" className="botao-secundario h-10 px-4 text-sm">Ir para o Dashboard</Link>
      </div>
    </div>
  );
}
