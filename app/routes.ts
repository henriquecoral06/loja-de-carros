import { type RouteConfig, index, layout, prefix, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),

  // Marca e modelo no caminho: /carros/toyota/corolla tem URL própria e indexável.
  route("carros/:marca?/:modelo?", "routes/busca.tsx"),
  route("carro/:slug", "routes/anuncio.tsx"),

  route("entrar", "routes/entrar.tsx"),
  route("cadastrar", "routes/cadastrar.tsx"),
  route("sair", "routes/sair.tsx"),

  ...prefix("painel", [
    layout("routes/painel/layout.tsx", [
      index("routes/painel/anuncios.tsx"),
      route("anuncios/novo", "routes/painel/anuncio-form.tsx", { id: "anuncio-novo" }),
      route("anuncios/:id", "routes/painel/anuncio-form.tsx", { id: "anuncio-editar" }),
      route("mensagens", "routes/painel/mensagens.tsx"),
      route("conta", "routes/painel/conta.tsx"),
    ]),
  ]),

  route("termos", "routes/termos.tsx"),
  route("privacidade", "routes/privacidade.tsx"),

  // Rotas de recurso: devolvem arquivo, não página.
  route("imagens/*", "routes/imagens.ts"),
  route("sitemap.xml", "routes/sitemap.ts"),
  route("robots.txt", "routes/robots.ts"),
] satisfies RouteConfig;
