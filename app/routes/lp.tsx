import { eq, sql } from "drizzle-orm";
import { isbot } from "isbot";
import { Calendar, Check, Cog, Fuel, Gauge, MapPin } from "lucide-react";
import { useEffect } from "react";
import { data, Link, useFetcher } from "react-router";
import { porSlug } from "~/.server/anuncios";
import { db, schema } from "~/.server/db";
import { criarLead, validarLead, type ErrosLead } from "~/.server/leads";
import { obterUsuario } from "~/.server/sessao";
import { dentroDoLimite, exigirMesmaOrigem, ipDe } from "~/.server/seguranca";
import { CamposMensagem } from "~/components/CamposMensagem";
import { Galeria } from "~/components/Galeria";
import { Rastreamento } from "~/components/Rastreamento";
import { IconeWhatsApp, LinkWhatsApp } from "~/components/WhatsApp";
import { anos, km, moeda } from "~/lib/formato";
import { rastrear } from "~/lib/rastreamento";
import { lojaDasRotas } from "~/lib/site";
import { cn } from "~/lib/ui";
import { useLoja } from "~/lib/useLoja";
import type { Route } from "./+types/lp";

async function carregar(slug: string) {
  const [lp] = await db.select().from(schema.landingPages).where(eq(schema.landingPages.slug, slug)).limit(1);
  if (!lp) return null;
  const veiculo = await porSlug((await db.select({ slug: schema.anuncios.slug }).from(schema.anuncios).where(eq(schema.anuncios.id, lp.anuncioId)).limit(1))[0]?.slug ?? "");
  return veiculo ? { lp, veiculo } : null;
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const achado = await carregar(params.slug);
  if (!achado) throw data("Página não encontrada", { status: 404 });
  const equipe = Boolean(await obterUsuario(request));
  if (achado.lp.status === "pausada" && !equipe) throw data("Página não encontrada", { status: 404 });

  if (!equipe && !isbot(request.headers.get("User-Agent"))) {
    await db.update(schema.landingPages).set({ visitas: sql`${schema.landingPages.visitas} + 1` }).where(eq(schema.landingPages.id, achado.lp.id));
  }
  const { lp, veiculo } = achado;
  return {
    lp: { ...lp, destaques: JSON.parse(lp.destaques) as string[] },
    veiculo,
    equipe,
    origem: new URL(request.url).origin,
  };
}

export function meta({ loaderData, matches }: Route.MetaArgs) {
  const loja = lojaDasRotas(matches);
  if (!loaderData) return [{ title: `Página não encontrada — ${loja.nome}` }];
  const { lp, veiculo, origem } = loaderData;
  const imagem = veiculo.fotos[0]?.url;
  return [
    { title: `${lp.headline} — ${loja.nome}` },
    { name: "description", content: lp.subtitulo || `${veiculo.marca} ${veiculo.modelo} ${veiculo.anoModelo}` },
    // Página de campanha: fica fora do Google para não competir com a página do carro.
    { name: "robots", content: "noindex" },
    { property: "og:title", content: lp.headline },
    { property: "og:description", content: lp.subtitulo },
    ...(imagem ? [{ property: "og:image", content: imagem.startsWith("http") ? imagem : `${origem}${imagem}` }] : []),
  ];
}

export async function action({ request, params }: Route.ActionArgs) {
  exigirMesmaOrigem(request);
  const achado = await carregar(params.slug);
  if (!achado || achado.lp.status !== "ativa") throw data("Página não encontrada", { status: 404 });
  const form = await request.formData();
  if (form.get("empresa")) return { enviada: true };

  const resultado = validarLead(form, { textoObrigatorio: false });
  if ("erros" in resultado) return data({ erros: resultado.erros }, { status: 400 });
  if (!(await dentroDoLimite(`mensagem:${ipDe(request)}`, 8, 3_600_000))) {
    return data({ erro: "Você enviou muitas mensagens em pouco tempo. Tente de novo mais tarde." }, { status: 429 });
  }
  const { lp, veiculo } = achado;
  await criarLead({
    request, origem: "landing_page", anuncioId: veiculo.id, landingPageId: lp.id,
    dados: { ...resultado.dados, texto: resultado.dados.texto || `Interesse pela landing page "${lp.titulo}".` },
    rastreio: resultado.rastreio, eventId: resultado.eventId,
  });
  return { enviada: true, eventId: resultado.eventId };
}

type Resposta = { enviada?: boolean; eventId?: string; erro?: string; erros?: ErrosLead };

export default function LandingPage({ loaderData }: Route.ComponentProps) {
  const { lp, veiculo: v, equipe } = loaderData;
  const loja = useLoja();
  const envio = useFetcher<Resposta>();
  const enviada = Boolean(envio.data?.enviada);
  const nome = `${v.marca} ${v.modelo} ${v.versao} ${v.anoModelo}`;
  const evento = { id: v.id, nome, valor: v.preco };
  const disponivel = v.status === "ativo";
  const escuro = lp.estilo !== "classico";

  useEffect(() => { if (disponivel) rastrear("veiculo", evento); }, [v.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (enviada) rastrear("formulario", { ...evento, origem: "landing_page", eventId: envio.data?.eventId }); }, [enviada]); // eslint-disable-line react-hooks/exhaustive-deps

  const specs = [
    { icone: Calendar, texto: anos(v.anoFabricacao, v.anoModelo) },
    { icone: Gauge, texto: km(v.km) },
    { icone: Cog, texto: v.cambio },
    { icone: Fuel, texto: v.combustivel },
  ];
  const logo = escuro ? loja.logoClaro ?? loja.logo : loja.logo;
  const capa = v.fotos[0]?.url;

  const formulario = (
    <div className={cn("rounded-2xl bg-white p-6 text-texto shadow-flutuante sm:p-7", lp.estilo === "impacto" && "lg:mt-0")}>
      {disponivel ? (
        <>
          {lp.mostrarPreco && (
            <p className="numeros text-[34px] font-extrabold leading-none tracking-tight text-tinta">{moeda(v.preco)}</p>
          )}
          <h2 className={cn("font-bold text-tinta", lp.mostrarPreco ? "mt-3 text-base" : "text-xl")}>Fale com um consultor</h2>
          <p className="mt-1 text-sm text-suave">Deixe seu contato e retornamos em minutos no horário comercial.</p>
          {enviada ? (
            <div role="status" className="mt-5 rounded-xl bg-sucesso-fundo p-5 text-sucesso">
              <p className="font-semibold">Recebemos seu contato!</p>
              <p className="mt-1 text-sm">Em breve um consultor fala com você.</p>
            </div>
          ) : (
            <envio.Form method="post" noValidate className="mt-5">
              <CamposMensagem erros={envio.data?.erros} prefixo="lp" mostrarTexto={false} />
              {envio.data?.erro && <p role="alert" className="mt-3 text-sm text-erro">{envio.data.erro}</p>}
              <button type="submit" disabled={envio.state !== "idle"} className="botao-primario mt-4 h-12 w-full text-base">
                {envio.state !== "idle" ? "Enviando…" : lp.textoBotao}
              </button>
            </envio.Form>
          )}
          <LinkWhatsApp mensagem={`Olá! Vi a oferta do ${nome} e quero saber mais.`} numero={v.vendedor} veiculo={evento}
            className="botao mt-3 h-12 w-full border border-[#128c4a] text-[#0f7a40] hover:bg-[#128c4a]/5">
            <IconeWhatsApp className="size-5" /> Chamar no WhatsApp
          </LinkWhatsApp>
        </>
      ) : (
        <div>
          <h2 className="text-xl font-bold text-tinta">Este carro já foi vendido</h2>
          <p className="mt-2 text-suave">Temos outras opções parecidas no estoque.</p>
          <Link to="/carros" className="botao-primario mt-5 w-full">Ver o estoque</Link>
        </div>
      )}
    </div>
  );

  return (
    <div className={cn("flex min-h-dvh flex-col", escuro ? "bg-noite text-white" : "bg-fundo text-texto")}>
      {equipe && (
        <div className="bg-alerta-fundo px-4 py-2 text-center text-sm text-alerta">
          Visível para a equipe{lp.status === "pausada" ? " · landing page pausada" : ""} · {lp.visitas} visitas ·{" "}
          <Link to={`/admin/landing-pages/${lp.id}`} className="font-semibold underline">Editar</Link>
        </div>
      )}
      <header className={cn(lp.estilo === "impacto" ? "absolute inset-x-0 top-0 z-20" : escuro ? "border-b border-white/10" : "border-b border-linha bg-white", equipe && lp.estilo === "impacto" && "top-9")}>
        <div className="conteiner flex h-16 items-center justify-between gap-4">
          {logo
            ? <img src={logo} alt={loja.nome} className={cn("h-9 max-w-[180px] object-contain", escuro && !loja.logoClaro && "rounded-md bg-white px-2 py-1")} />
            : <span className={cn("text-lg font-extrabold", escuro ? "text-white" : "text-tinta")}>{loja.nome}</span>}
          <LinkWhatsApp mensagem={`Olá! Vi a oferta do ${nome}.`} numero={v.vendedor} veiculo={evento} className="botao-primario h-10 px-4 text-sm">
            <IconeWhatsApp className="size-4" /> <span className="hidden sm:inline">WhatsApp</span>
          </LinkWhatsApp>
        </div>
      </header>

      <main className="flex-1">
        {lp.estilo === "impacto" ? (
          <section className="relative isolate overflow-hidden">
            {capa && <img src={capa} alt="" className="absolute inset-0 -z-10 size-full object-cover" />}
            <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-noite via-noite/85 to-noite/40" />
            <div className="conteiner grid items-center gap-8 pb-14 pt-28 lg:grid-cols-[minmax(0,1fr)_400px] lg:pb-20 lg:pt-32">
              <Cabecalho lp={lp} specs={specs} escuro />
              {formulario}
            </div>
          </section>
        ) : (
          <div className="conteiner grid items-start gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:py-12">
            <div className="min-w-0">
              <Cabecalho lp={lp} specs={specs} escuro={escuro} />
              <div className="mt-6"><Galeria fotos={v.fotos} titulo={nome} carroceria={v.carroceria} /></div>
            </div>
            <div className="lg:sticky lg:top-6">{formulario}</div>
          </div>
        )}

        {lp.estilo === "impacto" && v.fotos.length > 1 && (
          <section className="conteiner py-10">
            <Galeria fotos={v.fotos} titulo={nome} carroceria={v.carroceria} />
          </section>
        )}

        {v.opcionais.length > 0 && (
          <section className="conteiner pb-12">
            <h2 className={cn("text-xl font-bold", escuro ? "text-white" : "text-tinta")}>Itens do carro</h2>
            <ul className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
              {v.opcionais.map((o) => (
                <li key={o} className={cn("flex items-center gap-2", escuro ? "text-white/80" : "text-texto")}>
                  <Check className="size-4 shrink-0 text-marca-500" aria-hidden="true" /> {o}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <footer className={cn("border-t py-6 text-sm", escuro ? "border-white/10 text-white/60" : "border-linha bg-white text-suave")}>
        <div className="conteiner flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-1.5">
            <MapPin className="size-4" aria-hidden="true" />
            {loja.nome}{loja.cidade && ` · ${[loja.endereco, loja.cidade].filter(Boolean).join(", ")}`}{loja.cnpj && ` · CNPJ ${loja.cnpj}`}
          </p>
          <Link to="/privacidade" className="py-1 underline">Privacidade</Link>
        </div>
      </footer>
      <Rastreamento />
    </div>
  );
}

function Cabecalho({ lp, specs, escuro }: {
  lp: { headline: string; subtitulo: string; destaques: string[] };
  specs: { icone: typeof Calendar; texto: string }[];
  escuro: boolean;
}) {
  return (
    <div>
      <h1 className={cn("text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl", escuro ? "text-white" : "text-tinta")}>{lp.headline}</h1>
      {lp.subtitulo && <p className={cn("mt-3 max-w-2xl text-lg", escuro ? "text-white/80" : "text-suave")}>{lp.subtitulo}</p>}
      <ul className="numeros mt-5 flex flex-wrap gap-2">
        {specs.map(({ icone: Icone, texto }) => (
          <li key={texto} className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium", escuro ? "bg-white/10 text-white" : "bg-white text-texto shadow-card")}>
            <Icone className="size-4" aria-hidden="true" /> {texto}
          </li>
        ))}
      </ul>
      {lp.destaques.length > 0 && (
        <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
          {lp.destaques.map((d) => (
            <li key={d} className={cn("flex items-start gap-2.5 font-medium", escuro ? "text-white" : "text-tinta")}>
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-marca-600 text-sobre-marca"><Check className="size-3.5" aria-hidden="true" /></span>
              {d}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
