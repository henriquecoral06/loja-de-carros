import {
  isRouteErrorResponse, Link, Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteLoaderData,
} from "react-router";
import type { Route } from "./+types/root";
import { obterUsuario } from "./.server/sessao";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import { SITE } from "./lib/site";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400..800&display=swap" },
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
];

export async function loader({ request }: Route.LoaderArgs) {
  const usuario = await obterUsuario(request);
  return { usuario: usuario ? { nome: usuario.nome } : null };
}

export function Layout({ children }: { children: React.ReactNode }) {
  const dados = useRouteLoaderData<typeof loader>("root");
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#1f4fd6" />
        <Meta />
        <Links />
      </head>
      <body className="flex min-h-dvh flex-col">
        <a href="#conteudo" className="botao-primario sr-only z-50 focus:not-sr-only focus:fixed focus:left-4 focus:top-3">
          Pular para o conteúdo
        </a>
        <SiteHeader usuario={dados?.usuario ?? null} />
        <main id="conteudo" className="flex-1">{children}</main>
        <SiteFooter />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function meta() {
  return [{ title: SITE.nome }, { name: "description", content: SITE.descricao }];
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const naoEncontrado = isRouteErrorResponse(error) && error.status === 404;
  const detalhe = import.meta.env.DEV && error instanceof Error ? error.stack : undefined;

  return (
    <section className="conteiner py-20">
      <p className="text-sm font-semibold text-marca-600">{naoEncontrado ? "Erro 404" : "Erro"}</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-tinta">
        {naoEncontrado ? "Página não encontrada" : "Algo deu errado"}
      </h1>
      <p className="mt-3 max-w-lg text-suave">
        {naoEncontrado
          ? "O endereço não existe ou o anúncio foi removido."
          : "Tente de novo em instantes. Se continuar, volte para a página inicial."}
      </p>
      <Link to="/carros" className="botao-primario mt-8">Ver carros à venda</Link>
      {detalhe && <pre className="mt-10 overflow-x-auto rounded-xl bg-noite p-4 text-xs text-white/80">{detalhe}</pre>}
    </section>
  );
}
