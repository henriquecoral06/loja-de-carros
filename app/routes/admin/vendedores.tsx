import { asc, count, eq } from "drizzle-orm";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { data, Form, Link, redirect, useFetcher, useNavigation, useSearchParams } from "react-router";
import { db, schema } from "~/.server/db";
import { removerObjetos, salvarArquivoLoja, urlImagem, validarLogo } from "~/.server/imagens";
import { exigirUsuario } from "~/.server/sessao";
import { exigirMesmaOrigem } from "~/.server/seguranca";
import { ArquivoImagem, CampoTelefone } from "~/components/admin/campos";
import { Aviso, Cabecalho, classeTabela as t, Secao } from "~/components/admin/ui";
import { CampoTexto } from "~/components/Campo";
import { IconeWhatsApp } from "~/components/WhatsApp";
import { apenasDigitos, DDIS, linkWhatsApp, telefone } from "~/lib/formato";
import { metaAdmin } from "~/lib/site";
import { cn } from "~/lib/ui";
import type { Route } from "./+types/vendedores";

export function meta({ matches }: Route.MetaArgs) {
  return metaAdmin("Vendedores", matches);
}

export async function loader({ request }: Route.LoaderArgs) {
  await exigirUsuario(request);
  const { vendedores, anuncios } = schema;
  const [lista, carros] = await Promise.all([
    db.select().from(vendedores).orderBy(asc(vendedores.nome)),
    db.select({ vendedorId: anuncios.vendedorId, n: count() }).from(anuncios).where(eq(anuncios.status, "ativo")).groupBy(anuncios.vendedorId),
  ]);
  const editarId = new URL(request.url).searchParams.get("editar");
  return {
    vendedores: lista.map((v) => ({ ...v, foto: v.fotoChave ? urlImagem(v.fotoChave) : null, carros: carros.find((c) => c.vendedorId === v.id)?.n ?? 0 })),
    editar: editarId ? lista.find((v) => v.id === editarId) ?? null : null,
  };
}

type Erros = Partial<Record<"nome" | "whatsapp" | "email" | "foto", string>>;

export async function action({ request }: Route.ActionArgs) {
  exigirMesmaOrigem(request);
  await exigirUsuario(request);
  const form = await request.formData();
  const intencao = form.get("intencao");
  const id = String(form.get("id") ?? "");
  const [atual] = id ? await db.select().from(schema.vendedores).where(eq(schema.vendedores.id, id)).limit(1) : [];

  if (intencao === "excluir" && atual) {
    await db.delete(schema.vendedores).where(eq(schema.vendedores.id, id));
    await removerObjetos([atual.fotoChave]);
    return { ok: true };
  }
  if (intencao === "ativo" && atual) {
    await db.update(schema.vendedores).set({ ativo: form.get("valor") === "true" }).where(eq(schema.vendedores.id, id));
    return { ok: true };
  }

  const nome = String(form.get("nome") ?? "").trim();
  const whatsappDdi = String(form.get("whatsappDdi") ?? "55");
  const whatsapp = apenasDigitos(String(form.get("whatsapp") ?? ""));
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const erros: Erros = {};
  if (nome.length < 2 || nome.length > 80) erros.nome = "Informe o nome.";
  if (!DDIS.some((d) => d.ddi === whatsappDdi)) erros.whatsapp = "País inválido.";
  else if (whatsapp.length < 8 || whatsapp.length > 13) erros.whatsapp = "Informe o WhatsApp com DDD.";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) erros.email = "E-mail inválido.";

  const arquivo = form.get("foto");
  let foto: Awaited<ReturnType<typeof validarLogo>> | null = null;
  if (arquivo instanceof File && arquivo.size) {
    foto = await validarLogo(arquivo, { aceitaSvg: false });
    if (!foto.ok) erros.foto = foto.erro;
  }
  if (Object.keys(erros).length) return data({ erros }, { status: 400 });

  let fotoChave = atual?.fotoChave ?? "";
  const antiga = fotoChave;
  if (foto?.ok) {
    try {
      fotoChave = await salvarArquivoLoja("vendedor", foto.bytes, foto.tipo);
    } catch {
      return data({ erros: { foto: "Não foi possível guardar a foto. Tente de novo." } as Erros }, { status: 500 });
    }
  }
  else if (form.get("remover_foto") === "1") fotoChave = "";

  const valores = { nome, whatsappDdi, whatsapp, email, fotoChave };
  if (atual) await db.update(schema.vendedores).set(valores).where(eq(schema.vendedores.id, atual.id));
  else await db.insert(schema.vendedores).values({ id: crypto.randomUUID(), ...valores });
  if (antiga && antiga !== fotoChave) await removerObjetos([antiga]);
  throw redirect("/admin/vendedores?salvo=1");
}

export default function Vendedores({ loaderData, actionData }: Route.ComponentProps) {
  const { vendedores, editar } = loaderData;
  const erros: Erros = (actionData as { erros?: Erros } | undefined)?.erros ?? {};
  const [params] = useSearchParams();
  const enviando = useNavigation().state === "submitting";

  return (
    <div>
      <Cabecalho titulo="Vendedores" descricao="Quem atende os carros. Na página do veículo, o botão de WhatsApp vai para o vendedor escolhido no cadastro; sem vendedor, para a loja.">
        {editar && <Link to="/admin/vendedores" className="botao-primario h-10 px-4 text-sm"><Plus className="size-4" aria-hidden="true" /> Novo vendedor</Link>}
      </Cabecalho>
      {params.get("salvo") && <Aviso tipo="sucesso">Vendedor salvo.</Aviso>}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        {vendedores.length === 0 ? (
          <p className="rounded-xl border border-linha bg-white p-8 text-center text-suave">Nenhum vendedor cadastrado. Sem vendedor, os contatos vão para o WhatsApp da loja.</p>
        ) : (
          <div className={cn(t.caixa, "overflow-x-auto")}>
            <table className="w-full min-w-[640px]">
              <thead><tr>{["Vendedor", "WhatsApp", "Carros", "Ativo", ""].map((h, i) => <th key={i} className={t.th}>{h}</th>)}</tr></thead>
              <tbody>{vendedores.map((v) => <Linha key={v.id} v={v} />)}</tbody>
            </table>
          </div>
        )}

        <Secao titulo={editar ? `Editar ${editar.nome}` : "Novo vendedor"} className="xl:sticky xl:top-6">
          <Form key={editar?.id ?? "novo"} method="post" encType="multipart/form-data" noValidate className="grid gap-4">
            {editar && <input type="hidden" name="id" value={editar.id} />}
            <CampoTexto id="nome" rotulo="Nome" defaultValue={editar?.nome} erro={erros.nome} autoComplete="off" />
            <CampoTelefone id="whatsapp" rotulo="WhatsApp" ddi={editar?.whatsappDdi ?? "55"} numero={editar?.whatsapp ?? ""} erro={erros.whatsapp} />
            <CampoTexto id="email" rotulo="E-mail (opcional)" type="email" defaultValue={editar?.email} erro={erros.email} autoComplete="off" />
            <ArquivoImagem campo="foto" rotulo="Foto (opcional)" url={editar?.fotoChave ? urlDaFoto(vendedores, editar.id) : null}
              aceita="image/png,image/jpeg,image/webp" reduzirPara={400} erro={erros.foto} empilhado dica="Aparece ao lado do botão de WhatsApp." />
            <div className="flex justify-end gap-2">
              {editar && <Link to="/admin/vendedores" className="botao-fantasma h-10 px-4 text-sm">Cancelar</Link>}
              <button type="submit" disabled={enviando} className="botao-primario h-10 px-5 text-sm">{enviando ? "Salvando…" : editar ? "Salvar" : "Adicionar vendedor"}</button>
            </div>
          </Form>
        </Secao>
      </div>
    </div>
  );
}

const urlDaFoto = (lista: { id: string; foto: string | null }[], id: string) => lista.find((v) => v.id === id)?.foto ?? null;

function Linha({ v }: { v: Route.ComponentProps["loaderData"]["vendedores"][number] }) {
  const fetcher = useFetcher();
  if (fetcher.formData?.get("intencao") === "excluir") return null;
  const ativo = fetcher.formData?.get("intencao") === "ativo" ? fetcher.formData.get("valor") === "true" : v.ativo;

  return (
    <tr className={cn(!ativo && "opacity-60")}>
      <td className={t.td}>
        <div className="flex items-center gap-3">
          {v.foto ? <img src={v.foto} alt="" className="size-10 rounded-full object-cover" />
            : <span className="grid size-10 place-items-center rounded-full bg-marca-50 font-bold text-marca-700" aria-hidden="true">{v.nome.charAt(0)}</span>}
          <div className="min-w-0">
            <p className="font-semibold text-tinta">{v.nome}</p>
            {v.email && <p className="truncate text-xs text-suave">{v.email}</p>}
          </div>
        </div>
      </td>
      <td className={t.td}>
        <a href={linkWhatsApp(v.whatsapp, "Olá!", v.whatsappDdi)} target="_blank" rel="noopener noreferrer" className="numeros inline-flex items-center gap-1.5 whitespace-nowrap text-texto hover:underline">
          <IconeWhatsApp className="size-4 text-[#128c4a]" /> {telefone(v.whatsapp, v.whatsappDdi)}
        </a>
      </td>
      <td className={cn(t.td, "numeros text-suave")}>{v.carros}</td>
      <td className={t.td}>
        <fetcher.Form method="post">
          <input type="hidden" name="id" value={v.id} />
          <input type="hidden" name="valor" value={String(!ativo)} />
          <button name="intencao" value="ativo" role="switch" aria-checked={ativo} aria-label={`${v.nome} ${ativo ? "ativo" : "inativo"}`}
            className={cn("relative h-6 w-11 rounded-full transition-colors", ativo ? "bg-marca-600" : "bg-linha-forte")}>
            <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", ativo ? "left-[22px]" : "left-0.5")} />
          </button>
        </fetcher.Form>
      </td>
      <td className={t.td}>
        <div className="flex justify-end gap-0.5">
          <Link to={`/admin/vendedores?editar=${v.id}`} className="grid size-9 place-items-center rounded-lg hover:bg-fundo" aria-label={`Editar ${v.nome}`} title="Editar"><Pencil className="size-[18px]" /></Link>
          <fetcher.Form method="post" onSubmit={(e) => { if (!confirm(`Excluir ${v.nome}? Os carros atendidos por ele voltam a usar o WhatsApp da loja.`)) e.preventDefault(); }}>
            <input type="hidden" name="id" value={v.id} />
            <button name="intencao" value="excluir" className="grid size-9 place-items-center rounded-lg text-erro hover:bg-erro-fundo" aria-label={`Excluir ${v.nome}`} title="Excluir"><Trash2 className="size-[18px]" /></button>
          </fetcher.Form>
        </div>
      </td>
    </tr>
  );
}

export { ErroPainel as ErrorBoundary } from "~/components/admin/ErroPainel";
