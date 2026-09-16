import { apenasDigitos } from "~/lib/formato";

export type ErrosMensagem = Partial<Record<"nome" | "email" | "telefone" | "texto", string>>;

const CAMPOS_RASTREIO = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid", "gbraid", "wbraid", "pagina_entrada", "referencia"];

/** Só chaves conhecidas e texto curto: o campo vem do navegador. */
function lerRastreio(valor: FormDataEntryValue | null): Record<string, string> {
  try {
    const bruto = JSON.parse(typeof valor === "string" && valor.length < 4000 ? valor : "{}") as Record<string, unknown>;
    return Object.fromEntries(CAMPOS_RASTREIO.filter((k) => typeof bruto[k] === "string" && bruto[k]).map((k) => [k, String(bruto[k]).slice(0, 200)]));
  } catch {
    return {};
  }
}

/** Validação única para a mensagem da página do carro e a da página de contato. */
export function validarMensagem(form: FormData) {
  const nome = String(form.get("nome") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const telefone = apenasDigitos(String(form.get("telefone") ?? ""));
  const texto = String(form.get("texto") ?? "").trim();

  const erros: ErrosMensagem = {};
  if (nome.length < 2) erros.nome = "Informe seu nome.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) erros.email = "Informe um e-mail válido.";
  if (telefone.length < 10 || telefone.length > 11) erros.telefone = "Informe o telefone com DDD.";
  if (texto.length < 5) erros.texto = "Escreva uma mensagem.";
  if (texto.length > 2000) erros.texto = "A mensagem pode ter até 2.000 caracteres.";
  if (Object.keys(erros).length) return { erros };

  const rastreio = lerRastreio(form.get("rastreio"));
  return { mensagem: { nome: nome.slice(0, 100), email: email.slice(0, 200), telefone, texto, rastreio: JSON.stringify(rastreio) }, rastreio };
}
