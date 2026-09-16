import { and, asc, eq, inArray } from "drizzle-orm";
import { useEffect, useMemo, useRef, useState } from "react";
import { data, Form, Link, redirect, useNavigation } from "react-router";
import { catalogo } from "~/.server/anuncios";
import { db, schema } from "~/.server/db";
import { removerObjetos, salvarFotoAnuncio, urlImagem, validarImagem } from "~/.server/imagens";
import { anuncioDoUsuario } from "~/.server/meus-anuncios";
import { exigirUsuario } from "~/.server/sessao";
import { exigirMesmaOrigem } from "~/.server/seguranca";
import { CampoArea, CampoSelecao, CampoTexto } from "~/components/Campo";
import { GerenciadorFotos } from "~/components/GerenciadorFotos";
import { apenasDigitos, inteiro, slugify } from "~/lib/formato";
import { SITE } from "~/lib/site";
import {
  ANO_MINIMO, anoMaximo, CAMBIOS, CARROCERIAS, COMBUSTIVEIS, CORES, OPCIONAIS, UFS,
} from "~/lib/veiculos";
import type { Route } from "./+types/anuncio-form";

export function meta({ params }: Route.MetaArgs) {
  return [{ title: `${params.id ? "Editar anúncio" : "Novo anúncio"} — ${SITE.nome}` }, { name: "robots", content: "noindex" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const usuario = await exigirUsuario(request);
  const cat = await catalogo();

  if (!params.id) return { catalogo: cat, anuncio: null, fotos: [], usuario };

  const anuncio = await anuncioDoUsuario(params.id, usuario.id);
  const fotos = await db.select({ id: schema.fotos.id, chave: schema.fotos.chave }).from(schema.fotos)
    .where(eq(schema.fotos.anuncioId, anuncio.id)).orderBy(asc(schema.fotos.ordem));

  return {
    catalogo: cat,
    anuncio: { ...anuncio, opcionais: JSON.parse(anuncio.opcionais) as string[] },
    fotos: fotos.map((f) => ({ id: f.id, url: urlImagem(f.chave) })),
    usuario,
  };
}

type Campos = "marcaId" | "modeloId" | "versao" | "anoFabricacao" | "anoModelo" | "km" | "preco" | "cambio"
  | "combustivel" | "carroceria" | "cor" | "portas" | "descricao" | "cidade" | "uf" | "fotos";
type Erros = Partial<Record<Campos, string>>;

const naLista = (valor: string, lista: readonly string[]) => lista.includes(valor);

export async function action({ request, params }: Route.ActionArgs) {
  exigirMesmaOrigem(request);
  const usuario = await exigirUsuario(request);
  const existente = params.id ? await anuncioDoUsuario(params.id, usuario.id) : null;
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
    descricao: texto("descricao"), cidade: texto("cidade"), uf: texto("uf"),
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
  if (v.cidade.length < 2) erros.cidade = "Informe a cidade.";
  if (!naLista(v.uf, UFS)) erros.uf = "Escolha o estado.";

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
    erros.fotos = r.erro === "grande" ? `A foto "${novas[invalida].name}" passa de 8 MB.` : `A foto "${novas[invalida].name}" não é JPG, PNG ou WebP.`;
  }

  if (Object.keys(erros).length) return data({ erros }, { status: 400 });

  const agora = Date.now();
  const id = existente?.id ?? crypto.randomUUID();
  const [marca] = await db.select({ nome: schema.marcas.nome }).from(schema.marcas).where(eq(schema.marcas.id, v.marcaId)).limit(1);
  const [modeloNome] = await db.select({ nome: schema.modelos.nome }).from(schema.modelos).where(eq(schema.modelos.id, v.modeloId)).limit(1);

  // O slug nasce na criação e não muda depois: mudar quebraria todo link
  // que o anunciante já compartilhou.
  const slug = existente?.slug
    ?? `${slugify(`${marca.nome} ${modeloNome.nome} ${v.versao} ${v.anoModelo}`).slice(0, 70)}-${crypto.randomUUID().slice(0, 8)}`;

  const dados = {
    marcaId: v.marcaId, modeloId: v.modeloId, versao: v.versao, anoFabricacao: v.anoFabricacao, anoModelo: v.anoModelo,
    km: v.km, preco: v.preco, cambio: v.cambio as never, combustivel: v.combustivel as never, carroceria: v.carroceria as never,
    cor: v.cor, portas: v.portas, opcionais: JSON.stringify(v.opcionais), descricao: v.descricao,
    cidade: v.cidade, uf: v.uf, atualizadoEm: agora,
  };

  if (!existente) {
    await db.insert(schema.anuncios).values({ id, slug, usuarioId: usuario.id, status: "ativo", criadoEm: agora, ...dados });
  }

  // Sobe as fotos novas. Se o R2 falhar, desfaz o que subiu e, se o
  // anúncio acabou de ser criado, apaga ele também.
  const chavesNovas: string[] = [];
  try {
    for (const r of validadas) {
      if (r.ok) chavesNovas.push(await salvarFotoAnuncio(id, r.bytes, r.tipo));
    }
  } catch {
    await removerObjetos(chavesNovas);
    if (!existente) await db.delete(schema.anuncios).where(eq(schema.anuncios.id, id));
    return data({ erros: { fotos: "Não foi possível enviar as fotos. Tente de novo." } as Erros }, { status: 500 });
  }

  const mantidas = new Set(sequencia.filter((s) => s.tipo === "e").map((s) => (s as { id: string }).id));
  const removidas = atuais.filter((f) => !mantidas.has(f.id));

  await db.batch([
    ...(existente ? [db.update(schema.anuncios).set(dados).where(and(eq(schema.anuncios.id, id), eq(schema.anuncios.usuarioId, usuario.id)))] : []),
    ...(removidas.length ? [db.delete(schema.fotos).where(inArray(schema.fotos.id, removidas.map((f) => f.id)))] : []),
    ...sequencia.map((s, posicao) => s.tipo === "e"
      ? db.update(schema.fotos).set({ ordem: posicao }).where(eq(schema.fotos.id, s.id))
      : db.insert(schema.fotos).values({ id: crypto.randomUUID(), anuncioId: id, chave: chavesNovas[s.indice], ordem: posicao })),
  ] as never);

  // Arquivo só sai do R2 depois que o banco confirmou.
  await removerObjetos(removidas.map((f) => f.chave));

  throw redirect(`/painel?salvo=${slug}`);
}

const ANOS = Array.from({ length: anoMaximo() - ANO_MINIMO + 1 }, (_, i) => anoMaximo() - i);
const formatarMilhar = (t: string) => { const d = apenasDigitos(t).slice(0, 9); return d ? inteiro(Number(d)) : ""; };

export default function AnuncioForm({ loaderData, actionData }: Route.ComponentProps) {
  const { catalogo: cat, anuncio: a, fotos, usuario } = loaderData;
  const erros: Erros = actionData?.erros ?? {};
  const navigation = useNavigation();
  const enviando = navigation.state === "submitting";

  const [marcaId, setMarcaId] = useState(a ? String(a.marcaId) : "");
  const modelos = useMemo(() => cat.find((m) => String(m.id) === marcaId)?.modelos ?? [], [cat, marcaId]);
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
    <Form ref={formRef} method="post" encType="multipart/form-data" noValidate className="grid gap-4 pb-28">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-tinta">{a ? "Editar anúncio" : "Anunciar meu carro"}</h2>
        <p className="text-suave">{a ? "As mudanças aparecem no site assim que você salvar." : "Anúncios completos, com boas fotos, recebem mais contatos."}</p>
      </div>

      {Object.keys(erros).length > 0 && (
        <div role="alert" className="rounded-xl border border-erro/20 bg-erro-fundo px-4 py-3 text-sm text-erro">
          Revise os campos marcados antes de publicar.
        </div>
      )}

      <section className={secao} aria-labelledby="sec-veiculo">
        <h3 id="sec-veiculo" className={tituloSecao}>Veículo</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <CampoSelecao id="marcaId" rotulo="Marca" value={marcaId} onChange={(e) => setMarcaId(e.target.value)} erro={erros.marcaId}>
            <option value="" disabled>Selecione</option>
            {cat.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </CampoSelecao>
          <CampoSelecao id="modeloId" rotulo="Modelo" defaultValue={a ? String(a.modeloId) : ""} key={marcaId} disabled={!marcaId} erro={erros.modeloId}>
            <option value="" disabled>{marcaId ? "Selecione" : "Escolha a marca primeiro"}</option>
            {modelos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </CampoSelecao>
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

      <section className={secao} aria-labelledby="sec-fotos">
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
        <CampoArea id="descricao" rotulo="Conte o que o comprador precisa saber" rows={6} maxLength={3000}
          value={descricao} onChange={(e) => setDescricao(e.target.value)}
          placeholder="Revisões, estado de conservação, se aceita troca, histórico do carro…"
          dica={`${inteiro(descricao.length)} de 3.000 caracteres`} erro={erros.descricao} className="mt-4" />
      </section>

      <section className={secao} aria-labelledby="sec-local">
        <h3 id="sec-local" className={tituloSecao}>Onde o carro está</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_140px]">
          <CampoTexto id="cidade" rotulo="Cidade" defaultValue={a?.cidade ?? usuario.cidade} erro={erros.cidade} />
          <CampoSelecao id="uf" rotulo="Estado" defaultValue={a?.uf ?? usuario.uf} erro={erros.uf}>
            {UFS.map((u) => <option key={u}>{u}</option>)}
          </CampoSelecao>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-linha bg-white/95 backdrop-blur">
        <div className="conteiner flex items-center justify-end gap-3 py-3">
          <Link to="/painel" className="botao-fantasma">Cancelar</Link>
          <button type="submit" disabled={enviando} className="botao-primario min-w-44">
            {enviando ? "Salvando…" : a ? "Salvar alterações" : "Publicar anúncio"}
          </button>
        </div>
      </div>
    </Form>
  );
}
