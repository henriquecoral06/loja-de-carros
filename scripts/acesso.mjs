/**
 * Cria um acesso ao painel ou redefine a senha de um existente, direto no D1.
 * Serve para o primeiro acesso em produção e para quem esqueceu a senha.
 *
 *   node scripts/acesso.mjs email@loja.com "Nome da pessoa" --local
 *   node scripts/acesso.mjs email@loja.com "Nome da pessoa" --remote
 *
 * A senha é pedida no terminal e não fica no histórico do shell.
 */
import { execFileSync } from "node:child_process";
import { pbkdf2Sync, randomBytes, randomUUID } from "node:crypto";
import { createInterface } from "node:readline";

const [email, nome, destino] = process.argv.slice(2);
if (!email || !nome || !["--local", "--remote"].includes(destino)) {
  console.error('Uso: node scripts/acesso.mjs email@loja.com "Nome" --local|--remote');
  process.exit(1);
}

// Digitação escondida no terminal; aceita também a senha por pipe.
process.stdout.write("Senha (mínimo 8 caracteres): ");
const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: Boolean(process.stdin.isTTY) });
rl._writeToOutput = () => {};
const senha = await new Promise((ok) => rl.question("", (r) => { rl.close(); process.stdout.write("\n"); ok(r); }));
if (senha.length < 8) {
  console.error("Senha curta demais.");
  process.exit(1);
}

// Mesmo formato de app/.server/senha.ts.
const salt = randomBytes(16);
const hash = pbkdf2Sync(senha, salt, 100_000, 32, "sha256");
const senhaHash = `pbkdf2-sha256$100000$${salt.toString("base64")}$${hash.toString("base64")}`;
const aspas = (t) => `'${String(t).replace(/'/g, "''")}'`;

const sql = [
  `insert into usuarios (id, nome, email, senha_hash, criado_em) values (${aspas(randomUUID())}, ${aspas(nome)}, ${aspas(email.trim().toLowerCase())}, ${aspas(senhaHash)}, ${Date.now()})`,
  `on conflict(email) do update set senha_hash = excluded.senha_hash, nome = excluded.nome;`,
  // Senha nova derruba as sessões abertas com a antiga.
  `delete from sessoes where usuario_id = (select id from usuarios where email = ${aspas(email.trim().toLowerCase())});`,
].join(" ");

execFileSync("npx", ["wrangler", "d1", "execute", "DB", destino, "--command", sql], { stdio: "inherit" });
console.log(`Acesso pronto para ${email}.`);
