import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tom = "emerald" | "soft" | "neutral" | "success" | "warning" | "danger" | "info";

/**
 * Par soft/deep: soft é o fundo, deep é o texto, e os dois trocam com o
 * tema. No escuro o "deep" legível é o passo 400, não o passo escuro —
 * com o passo de origem o texto ficava mais escuro que o próprio selo.
 */
const tons: Record<Tom, string> = {
  emerald: "bg-emerald-soft/20 text-emerald-deep dark:bg-emerald-soft/[0.16]",
  soft: "bg-ink/[0.06] text-mute",
  neutral: "bg-transparent text-mute ring-1 ring-inset ring-hairline-strong",
  success: "bg-success-soft/20 text-success-deep dark:bg-success-soft/[0.16]",
  warning: "bg-warning-soft/25 text-warning-deep dark:bg-warning-soft/[0.16]",
  danger: "bg-danger-soft/25 text-danger-deep dark:bg-danger-soft/[0.16]",
  info: "bg-info-soft/25 text-info-deep dark:bg-info-soft/[0.16]",
};

export function Badge({ tone = "soft", children, className }: { tone?: Tom; children: ReactNode; className?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-ds-md px-2 py-0.5 text-[11px] font-semibold tracking-label",
      tons[tone], className,
    )}>
      {children}
    </span>
  );
}
