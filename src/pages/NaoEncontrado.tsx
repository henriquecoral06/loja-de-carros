import { Link } from "react-router-dom";
import { useVeiculos } from "@/hooks/useVeiculos";
import VeiculoCard from "@/components/VeiculoCard";

export default function NaoEncontrado() {
  const { data } = useVeiculos({ ordenacao: "recentes" });

  return (
    <div className="container py-16">
      <h1 className="font-display text-3xl font-bold">Página não encontrada</h1>
      <p className="mt-2 text-muted-foreground">
        O endereço não existe ou o veículo já foi vendido. Veja o que temos agora.
      </p>
      <Link to="/estoque" className="mt-6 inline-block rounded-md bg-primary px-5 py-2.5 font-semibold text-primary-foreground">
        Ver o estoque
      </Link>
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {(data?.veiculos ?? []).slice(0, 4).map((v) => <VeiculoCard key={v.id} veiculo={v} />)}
      </div>
    </div>
  );
}
