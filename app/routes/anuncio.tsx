import { eq } from "drizzle-orm";
import { isbot } from "isbot";
import { Calendar, Check, Cog, DoorOpen, Fuel, Gauge, MapPin, MessageCircle, Palette, Phone, Store, TriangleAlert, UserRound } from "lucide-react";
import { data, Link, useFetcher } from "react-router";
import { porSlug, registrarVisualizacao, similares } from "~/.server/anuncios";
import { db, schema } from "~/.server/db";
import { obterUsuario } from "~/.server/sessao";
import { dentroDoLimite, exigirMesmaOrigem, ipDe } from "~/.server/seguranca";
import { AnuncioCard } from "~/components/AnuncioCard";
import { Galeria } from "~/components/Galeria";
import { anos, apenasDigitos, km, linkWhatsApp, moeda, telefone, tempoRelativo } from "~/lib/formato";
import { SITE } from "~/lib/site";
import type { Route } from "./+types/anuncio";

export async function loader({ params, request }: Route.LoaderArgs) {
  const anuncio = await porSlug(params.slug);
  if (!anuncio) throw data("Anúncio não encontrado", { status: 404 });

  const usuario = await obterUsuario(request);
  const dono = usuario?.id === anuncio.usuarioId;

  // Robô de busca e o próprio anunciante não contam como visita.
  if (anuncio.status === "ativo" && !dono && !isbot(request.headers.get("User-Agent"))) {
    await registrarVisualizacao(anuncio.id);
  }

  const { usuarioId, ...publico } = anuncio;
  return {
    anuncio: publico,
    dono,
    similares: await similares(anuncio),
    origem: new URL(request.url).origin,
  };
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: `Anúncio não encontrado — ${SITE.nome}` }];
  const { anuncio: a, origem } = loaderData;
  const titulo = `${a.marca} ${a.modelo} ${a.versao} ${a.anoModelo}`;
  const descricao = `${anos(a.anoFabricacao, a.anoModelo)} · ${km(a.km)} · ${a.cambio} · ${a.combustivel} · ${a.cidade}-${a.uf}. ${moeda(a.preco)}.`;
  const url = `${origem}/carro/${a.slug}`;
  const imagem = a.fotos[0] ? `${origem}${a.fotos[0].url}` : undefined;

  return [
    { title: `${titulo} — ${moeda(a.preco)} | ${SITE.nome}` },
    { name: "description", content: descricao },
    { tagName: "link", rel: "canonical", href: url },
    // Vendido ou pausado continua acessível pelo link, mas sai do índice.
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
        },
      },
    },
  ];
}

type Erros = Partial<Record<"nome" | "email" | "telefone" | "texto", string>>;

export async function action({ request, params }: Route.ActionArgs) {
  exigirMesmaOrigem(request);
  const form = await request.formData();
  const intencao = form.get("intencao");
  const ip = ipDe(request);

  const [anuncio] = await db.select({ id: schema.anuncios.id, usuarioId: schema.anuncios.usuarioId, status: schema.anuncios.status })
    .from(schema.anuncios).where(eq(schema.anuncios.slug, params.slug)).limit(1);
  if (!anuncio) throw data("Anúncio não encontrado", { status: 404 });
  if (anuncio.status !== "ativo") return data({ erro: "Este anúncio não está mais disponível." }, { status: 410 });

  if (intencao === "contato") {
    // O telefone não vai no HTML da página: exige um clique e tem limite
    // por IP, o que tira o anunciante das listas de robô de spam.
    if (!(await dentroDoLimite(`contato:${ip}`, 30, 3_600_000))) {
      return data({ erro: "Muitas consultas seguidas. Tente de novo mais tarde." }, { status: 429 });
    }
    const [vendedor] = await db.select({ whatsapp: schema.usuarios.whatsapp }).from(schema.usuarios)
      .where(eq(schema.usuarios.id, anuncio.usuarioId)).limit(1);
    return { whatsapp: vendedor?.whatsapp ?? null };
  }

  if (intencao === "mensagem") {
    // Campo invisível: gente não preenche, robô preenche. Finge sucesso.
    if (form.get("empresa")) return { enviada: true };

    const nome = String(form.get("nome") ?? "").trim();
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const tel = apenasDigitos(String(form.get("telefone") ?? ""));
    const texto = String(form.get("texto") ?? "").trim();

    const erros: Erros = {};
    if (nome.length < 2) erros.nome = "Informe seu nome.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) erros.email = "Informe um e-mail válido.";
    if (tel.length < 10 || tel.length > 11) erros.telefone = "Informe o telefone com DDD.";
    if (texto.length < 5) erros.texto = "Escreva uma mensagem.";
    if (texto.length > 2000) erros.texto = "A mensagem pode ter até 2.000 caracteres.";
    if (Object.keys(erros).length) return data({ erros }, { status: 400 });

    if (!(await dentroDoLimite(`mensagem:${ip}`, 8, 3_600_000))) {
      return data({ erro: "Você enviou muitas mensagens em pouco tempo. Tente de novo mais tarde." }, { status: 429 });
    }

    await db.insert(schema.mensagens).values({
      id: crypto.randomUUID(), anuncioId: anuncio.id, vendedorId: anuncio.usuarioId,
      nome: nome.slice(0, 100), email: email.slice(0, 200), telefone: tel, texto,
    });
    return { enviada: true };
  }

  throw data("Ação inválida", { status: 400 });
}

export default function Anuncio({ loaderData }: Route.ComponentProps) {
  const { anuncio: a, dono, similares: parecidos } = loaderData;
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

  return (
    <div className="conteiner pt-6">
      <nav aria-label="Trilha" className="text-sm text-suave">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link to="/carros" className="hover:text-tinta hover:underline">Carros</Link></li>
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
            {a.status === "vendido" ? "Este carro já foi vendido." : "Este anúncio está pausado pelo anunciante."} Veja opções parecidas abaixo.
          </p>
        </div>
      )}
      {dono && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-marca-200 bg-marca-50 px-4 py-3">
          <p className="text-sm font-medium text-marca-800">Este anúncio é seu · {a.visualizacoes} visualizações</p>
          <Link to={`/painel/anuncios/${a.id}`} className="botao-primario h-9 px-4 text-sm">Editar anúncio</Link>
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

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="cartao p-5 sm:p-6">
            <h1 className="text-2xl font-extrabold uppercase leading-tight tracking-tight text-tinta">{titulo}</h1>
            <p className="mt-1 text-suave">{a.versao}</p>
            <p className="numeros mt-4 text-[34px] font-extrabold leading-none tracking-tight text-tinta">{moeda(a.preco)}</p>
            <ul className="numeros mt-4 flex flex-wrap gap-2 text-sm">
              <li className="rounded-md bg-fundo px-2.5 py-1 font-medium text-texto">{anos(a.anoFabricacao, a.anoModelo)}</li>
              <li className="rounded-md bg-fundo px-2.5 py-1 font-medium text-texto">{km(a.km)}</li>
              <li className="rounded-md bg-fundo px-2.5 py-1 font-medium text-texto">{a.cambio}</li>
            </ul>
            <p className="mt-4 flex items-center gap-1.5 text-sm text-suave">
              <MapPin className="size-4" aria-hidden="true" /> {a.cidade} - {a.uf}
              <span aria-hidden="true">·</span> publicado {tempoRelativo(a.criadoEm)}
            </p>

            {ativo && !dono && <Contato anuncio={a} />}
          </div>

          <div className="cartao mt-4 flex items-center gap-3 p-5">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-marca-50 text-marca-700">
              {a.tipoVendedor === "loja" ? <Store className="size-5" aria-hidden="true" /> : <UserRound className="size-5" aria-hidden="true" />}
            </span>
            <div className="min-w-0">
              <p className="truncate font-bold text-tinta">
                {a.tipoVendedor === "loja" ? a.nomeLoja : a.vendedorNome.split(" ")[0]}
              </p>
              <p className="text-sm text-suave">
                {a.tipoVendedor === "loja" ? "Loja" : "Particular"} · {a.vendedorCidade}-{a.vendedorUf}
              </p>
              <p className="text-sm text-suave">Anuncia desde {new Date(a.vendedorDesde).getFullYear()}</p>
            </div>
          </div>
        </aside>
      </div>

      {parecidos.length > 0 && (
        <section aria-labelledby="titulo-similares" className="mt-14">
          <h2 id="titulo-similares" className="text-2xl font-extrabold tracking-tight text-tinta">Carros parecidos</h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {parecidos.map((p) => <li key={p.id}><AnuncioCard anuncio={p} /></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}

type AcaoContato = { whatsapp?: string | null; erro?: string; enviada?: boolean; erros?: Erros };

function Contato({ anuncio: a }: { anuncio: { slug: string; marca: string; modelo: string; anoModelo: number } }) {
  const contato = useFetcher<AcaoContato>();
  const mensagem = useFetcher<AcaoContato>();
  const numero = contato.data?.whatsapp;
  const textoPadrao = `Olá! Tenho interesse no ${a.marca} ${a.modelo} ${a.anoModelo} que vi no site ${SITE.nome}. Ainda está disponível?`;
  const erros = mensagem.data?.erros ?? {};

  return (
    <div className="mt-6 border-t border-linha pt-6">
      {numero ? (
        <div className="grid gap-2">
          <a href={linkWhatsApp(numero, textoPadrao)} target="_blank" rel="noopener noreferrer"
            className="botao w-full bg-[#128c4a] text-white hover:bg-[#0f7a40]">
            <MessageCircle className="size-[18px]" aria-hidden="true" /> Conversar no WhatsApp
          </a>
          <a href={`tel:+55${numero}`} className="botao-secundario numeros w-full">
            <Phone className="size-[18px]" aria-hidden="true" /> {telefone(numero)}
          </a>
        </div>
      ) : (
        <contato.Form method="post">
          <input type="hidden" name="intencao" value="contato" />
          <button type="submit" disabled={contato.state !== "idle"} className="botao-primario w-full">
            <Phone className="size-[18px]" aria-hidden="true" />
            {contato.state !== "idle" ? "Carregando…" : "Ver telefone e WhatsApp"}
          </button>
          {contato.data?.erro && <p role="alert" className="mt-2 text-sm text-erro">{contato.data.erro}</p>}
        </contato.Form>
      )}

      <h2 className="mt-6 font-bold text-tinta">Enviar mensagem</h2>
      {mensagem.data?.enviada ? (
        <div role="status" className="mt-3 rounded-xl bg-sucesso-fundo p-4 text-sucesso">
          <p className="font-semibold">Mensagem enviada.</p>
          <p className="mt-1 text-sm">O anunciante vai responder pelo e-mail ou telefone que você informou.</p>
        </div>
      ) : (
        <mensagem.Form method="post" noValidate className="mt-3 grid gap-3">
          <input type="hidden" name="intencao" value="mensagem" />
          <div aria-hidden="true" className="absolute -left-[9999px] h-0 overflow-hidden">
            <label htmlFor="empresa">Empresa</label>
            <input id="empresa" name="empresa" tabIndex={-1} autoComplete="off" />
          </div>
          {([
            ["nome", "Nome", "text", "name"],
            ["email", "E-mail", "email", "email"],
            ["telefone", "Telefone com DDD", "tel", "tel"],
          ] as const).map(([nome, rotulo, tipo, auto]) => (
            <div key={nome}>
              <label htmlFor={`msg-${nome}`} className="sr-only">{rotulo}</label>
              <input id={`msg-${nome}`} name={nome} type={tipo} autoComplete={auto} placeholder={rotulo}
                className="campo" aria-invalid={erros[nome] ? true : undefined}
                aria-describedby={erros[nome] ? `erro-msg-${nome}` : undefined} />
              {erros[nome] && <p id={`erro-msg-${nome}`} className="mt-1 text-sm text-erro">{erros[nome]}</p>}
            </div>
          ))}
          <div>
            <label htmlFor="msg-texto" className="sr-only">Mensagem</label>
            <textarea id="msg-texto" name="texto" rows={4} defaultValue={textoPadrao} className="campo"
              aria-invalid={erros.texto ? true : undefined} aria-describedby={erros.texto ? "erro-msg-texto" : undefined} />
            {erros.texto && <p id="erro-msg-texto" className="mt-1 text-sm text-erro">{erros.texto}</p>}
          </div>
          {mensagem.data?.erro && <p role="alert" className="text-sm text-erro">{mensagem.data.erro}</p>}
          <button type="submit" disabled={mensagem.state !== "idle"} className="botao-secundario w-full">
            {mensagem.state !== "idle" ? "Enviando…" : "Enviar mensagem"}
          </button>
          <p className="text-xs leading-relaxed text-suave">
            Ao enviar, você concorda com os <Link to="/termos" className="underline">termos</Link> e a{" "}
            <Link to="/privacidade" className="underline">política de privacidade</Link>.
          </p>
        </mensagem.Form>
      )}
    </div>
  );
}
