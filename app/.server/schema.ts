import { sql } from "drizzle-orm";
import { blob, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { CAMBIOS, CARROCERIAS, COMBUSTIVEIS, ESTILOS_LP, ORIGENS_LEAD, STATUS_ANUNCIO, STATUS_LEAD, STATUS_LP } from "../lib/veiculos";

/*
 * Site de UMA loja. Quem anuncia é a própria loja: não há cadastro
 * público. As contas em `usuarios` são da equipe, criadas pelo painel.
 *
 * Datas em milissegundos Unix (integer). Preço em reais inteiros: carro
 * não tem centavo, e inteiro evita erro de arredondamento na busca por
 * faixa de preço.
 */

const agora = sql`(unixepoch() * 1000)`;

/** Dados da loja. Linha única (id = 1), editada em Admin → Configurações. */
export const loja = sqliteTable("loja", {
  id: integer("id").primaryKey(),
  nome: text("nome").notNull(),
  slogan: text("slogan").notNull().default(""),
  sobre: text("sobre").notNull().default(""),
  cnpj: text("cnpj").notNull().default(""),
  // Telefones guardam DDI e número separados: wa.me exige o DDI e a loja
  // pode atender de outro país.
  whatsappDdi: text("whatsapp_ddi").notNull().default("55"),
  whatsapp: text("whatsapp").notNull().default(""),
  telefoneDdi: text("telefone_ddi").notNull().default("55"),
  telefone: text("telefone").notNull().default(""),
  email: text("email").notNull().default(""),
  endereco: text("endereco").notNull().default(""),
  bairro: text("bairro").notNull().default(""),
  cidade: text("cidade").notNull().default(""),
  uf: text("uf").notNull().default(""),
  cep: text("cep").notNull().default(""),
  horario: text("horario").notNull().default(""),
  // Redes sociais: URL completa.
  instagram: text("instagram").notNull().default(""),
  facebook: text("facebook").notNull().default(""),
  tiktok: text("tiktok").notNull().default(""),
  youtube: text("youtube").notNull().default(""),
  // Aparência. Cores em #rrggbb; a paleta completa sai de app/lib/cores.ts.
  corPrimaria: text("cor_primaria").notNull().default("#d3141f"),
  corSecundaria: text("cor_secundaria").notNull().default("#a80f18"),
  corEscura: text("cor_escura").notNull().default("#22232d"),
  logoChave: text("logo_chave").notNull().default(""),
  logoClaroChave: text("logo_claro_chave").notNull().default(""),
  // Botão flutuante de WhatsApp.
  whatsappFlutuante: integer("whatsapp_flutuante", { mode: "boolean" }).notNull().default(true),
  whatsappMensagem: text("whatsapp_mensagem").notNull().default("Olá! Vim pelo site e gostaria de mais informações."),
  // Textos e mídia da home.
  heroTitulo: text("hero_titulo").notNull().default(""),
  heroSubtitulo: text("hero_subtitulo").notNull().default(""),
  bannerChave: text("banner_chave").notNull().default(""),
  heroVideo: text("hero_video").notNull().default(""),
  textoVendaCarro: text("texto_venda_carro").notNull().default(""),
  // Feed XML do estoque para portais. O token vai na URL do feed.
  feedAtivo: integer("feed_ativo", { mode: "boolean" }).notNull().default(false),
  feedToken: text("feed_token").notNull().default(""),
  atualizadoEm: integer("atualizado_em").notNull().default(agora),
});

/**
 * Integrações (Admin → Integrações). Linha única (id = 1). Só os ids de
 * pixel/tag e a configuração de conversões vão para o navegador; tokens,
 * chaves e o segredo do webhook NUNCA saem do servidor.
 */
export const integracoes = sqliteTable("integracoes", {
  id: integer("id").primaryKey(),
  webhookUrl: text("webhook_url").notNull().default(""),
  webhookSegredo: text("webhook_segredo").notNull().default(""),
  // Modelo JSON do corpo com {{marcadores}} (ver app/lib/webhook-modelo.ts). Vazio = formato padrão.
  webhookModelo: text("webhook_modelo").notNull().default(""),
  // API de leads: guarda só o SHA-256 do token e os 4 últimos caracteres.
  apiTokenHash: text("api_token_hash").notNull().default(""),
  apiTokenFinal: text("api_token_final").notNull().default(""),
  apiTokenCriadoEm: integer("api_token_criado_em"),
  metaPixelId: text("meta_pixel_id").notNull().default(""),
  metaCodigoTeste: text("meta_codigo_teste").notNull().default(""),
  metaTokenCapi: text("meta_token_capi").notNull().default(""),
  googleAdsId: text("google_ads_id").notNull().default(""),
  ga4Id: text("ga4_id").notNull().default(""),
  gtmId: text("gtm_id").notNull().default(""),
  // JSON: { formulario, whatsapp, ligar } → { rastrear, eventoMeta, eventoPersonalizado, rotuloGoogle }
  conversoes: text("conversoes").notNull().default("{}"),
  exigirConsentimento: integer("exigir_consentimento", { mode: "boolean" }).notNull().default(true),
  resendApiKey: text("resend_api_key").notNull().default(""),
  resendRemetente: text("resend_remetente").notNull().default(""),
  resendDestinatarios: text("resend_destinatarios").notNull().default(""),
  atualizadoEm: integer("atualizado_em").notNull().default(agora),
});

/** Registro das entregas para fora (webhook, e-mail, API de Conversões). Guarda as 100 últimas. */
export const envios = sqliteTable(
  "envios",
  {
    id: text("id").primaryKey(),
    canal: text("canal", { enum: ["webhook", "email", "meta"] }).notNull(),
    sucesso: integer("sucesso", { mode: "boolean" }).notNull(),
    status: integer("status").notNull().default(0),
    detalhe: text("detalhe").notNull().default(""),
    criadoEm: integer("criado_em").notNull().default(agora),
  },
  (t) => [index("envios_criado_idx").on(t.criadoEm)],
);

/** Vendedores que atendem os veículos. O WhatsApp do vendedor substitui o da loja na página do carro. */
export const vendedores = sqliteTable("vendedores", {
  id: text("id").primaryKey(),
  nome: text("nome").notNull(),
  whatsappDdi: text("whatsapp_ddi").notNull().default("55"),
  whatsapp: text("whatsapp").notNull().default(""),
  email: text("email").notNull().default(""),
  fotoChave: text("foto_chave").notNull().default(""),
  ativo: integer("ativo", { mode: "boolean" }).notNull().default(true),
  criadoEm: integer("criado_em").notNull().default(agora),
});

export const usuarios = sqliteTable("usuarios", {
  id: text("id").primaryKey(),
  nome: text("nome").notNull(),
  email: text("email").notNull().unique(),
  // Formato: pbkdf2-sha256$iteracoes$salt$hash (base64). Guardar as
  // iterações junto permite subir o custo depois sem invalidar senhas.
  senhaHash: text("senha_hash").notNull(),
  criadoEm: integer("criado_em").notNull().default(agora),
});

export const sessoes = sqliteTable(
  "sessoes",
  {
    // SHA-256 do token do cookie. O token em si nunca é gravado: um
    // vazamento do banco não entrega sessões válidas.
    id: text("id").primaryKey(),
    usuarioId: text("usuario_id").references(() => usuarios.id, { onDelete: "cascade" }),
    dados: text("dados").notNull().default("{}"),
    expiraEm: integer("expira_em").notNull(),
    criadoEm: integer("criado_em").notNull().default(agora),
  },
  (t) => [index("sessoes_expira_idx").on(t.expiraEm), index("sessoes_usuario_idx").on(t.usuarioId)],
);

export const marcas = sqliteTable("marcas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nome: text("nome").notNull(),
  slug: text("slug").notNull().unique(),
});

export const modelos = sqliteTable(
  "modelos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    marcaId: integer("marca_id").notNull().references(() => marcas.id, { onDelete: "cascade" }),
    nome: text("nome").notNull(),
    slug: text("slug").notNull(),
  },
  (t) => [uniqueIndex("modelos_marca_slug_uq").on(t.marcaId, t.slug)],
);

export const anuncios = sqliteTable(
  "anuncios",
  {
    id: text("id").primaryKey(),
    // Código curto do estoque (1, 2, 3…), exibido como "0001" no painel e nos leads.
    codigo: integer("codigo").notNull().unique(),
    slug: text("slug").notNull().unique(),
    marcaId: integer("marca_id").notNull().references(() => marcas.id),
    modeloId: integer("modelo_id").notNull().references(() => modelos.id),
    versao: text("versao").notNull(),
    anoFabricacao: integer("ano_fabricacao").notNull(),
    anoModelo: integer("ano_modelo").notNull(),
    km: integer("km").notNull(),
    preco: integer("preco").notNull(),
    cambio: text("cambio", { enum: CAMBIOS }).notNull(),
    combustivel: text("combustivel", { enum: COMBUSTIVEIS }).notNull(),
    carroceria: text("carroceria", { enum: CARROCERIAS }).notNull(),
    cor: text("cor").notNull(),
    portas: integer("portas").notNull().default(4),
    // Lista JSON de strings. Opcional não é filtro de busca, então não
    // justifica tabela própria.
    opcionais: text("opcionais").notNull().default("[]"),
    descricao: text("descricao").notNull().default(""),
    // Aparece na vitrine da home.
    destaque: integer("destaque", { mode: "boolean" }).notNull().default(false),
    status: text("status", { enum: STATUS_ANUNCIO }).notNull().default("ativo"),
    visualizacoes: integer("visualizacoes").notNull().default(0),
    vendedorId: text("vendedor_id").references(() => vendedores.id, { onDelete: "set null" }),
    criadoPor: text("criado_por").references(() => usuarios.id, { onDelete: "set null" }),
    criadoEm: integer("criado_em").notNull().default(agora),
    atualizadoEm: integer("atualizado_em").notNull().default(agora),
  },
  // Um índice por campo filtrável da busca. O D1 é SQLite: sem índice,
  // cada filtro vira varredura da tabela inteira.
  (t) => [
    index("anuncios_status_criado_idx").on(t.status, t.criadoEm),
    index("anuncios_destaque_idx").on(t.status, t.destaque),
    index("anuncios_marca_idx").on(t.marcaId),
    index("anuncios_modelo_idx").on(t.modeloId),
    index("anuncios_preco_idx").on(t.preco),
    index("anuncios_ano_idx").on(t.anoModelo),
    index("anuncios_km_idx").on(t.km),
    index("anuncios_carroceria_idx").on(t.carroceria),
  ],
);

export const fotos = sqliteTable(
  "fotos",
  {
    id: text("id").primaryKey(),
    anuncioId: text("anuncio_id").notNull().references(() => anuncios.id, { onDelete: "cascade" }),
    chave: text("chave").notNull(), // chave em `arquivos` (ou no R2), ou URL externa das fotos de exemplo
    ordem: integer("ordem").notNull().default(0),
    criadoEm: integer("criado_em").notNull().default(agora),
  },
  (t) => [index("fotos_anuncio_ordem_idx").on(t.anuncioId, t.ordem)],
);

/** Landing pages de campanha: uma por veículo, sem o menu do site. */
export const landingPages = sqliteTable(
  "landing_pages",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    anuncioId: text("anuncio_id").notNull().references(() => anuncios.id, { onDelete: "cascade" }),
    // Nome interno, só aparece no painel.
    titulo: text("titulo").notNull(),
    status: text("status", { enum: STATUS_LP }).notNull().default("rascunho"),
    estilo: text("estilo", { enum: ESTILOS_LP }).notNull().default("editorial"),
    // Tema de 13 cores (JSON, ver app/lib/lp/tema.ts). Vazio = paleta do estilo.
    tema: text("tema").notNull().default(""),
    estiloBotao: text("estilo_botao", { enum: ["pilula", "arredondado", "quadrado"] }).notNull().default("arredondado"),
    // Topo
    nomeExibido: text("nome_exibido").notNull().default(""),
    headline: text("headline").notNull(),
    subtitulo: text("subtitulo").notNull().default(""),
    textoBotao: text("texto_botao").notNull().default("Quero este carro"),
    mostrarPreco: integer("mostrar_preco", { mode: "boolean" }).notNull().default(true),
    // URL de uma foto do carro ou /imagens/lp/… enviada. Vazio = capa do carro.
    imagemTopo: text("imagem_topo").notNull().default(""),
    videoTopo: text("video_topo").notNull().default(""),
    veuTopo: integer("veu_topo").notNull().default(50),
    logoTopo: text("logo_topo").notNull().default(""),
    // Seções
    secao1Titulo: text("secao1_titulo").notNull().default(""),
    secao1Texto: text("secao1_texto").notNull().default(""),
    secao2Titulo: text("secao2_titulo").notNull().default(""),
    secao2Texto: text("secao2_texto").notNull().default(""),
    secao2Imagem: text("secao2_imagem").notNull().default(""),
    // Lista JSON [{rotulo, icone}]. Vazia = opcionais do carro.
    destaques: text("destaques").notNull().default("[]"),
    numerosTitulo: text("numeros_titulo").notNull().default(""),
    numeros: text("numeros").notNull().default("[]"),
    videoUrl: text("video_url").notNull().default(""),
    videoTitulo: text("video_titulo").notNull().default(""),
    fichaTitulo: text("ficha_titulo").notNull().default(""),
    etapasTitulo: text("etapas_titulo").notNull().default(""),
    etapas: text("etapas").notNull().default("[]"),
    localTitulo: text("local_titulo").notNull().default(""),
    localTexto: text("local_texto").notNull().default(""),
    mapaEndereco: text("mapa_endereco").notNull().default(""),
    mostrarMapa: integer("mostrar_mapa", { mode: "boolean" }).notNull().default(true),
    depoimentosTitulo: text("depoimentos_titulo").notNull().default(""),
    depoimentos: text("depoimentos").notNull().default("[]"),
    faq: text("faq").notNull().default("[]"),
    ctaTitulo: text("cta_titulo").notNull().default(""),
    ctaSubtitulo: text("cta_subtitulo").notNull().default(""),
    // Material para download (PDF): pede contato, gera lead e libera o arquivo.
    materialChave: text("material_chave").notNull().default(""),
    materialRotulo: text("material_rotulo").notNull().default(""),
    // WhatsApp: mensagem dos botões e número/mensagem do botão flutuante (vazio = vendedor do carro ou loja).
    mensagemWhatsapp: text("mensagem_whatsapp").notNull().default(""),
    flutuanteDdi: text("flutuante_ddi").notNull().default("55"),
    flutuanteNumero: text("flutuante_numero").notNull().default(""),
    flutuanteMensagem: text("flutuante_mensagem").notNull().default(""),
    // Estrutura: seções ocultas e ordem (JSON de chaves, ver app/lib/lp/secoes.ts).
    secoesOcultas: text("secoes_ocultas").notNull().default("[]"),
    ordemSecoes: text("ordem_secoes").notNull().default("[]"),
    seoTitulo: text("seo_titulo").notNull().default(""),
    seoDescricao: text("seo_descricao").notNull().default(""),
    visitas: integer("visitas").notNull().default(0),
    criadoEm: integer("criado_em").notNull().default(agora),
    atualizadoEm: integer("atualizado_em").notNull().default(agora),
  },
);

/** Leads: todo contato recebido pelo site, com status de atendimento. */
export const leads = sqliteTable(
  "leads",
  {
    id: text("id").primaryKey(),
    anuncioId: text("anuncio_id").references(() => anuncios.id, { onDelete: "set null" }),
    landingPageId: text("landing_page_id").references(() => landingPages.id, { onDelete: "set null" }),
    vendedorId: text("vendedor_id").references(() => vendedores.id, { onDelete: "set null" }),
    origem: text("origem", { enum: ORIGENS_LEAD }).notNull(),
    nome: text("nome").notNull(),
    email: text("email").notNull().default(""),
    telefone: text("telefone").notNull(),
    texto: text("texto").notNull().default(""),
    status: text("status", { enum: STATUS_LEAD }).notNull().default("novo"),
    notas: text("notas").notNull().default(""),
    // De onde veio o lead: utm_*, gclid, fbclid e a página de entrada (JSON).
    rastreio: text("rastreio").notNull().default("{}"),
    criadoEm: integer("criado_em").notNull().default(agora),
    atualizadoEm: integer("atualizado_em").notNull().default(agora),
  },
  (t) => [index("leads_criado_idx").on(t.criadoEm), index("leads_status_idx").on(t.status, t.criadoEm)],
);

/**
 * Imagens enviadas pelo painel (fotos, logo, banner). Ficam no próprio D1:
 * o site funciona sem ativar o R2. O navegador reduz as fotos antes de
 * enviar (~200–400 KB), bem abaixo do limite de 2 MB por linha do D1.
 */
export const arquivos = sqliteTable("arquivos", {
  chave: text("chave").primaryKey(),
  tipo: text("tipo").notNull(),
  tamanho: integer("tamanho").notNull(),
  dados: blob("dados").notNull(),
  criadoEm: integer("criado_em").notNull().default(agora),
});

/*
 * Limite de tentativas (login, mensagem). Janela fixa: uma linha por
 * chave. O objetivo é barrar força bruta e spam de formulário, não fazer
 * contabilidade precisa.
 */
export const limites = sqliteTable("limites", {
  chave: text("chave").primaryKey(),
  janela: integer("janela").notNull(),
  contagem: integer("contagem").notNull(),
});

export type Loja = typeof loja.$inferSelect;
export type Anuncio = typeof anuncios.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type LandingPage = typeof landingPages.$inferSelect;
