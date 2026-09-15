import { useSyncExternalStore } from "react";
import { Moon, Sun } from "@phosphor-icons/react";

/**
 * Fonte de verdade: a classe `dark` em <html>. useSyncExternalStore
 * mantém todos os toggles da árvore sincronizados sem contexto.
 * Nenhum componente lê o tema: todos usam tokens semânticos.
 */
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((f) => f());

const inscrever = (f: () => void) => {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
};
const ler = () =>
  typeof document !== "undefined" && document.documentElement.classList.contains("dark")
    ? "dark"
    : "light";

export function useTheme() {
  const tema = useSyncExternalStore(inscrever, ler, () => "light");

  const definir = (novo: "dark" | "light") => {
    document.documentElement.classList.toggle("dark", novo === "dark");
    try { localStorage.setItem("theme", novo); } catch { /* modo privado */ }
    avisar();
  };

  return { tema, alternar: () => definir(tema === "dark" ? "light" : "dark"), definir };
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { tema, alternar } = useTheme();
  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={tema === "dark" ? "Usar tema claro" : "Usar tema escuro"}
      className={`ds-focus grid h-9 w-9 place-items-center rounded-ds-md border border-hairline text-mute transition-colors hover:text-ink ${className}`}
    >
      {tema === "dark" ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
