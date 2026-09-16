import { eq } from "drizzle-orm";
import { data, Form, useNavigation } from "react-router";
import { db, schema } from "~/.server/db";
import { conferirSenha, gerarHash } from "~/.server/senha";
import { encerrarOutrasSessoes, exigirUsuario } from "~/.server/sessao";
import { dentroDoLimite, exigirMesmaOrigem } from "~/.server/seguranca";
import { CampoTexto } from "~/components/Campo";
import { metaAdmin } from "~/lib/site";
import type { Route } from "./+types/senha";

export function meta({ matches }: Route.MetaArgs) {
  return metaAdmin("Minha senha", matches);
}

export async function loader({ request }: Route.LoaderArgs) {
  const usuario = await exigirUsuario(request);
  return { email: usuario.email };
}

export async function action({ request }: Route.ActionArgs) {
  exigirMesmaOrigem(request);
  const usuario = await exigirUsuario(request);
  const form = await request.formData();

  if (!(await dentroDoLimite(`troca-senha:${usuario.id}`, 5, 900_000))) {
    return data({ ok: false, erros: { atual: "Muitas tentativas. Aguarde 15 minutos." } as Record<string, string> }, { status: 429 });
  }
  const erros: Record<string, string> = {};
  const [linha] = await db.select({ senhaHash: schema.usuarios.senhaHash }).from(schema.usuarios).where(eq(schema.usuarios.id, usuario.id));
  if (!(await conferirSenha(String(form.get("atual") ?? ""), linha.senhaHash))) erros.atual = "Senha atual incorreta.";
  const nova = String(form.get("nova") ?? "");
  if (nova.length < 8) erros.nova = "A nova senha precisa ter pelo menos 8 caracteres.";
  if (Object.keys(erros).length) return data({ ok: false, erros }, { status: 400 });

  await db.update(schema.usuarios).set({ senhaHash: await gerarHash(nova) }).where(eq(schema.usuarios.id, usuario.id));
  // Se a troca foi por suspeita de invasão, quem entrou com a senha
  // antiga precisa sair — mas a sessão de quem trocou continua.
  await encerrarOutrasSessoes(request, usuario.id);
  return { ok: true, erros: {} as Record<string, string> };
}

export default function Senha({ loaderData, actionData }: Route.ComponentProps) {
  const enviando = useNavigation().state === "submitting";
  const erros = actionData?.erros ?? {};

  return (
    <div className="grid max-w-2xl gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-tinta">Minha senha</h1>
        <p className="text-suave">Acesso: <strong className="font-semibold text-tinta">{loaderData.email}</strong></p>
      </div>
      <Form method="post" noValidate className="cartao grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
        {actionData?.ok ? (
          <p role="status" className="rounded-lg bg-sucesso-fundo px-3 py-2.5 text-sm text-sucesso sm:col-span-2">
            Senha trocada. Se você estava conectado em outros aparelhos, essas sessões foram encerradas.
          </p>
        ) : (
          <>
            <CampoTexto id="atual" rotulo="Senha atual" type="password" autoComplete="current-password" erro={erros.atual} />
            <CampoTexto id="nova" rotulo="Nova senha" type="password" autoComplete="new-password" erro={erros.nova} dica="Pelo menos 8 caracteres." />
            <div className="sm:col-span-2">
              <button type="submit" disabled={enviando} className="botao-primario">{enviando ? "Trocando…" : "Trocar senha"}</button>
            </div>
          </>
        )}
      </Form>
    </div>
  );
}
