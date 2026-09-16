import { isRouteErrorResponse, Link, Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteLoaderData } from "react-router";
import { rastreamentoPublico } from "~/.server/integracoes";
import { obterLoja } from "~/.server/loja";
import { cssTema, paleta } from "~/lib/cores";
import type { Route } from "./+types/root";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400..800&display=swap" },
];

/**
 * A loja é carregada aqui, uma vez: site e painel usam nome, logo e cores.
 * Salvar em Admin → Aparência revalida este loader e o site troca de cara
 * sem recarregar.
 */
export async function loader() {
  const [loja, rastreamento] = await Promise.all([obterLoja(), rastreamentoPublico()]);
  return { loja, rastreamento };
}

export function Layout({ children }: { children: React.ReactNode }) {
  const dados = useRouteLoaderData<typeof loader>("root");
  const primaria = dados?.loja.corPrimaria ?? "";
  const escura = dados?.loja.corEscura ?? "";
  // O ícone da aba acompanha a cor da loja: ?c= só muda o cache.
  const icone = `/icone.svg?c=${paleta(primaria, escura)["marca-600"].slice(1)}`;

  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content={paleta(primaria, escura)["marca-600"]} />
        <link rel="icon" href={icone} type="image/svg+xml" />
        <Meta />
        <Links />
        {/* Só hex validado entra aqui (ver app/lib/cores.ts). */}
        <style dangerouslySetInnerHTML={{ __html: cssTema(primaria, escura) }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const naoEncontrado = isRouteErrorResponse(error) && error.status === 404;
  const detalhe = import.meta.env.DEV && error instanceof Error ? error.stack : undefined;
  return (
    <main className="conteiner py-20">
      <p className="text-sm font-semibold text-marca-700">{naoEncontrado ? "Erro 404" : "Erro"}</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-tinta">
        {naoEncontrado ? "Página não encontrada" : "Algo deu errado"}
      </h1>
      <p className="mt-3 max-w-lg text-suave">
        {naoEncontrado ? "O endereço não existe ou o veículo já saiu do estoque." : "Tente de novo em instantes."}
      </p>
      <Link to="/carros" className="botao-primario mt-8">Ver o estoque</Link>
      {detalhe && <pre className="mt-10 overflow-x-auto rounded-xl bg-noite p-4 text-xs text-white/80">{detalhe}</pre>}
    </main>
  );
}
