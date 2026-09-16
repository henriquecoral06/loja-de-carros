import { env } from "cloudflare:workers";
import { and, eq, ne } from "drizzle-orm";
import { createCookie, createSessionStorage, redirect } from "react-router";
import { db, schema } from "./db";

const DURACAO_MS = 1000 * 60 * 60 * 24 * 30;

const paraHex = (buffer: ArrayBuffer) =>
  [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");

/** O cookie carrega o token; o banco guarda só o hash dele. */
async function hashToken(token: string) {
  return paraHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)));
}

function novoToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

type DadosSessao = { usuarioId: string };

let armazenamento: ReturnType<typeof criar> | undefined;

function criar() {
  const cookie = createCookie("sessao", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    // localhost é contexto seguro nos navegadores, mas o dev server serve
    // em http; só exige Secure fora do desenvolvimento.
    secure: !import.meta.env.DEV,
    maxAge: DURACAO_MS / 1000,
    secrets: [env.SESSION_SECRET],
  });

  return createSessionStorage<DadosSessao>({
    cookie,
    async createData(dados, expira) {
      const token = novoToken();
      await db.insert(schema.sessoes).values({
        id: await hashToken(token),
        usuarioId: dados.usuarioId ?? null,
        dados: JSON.stringify(dados),
        expiraEm: (expira ?? new Date(Date.now() + DURACAO_MS)).getTime(),
      });
      return token;
    },
    async readData(token) {
      const [linha] = await db.select().from(schema.sessoes)
        .where(eq(schema.sessoes.id, await hashToken(token))).limit(1);
      if (!linha || linha.expiraEm < Date.now()) return null;
      return JSON.parse(linha.dados) as DadosSessao;
    },
    async updateData(token, dados, expira) {
      await db.update(schema.sessoes).set({
        usuarioId: dados.usuarioId ?? null,
        dados: JSON.stringify(dados),
        expiraEm: (expira ?? new Date(Date.now() + DURACAO_MS)).getTime(),
      }).where(eq(schema.sessoes.id, await hashToken(token)));
    },
    async deleteData(token) {
      await db.delete(schema.sessoes).where(eq(schema.sessoes.id, await hashToken(token)));
    },
  });
}

/** Criado sob demanda: o segredo vem do ambiente da requisição. */
const sessoes = () => (armazenamento ??= criar());

export type UsuarioLogado = { id: string; nome: string; email: string };

export async function obterUsuario(request: Request): Promise<UsuarioLogado | null> {
  const sessao = await sessoes().getSession(request.headers.get("Cookie"));
  const usuarioId = sessao.get("usuarioId");
  if (!usuarioId) return null;

  const [usuario] = await db.select({
    id: schema.usuarios.id, nome: schema.usuarios.nome, email: schema.usuarios.email,
  }).from(schema.usuarios).where(eq(schema.usuarios.id, usuarioId)).limit(1);

  return usuario ?? null;
}

/**
 * Caminho que a pessoa vê, a partir da URL da requisição. Na navegação
 * pelo cliente o React Router pede os dados em `/rota.data` (e `/_root.data`
 * para a raiz), com `_routes` na query. Sem normalizar, o "voltar" do
 * login levava para essa resposta de dados crua em vez da página.
 */
function caminhoVisivel(request: Request) {
  const url = new URL(request.url);
  let caminho = url.pathname === "/_root.data" ? "/" : url.pathname.replace(/\.data$/, "");
  url.searchParams.delete("_routes");
  const qs = url.searchParams.toString();
  return `${caminho}${qs ? `?${qs}` : ""}`;
}

/** Para rotas do admin: sem sessão, manda para o login e volta depois. */
export async function exigirUsuario(request: Request) {
  const usuario = await obterUsuario(request);
  if (!usuario) throw redirect(`/admin/entrar?voltar=${encodeURIComponent(caminhoVisivel(request))}`);
  return usuario;
}

/**
 * Sempre uma sessão nova no login, nunca reaproveitar a do cookie: evita
 * fixação de sessão, em que alguém planta um id conhecido antes do login.
 */
export async function iniciarSessao(usuarioId: string, destino: string) {
  const sessao = await sessoes().getSession();
  sessao.set("usuarioId", usuarioId);
  return redirect(destino, { headers: { "Set-Cookie": await sessoes().commitSession(sessao) } });
}

export async function encerrarSessao(request: Request) {
  const sessao = await sessoes().getSession(request.headers.get("Cookie"));
  return redirect("/admin/entrar", { headers: { "Set-Cookie": await sessoes().destroySession(sessao) } });
}

/** Destino de "voltar" só pode ser caminho interno: impede redirecionamento aberto. */
export function destinoSeguro(valor: FormDataEntryValue | string | null, padrao = "/admin") {
  const texto = typeof valor === "string" ? valor : "";
  // "//evil.com" e "/\evil.com" são tratados como outro domínio pelo navegador.
  if (!texto.startsWith("/") || texto.startsWith("//") || texto.startsWith("/\\")) return padrao;
  return texto.replace(/\.data(?=$|\?)/, "");
}

/**
 * Encerra as sessões do usuário em outros aparelhos, mantendo a atual.
 * Usado na troca de senha: quem entrou com a senha antiga cai, mas quem
 * acabou de trocar continua conectado e vê a confirmação.
 */
export async function encerrarOutrasSessoes(request: Request, usuarioId: string) {
  const sessao = await sessoes().getSession(request.headers.get("Cookie"));
  const atual = sessao.id ? await hashToken(sessao.id) : "";
  await db.delete(schema.sessoes).where(and(eq(schema.sessoes.usuarioId, usuarioId), ne(schema.sessoes.id, atual)));
}
