import { eq } from "drizzle-orm";
import { isbot } from "isbot";
import { Calendar, Check, Cog, DoorOpen, Fuel, Gauge, MapPin, Palette, Pencil, Phone, TriangleAlert } from "lucide-react";
import { data, Link, useFetcher } from "react-router";
import { porSlug, registrarVisualizacao, similares } from "~/.server/anuncios";
import { db, schema } from "~/.server/db";
import { validarMensagem, type ErrosMensagem } from "~/.server/mensagens";
import { obterUsuario } from "~/.server/sessao";
import { dentroDoLimite, exigirMesmaOrigem, ipDe } from "~/.server/seguranca";
import { AnuncioCard } from "~/components/AnuncioCard";
import { CamposMensagem } from "~/components/CamposMensagem";
import { Galeria } from "~/components/Galeria";
import { IconeWhatsApp } from "~/components/WhatsApp";
import { anos, km, linkWhatsApp, moeda, telefone } from "~/lib/formato";
import { lojaDasRotas } from "~/lib/site";
import { useLoja } from "~/lib/useLoja";
import type { Route } from "./+types/anuncio";

export async function loader({ params, request }: Route.LoaderArgs) {
  const anuncio = await porSlug(params.slug);
  if (!anuncio) throw data("Veículo não encontrado", { status: 404 });

  // Pausado é rascunho interno: só a equipe vê. Vendido continua no ar
  // (links compartilhados não quebram), mas sai do índice.
  const equipe = Boolean(await obterUsuario(request));
  if (anuncio.status === "pausado" && !equipe) throw data("Veículo não encontrado", { status: 404 });

  // Robô de busca e a própria equipe não contam como visita.
  if (anuncio.status === "ativo" && !equipe && !isbot(request.headers.get("User-Agent"))) {
    await registrarVisualizacao(anuncio.id);
  }

  return { anuncio, equipe, similares: await similares(anuncio), origem: new URL(request.url).origin };
}

export function meta({ loaderData, matches }: Route.MetaArgs) {
  const loja = lojaDasRotas(matches);
  if (!loaderData) return [{ title: `Veículo não encontrado — ${loja.nome}` }];
  const { anuncio: a, origem } = loaderData;
  const titulo = `${a.marca} ${a.modelo} ${a.versao} ${a.anoModelo}`;
  const descricao = `${anos(a.anoFabricacao, a.anoModelo)} · ${km(a.km)} · ${a.cambio} · ${a.combustivel}. ${moeda(a.preco)} · ${loja.nome}${loja.cidade ? `, ${loja.cidade}` : ""}.`;
  const url = `${origem}/carro/${a.slug}`;
  const imagem = a.fotos[0] ? `${origem}${a.fotos[0].url}` : undefined;

  return [
    { title: `${titulo} — ${moeda(a.preco)} | ${loja.nome}` },
    { name: "description", content: descricao },
    { tagName: "link", rel: "canonical", href: url },
    ...(a.status !== "ativo" ? [{ name: "robots", content: "noindex" }] : []),
    { property: "og:type", content: "product" },
    { property: "og:title", content: `${a.marca} ${a.modelo} ${a.anoModelo} — ${moeda(a.preco)}` },
    { property: "og:description", content: descricao },
    { property: "og:url", content: url },
    ...(imagem ? [{ property: "og:image", content: imagem }] : []),
    { name: "twitter:card", content: imagem ? "summary_large_image" : "summary" },
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "Car",
        name: titulo,
        brand: { "@type": "Brand", name: a.marca },
        model: a.modelo,
        vehicleModelDate: String(a.anoModelo),
        productionDate: String(a.anoFabricacao),
        mileageFromOdometer: { "@type": "QuantitativeValue", value: a.km, unitCode: "KMT" },
        vehicleTransmission: a.cambio,
        fuelType: a.combustivel,
        color: a.cor,
        numberOfDoors: a.portas,
        bodyType: a.carroceria,
        image: a.fotos.map((f) => `${origem}${f.url}`),
        offers: {
          "@type": "Offer",
          price: a.preco,
          priceCurrency: "BRL",
          url,
          availability: a.status === "ativo" ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
          seller: { "@type": "AutoDealer", name: loja.nome },
        },
      },
    },
  ];
}

export async function action({ request, params }: Route.ActionArgs) {
  exigirMesmaOrigem(request);
  const form = await request.formData();

  const [anuncio] = await db.select({ id: schema.anuncios.id, status: schema.anuncios.status })
    .from(schema.anuncios).where(eq(schema.anuncios.slug, params.slug)).limit(1);
  if (!anuncio || anuncio.status === "pausado") throw data("Veículo não encontrado", { status: 404 });
  if (anuncio.status !== "ativo") return data({ erro: "Este carro já foi vendido." }, { status: 410 });

  // Campo invisível: gente não preenche, robô preenche. Finge sucesso.
  if (form.get("empresa")) return { enviada: true };

  const resultado = validarMensagem(form);
  if ("erros" in resultado) return data({ erros: resultado.erros }, { status: 400 });

  if (!(await dentroDoLimite(`mensagem:${ipDe(request)}`, 8, 3_600_000))) {
    return data({ erro: "Você enviou muitas mensagens em pouco tempo. Tente de novo mais tarde." }, { status: 429 });
  }

  await db.insert(schema.mensagens).values({ id: crypto.randomUUID(), anuncioId: anuncio.id, ...resultado.mensagem });
  return { enviada: true };
}

export default function Anuncio({ loaderData }: Route.ComponentProps) {
  const { anuncio: a, equipe, similares: parecidos } = loaderData;
  const loja = useLoja();
  const titulo = `${a.marca} ${a.modelo}`;
  const ativo = a.status === "ativo";

  const ficha = [
    { icone: Calendar, rotulo: "Ano", valor: anos(a.anoFabricacao, a.anoModelo) },
    { icone: Gauge, rotulo: "Quilometragem", valor: km(a.km) },
    { icone: Cog, rotulo: "Câmbio", valor: a.cambio },
    { icone: Fuel, rotulo: "Combustível", valor: a.combustivel },
    { icone: Palette, rotulo: "Cor", valor: a.cor },
    { icone: DoorOpen, rotulo: "Portas", valor: String(a.portas) },
  ];

  const textoWhats = `Olá! Tenho interesse no ${a.marca} ${a.modelo} ${a.versao} ${a.anoModelo} (${moeda(a.preco)}). Ainda está disponível?`;
  const endereco = [loja.endereco, loja.bairro, [loja.cidade, loja.uf].filter(Boolean).join(" - ")].filter(Boolean).join(", ");

  return (
    <div className="conteiner pt-6">
      <nav aria-label="Trilha" className="text-sm text-suave">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link to="/carros" className="hover:text-tinta hover:underline">Estoque</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link to={`/carros/${a.marcaSlug}`} className="hover:text-tinta hover:underline">{a.marca}</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link to={`/carros/${a.marcaSlug}/${a.modeloSlug}`} className="hover:text-tinta hover:underline">{a.modelo}</Link></li>
        </ol>
      </nav>

      {!ativo && (
        <div role="status" className="mt-4 flex items-start gap-3 rounded-xl border border-alerta/20 bg-alerta-fundo px-4 py-3 text-alerta">
          <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p className="text-sm font-medium">
            {a.status === "vendido" ? "Este carro já foi vendido. Veja opções parecidas abaixo." : "Veículo pausado: só a equipe está vendo esta página."}
          </p>
        </div>
      )}
      {equipe && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-linha bg-white px-4 py-3">
          <p className="numeros text-sm font-medium text-suave">Visível só para a equipe · {a.visualizacoes} visualizações</p>
          <Link to={`/admin/veiculos/${a.id}`} className="botao-secundario h-9 px-4 text-sm">
            <Pencil className="size-4" aria-hidden="true" /> Editar veículo
          </Link>
        </div>
      )}

      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          <Galeria fotos={a.fotos} titulo={`${titulo} ${a.versao}`} carroceria={a.carroceria} />

          <section aria-labelledby="titulo-ficha" className="cartao mt-6 p-5 sm:p-6">
            <h2 id="titulo-ficha" className="text-lg font-bold text-tinta">Ficha técnica</h2>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
              {ficha.map(({ icone: Icone, rotulo, valor }) => (
                <div key={rotulo} className="flex gap-3">
                  <Icone className="mt-0.5 size-5 shrink-0 text-fraco" aria-hidden="true" />
                  <div>
                    <dt className="text-sm text-suave">{rotulo}</dt>
                    <dd className="numeros font-semibold text-tinta">{valor}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </section>

          {a.opcionais.length > 0 && (
            <section aria-labelledby="titulo-opcionais" className="cartao mt-4 p-5 sm:p-6">
              <h2 id="titulo-opcionais" className="text-lg font-bold text-tinta">Itens e opcionais</h2>
              <ul className="mt-4 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
                {a.opcionais.map((o) => (
                  <li key={o} className="flex items-center gap-2 text-texto">
                    <Check className="size-4 shrink-0 text-sucesso" aria-hidden="true" /> {o}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {a.descricao && (
            <section aria-labelledby="titulo-descricao" className="cartao mt-4 p-5 sm:p-6">
              <h2 id="titulo-descricao" className="text-lg font-bold text-tinta">Sobre este carro</h2>
              <p className="mt-3 max-w-[70ch] whitespace-pre-line leading-relaxed text-texto">{a.descricao}</p>
            </section>
          )}
        </div>

        {/* Sem sticky: com o formulário a coluna passa da altura da tela e o fim ficaria inalcançável. */}
        <aside>
          <div className="cartao p-5 sm:p-6">
            {a.destaque && <span className="mb-2 inline-block rounded bg-marca-600 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">Destaque</span>}
            <h1 className="text-2xl font-extrabold uppercase leading-tight tracking-tight text-tinta">{titulo}</h1>
            <p className="mt-1 text-suave">{a.versao}</p>
            <p className="numeros mt-4 text-[34px] font-extrabold leading-none tracking-tight text-tinta">{moeda(a.preco)}</p>
            <ul className="numeros mt-4 flex flex-wrap gap-2 text-sm">
              <li className="rounded-md bg-fundo px-2.5 py-1 font-medium text-texto">{anos(a.anoFabricacao, a.anoModelo)}</li>
              <li className="rounded-md bg-fundo px-2.5 py-1 font-medium text-texto">{km(a.km)}</li>
              <li className="rounded-md bg-fundo px-2.5 py-1 font-medium text-texto">{a.cambio}</li>
            </ul>

            {ativo && (
              <div className="mt-6 grid gap-2 border-t border-linha pt-6">
                {loja.whatsapp && (
                  <a href={linkWhatsApp(loja.whatsapp, textoWhats)} target="_blank" rel="noopener noreferrer" className="botao-primario w-full">
                    <IconeWhatsApp className="size-[18px]" /> Tenho interesse
                  </a>
                )}
                {loja.telefone && (
                  <a href={`tel:+55${loja.telefone}`} className="botao-secundario numeros w-full">
                    <Phone className="size-[18px]" aria-hidden="true" /> {telefone(loja.telefone)}
                  </a>
                )}
              </div>
            )}
          </div>

          {ativo && <FormMensagem anuncio={a} />}

          <div className="cartao mt-4 p-5">
            <p className="font-bold text-tinta">{loja.nome}</p>
            {endereco && (
              <p className="mt-2 flex gap-2 text-sm text-suave">
                <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {endereco}
              </p>
            )}
            {loja.horario && <p className="mt-1 pl-6 text-sm text-suave">{loja.horario}</p>}
            <Link to="/contato" className="mt-3 inline-block py-1 pl-6 text-sm font-semibold text-marca-700 hover:underline">Como chegar</Link>
          </div>
        </aside>
      </div>

      {parecidos.length > 0 && (
        <section aria-labelledby="titulo-similares" className="mt-14">
          <h2 id="titulo-similares" className="text-2xl font-extrabold tracking-tight text-tinta">Você também pode gostar</h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {parecidos.map((p) => <li key={p.id}><AnuncioCard anuncio={p} /></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}

type RespostaMensagem = { erro?: string; enviada?: boolean; erros?: ErrosMensagem };

function FormMensagem({ anuncio: a }: { anuncio: { marca: string; modelo: string; anoModelo: number } }) {
  const mensagem = useFetcher<RespostaMensagem>();

  return (
    <section aria-labelledby="titulo-mensagem" className="cartao mt-4 p-5 sm:p-6">
      <h2 id="titulo-mensagem" className="font-bold text-tinta">Prefere que a gente te chame?</h2>
      {mensagem.data?.enviada ? (
        <div role="status" className="mt-3 rounded-xl bg-sucesso-fundo p-4 text-sucesso">
          <p className="font-semibold">Mensagem enviada.</p>
          <p className="mt-1 text-sm">A equipe da loja vai responder pelo telefone ou e-mail que você informou.</p>
        </div>
      ) : (
        <mensagem.Form method="post" noValidate className="mt-3">
          <CamposMensagem erros={mensagem.data?.erros} prefixo="msg" textoPadrao={`Olá! Tenho interesse no ${a.marca} ${a.modelo} ${a.anoModelo}. Ainda está disponível?`} />
          {mensagem.data?.erro && <p role="alert" className="mt-3 text-sm text-erro">{mensagem.data.erro}</p>}
          <button type="submit" disabled={mensagem.state !== "idle"} className="botao-secundario mt-3 w-full">
            {mensagem.state !== "idle" ? "Enviando…" : "Enviar mensagem"}
          </button>
        </mensagem.Form>
      )}
    </section>
  );
}
