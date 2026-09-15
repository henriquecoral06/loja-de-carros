import { useMemo, useState, type ReactNode } from "react";
import { CaretDown, CaretUp } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface Coluna<T> {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  numeric?: boolean;
  sortable?: boolean;
  /** Obrigatório sempre que `render` monta a célula de outro campo:
   *  ordenar pelo texto põe "R$ 9.800" antes de "R$ 12.000". */
  sortValue?: (linha: T) => string | number;
  render?: (linha: T) => ReactNode;
  renderFooter?: (linhas: T[]) => ReactNode;
}

interface Props<T> {
  columns: Coluna<T>[];
  rows: T[];
  rowKey: (linha: T) => string;
  footer?: boolean;
  defaultSort?: { key: string; dir: "asc" | "desc" };
  empty?: ReactNode;
}

export function Table<T>({ columns, rows, rowKey, footer, defaultSort, empty }: Props<T>) {
  const [sort, setSort] = useState(defaultSort ?? null);

  const ordenadas = useMemo(() => {
    if (!sort) return rows;
    const coluna = columns.find((c) => c.key === sort.key);
    if (!coluna) return rows;
    const valor = (l: T) => coluna.sortValue?.(l) ?? (l as any)[coluna.key];
    return [...rows].sort((a, b) => {
      const va = valor(a), vb = valor(b);
      const cmp = typeof va === "number" && typeof vb === "number"
        ? va - vb
        : String(va ?? "").localeCompare(String(vb ?? ""), "pt-BR");
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [rows, sort, columns]);

  const alinhar = (c: Coluna<T>) =>
    c.align === "right" || c.numeric ? "text-right" : c.align === "center" ? "text-center" : "text-left";

  return (
    <div className="overflow-x-auto rounded-ds-lg border border-hairline bg-surface">
      <table className="w-full min-w-[640px] border-collapse">
        <thead>
          <tr className="border-b border-hairline">
            {columns.map((c) => (
              <th key={c.key} className={cn("px-4 py-2.5 text-label-md font-medium tracking-label text-mute", alinhar(c))}>
                {c.sortable ? (
                  <button
                    type="button"
                    onClick={() => setSort((s) =>
                      s?.key === c.key ? { key: c.key, dir: s.dir === "asc" ? "desc" : "asc" } : { key: c.key, dir: "asc" })}
                    className={cn("ds-focus inline-flex items-center gap-1 rounded-ds-xs hover:text-ink",
                      c.numeric || c.align === "right" ? "flex-row-reverse" : "")}
                  >
                    {c.header}
                    {sort?.key === c.key && (sort.dir === "asc" ? <CaretUp size={10} weight="bold" /> : <CaretDown size={10} weight="bold" />)}
                  </button>
                ) : c.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {ordenadas.length === 0 ? (
            <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-body-sm text-faint">{empty ?? "Nada por aqui."}</td></tr>
          ) : ordenadas.map((linha) => (
            <tr key={rowKey(linha)} className="border-b border-hairline last:border-0 transition-colors hover:bg-ink/[0.02]">
              {columns.map((c) => (
                <td key={c.key} className={cn("px-4 py-3 text-body-sm text-body", alinhar(c), c.numeric && "tabular-nums")}>
                  {c.render ? c.render(linha) : (linha as any)[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>

        {/* A linha de total vive em <tfoot> para ficar parada quando a
            ordenação muda — é ela que deixa conferir o número. */}
        {footer && ordenadas.length > 0 && (
          <tfoot>
            <tr className="border-t border-hairline-strong bg-ink/[0.02]">
              {columns.map((c) => (
                <td key={c.key} className={cn("px-4 py-2.5 text-label-md font-semibold text-ink", alinhar(c), c.numeric && "tabular-nums")}>
                  {c.renderFooter?.(ordenadas)}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
