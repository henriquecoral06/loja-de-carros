const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const numero = new Intl.NumberFormat("pt-BR");

export const moeda = (valor: number) => brl.format(valor);
export const km = (valor: number) => `${numero.format(valor)} km`;
export const inteiro = (valor: number) => numero.format(valor);

/** "2021/2022", ou só "2022" quando fabricação e modelo coincidem. */
export const anos = (fabricacao: number, modelo: number) =>
  fabricacao === modelo ? String(modelo) : `${fabricacao}/${modelo}`;

export function tempoRelativo(ms: number, agora = Date.now()) {
  const dias = Math.floor((agora - ms) / 86_400_000);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 30) return `há ${dias} dias`;
  const meses = Math.floor(dias / 30);
  if (meses < 12) return meses === 1 ? "há 1 mês" : `há ${meses} meses`;
  const anosPassados = Math.floor(meses / 12);
  return anosPassados === 1 ? "há 1 ano" : `há ${anosPassados} anos`;
}

export const apenasDigitos = (texto: string) => texto.replace(/\D/g, "");

/** (11) 98765-4321 — ou +351 912345678 quando o DDI não é do Brasil. */
export function telefone(numeroTelefone: string, ddi = "55") {
  const d = apenasDigitos(numeroTelefone).replace(/^55(?=\d{10,11}$)/, "");
  if (ddi !== "55") return `+${ddi} ${d}`;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return numeroTelefone;
}

/** Número internacional só com dígitos (5548999990000), como wa.me e tel: esperam. */
export function internacional(numeroTelefone: string, ddi = "55") {
  const d = apenasDigitos(numeroTelefone);
  if (!d) return "";
  // Número digitado já com o DDI na frente.
  if (d.startsWith(ddi) && d.length > 11) return d;
  return `${ddi}${d}`;
}

export function linkWhatsApp(numeroTelefone: string, mensagem: string, ddi = "55") {
  return `https://wa.me/${internacional(numeroTelefone, ddi)}?text=${encodeURIComponent(mensagem)}`;
}

export const linkTelefone = (numeroTelefone: string, ddi = "55") => `tel:+${internacional(numeroTelefone, ddi)}`;

/** Países mais comuns para o seletor de DDI. */
export const DDIS = [
  { ddi: "55", pais: "Brasil", bandeira: "🇧🇷" },
  { ddi: "351", pais: "Portugal", bandeira: "🇵🇹" },
  { ddi: "1", pais: "EUA/Canadá", bandeira: "🇺🇸" },
  { ddi: "54", pais: "Argentina", bandeira: "🇦🇷" },
  { ddi: "595", pais: "Paraguai", bandeira: "🇵🇾" },
  { ddi: "598", pais: "Uruguai", bandeira: "🇺🇾" },
  { ddi: "56", pais: "Chile", bandeira: "🇨🇱" },
] as const;

/** 16/09/2026, 08:34 */
export const dataHora = (ms: number) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(ms);

export const data = (ms: number) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" }).format(ms);

export function slugify(texto: string) {
  return texto
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** 30110000 → 30110-000 */
export const cep = (digitos: string) => (digitos.length === 8 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos);
