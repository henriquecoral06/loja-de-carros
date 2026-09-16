import { count, eq } from "drizzle-orm";
import { ExternalLink, Inbox, KeyRound, LayoutGrid, LogOut, Plus, Store, Users } from "lucide-react";
import { Form, Link, NavLink, Outlet } from "react-router";
import { db, schema } from "~/.server/db";
import { obterLoja } from "~/.server/loja";
import { exigirUsuario } from "~/.server/sessao";
import { cn } from "~/lib/ui";
import type { Route } from "./+types/layout";

export async function loader({ request }: Route.LoaderArgs) {
  const usuario = await exigirUsuario(request);
  const [loja, [{ naoLidas }]] = await Promise.all([
    obterLoja(),
    db.select({ naoLidas: count() }).from(schema.mensagens).where(eq(schema.mensagens.lida, false)),
  ]);
  return { usuario, naoLidas, nomeLoja: loja.nome, lojaPreenchida: loja.atualizadoEm > 0 };
}

export default function AdminLayout({ loaderData }: Route.ComponentProps) {
  const { usuario, naoLidas, nomeLoja, lojaPreenchida } = loaderData;
  const itens = [
    { to: "/admin", rotulo: "Estoque", icone: LayoutGrid, fim: true },
    { to: "/admin/mensagens", rotulo: "Mensagens", icone: Inbox, contador: naoLidas },
    { to: "/admin/loja", rotulo: "Dados da loja", icone: Store },
    { to: "/admin/equipe", rotulo: "Equipe", icone: Users },
    { to: "/admin/senha", rotulo: "Minha senha", icone: KeyRound },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-noite text-white">
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
          <Link to="/admin" className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-md bg-marca-600 text-sm font-extrabold">
              {nomeLoja.trim().charAt(0).toUpperCase()}
            </span>
            <span className="truncate font-bold">{nomeLoja}</span>
            <span className="hidden rounded bg-white/10 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white/75 sm:inline">Painel</span>
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <a href="/" target="_blank" rel="noopener" className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white">
              <ExternalLink className="size-4" aria-hidden="true" /> <span className="hidden sm:inline">Ver site</span><span className="sr-only sm:hidden">Ver site</span>
            </a>
            <span className="hidden px-2 text-sm text-white/60 md:inline">{usuario.nome.split(" ")[0]}</span>
            <Form method="post" action="/admin/sair">
              <button className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white">
                <LogOut className="size-4" aria-hidden="true" /> Sair
              </button>
            </Form>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1400px] flex-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        <nav aria-label="Painel" className="-mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:overflow-visible lg:px-0">
          <div className="flex gap-1 lg:sticky lg:top-20 lg:flex-col">
            <Link to="/admin/veiculos/novo" className="botao-primario mr-2 h-10 shrink-0 px-4 text-sm lg:mb-3 lg:mr-0">
              <Plus className="size-4" aria-hidden="true" /> Novo veículo
            </Link>
            <ul className="flex gap-1 lg:flex-col">
              {itens.map(({ to, rotulo, icone: Icone, fim, contador }) => (
                <li key={to} className="shrink-0">
                  <NavLink to={to} end={fim}
                    className={({ isActive }) => cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                      isActive ? "bg-white text-marca-700 shadow-card" : "text-suave hover:bg-white/70 hover:text-tinta")}>
                    <Icone className="size-[18px]" aria-hidden="true" />
                    {rotulo}
                    {!!contador && (
                      <span className="numeros ml-auto rounded-full bg-marca-600 px-2 py-0.5 text-xs text-white">
                        {contador}<span className="sr-only"> não lidas</span>
                      </span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </nav>
        <main className="min-w-0">
          {!lojaPreenchida && (
            <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-alerta/20 bg-alerta-fundo px-4 py-3 text-alerta">
              <p className="text-sm font-medium">Preencha nome, WhatsApp e endereço da loja para eles aparecerem no site.</p>
              <Link to="/admin/loja" className="text-sm font-semibold underline">Preencher agora</Link>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </>
  );
}
