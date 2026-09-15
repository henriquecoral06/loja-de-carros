import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import {
  useVeiculoAdmin, useSalvarVeiculo, useBaseFipe, useOpcionais, useOpcionaisDoVeiculo,
} from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import GaleriaUpload from "@/components/admin/GaleriaUpload";

const CAMBIOS = ["Manual", "Automático", "Automatizado", "CVT"];
const COMBUSTIVEIS = ["Flex", "Gasolina", "Etanol", "Diesel", "Híbrido", "Elétrico"];
const CARROCERIAS = ["Hatch", "Sedã", "SUV", "Picape", "Minivan", "Cupê", "Conversível", "Perua"];

const classeInput = "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm";

/**
 * Precisa viver fora do componente. Declarado lá dentro, cada render
 * produz um tipo novo e o React remonta o input — o foco se perde a
 * cada tecla digitada e o formulário fica impossível de preencher.
 */
function Campo({ id, rotulo, children }: { id: string; rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">{rotulo}</label>
      {children}
    </div>
  );
}

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

  if (!novo && isLoading) return <div className="p-6 text-muted-foreground">Carregando…</div>;

  return (
    <form onSubmit={enviar} className="p-6 pb-24">
      <Link to="/admin/veiculos" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="h-4 w-4" /> Voltar ao estoque
      </Link>
      <h1 className="mt-2 font-display text-2xl font-bold">
        {novo ? "Cadastrar veículo" : "Editar veículo"}
      </h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <fieldset className="rounded-lg border bg-card p-5">
            <legend className="px-2 text-sm font-semibold">Identificação</legend>
            <p className="mb-3 text-xs text-muted-foreground">
              Marca, modelo e versão vêm da base FIPE. É isso que mantém os filtros do site funcionando.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Campo id="marca" rotulo="Marca">
                <select id="marca" value={marcaId} className={classeInput}
                  onChange={(e) => { setMarcaId(e.target.value); setModeloId(""); campo("versao_id", ""); }}>
                  <option value="">Selecione</option>
                  {fipe?.marcas.map((m: any) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
              </Campo>
              <Campo id="modelo" rotulo="Modelo">
                <select id="modelo" value={modeloId} disabled={!marcaId} className={classeInput}
                  onChange={(e) => { setModeloId(e.target.value); campo("versao_id", ""); }}>
                  <option value="">Selecione</option>
                  {modelos.map((m: any) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
              </Campo>
              <Campo id="versao" rotulo="Versão">
                <select id="versao" value={form.versao_id ?? ""} disabled={!modeloId} className={classeInput}
                  onChange={(e) => campo("versao_id", e.target.value)}>
                  <option value="">Selecione</option>
                  {versoes.map((v: any) => <option key={v.id} value={v.id}>{v.nome}</option>)}
                </select>
              </Campo>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Campo id="ano_fab" rotulo="Ano de fabricação">
                <input id="ano_fab" type="number" value={form.ano_fabricacao} className={classeInput}
                  onChange={(e) => campo("ano_fabricacao", e.target.value)} />
              </Campo>
              <Campo id="ano_mod" rotulo="Ano do modelo">
                <input id="ano_mod" type="number" value={form.ano_modelo} className={classeInput}
                  onChange={(e) => campo("ano_modelo", e.target.value)} />
              </Campo>
              <Campo id="codigo" rotulo="Código interno">
                <input id="codigo" value={form.codigo_interno ?? ""} className={classeInput}
                  onChange={(e) => campo("codigo_interno", e.target.value)} />
              </Campo>
            </div>
          </fieldset>

          <fieldset className="rounded-lg border bg-card p-5">
            <legend className="px-2 text-sm font-semibold">Ficha técnica</legend>
            <div className="grid gap-4 sm:grid-cols-3">
              <Campo id="km" rotulo="Quilometragem">
                <input id="km" type="number" value={form.km} className={classeInput}
                  onChange={(e) => campo("km", e.target.value)} />
              </Campo>
              <Campo id="cambio" rotulo="Câmbio">
                <select id="cambio" value={form.cambio} className={classeInput}
                  onChange={(e) => campo("cambio", e.target.value)}>
                  {CAMBIOS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Campo>
              <Campo id="combustivel" rotulo="Combustível">
                <select id="combustivel" value={form.combustivel} className={classeInput}
                  onChange={(e) => campo("combustivel", e.target.value)}>
                  {COMBUSTIVEIS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Campo>
              <Campo id="cor" rotulo="Cor">
                <input id="cor" required value={form.cor ?? ""} className={classeInput}
                  onChange={(e) => campo("cor", e.target.value)} />
              </Campo>
              <Campo id="carroceria" rotulo="Carroceria">
                <select id="carroceria" value={form.carroceria} className={classeInput}
                  onChange={(e) => campo("carroceria", e.target.value)}>
                  {CARROCERIAS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Campo>
              <Campo id="portas" rotulo="Portas">
                <input id="portas" type="number" min={2} max={5} value={form.portas} className={classeInput}
                  onChange={(e) => campo("portas", e.target.value)} />
              </Campo>
              <Campo id="motor" rotulo="Motor">
                <input id="motor" value={form.motor ?? ""} placeholder="2.0 16V" className={classeInput}
                  onChange={(e) => campo("motor", e.target.value)} />
              </Campo>
              <Campo id="potencia" rotulo="Potência (cv)">
                <input id="potencia" type="number" value={form.potencia_cv ?? ""} className={classeInput}
                  onChange={(e) => campo("potencia_cv", e.target.value)} />
              </Campo>
            </div>
          </fieldset>

          <fieldset className="rounded-lg border bg-card p-5">
            <legend className="px-2 text-sm font-semibold">Procedência</legend>
            <div className="flex flex-wrap gap-4">
              {[
                ["unico_dono", "Único dono"], ["ipva_pago", "IPVA pago"],
                ["licenciado", "Licenciado"], ["laudo_cautelar", "Laudo cautelar"],
                ["manual_chave", "Manual e chave reserva"], ["blindado", "Blindado"],
              ].map(([chave, rotulo]) => (
                <label key={chave} htmlFor={chave} className="flex items-center gap-2 text-sm">
                  <input id={chave} type="checkbox" checked={!!form[chave]}
                    onChange={(e) => campo(chave, e.target.checked)} />
                  {rotulo}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="rounded-lg border bg-card p-5">
            <legend className="px-2 text-sm font-semibold">Opcionais</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {(opcionais ?? []).map((o: any) => (
                <label key={o.id} htmlFor={`op-${o.id}`} className="flex items-center gap-2 text-sm">
                  <input id={`op-${o.id}`} type="checkbox" checked={selecionados.includes(o.id)}
                    onChange={(e) => setSelecionados((s) =>
                      e.target.checked ? [...s, o.id] : s.filter((x) => x !== o.id))} />
                  {o.nome}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="rounded-lg border bg-card p-5">
            <legend className="px-2 text-sm font-semibold">Descrição</legend>
            <textarea id="descricao" rows={5} value={form.descricao ?? ""} className={classeInput}
              placeholder="Conte o que faz esse carro valer a visita."
              onChange={(e) => campo("descricao", e.target.value)} />
          </fieldset>

          {!novo && (
            <fieldset className="rounded-lg border bg-card p-5">
              <legend className="px-2 text-sm font-semibold">Galeria</legend>
              <GaleriaUpload veiculoId={id!} />
            </fieldset>
          )}
          {novo && (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Salve o cadastro para liberar o envio de fotos.
            </p>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <fieldset className="rounded-lg border bg-card p-5">
            <legend className="px-2 text-sm font-semibold">Publicação</legend>
            <Campo id="status" rotulo="Status">
              <select id="status" value={form.status} className={classeInput}
                onChange={(e) => campo("status", e.target.value)}>
                <option value="rascunho">Rascunho (não publica)</option>
                <option value="disponivel">Disponível</option>
                <option value="reservado">Reservado</option>
                <option value="vendido">Vendido</option>
                <option value="oculto">Oculto</option>
              </select>
            </Campo>
            <label htmlFor="destaque" className="mt-3 flex items-center gap-2 text-sm">
              <input id="destaque" type="checkbox" checked={!!form.destaque}
                onChange={(e) => campo("destaque", e.target.checked)} />
              Destacar na home
            </label>
            <Campo id="ordem" rotulo="Ordem">
              <input id="ordem" type="number" value={form.ordem ?? 0} className={classeInput}
                onChange={(e) => campo("ordem", e.target.value)} />
            </Campo>
          </fieldset>

          <fieldset className="rounded-lg border bg-card p-5">
            <legend className="px-2 text-sm font-semibold">Preço</legend>
            <Campo id="preco" rotulo="Preço de venda">
              <input id="preco" type="number" step="0.01" required value={form.preco ?? ""} className={classeInput}
                onChange={(e) => campo("preco", e.target.value)} />
            </Campo>
            <Campo id="promo" rotulo="Preço promocional">
              <input id="promo" type="number" step="0.01" value={form.preco_promocional ?? ""} className={classeInput}
                onChange={(e) => campo("preco_promocional", e.target.value)} />
            </Campo>
            <Campo id="fipe" rotulo="Valor FIPE">
              <input id="fipe" type="number" step="0.01" value={form.valor_fipe ?? ""} className={classeInput}
                onChange={(e) => campo("valor_fipe", e.target.value)} />
            </Campo>
            <label htmlFor="sob_consulta" className="mt-3 flex items-center gap-2 text-sm">
              <input id="sob_consulta" type="checkbox" checked={!!form.preco_sob_consulta}
                onChange={(e) => campo("preco_sob_consulta", e.target.checked)} />
              Preço sob consulta
            </label>
          </fieldset>

          {isAdmin && (
            <fieldset className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-5">
              <legend className="px-2 text-sm font-semibold">Interno</legend>
              <p className="mb-3 text-xs text-muted-foreground">
                Visível só para administradores. Nunca aparece no site.
              </p>
              <Campo id="custo" rotulo="Preço de custo">
                <input id="custo" type="number" step="0.01" value={form.preco_custo ?? ""} className={classeInput}
                  onChange={(e) => campo("preco_custo", e.target.value)} />
              </Campo>
              <Campo id="placa" rotulo="Placa">
                <input id="placa" value={form.placa ?? ""} className={classeInput}
                  onChange={(e) => campo("placa", e.target.value)} />
              </Campo>
            </fieldset>
          )}

          {erro && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{erro}</p>}

          <button type="submit" disabled={salvar.isPending}
            className="w-full rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-60">
            {salvar.isPending ? "Salvando…" : novo ? "Cadastrar veículo" : "Salvar alterações"}
          </button>
        </aside>
      </div>
    </form>
  );
}
