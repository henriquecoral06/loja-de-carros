// =====================================================================
// seo — sitemap.xml e pré-renderização de Open Graph.
//
// PROBLEMA QUE ESTA FUNÇÃO RESOLVE
// O stack do Lovable é Vite + React, ou seja, SPA renderizada no cliente.
// O Googlebot até executa JavaScript, mas o robô que gera a prévia de
// link do WhatsApp (e do Facebook, e do Telegram) NÃO executa. Sem uma
// resposta com as meta tags já no HTML, colar o link de um carro no
// WhatsApp mostra um card vazio — justamente o recurso de maior retorno
// da seção 07 do escopo.
//
// COMO USAR
// Aponte no seu proxy/CDN (Cloudflare Worker, Netlify, Vercel) as rotas
//   /sitemap.xml            -> esta função
//   /robots.txt             -> esta função
//   /carros/:slug  (apenas quando o User-Agent for robô) -> esta função
// Visitante humano continua recebendo o SPA normalmente.
// O README traz o snippet de Worker pronto.
// =====================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SITE = Deno.env.get("SITE_URL") ?? "https://exemplo.com.br";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!,
);

const escapar = (texto: string) =>
  texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const moeda = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

async function sitemap() {
  const [{ data: veiculos }, { data: config }] = await Promise.all([
    supabase.from("veiculos_publicos").select("slug, created_at, foto_capa").eq("status", "disponivel"),
    supabase.from("config").select("nome").maybeSingle(),
  ]);

  const estaticas = ["", "/estoque", "/sobre", "/contato"];
  const urls = [
    ...estaticas.map((rota) => `  <url><loc>${SITE}${rota}</loc><priority>${rota === "" ? "1.0" : "0.8"}</priority></url>`),
    ...(veiculos ?? []).map((v) => `  <url>
    <loc>${SITE}/carros/${v.slug}</loc>
    <lastmod>${new Date(v.created_at).toISOString().slice(0, 10)}</lastmod>
    <priority>0.9</priority>${v.foto_capa ? `
    <image:image><image:loc>${escapar(v.foto_capa)}</image:loc></image:image>` : ""}
  </url>`),
  ].join("\n");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>`,
    { headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" } },
  );
}

function robots() {
  return new Response(
    `User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${SITE}/sitemap.xml\n`,
    { headers: { "Content-Type": "text/plain", "Cache-Control": "public, max-age=86400" } },
  );
}

async function paginaVeiculo(slug: string) {
  const { data: v } = await supabase
    .from("veiculos_publicos")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!v) return new Response("Não encontrado", { status: 404 });

  const titulo = `${v.marca} ${v.modelo} ${v.versao ?? ""} ${v.ano_fabricacao}/${v.ano_modelo}`.replace(/\s+/g, " ").trim();
  const preco = v.preco_sob_consulta ? "Preço sob consulta" : moeda(v.preco_vigente);
  const descricao = v.meta_description
    ?? `${titulo} com ${v.km.toLocaleString("pt-BR")} km, ${v.cambio.toLowerCase()}, ${v.cor.toLowerCase()}. ${preco}.`;
  const url = `${SITE}/carros/${v.slug}`;

  // schema.org/Vehicle: é o que faz a ficha aparecer direto no Google.
  const dados = {
    "@context": "https://schema.org",
    "@type": "Car",
    name: titulo,
    brand: { "@type": "Brand", name: v.marca },
    model: v.modelo,
    vehicleModelDate: String(v.ano_modelo),
    productionDate: String(v.ano_fabricacao),
    mileageFromOdometer: { "@type": "QuantitativeValue", value: v.km, unitCode: "KMT" },
    vehicleTransmission: v.cambio,
    fuelType: v.combustivel,
    color: v.cor,
    numberOfDoors: v.portas,
    image: v.foto_capa ? [v.foto_capa] : [],
    offers: {
      "@type": "Offer",
      price: v.preco_vigente,
      priceCurrency: "BRL",
      availability: v.status === "vendido"
        ? "https://schema.org/SoldOut"
        : "https://schema.org/InStock",
      url,
    },
  };

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${escapar(v.meta_title ?? `${titulo} — ${preco}`)}</title>
<meta name="description" content="${escapar(descricao)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="product">
<meta property="og:title" content="${escapar(titulo)} — ${escapar(preco)}">
<meta property="og:description" content="${escapar(descricao)}">
<meta property="og:url" content="${url}">
${v.foto_capa ? `<meta property="og:image" content="${escapar(v.foto_capa)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">` : ""}
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify(dados)}</script>
</head>
<body>
<h1>${escapar(titulo)}</h1>
<p>${escapar(preco)}</p>
<p>${v.km.toLocaleString("pt-BR")} km · ${escapar(v.cambio)} · ${escapar(v.combustivel)} · ${escapar(v.cor)}</p>
<p>${escapar(v.descricao ?? "")}</p>
<p><a href="${url}">Ver no site</a></p>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=600" },
  });
}

Deno.serve(async (req) => {
  const { pathname, searchParams } = new URL(req.url);

  if (pathname.endsWith("/sitemap.xml")) return sitemap();
  if (pathname.endsWith("/robots.txt")) return robots();

  const slug = searchParams.get("slug") ?? pathname.split("/carros/")[1];
  if (slug) return paginaVeiculo(slug.replace(/\/$/, ""));

  return new Response("Rota não tratada", { status: 404 });
});
