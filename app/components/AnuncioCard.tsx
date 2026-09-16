import { Calendar, Camera, Cog, Gauge } from "lucide-react";
import { Link } from "react-router";
import { anos, km, moeda } from "~/lib/formato";
import { CarroPlaceholder } from "./CarroPlaceholder";

export type DadosCard = {
  slug: string; marca: string; modelo: string; versao: string;
  anoFabricacao: number; anoModelo: number; km: number; preco: number;
  cambio: string; carroceria: string; destaque: boolean;
  capa: string | null; totalFotos: number;
};

export function AnuncioCard({ anuncio, prioridade = false }: { anuncio: DadosCard; prioridade?: boolean }) {
  const titulo = `${anuncio.marca} ${anuncio.modelo}`;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-linha bg-white shadow-card transition-shadow duration-200 hover:shadow-card-hover">
      <div className="relative aspect-[4/3] overflow-hidden bg-fundo">
        {anuncio.capa ? (
          <img src={anuncio.capa} alt={`${titulo} ${anuncio.versao}`} loading={prioridade ? "eager" : "lazy"} decoding="async"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          <CarroPlaceholder carroceria={anuncio.carroceria} className="size-full" />
        )}
        {anuncio.destaque && (
          <span className="absolute left-2.5 top-2.5 rounded bg-marca-600 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
            Destaque
          </span>
        )}
        {anuncio.totalFotos > 0 && (
          <span className="numeros absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-md bg-tinta/75 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
            <Camera className="size-3.5" aria-hidden="true" /> {anuncio.totalFotos}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-[15px] font-bold uppercase leading-tight tracking-wide text-tinta">
          {/* O link cobre o card inteiro, mas o texto dele é só o título: leitor de tela não repete o card todo. */}
          <Link to={`/carro/${anuncio.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none after:focus-visible:rounded-xl after:focus-visible:outline-2 after:focus-visible:outline-marca-600">
            {titulo}
          </Link>
        </h3>
        <p className="mt-1 line-clamp-1 text-sm text-suave">{anuncio.versao}</p>

        <p className="numeros mb-4 mt-3 text-[22px] font-extrabold tracking-tight text-tinta">{moeda(anuncio.preco)}</p>

        <dl className="numeros mt-auto flex flex-wrap gap-x-3 gap-y-1 border-t border-linha pt-3 text-[13px] text-texto">
          <div className="flex items-center gap-1"><Calendar className="size-3.5 shrink-0 text-fraco" aria-hidden="true" /><dt className="sr-only">Ano</dt><dd>{anos(anuncio.anoFabricacao, anuncio.anoModelo)}</dd></div>
          <div className="flex items-center gap-1"><Gauge className="size-3.5 shrink-0 text-fraco" aria-hidden="true" /><dt className="sr-only">Quilometragem</dt><dd>{km(anuncio.km)}</dd></div>
          <div className="flex items-center gap-1"><Cog className="size-3.5 shrink-0 text-fraco" aria-hidden="true" /><dt className="sr-only">Câmbio</dt><dd>{anuncio.cambio}</dd></div>
        </dl>
      </div>
    </article>
  );
}
