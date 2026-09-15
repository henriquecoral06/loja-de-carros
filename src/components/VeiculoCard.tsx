import { Link } from "react-router-dom";
import type { VeiculoPublico } from "@/integrations/supabase/types";
import { moeda, numero, tituloVeiculo } from "@/lib/utils";

const selos = (v: VeiculoPublico) =>
  [
    v.status === "reservado" && { texto: "Reservado", tom: "bg-amber-500" },
    v.status === "vendido" && { texto: "Vendido", tom: "bg-muted-foreground" },
    v.unico_dono && { texto: "Único dono", tom: "bg-primary" },
    v.blindado && { texto: "Blindado", tom: "bg-slate-700" },
  ].filter(Boolean) as { texto: string; tom: string }[];

export default function VeiculoCard({ veiculo }: { veiculo: VeiculoPublico }) {
  const temPromo = veiculo.preco_promocional && veiculo.preco_vigente < veiculo.preco;
  const abaixoFipe =
    veiculo.valor_fipe && veiculo.preco_vigente < Number(veiculo.valor_fipe)
      ? Math.round((1 - veiculo.preco_vigente / Number(veiculo.valor_fipe)) * 100)
      : null;

  return (
    <Link
      to={`/carros/${veiculo.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {veiculo.foto_capa ? (
          <img
            src={veiculo.foto_capa}
            alt={tituloVeiculo(veiculo)}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Sem foto
          </div>
        )}
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {selos(veiculo).map((s) => (
            <span key={s.texto} className={`rounded px-2 py-0.5 text-[11px] font-semibold text-white ${s.tom}`}>
              {s.texto}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-display font-semibold leading-tight line-clamp-2">
          {tituloVeiculo(veiculo)}
        </h3>
        <p className="text-sm text-muted-foreground">
          {veiculo.ano_fabricacao}/{veiculo.ano_modelo} · {numero(veiculo.km)} km · {veiculo.cambio}
        </p>

        <div className="mt-auto pt-2">
          {veiculo.preco_sob_consulta ? (
            <p className="font-display text-lg font-bold text-primary">Sob consulta</p>
          ) : (
            <>
              {temPromo && (
                <p className="text-xs text-muted-foreground line-through">{moeda(veiculo.preco)}</p>
              )}
              <p className="font-display text-xl font-bold text-primary">{moeda(veiculo.preco_vigente)}</p>
            </>
          )}
          {abaixoFipe && abaixoFipe >= 2 && (
            <p className="text-xs font-medium text-[hsl(var(--whatsapp))]">{abaixoFipe}% abaixo da FIPE</p>
          )}
        </div>
      </div>
    </Link>
  );
}
