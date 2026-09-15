import { NavLink, Navigate, Outlet, Link } from "react-router-dom";
import { Car, Users, LayoutDashboard, Settings, LogOut, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useConfig } from "@/hooks/useConfig";
import { cn } from "@/lib/utils";

const itens = [
  { para: "/admin", rotulo: "Dashboard", icone: LayoutDashboard, fim: true },
  { para: "/admin/veiculos", rotulo: "Estoque", icone: Car },
  { para: "/admin/leads", rotulo: "Leads", icone: Users },
  { para: "/admin/config", rotulo: "A revenda", icone: Settings, soAdmin: true },
];

export default function AdminLayout() {
  const { session, isStaff, isAdmin, carregando, sair } = useAuth();
  const { data: config } = useConfig();

  if (carregando) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando…</div>;
  }
  if (!session) return <Navigate to="/admin/login" replace />;

  if (!isStaff) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="font-display text-xl font-bold">Acesso pendente</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Sua conta foi criada, mas ainda não tem permissão. Peça a um administrador
          para liberar seu acesso.
        </p>
        <button onClick={sair} className="mt-2 rounded-md border px-4 py-2 text-sm font-medium">Sair</button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-56 flex-shrink-0 flex-col border-r bg-card md:flex">
        <div className="border-b p-4">
          <p className="font-display font-bold leading-tight">{config?.nome}</p>
          <p className="text-xs text-muted-foreground">{isAdmin ? "Administrador" : "Vendedor"}</p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-2">
          {itens.filter((i) => !i.soAdmin || isAdmin).map((i) => (
            <NavLink key={i.para} to={i.para} end={i.fim}
              className={({ isActive }) => cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted",
                isActive && "bg-primary/10 font-semibold text-primary")}>
              <i.icone className="h-4 w-4" /> {i.rotulo}
            </NavLink>
          ))}
        </nav>
        <div className="border-t p-2">
          <Link to="/" target="_blank"
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm hover:bg-muted">
            <ExternalLink className="h-4 w-4" /> Ver o site
          </Link>
          <button onClick={sair}
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm hover:bg-muted">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </aside>

      <div className="flex-1 overflow-x-hidden">
        <nav className="flex gap-1 overflow-x-auto border-b bg-card p-2 md:hidden">
          {itens.filter((i) => !i.soAdmin || isAdmin).map((i) => (
            <NavLink key={i.para} to={i.para} end={i.fim}
              className={({ isActive }) => cn("whitespace-nowrap rounded-md px-3 py-1.5 text-sm",
                isActive && "bg-primary/10 font-semibold text-primary")}>
              {i.rotulo}
            </NavLink>
          ))}
          <button onClick={sair} className="ml-auto whitespace-nowrap px-3 py-1.5 text-sm">Sair</button>
        </nav>
        <Outlet />
      </div>
    </div>
  );
}
