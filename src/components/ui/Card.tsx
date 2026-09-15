import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useSpotlight } from "@/lib/useSpotlight";

interface Props extends HTMLAttributes<HTMLDivElement> {
  variant?: "flat" | "premium";
  glow?: boolean;
  children: ReactNode;
}

/**
 * A superfície é definida pela borda de 1px, não por sombra. Cards
 * comuns não têm sombra projetada em nenhum tema — no escuro a premium
 * é 100% transparente e a grade de pontos da página atravessa.
 */
export function Card({ variant = "flat", glow = false, className, children, ...props }: Props) {
  const spotlight = useSpotlight();
  const interativo = variant === "premium" || glow;

  return (
    <div
      {...(interativo ? spotlight : {})}
      className={cn(
        variant === "premium"
          ? "premium-card"
          : "relative rounded-ds-lg border border-hairline bg-surface",
        glow && variant === "flat" && "card-glow",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
