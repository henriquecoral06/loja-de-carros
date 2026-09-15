import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight } from "@phosphor-icons/react";
import { supabase } from "@/integrations/supabase/client";
import { useConfig } from "@/hooks/useConfig";
import { TONS } from "@/lib/banner";
import { Button, Field, Input, SegmentedControl, Select, Textarea } from "@/components/ui";
import UploadImagem from "@/components/admin/UploadImagem";

type Aba = "identidade" | "posicionamento" | "contato" | "medicao";

/**
 * Fora do componente de propósito. Declarado lá dentro, cada render
 * cria um tipo novo, o React remonta o textarea e o cursor pula a cada
 * tecla — o campo fica impossível de preencher.
 */
function Texto({ chave, label, hint, placeholder, linhas = 4, valor, aoMudar }: {
  chave: string; label: string; hint?: string; placeholder?: string;
  linhas?: number; valor: string; aoMudar: (chave: string, v: string) => void;
}) {
  return (
    <Field id={chave} label={label} hint={hint}>
      <Textarea id={chave} rows={linhas} placeholder={placeholder} value={valor}
        onChange={(e) => aoMudar(chave, e.target.value)} />
    </Field>
  );
}

export default function Configuracao() {
  const { data: config } = useConfig();
  const qc = useQueryClient();
  const [aba, setAba] = useState<Aba>("identidade");
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

  return (
    <form onSubmit={salvar} className="p-5 pb-28 md:p-6">
      <h1 className="text-heading-xl text-ink">O negócio</h1>
      <p className="mt-1 max-w-[62ch] text-body-sm text-mute">
        Tudo aqui alimenta o site em tempo real e serve de matéria-prima para o
        gerador de banner. Nada disso está escrito no código.
      </p>

      <SegmentedControl
        className="mt-5"
        value={aba}
        onChange={setAba}
        options={[
          { value: "identidade", label: "Identidade" },
          { value: "posicionamento", label: "Posicionamento" },
          { value: "contato", label: "Contato" },
          { value: "medicao", label: "Medição" },
        ]}
      />

      <div className="mt-5 max-w-4xl space-y-5">
        {aba === "identidade" && (
          <>
            <fieldset className="rounded-ds-lg border border-hairline bg-surface p-5">
              <legend className="px-2 text-label-lg text-ink">Nome e documentos</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="nome" label="Nome do negócio">
                  <Input id="nome" value={form.nome ?? ""} onChange={(e) => campo("nome", e.target.value)} />
                </Field>
                <Field id="razao_social" label="Razão social">
                  <Input id="razao_social" value={form.razao_social ?? ""} onChange={(e) => campo("razao_social", e.target.value)} />
                </Field>
                <Field id="cnpj" label="CNPJ">
                  <Input id="cnpj" value={form.cnpj ?? ""} onChange={(e) => campo("cnpj", e.target.value)} />
                </Field>
                <Field id="regiao" label="Região de atuação" hint="Aparece no prompt do banner e no texto do site.">
                  <Input id="regiao" placeholder="São Paulo e região metropolitana"
                    value={form.regiao ?? ""} onChange={(e) => campo("regiao", e.target.value)} />
                </Field>
              </div>
            </fieldset>

            <fieldset className="rounded-ds-lg border border-hairline bg-surface p-5">
              <legend className="px-2 text-label-lg text-ink">Marca</legend>
              <p className="mb-5 max-w-[56ch] text-caption text-mute">
                Arquivos e cores da loja. Cores em HSL, no formato{" "}
                <code className="rounded-ds-xs bg-ink/[0.06] px-1 font-mono text-[12px]">191 78% 21%</code>.
                O site muda assim que você salvar — inclusive a faixa escura da
                home, que é derivada da cor principal.
              </p>
              <div className="grid gap-5 sm:grid-cols-2">
                <UploadImagem
                  label="Logotipo" pasta="logo" formato="largo"
                  valor={form.logo_url}
                  onChange={(url) => campo("logo_url", url)}
                  hint="PNG ou SVG com fundo transparente. Sem logo, o site escreve o nome da revenda." />
                <UploadImagem
                  label="Favicon" pasta="favicon"
                  valor={form.favicon_url}
                  onChange={(url) => campo("favicon_url", url)}
                  hint="Quadrado, 512×512. É o ícone da aba do navegador." />
                {[
                  ["cor_primaria", "Cor principal"],
                  ["cor_primaria_fg", "Texto sobre a cor principal"],
                  ["cor_destaque", "Cor de destaque"],
                ].map(([chave, label]) => (
                  <Field key={chave} id={chave} label={label}>
                    <div className="flex items-center gap-2">
                      <Input id={chave} value={form[chave] ?? ""} onChange={(e) => campo(chave, e.target.value)} />
                      <span className="h-9 w-9 shrink-0 rounded-ds-sm border border-hairline-strong"
                        style={{ background: `hsl(${form[chave] || "0 0% 100%"})` }} />
                    </div>
                  </Field>
                ))}
              </div>
            </fieldset>
          </>
        )}

        {aba === "posicionamento" && (
          <>
            <fieldset className="rounded-ds-lg border border-hairline bg-surface p-5">
              <legend className="px-2 text-label-lg text-ink">O que você vende, e para quem</legend>
              <div className="space-y-4">
                <Texto chave="o_que_vende" valor={form.o_que_vende ?? ""} aoMudar={campo} label="O que você vende" linhas={2}
                  placeholder="Seminovos revisados com procedência e garantia" />
                <Texto chave="para_quem" valor={form.para_quem ?? ""} aoMudar={campo} label="Para quem é" linhas={2}
                  placeholder="Famílias que querem trocar de carro sem dor de cabeça" />
                <Texto chave="oferta_principal" valor={form.oferta_principal ?? ""} aoMudar={campo} label="Oferta principal" linhas={2}
                  placeholder="Entrada a partir de 20% e parcelas em até 60x" />
              </div>
            </fieldset>

            <fieldset className="rounded-ds-lg border border-hairline bg-surface p-5">
              <legend className="px-2 text-label-lg text-ink">Provas</legend>
              <div className="space-y-4">
                <Texto chave="diferenciais" valor={form.diferenciais ?? ""} aoMudar={campo} label="Diferenciais reais" linhas={5}
                  hint="Um por linha. Os três primeiros entram no prompt do banner."
                  placeholder={"Todo carro com laudo cautelar aprovado\nAceitamos seu usado na troca"} />
                <Texto chave="provas_numeros" valor={form.provas_numeros ?? ""} aoMudar={campo} label="Números e provas reais" linhas={4}
                  hint="Um por linha. Números concretos convencem mais que adjetivo."
                  placeholder={"Nota 4,8 no Google\n1.200 carros entregues"} />
              </div>
            </fieldset>

            <fieldset className="rounded-ds-lg border border-hairline bg-surface p-5">
              <legend className="px-2 text-label-lg text-ink">Tom de voz</legend>
              <p className="mb-4 text-caption text-mute">
                Define a direção de arte do banner — clima, luz e enquadramento.
              </p>
              <Field id="tom_de_voz" label="Tom">
                <Select id="tom_de_voz" value={form.tom_de_voz ?? "proximo"}
                  onChange={(e) => campo("tom_de_voz", e.target.value)} className="max-w-sm">
                  {TONS.map((t) => <option key={t.chave} value={t.chave}>{t.rotulo}</option>)}
                </Select>
              </Field>
              <p className="mt-3 rounded-ds-md border border-hairline bg-ink/[0.02] p-3 text-caption text-mute">
                {TONS.find((t) => t.chave === (form.tom_de_voz ?? "proximo"))?.direcao}.{" "}
                {TONS.find((t) => t.chave === (form.tom_de_voz ?? "proximo"))?.luz}.
              </p>
            </fieldset>

            <Link to="/admin/banner" className="ds-focus inline-flex items-center gap-1.5 rounded-ds-sm text-body-sm font-medium text-ink hover:underline">
              Gerar o prompt do banner com estas informações <ArrowRight size={14} />
            </Link>
          </>
        )}

        {aba === "contato" && (
          <fieldset className="rounded-ds-lg border border-hairline bg-surface p-5">
            <legend className="px-2 text-label-lg text-ink">Como falam com você</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["telefone", "Telefone", ""],
                ["whatsapp", "WhatsApp", "Só números, com país e DDD: 5511999999999"],
                ["email", "E-mail", ""],
                ["cidade", "Cidade", ""],
                ["uf", "UF", ""],
              ].map(([chave, label, hint]) => (
                <Field key={chave} id={chave} label={label} hint={hint || undefined}>
                  <Input id={chave} value={form[chave] ?? ""} onChange={(e) => campo(chave, e.target.value)} />
                </Field>
              ))}
              <Field id="endereco" label="Endereço" className="sm:col-span-2">
                <Input id="endereco" value={form.endereco ?? ""} onChange={(e) => campo("endereco", e.target.value)} />
              </Field>
            </div>
          </fieldset>
        )}

        {aba === "medicao" && (
          <fieldset className="rounded-ds-lg border border-hairline bg-surface p-5">
            <legend className="px-2 text-label-lg text-ink">SEO e medição</legend>
            <p className="mb-4 text-caption text-mute">
              As tags só disparam depois que o visitante aceita os cookies.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["meta_title", "Título do site"],
                ["meta_description", "Descrição"],
                ["ga_measurement_id", "Google Analytics (G-…)"],
                ["meta_pixel_id", "Meta Pixel"],
              ].map(([chave, label]) => (
                <Field key={chave} id={chave} label={label}>
                  <Input id={chave} value={form[chave] ?? ""} onChange={(e) => campo(chave, e.target.value)} />
                </Field>
              ))}
            </div>
          </fieldset>
        )}
      </div>

      {erro && <p className="mt-4 max-w-4xl rounded-ds-md bg-danger-soft/20 p-3 text-body-sm text-danger-deep">{erro}</p>}

      <div className="sticky bottom-0 mt-6 flex items-center gap-3 border-t border-hairline bg-canvas/90 py-4 backdrop-blur">
        <Button type="submit" size="lg">Salvar</Button>
        {salvo && <span className="text-body-sm text-emerald-deep">Salvo.</span>}
      </div>
    </form>
  );
}
