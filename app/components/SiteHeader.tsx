import { Menu, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Form, Link, NavLink, useLocation, useSearchParams } from "react-router";
import type { DadosLoja } from "~/.server/loja";
import { linkWhatsApp } from "~/lib/formato";
import { Logo } from "./Logo";
import { IconeWhatsApp } from "./WhatsApp";

const LINKS = [
  { para: "/carros", rotulo: "Estoque" },
  { para: "/sobre", rotulo: "A loja" },
  { para: "/contato", rotulo: "Contato" },
];

export function SiteHeader({ loja }: { loja: Pick<DadosLoja, "nome" | "whatsapp"> }) {
  const [aberto, setAberto] = useState(false);
  const { pathname } = useLocation();
  const [params] = useSearchParams();

  // Fecha o menu do celular ao navegar, senão ele cobre a página nova.
  useEffect(() => setAberto(false), [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-linha bg-white">
      <div className="conteiner flex h-16 items-center gap-4 lg:gap-8">
        <Logo nome={loja.nome} />

        <Form method="get" action="/carros" role="search" className="relative hidden max-w-md flex-1 md:block">
          <label htmlFor="busca-topo" className="sr-only">Buscar no estoque</label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-fraco" aria-hidden="true" />
          <input id="busca-topo" name="q" type="search"
            defaultValue={pathname.startsWith("/carros") ? params.get("q") ?? "" : ""}
            placeholder="Busque por marca, modelo ou versão"
            className="campo h-10 rounded-full bg-fundo pl-10 hover:bg-white focus:bg-white" />
        </Form>

        <nav aria-label="Principal" className="ml-auto hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <NavLink key={l.para} to={l.para}
              className={({ isActive }) => `botao-fantasma h-10 px-3.5 text-sm ${isActive ? "text-marca-600" : ""}`}>
              {l.rotulo}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          {loja.whatsapp && (
            <a href={linkWhatsApp(loja.whatsapp, `Olá! Vim pelo site ${loja.nome}.`)} target="_blank" rel="noopener noreferrer"
              className="botao-primario hidden h-10 px-4 text-sm sm:inline-flex">
              <IconeWhatsApp className="size-4" /> Fale com a loja
            </a>
          )}
          <button type="button" onClick={() => setAberto((v) => !v)} className="botao-fantasma h-10 w-10 px-0 lg:hidden"
            aria-expanded={aberto} aria-controls="menu-celular" aria-label={aberto ? "Fechar menu" : "Abrir menu"}>
            {aberto ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {aberto && (
        <div id="menu-celular" className="border-t border-linha bg-white lg:hidden">
          <div className="conteiner flex flex-col gap-1 py-4">
            <Form method="get" action="/carros" role="search" className="relative mb-3 md:hidden">
              <label htmlFor="busca-celular" className="sr-only">Buscar no estoque</label>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-fraco" aria-hidden="true" />
              <input id="busca-celular" name="q" type="search" placeholder="Marca, modelo ou versão" className="campo pl-10" />
            </Form>
            {LINKS.map((l) => (
              <Link key={l.para} to={l.para} className="rounded-lg px-3 py-3 font-semibold text-tinta hover:bg-fundo">{l.rotulo}</Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
