import { Link } from "react-router-dom";
import { useConfig } from "@/hooks/useConfig";
import { useVeiculos } from "@/hooks/useVeiculos";
import VeiculoCard from "@/components/VeiculoCard";
import { linkWhatsApp } from "@/lib/utils";
import { useTituloPagina } from "@/hooks/useTituloPagina";

const linhas = (t?: string | null, n = 4) =>
  (t ?? "").split("\n").map((l) => l.trim()).filter(Boolean).slice(0, n);

/**
 * Ritmo obrigatório de superfícies: escuro → claro → suave → escuro →
 * rodapé. Duas faixas iguais em sequência derrubam o sistema, porque
 * não há sombra para separar nada.
 */
export default function Home() {
  const { data: config } = useConfig();
  const { data, isLoading } = useVeiculos({ ordenacao: "recentes" });
  useTituloPagina(null);
  const destaques = (data?.veiculos ?? []).slice(0, 8);
  const diferenciais = linhas(config?.diferenciais);
  const provas = linhas(config?.provas_numeros, 3);

  return (
    <>
      {/* Faixa escura de abertura */}
      <section className="band-dark relative overflow-hidden">
        {config?.banner_url && (
          <img src={config.banner_url} alt="" aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover opacity-30" />
        )}
        <div className="site-container site-section relative">
          <div className="max-w-[46rem]">
            <h1 className="t-display-xl text-[var(--s-on-dark)]">
              {config?.texto_home ?? "Seminovos revisados, com procedência e garantia."}
            </h1>
            {config?.oferta_principal && (
              <p className="t-body-md mt-6 max-w-[38rem] text-[var(--s-on-dark-soft)]">{config.oferta_principal}</p>
            )}
            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/estoque" className="s-btn s-btn-primary">Ver o estoque</Link>
              <Link to="/contato" className="s-btn s-btn-on-dark">Falar com a gente</Link>
            </div>
          </div>

          {provas.length > 0 && (
            <dl className="mt-16 grid gap-px border-t border-white/15 sm:grid-cols-3">
              {provas.map((p) => (
                <div key={p} className="pt-6">
                  <dd className="t-title-md text-[var(--s-on-dark)]">{p}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      {/* Faixa clara: grade de veículos */}
      <section className="site-container site-section">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="t-label text-[var(--s-muted)]">Estoque</p>
            <h2 className="t-display-md mt-3 text-[var(--s-ink)]">Disponíveis agora</h2>
          </div>
          <Link to="/estoque" className="s-link">Ver todos</Link>
        </div>

        {isLoading ? (
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[16/10] animate-pulse bg-[var(--s-surface-strong)]" />
            ))}
          </div>
        ) : destaques.length ? (
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {destaques.map((v) => <VeiculoCard key={v.id} veiculo={v} />)}
          </div>
        ) : (
          <p className="t-body-md text-[var(--s-muted)]">
            Nenhum veículo publicado ainda. Fale com a gente que procuramos o carro para você.
          </p>
        )}
      </section>

      {/* Faixa suave: diferenciais */}
      {diferenciais.length > 0 && (
        <section className="band-soft">
          <div className="site-container site-section">
            <p className="t-label text-[var(--s-muted)]">Por que aqui</p>
            <h2 className="t-display-md mt-3 max-w-[30rem] text-[var(--s-ink)]">
              {config?.o_que_vende ?? "Carros com procedência conferida."}
            </h2>
            {/* Sem numeração: diferenciais são uma lista, não uma
                sequência, e o número seria só enfeite. A hairline já
                separa. */}
            <ul className="mt-12 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
              {diferenciais.map((d) => (
                <li key={d} className="border-t border-[var(--s-hairline-strong)] pt-6">
                  <p className="t-title-md text-[var(--s-ink)]">{d}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Faixa escura de fechamento */}
      <section className="band-dark">
        <div className="site-container site-section text-center">
          <h2 className="t-display-md mx-auto max-w-[32rem] text-[var(--s-on-dark)]">
            Achou o carro? Fale com um consultor agora.
          </h2>
          {config?.para_quem && (
            <p className="t-body-md mx-auto mt-5 max-w-[34rem] text-[var(--s-on-dark-soft)]">{config.para_quem}</p>
          )}
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {config?.whatsapp && (
              <a href={linkWhatsApp(config.whatsapp, `Olá! Vim pelo site da ${config.nome}.`)}
                target="_blank" rel="noopener noreferrer" className="s-btn s-btn-primary">
                Chamar no WhatsApp
              </a>
            )}
            <Link to="/estoque" className="s-btn s-btn-on-dark">Ver o estoque</Link>
          </div>
        </div>
      </section>
    </>
  );
}
