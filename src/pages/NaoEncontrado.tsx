import { Link } from "react-router-dom";
import { useVeiculos } from "@/hooks/useVeiculos";
import VeiculoCard from "@/components/VeiculoCard";
import { useTituloPagina } from "@/hooks/useTituloPagina";

export default function NaoEncontrado() {
  useTituloPagina("Página não encontrada");
  const { data } = useVeiculos({ ordenacao: "recentes" });

  return (
    <section className="site-container site-section">
      <p className="t-label text-[var(--s-muted)]">Erro 404</p>
      <h1 className="t-display-lg mt-4 max-w-[30rem] text-[var(--s-ink)]">Página não encontrada</h1>
      <p className="t-body-md mt-5 max-w-[34rem] text-[var(--s-body)]">
        O endereço não existe ou o veículo já foi vendido. Veja o que temos disponível agora.
      </p>
      <Link to="/estoque" className="s-btn s-btn-primary mt-8">Ver o estoque</Link>

      <h2 className="t-label mt-20 text-[var(--s-muted)]">Disponíveis agora</h2>
      <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {(data?.veiculos ?? []).slice(0, 4).map((v) => <VeiculoCard key={v.id} veiculo={v} />)}
      </div>
    </section>
  );
}
