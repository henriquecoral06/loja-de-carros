import { count, eq } from "drizzle-orm";
import { ExternalLink, Inbox, LayoutDashboard, LayoutTemplate, LogOut, Menu, PlugZap, Settings, UsersRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Form, Link, NavLink, Outlet, useLocation } from "react-router";
import { db, schema } from "~/.server/db";
import { exigirUsuario } from "~/.server/sessao";
import { cn } from "~/lib/ui";
import { useLoja } from "~/lib/useLoja";
import type { Route } from "./+types/layout";

export async function loader({ request }: Route.LoaderArgs) {
  const usuario = await exigirUsuario(request);
  const [{ novos }] = await db.select({ novos: count() }).from(schema.leads).where(eq(schema.leads.status, "novo"));
  return { usuario, novos };
}

function IconeCarro({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 17h14v-4.5l-1.8-4.6A2 2 0 0 0 15.3 6.6H8.7a2 2 0 0 0-1.9 1.3L5 12.5V17Z" /><path d="M5 12.5h14" />
      <circle cx="8" cy="17" r="1.6" /><circle cx="16" cy="17" r="1.6" />
    </svg>
  );
}

export default function AdminLayout({ loaderData }: Route.ComponentProps) {
  const { usuario, novos } = loaderData;
  const loja = useLoja();
  const { pathname } = useLocation();
  const [aberto, setAberto] = useState(false);
  useEffect(() => setAberto(false), [pathname]);

  const itens = [
    { to: "/admin", rotulo: "Dashboard", icone: LayoutDashboard, fim: true },
    { to: "/admin/veiculos", rotulo: "Veículos", icone: IconeCarro },
    { to: "/admin/landing-pages", rotulo: "Landing Pages", icone: LayoutTemplate },
    { to: "/admin/leads", rotulo: "Leads", icone: Inbox, contador: novos },
    { to: "/admin/vendedores", rotulo: "Vendedores", icone: UsersRound },
    { to: "/admin/integracoes", rotulo: "Integrações", icone: PlugZap },
    { to: "/admin/configuracoes", rotulo: "Configurações", icone: Settings },
  ];

  const marca = (
    <Link to="/admin" className="flex min-w-0 items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-white">
        {loja.logo ? <img src={loja.logo} alt="" className="max-h-7 max-w-8 object-contain" /> : <IconeCarro className="size-6 text-tinta" />}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[15px] font-bold text-white">{loja.nome}</span>
        <span className="block text-xs text-white/55">Painel administrativo</span>
      </span>
    </Link>
  );

  const barra = (
    <div className="flex h-full flex-col">
      <div className="px-4 py-5">{marca}</div>
      <nav aria-label="Painel" className="flex-1 overflow-y-auto px-3">
        <ul className="grid gap-0.5">
          {itens.map(({ to, rotulo, icone: Icone, fim, contador }) => (
            <li key={to}>
              <NavLink to={to} end={fim}
                className={({ isActive }) => cn("relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors",
                  isActive ? "bg-white/10 text-white" : "text-white/75 hover:bg-white/5 hover:text-white")}>
                <Icone className="size-[18px] shrink-0" />
                {rotulo}
                {!!contador && (
                  <span className="numeros ml-auto rounded-full bg-marca-600 px-2 py-0.5 text-xs font-semibold text-sobre-marca">
                    {contador}<span className="sr-only"> novos</span>
                  </span>
                )}
              </NavLink>
            </li>
          ))}
          <li>
            <a href="/" target="_blank" rel="noopener" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium text-white/75 hover:bg-white/5 hover:text-white">
              <ExternalLink className="size-[18px]" aria-hidden="true" /> Ver site
            </a>
          </li>
        </ul>
      </nav>
      <div className="border-t border-white/10 px-4 py-4">
        <p className="truncate text-sm font-semibold text-white">{usuario.nome}</p>
        <p className="truncate text-xs text-white/55">{usuario.email}</p>
        <Form method="post" action="/admin/sair" className="mt-3">
          <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-white/75 hover:bg-white/5 hover:text-white">
            <LogOut className="size-4" aria-hidden="true" /> Sair
          </button>
        </Form>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-[#f6f6f7]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 bg-painel lg:block">{barra}</aside>

      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 bg-painel px-4 lg:hidden">
        <button type="button" onClick={() => setAberto(true)} className="grid size-10 place-items-center rounded-lg text-white hover:bg-white/10" aria-label="Abrir menu">
          <Menu className="size-6" />
        </button>
        <div className="min-w-0 flex-1">{marca}</div>
      </header>
      {aberto && (
        <div className="fixed inset-0 z-50 bg-black/50 lg:hidden" onClick={(e) => e.target === e.currentTarget && setAberto(false)}>
          <aside className="relative h-full w-72 max-w-[85%] bg-painel">
            <button type="button" onClick={() => setAberto(false)} className="absolute right-2 top-5 grid size-10 place-items-center rounded-lg text-white hover:bg-white/10" aria-label="Fechar menu">
              <X className="size-5" />
            </button>
            {barra}
          </aside>
        </div>
      )}

      <main className="min-w-0 px-4 pb-28 pt-6 sm:px-8 sm:pt-8 lg:ml-64">
        <Outlet />
      </main>
    </div>
  );
}

/** Erro no próprio layout (ex.: banco fora do ar): página simples com saída. */
export function ErrorBoundary() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#f6f6f7] p-6">
      <div className="max-w-md rounded-xl border border-linha bg-white p-8 text-center">
        <h1 className="text-xl font-bold text-tinta">O painel está indisponível agora</h1>
        <p className="mt-2 text-suave">Tente de novo em alguns instantes.</p>
        <button type="button" onClick={() => window.location.reload()} className="botao-primario mt-6">Tentar de novo</button>
      </div>
    </main>
  );
}
