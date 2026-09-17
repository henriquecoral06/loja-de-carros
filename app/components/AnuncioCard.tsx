import { Calendar, Camera, Cog, Fuel, Gauge } from "lucide-react";
import { Link } from "react-router";
import { anos, km, moeda } from "~/lib/formato";
import { cn } from "~/lib/ui";
import { CarroPlaceholder } from "./CarroPlaceholder";

export type DadosCard = {
  slug: string; marca: string; modelo: string; versao: string;
  anoFabricacao: number; anoModelo: number; km: number; preco: number;
  cambio: string; combustivel: string; carroceria: string; destaque: boolean;
  capa: string | null; totalFotos: number;
};

/** Fotos do banco de imagens vêm em 1600px; no card basta 640. */
const capaReduzida = (url: string) => (url.startsWith("https://images.unsplash.com") ? url.replace(/w=\d+&h=\d+/, "w=640&h=480") : url);

/**
 * `lista`: no celular vira card horizontal compacto (foto à esquerda), para
 * a página de estoque não virar uma rolagem sem fim; do tablet para cima é
 * igual à grade.
 */
export function AnuncioCard({ anuncio, prioridade = false, lista = false }: { anuncio: DadosCard; prioridade?: boolean; lista?: boolean }) {
  const titulo = `${anuncio.marca} ${anuncio.modelo}`;

  return (
    <article className={cn("group relative flex h-full overflow-hidden rounded-xl border border-linha bg-white shadow-card transition-shadow duration-200 hover:shadow-card-hover",
      lista ? "flex-row sm:flex-col" : "flex-col")}>
      <div className={cn("relative overflow-hidden bg-fundo", lista ? "w-[42%] shrink-0 sm:aspect-[4/3] sm:w-auto" : "aspect-[4/3]")}>
        {anuncio.capa ? (
          <img src={capaReduzida(anuncio.capa)} alt={`${titulo} ${anuncio.versao}`} loading={prioridade ? "eager" : "lazy"} decoding="async"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          <CarroPlaceholder carroceria={anuncio.carroceria} className="size-full" />
        )}
        {anuncio.destaque && (
          <span className={cn("absolute left-2 top-2 rounded bg-marca-600 px-1.5 py-0.5 font-bold uppercase tracking-wide text-sobre-marca", lista ? "text-[10px] sm:left-2.5 sm:top-2.5 sm:px-2 sm:text-[11px]" : "left-2.5 top-2.5 px-2 text-[11px]")}>
            Destaque
          </span>
        )}
        {anuncio.totalFotos > 0 && (
          <span className={cn("numeros absolute bottom-2.5 left-2.5 items-center gap-1 rounded-md bg-tinta/75 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm", lista ? "hidden sm:inline-flex" : "inline-flex")}>
            <Camera className="size-3.5" aria-hidden="true" /> {anuncio.totalFotos}
          </span>
        )}
      </div>

      <div className={cn("flex min-w-0 flex-1 flex-col", lista ? "p-3 sm:p-4" : "p-4")}>
        <h3 className={cn("font-bold uppercase leading-tight tracking-wide text-tinta", lista ? "text-[13px] sm:text-[15px]" : "text-[15px]")}>
          {/* O link cobre o card inteiro, mas o texto dele é só o título: leitor de tela não repete o card todo. */}
          <Link to={`/carro/${anuncio.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none after:focus-visible:rounded-xl after:focus-visible:outline-2 after:focus-visible:outline-marca-600">
            {titulo}
          </Link>
        </h3>
        <p className={cn("mt-1 line-clamp-1 text-suave", lista ? "text-xs sm:text-sm" : "text-sm")}>{anuncio.versao}</p>

        <p className={cn("numeros font-extrabold tracking-tight text-tinta", lista ? "mb-2 mt-2 text-lg sm:mb-4 sm:mt-3 sm:text-[22px]" : "mb-4 mt-3 text-[22px]")}>{moeda(anuncio.preco)}</p>

        {/* Sempre duas linhas curtas: cards lado a lado ficam com a mesma altura. */}
        <dl className={cn("numeros mt-auto grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-linha text-texto", lista ? "pt-2 text-xs sm:pt-3 sm:text-[13px]" : "pt-3 text-[13px]")}>
          <div className="flex min-w-0 items-center gap-1.5"><Calendar className="size-3.5 shrink-0 text-fraco" aria-hidden="true" /><dt className="sr-only">Ano</dt><dd className="truncate">{lista ? <><span className="sm:hidden">{anuncio.anoModelo}</span><span className="hidden sm:inline">{anos(anuncio.anoFabricacao, anuncio.anoModelo)}</span></> : anos(anuncio.anoFabricacao, anuncio.anoModelo)}</dd></div>
          <div className="flex min-w-0 items-center gap-1.5"><Gauge className="size-3.5 shrink-0 text-fraco" aria-hidden="true" /><dt className="sr-only">Quilometragem</dt><dd className="truncate">{km(anuncio.km)}</dd></div>
          <div className={cn("min-w-0 items-center gap-1.5", lista ? "hidden sm:flex" : "flex")}><Cog className="size-3.5 shrink-0 text-fraco" aria-hidden="true" /><dt className="sr-only">Câmbio</dt><dd className="truncate">{anuncio.cambio}</dd></div>
          <div className={cn("min-w-0 items-center gap-1.5", lista ? "hidden sm:flex" : "flex")}><Fuel className="size-3.5 shrink-0 text-fraco" aria-hidden="true" /><dt className="sr-only">Combustível</dt><dd className="truncate">{anuncio.combustivel}</dd></div>
        </dl>
      </div>
    </article>
  );
}
