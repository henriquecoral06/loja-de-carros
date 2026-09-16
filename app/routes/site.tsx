import { isRouteErrorResponse, Link, Outlet, useRouteError } from "react-router";
import { Rastreamento } from "~/components/Rastreamento";
import { SiteFooter } from "~/components/SiteFooter";
import { SiteHeader } from "~/components/SiteHeader";
import { BotaoWhatsAppFlutuante } from "~/components/WhatsApp";
import { lojaDasRotas } from "~/lib/site";
import type { Route } from "./+types/site";

export function meta({ matches, error }: Route.MetaArgs) {
  const loja = lojaDasRotas(matches);
  if (error) return [{ title: `Página não encontrada — ${loja.nome}` }, { name: "robots", content: "noindex" }];
  return [
    { title: `${loja.nome} — carros seminovos${loja.cidade ? ` em ${loja.cidade}` : ""}` },
    { name: "description", content: loja.slogan || `Carros seminovos — ${loja.nome}.` },
  ];
}

/** Casca do site público. Os dados da loja vêm do loader raiz (app/root.tsx). */
export default function Site() {
  return (
    <>
      <a href="#conteudo" className="botao-primario sr-only z-50 focus:not-sr-only focus:fixed focus:left-4 focus:top-3">
        Pular para o conteúdo
      </a>
      <SiteHeader />
      <main id="conteudo" className="flex-1"><Outlet /></main>
      <SiteFooter />
      <BotaoWhatsAppFlutuante />
      <Rastreamento />
    </>
  );
}

/** Erro dentro do site mantém cabeçalho e rodapé: quem cai num carro vendido ainda navega. */
export function ErrorBoundary() {
  const erro = useRouteError();
  const naoEncontrado = isRouteErrorResponse(erro) && erro.status === 404;
  return (
    <>
      <SiteHeader />
      <main id="conteudo" className="flex-1">
        <div className="conteiner py-20">
          <p className="text-sm font-semibold text-marca-700">{naoEncontrado ? "Erro 404" : "Erro"}</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-tinta">
            {naoEncontrado ? "Página não encontrada" : "Algo deu errado"}
          </h1>
          <p className="mt-3 max-w-lg text-suave">
            {naoEncontrado ? "O endereço não existe ou o veículo já saiu do estoque." : "Tente de novo em instantes."}
          </p>
          <Link to="/carros" className="botao-primario mt-8">Ver o estoque</Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
