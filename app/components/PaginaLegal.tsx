import type { ReactNode } from "react";

export function PaginaLegal({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <article className="conteiner max-w-3xl py-12">
      <h1 className="text-3xl font-extrabold tracking-tight text-tinta">{titulo}</h1>
      <p className="mt-3 rounded-lg bg-alerta-fundo px-3 py-2 text-sm text-alerta">
        Modelo de referência. Revise com um advogado antes de publicar.
      </p>
      <div className="mt-8 space-y-4 leading-relaxed text-texto [&_h2]:pt-4 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-tinta [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        {children}
      </div>
    </article>
  );
}
