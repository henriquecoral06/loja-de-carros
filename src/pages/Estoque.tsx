import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SlidersHorizontal, X } from "@phosphor-icons/react";
import { useVeiculos, useFiltrosDisponiveis, POR_PAGINA, type Filtros } from "@/hooks/useVeiculos";
import VeiculoCard from "@/components/VeiculoCard";
import { moeda } from "@/lib/utils";
import { useTituloPagina } from "@/hooks/useTituloPagina";

/**
 * Os filtros moram na URL, não no estado do componente: o vendedor manda
 * a busca pronta pelo WhatsApp, o visitante volta pelo botão do
 * navegador e o Google indexa a combinação.
 */
export default function Estoque() {
  useTituloPagina("Estoque");
  const [params, setParams] = useSearchParams();
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const { data: opcoes } = useFiltrosDisponiveis();

  const filtros: Filtros = {
    busca: params.get("busca") ?? undefined,
    marca_id: params.get("marca") ?? undefined,
    modelo_id: params.get("modelo") ?? undefined,
    preco_max: params.get("preco_max") ? Number(params.get("preco_max")) : undefined,
    cambio: params.get("cambio") ?? undefined,
    combustivel: params.get("combustivel") ?? undefined,
    carroceria: params.get("carroceria") ?? undefined,
    ordenacao: (params.get("ordem") as Filtros["ordenacao"]) ?? "recentes",
    pagina: Number(params.get("pagina") ?? 1),
  };

  const { data, isLoading } = useVeiculos(filtros);
  const totalPaginas = Math.ceil((data?.total ?? 0) / POR_PAGINA);
  const ativos = Array.from(params.entries()).filter(([k]) => k !== "ordem" && k !== "pagina");

  function aplicar(chave: string, valor: string) {
    const novo = new URLSearchParams(params);
    valor ? novo.set(chave, valor) : novo.delete(chave);
    if (chave === "marca") novo.delete("modelo");
    novo.delete("pagina");
    setParams(novo);
  }

  const alternar = (chave: string, valor: string) =>
    aplicar(chave, params.get(chave) === valor ? "" : valor);

  const modelos = filtros.marca_id ? opcoes?.modelosPorMarca?.[filtros.marca_id] ?? [] : [];
  const rotuloFiltro = (chave: string, valor: string) => {
    if (chave === "marca") return opcoes?.marcas?.find((m) => m.id === valor)?.nome ?? valor;
    if (chave === "modelo") return modelos.find((m) => m.id === valor)?.nome ?? valor;
    if (chave === "preco_max") return `até ${moeda(Number(valor))}`;
    if (chave === "busca") return `"${valor}"`;
    return valor;
  };

  return (
    <>
      <section className="border-b border-[var(--s-hairline)]">
        <div className="site-container pb-10 pt-12 md:pb-12 md:pt-16">
          <p className="t-label text-[var(--s-muted)]">Estoque</p>
          <h1 className="t-display-lg mt-3 text-[var(--s-ink)]">
            {isLoading ? "Carregando…" : `${data?.total ?? 0} ${data?.total === 1 ? "veículo disponível" : "veículos disponíveis"}`}
          </h1>
        </div>
      </section>

      <div className="site-container py-10">
        <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
          <aside aria-label="Filtros" className="lg:sticky lg:top-24 lg:self-start">
            {/* Abaixo de 1024px os filtros ficavam empilhados no topo e
                empurravam o primeiro carro para fora da tela. Recolhidos,
                quem chega vê estoque primeiro. */}
            <button type="button" onClick={() => setFiltrosAbertos((v) => !v)}
              aria-expanded={filtrosAbertos} aria-controls="painel-filtros"
              className="s-btn s-btn-secondary flex w-full justify-between lg:hidden">
              <span className="flex items-center gap-2"><SlidersHorizontal size={16} /> Filtros</span>
              {ativos.length > 0 && (
                <span className="bg-[var(--s-ink)] px-2 py-0.5 text-[12px] text-[var(--s-on-dark)]">{ativos.length}</span>
              )}
            </button>

            <div id="painel-filtros"
              className={`${filtrosAbertos ? "flex" : "hidden"} mt-6 flex-col gap-7 lg:mt-0 lg:flex`}>
              <div>
                <label htmlFor="f-busca" className="t-label mb-3 block text-[var(--s-muted)]">Buscar</label>
                <input id="f-busca" className="s-field" defaultValue={filtros.busca ?? ""}
                  placeholder="corolla 2020 automático"
                  onBlur={(e) => aplicar("busca", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && aplicar("busca", (e.target as HTMLInputElement).value)} />
              </div>

              <div>
                <label htmlFor="f-marca" className="t-label mb-3 block text-[var(--s-muted)]">Marca</label>
                <select id="f-marca" className="s-field" value={filtros.marca_id ?? ""}
                  onChange={(e) => aplicar("marca", e.target.value)}>
                  <option value="">Todas</option>
                  {opcoes?.marcas?.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
              </div>

              {modelos.length > 0 && (
                <div>
                  <label htmlFor="f-modelo" className="t-label mb-3 block text-[var(--s-muted)]">Modelo</label>
                  <select id="f-modelo" className="s-field" value={filtros.modelo_id ?? ""}
                    onChange={(e) => aplicar("modelo", e.target.value)}>
                    <option value="">Todos</option>
                    {modelos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                  </select>
                </div>
              )}

              {/* Chips em vez de select: são poucas opções e ficam todas à vista. */}
              {[
                { chave: "cambio", rotulo: "Câmbio", lista: opcoes?.cambios },
                { chave: "combustivel", rotulo: "Combustível", lista: opcoes?.combustiveis },
                { chave: "carroceria", rotulo: "Carroceria", lista: opcoes?.carrocerias },
              ].filter((c) => (c.lista ?? []).length > 1).map((campo) => (
                <div key={campo.chave}>
                  <p className="t-label mb-3 text-[var(--s-muted)]">{campo.rotulo}</p>
                  <div className="flex flex-wrap gap-2">
                    {(campo.lista ?? []).map((v) => (
                      <button key={String(v)} type="button" className="s-chip"
                        aria-pressed={params.get(campo.chave) === String(v)}
                        onClick={() => alternar(campo.chave, String(v))}>
                        {String(v)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div>
                <label htmlFor="f-preco" className="t-label mb-3 block text-[var(--s-muted)]">
                  Preço até {filtros.preco_max ? moeda(filtros.preco_max) : "qualquer"}
                </label>
                <input id="f-preco" type="range" min={10000} step={5000}
                  max={Math.max(50000, Math.ceil((opcoes?.precoMax ?? 300000) / 5000) * 5000)}
                  defaultValue={filtros.preco_max ?? opcoes?.precoMax ?? 300000}
                  onMouseUp={(e) => aplicar("preco_max", (e.target as HTMLInputElement).value)}
                  onTouchEnd={(e) => aplicar("preco_max", (e.target as HTMLInputElement).value)}
                  className="h-11 w-full accent-[var(--s-primary)]" />
              </div>
            </div>
          </aside>

          <div>
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {ativos.map(([chave, valor]) => (
                  <button key={chave + valor} type="button" onClick={() => aplicar(chave, "")}
                    className="s-chip" aria-label={`Remover filtro ${rotuloFiltro(chave, valor)}`}>
                    {rotuloFiltro(chave, valor)} <X size={11} weight="bold" />
                  </button>
                ))}
                {ativos.length > 0 && (
                  <button type="button" onClick={() => setParams(new URLSearchParams())}
                    className="t-caption ml-1 text-[var(--s-muted)] underline hover:text-[var(--s-ink)]">
                    limpar tudo
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="ordem" className="t-caption text-[var(--s-muted)]">Ordenar</label>
                <select id="ordem" className="s-field !h-10 !w-auto !py-0 !text-[14px]"
                  value={filtros.ordenacao} onChange={(e) => aplicar("ordem", e.target.value)}>
                  <option value="recentes">Mais recentes</option>
                  <option value="preco_asc">Menor preço</option>
                  <option value="preco_desc">Maior preço</option>
                  <option value="km_asc">Menor quilometragem</option>
                  <option value="ano_desc">Ano mais novo</option>
                </select>
              </div>
            </div>

            {/* O card usa h3; sem um h2 aqui a hierarquia saltava de h1
                para h3 e o leitor de tela perdia o nível. */}
            <h2 className="sr-only">Resultados</h2>

            {isLoading ? (
              <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="aspect-[16/10] animate-pulse bg-[var(--s-surface-strong)]" />
                ))}
              </div>
            ) : data?.veiculos.length ? (
              <>
                <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
                  {data.veiculos.map((v) => <VeiculoCard key={v.id} veiculo={v} />)}
                </div>

                {totalPaginas > 1 && (
                  <nav aria-label="Paginação" className="mt-16 flex justify-center gap-2">
                    {Array.from({ length: totalPaginas }).map((_, i) => (
                      <button key={i} onClick={() => aplicar("pagina", String(i + 1))}
                        aria-current={filtros.pagina === i + 1 ? "page" : undefined}
                        className={`h-11 w-11 border text-[14px] font-bold ${
                          filtros.pagina === i + 1
                            ? "border-[var(--s-ink)] bg-[var(--s-ink)] text-[var(--s-on-dark)]"
                            : "border-[var(--s-hairline-strong)] text-[var(--s-ink)] hover:border-[var(--s-ink)]"}`}>
                        {i + 1}
                      </button>
                    ))}
                  </nav>
                )}
              </>
            ) : (
              <div className="border border-[var(--s-hairline)] p-14 text-center">
                <p className="t-title-md text-[var(--s-ink)]">Nenhum veículo com esses filtros.</p>
                <p className="t-body-md mx-auto mt-3 max-w-[28rem] text-[var(--s-muted)]">
                  Tente ampliar a busca — ou fale com a gente que procuramos o carro para você.
                </p>
                <button onClick={() => setParams(new URLSearchParams())} className="s-btn s-btn-primary mt-8">
                  Ver todo o estoque
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
