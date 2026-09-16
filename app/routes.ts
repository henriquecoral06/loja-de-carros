import { type RouteConfig, index, layout, prefix, route } from "@react-router/dev/routes";

export default [
  // Site público: cabeçalho e rodapé com os dados da loja.
  layout("routes/site.tsx", [
    index("routes/home.tsx"),
    // Marca e modelo no caminho: /carros/toyota/corolla tem URL própria e indexável.
    route("carros/:marca?/:modelo?", "routes/busca.tsx"),
    route("carro/:slug", "routes/anuncio.tsx"),
    route("sobre", "routes/sobre.tsx"),
    route("contato", "routes/contato.tsx"),
    route("termos", "routes/termos.tsx"),
    route("privacidade", "routes/privacidade.tsx"),
  ]),

  // Área da loja. Sem cadastro público: as contas são criadas em Equipe.
  ...prefix("admin", [
    route("entrar", "routes/admin/entrar.tsx"),
    route("sair", "routes/admin/sair.tsx"),
    layout("routes/admin/layout.tsx", [
      index("routes/admin/estoque.tsx"),
      route("veiculos/novo", "routes/admin/veiculo-form.tsx", { id: "veiculo-novo" }),
      route("veiculos/:id", "routes/admin/veiculo-form.tsx", { id: "veiculo-editar" }),
      route("mensagens", "routes/admin/mensagens.tsx"),
      route("loja", "routes/admin/loja.tsx"),
      route("aparencia", "routes/admin/aparencia.tsx"),
      route("integracoes", "routes/admin/integracoes.tsx"),
      route("equipe", "routes/admin/equipe.tsx"),
      route("senha", "routes/admin/senha.tsx"),
    ]),
  ]),

  // Rotas de recurso: devolvem arquivo, não página.
  route("imagens/*", "routes/imagens.ts"),
  route("sitemap.xml", "routes/sitemap.ts"),
  route("robots.txt", "routes/robots.ts"),
  route("icone.svg", "routes/icone.ts"),
] satisfies RouteConfig;
