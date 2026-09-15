import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft } from "@phosphor-icons/react";
import {
  useVeiculoAdmin, useSalvarVeiculo, useBaseFipe, useOpcionais, useOpcionaisDoVeiculo,
} from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import GaleriaUpload from "@/components/admin/GaleriaUpload";
import { Button, Field as Campo, Input, Select, Textarea } from "@/components/ui";

const CAMBIOS = ["Manual", "Automático", "Automatizado", "CVT"];
const COMBUSTIVEIS = ["Flex", "Gasolina", "Etanol", "Diesel", "Híbrido", "Elétrico"];
const CARROCERIAS = ["Hatch", "Sedã", "SUV", "Picape", "Minivan", "Cupê", "Conversível", "Perua"];

const gerarSlug = (texto: string) =>
  texto.normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function VeiculoForm() {
  const { id } = useParams();
  const novo = id === "novo";
  const navegar = useNavigate();
  const { isAdmin, user } = useAuth();

  const { data: veiculo, isLoading } = useVeiculoAdmin(id);
  const { data: fipe } = useBaseFipe();
  const { data: opcionais } = useOpcionais();
  const { data: opcionaisAtuais } = useOpcionaisDoVeiculo(id);
  const salvar = useSalvarVeiculo();

  const [form, setForm] = useState<Record<string, any>>({
    ano_fabricacao: new Date().getFullYear() - 1,
    ano_modelo: new Date().getFullYear(),
    km: 0, cambio: "Automático", combustivel: "Flex", cor: "", carroceria: "SUV",
    portas: 4, preco: "", status: "rascunho", destaque: false, origem_cadastro: "fipe",
  });
  const [marcaId, setMarcaId] = useState("");
  const [modeloId, setModeloId] = useState("");
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!veiculo) return;
    setForm(veiculo as any);
    const versao = fipe?.versoes.find((v: any) => v.id === (veiculo as any).versao_id);
    const modelo = fipe?.modelos.find((m: any) => m.id === versao?.modelo_id);
    if (modelo) { setModeloId(modelo.id); setMarcaId(modelo.marca_id); }
  }, [veiculo, fipe]);

  useEffect(() => { if (opcionaisAtuais) setSelecionados(opcionaisAtuais); }, [opcionaisAtuais]);

  const modelos = useMemo(
    () => (fipe?.modelos ?? []).filter((m: any) => m.marca_id === marcaId), [fipe, marcaId]);
  const versoes = useMemo(
    () => (fipe?.versoes ?? []).filter((v: any) => v.modelo_id === modeloId), [fipe, modeloId]);

  const campo = (chave: string, valor: any) => setForm((f) => ({ ...f, [chave]: valor }));

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    if (!form.versao_id) { setErro("Escolha marca, modelo e versão."); return; }
    if (!form.preco) { setErro("Informe o preço."); return; }

    const versao = fipe?.versoes.find((v: any) => v.id === form.versao_id);
    const modelo = fipe?.modelos.find((m: any) => m.id === versao?.modelo_id);
    const marca = fipe?.marcas.find((m: any) => m.id === modelo?.marca_id);

    const dados: Record<string, any> = {
      versao_id: form.versao_id,
      codigo_interno: form.codigo_interno || null,
      ano_fabricacao: Number(form.ano_fabricacao),
      ano_modelo: Number(form.ano_modelo),
      km: Number(form.km) || 0,
      cambio: form.cambio, combustivel: form.combustivel,
      cor: form.cor, cor_interna: form.cor_interna || null,
      carroceria: form.carroceria, portas: Number(form.portas),
      motor: form.motor || null,
      potencia_cv: form.potencia_cv ? Number(form.potencia_cv) : null,
      blindado: !!form.blindado, pcd: !!form.pcd,
      preco: Number(form.preco),
      preco_promocional: form.preco_promocional ? Number(form.preco_promocional) : null,
      preco_sob_consulta: !!form.preco_sob_consulta,
      aceita_troca: form.aceita_troca !== false,
      aceita_financiamento: form.aceita_financiamento !== false,
      valor_fipe: form.valor_fipe ? Number(form.valor_fipe) : null,
      unico_dono: !!form.unico_dono, ipva_pago: !!form.ipva_pago,
      licenciado: !!form.licenciado, laudo_cautelar: !!form.laudo_cautelar,
      manual_chave: !!form.manual_chave,
      descricao: form.descricao || null,
      status: form.status, destaque: !!form.destaque,
      ordem: Number(form.ordem) || 0,
      meta_title: form.meta_title || null,
      meta_description: form.meta_description || null,
    };

    // Só admin tem permissão nestes campos; enviar como vendedor quebraria a RLS.
    if (isAdmin) {
      dados.preco_custo = form.preco_custo ? Number(form.preco_custo) : null;
      dados.placa = form.placa || null;
      dados.chassi = form.chassi || null;
    }

    if (novo) {
      dados.slug = gerarSlug(
        `${marca?.nome} ${modelo?.nome} ${versao?.nome} ${form.ano_modelo}`) + `-${Date.now().toString(36).slice(-4)}`;
      dados.criado_por = user?.id;
    }

    try {
      const veiculoId = await salvar.mutateAsync({ id: novo ? undefined : id, dados });

      await supabase.from("veiculo_opcionais").delete().eq("veiculo_id", veiculoId);
      if (selecionados.length) {
        await supabase.from("veiculo_opcionais").insert(
          selecionados.map((opcional_id) => ({ veiculo_id: veiculoId, opcional_id })));
      }
      navegar(novo ? `/admin/veiculos/${veiculoId}` : "/admin/veiculos");
    } catch (e: any) {
      setErro(e.message ?? "Não foi possível salvar.");
    }
  }

  if (!novo && isLoading) return <div className="p-6 text-body-sm text-mute">Carregando…</div>;

  return (
    <form onSubmit={enviar} className="p-5 pb-24 md:p-6">
      <Link to="/admin/veiculos" className="ds-focus inline-flex items-center gap-1.5 rounded-ds-xs text-body-sm text-mute hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Voltar ao estoque
      </Link>
      <h1 className="mt-2 text-heading-xl text-ink">
        {novo ? "Cadastrar veículo" : "Editar veículo"}
      </h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <fieldset className="rounded-ds-lg border border-hairline bg-surface p-5">
            <legend className="px-2 text-label-lg text-ink">Identificação</legend>
            <p className="mb-3 text-caption text-mute">
              Marca, modelo e versão vêm da base FIPE. É isso que mantém os filtros do site funcionando.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Campo id="marca" label="Marca">
                <Select id="marca" value={marcaId} 
                  onChange={(e) => { setMarcaId(e.target.value); setModeloId(""); campo("versao_id", ""); }}>
                  <option value="">Selecione</option>
                  {fipe?.marcas.map((m: any) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </Select>
              </Campo>
              <Campo id="modelo" label="Modelo">
                <Select id="modelo" value={modeloId} disabled={!marcaId} 
                  onChange={(e) => { setModeloId(e.target.value); campo("versao_id", ""); }}>
                  <option value="">Selecione</option>
                  {modelos.map((m: any) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </Select>
              </Campo>
              <Campo id="versao" label="Versão">
                <Select id="versao" value={form.versao_id ?? ""} disabled={!modeloId} 
                  onChange={(e) => campo("versao_id", e.target.value)}>
                  <option value="">Selecione</option>
                  {versoes.map((v: any) => <option key={v.id} value={v.id}>{v.nome}</option>)}
                </Select>
              </Campo>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Campo id="ano_fab" label="Ano de fabricação">
                <Input id="ano_fab" type="number" value={form.ano_fabricacao} 
                  onChange={(e) => campo("ano_fabricacao", e.target.value)} />
              </Campo>
              <Campo id="ano_mod" label="Ano do modelo">
                <Input id="ano_mod" type="number" value={form.ano_modelo} 
                  onChange={(e) => campo("ano_modelo", e.target.value)} />
              </Campo>
              <Campo id="codigo" label="Código interno">
                <Input id="codigo" value={form.codigo_interno ?? ""} 
                  onChange={(e) => campo("codigo_interno", e.target.value)} />
              </Campo>
            </div>
          </fieldset>

          <fieldset className="rounded-ds-lg border border-hairline bg-surface p-5">
            <legend className="px-2 text-label-lg text-ink">Ficha técnica</legend>
            <div className="grid gap-4 sm:grid-cols-3">
              <Campo id="km" label="Quilometragem">
                <Input id="km" type="number" value={form.km} 
                  onChange={(e) => campo("km", e.target.value)} />
              </Campo>
              <Campo id="cambio" label="Câmbio">
                <Select id="cambio" value={form.cambio} 
                  onChange={(e) => campo("cambio", e.target.value)}>
                  {CAMBIOS.map((c) => <option key={c}>{c}</option>)}
                </Select>
              </Campo>
              <Campo id="combustivel" label="Combustível">
                <Select id="combustivel" value={form.combustivel} 
                  onChange={(e) => campo("combustivel", e.target.value)}>
                  {COMBUSTIVEIS.map((c) => <option key={c}>{c}</option>)}
                </Select>
              </Campo>
              <Campo id="cor" label="Cor">
                <Input id="cor" required value={form.cor ?? ""} 
                  onChange={(e) => campo("cor", e.target.value)} />
              </Campo>
              <Campo id="carroceria" label="Carroceria">
                <Select id="carroceria" value={form.carroceria} 
                  onChange={(e) => campo("carroceria", e.target.value)}>
                  {CARROCERIAS.map((c) => <option key={c}>{c}</option>)}
                </Select>
              </Campo>
              <Campo id="portas" label="Portas">
                <Input id="portas" type="number" min={2} max={5} value={form.portas} 
                  onChange={(e) => campo("portas", e.target.value)} />
              </Campo>
              <Campo id="motor" label="Motor">
                <Input id="motor" value={form.motor ?? ""} placeholder="2.0 16V" 
                  onChange={(e) => campo("motor", e.target.value)} />
              </Campo>
              <Campo id="potencia" label="Potência (cv)">
                <Input id="potencia" type="number" value={form.potencia_cv ?? ""} 
                  onChange={(e) => campo("potencia_cv", e.target.value)} />
              </Campo>
            </div>
          </fieldset>

          <fieldset className="rounded-ds-lg border border-hairline bg-surface p-5">
            <legend className="px-2 text-label-lg text-ink">Procedência</legend>
            <div className="flex flex-wrap gap-x-5 gap-y-2.5">
              {[
                ["unico_dono", "Único dono"], ["ipva_pago", "IPVA pago"],
                ["licenciado", "Licenciado"], ["laudo_cautelar", "Laudo cautelar"],
                ["manual_chave", "Manual e chave reserva"], ["blindado", "Blindado"],
              ].map(([chave, rotulo]) => (
                <label key={chave} htmlFor={chave} className="flex items-center gap-2 whitespace-nowrap text-body-sm text-body">
                  <Input id={chave} type="checkbox" checked={!!form[chave]}
                    onChange={(e) => campo(chave, e.target.checked)} />
                  {rotulo}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="rounded-ds-lg border border-hairline bg-surface p-5">
            <legend className="px-2 text-label-lg text-ink">Opcionais</legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(opcionais ?? []).map((o: any) => (
                <label key={o.id} htmlFor={`op-${o.id}`} className="flex items-center gap-2 whitespace-nowrap text-body-sm text-body">
                  <Input id={`op-${o.id}`} type="checkbox" checked={selecionados.includes(o.id)}
                    onChange={(e) => setSelecionados((s) =>
                      e.target.checked ? [...s, o.id] : s.filter((x) => x !== o.id))} />
                  {o.nome}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="rounded-ds-lg border border-hairline bg-surface p-5">
            <legend className="px-2 text-label-lg text-ink">Descrição</legend>
            <Textarea id="descricao" rows={5} value={form.descricao ?? ""}
              placeholder="Conte o que faz esse carro valer a visita."
              onChange={(e) => campo("descricao", e.target.value)} />
          </fieldset>

          {!novo && (
            <fieldset className="rounded-ds-lg border border-hairline bg-surface p-5">
              <legend className="px-2 text-label-lg text-ink">Galeria</legend>
              <GaleriaUpload veiculoId={id!} />
            </fieldset>
          )}
          {novo && (
            <p className="rounded-ds-lg border border-dashed border-hairline-strong p-4 text-body-sm text-mute">
              Salve o cadastro para liberar o envio de fotos.
            </p>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <fieldset className="rounded-ds-lg border border-hairline bg-surface p-5">
            <legend className="px-2 text-label-lg text-ink">Publicação</legend>
            <Campo id="status" label="Status">
              <Select id="status" value={form.status} 
                onChange={(e) => campo("status", e.target.value)}>
                <option value="rascunho">Rascunho (não publica)</option>
                <option value="disponivel">Disponível</option>
                <option value="reservado">Reservado</option>
                <option value="vendido">Vendido</option>
                <option value="oculto">Oculto</option>
              </Select>
            </Campo>
            <label htmlFor="destaque" className="mt-3 flex items-center gap-2 text-body-sm text-body">
              <Input id="destaque" type="checkbox" checked={!!form.destaque}
                onChange={(e) => campo("destaque", e.target.checked)} />
              Destacar na home
            </label>
            <Campo id="ordem" label="Ordem">
              <Input id="ordem" type="number" value={form.ordem ?? 0} 
                onChange={(e) => campo("ordem", e.target.value)} />
            </Campo>
          </fieldset>

          <fieldset className="rounded-ds-lg border border-hairline bg-surface p-5">
            <legend className="px-2 text-label-lg text-ink">Preço</legend>
            <Campo id="preco" label="Preço de venda">
              <Input id="preco" type="number" step="0.01" required value={form.preco ?? ""} 
                onChange={(e) => campo("preco", e.target.value)} />
            </Campo>
            <Campo id="promo" label="Preço promocional">
              <Input id="promo" type="number" step="0.01" value={form.preco_promocional ?? ""} 
                onChange={(e) => campo("preco_promocional", e.target.value)} />
            </Campo>
            <Campo id="fipe" label="Valor FIPE">
              <Input id="fipe" type="number" step="0.01" value={form.valor_fipe ?? ""} 
                onChange={(e) => campo("valor_fipe", e.target.value)} />
            </Campo>
            <label htmlFor="sob_consulta" className="mt-3 flex items-center gap-2 text-body-sm text-body">
              <Input id="sob_consulta" type="checkbox" checked={!!form.preco_sob_consulta}
                onChange={(e) => campo("preco_sob_consulta", e.target.checked)} />
              Preço sob consulta
            </label>
          </fieldset>

          {isAdmin && (
            <fieldset className="rounded-ds-lg border border-warning-soft/40 bg-warning-soft/[0.07] p-5">
              <legend className="px-2 text-label-lg text-ink">Interno</legend>
              <p className="mb-3 text-caption text-mute">
                Visível só para administradores. Nunca aparece no site.
              </p>
              <Campo id="custo" label="Preço de custo">
                <Input id="custo" type="number" step="0.01" value={form.preco_custo ?? ""} 
                  onChange={(e) => campo("preco_custo", e.target.value)} />
              </Campo>
              <Campo id="placa" label="Placa">
                <Input id="placa" value={form.placa ?? ""} 
                  onChange={(e) => campo("placa", e.target.value)} />
              </Campo>
            </fieldset>
          )}

          {erro && <p className="rounded-ds-md bg-danger-soft/20 p-3 text-body-sm text-danger-deep">{erro}</p>}

          <Button type="submit" size="lg" disabled={salvar.isPending} className="w-full">
            {salvar.isPending ? "Salvando…" : novo ? "Cadastrar veículo" : "Salvar alterações"}
          </Button>
        </aside>
      </div>
    </form>
  );
}
