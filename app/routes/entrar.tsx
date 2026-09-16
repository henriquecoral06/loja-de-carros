import { eq } from "drizzle-orm";
import { data, Form, Link, redirect, useNavigation, useSearchParams } from "react-router";
import { db, schema } from "~/.server/db";
import { conferirSenha, gastarTempoEquivalente } from "~/.server/senha";
import { destinoSeguro, iniciarSessao, obterUsuario } from "~/.server/sessao";
import { dentroDoLimite, exigirMesmaOrigem, ipDe } from "~/.server/seguranca";
import { CampoTexto } from "~/components/Campo";
import { SITE } from "~/lib/site";
import type { Route } from "./+types/entrar";

export const meta = () => [{ title: `Entrar — ${SITE.nome}` }, { name: "robots", content: "noindex" }];

export async function loader({ request }: Route.LoaderArgs) {
  if (await obterUsuario(request)) throw redirect("/painel");
  return null;
}

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

export default function Entrar({ actionData }: Route.ComponentProps) {
  const [params] = useSearchParams();
  const navigation = useNavigation();
  const voltar = params.get("voltar") ?? "";
  const enviando = navigation.state === "submitting";

  return (
    <div className="conteiner grid place-items-center py-14">
      <div className="cartao w-full max-w-md p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-tinta">Entrar</h1>
        <p className="mt-1 text-suave">
          {voltar.startsWith("/painel/anuncios/novo") ? "Entre para anunciar seu carro." : "Acesse seus anúncios e mensagens."}
        </p>

        <Form method="post" className="mt-6 grid gap-4">
          <input type="hidden" name="voltar" value={voltar} />
          <CampoTexto id="email" rotulo="E-mail" type="email" autoComplete="email" required autoFocus />
          <CampoTexto id="senha" rotulo="Senha" type="password" autoComplete="current-password" required />
          {actionData?.erro && <p role="alert" className="rounded-lg bg-erro-fundo px-3 py-2.5 text-sm text-erro">{actionData.erro}</p>}
          <button type="submit" disabled={enviando} className="botao-primario mt-1 w-full">
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </Form>

        <p className="mt-6 text-center text-sm text-suave">
          Ainda não tem conta?{" "}
          <Link to={`/cadastrar${voltar ? `?voltar=${encodeURIComponent(voltar)}` : ""}`} className="font-semibold text-marca-700 hover:underline">
            Criar conta grátis
          </Link>
        </p>
      </div>
    </div>
  );
}
