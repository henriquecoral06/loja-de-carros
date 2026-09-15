import { ArrowDown, ArrowUp } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Card } from "./Card";

interface Props {
  label: string;
  value: string;
  /** Com sinal. Direção e sentido são coisas diferentes — ver abaixo. */
  delta?: number | null;
  /** Métricas onde cair é a boa notícia (churn, custo) passam false. */
  higherIsBetter?: boolean;
  /** Base nomeada. Sem período para comparar, não mostre delta. */
  comparison?: string;
  hint?: string;
}

/**
 * A seta vem do SINAL do delta — diz o que o número fez.
 * A cor vem de delta × higherIsBetter — diz se isso é bom.
 * Um booleano só governando as duas coisas produz seta para baixo ao
 * lado de um "+0,4%" sempre que subir for ruim.
 */
export function MetricCard({ label, value, delta, higherIsBetter = true, comparison, hint }: Props) {
  const temDelta = delta !== null && delta !== undefined && Number.isFinite(delta) && comparison;
  const subiu = (delta ?? 0) > 0;
  const bom = (delta ?? 0) === 0 ? null : subiu === higherIsBetter;

  return (
    <Card glow className="p-4">
      <p className="text-label-md tracking-label text-mute">{label}</p>
      <p className="mt-1.5 text-heading-lg tabular-nums text-ink">{value}</p>

      {temDelta ? (
        <p className="mt-1.5 flex items-center gap-1 text-caption">
          <span className={cn("inline-flex items-center gap-0.5 font-semibold",
            bom === null ? "text-mute" : bom ? "text-emerald-deep" : "text-danger-deep")}>
            {subiu ? <ArrowUp size={11} weight="bold" /> : <ArrowDown size={11} weight="bold" />}
            {Math.abs(delta!).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
          </span>
          <span className="text-faint">{comparison}</span>
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-caption text-faint">{hint}</p>
      ) : null}
    </Card>
  );
}
