import { useSearchParams } from "react-router-dom";
import { useVeiculos, useFiltrosDisponiveis, POR_PAGINA, type Filtros } from "@/hooks/useVeiculos";
import VeiculoCard from "@/components/VeiculoCard";

/**
 * Os filtros moram na URL, não no estado do componente. Isso dá três
 * coisas de graça: o vendedor manda a busca pronta pelo WhatsApp, o
 * visitante volta pelo botão do navegador e o Google indexa a combinação.
 */
export default function Estoque() {
  const [params, setParams] = useSearchParams();
  const { data: opcoes } = useFiltrosDisponiveis();

  const filtros: Filtros = {
    busca: params.get("busca") ?? undefined,
    marca_id: params.get("marca") ?? undefined,
    modelo_id: params.get("modelo") ?? undefined,
    preco_max: params.get("preco_max") ? Number(params.get("preco_max")) : undefined,
    ano_min: params.get("ano_min") ? Number(params.get("ano_min")) : undefined,
    km_max: params.get("km_max") ? Number(params.get("km_max")) : undefined,
    cambio: params.get("cambio") ?? undefined,
    combustivel: params.get("combustivel") ?? undefined,
    carroceria: params.get("carroceria") ?? undefined,
    ordenacao: (params.get("ordem") as Filtros["ordenacao"]) ?? "recentes",
    pagina: Number(params.get("pagina") ?? 1),
  };

  const { data, isLoading } = useVeiculos(filtros);
  const totalPaginas = Math.ceil((data?.total ?? 0) / POR_PAGINA);
  const temFiltro = Array.from(params.keys()).some((k) => k !== "ordem" && k !== "pagina");

  function aplicar(chave: string, valor: string) {
    const novo = new URLSearchParams(params);
    valor ? novo.set(chave, valor) : novo.delete(chave);
    if (chave === "marca") novo.delete("modelo");
    novo.delete("pagina");
    setParams(novo);
  }

  const modelos = filtros.marca_id ? opcoes?.modelosPorMarca?.[filtros.marca_id] ?? [] : [];

  return (
    <div className="container py-8">
      <h1 className="font-display text-3xl font-bold">Estoque</h1>
      <p className="mt-1 text-muted-foreground">
        {isLoading ? "Carregando..." : `${data?.total ?? 0} veículo(s) disponíveis`}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div>
            <label htmlFor="f-busca" className="text-sm font-medium">Buscar</label>
            <input
              id="f-busca" defaultValue={filtros.busca ?? ""}
              placeholder="corolla 2020 automático"
              onBlur={(e) => aplicar("busca", e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="f-marca" className="text-sm font-medium">Marca</label>
            <select id="f-marca" value={filtros.marca_id ?? ""} onChange={(e) => aplicar("marca", e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
              <option value="">Todas</option>
              {opcoes?.marcas?.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          </div>

          {modelos.length > 0 && (
            <div>
              <label htmlFor="f-modelo" className="text-sm font-medium">Modelo</label>
              <select id="f-modelo" value={filtros.modelo_id ?? ""} onChange={(e) => aplicar("modelo", e.target.value)}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option value="">Todos</option>
                {modelos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="f-preco" className="text-sm font-medium">
              Preço até {filtros.preco_max ? `R$ ${Number(filtros.preco_max).toLocaleString("pt-BR")}` : "qualquer"}
            </label>
            <input id="f-preco" type="range" min={10000} max={Math.max(50000, opcoes?.precoMax ?? 300000)} step={5000}
              defaultValue={filtros.preco_max ?? opcoes?.precoMax ?? 300000}
              onMouseUp={(e) => aplicar("preco_max", (e.target as HTMLInputElement).value)}
              onTouchEnd={(e) => aplicar("preco_max", (e.target as HTMLInputElement).value)}
              className="mt-2 w-full" />
          </div>

          {[
            { chave: "cambio", rotulo: "Câmbio", lista: opcoes?.cambios },
            { chave: "combustivel", rotulo: "Combustível", lista: opcoes?.combustiveis },
            { chave: "carroceria", rotulo: "Carroceria", lista: opcoes?.carrocerias },
          ].map((campo) => (
            <div key={campo.chave}>
              <label htmlFor={`f-${campo.chave}`} className="text-sm font-medium">{campo.rotulo}</label>
              <select id={`f-${campo.chave}`} value={params.get(campo.chave) ?? ""}
                onChange={(e) => aplicar(campo.chave, e.target.value)}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option value="">Todos</option>
                {(campo.lista ?? []).map((v) => <option key={String(v)} value={String(v)}>{String(v)}</option>)}
              </select>
            </div>
          ))}

          {temFiltro && (
            <button onClick={() => setParams(new URLSearchParams())}
              className="w-full rounded-md border px-3 py-2 text-sm font-medium">
              Limpar filtros
            </button>
          )}
        </aside>

        <div>
          <div className="mb-4 flex justify-end">
            <select value={filtros.ordenacao} onChange={(e) => aplicar("ordem", e.target.value)}
              aria-label="Ordenar" className="rounded-md border bg-background px-3 py-2 text-sm">
              <option value="recentes">Mais recentes</option>
              <option value="preco_asc">Menor preço</option>
              <option value="preco_desc">Maior preço</option>
              <option value="km_asc">Menor quilometragem</option>
              <option value="ano_desc">Ano mais novo</option>
            </select>
          </div>

          {isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-72 animate-pulse rounded-lg bg-muted" />)}
            </div>
          ) : data?.veiculos.length ? (
            <>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {data.veiculos.map((v) => <VeiculoCard key={v.id} veiculo={v} />)}
              </div>
              {totalPaginas > 1 && (
                <div className="mt-8 flex justify-center gap-2">
                  {Array.from({ length: totalPaginas }).map((_, i) => (
                    <button key={i} onClick={() => aplicar("pagina", String(i + 1))}
                      className={`h-9 w-9 rounded-md border text-sm ${filtros.pagina === i + 1 ? "bg-primary text-primary-foreground" : ""}`}>
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <p className="font-display font-semibold">Nenhum veículo com esses filtros.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Tente ampliar a busca — ou fale com a gente que procuramos o carro para você.
              </p>
              <button onClick={() => setParams(new URLSearchParams())}
                className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                Ver todo o estoque
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
