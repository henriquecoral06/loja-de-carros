import { Link } from "react-router";

type Erros = Partial<Record<"nome" | "email" | "telefone" | "texto", string>>;

/** Campos do formulário de mensagem, com a armadilha anti-robô. O <form> fica com quem usa. */
export function CamposMensagem({ erros = {}, prefixo, textoPadrao = "" }: { erros?: Erros; prefixo: string; textoPadrao?: string }) {
  return (
    <div className="grid gap-3">
      {/* Campo invisível: gente não preenche, robô preenche. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 overflow-hidden">
        <label htmlFor={`${prefixo}-empresa`}>Empresa</label>
        <input id={`${prefixo}-empresa`} name="empresa" tabIndex={-1} autoComplete="off" />
      </div>
      {([
        ["nome", "Nome", "text", "name"],
        ["email", "E-mail", "email", "email"],
        ["telefone", "Telefone com DDD", "tel", "tel"],
      ] as const).map(([nome, rotulo, tipo, auto]) => (
        <div key={nome}>
          <label htmlFor={`${prefixo}-${nome}`} className="rotulo">{rotulo}</label>
          <input id={`${prefixo}-${nome}`} name={nome} type={tipo} autoComplete={auto} className="campo"
            aria-invalid={erros[nome] ? true : undefined} aria-describedby={erros[nome] ? `${prefixo}-erro-${nome}` : undefined} />
          {erros[nome] && <p id={`${prefixo}-erro-${nome}`} className="mt-1 text-sm text-erro">{erros[nome]}</p>}
        </div>
      ))}
      <div>
        <label htmlFor={`${prefixo}-texto`} className="rotulo">Mensagem</label>
        <textarea id={`${prefixo}-texto`} name="texto" rows={4} defaultValue={textoPadrao} className="campo"
          aria-invalid={erros.texto ? true : undefined} aria-describedby={erros.texto ? `${prefixo}-erro-texto` : undefined} />
        {erros.texto && <p id={`${prefixo}-erro-texto`} className="mt-1 text-sm text-erro">{erros.texto}</p>}
      </div>
      <p className="text-xs leading-relaxed text-suave">
        Ao enviar, você concorda com a <Link to="/privacidade" className="underline">política de privacidade</Link>.
      </p>
    </div>
  );
}
