import { useEffect, useState } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import {
  ArrowSquareOut, Car, Gear, SignOut, SquaresFour, UsersThree,
} from "@phosphor-icons/react";
import { useAuth } from "@/hooks/useAuth";
import { useConfig } from "@/hooks/useConfig";
import { Breadcrumbs, Button, SidebarNav, ThemeToggle, type GrupoNav, type Trilha } from "@/components/ui";

/** Árvore única de navegação: o menu e a trilha saem daqui. */
const ARVORE = [
  { to: "/admin", label: "Dashboard", icon: <SquaresFour size={17} />, end: true },
  { to: "/admin/veiculos", label: "Estoque", icon: <Car size={17} /> },
  { to: "/admin/leads", label: "Leads", icon: <UsersThree size={17} /> },
  { to: "/admin/config", label: "A revenda", icon: <Gear size={17} />, soAdmin: true },
];

const CHAVE_MENU = "portal-menu-recolhido";

function trilhaDe(caminho: string): Trilha[] {
  const base: Trilha[] = [{ label: "Portal", href: "/admin" }];
  const no = ARVORE.find((i) => !i.end && caminho.startsWith(i.to));
  if (!no) return caminho === "/admin" ? [{ label: "Dashboard" }] : base;

  const trilha = [...base, { label: no.label, href: caminho === no.to ? undefined : no.to }];
  const resto = caminho.slice(no.to.length).replace(/^\//, "");
  if (resto) trilha.push({ label: resto === "novo" ? "Novo cadastro" : "Edição" });
  return trilha;
}

export default function AdminLayout() {
  const { session, isStaff, isAdmin, carregando, sair } = useAuth();
  const { data: config } = useConfig();
  const { pathname } = useLocation();

  const [recolhido, setRecolhido] = useState(() => {
    try { return localStorage.getItem(CHAVE_MENU) === "1"; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem(CHAVE_MENU, recolhido ? "1" : "0"); } catch { /* modo privado */ }
  }, [recolhido]);

  if (carregando) {
    return <div className="ds-app grid min-h-screen place-items-center bg-canvas text-body-sm text-mute">Carregando…</div>;
  }
  if (!session) return <Navigate to="/admin/login" replace />;

  if (!isStaff) {
    return (
      <div className="ds-app grid min-h-screen place-items-center bg-canvas px-6 text-center">
        <div className="max-w-sm">
          <h1 className="text-heading-md text-ink">Acesso pendente</h1>
          <p className="mt-2 text-body-sm text-mute">
            Sua conta foi criada, mas ainda não tem permissão. Peça a um administrador para liberar seu acesso.
          </p>
          <Button variant="secondary" className="mt-5" onClick={sair}>Sair</Button>
        </div>
      </div>
    );
  }

  const itens = ARVORE.filter((i) => !i.soAdmin || isAdmin).map(({ soAdmin, ...i }) => i);
  const grupos: GrupoNav[] = [{ subtitle: "Operação", items: itens }];

  return (
    <div className="ds-app flex min-h-screen bg-canvas font-geist text-body antialiased">
      <div className="ds-dot-grid" aria-hidden="true" />

      <SidebarNav
        groups={grupos}
        collapsed={recolhido}
        onToggle={() => setRecolhido((v) => !v)}
        header={({ collapsed }) =>
          collapsed ? (
            <div className="grid h-8 w-full place-items-center rounded-ds-sm bg-brand-gradient text-[13px] font-bold text-white">
              {(config?.nome ?? "R").slice(0, 1).toUpperCase()}
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-ds-sm bg-brand-gradient text-[13px] font-bold text-white">
                {(config?.nome ?? "R").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-body-sm font-semibold leading-tight text-ink">{config?.nome}</p>
                <p className="text-caption text-faint">{isAdmin ? "Administrador" : "Vendedor"}</p>
              </div>
            </div>
          )
        }
        footer={
          <div className={recolhido ? "flex flex-col items-center gap-1" : "flex flex-col gap-0.5"}>
            <Link
              to="/" target="_blank"
              title={recolhido ? "Ver o site" : undefined}
              className={`ds-focus flex items-center gap-2.5 rounded-full py-2 text-body-sm text-mute transition-colors hover:text-ink ${recolhido ? "justify-center px-0" : "px-2.5"}`}
            >
              <ArrowSquareOut size={17} />
              {!recolhido && "Ver o site"}
            </Link>
            <button
              onClick={sair}
              title={recolhido ? "Sair" : undefined}
              className={`ds-focus flex items-center gap-2.5 rounded-full py-2 text-body-sm text-mute transition-colors hover:text-ink ${recolhido ? "justify-center px-0" : "px-2.5"}`}
            >
              <SignOut size={17} />
              {!recolhido && "Sair"}
            </button>
          </div>
        }
      />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-hairline bg-surface/80 px-5 backdrop-blur">
          <Breadcrumbs items={trilhaDe(pathname)} />
          <ThemeToggle />
        </header>

        {/* Faixa de navegação do mobile, onde o menu lateral não cabe. */}
        <nav className="flex gap-1 overflow-x-auto border-b border-hairline bg-surface px-3 py-2 md:hidden">
          {itens.map((i) => (
            <Link key={i.to} to={i.to}
              className={`ds-focus whitespace-nowrap rounded-full px-3 py-1.5 text-body-sm ${
                pathname === i.to ? "bg-ink/[0.06] font-semibold text-ink" : "text-mute"}`}>
              {i.label}
            </Link>
          ))}
        </nav>

        <main className="relative flex-1"><Outlet /></main>
      </div>
    </div>
  );
}
