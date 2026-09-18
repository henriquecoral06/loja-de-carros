import { count, eq, sql } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { data, Form, Link, redirect, useNavigation, useSearchParams } from "react-router";
import { db, schema } from "~/.server/db";
import { conferirSenha, gastarTempoEquivalente, gerarHash } from "~/.server/senha";
import { destinoSeguro, iniciarSessao, obterUsuario } from "~/.server/sessao";
import { dentroDoLimite, exigirMesmaOrigem, ipDe } from "~/.server/seguranca";
import { CampoTexto } from "~/components/Campo";
import { lojaDasRotas } from "~/lib/site";
import { useLoja } from "~/lib/useLoja";
import type { Route } from "./+types/entrar";

/** Sem nenhum acesso cadastrado, a tela vira "criar o primeiro acesso". */
async function semAcessos() {
  const [{ n }] = await db.select({ n: count() }).from(schema.usuarios);
  return n === 0;
}

export async function loader({ request }: Route.LoaderArgs) {
  if (await obterUsuario(request)) throw redirect("/admin");
  return { primeiroAcesso: await semAcessos() };
}

type Erros = Partial<Record<"nome" | "email" | "senha" | "confirmar", string>>;

/**
 * Primeiro acesso: quem abre o painel numa loja sem nenhuma conta cria a
 * sua e vira o administrador. Depois disso, novos acessos só são criados
 * por quem já entrou (Configurações → Acessos).
 */
async function criarPrimeiroAcesso(form: FormData) {
  const nome = String(form.get("nome") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const senha = String(form.get("senha") ?? "");
  const erros: Erros = {};
  if (nome.length < 2 || nome.length > 80) erros.nome = "Informe seu nome.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) erros.email = "E-mail inválido.";
  if (senha.length < 8) erros.senha = "Use pelo menos 8 caracteres.";
  else if (senha !== String(form.get("confirmar") ?? "")) erros.confirmar = "As senhas não são iguais.";
  if (Object.keys(erros).length) return data({ erros }, { status: 400 });

  // Grava só se a tabela ainda estiver vazia, numa única instrução: duas
  // pessoas ao mesmo tempo não conseguem virar administrador.
  const id = crypto.randomUUID();
  const senhaHash = await gerarHash(senha);
  const r = await db.run(sql`insert into usuarios (id, nome, email, senha_hash, criado_em)
    select ${id}, ${nome}, ${email}, ${senhaHash}, ${Date.now()} where not exists (select 1 from usuarios)`);
  if (!r.meta.changes) return data({ erro: "O primeiro acesso já foi criado. Entre com seu e-mail e senha.", jaExiste: true }, { status: 409 });
  return iniciarSessao(id, "/admin/configuracoes?bem-vindo=1");
}

export function meta({ matches }: Route.MetaArgs) {
  return [{ title: `Entrar · ${lojaDasRotas(matches).nome}` }, { name: "robots", content: "noindex" }];
}

export async function action({ request }: Route.ActionArgs) {
  exigirMesmaOrigem(request);
  const form = await request.formData();
  if (form.get("intencao") === "primeiro-acesso") {
    if (!(await dentroDoLimite(`primeiro-acesso:${ipDe(request)}`, 10, 900_000))) {
      return data({ erro: "Muitas tentativas. Aguarde 15 minutos e tente de novo." }, { status: 429 });
    }
    return criarPrimeiroAcesso(form);
  }
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const senha = String(form.get("senha") ?? "");

  // Dois limites: por IP barra varredura de muitas contas; por e-mail
  // barra força bruta distribuída contra uma conta só.
  const ip = ipDe(request);
  if (!(await dentroDoLimite(`login:${ip}`, 20, 900_000)) || !(await dentroDoLimite(`login-email:${email}`, 8, 900_000))) {
    return data({ erro: "Muitas tentativas. Aguarde 15 minutos e tente de novo." }, { status: 429 });
  }

  const [usuario] = await db.select({ id: schema.usuarios.id, senhaHash: schema.usuarios.senhaHash })
    .from(schema.usuarios).where(eq(schema.usuarios.email, email)).limit(1);

  const valida = usuario ? await conferirSenha(senha, usuario.senhaHash) : (await gastarTempoEquivalente(senha), false);
  // Mesma mensagem nos dois casos: não conta se o e-mail tem conta.
  if (!usuario || !valida) return data({ erro: "E-mail ou senha incorretos." }, { status: 400 });

  return iniciarSessao(usuario.id, destinoSeguro(form.get("voltar")));
}

export default function Entrar({ loaderData, actionData }: Route.ComponentProps) {
  const loja = useLoja();
  const resposta = actionData as { erro?: string; erros?: Erros; jaExiste?: boolean } | undefined;
  const primeiroAcesso = loaderData.primeiroAcesso && !resposta?.jaExiste;
  const erros = resposta?.erros ?? {};
  const [params] = useSearchParams();
  const navigation = useNavigation();
  const enviando = navigation.state === "submitting";

  return (
    <main className="grid flex-1 place-items-center bg-noite px-4 py-14">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-6 shadow-flutuante sm:p-8">
          {loja.logo
            ? <img src={loja.logo} alt={loja.nome} className="mb-5 h-10 max-w-[220px] object-contain" />
            : <p className="text-sm font-semibold uppercase tracking-[0.12em] text-marca-700">{loja.nome}</p>}
          {primeiroAcesso ? (
            <>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-tinta">Crie seu acesso</h1>
              <p className="mt-1 text-suave">É o primeiro acesso ao painel: esta conta será a do administrador. Depois, você cria acessos para a equipe em Configurações.</p>
              <Form method="post" className="mt-6 grid gap-4">
                <input type="hidden" name="intencao" value="primeiro-acesso" />
                <CampoTexto id="nome" rotulo="Seu nome" autoComplete="name" required autoFocus maxLength={80} erro={erros.nome} />
                <CampoTexto id="email" rotulo="E-mail" type="email" autoComplete="email" required erro={erros.email} />
                <CampoTexto id="senha" rotulo="Senha" type="password" autoComplete="new-password" required minLength={8} erro={erros.senha} dica="Pelo menos 8 caracteres." />
                <CampoTexto id="confirmar" rotulo="Repita a senha" type="password" autoComplete="new-password" required erro={erros.confirmar} />
                {resposta?.erro && <p role="alert" className="rounded-lg bg-erro-fundo px-3 py-2.5 text-sm text-erro">{resposta.erro}</p>}
                <button type="submit" disabled={enviando} className="botao-primario mt-1 w-full">
                  {enviando ? "Criando…" : "Criar acesso e entrar"}
                </button>
              </Form>
            </>
          ) : (<>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-tinta">Entrar no painel</h1>
          <p className="mt-1 text-suave">Acesso restrito à equipe da loja.</p>
          {resposta?.jaExiste && <p role="status" className="mt-4 rounded-lg bg-alerta-fundo px-3 py-2.5 text-sm text-alerta">{resposta.erro}</p>}

          <Form method="post" className="mt-6 grid gap-4">
            <input type="hidden" name="voltar" value={params.get("voltar") ?? ""} />
            <CampoTexto id="email" rotulo="E-mail" type="email" autoComplete="email" required autoFocus />
            <CampoTexto id="senha" rotulo="Senha" type="password" autoComplete="current-password" required />
            {resposta?.erro && !resposta.jaExiste && <p role="alert" className="rounded-lg bg-erro-fundo px-3 py-2.5 text-sm text-erro">{resposta.erro}</p>}
            <button type="submit" disabled={enviando} className="botao-primario mt-1 w-full">
              {enviando ? "Entrando…" : "Entrar"}
            </button>
          </Form>
          <p className="mt-6 text-sm text-suave">Esqueceu a senha? Peça a outra pessoa da equipe para criar um novo acesso.</p>
          </>)}
        </div>
        <Link to="/" className="mt-6 inline-flex items-center gap-1.5 py-1 text-sm font-medium text-white/75 hover:text-white">
          <ArrowLeft className="size-4" aria-hidden="true" /> Voltar para o site
        </Link>
      </div>
    </main>
  );
}
