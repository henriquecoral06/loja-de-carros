import { and, desc, eq } from "drizzle-orm";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { Link, useFetcher } from "react-router";
import { db, schema } from "~/.server/db";
import { exigirUsuario } from "~/.server/sessao";
import { exigirMesmaOrigem } from "~/.server/seguranca";
import { linkWhatsApp, telefone, tempoRelativo } from "~/lib/formato";
import { SITE } from "~/lib/site";
import { cn } from "~/lib/ui";
import type { Route } from "./+types/mensagens";

export const meta = () => [{ title: `Mensagens — ${SITE.nome}` }, { name: "robots", content: "noindex" }];

export async function loader({ request }: Route.LoaderArgs) {
  const usuario = await exigirUsuario(request);
  const { mensagens, anuncios, marcas, modelos } = schema;
  const lista = await db.select({
    id: mensagens.id, nome: mensagens.nome, email: mensagens.email, telefone: mensagens.telefone,
    texto: mensagens.texto, lida: mensagens.lida, criadoEm: mensagens.criadoEm,
    slug: anuncios.slug, marca: marcas.nome, modelo: modelos.nome, anoModelo: anuncios.anoModelo,
  }).from(mensagens)
    .innerJoin(anuncios, eq(anuncios.id, mensagens.anuncioId))
    .innerJoin(marcas, eq(marcas.id, anuncios.marcaId))
    .innerJoin(modelos, eq(modelos.id, anuncios.modeloId))
    .where(eq(mensagens.vendedorId, usuario.id))
    .orderBy(desc(mensagens.criadoEm)).limit(200);
  return { mensagens: lista };
}

export async function action({ request }: Route.ActionArgs) {
  exigirMesmaOrigem(request);
  const usuario = await exigirUsuario(request);
  const form = await request.formData();
  // A condição inclui o vendedor: não dá para marcar mensagem de outra pessoa.
  await db.update(schema.mensagens).set({ lida: form.get("lida") === "true" })
    .where(and(eq(schema.mensagens.id, String(form.get("id"))), eq(schema.mensagens.vendedorId, usuario.id)));
  return { ok: true };
}

export default function Mensagens({ loaderData }: Route.ComponentProps) {
  const { mensagens } = loaderData;

  if (!mensagens.length) {
    return (
      <div className="cartao px-6 py-14 text-center">
        <h2 className="text-lg font-bold text-tinta">Nenhuma mensagem ainda</h2>
        <p className="mx-auto mt-2 max-w-sm text-suave">Quando alguém se interessar por um anúncio seu, a mensagem aparece aqui.</p>
      </div>
    );
  }

  return <ul className="grid gap-3">{mensagens.map((m) => <Mensagem key={m.id} m={m} />)}</ul>;
}

function Mensagem({ m }: { m: Route.ComponentProps["loaderData"]["mensagens"][number] }) {
  const fetcher = useFetcher();
  const lida = fetcher.formData ? fetcher.formData.get("lida") === "true" : m.lida;
  const resposta = `Olá, ${m.nome.split(" ")[0]}! Aqui é sobre o ${m.marca} ${m.modelo} ${m.anoModelo} que você viu no site ${SITE.nome}.`;

  return (
    <li className={cn("cartao p-5", !lida && "border-marca-200 ring-1 ring-marca-200")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-bold text-tinta">
            {!lida && <span className="size-2 rounded-full bg-marca-600" aria-label="Não lida" />}
            {m.nome}
          </p>
          <p className="text-sm text-suave">
            sobre <Link to={`/carro/${m.slug}`} className="font-semibold text-marca-700 hover:underline">{m.marca} {m.modelo} {m.anoModelo}</Link> · {tempoRelativo(m.criadoEm)}
          </p>
        </div>
        <fetcher.Form method="post">
          <input type="hidden" name="id" value={m.id} />
          <input type="hidden" name="lida" value={String(!lida)} />
          <button className="-my-2 py-2.5 text-sm font-semibold text-suave underline hover:text-tinta">
            Marcar como {lida ? "não lida" : "lida"}
          </button>
        </fetcher.Form>
      </div>

      <p className="mt-3 whitespace-pre-line leading-relaxed text-texto">{m.texto}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <a href={linkWhatsApp(m.telefone, resposta)} target="_blank" rel="noopener noreferrer" className="botao h-9 bg-[#128c4a] px-3 text-sm text-white hover:bg-[#0f7a40]">
          <MessageCircle className="size-4" aria-hidden="true" /> Responder no WhatsApp
        </a>
        <a href={`tel:+55${m.telefone}`} className="botao-secundario numeros h-9 px-3 text-sm">
          <Phone className="size-4" aria-hidden="true" /> {telefone(m.telefone)}
        </a>
        <a href={`mailto:${m.email}?subject=${encodeURIComponent(`${m.marca} ${m.modelo} ${m.anoModelo}`)}`} className="botao-secundario h-9 px-3 text-sm">
          <Mail className="size-4" aria-hidden="true" /> {m.email}
        </a>
      </div>
    </li>
  );
}
