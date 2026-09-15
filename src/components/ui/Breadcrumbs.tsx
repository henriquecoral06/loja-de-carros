import { Link } from "react-router-dom";
import { CaretRight } from "@phosphor-icons/react";

export interface Trilha {
  label: string;
  /** Item intermediário sem tela própria vai sem href e sai como texto. */
  href?: string;
}

/**
 * Orientação, não conteúdo — por isso menor que o título da página.
 * Derive a trilha da árvore de navegação em vez de escrever à mão em
 * cada tela: escritas separadamente, uma hora discordam, e é a trilha
 * que discorda calada.
 */
export function Breadcrumbs({ items }: { items: Trilha[] }) {
  return (
    <nav aria-label="Trilha" className="flex flex-wrap items-center gap-1 text-caption text-mute">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <CaretRight size={9} className="text-faint" />}
          {item.href ? (
            <Link to={item.href} className="ds-focus rounded-ds-xs hover:text-ink">{item.label}</Link>
          ) : (
            <span className={i === items.length - 1 ? "text-ink" : undefined}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
