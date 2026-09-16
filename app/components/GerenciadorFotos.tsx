import { ChevronLeft, ChevronRight, ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { reduzirImagem as reduzir } from "~/lib/imagem-cliente";
import { SITE } from "~/lib/site";
import { cn } from "~/lib/ui";

type Existente = { id: string; url: string };
type Item =
  | { chave: string; tipo: "existente"; id: string; url: string }
  | { chave: string; tipo: "nova"; arquivo: File; url: string };

export function GerenciadorFotos({ existentes, erro }: { existentes: Existente[]; erro?: string }) {
  const [comJs, setComJs] = useState(false);
  const [itens, setItens] = useState<Item[]>(() => existentes.map((f) => ({ chave: f.id, tipo: "existente", ...f })));
  const [processando, setProcessando] = useState(0);
  const [arrastando, setArrastando] = useState(false);
  const [aviso, setAviso] = useState("");
  const entradaNomeada = useRef<HTMLInputElement>(null);
  const seletor = useRef<HTMLInputElement>(null);

  useEffect(() => setComJs(true), []);

  // O input com name="fotos_novas" é o que vai no POST. Com JS, os
  // arquivos dele são montados aqui, já reduzidos e na ordem escolhida.
  useEffect(() => {
    if (!comJs || !entradaNomeada.current) return;
    const dt = new DataTransfer();
    itens.forEach((i) => i.tipo === "nova" && dt.items.add(i.arquivo));
    entradaNomeada.current.files = dt.files;
  }, [itens, comJs]);

  // Libera as URLs temporárias ao sair da página. Lê de um ref: a lista
  // capturada no primeiro render não teria as fotos adicionadas depois.
  const itensAtuais = useRef(itens);
  itensAtuais.current = itens;
  useEffect(() => () => itensAtuais.current.forEach((i) => i.tipo === "nova" && URL.revokeObjectURL(i.url)), []);

  async function adicionar(lista: FileList | File[]) {
    setAviso("");
    const imagens = Array.from(lista).filter((f) => f.type.startsWith("image/"));
    const vagas = SITE.maxFotosPorAnuncio - itens.length;
    if (imagens.length > vagas) setAviso(`Cabem só mais ${Math.max(vagas, 0)} fotos. O limite é ${SITE.maxFotosPorAnuncio}.`);
    const aceitas = imagens.slice(0, Math.max(vagas, 0));
    if (!aceitas.length) return;

    setProcessando((n) => n + aceitas.length);
    for (const arquivo of aceitas) {
      const reduzido = await reduzir(arquivo);
      setItens((atual) => [...atual, { chave: crypto.randomUUID(), tipo: "nova", arquivo: reduzido, url: URL.createObjectURL(reduzido) }]);
      setProcessando((n) => n - 1);
    }
  }

  const mover = (i: number, d: -1 | 1) => setItens((atual) => {
    const j = i + d;
    if (j < 0 || j >= atual.length) return atual;
    const copia = [...atual];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    return copia;
  });

  const remover = (i: number) => setItens((atual) => {
    const item = atual[i];
    if (item.tipo === "nova") URL.revokeObjectURL(item.url);
    return atual.filter((_, k) => k !== i);
  });

  let indiceNova = 0;

  return (
    <div>
      {/* Ordem final: e:<id> para foto que já existe, n:<i> para a i-ésima nova. */}
      {itens.map((item) => (
        <input key={`ordem-${item.chave}`} type="hidden" name="ordem"
          value={item.tipo === "existente" ? `e:${item.id}` : `n:${indiceNova++}`} />
      ))}

      <input ref={entradaNomeada} type="file" name="fotos_novas" multiple accept="image/jpeg,image/png,image/webp"
        className={comJs ? "sr-only" : "campo h-auto py-2"} tabIndex={comJs ? -1 : undefined}
        aria-hidden={comJs ? true : undefined} />

      {comJs && (
        <>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-label="Fotos do anúncio">
            {itens.map((item, i) => (
              <li key={item.chave} className="group relative overflow-hidden rounded-xl border border-linha bg-fundo">
                <img src={item.url} alt={`Foto ${i + 1}`} className="aspect-[4/3] w-full object-cover" />
                {i === 0 && (
                  <span className="absolute left-2 top-2 rounded-md bg-marca-600 px-2 py-0.5 text-xs font-bold text-sobre-marca">Capa</span>
                )}
                <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-tinta/80 to-transparent p-2">
                  <div className="flex gap-1">
                    <button type="button" onClick={() => mover(i, -1)} disabled={i === 0}
                      className="grid size-8 place-items-center rounded-md bg-white/90 text-tinta hover:bg-white disabled:opacity-40"
                      aria-label={`Mover foto ${i + 1} para antes`}>
                      <ChevronLeft className="size-4" />
                    </button>
                    <button type="button" onClick={() => mover(i, 1)} disabled={i === itens.length - 1}
                      className="grid size-8 place-items-center rounded-md bg-white/90 text-tinta hover:bg-white disabled:opacity-40"
                      aria-label={`Mover foto ${i + 1} para depois`}>
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                  <button type="button" onClick={() => remover(i)}
                    className="grid size-8 place-items-center rounded-md bg-white/90 text-erro hover:bg-white"
                    aria-label={`Remover foto ${i + 1}`}>
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}

            {Array.from({ length: processando }).map((_, i) => (
              <li key={`processando-${i}`} className="grid aspect-[4/3] place-items-center rounded-xl border border-dashed border-linha-forte bg-fundo text-suave">
                <LoaderCircle className="size-6 animate-spin" aria-label="Preparando foto" />
              </li>
            ))}

            {itens.length + processando < SITE.maxFotosPorAnuncio && (
              <li>
                <button type="button" onClick={() => seletor.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
                  onDragLeave={() => setArrastando(false)}
                  onDrop={(e) => { e.preventDefault(); setArrastando(false); adicionar(e.dataTransfer.files); }}
                  className={cn("flex aspect-[4/3] w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed text-sm font-semibold transition-colors",
                    arrastando ? "border-marca-600 bg-marca-50 text-marca-700" : "border-linha-forte bg-white text-suave hover:border-marca-600 hover:text-marca-700")}>
                  <ImagePlus className="size-6" aria-hidden="true" />
                  Adicionar fotos
                </button>
              </li>
            )}
          </ul>
          <input ref={seletor} type="file" multiple accept="image/*" className="sr-only" tabIndex={-1} aria-hidden="true"
            onChange={(e) => { if (e.target.files) adicionar(e.target.files); e.target.value = ""; }} />
        </>
      )}

      <p className="numeros mt-3 text-sm text-suave" aria-live="polite">
        {comJs ? `${itens.length} de ${SITE.maxFotosPorAnuncio} fotos. A primeira é a capa do anúncio.` : `Até ${SITE.maxFotosPorAnuncio} fotos, 8 MB cada.`}
      </p>
      {aviso && <p className="mt-1 text-sm text-alerta">{aviso}</p>}
      {erro && <p role="alert" className="mt-1 text-sm text-erro">{erro}</p>}
    </div>
  );
}
