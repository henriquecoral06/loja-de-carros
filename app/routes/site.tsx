import { isRouteErrorResponse, Link, Outlet, useRouteError, useRouteLoaderData } from "react-router";
import { obterLoja } from "~/.server/loja";
import { SiteFooter } from "~/components/SiteFooter";
import { SiteHeader } from "~/components/SiteHeader";
import { BotaoWhatsAppFlutuante } from "~/components/WhatsApp";
import type { Route } from "./+types/site";

export async function loader() {
  return { loja: await obterLoja() };
}

export function meta({ loaderData, error }: Route.MetaArgs) {
  const loja = loaderData?.loja;
  if (!loja) return [];
  if (error) return [{ title: `Página não encontrada — ${loja.nome}` }, { name: "robots", content: "noindex" }];
  return [
    { title: `${loja.nome} — carros seminovos${loja.cidade ? ` em ${loja.cidade}` : ""}` },
    { name: "description", content: loja.slogan || `Carros seminovos — ${loja.nome}.` },
    { property: "og:site_name", content: loja.nome },
  ];
}

export default function Site({ loaderData }: Route.ComponentProps) {
  const { loja } = loaderData;
  return (
    <>
      <a href="#conteudo" className="botao-primario sr-only z-50 focus:not-sr-only focus:fixed focus:left-4 focus:top-3">
        Pular para o conteúdo
      </a>
      <SiteHeader loja={loja} />
      <main id="conteudo" className="flex-1"><Outlet /></main>
      <SiteFooter loja={loja} />
      <BotaoWhatsAppFlutuante loja={loja} />
    </>
  );
}

/** Erro dentro do site mantém cabeçalho e rodapé: quem cai num carro vendido ainda navega. */
export function ErrorBoundary() {
  const erro = useRouteError();
  // O loader deste layout costuma ter dado certo mesmo quando a página filha falha.
  const loja = useRouteLoaderData<typeof loader>("routes/site")?.loja;
  const naoEncontrado = isRouteErrorResponse(erro) && erro.status === 404;
  const conteudo = (
    <div className="conteiner py-20">
      <p className="text-sm font-semibold text-marca-600">{naoEncontrado ? "Erro 404" : "Erro"}</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-tinta">
        {naoEncontrado ? "Página não encontrada" : "Algo deu errado"}
      </h1>
      <p className="mt-3 max-w-lg text-suave">
        {naoEncontrado ? "O endereço não existe ou o veículo já saiu do estoque." : "Tente de novo em instantes."}
      </p>
      <Link to="/carros" className="botao-primario mt-8">Ver o estoque</Link>
    </div>
  );
  if (!loja) return <main className="flex-1">{conteudo}</main>;
  return (
    <>
      <SiteHeader loja={loja} />
      <main id="conteudo" className="flex-1">{conteudo}</main>
      <SiteFooter loja={loja} />
    </>
  );
}
