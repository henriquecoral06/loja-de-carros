import { useEffect, useState } from "react";
import { Link } from "react-router";
import { lerOrigem } from "~/lib/rastreamento";
import { cn } from "~/lib/ui";

type Erros = Partial<Record<"nome" | "email" | "telefone" | "texto", string>>;

/** Campos do formulário de mensagem, com a armadilha anti-robô. O <form> fica com quem usa. */
export function CamposMensagem({ erros = {}, prefixo, textoPadrao = "", largo = false, mostrarTexto = true, rotuloTexto = "Mensagem", children }: {
  erros?: Erros; prefixo: string; textoPadrao?: string; largo?: boolean; mostrarTexto?: boolean; rotuloTexto?: string; children?: React.ReactNode;
}) {
  // Origem da visita (utm, gclid…) vai junto: o CRM sabe qual anúncio trouxe o lead.
  const [origem, setOrigem] = useState("");
  // Mesmo id no Pixel (navegador) e na API de Conversões (servidor): o Meta deduplica.
  const [eventId, setEventId] = useState("");
  useEffect(() => { setOrigem(lerOrigem()); setEventId(crypto.randomUUID()); }, []);

  return (
    <div className={cn("grid gap-3", largo && "gap-4 sm:grid-cols-2")}>
      <input type="hidden" name="rastreio" value={origem} />
      <input type="hidden" name="event_id" value={eventId} />
      {/* Campo invisível: gente não preenche, robô preenche. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 overflow-hidden">
        <label htmlFor={`${prefixo}-empresa`}>Empresa</label>
        <input id={`${prefixo}-empresa`} name="empresa" tabIndex={-1} autoComplete="off" />
      </div>
      {([
        ["nome", "Nome", "text", "name"],
        ["telefone", "Telefone ou WhatsApp com DDD", "tel", "tel"],
        ["email", "E-mail (opcional)", "email", "email"],
      ] as const).map(([nome, rotulo, tipo, auto]) => (
        <div key={nome} className={cn(largo && nome === "nome" && "sm:col-span-2")}>
          <label htmlFor={`${prefixo}-${nome}`} className="rotulo">{rotulo}</label>
          <input id={`${prefixo}-${nome}`} name={nome} type={tipo} autoComplete={auto} className="campo"
            aria-invalid={erros[nome] ? true : undefined} aria-describedby={erros[nome] ? `${prefixo}-erro-${nome}` : undefined} />
          {erros[nome] && <p id={`${prefixo}-erro-${nome}`} className="mt-1 text-sm text-erro">{erros[nome]}</p>}
        </div>
      ))}
      {children}
      {mostrarTexto && <div className={cn(largo && "sm:col-span-2")}>
        <label htmlFor={`${prefixo}-texto`} className="rotulo">{rotuloTexto}</label>
        <textarea id={`${prefixo}-texto`} name="texto" rows={4} defaultValue={textoPadrao} className="campo"
          aria-invalid={erros.texto ? true : undefined} aria-describedby={erros.texto ? `${prefixo}-erro-texto` : undefined} />
        {erros.texto && <p id={`${prefixo}-erro-texto`} className="mt-1 text-sm text-erro">{erros.texto}</p>}
      </div>}
      <p className={cn("text-xs leading-relaxed text-suave", largo && "sm:col-span-2")}>
        Ao enviar, você concorda com a <Link to="/privacidade" className="underline">política de privacidade</Link>.
      </p>
    </div>
  );
}
