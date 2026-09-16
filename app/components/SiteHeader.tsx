import { LogOut, Menu, Plus, Search, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Form, Link, NavLink, useLocation, useSearchParams } from "react-router";
import type { UsuarioLogado } from "~/.server/sessao";
import { Logo } from "./Logo";

export function SiteHeader({ usuario }: { usuario: Pick<UsuarioLogado, "nome"> | null }) {
  const [aberto, setAberto] = useState(false);
  const { pathname } = useLocation();
  const [params] = useSearchParams();

  // Fecha o menu do celular ao navegar, senão ele cobre a página nova.
  useEffect(() => setAberto(false), [pathname]);

  const primeiroNome = usuario?.nome.split(" ")[0];

  return (
    <header className="sticky top-0 z-40 border-b border-linha bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="conteiner flex h-16 items-center gap-4 lg:gap-8">
        <Logo />

        <Form method="get" action="/carros" role="search" className="relative hidden max-w-md flex-1 md:block">
          <label htmlFor="busca-topo" className="sr-only">Buscar carros</label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-fraco" aria-hidden="true" />
          <input
            id="busca-topo" name="q" type="search"
            defaultValue={pathname.startsWith("/carros") ? params.get("q") ?? "" : ""}
            placeholder="Busque por marca, modelo ou versão"
            className="campo h-10 rounded-full bg-fundo pl-10 hover:bg-white focus:bg-white"
          />
        </Form>

        <nav aria-label="Principal" className="ml-auto hidden items-center gap-1 lg:flex">
          <NavLink to="/carros" className={({ isActive }) => `botao-fantasma h-10 px-3.5 text-sm ${isActive ? "text-marca-700" : ""}`}>
            Comprar
          </NavLink>
          <NavLink to="/painel/anuncios/novo" className="botao-fantasma h-10 px-3.5 text-sm">
            Vender
          </NavLink>
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          {usuario ? (
            <div className="hidden items-center gap-1 sm:flex">
              <Link to="/painel" className="botao-fantasma h-10 px-3 text-sm">
                <UserRound className="size-[18px]" aria-hidden="true" /> {primeiroNome}
              </Link>
              <Form method="post" action="/sair">
                <button type="submit" className="botao-fantasma h-10 w-10 px-0" aria-label="Sair">
                  <LogOut className="size-[18px]" aria-hidden="true" />
                </button>
              </Form>
            </div>
          ) : (
            <Link to="/entrar" className="botao-fantasma hidden h-10 px-3.5 text-sm sm:inline-flex">Entrar</Link>
          )}

          <Link to="/painel/anuncios/novo" className="botao-primario hidden h-10 px-4 text-sm sm:inline-flex">
            <Plus className="size-4" aria-hidden="true" /> Anunciar grátis
          </Link>

          <button type="button" onClick={() => setAberto((v) => !v)}
            className="botao-fantasma h-10 w-10 px-0 lg:hidden"
            aria-expanded={aberto} aria-controls="menu-celular" aria-label={aberto ? "Fechar menu" : "Abrir menu"}>
            {aberto ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {aberto && (
        <div id="menu-celular" className="border-t border-linha bg-white lg:hidden">
          <div className="conteiner flex flex-col gap-1 py-4">
            <Form method="get" action="/carros" role="search" className="relative mb-3 md:hidden">
              <label htmlFor="busca-celular" className="sr-only">Buscar carros</label>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-fraco" aria-hidden="true" />
              <input id="busca-celular" name="q" type="search" placeholder="Marca, modelo ou versão" className="campo pl-10" />
            </Form>
            <Link to="/carros" className="rounded-lg px-3 py-3 font-semibold text-tinta hover:bg-fundo">Comprar carros</Link>
            <Link to="/painel/anuncios/novo" className="rounded-lg px-3 py-3 font-semibold text-tinta hover:bg-fundo">Vender meu carro</Link>
            {usuario ? (
              <>
                <Link to="/painel" className="rounded-lg px-3 py-3 font-semibold text-tinta hover:bg-fundo">Meu painel</Link>
                <Form method="post" action="/sair">
                  <button type="submit" className="w-full rounded-lg px-3 py-3 text-left font-semibold text-tinta hover:bg-fundo">Sair</button>
                </Form>
              </>
            ) : (
              <Link to="/entrar" className="rounded-lg px-3 py-3 font-semibold text-tinta hover:bg-fundo">Entrar ou criar conta</Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
