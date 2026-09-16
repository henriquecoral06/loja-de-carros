import { data, Form, useNavigation } from "react-router";
import { db, schema } from "~/.server/db";
import { obterLoja } from "~/.server/loja";
import { exigirUsuario } from "~/.server/sessao";
import { exigirMesmaOrigem } from "~/.server/seguranca";
import { CampoArea, CampoSelecao, CampoTexto } from "~/components/Campo";
import { apenasDigitos, cep, telefone } from "~/lib/formato";
import { metaAdmin } from "~/lib/site";
import { UFS } from "~/lib/veiculos";
import type { Route } from "./+types/loja";

export function meta({ matches }: Route.MetaArgs) {
  return metaAdmin("Dados da loja", matches);
}

export async function loader({ request }: Route.LoaderArgs) {
  await exigirUsuario(request);
  return { loja: await obterLoja() };
}

type Campo = "nome" | "slogan" | "sobre" | "whatsapp" | "telefone" | "email" | "endereco" | "bairro" | "cidade" | "uf" | "cep" | "horario" | "cnpj" | "instagram" | "facebook";

const LIMITES: Record<Campo, number> = {
  nome: 60, slogan: 140, sobre: 4000, whatsapp: 11, telefone: 11, email: 120, endereco: 120, bairro: 60,
  cidade: 60, uf: 2, cep: 8, horario: 120, cnpj: 18, instagram: 40, facebook: 120,
};

export async function action({ request }: Route.ActionArgs) {
  exigirMesmaOrigem(request);
  await exigirUsuario(request);
  const form = await request.formData();
  const t = (k: Campo) => String(form.get(k) ?? "").trim();

  const v: Record<Campo, string> = {
    nome: t("nome"), slogan: t("slogan"), sobre: t("sobre"),
    whatsapp: apenasDigitos(t("whatsapp")), telefone: apenasDigitos(t("telefone")), email: t("email").toLowerCase(),
    endereco: t("endereco"), bairro: t("bairro"), cidade: t("cidade"), uf: t("uf"), cep: apenasDigitos(t("cep")),
    horario: t("horario"), cnpj: t("cnpj"),
    instagram: t("instagram").replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, ""),
    facebook: t("facebook"),
  };

  const erros: Partial<Record<Campo, string>> = {};
  for (const [campo, max] of Object.entries(LIMITES) as [Campo, number][]) {
    if (v[campo].length > max) erros[campo] = `Até ${max} caracteres.`;
  }
  if (v.nome.length < 2) erros.nome = "Informe o nome da loja.";
  if (v.whatsapp && (v.whatsapp.length < 10 || v.whatsapp.length > 11)) erros.whatsapp = "WhatsApp com DDD, só números.";
  if (v.telefone && (v.telefone.length < 10 || v.telefone.length > 11)) erros.telefone = "Telefone com DDD, só números.";
  if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) erros.email = "E-mail inválido.";
  if (v.uf && !(UFS as readonly string[]).includes(v.uf)) erros.uf = "Estado inválido.";
  if (v.cep && v.cep.length !== 8) erros.cep = "CEP com 8 dígitos.";
  if (v.instagram && !/^[\w.]{1,30}$/.test(v.instagram)) erros.instagram = "Informe só o usuário, ex.: minhaloja.";
  if (v.facebook && !/^https:\/\/(www\.)?facebook\.com\/\S+$/.test(v.facebook)) erros.facebook = "Cole o endereço completo, começando com https://facebook.com/";
  if (Object.keys(erros).length) return data({ erros, ok: false }, { status: 400 });

  const valores = { ...v, atualizadoEm: Date.now() };
  await db.insert(schema.loja).values({ id: 1, ...valores }).onConflictDoUpdate({ target: schema.loja.id, set: valores });
  return { erros: {} as Partial<Record<Campo, string>>, ok: true };
}

export default function DadosLoja({ loaderData, actionData }: Route.ComponentProps) {
  const { loja } = loaderData;
  const erros = actionData?.erros ?? {};
  const enviando = useNavigation().state === "submitting";
  const secao = "cartao grid gap-4 p-5 sm:grid-cols-2 sm:p-6";

  return (
    <Form method="post" noValidate className="grid gap-4 pb-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-tinta">Dados da loja</h1>
        <p className="text-suave">Aparecem no cabeçalho, no rodapé, nas páginas dos carros e em Contato.</p>
      </div>

      {actionData?.ok && <p role="status" className="rounded-xl border border-sucesso/20 bg-sucesso-fundo px-4 py-3 font-semibold text-sucesso">Dados salvos. O site já foi atualizado.</p>}
      {Object.keys(erros).length > 0 && <p role="alert" className="rounded-xl border border-erro/20 bg-erro-fundo px-4 py-3 text-sm text-erro">Revise os campos marcados.</p>}

      <section className={secao} aria-labelledby="sec-identidade">
        <h2 id="sec-identidade" className="text-lg font-bold text-tinta sm:col-span-2">Identidade</h2>
        <CampoTexto id="nome" rotulo="Nome da loja" defaultValue={loja.nome} erro={erros.nome} maxLength={60} required />
        <CampoTexto id="cnpj" rotulo="CNPJ" defaultValue={loja.cnpj} erro={erros.cnpj} maxLength={18} dica="Aparece no rodapé." />
        <CampoTexto id="slogan" rotulo="Frase de destaque" defaultValue={loja.slogan} erro={erros.slogan} maxLength={140}
          dica="Título da página inicial. Ex.: Seminovos com procedência em BH." className="sm:col-span-2" />
        <CampoArea id="sobre" rotulo="Sobre a loja" rows={6} defaultValue={loja.sobre} erro={erros.sobre} maxLength={4000}
          dica="Texto da página “A loja”. Separe parágrafos com uma linha em branco." className="sm:col-span-2" />
      </section>

      <section className={secao} aria-labelledby="sec-contato">
        <h2 id="sec-contato" className="text-lg font-bold text-tinta sm:col-span-2">Contato</h2>
        <CampoTexto id="whatsapp" rotulo="WhatsApp com DDD" type="tel" defaultValue={loja.whatsapp && telefone(loja.whatsapp)} erro={erros.whatsapp}
          dica="Destino dos botões “Tenho interesse” e “Fale com a loja”." />
        <CampoTexto id="telefone" rotulo="Telefone fixo" type="tel" defaultValue={loja.telefone && telefone(loja.telefone)} erro={erros.telefone} />
        <CampoTexto id="email" rotulo="E-mail" type="email" defaultValue={loja.email} erro={erros.email} />
        <CampoTexto id="horario" rotulo="Horário de atendimento" defaultValue={loja.horario} erro={erros.horario} placeholder="Seg a sex 9h–18h · Sáb 9h–13h" />
        <CampoTexto id="instagram" rotulo="Instagram" defaultValue={loja.instagram} erro={erros.instagram} placeholder="minhaloja" />
        <CampoTexto id="facebook" rotulo="Facebook" type="url" defaultValue={loja.facebook} erro={erros.facebook} placeholder="https://facebook.com/minhaloja" />
      </section>

      <section className={secao} aria-labelledby="sec-endereco">
        <h2 id="sec-endereco" className="text-lg font-bold text-tinta sm:col-span-2">Endereço</h2>
        <CampoTexto id="endereco" rotulo="Rua e número" defaultValue={loja.endereco} erro={erros.endereco} className="sm:col-span-2" autoComplete="street-address" />
        <CampoTexto id="bairro" rotulo="Bairro" defaultValue={loja.bairro} erro={erros.bairro} />
        <CampoTexto id="cep" rotulo="CEP" inputMode="numeric" defaultValue={cep(loja.cep)} erro={erros.cep} autoComplete="postal-code" />
        <CampoTexto id="cidade" rotulo="Cidade" defaultValue={loja.cidade} erro={erros.cidade} />
        <CampoSelecao id="uf" rotulo="Estado" defaultValue={loja.uf} erro={erros.uf}>
          <option value="">Selecione</option>
          {UFS.map((u) => <option key={u}>{u}</option>)}
        </CampoSelecao>
      </section>

      <div className="flex justify-end">
        <button type="submit" disabled={enviando} className="botao-primario min-w-44">{enviando ? "Salvando…" : "Salvar dados"}</button>
      </div>
    </Form>
  );
}
