import { Menu, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Form, NavLink, useLocation, useSearchParams } from "react-router";
import { useLoja } from "~/lib/useLoja";
import { cn } from "~/lib/ui";
import { Logo } from "./Logo";
import { IconeWhatsApp, LinkWhatsApp } from "./WhatsApp";

const LINKS = [
  { para: "/carros", rotulo: "Estoque" },
  { para: "/venda-seu-carro", rotulo: "Venda seu carro" },
  { para: "/sobre", rotulo: "A loja" },
  { para: "/contato", rotulo: "Contato" },
];

function Busca({ id, className }: { id: string; className?: string }) {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  return (
    <Form method="get" action="/carros" role="search" className={cn("relative", className)}>
      <label htmlFor={id} className="sr-only">Buscar no estoque</label>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-fraco" aria-hidden="true" />
      <input id={id} name="q" type="search" key={pathname.startsWith("/carros") ? params.get("q") ?? "" : "vazio"}
        defaultValue={pathname.startsWith("/carros") ? params.get("q") ?? "" : ""}
        placeholder="Buscar carro" enterKeyHint="search"
        className="campo h-11 rounded-full bg-fundo pl-10 hover:bg-white focus:bg-white" />
    </Form>
  );
}

export function SiteHeader() {
  const loja = useLoja();
  const [aberto, setAberto] = useState(false);
  const { pathname } = useLocation();

  // Fecha o menu do celular ao navegar, senão ele cobre a página nova.
  useEffect(() => setAberto(false), [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-linha bg-white">
      <div className="conteiner flex h-[72px] items-center gap-4 lg:gap-8">
        <Logo loja={loja} />

        <Busca id="busca-topo" className="hidden min-w-44 max-w-md flex-1 md:block" />

        <nav aria-label="Principal" className="ml-auto hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <NavLink key={l.para} to={l.para}
              className={({ isActive }) => cn("relative flex h-11 items-center whitespace-nowrap px-3 text-[15px] font-semibold text-tinta transition-colors hover:text-marca-700",
                isActive && "text-marca-700 after:absolute after:inset-x-3 after:-bottom-[14px] after:h-[3px] after:rounded-full after:bg-marca-600")}>
              {l.rotulo}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <LinkWhatsApp className="botao-primario hidden h-11 whitespace-nowrap px-4 text-sm sm:inline-flex xl:px-5">
            <IconeWhatsApp className="size-[18px]" /> <span className="xl:hidden">WhatsApp</span><span className="hidden xl:inline">Fale com a loja</span>
          </LinkWhatsApp>
          <button type="button" onClick={() => setAberto((v) => !v)} className="botao-fantasma size-11 px-0 lg:hidden"
            aria-expanded={aberto} aria-controls="menu-celular" aria-label={aberto ? "Fechar menu" : "Abrir menu"}>
            {aberto ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>

      {aberto && (
        <div id="menu-celular" className="border-t border-linha bg-white shadow-card lg:hidden">
          <div className="conteiner grid gap-1 py-4">
            <Busca id="busca-celular" className="mb-3 md:hidden" />
            <nav aria-label="Menu" className="grid">
              {LINKS.map((l) => (
                <NavLink key={l.para} to={l.para}
                  className={({ isActive }) => cn("rounded-lg px-3 py-3 text-base font-semibold hover:bg-fundo", isActive ? "text-marca-700" : "text-tinta")}>
                  {l.rotulo}
                </NavLink>
              ))}
            </nav>
            <LinkWhatsApp className="botao-primario mt-3 w-full sm:hidden">
              <IconeWhatsApp className="size-[18px]" /> Fale com a loja
            </LinkWhatsApp>
          </div>
        </div>
      )}
    </header>
  );
}
