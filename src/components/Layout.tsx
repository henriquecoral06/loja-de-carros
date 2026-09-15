import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { List, WhatsappLogo, X } from "@phosphor-icons/react";
import { useConfig } from "@/hooks/useConfig";
import { linkWhatsApp } from "@/lib/utils";
import BannerCookies from "@/components/BannerCookies";

const rotas = [
  { para: "/", rotulo: "Início" },
  { para: "/estoque", rotulo: "Estoque" },
  { para: "/sobre", rotulo: "A revenda" },
  { para: "/contato", rotulo: "Contato" },
];

export default function Layout() {
  const { data: config } = useConfig();
  const { pathname } = useLocation();
  const [menuAberto, setMenuAberto] = useState(false);

  // O menu do celular abre como folha de tela cheia e precisa fechar ao
  // navegar, senão cobre a página que acabou de abrir.
  useEffect(() => { setMenuAberto(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = menuAberto ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuAberto]);

  const zap = config?.whatsapp
    ? linkWhatsApp(config.whatsapp, `Olá! Vim pelo site da ${config.nome}.`)
    : null;

  return (
    <div className="site flex min-h-screen flex-col">
      <a href="#conteudo"
        className="s-btn s-btn-primary sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60]">
        Ir para o conteúdo
      </a>

      <header className="sticky top-0 z-40 border-b border-[var(--s-hairline)] bg-[var(--s-canvas)]">
        <div className="site-container flex h-16 items-center justify-between gap-6">
          <Link to="/" className="flex h-16 items-center gap-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--s-primary)]">
            {config?.logo_url
              ? <img src={config.logo_url} alt={config.nome} className="h-8 w-auto" />
              : <span className="t-title-md text-[var(--s-ink)]">{config?.nome ?? "Revenda"}</span>}
          </Link>

          <nav aria-label="Principal" className="hidden items-center gap-8 md:flex">
            {rotas.map((r) => (
              <NavLink key={r.para} to={r.para} end={r.para === "/"}
                className={({ isActive }) =>
                  `t-nav flex h-16 items-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--s-primary)] ${
                    isActive ? "text-[var(--s-primary)]" : "text-[var(--s-ink)] hover:text-[var(--s-primary)]"}`}>
                {r.rotulo}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {zap && (
              <a href={zap} target="_blank" rel="noopener noreferrer" className="s-btn s-btn-primary hidden sm:inline-flex">
                <WhatsappLogo size={17} weight="fill" /> WhatsApp
              </a>
            )}
            <button type="button" onClick={() => setMenuAberto((v) => !v)}
              aria-expanded={menuAberto} aria-controls="menu-mobile" aria-label="Menu"
              className="grid h-12 w-12 place-items-center text-[var(--s-ink)] md:hidden">
              {menuAberto ? <X size={22} /> : <List size={22} />}
            </button>
          </div>
        </div>
      </header>

      {menuAberto && (
        <div id="menu-mobile" className="fixed inset-0 top-16 z-40 bg-[var(--s-canvas)] md:hidden">
          <nav aria-label="Principal (celular)" className="site-container flex flex-col py-6">
            {rotas.map((r) => (
              <NavLink key={r.para} to={r.para} end={r.para === "/"}
                className="t-title-md border-b border-[var(--s-hairline)] py-4 text-[var(--s-ink)]">
                {r.rotulo}
              </NavLink>
            ))}
            {zap && (
              <a href={zap} target="_blank" rel="noopener noreferrer" className="s-btn s-btn-primary mt-6">
                <WhatsappLogo size={17} weight="fill" /> Falar no WhatsApp
              </a>
            )}
          </nav>
        </div>
      )}

      <main id="conteudo" className="flex-1"><Outlet /></main>

      <footer className="band-soft border-t border-[var(--s-hairline)]">
        <div className="site-container grid gap-10 py-14 md:grid-cols-4">
          <div>
            <p className="t-title-md text-[var(--s-ink)]">{config?.nome}</p>
            {config?.endereco && (
              <p className="t-body-sm mt-3 text-[var(--s-body)]">
                {config.endereco}<br />{[config.cidade, config.uf].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>

          <div>
            <p className="t-label mb-4 text-[var(--s-ink)]">Navegação</p>
            <ul className="flex flex-col gap-2.5">
              {rotas.map((r) => (
                <li key={r.para}>
                  <Link to={r.para} className="t-body-sm inline-block py-1.5 text-[var(--s-muted)] hover:text-[var(--s-ink)]">{r.rotulo}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="t-label mb-4 text-[var(--s-ink)]">Atendimento</p>
            <ul className="flex flex-col gap-2.5">
              {(config?.horarios ?? []).map((h) => (
                <li key={h.dia} className="t-body-sm text-[var(--s-muted)]">
                  {h.dia}: {h.fechado ? "fechado" : `${h.abre} às ${h.fecha}`}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="t-label mb-4 text-[var(--s-ink)]">Contato</p>
            <ul className="flex flex-col gap-2.5">
              {config?.telefone && <li className="t-body-sm text-[var(--s-muted)]">{config.telefone}</li>}
              {config?.email && <li className="t-body-sm text-[var(--s-muted)]">{config.email}</li>}
              <li><Link to="/privacidade" className="t-body-sm inline-block py-1.5 text-[var(--s-muted)] hover:text-[var(--s-ink)]">Política de privacidade</Link></li>
              <li><Link to="/termos" className="t-body-sm inline-block py-1.5 text-[var(--s-muted)] hover:text-[var(--s-ink)]">Termos de uso</Link></li>
            </ul>
          </div>
        </div>

        <div className="site-container border-t border-[var(--s-hairline-strong)] py-6">
          <p className="t-body-sm text-[var(--s-muted)]">
            {config?.razao_social ?? config?.nome}
            {config?.cnpj && ` · CNPJ ${config.cnpj}`}
          </p>
        </div>
      </footer>

      {zap && (
        <a href={zap} target="_blank" rel="noopener noreferrer" aria-label="Falar no WhatsApp"
          className="fixed bottom-6 right-6 z-50 grid h-14 w-14 place-items-center rounded-full bg-[var(--s-primary)] text-[var(--s-on-primary)] shadow-lg sm:hidden">
          <WhatsappLogo size={26} weight="fill" />
        </a>
      )}

      <BannerCookies />
    </div>
  );
}
