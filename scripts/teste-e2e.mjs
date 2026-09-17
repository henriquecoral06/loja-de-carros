/**
 * Teste ponta a ponta do site e do painel num Chrome real.
 *
 *   npm run test:e2e                                     # local, conta demo do seed
 *   BASE=https://sua-loja.workers.dev EMAIL=... SENHA=... npm run test:e2e
 *
 * Cria e apaga carros, leads, landing page, vendedor e acesso com o prefixo
 * "E2E". Usa o Chrome instalado (CHROME=/caminho para outro navegador).
 * Os formulários públicos enviam 4 mensagens: o limite anti-spam é de 8
 * por hora por IP, então duas execuções seguidas estouram o limite.
 */
import { chromium } from "playwright-core";
import zlib from "node:zlib";

const BASE = (process.env.BASE ?? "http://localhost:5173").replace(/\/$/, "");
const COOKIE = process.env.COOKIE ?? await entrar(process.env.EMAIL ?? "admin@loja.com", process.env.SENHA ?? (BASE.includes("localhost") ? "demo12345" : ""));

/** Faz login por HTTP e devolve o valor do cookie de sessão. */
async function entrar(email, senha) {
  if (!senha) return undefined;
  const r = await fetch(`${BASE}/admin/entrar`, {
    method: "POST", redirect: "manual",
    headers: { Origin: BASE, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ email, senha }),
  });
  const valor = r.headers.get("set-cookie")?.match(/sessao=([^;]+)/)?.[1];
  if (!valor) console.warn(`Login falhou (HTTP ${r.status}): o painel não será testado.`);
  return valor;
}

/** PNG em degradê gerado na hora, para testar o envio de fotos. */
function png(largura, altura) {
  const crc = (buf) => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let x = 0xffffffff; for (const b of buf) x = t[(x ^ b) & 0xff] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; };
  const bloco = (tipo, dados) => { const len = Buffer.alloc(4); len.writeUInt32BE(dados.length); const td = Buffer.concat([Buffer.from(tipo), dados]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const linhas = [];
  for (let y = 0; y < altura; y++) { const l = Buffer.alloc(1 + largura * 3); for (let x = 0; x < largura; x++) { l[1 + x * 3] = (x * 255 / largura) | 0; l[2 + x * 3] = (y * 255 / altura) | 0; l[3 + x * 3] = 90; } linhas.push(l); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(largura, 0); ihdr.writeUInt32BE(altura, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), bloco("IHDR", ihdr), bloco("IDAT", zlib.deflateSync(Buffer.concat(linhas))), bloco("IEND", Buffer.alloc(0))]);
}
const PROD = BASE.startsWith("https://");
const TAG = `E2E${Date.now().toString().slice(-6)}`;
const falhas = [];
const passos = [];

const CHROME = process.env.CHROME ?? {
  darwin: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  win32: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
}[process.platform] ?? "/usr/bin/google-chrome";
const browser = await chromium.launch({ executablePath: CHROME, headless: true });

async function novaPagina({ largura = 1366, altura = 900, logado = false, mobile = false, aviso = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: largura, height: altura }, isMobile: mobile, hasTouch: mobile, locale: "pt-BR" });
  if (logado) {
    const u = new URL(BASE);
    await ctx.addCookies([{ name: "sessao", value: COOKIE, domain: u.hostname, path: "/", httpOnly: true, secure: PROD, sameSite: "Lax" }]);
  }
  // Nada sai para Google/Meta: teste em produção não pode gerar conversão falsa na conta de anúncios.
  await ctx.route(/googletagmanager|google-analytics|analytics\.google|doubleclick|googleadservices|googlesyndication|google\.com(\.br)?\/(pagead|ccm|rmkt)|facebook\.(net|com)/, (r) => r.fulfill({ status: 200, body: "" }));
  // O aviso de cookies cobriria botões no celular; o passo "tags" testa o aviso à parte.
  if (!aviso) await ctx.addInitScript(() => { try { localStorage.setItem("consentimento-cookies", "recusado"); } catch {} });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => falhas.push(`[JS] ${page.url()} :: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error" && !/favicon|unsplash|Failed to load resource: net::ERR_BLOCKED|youtube|facebook|googletag|status of 40[04]/i.test(m.text())) falhas.push(`[console] ${page.url()} :: ${m.text().slice(0, 300)}`); });
  page.on("response", (r) => {
    const u = r.url();
    if (r.status() >= 500 && u.startsWith(BASE)) falhas.push(`[HTTP ${r.status()}] ${r.request().method()} ${u}`);
  });
  page.on("dialog", (d) => d.accept());
  return { ctx, page };
}

async function passo(nome, fn) {
  const t = Date.now();
  try {
    await fn();
    passos.push(`ok   ${nome} (${Date.now() - t}ms)`);
  } catch (e) {
    passos.push(`FALHA ${nome}: ${e.message.split("\n")[0]}`);
    falhas.push(`[passo] ${nome} :: ${e.message.split("\n").slice(0, 3).join(" | ")}`);
  }
}

async function semErroNaTela(page) {
  const txt = await page.locator("body").innerText();
  if (/Algo deu errado|Não foi possível carregar esta tela|painel está indisponível/.test(txt)) throw new Error(`tela de erro em ${page.url()}`);
}

/** Executa a ação e espera a resposta do POST correspondente. */
async function postar(page, acao) {
  const [r] = await Promise.all([page.waitForResponse((x) => x.request().method() === "POST" && x.url().startsWith(BASE), { timeout: 20000 }), acao()]);
  if (r.status() >= 500) throw new Error(`POST ${r.url()} respondeu ${r.status()}`);
  return r;
}

async function ir(page, caminho) {
  const r = await page.goto(BASE + caminho, { waitUntil: "networkidle" });
  if (!r || r.status() >= 400) throw new Error(`${caminho} respondeu ${r?.status()}`);
  await semErroNaTela(page);
}

// ---------------- SITE PÚBLICO ----------------
{
  const { ctx, page } = await novaPagina();
  await passo("tags de anúncio e aviso de cookies", async () => {
    const html = await (await fetch(`${BASE}/`)).text();
    if (!html.includes("__tagsLoja")) { passos.push("info  nenhuma tag configurada em Integrações: passo pulado"); return; }
    if (!/gtag\('consent','default'/.test(html)) throw new Error("tags sem Modo de Consentimento no HTML");
    const t = await novaPagina({ aviso: true });
    await ir(t.page, "/");
    const consentimentos = () => t.page.evaluate(() => (window.dataLayer ?? []).map((x) => Array.from(x)).filter((x) => x[0] === "consent").map((x) => `${x[1]}:${x[2].ad_storage}`));
    const exige = await t.page.getByRole("button", { name: "Aceitar" }).count();
    if (exige) {
      if (!(await consentimentos()).includes("default:denied")) throw new Error("consentimento deveria começar negado");
      await t.page.getByRole("button", { name: "Aceitar" }).click();
      if (!(await consentimentos()).includes("update:granted")) throw new Error("Aceitar não liberou as tags");
    }
    await t.ctx.close();
  });
  await passo("home e busca da home", async () => {
    await ir(page, "/");
    await page.selectOption("#h-marca", { index: 1 });
    await page.selectOption("#h-modelo", { index: 1 });
    await Promise.all([page.waitForURL(/\/carros\//), page.click("form[action='/carros'] button[type=submit]")]);
    await semErroNaTela(page);
  });
  await passo("estoque: filtros, ordenação, paginação", async () => {
    await ir(page, "/carros");
    await page.check("input[name=carroceria][value=SUV]");
    await page.waitForURL(/carroceria=SUV/);
    await page.selectOption("#ordem", "menor-preco");
    await page.waitForURL(/ordem=menor-preco/);
    await page.fill("#f-preco-max", "150000");
    await page.waitForURL(/preco_max=150000/, { timeout: 5000 });
    await semErroNaTela(page);
    await ir(page, "/carros?pagina=2");
  });
  let urlCarro = "";
  await passo("página do veículo: galeria e formulário", async () => {
    await ir(page, "/carros");
    urlCarro = await page.locator("article a[href^='/carro/']").first().getAttribute("href");
    await ir(page, urlCarro);
    const proxima = page.getByRole("button", { name: /próxima|Próxima/ }).first();
    if (await proxima.count()) await proxima.click();
    await page.fill("#msg-nome", `${TAG} Visitante`);
    await page.fill("#msg-telefone", "31988887777");
    await page.click("text=Enviar mensagem");
    await page.getByText("Mensagem enviada").waitFor({ timeout: 10000 });
  });
  await passo("venda seu carro", async () => {
    await ir(page, "/venda-seu-carro");
    await page.click("text=Quero minha avaliação");
    await page.getByText("Informe seu nome.").waitFor();
    await page.fill("#venda-nome", `${TAG} Vendedor`);
    await page.fill("#venda-telefone", "31988887778");
    await page.fill("#venda-veiculo", "Honda Fit EX");
    await page.selectOption("#venda-ano", "2018");
    await page.fill("#venda-km", "65000");
    await page.click("text=Quero minha avaliação");
    await page.getByText("Recebemos os dados do seu carro").waitFor({ timeout: 10000 });
  });
  await passo("contato", async () => {
    await ir(page, "/contato");
    await page.fill("#contato-nome", `${TAG} Contato`);
    await page.fill("#contato-telefone", "31988887779");
    await page.fill("#contato-texto", "Mensagem de teste automatizado.");
    await page.click("button:has-text('Enviar mensagem')");
    await page.getByText("Mensagem enviada").waitFor({ timeout: 10000 });
  });
  await passo("landing page", async () => {
    const lp = process.env.LP ?? "toyota-hilux-srx-2022";
    const resp = await page.goto(`${BASE}/lp/${lp}`, { waitUntil: "networkidle" });
    if (resp.status() === 404) { passos.push(`info  landing page /lp/${lp} não existe: passo pulado (defina LP=slug)`); return; }
    await semErroNaTela(page);
    await page.fill("#lp-nome", `${TAG} LP`);
    await page.fill("#lp-telefone", "31988887770");
    await page.click("button[type=submit]:has-text('Quero')");
    await page.getByText("Recebemos seu contato").waitFor({ timeout: 10000 });
  });
  for (const c of ["/sobre", "/termos", "/privacidade", "/carros/toyota", "/nao-existe-xyz"]) {
    await passo(`abrir ${c}`, async () => {
      const r = await page.goto(BASE + c, { waitUntil: "networkidle" });
      if (c === "/nao-existe-xyz") { if (r.status() !== 404) throw new Error(`esperava 404, veio ${r.status()}`); }
      else if (r.status() >= 400) throw new Error(`status ${r.status()}`);
    });
  }
  await ctx.close();

  const m = await novaPagina({ largura: 375, altura: 812, mobile: true });
  await passo("celular: menu e gaveta de filtros", async () => {
    await ir(m.page, "/carros");
    await m.page.click("button[aria-label='Abrir menu']");
    await m.page.getByRole("navigation", { name: "Menu" }).waitFor();
    await ir(m.page, "/carros");
    await m.page.getByRole("button", { name: /^Filtros/ }).click();
    await m.page.check("input[name=cambio][value=CVT]");
    await m.page.click("text=Aplicar filtros");
    await m.page.waitForURL(/cambio=CVT/);
    const largura = await m.page.evaluate(() => document.documentElement.scrollWidth);
    if (largura > 376) throw new Error(`página mais larga que a tela: ${largura}`);
  });
  await m.ctx.close();
}

// ---------------- PAINEL ----------------
if (!COOKIE) console.warn("Sem sessão: só o site público foi testado. Informe EMAIL e SENHA.");
else {
  const { page } = await novaPagina({ logado: true });
  for (const c of ["/admin", "/admin/veiculos", "/admin/leads", "/admin/landing-pages", "/admin/vendedores", "/admin/integracoes", "/admin/configuracoes"]) {
    await passo(`painel abrir ${c}`, () => ir(page, c));
  }

  let idVeiculo = "";
  await passo("veículo: cadastrar SEM foto", async () => {
    await ir(page, "/admin/veiculos/novo");
    const anos = await page.locator("#anoFabricacao option").allTextContents();
    if (!anos.includes(String(new Date().getFullYear()))) throw new Error(`lista de anos errada: ${anos.slice(1, 4)}`);
    await page.selectOption("#marcaId", { label: "Honda" });
    await page.selectOption("#modeloId", { label: "Civic" });
    await page.fill("#versao", `${TAG} Sem Foto`);
    await page.selectOption("#anoFabricacao", "2021");
    await page.selectOption("#anoModelo", "2022");
    await page.selectOption("#carroceria", "Sedã");
    await page.selectOption("#cor", "Preto");
    await page.selectOption("#cambio", "CVT");
    await page.selectOption("#combustivel", "Flex");
    await page.fill("#km", "30000");
    await page.fill("#preco", "120000");
    await page.selectOption("#status", "pausado");
    await Promise.all([page.waitForURL(/\/admin\/veiculos\?salvo=/, { timeout: 20000 }), page.click("button:has-text('Cadastrar veículo')")]);
    await semErroNaTela(page);
  });
  await passo("veículo: cadastrar COM fotos", async () => {
    await ir(page, "/admin/veiculos/novo");
    await page.click("button:has-text('Cadastrar veículo')");
    await page.getByText("Revise os campos marcados").waitFor();
    await page.selectOption("#marcaId", { label: "Toyota" });
    await page.selectOption("#modeloId", { label: "Corolla" });
    await page.fill("#versao", `${TAG} Com Foto`);
    await page.selectOption("#anoFabricacao", "2022");
    await page.selectOption("#anoModelo", "2023");
    await page.selectOption("#carroceria", "Sedã");
    await page.selectOption("#cor", "Branco");
    await page.selectOption("#cambio", "Automático");
    await page.selectOption("#combustivel", "Flex");
    await page.fill("#km", "12000");
    await page.fill("#preco", "150000");
    await page.selectOption("#status", "pausado");
    await page.setInputFiles("input[type=file][accept='image/*']", [{ name: "foto1.png", mimeType: "image/png", buffer: png(900, 600) }, { name: "foto2.png", mimeType: "image/png", buffer: png(600, 400) }]);
    await page.getByRole("button", { name: "Remover foto 2" }).waitFor({ timeout: 15000 });
    await page.getByRole("button", { name: "Mover foto 1 para depois" }).click();
    const [resp] = await Promise.all([page.waitForResponse((x) => x.request().method() === "POST", { timeout: 20000 }), page.click("button:has-text('Cadastrar veículo')")]);
    if (resp.status() >= 500) throw new Error(`POST respondeu ${resp.status()}`);
    await page.waitForURL(/salvo=/, { timeout: 8000 }).catch(() => {});
    const url = page.url();
    if (!/salvo=/.test(url)) {
      const aviso = await page.locator("[role=alert]").first().innerText().catch(() => "");
      throw new Error(`não salvou: ${aviso}`);
    }
  });
  await passo("veículos: busca, status na linha, destaque", async () => {
    await ir(page, `/admin/veiculos?q=${TAG}`);
    const linhas = page.locator("tbody tr");
    if (!(await linhas.count())) throw new Error("veículo de teste não apareceu na busca");
    const editar = await linhas.first().locator("a[href^='/admin/veiculos/']").first().getAttribute("href");
    idVeiculo = editar.split("/").pop();
    await postar(page, () => linhas.first().locator("select").selectOption("vendido"));
    await postar(page, () => linhas.first().locator("button[aria-pressed]").click());
    await semErroNaTela(page);
  });
  await passo("veículo: editar (preço, vendedor, opcionais) e fotos servidas", async () => {
    await ir(page, `/admin/veiculos/${idVeiculo}`);
    const fotos = await page.locator("img[src^='/imagens/anuncios/']").evaluateAll((els) => els.map((e) => e.getAttribute("src")));
    if (fotos.length !== 2) throw new Error(`esperava 2 fotos no cadastro, achei ${fotos.length}`);
    for (const f of fotos) {
      const r = await page.request.get(BASE + f);
      if (r.status() !== 200 || !(r.headers()["content-type"] ?? "").startsWith("image/")) throw new Error(`foto ${f} respondeu ${r.status()}`);
    }
    await page.fill("#preco", "118000");
    await page.selectOption("#vendedorId", { index: 1 });
    await page.check("input[name=opcionais][value='Airbag']");
    await Promise.all([page.waitForURL(/salvo=/, { timeout: 20000 }), page.click("button:has-text('Salvar alterações')")]);
  });
  await passo("feed XML: ativar e desativar", async () => {
    await ir(page, "/admin/veiculos");
    await page.click("summary:has-text('Exportar para portais')");
    await postar(page, () => page.click("button:has-text('Ativar feed')"));
    await page.locator("input[aria-label='Endereço do feed']").waitFor({ timeout: 20000 });
    const url = await page.locator("input[aria-label='Endereço do feed']").inputValue();
    const r = await page.request.get(url);
    if (r.status() !== 200 || !(await r.text()).includes("<estoque")) throw new Error(`feed ${r.status()}`);
    await page.click("button:has-text('Verificar feed')");
    await page.getByText("XML válido").waitFor({ timeout: 60000 });
    const problemas = await page.locator("[role=status] li:has(.text-erro)").allInnerTexts();
    if (problemas.some((p) => /XML inválido|no feed, mas|respondeu HTTP/.test(p))) throw new Error(`verificador: ${problemas.join(" | ")}`);
    await postar(page, () => page.click("button:has-text('Desativar feed')"));
  });

  await passo("landing page: criar, editar, material, duplicar, excluir", async () => {
    // Etapa 1: carro, ponto de partida e estilo.
    await ir(page, "/admin/landing-pages/nova");
    await page.selectOption("#veiculo", { index: 1 });
    await page.click("label:has-text('Tech')");
    await Promise.all([page.waitForURL(/continuar=1/), page.click("button:has-text('Continuar')")]);
    await semErroNaTela(page);
    // Etapa 2: editor completo.
    const slug = `${TAG.toLowerCase()}-lp`;
    await page.fill("#titulo", `${TAG} campanha`);
    await page.fill("#slug", slug);
    await page.fill("#headline", "Oferta especial de teste");
    await page.selectOption("#status", "ativa");
    await Promise.all([page.waitForURL(/criada=1/, { timeout: 20000 }), page.click("button:has-text('Criar landing page')")]);
    await semErroNaTela(page);
    let r = await page.request.get(`${BASE}/lp/${slug}`);
    if (r.status() !== 200) throw new Error(`lp pública ${r.status()}`);

    // Troca de estilo, seção oculta e PDF de 3 MB (no D1 vai em partes).
    await page.selectOption("#estilo", "noturno");
    await page.click("button[aria-label='Ocultar Depoimentos da página']");
    const pdf = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(3 * 1024 * 1024, 32), Buffer.from("\n%%EOF\n")]);
    await page.click("h2:has-text('Material para download')");
    await page.setInputFiles("#materialArquivo", { name: "laudo.pdf", mimeType: "application/pdf", buffer: pdf });
    await page.fill("#materialRotulo", "Baixar o laudo");
    await postar(page, () => page.click("button:has-text('Salvar alterações')"));
    await page.getByText("Salvo às").waitFor({ timeout: 20000 });
    await semErroNaTela(page);

    // Página pública: estilo novo, sem depoimentos e com o material liberado por lead.
    const { ctx: publico, page: lp } = await novaPagina();
    await ir(lp, `/lp/${slug}`);
    if (await lp.locator("[data-secao=depoimentos]").count()) throw new Error("seção oculta apareceu");
    await lp.locator("button:has-text('Baixar o laudo')").first().click();
    await lp.fill("#lp-material-nome", `${TAG} Material`);
    await lp.fill("#lp-material-telefone", "31988887771");
    const [resp] = await Promise.all([
      lp.waitForResponse((x) => x.request().method() === "POST" && x.url().includes(`/lp/${slug}`)),
      lp.click("button:has-text('Receber o material')"),
    ]);
    if (resp.status() !== 200) throw new Error(`material respondeu ${resp.status()}`);
    await lp.getByText("Abrir o material").waitFor({ timeout: 10000 });
    const href = await lp.locator("a:has-text('Abrir o material')").getAttribute("href");
    r = await lp.request.get(BASE + href);
    const corpo = await r.body();
    if (r.status() !== 200 || corpo.length !== pdf.length || !corpo.subarray(0, 5).equals(Buffer.from("%PDF-"))) throw new Error(`PDF baixado: ${r.status()} ${corpo.length} bytes`);
    await publico.close();

    // Trocar o carro da página: aviso de textos de outro carro e "Preencher com os dados".
    await page.selectOption("#anuncioId", { index: 2 });
    await postar(page, () => page.click("button:has-text('Salvar alterações')"));
    await page.getByText("Salvo às").waitFor({ timeout: 20000 });
    const modelo = (await page.locator("#anuncioId option:checked").innerText()).split(" · ")[1].split(" ")[1];
    await page.click("button:has-text('Preencher com os dados do')");
    await postar(page, () => page.click("button:has-text('Salvar alterações')"));
    await page.getByText("Salvo às").waitFor({ timeout: 20000 });
    const html = await (await page.request.get(`${BASE}/lp/${slug}`)).text();
    if (!html.includes(modelo)) throw new Error(`página não passou a falar do ${modelo}`);

    // Duplicar e excluir as duas.
    await ir(page, "/admin/landing-pages");
    const linha = page.locator("tr", { hasText: `${TAG} campanha` }).first();
    await Promise.all([page.waitForURL(/\/admin\/landing-pages\/.+/), linha.locator("button[title=Duplicar]").click()]);
    await semErroNaTela(page);
    await ir(page, "/admin/landing-pages");
    for (let i = 0; i < 2; i++) {
      await postar(page, () => page.locator("tr", { hasText: TAG }).first().locator("button[title=Excluir]").click());
    }
  });

  await passo("leads: status, anotação, busca, CSV, excluir", async () => {
    await ir(page, `/admin/leads?q=${TAG}`);
    const itens = page.locator("main li", { hasText: TAG });
    const n = await itens.count();
    if (n < 5) throw new Error(`esperava 5 leads de teste, achei ${n}`);
    await postar(page, () => itens.first().locator("select").selectOption("negociacao"));
    await itens.first().locator("textarea").fill("Anotação de teste");
    await postar(page, () => page.click("h1"));
    await ir(page, `/admin/leads?q=${TAG}&status=negociacao`);
    const notas = await page.locator("main li textarea").evaluateAll((els) => els.map((e) => e.value));
    if (!notas.includes("Anotação de teste")) throw new Error(`status/anotação não persistiu: ${JSON.stringify(notas)}`);
    const csv = await page.request.get(`${BASE}/admin/leads.csv?q=${TAG}`);
    if (csv.status() !== 200 || !(await csv.text()).includes(TAG)) throw new Error("CSV sem os leads");
    await ir(page, `/admin/leads?q=${TAG}`);
    while (await page.locator("main li", { hasText: TAG }).count()) {
      await postar(page, () => page.locator("main li", { hasText: TAG }).first().locator("button:has-text('Excluir')").click());
      await page.waitForTimeout(300);
    }
  });

  await passo("vendedores: criar, editar, desativar, excluir", async () => {
    await ir(page, "/admin/vendedores");
    await page.fill("#nome", `${TAG} Vendedor`);
    await page.fill("#whatsapp", "(31) 99999-1111");
    await Promise.all([page.waitForURL(/salvo=1/), page.click("button:has-text('Adicionar vendedor')")]);
    const linha = () => page.locator("tr", { hasText: `${TAG} Vendedor` }).first();
    await Promise.all([page.waitForURL(/editar=/), linha().locator("a[title=Editar]").click()]);
    await page.fill("#email", "e2e@teste.com");
    await Promise.all([page.waitForURL(/salvo=1/), page.click("button:has-text('Salvar')")]);
    await postar(page, () => linha().locator("button[role=switch]").click());
    await postar(page, () => linha().locator("button[title=Excluir]").click());
  });

  await passo("integrações: salvar, token da API, testes", async () => {
    await ir(page, "/admin/integracoes");
    await page.click("button:has-text('Salvar integrações')");
    await page.getByText("Integrações salvas.").waitFor({ timeout: 10000 });
    await page.click("button:has-text('Gerar token')");
    const token = await page.locator("input[aria-label='Token da API']").inputValue({ timeout: 10000 });
    const r = await page.request.get(`${BASE}/api/leads?limit=1`, { headers: { Authorization: `Bearer ${token}` } });
    if (r.status() !== 200) throw new Error(`API ${r.status()}`);
    await ir(page, "/admin/integracoes");
    await page.click("button:has-text('Revogar')");
    await page.waitForLoadState("networkidle");
    await page.click("button:has-text('Testar webhook')");
    await page.getByText(/Salve a URL do webhook|Enviado|Falhou/).waitFor({ timeout: 15000 });
    await page.click("button:has-text('Testar e-mail')");
    await page.getByText(/não configurado|Enviado|Falhou/).waitFor({ timeout: 15000 });
  });

  await passo("configurações: salvar sem mudar, acesso, senha errada", async () => {
    await ir(page, "/admin/configuracoes");
    await page.click("button:has-text('Salvar configurações')");
    await page.getByText("Configurações salvas").waitFor({ timeout: 15000 });
    await page.fill("#acesso-nome", `${TAG} Acesso`);
    await page.fill("#acesso-email", `${TAG.toLowerCase()}@teste.com`);
    await page.fill("#acesso-senha", "senhaTeste123");
    await page.click("button:has-text('Dar acesso')");
    await page.getByText("Acesso criado").waitFor({ timeout: 15000 });
    await ir(page, "/admin/configuracoes");
    await postar(page, () => page.locator("li", { hasText: `${TAG} Acesso` }).locator("button:has-text('Remover')").click());
    await page.fill("#atual", "senha-errada");
    await page.fill("#nova", "novasenha123");
    await page.fill("#confirmar", "novasenha123");
    await page.click("button:has-text('Alterar senha')");
    await page.getByText("Senha atual incorreta").waitFor({ timeout: 15000 });
  });

  await passo("veículos de teste: excluir", async () => {
    await ir(page, `/admin/veiculos?q=${TAG}`);
    while (await page.locator("tbody tr").count()) {
      await postar(page, () => page.locator("tbody tr").first().locator("button[title=Excluir]").click());
      await ir(page, `/admin/veiculos?q=${TAG}`);
    }
  });

  await passo("painel no celular", async () => {
    const m = await novaPagina({ largura: 375, altura: 812, mobile: true, logado: true });
    for (const c of ["/admin", "/admin/veiculos", "/admin/leads", "/admin/configuracoes", "/admin/integracoes", "/admin/veiculos/novo"]) {
      await ir(m.page, c);
      const w = await m.page.evaluate(() => document.documentElement.scrollWidth);
      if (w > 376) throw new Error(`${c} mais largo que a tela: ${w}`);
    }
    await m.page.click("button[aria-label='Abrir menu']");
    await m.page.getByRole("link", { name: "Leads" }).first().click();
    await m.page.waitForURL(/\/admin\/leads/);
    await m.ctx.close();
  });
}

await browser.close();
console.log(passos.join("\n"));
console.log(`\n${falhas.length ? "FALHAS:\n" + [...new Set(falhas)].join("\n") : "Nenhuma falha registrada."}`);
process.exit(falhas.length ? 1 : 0);
