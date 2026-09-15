import { Link } from "react-router-dom";
import type { VeiculoPublico } from "@/integrations/supabase/types";
import { moeda, numero, tituloVeiculo } from "@/lib/utils";

/**
 * Padrão model-card do sistema: foto sobre placa cinza clara, nome
 * abaixo em 18/700, uma linha de apoio em 14/300 e link em caixa alta.
 * Sem borda e sem sombra — a separação vem do contraste da placa.
 */
export default function VeiculoCard({ veiculo }: { veiculo: VeiculoPublico }) {
  const temPromo = veiculo.preco_promocional && veiculo.preco_vigente < veiculo.preco;
  const abaixoFipe =
    veiculo.valor_fipe && veiculo.preco_vigente < Number(veiculo.valor_fipe)
      ? Math.round((1 - veiculo.preco_vigente / Number(veiculo.valor_fipe)) * 100)
      : null;

  const selos = [
    veiculo.status === "reservado" && "Reservado",
    veiculo.status === "vendido" && "Vendido",
    veiculo.unico_dono && "Único dono",
    veiculo.blindado && "Blindado",
  ].filter(Boolean) as string[];

  return (
    <Link to={`/carros/${veiculo.slug}`}
      className="s-card group flex flex-col focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--s-primary)]">
      <div className="s-card-photo relative aspect-[16/10]">
        {veiculo.foto_capa ? (
          <img src={veiculo.foto_capa} alt={tituloVeiculo(veiculo)} loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="t-caption grid h-full place-items-center text-[var(--s-muted)]">Sem foto</div>
        )}
        {selos.length > 0 && (
          <div className="absolute left-0 top-0 flex flex-wrap">
            {selos.map((s) => (
              <span key={s} className="t-caption bg-[var(--s-ink)] px-2.5 py-1.5 text-[var(--s-on-dark)]">{s}</span>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 pt-5">
        <h3 className="t-title-md text-[var(--s-ink)]">{tituloVeiculo(veiculo)}</h3>
        <p className="t-body-sm text-[var(--s-muted)]">
          {veiculo.ano_fabricacao}/{veiculo.ano_modelo} · {numero(veiculo.km)} km · {veiculo.cambio}
        </p>

        <div className="mt-auto pt-3">
          {veiculo.preco_sob_consulta ? (
            <p className="t-title-lg text-[var(--s-ink)]">Sob consulta</p>
          ) : (
            <>
              {temPromo && <p className="t-body-sm text-[var(--s-muted)] line-through">{moeda(veiculo.preco)}</p>}
              <p className="t-title-lg text-[var(--s-ink)]">{moeda(veiculo.preco_vigente)}</p>
            </>
          )}
          {abaixoFipe && abaixoFipe >= 2 && (
            <p className="t-caption mt-1 text-[var(--s-primary)]">{abaixoFipe}% abaixo da tabela FIPE</p>
          )}
        </div>

        <span className="s-link mt-4">Ver detalhes</span>
      </div>
    </Link>
  );
}
