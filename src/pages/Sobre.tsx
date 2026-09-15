import { Link } from "react-router-dom";
import { useConfig } from "@/hooks/useConfig";
import { useTituloPagina } from "@/hooks/useTituloPagina";

export default function Sobre() {
  const { data: config } = useConfig();
  useTituloPagina("A revenda");
  const provas = (config?.provas_numeros ?? "").split("\n").map((l) => l.trim()).filter(Boolean);

  return (
    <>
      <section className="band-dark">
        <div className="site-container site-section">
          <p className="t-label text-[var(--s-on-dark-soft)]">A revenda</p>
          <h1 className="t-display-lg mt-4 max-w-[36rem] text-[var(--s-on-dark)]">{config?.nome}</h1>
        </div>
      </section>

      <section className="site-container site-section">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
          <div className="max-w-[42rem]">
            <p className="t-body-md whitespace-pre-line text-[var(--s-body)]">
              {config?.texto_sobre ?? "Conte aqui a história da revenda pelo painel de administração."}
            </p>
            {config?.regiao && (
              <p className="t-body-md mt-6 text-[var(--s-body)]">Atendemos {config.regiao}.</p>
            )}
            <Link to="/estoque" className="s-link mt-10">Ver o estoque</Link>
          </div>

          {provas.length > 0 && (
            <dl>
              {provas.map((p) => (
                <div key={p} className="s-spec">
                  <dd className="!text-[18px]">{p}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>
    </>
  );
}
