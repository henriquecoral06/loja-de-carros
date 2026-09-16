import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type Base = { id: string; rotulo: string; erro?: string; dica?: string; className?: string };

/** Rótulo, erro e dica já ligados ao campo por id — leitor de tela lê os três. */
function Envolucro({ id, rotulo, erro, dica, className, children }: Base & { children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="rotulo">{rotulo}</label>
      {children}
      {erro ? (
        <p id={`${id}-erro`} className="mt-1.5 text-sm text-erro">{erro}</p>
      ) : dica ? (
        <p id={`${id}-dica`} className="mt-1.5 text-sm text-suave">{dica}</p>
      ) : null}
    </div>
  );
}

const aria = (id: string, erro?: string, dica?: string) => ({
  "aria-invalid": erro ? (true as const) : undefined,
  "aria-describedby": erro ? `${id}-erro` : dica ? `${id}-dica` : undefined,
});

export function CampoTexto({ id, rotulo, erro, dica, className, ...props }: Base & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Envolucro id={id} rotulo={rotulo} erro={erro} dica={dica} className={className}>
      <input id={id} name={id} className="campo" {...aria(id, erro, dica)} {...props} />
    </Envolucro>
  );
}

export function CampoSelecao({ id, rotulo, erro, dica, className, children, ...props }: Base & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Envolucro id={id} rotulo={rotulo} erro={erro} dica={dica} className={className}>
      <select id={id} name={id} className="campo" {...aria(id, erro, dica)} {...props}>{children}</select>
    </Envolucro>
  );
}

export function CampoArea({ id, rotulo, erro, dica, className, ...props }: Base & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Envolucro id={id} rotulo={rotulo} erro={erro} dica={dica} className={className}>
      <textarea id={id} name={id} className="campo" {...aria(id, erro, dica)} {...props} />
    </Envolucro>
  );
}
