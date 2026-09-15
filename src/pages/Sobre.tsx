import { useConfig } from "@/hooks/useConfig";

export default function Sobre() {
  const { data: config } = useConfig();
  return (
    <div className="container max-w-3xl py-12">
      <h1 className="font-display text-3xl font-bold">A {config?.nome}</h1>
      <p className="mt-6 whitespace-pre-line text-lg text-muted-foreground">
        {config?.texto_sobre ?? "Conte aqui a história da revenda pelo painel de administração."}
      </p>
    </div>
  );
}
