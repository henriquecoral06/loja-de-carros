import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { CAMBIOS, CARROCERIAS, COMBUSTIVEIS, STATUS_ANUNCIO } from "../lib/veiculos";

/*
 * Marketplace: qualquer pessoa cria conta e anuncia. O tipo da conta
 * (particular ou loja) muda só a apresentação do anunciante — a regra de
 * negócio é a mesma para os dois.
 *
 * Datas em milissegundos Unix (integer). Preço em reais inteiros: carro
 * não tem centavo, e inteiro evita erro de arredondamento na busca por
 * faixa de preço.
 */

const agora = sql`(unixepoch() * 1000)`;

export const usuarios = sqliteTable("usuarios", {
  id: text("id").primaryKey(),
  nome: text("nome").notNull(),
  email: text("email").notNull().unique(),
  // Formato: pbkdf2-sha256$iteracoes$salt$hash (base64). Guardar as
  // iterações junto permite subir o custo depois sem invalidar senhas.
  senhaHash: text("senha_hash").notNull(),
  whatsapp: text("whatsapp").notNull(),
  tipo: text("tipo", { enum: ["particular", "loja"] }).notNull().default("particular"),
  nomeLoja: text("nome_loja"),
  cidade: text("cidade").notNull(),
  uf: text("uf").notNull(),
  papel: text("papel", { enum: ["usuario", "admin"] }).notNull().default("usuario"),
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
  (t) => [index("sessoes_expira_idx").on(t.expiraEm)],
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
    slug: text("slug").notNull().unique(),
    usuarioId: text("usuario_id").notNull().references(() => usuarios.id, { onDelete: "cascade" }),
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
    // Lista JSON de strings. Opcional não é filtro de busca nesta versão,
    // então não justifica tabela própria.
    opcionais: text("opcionais").notNull().default("[]"),
    descricao: text("descricao").notNull().default(""),
    cidade: text("cidade").notNull(),
    uf: text("uf").notNull(),
    status: text("status", { enum: STATUS_ANUNCIO }).notNull().default("ativo"),
    visualizacoes: integer("visualizacoes").notNull().default(0),
    criadoEm: integer("criado_em").notNull().default(agora),
    atualizadoEm: integer("atualizado_em").notNull().default(agora),
  },
  // Um índice por campo filtrável da busca. O D1 é SQLite: sem índice,
  // cada filtro vira varredura da tabela inteira.
  (t) => [
    index("anuncios_status_criado_idx").on(t.status, t.criadoEm),
    index("anuncios_marca_idx").on(t.marcaId),
    index("anuncios_modelo_idx").on(t.modeloId),
    index("anuncios_preco_idx").on(t.preco),
    index("anuncios_ano_idx").on(t.anoModelo),
    index("anuncios_km_idx").on(t.km),
    index("anuncios_uf_idx").on(t.uf),
    index("anuncios_carroceria_idx").on(t.carroceria),
    index("anuncios_usuario_idx").on(t.usuarioId),
  ],
);

export const fotos = sqliteTable(
  "fotos",
  {
    id: text("id").primaryKey(),
    anuncioId: text("anuncio_id").notNull().references(() => anuncios.id, { onDelete: "cascade" }),
    // Chave do objeto no R2.
    chave: text("chave").notNull(),
    ordem: integer("ordem").notNull().default(0),
    criadoEm: integer("criado_em").notNull().default(agora),
  },
  (t) => [index("fotos_anuncio_ordem_idx").on(t.anuncioId, t.ordem)],
);

export const mensagens = sqliteTable(
  "mensagens",
  {
    id: text("id").primaryKey(),
    anuncioId: text("anuncio_id").notNull().references(() => anuncios.id, { onDelete: "cascade" }),
    vendedorId: text("vendedor_id").notNull().references(() => usuarios.id, { onDelete: "cascade" }),
    nome: text("nome").notNull(),
    email: text("email").notNull(),
    telefone: text("telefone").notNull(),
    texto: text("texto").notNull(),
    lida: integer("lida", { mode: "boolean" }).notNull().default(false),
    criadoEm: integer("criado_em").notNull().default(agora),
  },
  (t) => [index("mensagens_vendedor_idx").on(t.vendedorId, t.criadoEm)],
);

/*
 * Limite de tentativas (login, cadastro, mensagem). Janela fixa: uma
 * linha por chave. Simples de propósito — o objetivo é barrar força
 * bruta e spam de formulário, não fazer contabilidade precisa.
 */
export const limites = sqliteTable("limites", {
  chave: text("chave").primaryKey(),
  janela: integer("janela").notNull(),
  contagem: integer("contagem").notNull(),
});

export type Usuario = typeof usuarios.$inferSelect;
export type Anuncio = typeof anuncios.$inferSelect;
