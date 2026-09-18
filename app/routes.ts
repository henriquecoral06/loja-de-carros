import { type RouteConfig, index, layout, prefix, route } from "@react-router/dev/routes";

export default [
  // Site público: cabeçalho e rodapé com os dados da loja.
  layout("routes/site.tsx", [
    index("routes/home.tsx"),
    // Marca e modelo no caminho: /carros/toyota/corolla tem URL própria e indexável.
    route("carros/:marca?/:modelo?", "routes/busca.tsx"),
    route("carro/:slug", "routes/anuncio.tsx"),
    route("venda-seu-carro", "routes/venda-seu-carro.tsx"),
    route("sobre", "routes/sobre.tsx"),
    route("contato", "routes/contato.tsx"),
    route("termos", "routes/termos.tsx"),
    route("privacidade", "routes/privacidade.tsx"),
  ]),

  // Landing pages de campanha: sem o menu do site.
  route("lp/:slug", "routes/lp.tsx"),

  // Painel da loja. Sem cadastro público: os acessos são criados em Configurações.
  ...prefix("admin", [
    route("entrar", "routes/admin/entrar.tsx"),
    route("sair", "routes/admin/sair.tsx"),
    route("leads.csv", "routes/admin/leads-csv.ts"),
    layout("routes/admin/layout.tsx", [
      index("routes/admin/dashboard.tsx"),
      route("veiculos", "routes/admin/veiculos.tsx"),
      route("veiculos/novo", "routes/admin/veiculo-form.tsx", { id: "veiculo-novo" }),
      route("veiculos/:id", "routes/admin/veiculo-form.tsx", { id: "veiculo-editar" }),
      route("marcas", "routes/admin/marcas.tsx"),
      route("landing-pages", "routes/admin/landing-pages.tsx"),
      route("landing-pages/nova", "routes/admin/landing-page-form.tsx", { id: "lp-nova" }),
      route("landing-pages/:id", "routes/admin/landing-page-form.tsx", { id: "lp-editar" }),
      route("leads", "routes/admin/leads.tsx"),
      route("vendedores", "routes/admin/vendedores.tsx"),
      route("integracoes", "routes/admin/integracoes.tsx"),
      route("configuracoes", "routes/admin/configuracoes.tsx"),
    ]),
  ]),

  // Rotas de recurso: devolvem arquivo ou JSON, não página.
  route("api/leads", "routes/api/leads.ts"),
  route("feed/estoque.xml", "routes/feed.ts"),
  route("imagens/*", "routes/imagens.ts"),
  route("sitemap.xml", "routes/sitemap.ts"),
  route("robots.txt", "routes/robots.ts"),
  route("icone.svg", "routes/icone.ts"),
] satisfies RouteConfig;
