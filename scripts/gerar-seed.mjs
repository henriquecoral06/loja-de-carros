// Gera seed/seed.sql com catálogo de marcas/modelos, dados da loja e um
// exemplo de cada: um carro e um lead. Rode com `npm run db:seed`.
//
// Não cria conta de acesso: quem abrir /admin primeiro cria a sua e vira
// o administrador (ver app/routes/admin/entrar.tsx).
import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";


const CATALOGO = {
  Audi: ["A3", "A4", "Q3", "Q5", "Q7"],
  BMW: ["320i", "X1", "X3", "X5"],
  BYD: ["Dolphin", "Dolphin Mini", "Song Plus", "Seal", "King"],
  "CAOA Chery": ["Tiggo 5X", "Tiggo 7", "Tiggo 8", "Arrizo 6"],
  Chevrolet: ["Onix", "Onix Plus", "Tracker", "Spin", "S10", "Montana", "Cruze", "Equinox"],
  Citroën: ["C3", "C4 Cactus", "Aircross", "Basalt"],
  Fiat: ["Argo", "Cronos", "Mobi", "Pulse", "Fastback", "Strada", "Toro", "Uno"],
  Ford: ["Ka", "EcoSport", "Ranger", "Territory", "Bronco Sport", "Maverick"],
  GWM: ["Haval H6", "Ora 03"],
  Honda: ["Civic", "City", "Fit", "HR-V", "WR-V", "CR-V"],
  Hyundai: ["HB20", "HB20S", "Creta", "Tucson"],
  Jeep: ["Renegade", "Compass", "Commander", "Wrangler"],
  Kia: ["Sportage", "Cerato", "Seltos"],
  "Land Rover": ["Range Rover Evoque", "Discovery Sport", "Defender"],
  "Mercedes-Benz": ["Classe A", "Classe C", "GLA", "GLC"],
  Mitsubishi: ["L200 Triton", "Pajero Sport", "Eclipse Cross"],
  Nissan: ["Kicks", "Versa", "Sentra", "Frontier"],
  Peugeot: ["208", "2008", "3008"],
  Porsche: ["Macan", "Cayenne", "911"],
  RAM: ["Rampage", "1500"],
  Renault: ["Kwid", "Sandero", "Logan", "Duster", "Captur", "Oroch"],
  Toyota: ["Corolla", "Corolla Cross", "Hilux", "Yaris", "SW4", "RAV4"],
  Volkswagen: ["Gol", "Polo", "Virtus", "T-Cross", "Nivus", "Taos", "Saveiro", "Amarok", "Jetta"],
  Volvo: ["XC40", "XC60", "XC90"],
};

const slugify = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const q = (v) => (v === null || v === undefined ? "null" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const curto = () => randomBytes(5).toString("hex").slice(0, 8);


const sql = ["-- Gerado por scripts/gerar-seed.mjs. Não edite à mão.", "PRAGMA foreign_keys = ON;"];

// ---- catálogo ----
const idsMarca = {};
const idsModelo = {};
let proximaMarca = 1, proximoModelo = 1;
for (const [marca, lista] of Object.entries(CATALOGO)) {
  idsMarca[marca] = proximaMarca++;
  sql.push(`insert into marcas (id, nome, slug) values (${idsMarca[marca]}, ${q(marca)}, ${q(slugify(marca))});`);
  for (const modelo of lista) {
    idsModelo[`${marca}|${modelo}`] = proximoModelo++;
    sql.push(`insert into modelos (id, marca_id, nome, slug) values (${idsModelo[`${marca}|${modelo}`]}, ${idsMarca[marca]}, ${q(modelo)}, ${q(slugify(modelo))});`);
  }
}

// ---- loja e equipe ----
const agora = Date.now();
const dia = 86_400_000;
sql.push(`insert into loja (id, nome, slogan, sobre, cnpj, whatsapp_ddi, whatsapp, telefone_ddi, telefone, email, endereco, bairro, cidade, uf, cep, horario, instagram, hero_titulo, hero_subtitulo, texto_venda_carro, whatsapp_mensagem, atualizado_em) values (1, ${q("Prime Veículos")}, ${q("Seminovos com procedência e garantia")}, ${q("Há mais de 15 anos vendendo carros revisados, com laudo cautelar e garantia.\n\nAceitamos seu usado na troca e facilitamos o financiamento com os principais bancos.")}, ${q("00.000.000/0001-00")}, '55', ${q("31998765432")}, '55', ${q("3134567890")}, ${q("contato@primeveiculos.com.br")}, ${q("Av. do Contorno, 5000")}, ${q("Funcionários")}, ${q("Belo Horizonte")}, ${q("MG")}, ${q("30110000")}, ${q("Segunda a sexta, 8h às 18h · Sábado, 8h às 13h")}, ${q("https://instagram.com/primeveiculos")}, ${q("Seminovos com procedência e garantia")}, '', ${q("Compramos seu carro com avaliação justa e pagamento rápido. Se preferir, use o valor como entrada em um carro do nosso estoque.")}, ${q("Olá! Vim pelo site e gostaria de mais informações.")}, ${agora});`);

// ---- anúncio de exemplo ----
// [marca, modelo, versão, fab, mod, km, preço, câmbio, combustível, carroceria, cor, portas, destaque, opcionais]
const OPC_BASICO = ["Ar-condicionado", "Direção elétrica", "Vidros elétricos", "Travas elétricas", "Airbag", "Freios ABS"];
const OPC_COMPLETO = [...OPC_BASICO, "Central multimídia", "Apple CarPlay / Android Auto", "Câmera de ré", "Sensor de estacionamento", "Rodas de liga leve", "Controle de estabilidade"];
const OPC_TOPO = [...OPC_COMPLETO, "Banco de couro", "Piloto automático", "Faróis de LED", "Chave presencial", "Carregador por indução"];

const ANUNCIOS = [
  ["Toyota", "Corolla", "XEi 2.0 Flex CVT", 2022, 2023, 38200, 139900, "CVT", "Flex", "Sedã", "Prata", 4, true, OPC_TOPO],
];

/*
 * Fotos de demonstração do Unsplash (licença livre, uso comercial
 * permitido, sem atribuição obrigatória). Escolhidas por carroceria e cor
 * parecidas com cada carro — não são fotos do veículo anunciado. Ficam
 * como URL externa: não ocupam o R2 e somem quando a loja troca pelas
 * fotos reais no painel.
 */
const unsplash = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&h=1200&q=75`;
const FOTOS = {
  "Corolla": "1638618164682-12b986ec2a75", "Civic": "1674719645138-c3fd1aaf8307", "City": "1706495227612-fde52c357c69",
  "320i": "1546614042-7df3c24c9e5d", "Corolla Cross": "1634682056897-5b3f43fb2e7a", "HR-V": "1607853554251-bd2eed4145da",
  "T-Cross": "1606611013016-969c19ba27bb", "Nivus": "1726708133821-a10e4c89d3db", "Tracker": "1700884520248-92092bd21e63",
  "Pulse": "1653813893853-be3e6ecfe061", "Compass": "1615063029891-497bebd4f03c", "Renegade": "1718762395094-fa40f65a88e8",
  "Creta": "1694649686884-0d62d0dc47d1", "Duster": "1650959818516-03d68079f9a0", "Kicks": "1531181616225-f8e50c1ab53e",
  "Song Plus": "1705624843697-4461f9dce482", "GLA": "1692970093810-e47f696b37ed", "Polo": "1541899481282-d53bffe3c35d",
  "Gol": "1714225317039-d685f0e1cd38", "Onix": "1610768207795-72169abdf0d4", "Mobi": "1624543345260-c1f7ad0b7be6",
  "HB20": "1573899754191-bd20f600141c", "Kwid": "1655288115919-7f8b6480ce53", "Dolphin": "1601057319429-db0ea69e0307",
  "208": "1655285142221-2ecd4a91776f", "Hilux": "1732076064630-69b5bdf4fdf4", "Amarok": "1649793395985-967862a3b73f",
  "S10": "1628464682320-6a9ae020cb2b", "Strada": "1588814928518-238716568ef4", "Toro": "1624339024061-b435d9261c1d",
  "Ranger": "1636882441787-d9ac4ea22637", "L200 Triton": "1676067926577-e65f135e7799",
};
const INTERIORES = ["1625690180114-5530b1304127", "1660374703904-b26c6b594e04", "1592570714618-15e2d4719c6c"];
const INTERIOR_PICAPE = "1610647752706-3bb12232b3ab";

const DESCRICOES = [
  "Único dono, todas as revisões feitas na concessionária. Manual e chave reserva. IPVA pago.",
  "Carro muito bem conservado, pneus novos e laudo cautelar aprovado. Aceito troca por modelo de menor valor.",
  "Revisado, sem detalhes de funilaria. Garantia de motor e câmbio. Financiamento facilitado.",
  "Veículo de garagem, uso apenas urbano. Documentação em dia, pronto para transferência.",
];

const ids = [];
ANUNCIOS.forEach(([marca, modelo, versao, fab, mod, kmRodado, preco, cambio, combustivel, carroceria, cor, portas, destaque, opc], i) => {
  const id = randomUUID();
  const slug = `${slugify(`${marca} ${modelo} ${versao} ${mod}`).slice(0, 70)}-${curto()}`;
  const criado = agora - (i * 1.3 + 0.2) * dia;
  const vendedor = null;
  ids.push({ id, slug, marca, modelo, versao, mod, preco, vendedor });
  sql.push(`insert into anuncios (id, codigo, slug, vendedor_id, marca_id, modelo_id, versao, ano_fabricacao, ano_modelo, km, preco, cambio, combustivel, carroceria, cor, portas, opcionais, descricao, destaque, status, visualizacoes, criado_por, criado_em, atualizado_em) values (${q(id)}, ${i + 1}, ${q(slug)}, ${q(vendedor)}, ${idsMarca[marca]}, ${idsModelo[`${marca}|${modelo}`]}, ${q(versao)}, ${fab}, ${mod}, ${kmRodado}, ${preco}, ${q(cambio)}, ${q(combustivel)}, ${q(carroceria)}, ${q(cor)}, ${portas}, ${q(JSON.stringify(opc))}, ${q(DESCRICOES[i % DESCRICOES.length])}, ${destaque ? 1 : 0}, 'ativo', ${Math.floor(20 + ((i * 37) % 400))}, null, ${Math.round(criado)}, ${Math.round(criado)});`);

  const fotos = [FOTOS[modelo], carroceria === "Picape" ? INTERIOR_PICAPE : INTERIORES[i % INTERIORES.length]];
  if (!FOTOS[modelo]) throw new Error(`Sem foto para ${modelo}`);
  fotos.forEach((foto, ordem) => {
    sql.push(`insert into fotos (id, anuncio_id, chave, ordem, criado_em) values (${q(randomUUID())}, ${q(id)}, ${q(unsplash(foto))}, ${ordem}, ${Math.round(criado)});`);
  });
});

// ---- lead de exemplo ----
const LEADS = [
  { nome: "Rafael Souza (exemplo)", telefone: "31988112233", email: "rafael@email.com", carro: "Corolla", origem: "veiculo", status: "novo", texto: "Olá, o Corolla ainda está disponível? Posso ver no sábado?", horas: 3 },
];
LEADS.forEach((l) => {
  const carro = l.carro ? ids.find((x) => x.modelo === l.carro) : null;
  const criado = agora - l.horas * 3_600_000;
  sql.push(`insert into leads (id, anuncio_id, landing_page_id, vendedor_id, origem, nome, email, telefone, texto, status, notas, rastreio, criado_em, atualizado_em) values (${q(randomUUID())}, ${q(carro?.id)}, null, ${q(carro?.vendedor)}, ${q(l.origem)}, ${q(l.nome)}, ${q(l.email)}, ${q(l.telefone)}, ${q(l.texto)}, ${q(l.status)}, ${q(l.notas ?? "")}, ${q(JSON.stringify(l.rastreio ?? {}))}, ${criado}, ${criado});`);
});

mkdirSync("seed", { recursive: true });
writeFileSync("seed/seed.sql", sql.join("\n") + "\n");
console.log(`seed/seed.sql: ${Object.keys(CATALOGO).length} marcas, ${proximoModelo - 1} modelos, ${ANUNCIOS.length} carro e ${LEADS.length} lead de exemplo. Sem conta de acesso: o primeiro a abrir /admin cria a sua.`);
