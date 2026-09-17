import { ImageUp, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { COR_HEX } from "~/lib/cores";
import { DDIS, telefone } from "~/lib/formato";
import { reduzirImagem } from "~/lib/imagem-cliente";
import { cn } from "~/lib/ui";

/** Cor com seletor nativo e campo hexadecimal sincronizados. */
export function SeletorCor({ id, rotulo, valor, aoMudar, dica }: { id: string; rotulo: string; valor: string; aoMudar: (v: string) => void; dica?: string }) {
  const [texto, setTexto] = useState(valor);
  useEffect(() => setTexto(valor), [valor]);
  const valido = COR_HEX.test(texto);

  return (
    <div>
      <label htmlFor={id} className="rotulo">{rotulo}</label>
      <div className="flex gap-2">
        <input type="color" aria-label={`${rotulo}: seletor`} value={COR_HEX.test(valor) ? valor : "#000000"}
          onChange={(e) => aoMudar(e.target.value)} className="h-11 w-12 shrink-0 cursor-pointer rounded-lg border border-linha-forte bg-white p-1" />
        <input id={id} name={id} value={texto} maxLength={7} spellCheck={false} autoComplete="off"
          onChange={(e) => {
            const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
            setTexto(v);
            if (COR_HEX.test(v)) aoMudar(v.toLowerCase());
          }}
          className="campo numeros" aria-invalid={valido ? undefined : true} aria-describedby={dica ? `${id}-dica` : undefined} />
      </div>
      {dica && <p id={`${id}-dica`} className="mt-1.5 text-xs text-suave">{dica}</p>}
    </div>
  );
}

/**
 * Envio de imagem com prévia ao lado, no formato da referência:
 * miniatura à esquerda, botão, nome do arquivo, dica e "remover".
 */
export function ArquivoImagem({ campo, rotulo, dica, url, padrao, aoMudar, aceita, escuro, largo, reduzirPara, erro, empilhado }: {
  campo: string; rotulo: string; dica?: string; url: string | null; padrao?: string; aoMudar?: (url: string | null) => void;
  aceita: string; escuro?: boolean; largo?: boolean; reduzirPara?: number; erro?: string; empilhado?: boolean;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [atual, setAtual] = useState(url);
  const [remover, setRemover] = useState(false);
  const [nome, setNome] = useState("");
  useEffect(() => { setAtual(url); setRemover(false); setNome(""); }, [url]);
  const mostrada = atual ?? padrao ?? null;
  const mudar = (u: string | null) => { setAtual(u); aoMudar?.(u); };

  async function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    let arquivo = e.target.files?.[0];
    if (!arquivo) return;
    if (reduzirPara && arquivo.type !== "image/svg+xml") {
      arquivo = await reduzirImagem(arquivo, reduzirPara);
      const dt = new DataTransfer();
      dt.items.add(arquivo);
      e.target.files = dt.files;
    }
    setRemover(false);
    setNome(arquivo.name);
    mudar(URL.createObjectURL(arquivo));
  }

  return (
    <div className={cn("flex flex-col gap-4 rounded-xl border border-linha p-4", !empilhado && "sm:flex-row sm:items-center")}>
      <div className={cn("grid shrink-0 place-items-center overflow-hidden rounded-lg", largo ? cn("aspect-[16/9] w-full", !empilhado && "sm:w-44") : cn("h-20 w-full p-2", !empilhado && "sm:w-40"),
        escuro ? "bg-noite" : "bg-fundo")}>
        {mostrada
          ? <img src={mostrada} alt="" className={largo ? "size-full object-cover" : "max-h-full max-w-full object-contain"} />
          : <span className={cn("text-xs", escuro ? "text-white/60" : "text-fraco")}>Sem imagem</span>}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-tinta">{rotulo}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="botao-secundario h-9 cursor-pointer whitespace-nowrap px-3 text-sm focus-within:outline-2 focus-within:outline-marca-600">
            <ImageUp className="size-4" aria-hidden="true" /> {atual ? "Trocar arquivo" : "Escolher arquivo"}
            <input ref={entrada} type="file" name={campo} accept={aceita} onChange={escolher} className="sr-only" />
          </label>
          {atual && (
            <button type="button" className="botao-fantasma h-9 px-3 text-sm text-erro"
              onClick={() => { setRemover(true); setNome(""); if (entrada.current) entrada.current.value = ""; mudar(null); }}>
              <Trash2 className="size-4" aria-hidden="true" /> Remover
            </button>
          )}
          <span className="min-w-0 truncate text-xs text-suave">{nome || (remover ? "Será removida ao salvar" : "")}</span>
        </div>
        {erro ? <p className="mt-1.5 text-sm text-erro">{erro}</p> : dica ? <p className="mt-1.5 text-xs text-suave">{dica}</p> : null}
      </div>
      <input type="hidden" name={`remover_${campo}`} value={remover ? "1" : ""} />
    </div>
  );
}

/** Telefone com seletor de DDI, como na referência (🇧🇷 +55 | (48) 99999-0000). */
export function CampoTelefone({ id, rotulo, ddi, numero, erro, dica }: { id: string; rotulo: string; ddi: string; numero: string; erro?: string; dica?: string }) {
  return (
    <div>
      <label htmlFor={id} className="rotulo">{rotulo}</label>
      <div className="flex gap-2">
        <select name={`${id}Ddi`} defaultValue={ddi} aria-label={`${rotulo}: país`} className="campo w-28 shrink-0 pr-8 text-sm">
          {DDIS.map((d) => <option key={d.ddi} value={d.ddi}>{d.bandeira} +{d.ddi}</option>)}
        </select>
        <input id={id} name={id} type="tel" defaultValue={numero ? telefone(numero, ddi) : ""} placeholder="(48) 99999-0000" autoComplete="off"
          className="campo numeros" aria-invalid={erro ? true : undefined} aria-describedby={erro ? `${id}-erro` : dica ? `${id}-dica` : undefined} />
      </div>
      {erro ? <p id={`${id}-erro`} className="mt-1.5 text-sm text-erro">{erro}</p> : dica ? <p id={`${id}-dica`} className="mt-1.5 text-xs text-suave">{dica}</p> : null}
    </div>
  );
}
