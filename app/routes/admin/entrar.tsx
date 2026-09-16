import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { data, Form, Link, redirect, useNavigation, useSearchParams } from "react-router";
import { db, schema } from "~/.server/db";
import { obterLoja } from "~/.server/loja";
import { conferirSenha, gastarTempoEquivalente } from "~/.server/senha";
import { destinoSeguro, iniciarSessao, obterUsuario } from "~/.server/sessao";
import { dentroDoLimite, exigirMesmaOrigem, ipDe } from "~/.server/seguranca";
import { CampoTexto } from "~/components/Campo";
import type { Route } from "./+types/entrar";

export async function loader({ request }: Route.LoaderArgs) {
  if (await obterUsuario(request)) throw redirect("/admin");
  return { nomeLoja: (await obterLoja()).nome };
}

export const meta = ({ loaderData }: Route.MetaArgs) => [
  { title: `Entrar · ${loaderData?.nomeLoja ?? "Painel"}` },
  { name: "robots", content: "noindex" },
];

export async function action({ request }: Route.ActionArgs) {
  exigirMesmaOrigem(request);
  const form = await request.formData();
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
  const [params] = useSearchParams();
  const navigation = useNavigation();
  const enviando = navigation.state === "submitting";

  return (
    <main className="grid flex-1 place-items-center bg-noite px-4 py-14">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-6 shadow-flutuante sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-marca-600">{loaderData.nomeLoja}</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-tinta">Entrar no painel</h1>
          <p className="mt-1 text-suave">Acesso restrito à equipe da loja.</p>

          <Form method="post" className="mt-6 grid gap-4">
            <input type="hidden" name="voltar" value={params.get("voltar") ?? ""} />
            <CampoTexto id="email" rotulo="E-mail" type="email" autoComplete="email" required autoFocus />
            <CampoTexto id="senha" rotulo="Senha" type="password" autoComplete="current-password" required />
            {actionData?.erro && <p role="alert" className="rounded-lg bg-erro-fundo px-3 py-2.5 text-sm text-erro">{actionData.erro}</p>}
            <button type="submit" disabled={enviando} className="botao-primario mt-1 w-full">
              {enviando ? "Entrando…" : "Entrar"}
            </button>
          </Form>
          <p className="mt-6 text-sm text-suave">Esqueceu a senha? Peça a outra pessoa da equipe para criar um novo acesso.</p>
        </div>
        <Link to="/" className="mt-6 inline-flex items-center gap-1.5 py-1 text-sm font-medium text-white/75 hover:text-white">
          <ArrowLeft className="size-4" aria-hidden="true" /> Voltar para o site
        </Link>
      </div>
    </main>
  );
}
