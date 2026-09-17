const hex = (buffer: ArrayBuffer) => [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");

export const sha256Hex = async (texto: string) => hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto)));

/** Token aleatório de 32 bytes, legível em URL. */
export function novoToken(prefixo: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `${prefixo}_${btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
}

/** Comparação em tempo constante de dois hex do mesmo tamanho. */
export function iguais(a: string, b: string) {
  if (!a || a.length !== b.length) return false;
  let diferenca = 0;
  for (let i = 0; i < a.length; i++) diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferenca === 0;
}
