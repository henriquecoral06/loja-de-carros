// Gera seed/seed.sql com catálogo de marcas/modelos, anunciantes e
// anúncios de demonstração. Rode com `npm run db:seed`.
//
// As senhas usam o mesmo formato do servidor (PBKDF2-SHA256, 100.000
// iterações), então as contas de demonstração entram de verdade.
import { pbkdf2Sync, randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";

const SENHA_DEMO = "demo12345";

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

function hashSenha(senha) {
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(senha, salt, 100_000, 32, "sha256");
  return `pbkdf2-sha256$100000$${salt.toString("base64")}$${hash.toString("base64")}`;
}

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

// ---- anunciantes ----
const agora = Date.now();
const dia = 86_400_000;
const hash = hashSenha(SENHA_DEMO);
const anunciantes = [
  { id: randomUUID(), nome: "Marina Alves", email: "marina@demo.com", whatsapp: "11987654321", tipo: "particular", nomeLoja: null, cidade: "São Paulo", uf: "SP" },
  { id: randomUUID(), nome: "Roberto Lima", email: "loja@demo.com", whatsapp: "31998765432", tipo: "loja", nomeLoja: "Prime Veículos", cidade: "Belo Horizonte", uf: "MG" },
  { id: randomUUID(), nome: "Carla Souza", email: "sul@demo.com", whatsapp: "41991234567", tipo: "loja", nomeLoja: "Sul Seminovos", cidade: "Curitiba", uf: "PR" },
  { id: randomUUID(), nome: "Diego Rocha", email: "diego@demo.com", whatsapp: "21976543210", tipo: "particular", nomeLoja: null, cidade: "Rio de Janeiro", uf: "RJ" },
];
for (const u of anunciantes) {
  sql.push(`insert into usuarios (id, nome, email, senha_hash, whatsapp, tipo, nome_loja, cidade, uf, criado_em) values (${q(u.id)}, ${q(u.nome)}, ${q(u.email)}, ${q(hash)}, ${q(u.whatsapp)}, ${q(u.tipo)}, ${q(u.nomeLoja)}, ${q(u.cidade)}, ${q(u.uf)}, ${agora - 400 * dia});`);
}

// ---- anúncios ----
// [marca, modelo, versão, fab, mod, km, preço, câmbio, combustível, carroceria, cor, portas, índice do anunciante, opcionais]
const OPC_BASICO = ["Ar-condicionado", "Direção elétrica", "Vidros elétricos", "Travas elétricas", "Airbag", "Freios ABS"];
const OPC_COMPLETO = [...OPC_BASICO, "Central multimídia", "Apple CarPlay / Android Auto", "Câmera de ré", "Sensor de estacionamento", "Rodas de liga leve", "Controle de estabilidade"];
const OPC_TOPO = [...OPC_COMPLETO, "Banco de couro", "Piloto automático", "Faróis de LED", "Chave presencial", "Carregador por indução"];

const ANUNCIOS = [
  ["Toyota", "Corolla", "XEi 2.0 Flex CVT", 2022, 2023, 38200, 139900, "CVT", "Flex", "Sedã", "Prata", 4, 1, OPC_TOPO],
  ["Toyota", "Corolla Cross", "XRE 2.0 Flex CVT", 2023, 2024, 21500, 164900, "CVT", "Flex", "SUV", "Branco", 4, 2, OPC_TOPO],
  ["Toyota", "Hilux", "SRX 2.8 Diesel 4x4 Automático", 2021, 2022, 74300, 259900, "Automático", "Diesel", "Picape", "Preto", 4, 1, OPC_TOPO],
  ["Honda", "Civic", "EXL 2.0 Flex CVT", 2020, 2021, 52100, 124900, "CVT", "Flex", "Sedã", "Cinza", 4, 0, OPC_COMPLETO],
  ["Honda", "HR-V", "EXL 1.5 Turbo CVT", 2023, 2023, 19800, 159900, "CVT", "Gasolina", "SUV", "Vermelho", 4, 2, OPC_TOPO],
  ["Honda", "City", "Touring 1.5 CVT", 2022, 2022, 33600, 112900, "CVT", "Flex", "Sedã", "Branco", 4, 3, OPC_COMPLETO],
  ["Volkswagen", "Polo", "Highline 200 TSI Automático", 2021, 2022, 41200, 94900, "Automático", "Flex", "Hatch", "Azul", 4, 0, OPC_COMPLETO],
  ["Volkswagen", "T-Cross", "Comfortline 200 TSI Automático", 2022, 2023, 29400, 124900, "Automático", "Flex", "SUV", "Branco", 4, 1, OPC_COMPLETO],
  ["Volkswagen", "Nivus", "Highline 200 TSI Automático", 2023, 2024, 12900, 139900, "Automático", "Flex", "SUV", "Cinza", 4, 2, OPC_TOPO],
  ["Volkswagen", "Amarok", "Highline 3.0 V6 Diesel 4x4", 2020, 2021, 88700, 229900, "Automático", "Diesel", "Picape", "Prata", 4, 1, OPC_TOPO],
  ["Volkswagen", "Gol", "1.0 MPI", 2019, 2020, 67400, 49900, "Manual", "Flex", "Hatch", "Prata", 4, 3, OPC_BASICO],
  ["Chevrolet", "Onix", "LTZ 1.0 Turbo Automático", 2022, 2023, 27800, 89900, "Automático", "Flex", "Hatch", "Vermelho", 4, 0, OPC_COMPLETO],
  ["Chevrolet", "Tracker", "Premier 1.2 Turbo Automático", 2023, 2024, 15200, 144900, "Automático", "Flex", "SUV", "Preto", 4, 2, OPC_TOPO],
  ["Chevrolet", "S10", "High Country 2.8 Diesel 4x4", 2021, 2022, 61900, 219900, "Automático", "Diesel", "Picape", "Branco", 4, 1, OPC_TOPO],
  ["Fiat", "Strada", "Volcano 1.3 CD CVT", 2023, 2024, 18400, 119900, "CVT", "Flex", "Picape", "Cinza", 4, 3, OPC_COMPLETO],
  ["Fiat", "Pulse", "Impetus 1.0 Turbo Automático", 2022, 2023, 30100, 109900, "Automático", "Flex", "SUV", "Branco", 4, 2, OPC_COMPLETO],
  ["Fiat", "Toro", "Ultra 2.0 Diesel 4x4", 2021, 2022, 71200, 164900, "Automático", "Diesel", "Picape", "Vermelho", 4, 1, OPC_TOPO],
  ["Fiat", "Mobi", "Like 1.0", 2021, 2022, 39800, 54900, "Manual", "Flex", "Hatch", "Branco", 4, 0, OPC_BASICO],
  ["Jeep", "Compass", "Limited 1.3 Turbo Automático", 2022, 2023, 36500, 169900, "Automático", "Flex", "SUV", "Preto", 4, 1, OPC_TOPO],
  ["Jeep", "Renegade", "Longitude 1.3 Turbo Automático", 2021, 2022, 44800, 114900, "Automático", "Flex", "SUV", "Verde", 4, 3, OPC_COMPLETO],
  ["Hyundai", "HB20", "Platinum 1.0 Turbo Automático", 2023, 2023, 22700, 94900, "Automático", "Flex", "Hatch", "Azul", 4, 0, OPC_COMPLETO],
  ["Hyundai", "Creta", "Limited 1.0 Turbo Automático", 2022, 2023, 33100, 129900, "Automático", "Flex", "SUV", "Prata", 4, 2, OPC_TOPO],
  ["Renault", "Duster", "Iconic 1.3 Turbo CVT", 2022, 2023, 28900, 119900, "CVT", "Flex", "SUV", "Laranja", 4, 2, OPC_COMPLETO],
  ["Renault", "Kwid", "Zen 1.0", 2022, 2023, 24100, 57900, "Manual", "Flex", "Hatch", "Branco", 4, 3, OPC_BASICO],
  ["Nissan", "Kicks", "Exclusive 1.6 CVT", 2021, 2022, 47600, 104900, "CVT", "Flex", "SUV", "Cinza", 4, 0, OPC_COMPLETO],
  ["BYD", "Dolphin", "EV 95 cv", 2024, 2024, 8200, 139900, "Automático", "Elétrico", "Hatch", "Branco", 4, 2, OPC_TOPO],
  ["BYD", "Song Plus", "DM-i Premium Híbrido", 2024, 2025, 6100, 219900, "Automático", "Híbrido", "SUV", "Preto", 4, 1, OPC_TOPO],
  ["BMW", "320i", "M Sport 2.0 Turbo", 2021, 2022, 39400, 249900, "Automático", "Gasolina", "Sedã", "Azul", 4, 1, OPC_TOPO],
  ["Mercedes-Benz", "GLA", "200 Advance 1.3 Turbo", 2022, 2022, 31800, 239900, "Automático", "Gasolina", "SUV", "Branco", 4, 2, OPC_TOPO],
  ["Ford", "Ranger", "Limited 3.0 V6 Diesel 4x4", 2024, 2024, 14900, 319900, "Automático", "Diesel", "Picape", "Cinza", 4, 1, OPC_TOPO],
  ["Peugeot", "208", "Griffe 1.0 Turbo CVT", 2023, 2024, 17300, 104900, "CVT", "Flex", "Hatch", "Cinza", 4, 3, OPC_COMPLETO],
  ["Mitsubishi", "L200 Triton", "Sport HPE-S 2.4 Diesel 4x4", 2020, 2021, 96400, 189900, "Automático", "Diesel", "Picape", "Prata", 4, 0, OPC_COMPLETO],
];

const DESCRICOES = [
  "Único dono, todas as revisões feitas na concessionária. Manual e chave reserva. IPVA pago.",
  "Carro muito bem conservado, pneus novos e laudo cautelar aprovado. Aceito troca por modelo de menor valor.",
  "Revisado, sem detalhes de funilaria. Garantia de motor e câmbio. Financiamento facilitado.",
  "Veículo de garagem, uso apenas urbano. Documentação em dia, pronto para transferência.",
];

ANUNCIOS.forEach(([marca, modelo, versao, fab, mod, kmRodado, preco, cambio, combustivel, carroceria, cor, portas, idx, opc], i) => {
  const vendedor = anunciantes[idx];
  const id = randomUUID();
  const slug = `${slugify(`${marca} ${modelo} ${versao} ${mod}`).slice(0, 70)}-${curto()}`;
  const criado = agora - (i * 1.3 + 0.2) * dia;
  sql.push(`insert into anuncios (id, slug, usuario_id, marca_id, modelo_id, versao, ano_fabricacao, ano_modelo, km, preco, cambio, combustivel, carroceria, cor, portas, opcionais, descricao, cidade, uf, status, visualizacoes, criado_em, atualizado_em) values (${q(id)}, ${q(slug)}, ${q(vendedor.id)}, ${idsMarca[marca]}, ${idsModelo[`${marca}|${modelo}`]}, ${q(versao)}, ${fab}, ${mod}, ${kmRodado}, ${preco}, ${q(cambio)}, ${q(combustivel)}, ${q(carroceria)}, ${q(cor)}, ${portas}, ${q(JSON.stringify(opc))}, ${q(DESCRICOES[i % DESCRICOES.length])}, ${q(vendedor.cidade)}, ${q(vendedor.uf)}, 'ativo', ${Math.floor(20 + ((i * 37) % 400))}, ${Math.round(criado)}, ${Math.round(criado)});`);
});

mkdirSync("seed", { recursive: true });
writeFileSync("seed/seed.sql", sql.join("\n") + "\n");
console.log(`seed/seed.sql: ${Object.keys(CATALOGO).length} marcas, ${proximoModelo - 1} modelos, ${anunciantes.length} anunciantes, ${ANUNCIOS.length} anúncios. Senha das contas: ${SENHA_DEMO}`);
