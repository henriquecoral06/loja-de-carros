import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useConfig } from "@/hooks/useConfig";

/**
 * Identidade da revenda. Tudo aqui é lido em runtime pelo site, e é por
 * isso que outro lojista consegue remixar o projeto sem abrir código.
 */
export default function Configuracao() {
  const { data: config } = useConfig();
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, any>>({});
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => { if (config) setForm(config as any); }, [config]);

  const campo = (chave: string, valor: any) => { setForm((f) => ({ ...f, [chave]: valor })); setSalvo(false); };
  const classeInput = "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm";

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    const { id, updated_at, ...dados } = form;
    const { error } = await supabase.from("config").update(dados).eq("id", true);
    if (error) { setErro(error.message); return; }
    qc.invalidateQueries({ queryKey: ["config"] });
    setSalvo(true);
  }

  const campos: [string, string, string?][] = [
    ["nome", "Nome da revenda"],
    ["razao_social", "Razão social"],
    ["cnpj", "CNPJ"],
    ["telefone", "Telefone"],
    ["whatsapp", "WhatsApp", "Só números, com país e DDD: 5511999999999"],
    ["email", "E-mail"],
    ["endereco", "Endereço"],
    ["cidade", "Cidade"],
    ["uf", "UF"],
    ["logo_url", "URL do logo"],
    ["banner_url", "URL do banner"],
  ];

  return (
    <form onSubmit={salvar} className="p-6 pb-24">
      <h1 className="font-display text-2xl font-bold">A revenda</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Estes dados alimentam o site inteiro. Nada disso está escrito no código.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <fieldset className="rounded-lg border bg-card p-5">
          <legend className="px-2 text-sm font-semibold">Dados e contato</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {campos.map(([chave, rotulo, apoio]) => (
              <div key={chave} className={chave === "endereco" ? "sm:col-span-2" : ""}>
                <label htmlFor={chave} className="text-sm font-medium">{rotulo}</label>
                <input id={chave} value={form[chave] ?? ""} className={classeInput}
                  onChange={(e) => campo(chave, e.target.value)} />
                {apoio && <p className="mt-1 text-xs text-muted-foreground">{apoio}</p>}
              </div>
            ))}
          </div>
        </fieldset>

        <div className="space-y-6">
          <fieldset className="rounded-lg border bg-card p-5">
            <legend className="px-2 text-sm font-semibold">Identidade visual</legend>
            <p className="mb-3 text-xs text-muted-foreground">
              Cores em HSL, no formato <code className="rounded bg-muted px-1">191 78% 21%</code>.
              A mudança aparece no site assim que você salvar.
            </p>
            {[
              ["cor_primaria", "Cor principal"],
              ["cor_primaria_fg", "Texto sobre a cor principal"],
              ["cor_destaque", "Cor de destaque"],
            ].map(([chave, rotulo]) => (
              <div key={chave} className="mt-3">
                <label htmlFor={chave} className="text-sm font-medium">{rotulo}</label>
                <div className="mt-1 flex items-center gap-2">
                  <input id={chave} value={form[chave] ?? ""} className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
                    onChange={(e) => campo(chave, e.target.value)} />
                  <span className="h-9 w-9 flex-shrink-0 rounded border"
                    style={{ background: `hsl(${form[chave] ?? "0 0% 100%"})` }} />
                </div>
              </div>
            ))}
          </fieldset>

          <fieldset className="rounded-lg border bg-card p-5">
            <legend className="px-2 text-sm font-semibold">Textos do site</legend>
            <label htmlFor="texto_home" className="text-sm font-medium">Chamada da home</label>
            <textarea id="texto_home" rows={2} value={form.texto_home ?? ""} className={classeInput}
              onChange={(e) => campo("texto_home", e.target.value)} />
            <label htmlFor="texto_sobre" className="mt-3 block text-sm font-medium">Sobre a revenda</label>
            <textarea id="texto_sobre" rows={4} value={form.texto_sobre ?? ""} className={classeInput}
              onChange={(e) => campo("texto_sobre", e.target.value)} />
          </fieldset>

          <fieldset className="rounded-lg border bg-card p-5">
            <legend className="px-2 text-sm font-semibold">SEO e medição</legend>
            {[
              ["meta_title", "Título do site"],
              ["meta_description", "Descrição"],
              ["ga_measurement_id", "Google Analytics (G-...)"],
              ["meta_pixel_id", "Meta Pixel"],
            ].map(([chave, rotulo]) => (
              <div key={chave} className="mt-3">
                <label htmlFor={chave} className="text-sm font-medium">{rotulo}</label>
                <input id={chave} value={form[chave] ?? ""} className={classeInput}
                  onChange={(e) => campo(chave, e.target.value)} />
              </div>
            ))}
          </fieldset>
        </div>
      </div>

      {erro && <p className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{erro}</p>}

      <div className="mt-6 flex items-center gap-3">
        <button type="submit" className="rounded-md bg-primary px-6 py-2.5 font-semibold text-primary-foreground">
          Salvar
        </button>
        {salvo && <span className="text-sm text-[hsl(var(--whatsapp))]">Salvo.</span>}
      </div>
    </form>
  );
}
