import { and, count, eq } from "drizzle-orm";
import { Inbox, LayoutGrid, Plus, Settings } from "lucide-react";
import { Link, NavLink, Outlet } from "react-router";
import { db, schema } from "~/.server/db";
import { exigirUsuario } from "~/.server/sessao";
import { cn } from "~/lib/ui";
import type { Route } from "./+types/layout";

export const meta = () => [{ name: "robots", content: "noindex" }];

export async function loader({ request }: Route.LoaderArgs) {
  const usuario = await exigirUsuario(request);
  const [{ naoLidas }] = await db.select({ naoLidas: count() }).from(schema.mensagens)
    .where(and(eq(schema.mensagens.vendedorId, usuario.id), eq(schema.mensagens.lida, false)));
  return { usuario, naoLidas };
}

export default function PainelLayout({ loaderData }: Route.ComponentProps) {
  const { usuario, naoLidas } = loaderData;
  const itens = [
    { to: "/painel", rotulo: "Meus anúncios", icone: LayoutGrid, fim: true },
    { to: "/painel/mensagens", rotulo: "Mensagens", icone: Inbox, contador: naoLidas },
    { to: "/painel/conta", rotulo: "Minha conta", icone: Settings },
  ];

  return (
    <div className="conteiner pt-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-suave">Olá, {usuario.nome.split(" ")[0]}</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-tinta">
            {usuario.tipo === "loja" && usuario.nomeLoja ? usuario.nomeLoja : "Meu painel"}
          </h1>
        </div>
        <Link to="/painel/anuncios/novo" className="botao-primario">
          <Plus className="size-4" aria-hidden="true" /> Novo anúncio
        </Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Painel" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          <ul className="flex gap-1 lg:sticky lg:top-24 lg:flex-col">
            {itens.map(({ to, rotulo, icone: Icone, fim, contador }) => (
              <li key={to} className="shrink-0">
                <NavLink to={to} end={fim}
                  className={({ isActive }) => cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                    isActive ? "bg-white text-marca-700 shadow-card" : "text-suave hover:bg-white/70 hover:text-tinta")}>
                  <Icone className="size-[18px]" aria-hidden="true" />
                  {rotulo}
                  {!!contador && (
                    <span className="numeros ml-auto rounded-full bg-marca-600 px-2 py-0.5 text-xs text-white" aria-label={`${contador} não lidas`}>
                      {contador}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0"><Outlet /></div>
      </div>
    </div>
  );
}
