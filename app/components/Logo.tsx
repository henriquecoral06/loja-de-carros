import { Link } from "react-router";
import { SITE } from "~/lib/site";

export function Logo({ claro = false }: { claro?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 rounded-md" aria-label={`${SITE.nome} — início`}>
      <span className="grid size-9 place-items-center rounded-lg bg-marca-600 text-white">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 16h14l-1.6-5.3A2 2 0 0 0 15.5 9h-7a2 2 0 0 0-1.9 1.7L5 16Z" />
          <circle cx="8" cy="16.5" r="1.8" fill="currentColor" stroke="none" />
          <circle cx="16" cy="16.5" r="1.8" fill="currentColor" stroke="none" />
        </svg>
      </span>
      <span className={`text-[17px] font-extrabold tracking-tight ${claro ? "text-white" : "text-tinta"}`}>
        {SITE.nome}
      </span>
    </Link>
  );
}
