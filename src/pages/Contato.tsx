import { useConfig } from "@/hooks/useConfig";
import LeadForm from "@/components/LeadForm";
import { useTituloPagina } from "@/hooks/useTituloPagina";

export default function Contato() {
  const { data: config } = useConfig();
  useTituloPagina("Contato");
  const endereco = [config?.endereco, config?.cidade, config?.uf].filter(Boolean).join(", ");

  return (
    <>
      <section className="band-dark">
        <div className="site-container site-section">
          <p className="t-label text-[var(--s-on-dark-soft)]">Contato</p>
          <h1 className="t-display-lg mt-4 max-w-[32rem] text-[var(--s-on-dark)]">Fale com a gente</h1>
        </div>
      </section>

      <section className="site-container site-section">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <dl className="border-b border-[var(--s-hairline)]">
              {[
                config?.telefone && ["Telefone", config.telefone],
                config?.whatsapp && ["WhatsApp", config.whatsapp],
                config?.email && ["E-mail", config.email],
                endereco && ["Endereço", endereco],
              ].filter(Boolean).map(([rotulo, valor]: any) => (
                <div key={rotulo} className="s-spec">
                  <dt>{rotulo}</dt>
                  <dd className="!text-[18px] !font-normal">{valor}</dd>
                </div>
              ))}
            </dl>

            {(config?.horarios ?? []).length > 0 && (
              <div className="mt-10">
                <p className="t-label text-[var(--s-muted)]">Horários</p>
                <ul className="mt-4 flex flex-col gap-2">
                  {(config?.horarios ?? []).map((h) => (
                    <li key={h.dia} className="t-body-md text-[var(--s-body)]">
                      {h.dia}: {h.fechado ? "fechado" : `${h.abre} às ${h.fecha}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Incorporação gratuita: a API JavaScript do Maps exige conta com cobrança. */}
            {endereco && (
              <iframe title="Localização da revenda" loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                className="mt-10 aspect-video w-full border border-[var(--s-hairline)]"
                src={`https://www.google.com/maps?q=${encodeURIComponent(endereco)}&output=embed`} />
            )}
          </div>

          <LeadForm />
        </div>
      </section>
    </>
  );
}
