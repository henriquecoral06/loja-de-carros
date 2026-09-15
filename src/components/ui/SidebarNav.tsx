import { NavLink } from "react-router-dom";
import { CaretLeft } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ItemNav {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
}
export interface GrupoNav {
  subtitle?: string;
  items: ItemNav[];
}

interface Props {
  groups: GrupoNav[];
  collapsed: boolean;
  onToggle: () => void;
  header?: (estado: { collapsed: boolean }) => ReactNode;
  footer?: ReactNode;
}

export function SidebarNav({ groups, collapsed, onToggle, header, footer }: Props) {
  return (
    <aside
      className={cn(
        // Altura travada na janela: o conteúdo rola, o menu fica.
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-hairline bg-surface",
        "transition-[width] duration-300 md:flex",
        collapsed ? "w-[68px]" : "w-60",
      )}
    >
      {header && <div className={cn("border-b border-hairline", collapsed ? "px-3 py-4" : "px-4 py-4")}>{header({ collapsed })}</div>}

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
        {groups.map((grupo, i) => (
          <div key={i} className={i > 0 ? "mt-5" : ""}>
            {/* Subtítulo em ink: mais contraste que os próprios itens. */}
            {grupo.subtitle && !collapsed && (
              <p className="mb-1.5 px-2.5 text-label-md font-semibold tracking-label text-ink">{grupo.subtitle}</p>
            )}
            <ul className="flex flex-col gap-0.5">
              {grupo.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) => cn(
                      "ds-focus flex items-center gap-2.5 rounded-full px-2.5 py-2 text-body-sm transition-colors",
                      collapsed && "justify-center px-0",
                      isActive ? "bg-ink/[0.06] font-semibold text-ink" : "text-mute hover:bg-ink/[0.03] hover:text-ink",
                    )}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {footer && <div className="border-t border-hairline p-2">{footer}</div>}

      {/* Gatilho de recolher: círculo montado na borda. */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        className="ds-focus absolute -right-3 top-[72px] z-10 grid h-6 w-6 place-items-center rounded-full border border-hairline-strong bg-surface text-mute transition-colors hover:text-ink"
      >
        <CaretLeft size={11} weight="bold" className={cn("transition-transform duration-300", collapsed && "rotate-180")} />
      </button>
    </aside>
  );
}
