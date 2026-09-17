import { AlertTriangle, CheckCircle2, ExternalLink, LoaderCircle, SearchCheck, XCircle } from "lucide-react";
import { useState } from "react";
import { moeda } from "~/lib/formato";
import { cn } from "~/lib/ui";

type Item = {
  codigo: string; titulo: string; ano: string; km: number; preco: number; url: string;
  fotos: string[]; fotosQuebradas: number; descricao: boolean; opcionais: number; erros: string[]; avisos: string[];
};
type Linha = { tipo: "ok" | "aviso" | "erro"; texto: string };
type Resultado = { linhas: Linha[]; itens: Item[]; bytes: number };

const texto = (el: Element, tag: string) => el.getElementsByTagName(tag)[0]?.textContent?.trim() ?? "";

/** Carrega a imagem como um portal faria (sem depender de CORS). */
function fotoAbre(src: string) {
  return new Promise<boolean>((ok) => {
    const img = new Image();
    const tempo = setTimeout(() => ok(false), 15000);
    img.onload = () => { clearTimeout(tempo); ok(img.naturalWidth > 0); };
    img.onerror = () => { clearTimeout(tempo); ok(false); };
    img.src = src;
  });
}

/**
 * Lê o feed pelo link público, do mesmo jeito que um portal ou integrador
 * leria, e confere: XML válido, quantidade igual ao estoque à venda, campos
 * obrigatórios e se as fotos abrem. Não depende de conta em portal nenhum.
 */
async function verificar(url: string, aVenda: number): Promise<Resultado> {
  const linhas: Linha[] = [];
  const resposta = await fetch(url, { cache: "no-store" });
  if (!resposta.ok) return { linhas: [{ tipo: "erro", texto: `O link respondeu HTTP ${resposta.status}. O feed está ativo e o link é o atual?` }], itens: [], bytes: 0 };
  const bruto = await resposta.text();
  const tipo = resposta.headers.get("Content-Type") ?? "";
  linhas.push(tipo.includes("xml")
    ? { tipo: "ok", texto: `O link responde (HTTP 200, ${tipo.split(";")[0]}, ${(bruto.length / 1024).toFixed(0)} KB)` }
    : { tipo: "aviso", texto: `O link responde, mas com Content-Type "${tipo}"` });

  const doc = new DOMParser().parseFromString(bruto, "application/xml");
  if (doc.getElementsByTagName("parsererror").length || doc.documentElement.nodeName !== "estoque") {
    linhas.push({ tipo: "erro", texto: "XML inválido: um portal recusaria o arquivo." });
    return { linhas, itens: [], bytes: bruto.length };
  }
  linhas.push({ tipo: "ok", texto: "XML válido (UTF-8, estrutura <estoque> → <veiculo>)" });

  const veiculos = [...doc.getElementsByTagName("veiculo")];
  linhas.push(veiculos.length === aVenda
    ? { tipo: "ok", texto: `${veiculos.length} veículo${veiculos.length === 1 ? "" : "s"} no feed, igual ao estoque à venda` }
    : { tipo: "erro", texto: `${veiculos.length} veículos no feed, mas ${aVenda} à venda no painel` });

  const itens: Item[] = veiculos.map((v) => {
    const fotos = [...v.getElementsByTagName("foto")].map((f) => f.textContent?.trim() ?? "").filter(Boolean);
    const preco = Number(texto(v, "preco"));
    const km = Number(texto(v, "km"));
    const erros: string[] = [];
    const avisos: string[] = [];
    for (const campo of ["codigo", "marca", "modelo", "versao", "ano_modelo", "cambio", "combustivel", "url"]) if (!texto(v, campo)) erros.push(`sem ${campo.replace("_", " ")}`);
    if (!(preco > 0)) erros.push("sem preço");
    if (!Number.isFinite(km) || texto(v, "km") === "") erros.push("sem km");
    if (!fotos.length) erros.push("sem fotos");
    else if (fotos.length < 3) avisos.push(`só ${fotos.length} foto${fotos.length === 1 ? "" : "s"} (portais costumam pedir 3 ou mais)`);
    if (!texto(v, "descricao")) avisos.push("sem descrição");
    return {
      codigo: texto(v, "codigo"), titulo: `${texto(v, "marca")} ${texto(v, "modelo")} ${texto(v, "versao")}`.trim(),
      ano: `${texto(v, "ano_fabricacao")}/${texto(v, "ano_modelo")}`, km, preco, url: texto(v, "url"),
      fotos, fotosQuebradas: 0, descricao: Boolean(texto(v, "descricao")), opcionais: v.getElementsByTagName("opcional").length, erros, avisos,
    };
  });

  // Fotos: todas (até 300), 6 por vez.
  const fila = itens.flatMap((it) => it.fotos.map((src) => ({ it, src }))).slice(0, 300);
  let quebradas = 0;
  for (let i = 0; i < fila.length; i += 6) {
    const lote = fila.slice(i, i + 6);
    const abriram = await Promise.all(lote.map((f) => fotoAbre(f.src)));
    abriram.forEach((ok, j) => { if (!ok) { lote[j].it.fotosQuebradas++; quebradas++; } });
  }
  for (const it of itens) if (it.fotosQuebradas) it.erros.push(`${it.fotosQuebradas} foto${it.fotosQuebradas === 1 ? "" : "s"} não abre${it.fotosQuebradas === 1 ? "" : "m"}`);
  if (fila.length) {
    linhas.push(quebradas
      ? { tipo: "erro", texto: `${quebradas} de ${fila.length} fotos não abriram` }
      : { tipo: "ok", texto: `As ${fila.length} fotos abrem por link público` });
  }

  const comErro = itens.filter((i) => i.erros.length).length;
  const comAviso = itens.filter((i) => !i.erros.length && i.avisos.length).length;
  if (comErro) linhas.push({ tipo: "erro", texto: `${comErro} veículo${comErro === 1 ? "" : "s"} com problema que um portal recusaria` });
  if (comAviso) linhas.push({ tipo: "aviso", texto: `${comAviso} veículo${comAviso === 1 ? "" : "s"} aceito${comAviso === 1 ? "" : "s"}, mas com anúncio fraco` });
  if (!comErro && !comAviso && itens.length) linhas.push({ tipo: "ok", texto: "Todos os veículos com os dados completos" });
  return { linhas, itens, bytes: bruto.length };
}

const ICONE = { ok: CheckCircle2, aviso: AlertTriangle, erro: XCircle };
const COR = { ok: "text-sucesso", aviso: "text-alerta", erro: "text-erro" };

export function VerificadorFeed({ url, aVenda }: { url: string; aVenda: number }) {
  const [estado, setEstado] = useState<"parado" | "verificando" | "pronto">("parado");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [todos, setTodos] = useState(false);

  async function rodar() {
    setEstado("verificando");
    try {
      setResultado(await verificar(url, aVenda));
    } catch (e) {
      setResultado({ linhas: [{ tipo: "erro", texto: `Não consegui ler o feed: ${e instanceof Error ? e.message : String(e)}` }], itens: [], bytes: 0 });
    }
    setEstado("pronto");
  }

  const itens = resultado?.itens ?? [];
  const visiveis = todos ? itens : [...itens.filter((i) => i.erros.length || i.avisos.length), ...itens.filter((i) => !i.erros.length && !i.avisos.length)].slice(0, 8);

  return (
    <div className="mt-4 rounded-lg border border-linha bg-fundo/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-tinta">Verificar o feed</p>
          <p className="text-suave">Lê o link como um portal leria e confere o XML, os dados de cada carro e as fotos. Não precisa de conta em portal.</p>
        </div>
        <div className="flex gap-2">
          <a href={url} target="_blank" rel="noopener" className="botao-fantasma h-9 px-3 text-sm"><ExternalLink className="size-4" aria-hidden="true" /> Abrir XML</a>
          <button type="button" onClick={rodar} disabled={estado === "verificando"} className="botao-primario h-9 px-3 text-sm">
            {estado === "verificando" ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <SearchCheck className="size-4" aria-hidden="true" />}
            {estado === "verificando" ? "Verificando…" : estado === "pronto" ? "Verificar de novo" : "Verificar feed"}
          </button>
        </div>
      </div>

      {resultado && estado === "pronto" && (
        <div className="mt-4" role="status">
          <ul className="grid gap-1.5">
            {resultado.linhas.map((l, i) => {
              const Icone = ICONE[l.tipo];
              return <li key={i} className="flex items-start gap-2"><Icone className={cn("mt-0.5 size-4 shrink-0", COR[l.tipo])} aria-hidden="true" /> <span className="text-texto">{l.texto}</span></li>;
            })}
          </ul>

          {itens.length > 0 && (
            <>
              <p className="mb-2 mt-5 font-semibold text-tinta">Como os carros chegam ao portal</p>
              <div className="overflow-x-auto rounded-lg border border-linha bg-white">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="bg-[#fafafa] text-xs uppercase tracking-wide text-suave">
                    <tr>{["Veículo", "Ano", "Km", "Preço", "Fotos", "Situação"].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {visiveis.map((it) => (
                      <tr key={it.codigo + it.url} className="border-t border-linha align-top">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-3">
                            {it.fotos[0] ? <img src={it.fotos[0]} alt="" className="h-10 w-14 shrink-0 rounded object-cover" loading="lazy" /> : <span className="h-10 w-14 shrink-0 rounded bg-fundo" />}
                            <div className="min-w-0">
                              <a href={it.url} target="_blank" rel="noopener" className="font-medium text-tinta hover:underline">{it.titulo}</a>
                              <p className="numeros text-xs text-suave">Cód. {it.codigo} · {it.opcionais} opcionais</p>
                            </div>
                          </div>
                        </td>
                        <td className="numeros px-3 py-2">{it.ano}</td>
                        <td className="numeros px-3 py-2">{Number.isFinite(it.km) ? it.km.toLocaleString("pt-BR") : "—"}</td>
                        <td className="numeros px-3 py-2">{it.preco > 0 ? moeda(it.preco) : "—"}</td>
                        <td className="numeros px-3 py-2">{it.fotos.length}</td>
                        <td className="px-3 py-2">
                          {it.erros.length ? <span className="text-erro">{it.erros.join(", ")}</span>
                            : it.avisos.length ? <span className="text-alerta">{it.avisos.join(", ")}</span>
                            : <span className="text-sucesso">Completo</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {itens.length > 8 && (
                <button type="button" onClick={() => setTodos((t) => !t)} className="botao-fantasma mt-2 h-9 px-3 text-sm">
                  {todos ? "Mostrar menos" : `Ver todos os ${itens.length} veículos`}
                </button>
              )}
            </>
          )}
          <p className="mt-4 text-xs text-suave">
            Este XML segue um formato próprio e documentado. Cada portal (Webmotors, OLX, iCarros, Mobiauto…) tem o seu layout e o
            entrega junto com o contrato ou por meio de um sistema integrador. Com o layout em mãos, o arquivo é adaptado em
            <code className="mx-1">app/routes/feed.ts</code>.
          </p>
        </div>
      )}
    </div>
  );
}
