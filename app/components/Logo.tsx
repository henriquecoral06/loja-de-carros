import { Link } from "react-router";
import { cn } from "~/lib/ui";

type LojaLogo = { nome: string; logo: string | null; logoClaro: string | null };

/**
 * Logo enviado em Admin → Aparência; sem ele, o nome da loja em texto.
 * Em fundo escuro usa a versão clara; se a loja não enviou, o logo normal
 * vai sobre uma plaquinha branca para não sumir.
 */
export function Logo({ loja, claro = false, className }: { loja: LojaLogo; claro?: boolean; className?: string }) {
  const imagem = claro ? loja.logoClaro ?? loja.logo : loja.logo;
  const plaquinha = claro && !loja.logoClaro && loja.logo;

  return (
    <Link to="/" className={cn("flex min-w-0 shrink-0 items-center gap-2.5 rounded-md", className)} aria-label={`${loja.nome} — página inicial`}>
      {imagem ? (
        <span className={cn("flex items-center", plaquinha && "rounded-lg bg-white px-3 py-2")}>
          <img src={imagem} alt={loja.nome} className="h-9 w-auto max-w-[180px] object-contain sm:h-10 sm:max-w-[220px]" />
        </span>
      ) : (
        <>
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-marca-600 text-sobre-marca" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 16h14l-1.6-5.3A2 2 0 0 0 15.5 9h-7a2 2 0 0 0-1.9 1.7L5 16Z" />
              <circle cx="8" cy="16.5" r="1.8" fill="currentColor" stroke="none" />
              <circle cx="16" cy="16.5" r="1.8" fill="currentColor" stroke="none" />
            </svg>
          </span>
          <span className={cn("truncate text-[17px] font-extrabold tracking-tight", claro ? "text-white" : "text-tinta")}>{loja.nome}</span>
        </>
      )}
    </Link>
  );
}
