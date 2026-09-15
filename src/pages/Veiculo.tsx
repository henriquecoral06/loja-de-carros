import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ShareNetwork, WhatsappLogo } from "@phosphor-icons/react";
import { useVeiculo, useFotos, useVeiculos } from "@/hooks/useVeiculos";
import { useConfig } from "@/hooks/useConfig";
import { moeda, numero, tituloVeiculo, linkWhatsApp } from "@/lib/utils";
import LeadForm from "@/components/LeadForm";
import VeiculoCard from "@/components/VeiculoCard";

export default function Veiculo() {
  const { slug } = useParams();
  const { data: veiculo, isLoading } = useVeiculo(slug);
  const { data: fotos } = useFotos(veiculo?.id);
  const { data: config } = useConfig();
  const [fotoAtual, setFotoAtual] = useState(0);

  const { data: semelhantes } = useVeiculos({
    marca_id: veiculo?.marca_id,
    ordenacao: "recentes",
  });

  // Fallback no cliente. O card que aparece ao colar o link no WhatsApp
  // NÃO vem daqui — robô de prévia não roda JavaScript. Quem responde
  // por ele é a edge function `seo`. Ver README.
  useEffect(() => {
    if (!veiculo) return;
    document.title = veiculo.meta_title ?? `${tituloVeiculo(veiculo)} — ${moeda(veiculo.preco_vigente)}`;
  }, [veiculo]);

  if (isLoading) return <div className="container py-16"><div className="h-96 animate-pulse rounded-lg bg-muted" /></div>;

  if (!veiculo) {
    return (
      <div className="container py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Veículo não encontrado</h1>
        <p className="mt-2 text-muted-foreground">Ele pode ter sido vendido. Veja o que temos disponível.</p>
        <Link to="/estoque" className="mt-6 inline-block rounded-md bg-primary px-5 py-2.5 font-semibold text-primary-foreground">
          Ver o estoque
        </Link>
      </div>
    );
  }

  const titulo = tituloVeiculo(veiculo);
  const galeria = fotos?.length ? fotos : veiculo.foto_capa ? [{ url: veiculo.foto_capa }] : [];
  const mensagem = `Olá! Tenho interesse no ${titulo} ${veiculo.ano_modelo}${veiculo.codigo_interno ? ` (cód. ${veiculo.codigo_interno})` : ""}.`;

  const fichaTecnica = [
    ["Ano", `${veiculo.ano_fabricacao}/${veiculo.ano_modelo}`],
    ["Quilometragem", `${numero(veiculo.km)} km`],
    ["Câmbio", veiculo.cambio],
    ["Combustível", veiculo.combustivel],
    ["Cor", veiculo.cor],
    ["Carroceria", veiculo.carroceria],
    ["Portas", String(veiculo.portas)],
    veiculo.motor && ["Motor", veiculo.motor],
    veiculo.potencia_cv && ["Potência", `${veiculo.potencia_cv} cv`],
  ].filter(Boolean) as [string, string][];

  const procedencia = [
    veiculo.unico_dono && "Único dono",
    veiculo.ipva_pago && "IPVA pago",
    veiculo.licenciado && "Licenciado",
    veiculo.laudo_cautelar && "Laudo cautelar aprovado",
    veiculo.manual_chave && "Manual e chave reserva",
  ].filter(Boolean) as string[];

  async function compartilhar() {
    const dados = { title: titulo, text: mensagem, url: window.location.href };
    if (navigator.share) await navigator.share(dados).catch(() => {});
    else await navigator.clipboard.writeText(window.location.href);
  }

  return (
    <div className="container py-8">
      <nav aria-label="Trilha" className="mb-4 text-sm text-muted-foreground">
        <Link to="/" className="hover:underline">Início</Link> ·{" "}
        <Link to="/estoque" className="hover:underline">Estoque</Link> ·{" "}
        <span className="text-foreground">{titulo}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="overflow-hidden rounded-lg border bg-muted">
            {galeria.length ? (
              <img src={galeria[fotoAtual]?.url} alt={titulo} className="aspect-[4/3] w-full object-cover" />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center text-muted-foreground">Sem foto</div>
            )}
          </div>

          {galeria.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {galeria.map((f, i) => (
                <button key={f.url} onClick={() => setFotoAtual(i)}
                  aria-label={`Foto ${i + 1}`}
                  className={`h-16 w-24 flex-shrink-0 overflow-hidden rounded border-2 ${i === fotoAtual ? "border-primary" : "border-transparent"}`}>
                  <img src={f.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <section className="mt-8">
            <h2 className="font-display text-lg font-bold">Ficha técnica</h2>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
              {fichaTecnica.map(([rotulo, valor]) => (
                <div key={rotulo} className="border-b py-2">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">{rotulo}</dt>
                  <dd className="font-medium">{valor}</dd>
                </div>
              ))}
            </dl>
          </section>

          {veiculo.descricao && (
            <section className="mt-8">
              <h2 className="font-display text-lg font-bold">Sobre este veículo</h2>
              <p className="mt-2 whitespace-pre-line text-muted-foreground">{veiculo.descricao}</p>
            </section>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-lg border bg-card p-6">
            <h1 className="font-display text-xl font-bold leading-tight">{titulo}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {veiculo.ano_fabricacao}/{veiculo.ano_modelo} · {numero(veiculo.km)} km
            </p>

            <div className="mt-4">
              {veiculo.preco_sob_consulta ? (
                <p className="font-display text-2xl font-bold text-primary">Preço sob consulta</p>
              ) : (
                <>
                  {veiculo.preco_promocional && veiculo.preco_vigente < veiculo.preco && (
                    <p className="text-sm text-muted-foreground line-through">{moeda(veiculo.preco)}</p>
                  )}
                  <p className="font-display text-3xl font-bold text-primary">{moeda(veiculo.preco_vigente)}</p>
                </>
              )}
              {veiculo.valor_fipe && (
                <p className="mt-1 text-xs text-muted-foreground">FIPE {moeda(Number(veiculo.valor_fipe))}</p>
              )}
            </div>

            {procedencia.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {procedencia.map((p) => (
                  <li key={p} className="rounded bg-secondary px-2 py-1 text-xs font-medium">{p}</li>
                ))}
              </ul>
            )}

            <div className="mt-5 space-y-2">
              {config?.whatsapp && (
                <a href={linkWhatsApp(config.whatsapp, mensagem)} target="_blank" rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-[hsl(var(--whatsapp))] px-4 py-3 font-semibold text-white">
                  <WhatsappLogo className="h-4 w-4" /> Falar no WhatsApp
                </a>
              )}
              <button onClick={compartilhar}
                className="flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium">
                <ShareNetwork className="h-4 w-4" /> Compartilhar
              </button>
            </div>
          </div>

          <LeadForm veiculo={veiculo} />
        </aside>
      </div>

      {semelhantes && semelhantes.veiculos.filter((v) => v.id !== veiculo.id).length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-xl font-bold">Veículos semelhantes</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {semelhantes.veiculos.filter((v) => v.id !== veiculo.id).slice(0, 4)
              .map((v) => <VeiculoCard key={v.id} veiculo={v} />)}
          </div>
        </section>
      )}
    </div>
  );
}
