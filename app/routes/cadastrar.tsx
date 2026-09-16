import { eq } from "drizzle-orm";
import { useState } from "react";
import { data, Form, Link, redirect, useNavigation, useSearchParams } from "react-router";
import { db, schema } from "~/.server/db";
import { gerarHash } from "~/.server/senha";
import { destinoSeguro, iniciarSessao, obterUsuario } from "~/.server/sessao";
import { dentroDoLimite, exigirMesmaOrigem, ipDe } from "~/.server/seguranca";
import { CampoSelecao, CampoTexto } from "~/components/Campo";
import { apenasDigitos } from "~/lib/formato";
import { SITE } from "~/lib/site";
import { UFS } from "~/lib/veiculos";
import type { Route } from "./+types/cadastrar";

export const meta = () => [{ title: `Criar conta — ${SITE.nome}` }, { name: "robots", content: "noindex" }];

export async function loader({ request }: Route.LoaderArgs) {
  if (await obterUsuario(request)) throw redirect("/painel");
  return null;
}

type Erros = Partial<Record<"nome" | "email" | "senha" | "whatsapp" | "nomeLoja" | "cidade" | "uf" | "termos", string>>;

export async function action({ request }: Route.ActionArgs) {
  exigirMesmaOrigem(request);
  const form = await request.formData();
  const v = {
    nome: String(form.get("nome") ?? "").trim(),
    email: String(form.get("email") ?? "").trim().toLowerCase(),
    senha: String(form.get("senha") ?? ""),
    whatsapp: apenasDigitos(String(form.get("whatsapp") ?? "")),
    tipo: form.get("tipo") === "loja" ? ("loja" as const) : ("particular" as const),
    nomeLoja: String(form.get("nomeLoja") ?? "").trim(),
    cidade: String(form.get("cidade") ?? "").trim(),
    uf: String(form.get("uf") ?? ""),
  };

  const erros: Erros = {};
  if (v.nome.length < 2) erros.nome = "Informe seu nome.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) erros.email = "Informe um e-mail válido.";
  if (v.senha.length < 8) erros.senha = "A senha precisa ter pelo menos 8 caracteres.";
  if (v.senha.length > 200) erros.senha = "A senha pode ter até 200 caracteres.";
  if (v.whatsapp.length < 10 || v.whatsapp.length > 11) erros.whatsapp = "Informe o WhatsApp com DDD.";
  if (v.tipo === "loja" && v.nomeLoja.length < 2) erros.nomeLoja = "Informe o nome da loja.";
  if (v.cidade.length < 2) erros.cidade = "Informe a cidade.";
  if (!(UFS as readonly string[]).includes(v.uf)) erros.uf = "Escolha o estado.";
  if (form.get("termos") !== "on") erros.termos = "É preciso aceitar os termos para criar a conta.";

  const valores = { ...v, senha: "" };
  if (Object.keys(erros).length) return data({ erros, valores }, { status: 400 });

  if (!(await dentroDoLimite(`cadastro:${ipDe(request)}`, 6, 3_600_000))) {
    return data({ erros: {} as Erros, valores, erro: "Muitos cadastros a partir desta conexão. Tente mais tarde." }, { status: 429 });
  }

  const [existente] = await db.select({ id: schema.usuarios.id }).from(schema.usuarios)
    .where(eq(schema.usuarios.email, v.email)).limit(1);
  if (existente) {
    return data({ erros: { email: "Já existe uma conta com este e-mail." } as Erros, valores }, { status: 400 });
  }

  const id = crypto.randomUUID();
  await db.insert(schema.usuarios).values({
    id, nome: v.nome, email: v.email, senhaHash: await gerarHash(v.senha), whatsapp: v.whatsapp,
    tipo: v.tipo, nomeLoja: v.tipo === "loja" ? v.nomeLoja : null, cidade: v.cidade, uf: v.uf,
  });

  return iniciarSessao(id, destinoSeguro(form.get("voltar")));
}

export default function Cadastrar({ actionData }: Route.ComponentProps) {
  const [params] = useSearchParams();
  const navigation = useNavigation();
  const erros = actionData?.erros ?? {};
  const valores = actionData?.valores;
  const [tipo, setTipo] = useState<"particular" | "loja">(valores?.tipo ?? "particular");
  const voltar = params.get("voltar") ?? "";
  const erroGeral = actionData && "erro" in actionData ? String(actionData.erro) : undefined;

  return (
    <div className="conteiner grid place-items-center py-14">
      <div className="cartao w-full max-w-xl p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-tinta">Criar conta</h1>
        <p className="mt-1 text-suave">Grátis. Com a conta você anuncia e recebe as mensagens dos compradores.</p>

        <Form method="post" noValidate className="mt-6 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="voltar" value={voltar} />

          <fieldset className="sm:col-span-2">
            <legend className="rotulo">Você vai anunciar como</legend>
            <div className="grid grid-cols-2 gap-2">
              {([["particular", "Particular", "Meu próprio carro"], ["loja", "Loja", "Revenda ou concessionária"]] as const).map(([valor, titulo, apoio]) => (
                <label key={valor} className={`cursor-pointer rounded-xl border-2 p-3 transition-colors ${tipo === valor ? "border-marca-600 bg-marca-50" : "border-linha hover:border-linha-forte"}`}>
                  <input type="radio" name="tipo" value={valor} checked={tipo === valor} onChange={() => setTipo(valor)} className="sr-only" />
                  <span className="block font-semibold text-tinta">{titulo}</span>
                  <span className="block text-sm text-suave">{apoio}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <CampoTexto id="nome" rotulo="Seu nome" autoComplete="name" defaultValue={valores?.nome} erro={erros.nome} className="sm:col-span-2" />
          {tipo === "loja" && (
            <CampoTexto id="nomeLoja" rotulo="Nome da loja" autoComplete="organization" defaultValue={valores?.nomeLoja} erro={erros.nomeLoja} className="sm:col-span-2" />
          )}
          <CampoTexto id="email" rotulo="E-mail" type="email" autoComplete="email" defaultValue={valores?.email} erro={erros.email} />
          <CampoTexto id="whatsapp" rotulo="WhatsApp com DDD" type="tel" autoComplete="tel" placeholder="(11) 98765-4321" defaultValue={valores?.whatsapp} erro={erros.whatsapp} />
          <CampoTexto id="senha" rotulo="Senha" type="password" autoComplete="new-password" erro={erros.senha} dica="Pelo menos 8 caracteres." className="sm:col-span-2" />
          <CampoTexto id="cidade" rotulo="Cidade" autoComplete="address-level2" defaultValue={valores?.cidade} erro={erros.cidade} />
          <CampoSelecao id="uf" rotulo="Estado" defaultValue={valores?.uf ?? ""} erro={erros.uf}>
            <option value="" disabled>Selecione</option>
            {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
          </CampoSelecao>

          <div className="sm:col-span-2">
            <label className="flex items-start gap-2.5 text-sm text-texto">
              <input type="checkbox" name="termos" className="mt-0.5 size-4 shrink-0 accent-marca-600"
                aria-invalid={erros.termos ? true : undefined} aria-describedby={erros.termos ? "termos-erro" : undefined} />
              <span>Li e aceito os <Link to="/termos" target="_blank" className="font-semibold underline">termos de uso</Link> e a <Link to="/privacidade" target="_blank" className="font-semibold underline">política de privacidade</Link>.</span>
            </label>
            {erros.termos && <p id="termos-erro" className="mt-1.5 text-sm text-erro">{erros.termos}</p>}
          </div>

          {erroGeral && (
            <p role="alert" className="rounded-lg bg-erro-fundo px-3 py-2.5 text-sm text-erro sm:col-span-2">{erroGeral}</p>
          )}

          <button type="submit" disabled={navigation.state === "submitting"} className="botao-primario w-full sm:col-span-2">
            {navigation.state === "submitting" ? "Criando conta…" : "Criar conta"}
          </button>
        </Form>

        <p className="mt-6 text-center text-sm text-suave">
          Já tem conta?{" "}
          <Link to={`/entrar${voltar ? `?voltar=${encodeURIComponent(voltar)}` : ""}`} className="font-semibold text-marca-700 hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
