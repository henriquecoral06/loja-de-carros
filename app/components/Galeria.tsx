import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CarroPlaceholder } from "./CarroPlaceholder";

type Foto = { id: string; url: string };

export function Galeria({ fotos, titulo, carroceria }: { fotos: Foto[]; titulo: string; carroceria: string }) {
  const [atual, setAtual] = useState(0);
  const dialogo = useRef<HTMLDialogElement>(null);
  const toque = useRef<number | null>(null);
  const total = fotos.length;

  // Atualização funcional: duas setas no mesmo instante (tecla segurada)
  // leriam o mesmo índice e uma delas se perderia.
  const passo = (d: number) => setAtual((a) => (((a + d) % total) + total) % total);
  const ir = (i: number) => setAtual(((i % total) + total) % total);
  const abridor = useRef<HTMLButtonElement>(null);

  useEffect(() => setAtual(0), [fotos]);

  if (!total) {
    return (
      <div className="overflow-hidden rounded-2xl border border-linha">
        <CarroPlaceholder carroceria={carroceria} className="aspect-[4/3] w-full" />
      </div>
    );
  }

  const gestos = {
    onTouchStart: (e: React.TouchEvent) => { toque.current = e.touches[0].clientX; },
    onTouchEnd: (e: React.TouchEvent) => {
      if (toque.current === null) return;
      const d = e.changedTouches[0].clientX - toque.current;
      if (Math.abs(d) > 40) passo(d < 0 ? 1 : -1);
      toque.current = null;
    },
  };

  return (
    <div>
      <div className="group relative overflow-hidden rounded-2xl bg-noite" {...gestos}>
        <button ref={abridor} type="button" onClick={() => dialogo.current?.showModal()} className="block w-full cursor-zoom-in"
          aria-label={`Ampliar foto ${atual + 1} de ${total}`}>
          <img src={fotos[atual].url} alt={`${titulo} — foto ${atual + 1} de ${total}`}
            className="aspect-[4/3] w-full object-cover" fetchPriority="high" />
        </button>

        {total > 1 && (
          <>
            <button type="button" onClick={() => passo(-1)} aria-label="Foto anterior"
              className="absolute left-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-tinta shadow-card-hover transition hover:bg-white">
              <ChevronLeft className="size-5" />
            </button>
            <button type="button" onClick={() => passo(1)} aria-label="Próxima foto"
              className="absolute right-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-tinta shadow-card-hover transition hover:bg-white">
              <ChevronRight className="size-5" />
            </button>
          </>
        )}

        <span className="numeros pointer-events-none absolute bottom-3 left-3 rounded-md bg-tinta/75 px-2.5 py-1 text-sm font-medium text-white">
          {atual + 1} / {total}
        </span>
        <span className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-md bg-tinta/75 px-2.5 py-1 text-sm font-medium text-white">
          <Expand className="size-3.5" aria-hidden="true" /> Ampliar
        </span>
      </div>

      {total > 1 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Miniaturas">
          {fotos.map((f, i) => (
            <li key={f.id} className="shrink-0">
              <button type="button" onClick={() => ir(i)} aria-label={`Ver foto ${i + 1}`} aria-current={i === atual}
                className={`block overflow-hidden rounded-lg border-2 transition ${i === atual ? "border-marca-600" : "border-transparent opacity-70 hover:opacity-100"}`}>
                <img src={f.url} alt="" loading="lazy" className="h-16 w-24 object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* <dialog> nativo: prende o foco e fecha com Esc, sem biblioteca. A
          devolução do foco é explícita: o navegador devolve ao elemento
          que tinha foco antes, e o Safari não dá foco a botão clicado. */}
      <dialog ref={dialogo} aria-label={`Fotos de ${titulo}`}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-transparent p-0 backdrop:bg-noite/95"
        onClose={() => abridor.current?.focus()}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") passo(1);
          if (e.key === "ArrowLeft") passo(-1);
        }}
        onClick={(e) => e.target === e.currentTarget && dialogo.current?.close()}>
        <div className="flex h-full flex-col" {...gestos}>
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <span className="numeros text-sm">{atual + 1} / {total}</span>
            <button type="button" onClick={() => dialogo.current?.close()} className="grid size-11 place-items-center rounded-full hover:bg-white/10" aria-label="Fechar">
              <X className="size-6" />
            </button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6"
            onClick={(e) => e.target === e.currentTarget && dialogo.current?.close()}>
            <img src={fotos[atual].url} alt={`${titulo} — foto ${atual + 1} de ${total}`} className="max-h-full max-w-full object-contain" />
            {total > 1 && (
              <>
                <button type="button" onClick={() => passo(-1)} aria-label="Foto anterior"
                  className="absolute left-4 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25">
                  <ChevronLeft className="size-6" />
                </button>
                <button type="button" onClick={() => passo(1)} aria-label="Próxima foto"
                  className="absolute right-4 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25">
                  <ChevronRight className="size-6" />
                </button>
              </>
            )}
          </div>
        </div>
      </dialog>
    </div>
  );
}
