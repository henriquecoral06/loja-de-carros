import { desc, eq } from "drizzle-orm";
import { Mail, Phone } from "lucide-react";
import { Link, useFetcher, useSearchParams } from "react-router";
import { db, schema } from "~/.server/db";
import { exigirUsuario } from "~/.server/sessao";
import { exigirMesmaOrigem } from "~/.server/seguranca";
import { IconeWhatsApp } from "~/components/WhatsApp";
import { linkWhatsApp, telefone, tempoRelativo } from "~/lib/formato";
import { metaAdmin } from "~/lib/site";
import { cn } from "~/lib/ui";
import type { Route } from "./+types/mensagens";

export function meta({ matches }: Route.MetaArgs) {
  return metaAdmin("Mensagens", matches);
}

export async function loader({ request }: Route.LoaderArgs) {
  await exigirUsuario(request);
  const soNaoLidas = new URL(request.url).searchParams.get("filtro") === "nao-lidas";
  const { mensagens, anuncios, marcas, modelos } = schema;
  // leftJoin: mensagem da página de contato não tem veículo, e a de um
  // veículo excluído perde o vínculo mas continua aqui.
  const lista = await db.select({
    id: mensagens.id, nome: mensagens.nome, email: mensagens.email, telefone: mensagens.telefone,
    texto: mensagens.texto, rastreio: mensagens.rastreio, lida: mensagens.lida, criadoEm: mensagens.criadoEm,
    slug: anuncios.slug, marca: marcas.nome, modelo: modelos.nome, anoModelo: anuncios.anoModelo,
  }).from(mensagens)
    .leftJoin(anuncios, eq(anuncios.id, mensagens.anuncioId))
    .leftJoin(marcas, eq(marcas.id, anuncios.marcaId))
    .leftJoin(modelos, eq(modelos.id, anuncios.modeloId))
    .where(soNaoLidas ? eq(mensagens.lida, false) : undefined)
    .orderBy(desc(mensagens.criadoEm)).limit(300);
  return { mensagens: lista, soNaoLidas };
}

export async function action({ request }: Route.ActionArgs) {
  exigirMesmaOrigem(request);
  await exigirUsuario(request);
  const form = await request.formData();
  const id = String(form.get("id"));
  if (form.get("intencao") === "excluir") {
    await db.delete(schema.mensagens).where(eq(schema.mensagens.id, id));
  } else {
    await db.update(schema.mensagens).set({ lida: form.get("lida") === "true" }).where(eq(schema.mensagens.id, id));
  }
  return { ok: true };
}

/** "Google Ads · campanha hilux-bh" a partir dos utm/gclid gravados com a mensagem. */
function lerOrigem(json: string) {
  try {
    const r = JSON.parse(json) as Record<string, string>;
    const canal = r.gclid || r.gbraid || r.wbraid ? "Google Ads" : r.fbclid ? "Meta Ads" : r.utm_source ? [r.utm_source, r.utm_medium].filter(Boolean).join(" / ") : "";
    return [canal, r.utm_campaign && `campanha ${r.utm_campaign}`].filter(Boolean).join(" · ");
  } catch {
    return "";
  }
}

export default function Mensagens({ loaderData }: Route.ComponentProps) {
  const { mensagens, soNaoLidas } = loaderData;
  const [params] = useSearchParams();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-tinta">Mensagens</h1>
        <nav aria-label="Filtro" className="flex gap-2">
          {[["Todas", ""], ["Não lidas", "nao-lidas"]].map(([rotulo, valor]) => {
            const ativo = (params.get("filtro") ?? "") === valor;
            return (
              <Link key={valor} to={valor ? `?filtro=${valor}` : "/admin/mensagens"} aria-current={ativo ? "page" : undefined}
                className={cn("rounded-full px-3.5 py-2 text-sm font-semibold", ativo ? "bg-tinta text-white" : "bg-white text-suave hover:text-tinta")}>
                {rotulo}
              </Link>
            );
          })}
        </nav>
      </div>

      {!mensagens.length ? (
        <div className="cartao mt-4 px-6 py-14 text-center">
          <h2 className="text-lg font-bold text-tinta">{soNaoLidas ? "Tudo lido" : "Nenhuma mensagem ainda"}</h2>
          <p className="mx-auto mt-2 max-w-sm text-suave">As mensagens enviadas pelo site — na página de um carro ou em Contato — aparecem aqui.</p>
        </div>
      ) : (
        <ul className="mt-4 grid gap-3">{mensagens.map((m) => <Mensagem key={m.id} m={m} />)}</ul>
      )}
    </div>
  );
}

function Mensagem({ m }: { m: Route.ComponentProps["loaderData"]["mensagens"][number] }) {
  const fetcher = useFetcher();
  if (fetcher.formData?.get("intencao") === "excluir") return null;
  const lida = fetcher.formData?.has("lida") ? fetcher.formData.get("lida") === "true" : m.lida;
  const veiculo = m.marca ? `${m.marca} ${m.modelo} ${m.anoModelo}` : null;
  const origem = lerOrigem(m.rastreio);
  const resposta = `Olá, ${m.nome.split(" ")[0]}! ${veiculo ? `Sobre o ${veiculo} que você viu no nosso site: ` : "Recebemos sua mensagem pelo site. "}`;

  return (
    <li className={cn("cartao p-5", !lida && "border-marca-200 ring-1 ring-marca-200")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-bold text-tinta">
            {!lida && <span className="size-2 rounded-full bg-marca-600" aria-hidden="true" />}
            {!lida && <span className="sr-only">Não lida:</span>}
            {m.nome}
          </p>
          <p className="text-sm text-suave">
            {veiculo && m.slug
              ? <>sobre <Link to={`/carro/${m.slug}`} className="font-semibold text-marca-700 hover:underline">{veiculo}</Link></>
              : "pela página de contato"} · {tempoRelativo(m.criadoEm)}
          </p>
        </div>
        <fetcher.Form method="post" className="flex gap-3"
          onSubmit={(e) => {
            const botao = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
            if (botao?.value === "excluir" && !confirm(`Excluir a mensagem de ${m.nome}?`)) e.preventDefault();
          }}>
          <input type="hidden" name="id" value={m.id} />
          <button name="lida" value={String(!lida)} className="-my-2 py-2.5 text-sm font-semibold text-suave underline hover:text-tinta">
            Marcar como {lida ? "não lida" : "lida"}
          </button>
          <button name="intencao" value="excluir" className="-my-2 py-2.5 text-sm font-semibold text-erro underline">Excluir</button>
        </fetcher.Form>
      </div>

      <p className="mt-3 whitespace-pre-line leading-relaxed text-texto">{m.texto}</p>
      {origem && <p className="mt-2 text-xs text-suave">Origem: <span className="font-medium text-texto">{origem}</span></p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <a href={linkWhatsApp(m.telefone, resposta)} target="_blank" rel="noopener noreferrer" className="botao h-9 bg-[#128c4a] px-3 text-sm text-white hover:bg-[#0f7a40]">
          <IconeWhatsApp className="size-4" /> Responder no WhatsApp
        </a>
        <a href={`tel:+55${m.telefone}`} className="botao-secundario numeros h-9 px-3 text-sm">
          <Phone className="size-4" aria-hidden="true" /> {telefone(m.telefone)}
        </a>
        <a href={`mailto:${m.email}${veiculo ? `?subject=${encodeURIComponent(veiculo)}` : ""}`} className="botao-secundario h-9 max-w-full px-3 text-sm">
          <Mail className="size-4 shrink-0" aria-hidden="true" /> <span className="truncate">{m.email}</span>
        </a>
      </div>
    </li>
  );
}
