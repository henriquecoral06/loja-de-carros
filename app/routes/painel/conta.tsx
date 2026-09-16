import { eq } from "drizzle-orm";
import { useState } from "react";
import { data, Form, useNavigation } from "react-router";
import { db, schema } from "~/.server/db";
import { conferirSenha, gerarHash } from "~/.server/senha";
import { encerrarOutrasSessoes, exigirUsuario } from "~/.server/sessao";
import { dentroDoLimite, exigirMesmaOrigem } from "~/.server/seguranca";
import { CampoSelecao, CampoTexto } from "~/components/Campo";
import { apenasDigitos } from "~/lib/formato";
import { SITE } from "~/lib/site";
import { UFS } from "~/lib/veiculos";
import type { Route } from "./+types/conta";

export const meta = () => [{ title: `Minha conta — ${SITE.nome}` }, { name: "robots", content: "noindex" }];

export async function loader({ request }: Route.LoaderArgs) {
  return { usuario: await exigirUsuario(request) };
}

type Resposta = { intencao: "perfil" | "senha"; ok?: boolean; erros?: Record<string, string> };

export async function action({ request }: Route.ActionArgs) {
  exigirMesmaOrigem(request);
  const usuario = await exigirUsuario(request);
  const form = await request.formData();
  const t = (k: string) => String(form.get(k) ?? "").trim();

  if (form.get("intencao") === "senha") {
    const erros: Record<string, string> = {};
    if (!(await dentroDoLimite(`troca-senha:${usuario.id}`, 5, 900_000))) {
      return data<Resposta>({ intencao: "senha", erros: { atual: "Muitas tentativas. Aguarde 15 minutos." } }, { status: 429 });
    }
    const [linha] = await db.select({ senhaHash: schema.usuarios.senhaHash }).from(schema.usuarios).where(eq(schema.usuarios.id, usuario.id));
    if (!(await conferirSenha(String(form.get("atual") ?? ""), linha.senhaHash))) erros.atual = "Senha atual incorreta.";
    const nova = String(form.get("nova") ?? "");
    if (nova.length < 8) erros.nova = "A nova senha precisa ter pelo menos 8 caracteres.";
    if (Object.keys(erros).length) return data<Resposta>({ intencao: "senha", erros }, { status: 400 });

    await db.update(schema.usuarios).set({ senhaHash: await gerarHash(nova) }).where(eq(schema.usuarios.id, usuario.id));
    // Se a troca foi por suspeita de invasão, quem entrou com a senha
    // antiga precisa sair — mas a sessão de quem trocou continua.
    await encerrarOutrasSessoes(request, usuario.id);
    return { intencao: "senha", ok: true } satisfies Resposta;
  }

  const v = {
    nome: t("nome"), whatsapp: apenasDigitos(t("whatsapp")),
    tipo: form.get("tipo") === "loja" ? ("loja" as const) : ("particular" as const),
    nomeLoja: t("nomeLoja"), cidade: t("cidade"), uf: t("uf"),
  };
  const erros: Record<string, string> = {};
  if (v.nome.length < 2) erros.nome = "Informe seu nome.";
  if (v.whatsapp.length < 10 || v.whatsapp.length > 11) erros.whatsapp = "Informe o WhatsApp com DDD.";
  if (v.tipo === "loja" && v.nomeLoja.length < 2) erros.nomeLoja = "Informe o nome da loja.";
  if (v.cidade.length < 2) erros.cidade = "Informe a cidade.";
  if (!(UFS as readonly string[]).includes(v.uf)) erros.uf = "Escolha o estado.";
  if (Object.keys(erros).length) return data<Resposta>({ intencao: "perfil", erros }, { status: 400 });

  await db.update(schema.usuarios).set({ ...v, nomeLoja: v.tipo === "loja" ? v.nomeLoja : null }).where(eq(schema.usuarios.id, usuario.id));
  return { intencao: "perfil", ok: true } satisfies Resposta;
}

export default function Conta({ loaderData, actionData }: Route.ComponentProps) {
  const { usuario } = loaderData;
  const navigation = useNavigation();
  const [tipo, setTipo] = useState(usuario.tipo);
  const resposta = actionData as Resposta | undefined;
  const perfil = resposta?.intencao === "perfil" ? resposta : undefined;
  const senha = resposta?.intencao === "senha" ? resposta : undefined;
  const enviandoIntencao = navigation.formData?.get("intencao");

  return (
    <div className="grid gap-4">
      <Form method="post" noValidate className="cartao grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
        <input type="hidden" name="intencao" value="perfil" />
        <h2 className="text-lg font-bold text-tinta sm:col-span-2">Dados do anunciante</h2>
        <p className="-mt-2 text-sm text-suave sm:col-span-2">E-mail de acesso: <strong className="font-semibold text-tinta">{usuario.email}</strong></p>

        <CampoSelecao id="tipo" rotulo="Tipo de anunciante" value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
          <option value="particular">Particular</option>
          <option value="loja">Loja</option>
        </CampoSelecao>
        {tipo === "loja" ? (
          <CampoTexto id="nomeLoja" rotulo="Nome da loja" defaultValue={usuario.nomeLoja ?? ""} erro={perfil?.erros?.nomeLoja} />
        ) : <div className="hidden sm:block" />}
        <CampoTexto id="nome" rotulo="Seu nome" defaultValue={usuario.nome} erro={perfil?.erros?.nome} />
        <CampoTexto id="whatsapp" rotulo="WhatsApp com DDD" type="tel" defaultValue={usuario.whatsapp} erro={perfil?.erros?.whatsapp} />
        <CampoTexto id="cidade" rotulo="Cidade" defaultValue={usuario.cidade} erro={perfil?.erros?.cidade} />
        <CampoSelecao id="uf" rotulo="Estado" defaultValue={usuario.uf} erro={perfil?.erros?.uf}>
          {UFS.map((u) => <option key={u}>{u}</option>)}
        </CampoSelecao>

        <div className="flex items-center gap-3 sm:col-span-2">
          <button type="submit" disabled={enviandoIntencao === "perfil"} className="botao-primario">
            {enviandoIntencao === "perfil" ? "Salvando…" : "Salvar dados"}
          </button>
          {perfil?.ok && <p role="status" className="text-sm font-semibold text-sucesso">Dados salvos.</p>}
        </div>
      </Form>

      <Form method="post" noValidate className="cartao grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
        <input type="hidden" name="intencao" value="senha" />
        <h2 className="text-lg font-bold text-tinta sm:col-span-2">Trocar senha</h2>
        {senha?.ok ? (
          <p role="status" className="rounded-lg bg-sucesso-fundo px-3 py-2.5 text-sm text-sucesso sm:col-span-2">
            Senha trocada. Se você estava conectado em outros aparelhos, essas sessões foram encerradas.
          </p>
        ) : (
          <>
            <CampoTexto id="atual" rotulo="Senha atual" type="password" autoComplete="current-password" erro={senha?.erros?.atual} />
            <CampoTexto id="nova" rotulo="Nova senha" type="password" autoComplete="new-password" erro={senha?.erros?.nova} dica="Pelo menos 8 caracteres." />
            <div className="sm:col-span-2">
              <button type="submit" disabled={enviandoIntencao === "senha"} className="botao-secundario">
                {enviandoIntencao === "senha" ? "Trocando…" : "Trocar senha"}
              </button>
            </div>
          </>
        )}
      </Form>
    </div>
  );
}
