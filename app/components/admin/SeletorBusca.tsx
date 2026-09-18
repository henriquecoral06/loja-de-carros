import { Check, ChevronDown, Plus, Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "~/lib/ui";

export type OpcaoBusca = {
  valor: string;
  rotulo: string;
  /** Linha menor abaixo do rótulo (código, ano, preço…). */
  detalhe?: string;
  /** Miniatura à esquerda (foto do carro). */
  imagem?: string | null;
  /** Aviso em destaque (ex.: "vendido"). */
  aviso?: string;
  /** Texto extra que a busca também considera. */
  busca?: string;
};

type Props = {
  id: string;
  /** Nome do campo enviado no formulário (padrão: o id). */
  name?: string;
  rotulo: string;
  opcoes: OpcaoBusca[];
  valor: string;
  aoMudar: (valor: string) => void;
  placeholder?: string;
  erro?: string;
  dica?: string;
  disabled?: boolean;
  className?: string;
  /** Texto quando não há nenhuma opção. */
  vazio?: string;
  /** Oferece "+ Adicionar …" quando o texto digitado não existe na lista. */
  criar?: { rotulo: (texto: string) => string; aoCriar: (texto: string) => void; criando?: boolean };
};

const LIMITE = 60;
export const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/**
 * Campo de escolha com busca: digite parte do nome (sem acento, em qualquer
 * ordem) e escolha na lista. Substitui o <select> quando a lista é longa.
 * O valor vai num <input type="hidden">, então funciona dentro de <Form>.
 */
export function SeletorBusca({ id, name, rotulo, opcoes, valor, aoMudar, placeholder = "Digite para buscar", erro, dica, disabled, className, vazio, criar }: Props) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [ativo, setAtivo] = useState(0);
  const lista = useRef<HTMLUListElement>(null);
  const campo = useRef<HTMLInputElement>(null);
  const idLista = useId();

  const escolhida = opcoes.find((o) => o.valor === valor);
  const filtradas = useMemo(() => {
    const palavras = normalizar(texto).split(/\s+/).filter(Boolean);
    if (!palavras.length) return opcoes;
    return opcoes.filter((o) => {
      const alvo = normalizar(`${o.rotulo} ${o.detalhe ?? ""} ${o.busca ?? ""}`);
      return palavras.every((p) => alvo.includes(p));
    });
  }, [opcoes, texto]);
  const visiveis = filtradas.slice(0, LIMITE);
  const podeCriar = Boolean(criar && texto.trim() && !opcoes.some((o) => normalizar(o.rotulo) === normalizar(texto)));
  const total = visiveis.length + (podeCriar ? 1 : 0);

  useEffect(() => setAtivo(0), [texto]);
  useEffect(() => {
    if (aberto) lista.current?.querySelector<HTMLElement>(`[data-indice="${ativo}"]`)?.scrollIntoView({ block: "nearest" });
  }, [ativo, aberto]);

  const abrir = () => { if (!disabled) { setTexto(""); setAberto(true); } };
  const fechar = () => { setAberto(false); setTexto(""); };
  const escolher = (o: OpcaoBusca) => { aoMudar(o.valor); fechar(); };
  const acionarCriar = () => { if (criar) { criar.aoCriar(texto.trim()); fechar(); } };

  const tecla = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!aberto) return abrir();
      setAtivo((a) => (total ? (a + (e.key === "ArrowDown" ? 1 : -1) + total) % total : 0));
    } else if (e.key === "Enter") {
      // Enter escolhe na lista; nunca envia o formulário por engano.
      e.preventDefault();
      if (!aberto) return abrir();
      if (ativo < visiveis.length) escolher(visiveis[ativo]);
      else if (podeCriar) acionarCriar();
    } else if (e.key === "Escape" && aberto) {
      e.preventDefault();
      fechar();
    }
  };

  const descricao = erro ? `${id}-erro` : dica ? `${id}-dica` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="rotulo">{rotulo}</label>
      <input type="hidden" name={name ?? id} value={valor} />
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fraco" aria-hidden="true" />
        <input
          ref={campo} id={id} type="text" role="combobox" autoComplete="off" disabled={disabled}
          aria-expanded={aberto} aria-controls={idLista} aria-autocomplete="list"
          aria-activedescendant={aberto && total ? `${idLista}-${ativo}` : undefined}
          aria-invalid={erro ? true : undefined} aria-describedby={descricao}
          className={cn("campo pl-9 pr-9", disabled && "cursor-not-allowed")}
          placeholder={escolhida && !aberto ? undefined : placeholder}
          value={aberto ? texto : escolhida?.rotulo ?? ""}
          onChange={(e) => { setTexto(e.target.value); setAberto(true); }}
          onFocus={abrir} onClick={() => !aberto && abrir()} onBlur={fechar} onKeyDown={tecla}
        />
        <ChevronDown className={cn("pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-fraco transition", aberto && "rotate-180")} aria-hidden="true" />

        {aberto && (
          <ul ref={lista} id={idLista} role="listbox" aria-label={rotulo}
            className="absolute inset-x-0 top-full z-40 mt-1 max-h-80 overflow-y-auto rounded-xl border border-linha bg-white p-1 shadow-lg"
            // Clicar na lista não pode tirar o foco do campo antes da escolha.
            onMouseDown={(e) => e.preventDefault()}>
            {visiveis.map((o, i) => (
              <li key={o.valor} id={`${idLista}-${i}`} data-indice={i} role="option" aria-selected={o.valor === valor}
                onClick={() => escolher(o)} onMouseMove={() => setAtivo(i)}
                className={cn("flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2", i === ativo && "bg-fundo")}>
                {o.imagem !== undefined && (
                  <span className="size-11 shrink-0 overflow-hidden rounded-md bg-fundo">
                    {o.imagem && <img src={o.imagem} alt="" loading="lazy" className="size-full object-cover" />}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-tinta">{o.rotulo}</span>
                  {(o.detalhe || o.aviso) && (
                    <span className="numeros block truncate text-xs text-suave">
                      {o.detalhe}{o.aviso && <span className="font-semibold text-alerta">{o.detalhe ? " · " : ""}{o.aviso}</span>}
                    </span>
                  )}
                </span>
                {o.valor === valor && <Check className="size-4 shrink-0 text-marca-700" aria-hidden="true" />}
              </li>
            ))}
            {podeCriar && (
              <li id={`${idLista}-${visiveis.length}`} data-indice={visiveis.length} role="option" aria-selected={false}
                onClick={acionarCriar} onMouseMove={() => setAtivo(visiveis.length)}
                className={cn("flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-marca-700", ativo === visiveis.length && "bg-marca-50")}>
                <Plus className="size-4 shrink-0" aria-hidden="true" /> {criar!.rotulo(texto.trim())}
              </li>
            )}
            {!visiveis.length && !podeCriar && (
              <li className="px-3 py-3 text-sm text-suave">{opcoes.length ? "Nada encontrado com esse texto." : vazio ?? "Nenhuma opção."}</li>
            )}
            {filtradas.length > LIMITE && (
              <li className="px-3 py-2 text-xs text-suave">Mostrando {LIMITE} de {filtradas.length}. Digite mais para filtrar.</li>
            )}
          </ul>
        )}
      </div>
      {criar?.criando && <p className="mt-1.5 text-sm text-suave" role="status">Adicionando…</p>}
      {erro ? <p id={`${id}-erro`} className="mt-1.5 text-sm text-erro">{erro}</p>
        : dica ? <p id={`${id}-dica`} className="mt-1.5 text-sm text-suave">{dica}</p> : null}
    </div>
  );
}
