import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Rótulo de UI usa tracking-label (0.04em), nunca o eyebrow decorativo. */
export function Field({ id, label, hint, children, className }: {
  id: string; label: string; hint?: string; children: ReactNode; className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-label-md tracking-label text-body">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-caption text-faint">{hint}</p>}
    </div>
  );
}

export const Input = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => (
  <input className={cn("ds-field", className)} {...props} />
);

export const Textarea = ({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className={cn("ds-field", className)} {...props} />
);

/**
 * <select> nativo com a casca do sistema: mesma altura, raio e padding
 * do Input para alinhar numa barra de filtros. Nativo de propósito —
 * teclado, rolagem, busca por digitação e o picker do mobile vêm de graça.
 */
export const Select = ({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className={cn("ds-field appearance-none bg-[length:16px] bg-[right_10px_center] bg-no-repeat pr-8", className)}
    style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%23737373'%3E%3Cpath d='M4.5 6.5 8 10l3.5-3.5'stroke='%23737373' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")" }}
    {...props}>
    {children}
  </select>
);
