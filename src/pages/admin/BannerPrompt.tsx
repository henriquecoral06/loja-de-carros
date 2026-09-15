import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Warning } from "@phosphor-icons/react";
import { supabase } from "@/integrations/supabase/client";
import { useConfig } from "@/hooks/useConfig";
import { FORMATOS, TONS, hslParaHex, montarPrompt, type Estilo } from "@/lib/banner";
import { Badge, Button, Card, Field, SegmentedControl, Select, Textarea } from "@/components/ui";
import GestaoBanners from "@/components/admin/GestaoBanners";

export default function BannerPrompt() {
  const { data: config } = useConfig();
  const qc = useQueryClient();

  const [formato, setFormato] = useState(FORMATOS[0].chave);
  const [estilo, setEstilo] = useState<Estilo>("fotografico");
  const [mostrarCarro, setMostrarCarro] = useState(true);
  const [mostrarPessoas, setMostrarPessoas] = useState(false);
  const [observacoes, setObservacoes] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const prompt = useMemo(
    () => config ? montarPrompt(config, { formato, estilo, mostrarCarro, mostrarPessoas, observacoes }) : "",
    [config, formato, estilo, mostrarCarro, mostrarPessoas, observacoes],
  );

  // O prompt só é específico se o cadastro estiver preenchido. Sem isso
  // ele sai genérico e o banner poderia ser de qualquer revenda.
  const faltando = useMemo(() => {
    if (!config) return [];
    const c = config as any;
    return [
      !c.o_que_vende && "o que você vende",
      !c.para_quem && "para quem é",
      !c.diferenciais && "diferenciais",
      !c.cor_primaria && "cor principal",
      !c.regiao && !c.cidade && "região de atuação",
    ].filter(Boolean) as string[];
  }, [config]);

  const alvo = FORMATOS.find((f) => f.chave === formato)!;
  const tom = TONS.find((t) => t.chave === (config as any)?.tom_de_voz) ?? TONS[0];

  async function copiar() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch { /* clipboard bloqueado */ }
  }

  async function salvarRascunho() {
    setSalvando(true);
    await supabase.from("config").update({
      banner_prompt: prompt,
      banner_briefing: { formato, estilo, mostrarCarro, mostrarPessoas, observacoes },
    }).eq("id", true);
    qc.invalidateQueries({ queryKey: ["config"] });
    setSalvando(false);
  }

  if (!config) return <div className="p-6 text-body-sm text-mute">Carregando…</div>;

  return (
    <div className="p-5 pb-16 md:p-6">
      <h1 className="text-heading-xl text-ink">Banner da home</h1>
      <p className="mt-1 max-w-[64ch] text-body-sm text-mute">
        A home abre com um carrossel destas imagens, sem texto por cima.
      </p>

      <div className="mt-7 max-w-5xl">
        <GestaoBanners />
      </div>

      <hr className="my-10 max-w-5xl border-hairline" />

      <h2 className="text-heading-md text-ink">Gerador de prompt</h2>
      <p className="mt-1 max-w-[64ch] text-body-sm text-mute">
        Monta o pedido de imagem a partir do cadastro do negócio. Copie, cole em
        qualquer gerador de imagem e envie o resultado acima.
      </p>

      {faltando.length > 0 && (
        <div className="mt-4 flex max-w-2xl items-start gap-2.5 rounded-ds-md border border-warning-soft/40 bg-warning-soft/[0.08] p-3">
          <Warning size={16} className="mt-0.5 shrink-0 text-warning-deep" />
          <p className="text-body-sm text-body">
            O prompt vai sair genérico: falta preencher <b>{faltando.join(", ")}</b> em{" "}
            <Link to="/admin/config" className="font-medium text-ink underline">O negócio</Link>.
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <Card className="p-4">
            <p className="mb-3 text-eyebrow text-mute">Onde vai aparecer</p>
            <Select value={formato} onChange={(e) => setFormato(e.target.value)} aria-label="Formato">
              {FORMATOS.map((f) => (
                <option key={f.chave} value={f.chave}>{f.rotulo} · {f.largura}×{f.altura}</option>
              ))}
            </Select>
            <p className="mt-2.5 text-caption text-mute">{alvo.onde}.</p>
          </Card>

          <Card className="p-4">
            <p className="mb-3 text-eyebrow text-mute">Tratamento</p>
            <SegmentedControl
              className="w-full"
              value={estilo}
              onChange={(v) => setEstilo(v as Estilo)}
              options={[{ value: "fotografico", label: "Fotográfico" }, { value: "grafico", label: "Gráfico" }]}
            />
            {estilo === "fotografico" && (
              <div className="mt-4 flex flex-col gap-2.5">
                <label htmlFor="carro" className="flex items-center gap-2 text-body-sm text-body">
                  <input id="carro" type="checkbox" checked={mostrarCarro}
                    onChange={(e) => setMostrarCarro(e.target.checked)} />
                  Mostrar um veículo
                </label>
                <label htmlFor="pessoas" className="flex items-center gap-2 text-body-sm text-body">
                  <input id="pessoas" type="checkbox" checked={mostrarPessoas}
                    onChange={(e) => setMostrarPessoas(e.target.checked)} />
                  Mostrar pessoas
                </label>
              </div>
            )}
          </Card>

          <Card className="p-4">
            <p className="mb-3 text-eyebrow text-mute">O que o prompt já usa</p>
            <dl className="space-y-2.5 text-body-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-mute">Negócio</dt>
                <dd className="truncate text-right font-medium text-ink">{config.nome}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-mute">Tom</dt>
                <dd className="text-right font-medium text-ink">{tom.rotulo}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-mute">Cores</dt>
                <dd className="flex items-center gap-1.5">
                  {[config.cor_primaria, config.cor_destaque].map((c, i) => (
                    <span key={i} className="flex items-center gap-1">
                      <span className="h-4 w-4 rounded-ds-xs border border-hairline-strong"
                        style={{ background: `hsl(${c})` }} />
                      <code className="font-mono text-[11px] text-mute">{hslParaHex(c)}</code>
                    </span>
                  ))}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-mute">Proporção</dt>
                <dd className="text-right font-medium tabular-nums text-ink">{alvo.largura}×{alvo.altura}</dd>
              </div>
            </dl>
          </Card>

          <Field id="obs" label="Pedidos específicos"
            hint="Opcional. Entra como um bloco próprio no fim do prompt.">
            <Textarea id="obs" rows={3} value={observacoes} onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex.: fachada da loja com as bandeiras na frente" />
          </Field>
        </div>

        <div>
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <p className="text-eyebrow text-mute">Prompt gerado</p>
            <div className="flex items-center gap-2">
              <Badge tone="soft">{prompt.length} caracteres</Badge>
              <Button variant="secondary" size="sm" onClick={salvarRascunho} disabled={salvando}>
                {salvando ? "Salvando…" : "Salvar rascunho"}
              </Button>
              <Button size="sm" onClick={copiar} icon={copiado ? <Check size={13} weight="bold" /> : <Copy size={13} />}>
                {copiado ? "Copiado" : "Copiar"}
              </Button>
            </div>
          </div>

          <pre className="max-h-[560px] overflow-auto whitespace-pre-wrap rounded-ds-lg border border-hairline bg-surface p-4 font-mono text-[12.5px] leading-[1.7] text-body">
{prompt}
          </pre>

          <p className="mt-3 max-w-[64ch] text-caption text-mute">
            O banner entra atrás do título da home, recortado e rebaixado a 30% de
            opacidade. Por isso o prompt proíbe texto na imagem e pede área limpa
            onde o site escreve — sem essas duas regras a imagem briga com a
            chamada em vez de sustentá-la.
          </p>
        </div>
      </div>
    </div>
  );
}
