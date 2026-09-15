import { Link, NavLink, Outlet } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { useConfig } from "@/hooks/useConfig";
import { linkWhatsApp, cn } from "@/lib/utils";

const rotas = [
  { para: "/", rotulo: "Início" },
  { para: "/estoque", rotulo: "Estoque" },
  { para: "/sobre", rotulo: "A revenda" },
  { para: "/contato", rotulo: "Contato" },
];

export default function Layout() {
  const { data: config } = useConfig();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="container flex items-center justify-between h-16 gap-4">
          <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg">
            {config?.logo_url
              ? <img src={config.logo_url} alt={config.nome} className="h-9 w-auto" />
              : <span>{config?.nome ?? "Revenda"}</span>}
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {rotas.map((r) => (
              <NavLink
                key={r.para}
                to={r.para}
                className={({ isActive }) =>
                  cn("px-3 py-2 text-sm rounded-md transition-colors hover:bg-muted",
                     isActive && "text-primary font-semibold")}
              >
                {r.rotulo}
              </NavLink>
            ))}
          </nav>

          {config?.whatsapp && (
            <a
              href={linkWhatsApp(config.whatsapp, `Olá! Vim pelo site da ${config.nome}.`)}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
          )}
        </div>
      </header>

      <main className="flex-1"><Outlet /></main>

      <footer className="border-t bg-muted/40 mt-16">
        <div className="container py-10 grid gap-8 md:grid-cols-3 text-sm">
          <div>
            <p className="font-display font-bold text-base">{config?.nome}</p>
            {config?.endereco && (
              <p className="text-muted-foreground mt-2">
                {config.endereco}<br />{config.cidade} · {config.uf}
              </p>
            )}
          </div>
          <div>
            <p className="font-semibold mb-2">Atendimento</p>
            <ul className="text-muted-foreground space-y-1">
              {(config?.horarios ?? []).map((h) => (
                <li key={h.dia}>{h.dia}: {h.fechado ? "fechado" : `${h.abre} às ${h.fecha}`}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2">Contato</p>
            <ul className="text-muted-foreground space-y-1">
              {config?.telefone && <li>{config.telefone}</li>}
              {config?.email && <li>{config.email}</li>}
            </ul>
            <nav className="mt-4 flex flex-col gap-1">
              <Link to="/privacidade" className="hover:underline">Política de privacidade</Link>
              <Link to="/termos" className="hover:underline">Termos de uso</Link>
            </nav>
          </div>
        </div>
        {(config?.razao_social || config?.cnpj) && (
          <div className="container pb-6 text-xs text-muted-foreground">
            {config?.razao_social} {config?.cnpj && `· CNPJ ${config.cnpj}`}
          </div>
        )}
      </footer>

      {config?.whatsapp && (
        <a
          href={linkWhatsApp(config.whatsapp, `Olá! Vim pelo site da ${config.nome}.`)}
          target="_blank" rel="noopener noreferrer"
          aria-label="Falar no WhatsApp"
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--whatsapp))] text-white shadow-lg"
        >
          <MessageCircle className="h-6 w-6" />
        </a>
      )}
    </div>
  );
}
