import { asc, count, eq } from "drizzle-orm";
import { Trash2 } from "lucide-react";
import { data, useFetcher } from "react-router";
import { db, schema } from "~/.server/db";
import { gerarHash } from "~/.server/senha";
import { exigirUsuario } from "~/.server/sessao";
import { exigirMesmaOrigem } from "~/.server/seguranca";
import { CampoTexto } from "~/components/Campo";
import { tempoRelativo } from "~/lib/formato";
import { metaAdmin } from "~/lib/site";
import type { Route } from "./+types/equipe";

export function meta({ matches }: Route.MetaArgs) {
  return metaAdmin("Equipe", matches);
}

export async function loader({ request }: Route.LoaderArgs) {
  const usuario = await exigirUsuario(request);
  const pessoas = await db.select({ id: schema.usuarios.id, nome: schema.usuarios.nome, email: schema.usuarios.email, criadoEm: schema.usuarios.criadoEm })
    .from(schema.usuarios).orderBy(asc(schema.usuarios.nome));
  return { pessoas, euId: usuario.id };
}

type Erros = Partial<Record<"nome" | "email" | "senha" | "geral", string>>;

export async function action({ request }: Route.ActionArgs) {
  exigirMesmaOrigem(request);
  const usuario = await exigirUsuario(request);
  const form = await request.formData();

  if (form.get("intencao") === "remover") {
    const id = String(form.get("id"));
    if (id === usuario.id) return data({ erros: { geral: "Você não pode remover o próprio acesso." } as Erros }, { status: 400 });
    const [{ total }] = await db.select({ total: count() }).from(schema.usuarios);
    if (total <= 1) return data({ erros: { geral: "A loja precisa de pelo menos um acesso." } as Erros }, { status: 400 });
    // Sessões saem antes do usuário: quem foi removido cai na hora, mesmo logado.
    await db.delete(schema.sessoes).where(eq(schema.sessoes.usuarioId, id));
    await db.delete(schema.usuarios).where(eq(schema.usuarios.id, id));
    return { removido: true };
  }

  const nome = String(form.get("nome") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const senha = String(form.get("senha") ?? "");
  const erros: Erros = {};
  if (nome.length < 2 || nome.length > 80) erros.nome = "Informe o nome.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) erros.email = "Informe um e-mail válido.";
  if (senha.length < 8) erros.senha = "Pelo menos 8 caracteres.";
  if (!erros.email) {
    const [existe] = await db.select({ id: schema.usuarios.id }).from(schema.usuarios).where(eq(schema.usuarios.email, email)).limit(1);
    if (existe) erros.email = "Este e-mail já tem acesso.";
  }
  if (Object.keys(erros).length) return data({ erros }, { status: 400 });

  await db.insert(schema.usuarios).values({ id: crypto.randomUUID(), nome, email, senhaHash: await gerarHash(senha) });
  return { criado: email };
}

type Resposta = { erros?: Erros; criado?: string; removido?: boolean };

export default function Equipe({ loaderData }: Route.ComponentProps) {
  const { pessoas, euId } = loaderData;
  const novo = useFetcher<Resposta>();
  const erros = novo.data?.erros ?? {};

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-tinta">Equipe</h1>
        <p className="text-suave">Todos com acesso têm as mesmas permissões: estoque, mensagens e dados da loja.</p>
      </div>

      <ul className="cartao divide-y divide-linha">
        {pessoas.map((p) => <Pessoa key={p.id} pessoa={p} eu={p.id === euId} />)}
      </ul>

      <section aria-labelledby="titulo-novo" className="cartao p-5 sm:p-6">
        <h2 id="titulo-novo" className="text-lg font-bold text-tinta">Dar acesso a alguém</h2>
        <p className="mt-1 text-sm text-suave">Passe a senha pessoalmente. A pessoa pode trocá-la em “Minha senha” depois de entrar.</p>
        {/* A key zera os campos depois de criar; em caso de erro, mantém o que foi digitado. */}
        <novo.Form key={novo.data?.criado ?? "form"} method="post" noValidate className="mt-4 grid gap-4 sm:grid-cols-3">
          <CampoTexto id="nome" rotulo="Nome" autoComplete="off" erro={erros.nome} />
          <CampoTexto id="email" rotulo="E-mail" type="email" autoComplete="off" erro={erros.email} />
          <CampoTexto id="senha" rotulo="Senha inicial" type="password" autoComplete="new-password" erro={erros.senha} dica="Pelo menos 8 caracteres." />
          <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
            <button type="submit" disabled={novo.state !== "idle"} className="botao-primario">
              {novo.state !== "idle" ? "Criando…" : "Criar acesso"}
            </button>
            {novo.data?.criado && <p role="status" className="text-sm font-semibold text-sucesso">Acesso criado para {novo.data.criado}.</p>}
          </div>
        </novo.Form>
      </section>
    </div>
  );
}

function Pessoa({ pessoa: p, eu }: { pessoa: Route.ComponentProps["loaderData"]["pessoas"][number]; eu: boolean }) {
  const fetcher = useFetcher<Resposta>();
  if (fetcher.formData) return null;

  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-marca-50 font-bold text-marca-700" aria-hidden="true">
        {p.nome.charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-tinta">{p.nome}{eu && <span className="ml-2 text-sm font-normal text-suave">(você)</span>}</p>
        <p className="truncate text-sm text-suave">{p.email} · desde {tempoRelativo(p.criadoEm)}</p>
        {fetcher.data?.erros?.geral && <p role="alert" className="mt-1 text-sm text-erro">{fetcher.data.erros.geral}</p>}
      </div>
      {!eu && (
        <fetcher.Form method="post" onSubmit={(e) => { if (!confirm(`Remover o acesso de ${p.nome}? A pessoa sai do painel na hora.`)) e.preventDefault(); }}>
          <input type="hidden" name="intencao" value="remover" />
          <input type="hidden" name="id" value={p.id} />
          <button className="botao-perigo h-9 px-3 text-sm"><Trash2 className="size-4" aria-hidden="true" /> Remover</button>
        </fetcher.Form>
      )}
    </li>
  );
}
