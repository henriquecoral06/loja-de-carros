import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CaretLeft, CaretRight, ShareNetwork, WhatsappLogo } from "@phosphor-icons/react";
import { useVeiculo, useFotos, useVeiculos } from "@/hooks/useVeiculos";
import { useConfig } from "@/hooks/useConfig";
import { moeda, numero, tituloVeiculo, linkWhatsApp } from "@/lib/utils";
import LeadForm from "@/components/LeadForm";
import VeiculoCard from "@/components/VeiculoCard";
import { useTituloPagina } from "@/hooks/useTituloPagina";

export default function Veiculo() {
  const { slug } = useParams();
  const { data: veiculo, isLoading } = useVeiculo(slug);
  const { data: fotos } = useFotos(veiculo?.id);
  const { data: config } = useConfig();
  const [atual, setAtual] = useState(0);
  const [aviso, setAviso] = useState("");

  const { data: semelhantes } = useVeiculos({ marca_id: veiculo?.marca_id, ordenacao: "recentes" });

  // Fallback no cliente. O card que aparece ao colar o link no WhatsApp
  // NÃO vem daqui — robô de prévia não roda JavaScript. Quem responde
  // por ele é a edge function `seo`.
  useTituloPagina(veiculo ? `${tituloVeiculo(veiculo)} ${veiculo.ano_modelo}` : "Veículo");

  useEffect(() => { setAtual(0); }, [slug]);

  if (isLoading) {
    return <div className="site-container site-section"><div className="aspect-[16/9] animate-pulse bg-[var(--s-surface-strong)]" /></div>;
  }

  if (!veiculo) {
    return (
      <section className="site-container site-section">
        <h1 className="t-display-md text-[var(--s-ink)]">Veículo não encontrado</h1>
        <p className="t-body-md mt-4 text-[var(--s-body)]">Ele pode ter sido vendido. Veja o que temos disponível.</p>
        <Link to="/estoque" className="s-btn s-btn-primary mt-8">Ver o estoque</Link>
      </section>
    );
  }

  const titulo = tituloVeiculo(veiculo);
  const galeria = fotos?.length ? fotos : veiculo.foto_capa ? [{ url: veiculo.foto_capa }] : [];
  const mensagem = `Olá! Tenho interesse no ${titulo} ${veiculo.ano_modelo}${veiculo.codigo_interno ? ` (cód. ${veiculo.codigo_interno})` : ""}.`;

  const ficha: [string, string][] = [
    ["Ano", `${veiculo.ano_fabricacao}/${veiculo.ano_modelo}`],
    ["Quilometragem", `${numero(veiculo.km)} km`],
    ["Câmbio", veiculo.cambio],
    ["Combustível", veiculo.combustivel],
    ["Cor", veiculo.cor],
    ["Carroceria", veiculo.carroceria],
    ["Portas", String(veiculo.portas)],
    ...(veiculo.motor ? [["Motor", veiculo.motor] as [string, string]] : []),
    ...(veiculo.potencia_cv ? [["Potência", `${veiculo.potencia_cv} cv`] as [string, string]] : []),
  ];

  const procedencia = [
    veiculo.unico_dono && "Único dono",
    veiculo.ipva_pago && "IPVA pago",
    veiculo.licenciado && "Licenciado",
    veiculo.laudo_cautelar && "Laudo cautelar aprovado",
    veiculo.manual_chave && "Manual e chave reserva",
  ].filter(Boolean) as string[];

  const mover = (d: 1 | -1) => setAtual((i) => (i + d + galeria.length) % galeria.length);

  async function compartilhar() {
    const dados = { title: titulo, text: mensagem, url: window.location.href };
    if (navigator.share) { await navigator.share(dados).catch(() => {}); return; }
    try {
      await navigator.clipboard.writeText(window.location.href);
      setAviso("Link copiado.");
      setTimeout(() => setAviso(""), 2500);
    } catch {
      setAviso("Não foi possível copiar. Use o endereço da barra do navegador.");
    }
  }

  return (
    <>
      <div className="site-container pt-6">
        <nav aria-label="Trilha" className="t-caption flex flex-wrap items-center gap-1 text-[var(--s-muted)]">
          <Link to="/" className="inline-block py-2 hover:text-[var(--s-ink)]">Início</Link>
          <span aria-hidden="true">/</span>
          <Link to="/estoque" className="inline-block py-2 hover:text-[var(--s-ink)]">Estoque</Link>
          <span aria-hidden="true">/</span>
          <span className="py-2 text-[var(--s-ink)]">{titulo}</span>
        </nav>
      </div>

      <section className="site-container pb-16 pt-8">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <div className="s-card-photo relative aspect-[16/10]">
              {galeria.length ? (
                <img src={galeria[atual]?.url} alt={`${titulo} — foto ${atual + 1} de ${galeria.length}`}
                  className="h-full w-full object-cover" />
              ) : (
                <div className="t-body-sm grid h-full place-items-center text-[var(--s-muted)]">Sem foto</div>
              )}

              {galeria.length > 1 && (
                <>
                  <button onClick={() => mover(-1)} aria-label="Foto anterior"
                    className="absolute left-0 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center bg-white/90 text-[var(--s-ink)] hover:bg-white">
                    <CaretLeft size={18} weight="bold" />
                  </button>
                  <button onClick={() => mover(1)} aria-label="Próxima foto"
                    className="absolute right-0 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center bg-white/90 text-[var(--s-ink)] hover:bg-white">
                    <CaretRight size={18} weight="bold" />
                  </button>
                  <span className="t-caption absolute bottom-0 right-0 bg-[var(--s-ink)] px-2.5 py-1.5 text-[var(--s-on-dark)]">
                    {atual + 1} / {galeria.length}
                  </span>
                </>
              )}
            </div>

            {galeria.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {galeria.map((f, i) => (
                  <button key={f.url} onClick={() => setAtual(i)} aria-label={`Ver foto ${i + 1}`}
                    aria-current={i === atual}
                    className={`h-16 w-24 flex-shrink-0 overflow-hidden border-2 ${
                      i === atual ? "border-[var(--s-ink)]" : "border-transparent opacity-70 hover:opacity-100"}`}>
                    <img src={f.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <section className="mt-14">
              <h2 className="t-label text-[var(--s-muted)]">Ficha técnica</h2>
              <dl className="mt-2 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
                {ficha.map(([rotulo, valor]) => (
                  <div key={rotulo} className="s-spec">
                    <dt>{rotulo}</dt>
                    <dd>{valor}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {veiculo.descricao && (
              <section className="mt-14">
                <h2 className="t-label text-[var(--s-muted)]">Sobre este veículo</h2>
                <p className="t-body-md mt-4 max-w-[46rem] whitespace-pre-line text-[var(--s-body)]">{veiculo.descricao}</p>
              </section>
            )}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <h1 className="t-display-sm text-[var(--s-ink)]">{titulo}</h1>
            <p className="t-body-sm mt-2 text-[var(--s-muted)]">
              {veiculo.ano_fabricacao}/{veiculo.ano_modelo} · {numero(veiculo.km)} km
            </p>

            <div className="mt-7 border-t border-[var(--s-hairline)] pt-7">
              {veiculo.preco_sob_consulta ? (
                <p className="t-display-sm text-[var(--s-ink)]">Preço sob consulta</p>
              ) : (
                <>
                  {veiculo.preco_promocional && veiculo.preco_vigente < veiculo.preco && (
                    <p className="t-body-sm text-[var(--s-muted)] line-through">{moeda(veiculo.preco)}</p>
                  )}
                  <p className="t-display-md text-[var(--s-ink)]">{moeda(veiculo.preco_vigente)}</p>
                </>
              )}
              {veiculo.valor_fipe && (
                <p className="t-caption mt-2 text-[var(--s-muted)]">Tabela FIPE {moeda(Number(veiculo.valor_fipe))}</p>
              )}
            </div>

            {procedencia.length > 0 && (
              <ul className="mt-7 flex flex-wrap gap-2">
                {procedencia.map((p) => (
                  <li key={p} className="t-caption border border-[var(--s-hairline-strong)] px-2.5 py-1.5 text-[var(--s-ink)]">{p}</li>
                ))}
              </ul>
            )}

            <div className="mt-8 flex flex-col gap-2.5">
              {config?.whatsapp && (
                <a href={linkWhatsApp(config.whatsapp, mensagem)} target="_blank" rel="noopener noreferrer"
                  className="s-btn s-btn-primary w-full">
                  <WhatsappLogo size={17} weight="fill" /> Falar no WhatsApp
                </a>
              )}
              <button onClick={compartilhar} className="s-btn s-btn-secondary w-full">
                <ShareNetwork size={16} /> Compartilhar
              </button>
              {aviso && <p role="status" className="t-caption text-[var(--s-muted)]">{aviso}</p>}
            </div>

            <div className="mt-10">
              <LeadForm veiculo={veiculo} />
            </div>
          </aside>
        </div>
      </section>

      {semelhantes && semelhantes.veiculos.filter((v) => v.id !== veiculo.id).length > 0 && (
        <section className="band-soft">
          <div className="site-container site-section">
            <p className="t-label text-[var(--s-muted)]">Semelhantes</p>
            <h2 className="t-display-md mt-3 text-[var(--s-ink)]">Veja também</h2>
            <div className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {semelhantes.veiculos.filter((v) => v.id !== veiculo.id).slice(0, 4)
                .map((v) => <VeiculoCard key={v.id} veiculo={v} />)}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
