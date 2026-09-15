import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variante = "shiny" | "shiny-brand" | "secondary" | "ghost";
type Tamanho = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variante;
  size?: Tamanho;
  icon?: ReactNode;
  children?: ReactNode;
}

const tamanhos: Record<Tamanho, string> = {
  sm: "h-8 px-3.5 text-label-md",
  md: "h-9 px-4 text-label-md",
  lg: "h-11 px-6 text-label-lg",
};

/**
 * A borda esmeralda giratória é a assinatura da marca: contínua nos
 * CTAs shiny, revelada no hover do secundário. A animação vive no CSS
 * (border-spin sobre --gradient-angle registrado com @property).
 */
export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "shiny", size = "md", icon, children, className, ...props },
  ref,
) {
  const base = cn(
    "ds-focus group relative inline-flex items-center justify-center gap-2 rounded-full",
    "font-medium transition-[transform,box-shadow,background-color,color] duration-200",
    "disabled:pointer-events-none disabled:opacity-50",
    tamanhos[size],
    className,
  );

  if (variant === "shiny" || variant === "shiny-brand") {
    return (
      <button ref={ref} className={cn(base, variant === "shiny" ? "shiny-cta" : "shiny-brand")} {...props}>
        <span className="shiny-dots" aria-hidden="true" />
        <span className="shiny-cta-content">
          {children}
          {icon && <span className="transition-transform duration-200 group-hover:translate-x-0.5">{icon}</span>}
        </span>
      </button>
    );
  }

  if (variant === "secondary") {
    return (
      <button ref={ref} className={cn(base, "ds-btn-secondary")} {...props}>
        <span className="relative z-[2] inline-flex items-center gap-2">
          {children}
          {icon && <span className="transition-transform duration-200 group-hover:translate-x-0.5">{icon}</span>}
        </span>
      </button>
    );
  }

  return (
    <button ref={ref} className={cn(base, "text-ink hover:bg-ink/10")} {...props}>
      {children}
      {icon && <span className="transition-transform duration-200 group-hover:translate-x-0.5">{icon}</span>}
    </button>
  );
});
