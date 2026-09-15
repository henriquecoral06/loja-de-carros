import { cn } from "@/lib/utils";

/**
 * Escolha única entre 2–4 opções curtas, todas à vista. Passando disso,
 * ou com rótulo longo, use Select.
 */
export function SegmentedControl<T extends string | number>({ options, value, onChange, className }: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex rounded-ds-md border border-hairline bg-surface p-0.5", className)} role="tablist">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "ds-focus rounded-[calc(var(--radius-md)-3px)] px-3 py-1.5 text-label-md transition-colors",
            o.value === value ? "bg-ink/[0.06] font-semibold text-ink" : "text-mute hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
