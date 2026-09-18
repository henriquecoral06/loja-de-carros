import { asc, eq, inArray, max } from "drizzle-orm";
import { useEffect, useMemo, useRef, useState } from "react";
import { data, Form, Link, redirect, useFetcher, useNavigation } from "react-router";
import { catalogo } from "~/.server/anuncios";
import { db, schema } from "~/.server/db";
import { removerObjetos, salvarFotoAnuncio, urlImagem, validarImagem } from "~/.server/imagens";
import { anuncioPorId } from "~/.server/meus-anuncios";
import { exigirUsuario } from "~/.server/sessao";
import { exigirMesmaOrigem } from "~/.server/seguranca";
import { SeletorBusca } from "~/components/admin/SeletorBusca";
import { CampoArea, CampoSelecao, CampoTexto } from "~/components/Campo";
import { GerenciadorFotos } from "~/components/GerenciadorFotos";
import { apenasDigitos, inteiro, slugify } from "~/lib/formato";
import { metaAdmin, SITE } from "~/lib/site";
import {
  ANO_MINIMO, anoMaximo, CAMBIOS, CARROCERIAS, COMBUSTIVEIS, CORES, codigoVeiculo, listaAnos, OPCIONAIS, ROTULO_STATUS, STATUS_ANUNCIO,
} from "~/lib/veiculos";
import type { Route } from "./+types/veiculo-form";

export function meta({ params, matches }: Route.MetaArgs) {
  return metaAdmin(params.id ? "Editar veículo" : "Novo veículo", matches);
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await exigirUsuario(request);
  const [cat, vendedores] = await Promise.all([
    catalogo(),
    db.select({ id: schema.vendedores.id, nome: schema.vendedores.nome, ativo: schema.vendedores.ativo }).from(schema.vendedores).orderBy(asc(schema.vendedores.nome)),
  ]);

  if (!params.id) return { catalogo: cat, vendedores, anuncio: null, fotos: [] };

  const anuncio = await anuncioPorId(params.id);
  const fotos = await db.select({ id: schema.fotos.id, chave: schema.fotos.chave }).from(schema.fotos)
    .where(eq(schema.fotos.anuncioId, anuncio.id)).orderBy(asc(schema.fotos.ordem));

  return {
    catalogo: cat,
    vendedores,
    anuncio: { ...anuncio, opcionais: JSON.parse(anuncio.opcionais) as string[] },
    fotos: fotos.map((f) => ({ id: f.id, url: urlImagem(f.chave) })),
  };
}

type Campos = "marcaId" | "modeloId" | "versao" | "anoFabricacao" | "anoModelo" | "km" | "preco" | "cambio"
  | "combustivel" | "carroceria" | "cor" | "portas" | "descricao" | "status" | "fotos" | "geral";
type Erros = Partial<Record<Campos, string>>;

const naLista = (valor: string, lista: readonly string[]) => lista.includes(valor);

export async function action({ request, params }: Route.ActionArgs) {
  exigirMesmaOrigem(request);
  const usuario = await exigirUsuario(request);
  const existente = params.id ? await anuncioPorId(params.id) : null;
  const form = await request.formData();
  const texto = (k: string) => String(form.get(k) ?? "").trim();
  const numero = (k: string) => Number(apenasDigitos(texto(k)) || NaN);

  const v = {
    marcaId: numero("marcaId"), modeloId: numero("modeloId"), versao: texto("versao"),
    anoFabricacao: numero("anoFabricacao"), anoModelo: numero("anoModelo"),
    km: numero("km"), preco: numero("preco"),
    cambio: texto("cambio"), combustivel: texto("combustivel"), carroceria: texto("carroceria"),
    cor: texto("cor"), portas: numero("portas"),
    opcionais: form.getAll("opcionais").map(String).filter((o) => naLista(o, OPCIONAIS)),
    descricao: texto("descricao"), destaque: form.get("destaque") === "on", status: texto("status") || "ativo",
    vendedorId: texto("vendedorId") || null,
  };

  const erros: Erros = {};
  const [modelo] = Number.isFinite(v.modeloId)
    ? await db.select({ marcaId: schema.modelos.marcaId }).from(schema.modelos).where(eq(schema.modelos.id, v.modeloId)).limit(1)
    : [];
  if (!Number.isFinite(v.marcaId)) erros.marcaId = "Escolha a marca.";
  if (!modelo || modelo.marcaId !== v.marcaId) erros.modeloId = "Escolha o modelo.";
  if (v.versao.length < 2 || v.versao.length > 80) erros.versao = "Informe a versão (ex.: XEi 2.0 Flex).";
  if (!(v.anoFabricacao >= ANO_MINIMO && v.anoFabricacao <= anoMaximo())) erros.anoFabricacao = "Ano de fabricação inválido.";
  // Ano do modelo é o mesmo da fabricação ou o seguinte — nunca antes.
  if (!(v.anoModelo >= v.anoFabricacao && v.anoModelo <= v.anoFabricacao + 1)) erros.anoModelo = "O ano do modelo deve ser igual ou 1 a mais que o de fabricação.";
  if (!(v.km >= 0 && v.km <= 2_000_000)) erros.km = "Informe a quilometragem.";
  if (!(v.preco >= 1000 && v.preco <= 20_000_000)) erros.preco = "Informe o preço.";
  if (!naLista(v.cambio, CAMBIOS)) erros.cambio = "Escolha o câmbio.";
  if (!naLista(v.combustivel, COMBUSTIVEIS)) erros.combustivel = "Escolha o combustível.";
  if (!naLista(v.carroceria, CARROCERIAS)) erros.carroceria = "Escolha a carroceria.";
  if (!naLista(v.cor, CORES)) erros.cor = "Escolha a cor.";
  if (!(v.portas >= 2 && v.portas <= 5)) erros.portas = "Escolha o número de portas.";
  if (v.descricao.length > 3000) erros.descricao = "A descrição pode ter até 3.000 caracteres.";
  if (!naLista(v.status, STATUS_ANUNCIO)) erros.status = "Situação inválida.";
  if (v.vendedorId) {
    const [vendedor] = await db.select({ id: schema.vendedores.id }).from(schema.vendedores).where(eq(schema.vendedores.id, v.vendedorId)).limit(1);
    if (!vendedor) v.vendedorId = null;
  }

  // ---- fotos ----
  const novas = form.getAll("fotos_novas").filter((f): f is File => f instanceof File && f.size > 0);
  const ordem = form.getAll("ordem").map(String);
  const atuais = existente
    ? await db.select({ id: schema.fotos.id, chave: schema.fotos.chave }).from(schema.fotos).where(eq(schema.fotos.anuncioId, existente.id))
    : [];

  // Só aceita id de foto que é deste anúncio: não dá para "adotar" a foto de outro.
  const idsAtuais = new Set(atuais.map((f) => f.id));
  const sequencia: Array<{ tipo: "e"; id: string } | { tipo: "n"; indice: number }> = [];
  const novasUsadas = new Set<number>();
  for (const token of ordem) {
    const [tipo, valor] = token.split(":");
    if (tipo === "e" && idsAtuais.has(valor)) sequencia.push({ tipo: "e", id: valor });
    if (tipo === "n" && Number(valor) < novas.length && !novasUsadas.has(Number(valor))) {
      novasUsadas.add(Number(valor));
      sequencia.push({ tipo: "n", indice: Number(valor) });
    }
  }
  // Sem JavaScript não há ordem para as novas: entram no fim.
  novas.forEach((_, i) => !novasUsadas.has(i) && sequencia.push({ tipo: "n", indice: i }));

  if (sequencia.length > SITE.maxFotosPorAnuncio) erros.fotos = `No máximo ${SITE.maxFotosPorAnuncio} fotos.`;

  // Valida todas as fotos antes de gravar qualquer coisa: ou entra tudo, ou nada.
  const validadas = await Promise.all(novas.map(validarImagem));
  const invalida = validadas.findIndex((r) => !r.ok);
  if (invalida >= 0) {
    const r = validadas[invalida] as { ok: false; erro: string };
    erros.fotos = r.erro === "grande" ? `A foto "${novas[invalida].name}" é grande demais. Envie pelo painel com JavaScript ativo (ele reduz a foto) ou use uma imagem menor.` : `A foto "${novas[invalida].name}" não é JPG, PNG ou WebP.`;
  }

  if (Object.keys(erros).length) return data({ erros }, { status: 400 });

  const agora = Date.now();
  const id = existente?.id ?? crypto.randomUUID();
  const [marca] = await db.select({ nome: schema.marcas.nome }).from(schema.marcas).where(eq(schema.marcas.id, v.marcaId)).limit(1);
  const [modeloNome] = await db.select({ nome: schema.modelos.nome }).from(schema.modelos).where(eq(schema.modelos.id, v.modeloId)).limit(1);

  // O slug nasce na criação e não muda depois: mudar quebraria todo link
  // que a loja já compartilhou.
  const slug = existente?.slug
    ?? `${slugify(`${marca.nome} ${modeloNome.nome} ${v.versao} ${v.anoModelo}`).slice(0, 70)}-${crypto.randomUUID().slice(0, 8)}`;

  const dados = {
    marcaId: v.marcaId, modeloId: v.modeloId, versao: v.versao, anoFabricacao: v.anoFabricacao, anoModelo: v.anoModelo,
    km: v.km, preco: v.preco, cambio: v.cambio as never, combustivel: v.combustivel as never, carroceria: v.carroceria as never,
    cor: v.cor, portas: v.portas, opcionais: JSON.stringify(v.opcionais), descricao: v.descricao,
    destaque: v.destaque, status: v.status as never, vendedorId: v.vendedorId, atualizadoEm: agora,
  };

  // 1) Guarda as fotos novas primeiro. Se falhar, nada foi gravado no
  //    cadastro ainda: não sobra carro pela metade.
  const chavesNovas: string[] = [];
  try {
    for (const r of validadas) {
      if (r.ok) chavesNovas.push(await salvarFotoAnuncio(id, r.bytes, r.tipo));
    }
  } catch (e) {
    console.error("Falha ao enviar fotos", e);
    await removerObjetos(chavesNovas).catch(() => {});
    return data({ erros: { fotos: "Não foi possível enviar as fotos. Tente de novo." } as Erros }, { status: 502 });
  }

  const mantidas = new Set(sequencia.filter((s) => s.tipo === "e").map((s) => (s as { id: string }).id));
  const removidas = atuais.filter((f) => !mantidas.has(f.id));
  const operacoesFotos = [
    ...(removidas.length ? [db.delete(schema.fotos).where(inArray(schema.fotos.id, removidas.map((f) => f.id)))] : []),
    ...sequencia.map((s, posicao) => s.tipo === "e"
      ? db.update(schema.fotos).set({ ordem: posicao }).where(eq(schema.fotos.id, s.id))
      : db.insert(schema.fotos).values({ id: crypto.randomUUID(), anuncioId: id, chave: chavesNovas[s.indice], ordem: posicao })),
  ];

  // 2) Carro e fotos numa só transação (batch do D1). Batch nunca vai
  //    vazio: a primeira operação é sempre o insert/update do carro.
  try {
    if (existente) {
      await db.batch([db.update(schema.anuncios).set(dados).where(eq(schema.anuncios.id, id)), ...operacoesFotos]);
    } else {
      // Código sequencial do estoque. É UNIQUE: se duas pessoas salvarem ao
      // mesmo tempo, a segunda tenta de novo com o próximo número.
      for (let tentativa = 0; ; tentativa++) {
        const [{ ultimo }] = await db.select({ ultimo: max(schema.anuncios.codigo) }).from(schema.anuncios);
        try {
          await db.batch([
            db.insert(schema.anuncios).values({ id, codigo: (ultimo ?? 0) + 1 + tentativa, slug, criadoPor: usuario.id, criadoEm: agora, ...dados }),
            ...operacoesFotos,
          ]);
          break;
        } catch (e) {
          if (tentativa >= 2 || !String(e).includes("UNIQUE")) throw e;
        }
      }
    }
  } catch (e) {
    console.error("Falha ao salvar veículo", e);
    await removerObjetos(chavesNovas).catch(() => {});
    return data({ erros: { geral: "Não foi possível salvar o veículo. Tente de novo em instantes." } as Erros }, { status: 500 });
  }

  // Foto antiga só é apagada depois que o cadastro confirmou.
  await removerObjetos(removidas.map((f) => f.chave)).catch((e) => console.error("Falha ao remover fotos antigas", e));

  throw redirect(`/admin/veiculos?salvo=${slug}`);
}

const formatarMilhar = (t: string) => { const d = apenasDigitos(t).slice(0, 9); return d ? inteiro(Number(d)) : ""; };

export default function VeiculoForm({ loaderData, actionData }: Route.ComponentProps) {
  const { catalogo: cat, vendedores, anuncio: a, fotos } = loaderData;
  const erros: Erros = actionData?.erros ?? {};
  const ANOS = listaAnos();
  const navigation = useNavigation();
  const enviando = navigation.state === "submitting";

  const [marcaId, setMarcaId] = useState(a ? String(a.marcaId) : "");
  const [modeloId, setModeloId] = useState(a ? String(a.modeloId) : "");
  const modelos = useMemo(() => cat.find((m) => String(m.id) === marcaId)?.modelos ?? [], [cat, marcaId]);
  const nomeMarca = cat.find((m) => String(m.id) === marcaId)?.nome ?? "";

  // "+ Adicionar marca/modelo": cria em Marcas e modelos e já deixa escolhido.
  const catalogo = useFetcher<{ ok: boolean; id?: number; erro?: string; intencao?: string }>();
  useEffect(() => {
    const r = catalogo.data;
    if (catalogo.state !== "idle" || !r?.ok || !r.id) return;
    if (r.intencao === "criar-marca") { setMarcaId(String(r.id)); setModeloId(""); }
    if (r.intencao === "criar-modelo") setModeloId(String(r.id));
  }, [catalogo.state, catalogo.data]);
  const criarNoCatalogo = (campos: Record<string, string>) => catalogo.submit(campos, { method: "post", action: "/admin/marcas" });
  const criando = catalogo.state !== "idle" ? String(catalogo.formData?.get("intencao")) : "";
  const [anoFab, setAnoFab] = useState(a ? String(a.anoFabricacao) : "");
  const [preco, setPreco] = useState(a ? inteiro(a.preco) : "");
  const [kmRodado, setKmRodado] = useState(a ? inteiro(a.km) : "");
  const [descricao, setDescricao] = useState(a?.descricao ?? "");

  // Depois de uma tentativa com erro, leva o foco ao primeiro campo
  // marcado. Não remonta o formulário: isso apagaria o que foi digitado e
  // as fotos adicionadas.
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!actionData?.erros) return;
    const primeiro = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    primeiro?.focus();
    primeiro?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [actionData]);

  const secao = "cartao p-5 sm:p-6";
  const tituloSecao = "text-lg font-bold text-tinta";

  return (
    <Form ref={formRef} method="post" encType="multipart/form-data" noValidate className="grid max-w-4xl gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-tinta sm:text-[28px]">{a ? "Editar veículo" : "Novo veículo"}{a && <span className="numeros ml-2 text-base font-medium text-suave">cód. {codigoVeiculo(a.codigo)}</span>}</h1>
        <p className="text-suave">{a ? "As mudanças aparecem no site assim que você salvar." : "Cadastros completos, com boas fotos, recebem mais contatos."}</p>
      </div>

      {Object.keys(erros).length > 0 && (
        <div role="alert" className="rounded-xl border border-erro/20 bg-erro-fundo px-4 py-3 text-sm text-erro">
          {erros.geral ?? (erros.fotos && Object.keys(erros).length === 1 ? erros.fotos : "Revise os campos marcados antes de salvar.")}
        </div>
      )}

      <section className={secao} aria-labelledby="sec-veiculo">
        <h3 id="sec-veiculo" className={tituloSecao}>Veículo</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <SeletorBusca id="marcaId" rotulo="Marca" valor={marcaId} aoMudar={(v) => { if (v !== marcaId) { setMarcaId(v); setModeloId(""); } }}
            opcoes={cat.map((m) => ({ valor: String(m.id), rotulo: m.nome, detalhe: `${m.modelos.length} ${m.modelos.length === 1 ? "modelo" : "modelos"}` }))}
            placeholder="Digite a marca" erro={erros.marcaId ?? (catalogo.data?.intencao === "criar-marca" ? catalogo.data.erro : undefined)}
            criar={{ rotulo: (t) => `Adicionar a marca “${t}”`, aoCriar: (nome) => criarNoCatalogo({ intencao: "criar-marca", nome }), criando: criando === "criar-marca" }} />
          <SeletorBusca id="modeloId" rotulo="Modelo" valor={modeloId} aoMudar={setModeloId} disabled={!marcaId}
            opcoes={modelos.map((m) => ({ valor: String(m.id), rotulo: m.nome }))}
            placeholder={marcaId ? `Digite o modelo da ${nomeMarca}` : "Escolha a marca primeiro"} vazio="Esta marca ainda não tem modelos. Digite o nome para adicionar."
            erro={erros.modeloId ?? (catalogo.data?.intencao === "criar-modelo" ? catalogo.data.erro : undefined)}
            dica={marcaId ? undefined : "Não achou a marca ou o modelo? Digite o nome e escolha “Adicionar”."}
            criar={{ rotulo: (t) => `Adicionar o modelo “${t}” à ${nomeMarca}`, aoCriar: (nome) => criarNoCatalogo({ intencao: "criar-modelo", marcaId, nome }), criando: criando === "criar-modelo" }} />
          <CampoTexto id="versao" rotulo="Versão" placeholder="Ex.: XEi 2.0 Flex CVT" maxLength={80} defaultValue={a?.versao} erro={erros.versao} className="sm:col-span-2" />
          <CampoSelecao id="anoFabricacao" rotulo="Ano de fabricação" value={anoFab} onChange={(e) => setAnoFab(e.target.value)} erro={erros.anoFabricacao}>
            <option value="" disabled>Selecione</option>
            {ANOS.map((ano) => <option key={ano} value={ano}>{ano}</option>)}
          </CampoSelecao>
          <CampoSelecao id="anoModelo" rotulo="Ano do modelo" defaultValue={a ? String(a.anoModelo) : ""} key={`modelo-${anoFab}`} disabled={!anoFab} erro={erros.anoModelo}>
            <option value="" disabled>{anoFab ? "Selecione" : "Escolha a fabricação"}</option>
            {anoFab && [Number(anoFab), Number(anoFab) + 1].map((ano) => <option key={ano} value={ano}>{ano}</option>)}
          </CampoSelecao>
          <CampoSelecao id="carroceria" rotulo="Carroceria" defaultValue={a?.carroceria ?? ""} erro={erros.carroceria}>
            <option value="" disabled>Selecione</option>
            {CARROCERIAS.map((c) => <option key={c}>{c}</option>)}
          </CampoSelecao>
          <CampoSelecao id="cor" rotulo="Cor" defaultValue={a?.cor ?? ""} erro={erros.cor}>
            <option value="" disabled>Selecione</option>
            {CORES.map((c) => <option key={c}>{c}</option>)}
          </CampoSelecao>
          <CampoSelecao id="cambio" rotulo="Câmbio" defaultValue={a?.cambio ?? ""} erro={erros.cambio}>
            <option value="" disabled>Selecione</option>
            {CAMBIOS.map((c) => <option key={c}>{c}</option>)}
          </CampoSelecao>
          <CampoSelecao id="combustivel" rotulo="Combustível" defaultValue={a?.combustivel ?? ""} erro={erros.combustivel}>
            <option value="" disabled>Selecione</option>
            {COMBUSTIVEIS.map((c) => <option key={c}>{c}</option>)}
          </CampoSelecao>
          <CampoSelecao id="portas" rotulo="Portas" defaultValue={a ? String(a.portas) : "4"} erro={erros.portas}>
            {[2, 3, 4, 5].map((p) => <option key={p} value={p}>{p}</option>)}
          </CampoSelecao>
          <CampoTexto id="km" rotulo="Quilometragem" inputMode="numeric" placeholder="Ex.: 42.500" value={kmRodado}
            onChange={(e) => setKmRodado(formatarMilhar(e.target.value))} erro={erros.km} />
        </div>
      </section>

      <section className={secao} aria-labelledby="sec-preco">
        <h3 id="sec-preco" className={tituloSecao}>Preço</h3>
        <div className="mt-4 max-w-xs">
          <label htmlFor="preco" className="rotulo">Valor de venda</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-semibold text-suave">R$</span>
            <input id="preco" name="preco" inputMode="numeric" placeholder="0" value={preco}
              onChange={(e) => setPreco(formatarMilhar(e.target.value))}
              className="campo numeros pl-11 text-lg font-bold" aria-invalid={erros.preco ? true : undefined}
              aria-describedby={erros.preco ? "preco-erro" : undefined} />
          </div>
          {erros.preco && <p id="preco-erro" className="mt-1.5 text-sm text-erro">{erros.preco}</p>}
        </div>
      </section>

      <section id="fotos" className={secao} aria-labelledby="sec-fotos">
        <h3 id="sec-fotos" className={tituloSecao}>Fotos</h3>
        <p className="mb-4 mt-1 text-sm text-suave">Mostre a frente, a traseira, as laterais, o interior e o painel com a quilometragem.</p>
        <GerenciadorFotos existentes={fotos} erro={erros.fotos} />
      </section>

      <section className={secao} aria-labelledby="sec-opcionais">
        <h3 id="sec-opcionais" className={tituloSecao}>Itens e opcionais</h3>
        <div className="mt-4 grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
          {OPCIONAIS.map((o) => (
            <label key={o} className="flex cursor-pointer items-center gap-2.5 rounded-lg py-1 text-texto">
              <input type="checkbox" name="opcionais" value={o} defaultChecked={a?.opcionais.includes(o)} className="size-4 accent-marca-600" />
              {o}
            </label>
          ))}
        </div>
      </section>

      <section className={secao} aria-labelledby="sec-descricao">
        <h3 id="sec-descricao" className={tituloSecao}>Descrição</h3>
        <CampoArea id="descricao" rotulo="O que o comprador precisa saber" rows={6} maxLength={3000}
          value={descricao} onChange={(e) => setDescricao(e.target.value)}
          placeholder="Revisões, estado de conservação, único dono, garantia…"
          dica={`${inteiro(descricao.length)} de 3.000 caracteres`} erro={erros.descricao} className="mt-4" />
      </section>

      <section className={secao} aria-labelledby="sec-publicacao">
        <h3 id="sec-publicacao" className={tituloSecao}>Publicação</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <CampoSelecao id="status" rotulo="Situação" defaultValue={a?.status ?? "ativo"} erro={erros.status}
            dica="Pausado some do site; vendido continua no link, mas sai da busca.">
            {STATUS_ANUNCIO.map((st) => <option key={st} value={st}>{ROTULO_STATUS[st]}</option>)}
          </CampoSelecao>
          <CampoSelecao id="vendedorId" rotulo="Vendedor responsável" defaultValue={a?.vendedorId ?? ""} dica="Recebe os cliques de WhatsApp deste carro. Sem vendedor, vai para a loja.">
            <option value="">Sem vendedor (WhatsApp da loja)</option>
            {vendedores.map((vd) => <option key={vd.id} value={vd.id}>{vd.nome}{vd.ativo ? "" : " (inativo)"}</option>)}
          </CampoSelecao>
          <label className="flex cursor-pointer items-start gap-3 self-center rounded-lg border border-linha p-4 sm:col-span-2">
            <input type="checkbox" name="destaque" defaultChecked={a?.destaque} className="mt-0.5 size-4 accent-marca-600" />
            <span>
              <span className="block font-semibold text-tinta">Destacar na página inicial</span>
              <span className="block text-sm text-suave">Aparece na vitrine e com o selo “Destaque”.</span>
            </span>
          </label>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-linha bg-white/95 backdrop-blur lg:left-64">
        <div className="flex items-center justify-end gap-3 px-4 py-3 sm:px-8">
          <Link to="/admin/veiculos" className="botao-fantasma">Cancelar</Link>
          <button type="submit" disabled={enviando} className="botao-primario min-w-44">
            {enviando ? "Salvando…" : a ? "Salvar alterações" : "Cadastrar veículo"}
          </button>
        </div>
      </div>
    </Form>
  );
}

export { ErroPainel as ErrorBoundary } from "~/components/admin/ErroPainel";
