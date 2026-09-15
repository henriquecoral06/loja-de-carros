import { Link } from "react-router-dom";
import { useConfig } from "@/hooks/useConfig";
import { useVeiculos } from "@/hooks/useVeiculos";
import VeiculoCard from "@/components/VeiculoCard";

export default function Home() {
  const { data: config } = useConfig();
  const { data, isLoading } = useVeiculos({ ordenacao: "recentes" });
  const destaques = (data?.veiculos ?? []).slice(0, 6);

  return (
    <>
      <section className="relative border-b bg-secondary">
        {config?.banner_url && (
          <img src={config.banner_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
        )}
        <div className="container relative py-16 md:py-24">
          <h1 className="font-display text-3xl md:text-5xl font-bold max-w-2xl text-balance">
            {config?.texto_home ?? "Seminovos revisados, com procedência e garantia."}
          </h1>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/estoque" className="rounded-md bg-primary px-6 py-3 font-semibold text-primary-foreground">
              Ver o estoque
            </Link>
            <Link to="/contato" className="rounded-md border bg-background px-6 py-3 font-semibold">
              Falar com a gente
            </Link>
          </div>
        </div>
      </section>

      <section className="container py-12">
        <div className="flex items-end justify-between gap-4 mb-6">
          <h2 className="font-display text-2xl font-bold">Destaques do estoque</h2>
          <Link to="/estoque" className="text-sm font-medium text-primary hover:underline">Ver todos</Link>
        </div>

        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-72 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {destaques.map((v) => <VeiculoCard key={v.id} veiculo={v} />)}
          </div>
        )}
      </section>
    </>
  );
}
