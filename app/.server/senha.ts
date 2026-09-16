/*
 * Hash de senha com PBKDF2-SHA256 via Web Crypto — nativo no Workers,
 * sem dependência nem serviço externo.
 *
 * 100.000 iterações é o TETO do workerd: acima disso o crypto.subtle
 * recusa. A OWASP recomenda 600.000 para SHA-256, então este valor é o
 * máximo que a plataforma permite, não o ideal. Como as iterações ficam
 * gravadas junto do hash, dá para migrar para outro algoritmo depois sem
 * invalidar as senhas existentes.
 */

const ALGORITMO = "pbkdf2-sha256";
const ITERACOES = 100_000;
const BYTES_SALT = 16;
const BITS_CHAVE = 256;

const paraBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const deBase64 = (texto: string) => Uint8Array.from(atob(texto), (c) => c.charCodeAt(0));

async function derivar(senha: string, salt: Uint8Array<ArrayBuffer>, iteracoes: number) {
  const chave = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(senha), "PBKDF2", false, ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: iteracoes }, chave, BITS_CHAVE,
  );
  return new Uint8Array(bits);
}

/** Comparação em tempo constante: não vaza, pelo tempo de resposta, quantos bytes bateram. */
function iguais(a: Uint8Array<ArrayBuffer>, b: Uint8Array<ArrayBuffer>) {
  if (a.length !== b.length) return false;
  let diferenca = 0;
  for (let i = 0; i < a.length; i++) diferenca |= a[i] ^ b[i];
  return diferenca === 0;
}

export async function gerarHash(senha: string) {
  const salt = crypto.getRandomValues(new Uint8Array(BYTES_SALT));
  const hash = await derivar(senha, salt, ITERACOES);
  return `${ALGORITMO}$${ITERACOES}$${paraBase64(salt)}$${paraBase64(hash)}`;
}

export async function conferirSenha(senha: string, armazenado: string) {
  const [algoritmo, iteracoes, salt, hash] = armazenado.split("$");
  if (algoritmo !== ALGORITMO || !iteracoes || !salt || !hash) return false;
  const calculado = await derivar(senha, deBase64(salt), Number(iteracoes));
  return iguais(calculado, deBase64(hash));
}

/**
 * Hash de uma senha que não existe, para gastar o mesmo tempo quando o
 * e-mail não está cadastrado. Sem isso a resposta mais rápida entrega
 * quais e-mails têm conta.
 */
export async function gastarTempoEquivalente(senha: string) {
  await derivar(senha, new Uint8Array(BYTES_SALT), ITERACOES);
}
