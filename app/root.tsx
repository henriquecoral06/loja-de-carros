import { isRouteErrorResponse, Link, Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import type { Route } from "./+types/root";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400..800&display=swap" },
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
];

/** Só o documento. Cabeçalho e rodapé ficam em routes/site.tsx; o admin tem o próprio. */
export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#d3141f" />
        <Meta />
        <Links />
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
      <p className="text-sm font-semibold text-marca-600">{naoEncontrado ? "Erro 404" : "Erro"}</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-tinta">
        {naoEncontrado ? "Página não encontrada" : "Algo deu errado"}
      </h1>
      <p className="mt-3 max-w-lg text-suave">
        {naoEncontrado ? "O endereço não existe ou o veículo já foi vendido." : "Tente de novo em instantes."}
      </p>
      <Link to="/carros" className="botao-primario mt-8">Ver o estoque</Link>
      {detalhe && <pre className="mt-10 overflow-x-auto rounded-xl bg-noite p-4 text-xs text-white/80">{detalhe}</pre>}
    </main>
  );
}
