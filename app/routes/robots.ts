import type { Route } from "./+types/robots";

export function loader({ request }: Route.LoaderArgs) {
  const origem = new URL(request.url).origin;
  return new Response(
    ["User-agent: *", "Allow: /", "Disallow: /painel", "Disallow: /entrar", "Disallow: /cadastrar", "", `Sitemap: ${origem}/sitemap.xml`, ""].join("\n"),
    { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" } },
  );
}
