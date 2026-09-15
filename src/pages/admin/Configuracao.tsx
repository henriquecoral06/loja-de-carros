import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useConfig } from "@/hooks/useConfig";
import { Button, Input, Textarea } from "@/components/ui";

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
    <form onSubmit={salvar} className="p-5 pb-24 md:p-6">
      <h1 className="text-heading-xl text-ink">A revenda</h1>
      <p className="mt-1 text-body-sm text-mute">
        Estes dados alimentam o site inteiro. Nada disso está escrito no código.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <fieldset className="rounded-ds-lg border border-hairline bg-surface p-5">
          <legend className="px-2 text-label-lg text-ink">Dados e contato</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {campos.map(([chave, rotulo, apoio]) => (
              <div key={chave} className={chave === "endereco" ? "sm:col-span-2" : ""}>
                <label htmlFor={chave} className="text-label-md tracking-label text-body">{rotulo}</label>
                <Input id={chave} value={form[chave] ?? ""} className="ds-field mt-1"
                  onChange={(e) => campo(chave, e.target.value)} />
                {apoio && <p className="mt-1 text-caption text-faint">{apoio}</p>}
              </div>
            ))}
          </div>
        </fieldset>

        <div className="space-y-6">
          <fieldset className="rounded-ds-lg border border-hairline bg-surface p-5">
            <legend className="px-2 text-label-lg text-ink">Identidade visual</legend>
            <p className="mb-3 text-caption text-mute">
              Cores em HSL, no formato <code className="rounded-ds-xs bg-ink/[0.06] px-1 font-mono text-[12px]">191 78% 21%</code>.
              A mudança aparece no site assim que você salvar.
            </p>
            {[
              ["cor_primaria", "Cor principal"],
              ["cor_primaria_fg", "Texto sobre a cor principal"],
              ["cor_destaque", "Cor de destaque"],
            ].map(([chave, rotulo]) => (
              <div key={chave} className="mt-3">
                <label htmlFor={chave} className="text-label-md tracking-label text-body">{rotulo}</label>
                <div className="mt-1 flex items-center gap-2">
                  <Input id={chave} value={form[chave] ?? ""} className="ds-field"
                    onChange={(e) => campo(chave, e.target.value)} />
                  <span className="h-9 w-9 flex-shrink-0 rounded-ds-sm border border-hairline-strong"
                    style={{ background: `hsl(${form[chave] ?? "0 0% 100%"})` }} />
                </div>
              </div>
            ))}
          </fieldset>

          <fieldset className="rounded-ds-lg border border-hairline bg-surface p-5">
            <legend className="px-2 text-label-lg text-ink">Textos do site</legend>
            <label htmlFor="texto_home" className="text-label-md tracking-label text-body">Chamada da home</label>
            <Textarea id="texto_home" rows={2} value={form.texto_home ?? ""} className="ds-field mt-1"
              onChange={(e) => campo("texto_home", e.target.value)} />
            <label htmlFor="texto_sobre" className="mt-3 block text-label-md tracking-label text-body">Sobre a revenda</label>
            <Textarea id="texto_sobre" rows={4} value={form.texto_sobre ?? ""} className="ds-field mt-1"
              onChange={(e) => campo("texto_sobre", e.target.value)} />
          </fieldset>

          <fieldset className="rounded-ds-lg border border-hairline bg-surface p-5">
            <legend className="px-2 text-label-lg text-ink">SEO e medição</legend>
            {[
              ["meta_title", "Título do site"],
              ["meta_description", "Descrição"],
              ["ga_measurement_id", "Google Analytics (G-...)"],
              ["meta_pixel_id", "Meta Pixel"],
            ].map(([chave, rotulo]) => (
              <div key={chave} className="mt-3">
                <label htmlFor={chave} className="text-label-md tracking-label text-body">{rotulo}</label>
                <Input id={chave} value={form[chave] ?? ""} className="ds-field mt-1"
                  onChange={(e) => campo(chave, e.target.value)} />
              </div>
            ))}
          </fieldset>
        </div>
      </div>

      {erro && <p className="mt-4 rounded-ds-md bg-danger-soft/20 p-3 text-body-sm text-danger-deep">{erro}</p>}

      <div className="mt-6 flex items-center gap-3">
        <Button type="submit" size="lg">Salvar</Button>
        {salvo && <span className="text-body-sm text-emerald-deep">Salvo.</span>}
      </div>
    </form>
  );
}
