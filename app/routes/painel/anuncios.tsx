import { count, desc, eq, sql } from "drizzle-orm";
import { CircleCheck, Eye, Inbox, Pause, Pencil, Play, Trash2 } from "lucide-react";
import { Link, redirect, useFetcher, useSearchParams } from "react-router";
import { db, schema } from "~/.server/db";
import { removerObjetos, urlImagem } from "~/.server/imagens";
import { anuncioDoUsuario } from "~/.server/meus-anuncios";
import { exigirUsuario } from "~/.server/sessao";
import { exigirMesmaOrigem } from "~/.server/seguranca";
import { CarroPlaceholder } from "~/components/CarroPlaceholder";
import { anos, inteiro, km, moeda, tempoRelativo } from "~/lib/formato";
import { SITE } from "~/lib/site";
import { cn } from "~/lib/ui";
import type { Route } from "./+types/anuncios";

export const meta = () => [{ title: `Meus anúncios — ${SITE.nome}` }, { name: "robots", content: "noindex" }];

export async function loader({ request }: Route.LoaderArgs) {
  const usuario = await exigirUsuario(request);
  const { anuncios, marcas, modelos, fotos, mensagens } = schema;
  const lista = await db.select({
    id: anuncios.id, slug: anuncios.slug, versao: anuncios.versao, preco: anuncios.preco,
    anoFabricacao: anuncios.anoFabricacao, anoModelo: anuncios.anoModelo, km: anuncios.km,
    carroceria: anuncios.carroceria, status: anuncios.status, visualizacoes: anuncios.visualizacoes,
    criadoEm: anuncios.criadoEm, marca: marcas.nome, modelo: modelos.nome,
    capa: sql<string | null>`(select ${fotos.chave} from ${fotos} where ${fotos.anuncioId} = ${anuncios.id} order by ${fotos.ordem} limit 1)`,
    mensagens: sql<number>`(select count(*) from ${mensagens} where ${mensagens.anuncioId} = ${anuncios.id})`,
  }).from(anuncios)
    .innerJoin(marcas, eq(marcas.id, anuncios.marcaId))
    .innerJoin(modelos, eq(modelos.id, anuncios.modeloId))
    .where(eq(anuncios.usuarioId, usuario.id))
    .orderBy(desc(anuncios.criadoEm));

  return { anuncios: lista.map((a) => ({ ...a, capa: a.capa ? urlImagem(a.capa) : null })) };
}

export async function action({ request }: Route.ActionArgs) {
  exigirMesmaOrigem(request);
  const usuario = await exigirUsuario(request);
  const form = await request.formData();
  const anuncio = await anuncioDoUsuario(String(form.get("id")), usuario.id);
  const intencao = form.get("intencao");

  if (intencao === "excluir") {
    const chaves = await db.select({ chave: schema.fotos.chave }).from(schema.fotos).where(eq(schema.fotos.anuncioId, anuncio.id));
    // Apaga a linha primeiro: se o R2 falhar, sobra arquivo órfão no
    // bucket, mas nunca um anúncio apontando para foto que não existe.
    await db.delete(schema.anuncios).where(eq(schema.anuncios.id, anuncio.id));
    await removerObjetos(chaves.map((c) => c.chave));
    return { ok: true };
  }

  const novoStatus = intencao === "pausar" ? "pausado" : intencao === "reativar" ? "ativo" : intencao === "vendido" ? "vendido" : null;
  if (!novoStatus) throw redirect("/painel");
  await db.update(schema.anuncios).set({ status: novoStatus, atualizadoEm: Date.now() }).where(eq(schema.anuncios.id, anuncio.id));
  return { ok: true };
}

const ROTULO_STATUS = {
  ativo: { texto: "Ativo", classe: "bg-sucesso-fundo text-sucesso" },
  pausado: { texto: "Pausado", classe: "bg-alerta-fundo text-alerta" },
  vendido: { texto: "Vendido", classe: "bg-fundo text-suave" },
} as const;

export default function MeusAnuncios({ loaderData }: Route.ComponentProps) {
  const { anuncios } = loaderData;
  const [params] = useSearchParams();
  const salvo = params.get("salvo");

  return (
    <div>
      {salvo && (
        <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sucesso/20 bg-sucesso-fundo px-4 py-3 text-sucesso">
          <p className="font-semibold">Anúncio salvo e publicado.</p>
          <Link to={`/carro/${salvo}`} className="text-sm font-semibold underline">Ver como os compradores veem</Link>
        </div>
      )}

      {anuncios.length === 0 ? (
        <div className="cartao px-6 py-14 text-center">
          <h2 className="text-lg font-bold text-tinta">Você ainda não tem anúncios</h2>
          <p className="mx-auto mt-2 max-w-sm text-suave">Anunciar é grátis e leva poucos minutos.</p>
          <Link to="/painel/anuncios/novo" className="botao-primario mt-6">Criar meu primeiro anúncio</Link>
        </div>
      ) : (
        <ul className="grid gap-3">
          {anuncios.map((a) => <Linha key={a.id} anuncio={a} />)}
        </ul>
      )}
    </div>
  );
}

function Linha({ anuncio: a }: { anuncio: Route.ComponentProps["loaderData"]["anuncios"][number] }) {
  const fetcher = useFetcher();
  // Otimista: mostra o status novo enquanto o servidor confirma.
  const intencao = fetcher.formData?.get("intencao");
  const status = intencao === "pausar" ? "pausado" : intencao === "reativar" ? "ativo" : intencao === "vendido" ? "vendido" : a.status;
  const excluindo = intencao === "excluir";
  const rotulo = ROTULO_STATUS[status];

  if (excluindo) return null;

  return (
    <li className={cn("cartao flex flex-col gap-4 p-4 sm:flex-row sm:items-center", fetcher.state !== "idle" && "opacity-70")}>
      <Link to={`/carro/${a.slug}`} className="block shrink-0 overflow-hidden rounded-xl bg-fundo sm:w-44">
        {a.capa
          ? <img src={a.capa} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" />
          : <CarroPlaceholder carroceria={a.carroceria} className="aspect-[4/3] w-full" />}
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("rounded-md px-2 py-0.5 text-xs font-bold", rotulo.classe)}>{rotulo.texto}</span>
          <span className="text-xs text-suave">publicado {tempoRelativo(a.criadoEm)}</span>
        </div>
        <h2 className="mt-1.5 truncate font-bold uppercase text-tinta">{a.marca} {a.modelo}</h2>
        <p className="truncate text-sm text-suave">{a.versao} · {anos(a.anoFabricacao, a.anoModelo)} · {km(a.km)}</p>
        <p className="numeros mt-1 text-lg font-extrabold text-tinta">{moeda(a.preco)}</p>
        <p className="numeros mt-1 flex gap-4 text-sm text-suave">
          <span className="inline-flex items-center gap-1"><Eye className="size-4" aria-hidden="true" /> {inteiro(a.visualizacoes)} visitas</span>
          <span className="inline-flex items-center gap-1"><Inbox className="size-4" aria-hidden="true" /> {a.mensagens} mensagens</span>
        </p>
      </div>

      <fetcher.Form method="post" className="flex flex-wrap gap-2 sm:w-44 sm:flex-col"
        onSubmit={(e) => {
          const botao = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
          if (botao?.value === "excluir" && !confirm(`Excluir o anúncio ${a.marca} ${a.modelo}? As fotos e as mensagens também serão apagadas.`)) {
            e.preventDefault();
          }
        }}>
        <input type="hidden" name="id" value={a.id} />
        <Link to={`/painel/anuncios/${a.id}`} className="botao-secundario h-9 flex-1 px-3 text-sm">
          <Pencil className="size-4" aria-hidden="true" /> Editar
        </Link>
        {status === "ativo" && (
          <button name="intencao" value="pausar" className="botao-secundario h-9 flex-1 px-3 text-sm">
            <Pause className="size-4" aria-hidden="true" /> Pausar
          </button>
        )}
        {status !== "ativo" && (
          <button name="intencao" value="reativar" className="botao-secundario h-9 flex-1 px-3 text-sm">
            <Play className="size-4" aria-hidden="true" /> Reativar
          </button>
        )}
        {status !== "vendido" && (
          <button name="intencao" value="vendido" className="botao-secundario h-9 flex-1 px-3 text-sm">
            <CircleCheck className="size-4" aria-hidden="true" /> Vendido
          </button>
        )}
        <button name="intencao" value="excluir" className="botao-perigo h-9 flex-1 px-3 text-sm">
          <Trash2 className="size-4" aria-hidden="true" /> Excluir
        </button>
      </fetcher.Form>
    </li>
  );
}
