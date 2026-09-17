import type { ReactNode } from "react";
import { cn } from "~/lib/ui";
import { ROTULO_STATUS, ROTULO_STATUS_LEAD, type StatusAnuncio, type StatusLead } from "~/lib/veiculos";

/** Título da página do painel, com descrição e ação à direita. */
export function Cabecalho({ titulo, descricao, children }: { titulo: string; descricao?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-tinta sm:text-[28px]">{titulo}</h1>
        {descricao && <p className="mt-1 text-[15px] text-suave">{descricao}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

/** Cartão de seção de formulário do painel. */
export function Secao({ titulo, descricao, children, className, id, acao }: { titulo: ReactNode; descricao?: ReactNode; children: ReactNode; className?: string; id?: string; acao?: ReactNode }) {
  const idTitulo = id ? `${id}-titulo` : undefined;
  return (
    <section id={id} aria-labelledby={idTitulo} className={cn("rounded-xl border border-linha bg-white p-5 sm:p-6", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={idTitulo} className="text-[17px] font-bold text-tinta">{titulo}</h2>
          {descricao && <p className="mt-1 text-sm text-suave">{descricao}</p>}
        </div>
        {acao}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export const classeTabela = {
  caixa: "overflow-hidden rounded-xl border border-linha bg-white",
  th: "border-b border-linha bg-[#fafafa] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-suave",
  td: "border-b border-linha px-4 py-3.5 align-middle text-sm last:border-0",
};

const CORES_LEAD: Record<StatusLead, string> = {
  novo: "border-sucesso/30 bg-sucesso-fundo text-sucesso",
  contatado: "border-alerta/30 bg-alerta-fundo text-alerta",
  negociacao: "border-sky-700/25 bg-sky-50 text-sky-800",
  vendido: "border-violet-700/25 bg-violet-50 text-violet-800",
  perdido: "border-linha-forte bg-fundo text-texto",
};
export const corStatusLead = (s: StatusLead) => CORES_LEAD[s];

export function PillLead({ status }: { status: StatusLead }) {
  return <span className={cn("inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold", CORES_LEAD[status])}>{ROTULO_STATUS_LEAD[status]}</span>;
}

const CORES_VEICULO: Record<StatusAnuncio, string> = {
  ativo: "bg-sucesso-fundo text-sucesso",
  pausado: "bg-alerta-fundo text-alerta",
  vendido: "bg-fundo text-suave",
};
export function PillVeiculo({ status }: { status: StatusAnuncio }) {
  return <span className={cn("inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold", CORES_VEICULO[status])}>{ROTULO_STATUS[status]}</span>;
}

/** Aviso de sucesso/erro no topo de um formulário. */
export function Aviso({ tipo, children }: { tipo: "sucesso" | "erro"; children: ReactNode }) {
  return (
    <p role={tipo === "erro" ? "alert" : "status"}
      className={cn("mb-4 rounded-xl border px-4 py-3 text-sm font-medium", tipo === "sucesso" ? "border-sucesso/20 bg-sucesso-fundo text-sucesso" : "border-erro/20 bg-erro-fundo text-erro")}>
      {children}
    </p>
  );
}

/** Barra fixa de salvar no rodapé da tela (desconta a barra lateral no desktop). */
export function BarraSalvar({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-linha bg-white/95 backdrop-blur lg:left-64">
      <div className="flex flex-wrap items-center justify-end gap-3 px-4 py-3 sm:px-8">{children}</div>
    </div>
  );
}
