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

/** (11) 98765-4321 */
export function telefone(texto: string) {
  const d = apenasDigitos(texto).replace(/^55(?=\d{10,11}$)/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return texto;
}

/** Link do WhatsApp sempre com DDI 55, que é o que o wa.me exige. */
export function linkWhatsApp(numeroTelefone: string, mensagem: string) {
  let d = apenasDigitos(numeroTelefone);
  if (d.length <= 11) d = `55${d}`;
  return `https://wa.me/${d}?text=${encodeURIComponent(mensagem)}`;
}

export function slugify(texto: string) {
  return texto
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
