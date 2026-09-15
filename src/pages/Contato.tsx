import { useConfig } from "@/hooks/useConfig";
import LeadForm from "@/components/LeadForm";

export default function Contato() {
  const { data: config } = useConfig();
  const endereco = [config?.endereco, config?.cidade, config?.uf].filter(Boolean).join(", ");

  return (
    <div className="container py-12">
      <h1 className="font-display text-3xl font-bold">Fale com a gente</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <dl className="space-y-3 text-sm">
            {config?.telefone && <div><dt className="text-muted-foreground">Telefone</dt><dd className="font-medium">{config.telefone}</dd></div>}
            {config?.email && <div><dt className="text-muted-foreground">E-mail</dt><dd className="font-medium">{config.email}</dd></div>}
            {endereco && <div><dt className="text-muted-foreground">Endereço</dt><dd className="font-medium">{endereco}</dd></div>}
          </dl>

          {/* Incorporação gratuita: a API JavaScript do Maps exige conta com cobrança. */}
          {endereco && (
            <iframe
              title="Localização da revenda"
              className="aspect-video w-full rounded-lg border"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps?q=${encodeURIComponent(endereco)}&output=embed`}
            />
          )}
        </div>

        <LeadForm />
      </div>
    </div>
  );
}
