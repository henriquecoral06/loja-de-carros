import { asc, count, eq } from "drizzle-orm";
import { Check, Sparkles, Trash2, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { data, Form, useFetcher, useNavigation, useSearchParams } from "react-router";
import { db, schema } from "~/.server/db";
import { removerObjetos, salvarArquivoLoja, validarLogo } from "~/.server/imagens";
import { BANNER_PADRAO, lojaCompleta, obterLoja, salvarLoja } from "~/.server/loja";
import { conferirSenha, gerarHash } from "~/.server/senha";
import { encerrarOutrasSessoes, exigirUsuario } from "~/.server/sessao";
import { dentroDoLimite, exigirMesmaOrigem } from "~/.server/seguranca";
import { ArquivoImagem, CampoTelefone, SeletorCor } from "~/components/admin/campos";
import { Aviso, BarraSalvar, Cabecalho, Secao } from "~/components/admin/ui";
import { CampoArea, CampoSelecao, CampoTexto } from "~/components/Campo";
import { avisosCores, COR_HEX, contraste, PREDEFINIDAS } from "~/lib/cores";
import { apenasDigitos, cep, DDIS, tempoRelativo } from "~/lib/formato";
import { coresDaImagem } from "~/lib/imagem-cliente";
import { metaAdmin } from "~/lib/site";
import { cn } from "~/lib/ui";
import { UFS } from "~/lib/veiculos";
import { videoDeFundo } from "~/lib/video";
import type { Route } from "./+types/configuracoes";

export function meta({ matches }: Route.MetaArgs) {
  return metaAdmin("Configurações", matches);
}

export async function loader({ request }: Route.LoaderArgs) {
  const usuario = await exigirUsuario(request);
  const [loja, acessos] = await Promise.all([
    obterLoja(),
    db.select({ id: schema.usuarios.id, nome: schema.usuarios.nome, email: schema.usuarios.email, criadoEm: schema.usuarios.criadoEm })
      .from(schema.usuarios).orderBy(asc(schema.usuarios.nome)),
  ]);
  return { loja, bannerProprio: Boolean(loja.bannerChave), bannerPadrao: BANNER_PADRAO, acessos, eu: usuario };
}

type Erros = Record<string, string>;

const ARQUIVOS = [
  { campo: "logo", coluna: "logoChave", prefixo: "logo", svg: true },
  { campo: "logoClaro", coluna: "logoClaroChave", prefixo: "logo-claro", svg: true },
  { campo: "banner", coluna: "bannerChave", prefixo: "banner", svg: false },
] as const;

const urlHttps = (v: string) => /^https:\/\/[^\s]+\.[^\s]+$/.test(v);

export async function action({ request }: Route.ActionArgs) {
  exigirMesmaOrigem(request);
  const usuario = await exigirUsuario(request);
  const form = await request.formData();
  const intencao = String(form.get("intencao") ?? "salvar");

  // ---- senha ----
  if (intencao === "senha") {
    if (!(await dentroDoLimite(`troca-senha:${usuario.id}`, 5, 900_000))) {
      return data({ senha: { erros: { atual: "Muitas tentativas. Aguarde 15 minutos." } as Erros } }, { status: 429 });
    }
    const erros: Erros = {};
    const [linha] = await db.select({ senhaHash: schema.usuarios.senhaHash }).from(schema.usuarios).where(eq(schema.usuarios.id, usuario.id));
    if (!(await conferirSenha(String(form.get("atual") ?? ""), linha.senhaHash))) erros.atual = "Senha atual incorreta.";
    const nova = String(form.get("nova") ?? "");
    if (nova.length < 8) erros.nova = "Pelo menos 8 caracteres.";
    else if (nova !== String(form.get("confirmar") ?? "")) erros.confirmar = "As senhas não conferem.";
    if (Object.keys(erros).length) return data({ senha: { erros } }, { status: 400 });
    await db.update(schema.usuarios).set({ senhaHash: await gerarHash(nova) }).where(eq(schema.usuarios.id, usuario.id));
    // Quem entrou com a senha antiga em outro aparelho sai; esta sessão continua.
    await encerrarOutrasSessoes(request, usuario.id);
    return { senha: { ok: true } };
  }

  // ---- acessos ao painel ----
  if (intencao === "acesso-remover") {
    const id = String(form.get("id"));
    if (id === usuario.id) return data({ acesso: { erro: "Você não pode remover o próprio acesso." } }, { status: 400 });
    const [{ total }] = await db.select({ total: count() }).from(schema.usuarios);
    if (total <= 1) return data({ acesso: { erro: "A loja precisa de pelo menos um acesso." } }, { status: 400 });
    await db.delete(schema.sessoes).where(eq(schema.sessoes.usuarioId, id));
    await db.delete(schema.usuarios).where(eq(schema.usuarios.id, id));
    return { acesso: { ok: true } };
  }
  if (intencao === "acesso-criar") {
    const nome = String(form.get("nome") ?? "").trim();
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const senha = String(form.get("senha") ?? "");
    const erros: Erros = {};
    if (nome.length < 2 || nome.length > 80) erros.nome = "Informe o nome.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) erros.email = "E-mail inválido.";
    if (senha.length < 8) erros.senha = "Pelo menos 8 caracteres.";
    if (!erros.email) {
      const [existe] = await db.select({ id: schema.usuarios.id }).from(schema.usuarios).where(eq(schema.usuarios.email, email)).limit(1);
      if (existe) erros.email = "Este e-mail já tem acesso.";
    }
    if (Object.keys(erros).length) return data({ acesso: { erros } }, { status: 400 });
    await db.insert(schema.usuarios).values({ id: crypto.randomUUID(), nome, email, senhaHash: await gerarHash(senha) });
    return { acesso: { criado: email } };
  }

  // ---- configurações do site ----
  const txt = (k: string, max = 200) => String(form.get(k) ?? "").trim().slice(0, max);
  const atual = await lojaCompleta();
  const erros: Erros = {};
  const v = {
    nome: txt("nome", 60), cnpj: txt("cnpj", 20), slogan: txt("slogan", 140),
    corPrimaria: txt("corPrimaria").toLowerCase(), corSecundaria: txt("corSecundaria").toLowerCase(), corEscura: txt("corEscura").toLowerCase(),
    whatsappDdi: txt("whatsappDdi"), whatsapp: apenasDigitos(txt("whatsapp")), telefoneDdi: txt("telefoneDdi"), telefone: apenasDigitos(txt("telefone")),
    email: txt("email").toLowerCase(), horario: txt("horario", 120),
    endereco: txt("endereco", 120), bairro: txt("bairro", 60), cidade: txt("cidade", 60), uf: txt("uf", 2), cep: apenasDigitos(txt("cep")),
    instagram: txt("instagram"), facebook: txt("facebook"), tiktok: txt("tiktok"), youtube: txt("youtube"),
    whatsappFlutuante: form.get("whatsappFlutuante") === "on", whatsappMensagem: txt("whatsappMensagem", 200),
    heroTitulo: txt("heroTitulo", 90), heroSubtitulo: txt("heroSubtitulo", 200), heroVideo: txt("heroVideo", 300),
    sobre: txt("sobre", 4000), textoVendaCarro: txt("textoVendaCarro", 2000),
  };

  if (v.nome.length < 2) erros.nome = "Informe o nome da loja.";
  for (const c of ["corPrimaria", "corSecundaria", "corEscura"] as const) if (!COR_HEX.test(v[c])) erros[c] = "Use o formato #RRGGBB.";
  if (!erros.corPrimaria && contraste(v.corPrimaria, "#ffffff") < 1.6) erros.corPrimaria = "Clara demais: os botões sumiriam no fundo branco.";
  if (!erros.corEscura && contraste(v.corEscura, "#ffffff") < 4.5) erros.corEscura = "Clara demais: o texto branco do rodapé ficaria ilegível.";
  for (const c of ["whatsappDdi", "telefoneDdi"] as const) if (!DDIS.some((d) => d.ddi === v[c])) v[c] = "55";
  if (v.whatsapp && (v.whatsapp.length < 8 || v.whatsapp.length > 13)) erros.whatsapp = "Informe com DDD.";
  if (v.telefone && (v.telefone.length < 8 || v.telefone.length > 13)) erros.telefone = "Informe com DDD.";
  if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) erros.email = "E-mail inválido.";
  if (v.uf && !(UFS as readonly string[]).includes(v.uf)) erros.uf = "Estado inválido.";
  if (v.cep && v.cep.length !== 8) erros.cep = "CEP com 8 dígitos.";
  for (const c of ["instagram", "facebook", "tiktok", "youtube"] as const) if (v[c] && !urlHttps(v[c])) erros[c] = "Cole o endereço completo, começando com https://";
  if (v.heroVideo && !videoDeFundo(v.heroVideo)) erros.heroVideo = "Use um link do YouTube, do Vimeo ou de um arquivo .mp4 (https).";

  const validos: { campo: (typeof ARQUIVOS)[number]; bytes: ArrayBuffer; tipo: { mime: string; extensao: string } }[] = [];
  for (const campo of ARQUIVOS) {
    const arquivo = form.get(campo.campo);
    if (!(arquivo instanceof File) || !arquivo.size) continue;
    const r = await validarLogo(arquivo, { aceitaSvg: campo.svg });
    if (r.ok) validos.push({ campo, bytes: r.bytes, tipo: r.tipo });
    else erros[campo.campo] = r.erro;
  }
  if (Object.keys(erros).length) return data({ config: { erros } }, { status: 400 });

  const mudancas: Record<string, string> = {};
  const substituidas: string[] = [];
  for (const campo of ARQUIVOS) {
    const novo = validos.find((x) => x.campo === campo);
    if (novo) {
      try {
        mudancas[campo.coluna] = await salvarArquivoLoja(campo.prefixo, novo.bytes, novo.tipo);
      } catch {
        return data({ config: { erros: { [campo.campo]: "Não foi possível guardar a imagem. Tente de novo." } as Erros } }, { status: 500 });
      }
    }
    else if (form.get(`remover_${campo.campo}`) === "1") mudancas[campo.coluna] = "";
    else continue;
    if (atual[campo.coluna]) substituidas.push(atual[campo.coluna]);
  }
  await salvarLoja({ ...v, ...mudancas });
  // Imagem antiga só é apagada depois que a loja aponta para a nova.
  await removerObjetos(substituidas);
  return { config: { ok: true } };
}

type Resposta = {
  config?: { ok?: boolean; erros?: Erros };
  senha?: { ok?: boolean; erros?: Erros };
  acesso?: { erro?: string; erros?: Erros; criado?: string; ok?: boolean };
};

export default function Configuracoes({ loaderData, actionData }: Route.ComponentProps) {
  const { loja, bannerProprio, bannerPadrao, acessos, eu } = loaderData;
  const resposta = actionData as Resposta | undefined;
  const boasVindas = useSearchParams()[0].has("bem-vindo");
  const erros = resposta?.config?.erros ?? {};
  const navigation = useNavigation();
  const salvando = navigation.state === "submitting" && navigation.formData?.get("intencao") === "salvar";

  const [primaria, setPrimaria] = useState(loja.corPrimaria);
  const [secundaria, setSecundaria] = useState(loja.corSecundaria);
  const [escura, setEscura] = useState(loja.corEscura);
  const [logo, setLogo] = useState<string | null>(loja.logo);
  const [sugeridas, setSugeridas] = useState<string[]>([]);
  useEffect(() => setLogo(loja.logo), [loja.logo]);

  useEffect(() => {
    let vivo = true;
    if (!logo) { setSugeridas([]); return; }
    coresDaImagem(logo).then((c) => vivo && setSugeridas(c)).catch(() => vivo && setSugeridas([]));
    return () => { vivo = false; };
  }, [logo]);

  const validas = [primaria, secundaria, escura].every((c) => COR_HEX.test(c));
  const avisos = validas ? avisosCores(primaria, escura) : [];
  function usarCoresDaLogo() {
    const principal = sugeridas.find((c) => contraste(c, "#000000") > 2.2 && contraste(c, "#ffffff") > 2.5);
    const escuraSug = sugeridas.find((c) => contraste(c, "#ffffff") >= 12);
    if (principal) {
      setPrimaria(principal);
      // Secundária: a principal ~15% mais escura, para o hover.
      const [r, g, b] = [1, 3, 5].map((i) => Math.round(parseInt(principal.slice(i, i + 2), 16) * 0.82));
      setSecundaria(`#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`);
    }
    if (escuraSug) setEscura(escuraSug);
  }

  const grade = "grid gap-4 md:grid-cols-2";

  return (
    <div className="max-w-4xl">
      <Cabecalho titulo="Configurações do site" descricao="Identidade, contatos e textos exibidos no site público." />
      {boasVindas && !resposta && (
        <Aviso tipo="sucesso">Seu acesso de administrador foi criado. Comece pelos dados da loja abaixo (nome, logo, cores e contatos). O carro e o lead que já aparecem no painel são exemplos: edite ou exclua quando quiser.</Aviso>
      )}
      {resposta?.config?.ok && <Aviso tipo="sucesso">Configurações salvas. O site já foi atualizado.</Aviso>}
      {resposta?.config?.erros && <Aviso tipo="erro">Revise os campos marcados.</Aviso>}

      <Form method="post" encType="multipart/form-data" noValidate id="form-config" className="grid gap-5">
        <input type="hidden" name="intencao" value="salvar" />

        <Secao titulo="Identidade">
          <div className="grid gap-4">
            <ArquivoImagem key={`logo-${loja.logo}`} campo="logo" rotulo="Logo da loja" url={loja.logo} aoMudar={setLogo}
              aceita="image/png,image/jpeg,image/webp,image/svg+xml" erro={erros.logo}
              dica="PNG, SVG, JPG ou WebP até 1 MB. Ideal: fundo transparente, altura mínima de 80px." />
            <ArquivoImagem key={`claro-${loja.logoClaro}`} campo="logoClaro" rotulo="Logo para fundos escuros (versão branca)" url={loja.logoClaro} escuro
              aceita="image/png,image/webp,image/svg+xml" erro={erros.logoClaro}
              dica="Usada no rodapé e nas landing pages de fundo escuro. Sem ela, a logo principal vai sobre uma plaquinha branca." />
            <div className={grade}>
              <CampoTexto id="nome" rotulo="Nome da loja" defaultValue={loja.nome} maxLength={60} erro={erros.nome} />
              <CampoTexto id="cnpj" rotulo="CNPJ" defaultValue={loja.cnpj} maxLength={20} placeholder="00.000.000/0001-00" />
              <CampoTexto id="slogan" rotulo="Slogan" defaultValue={loja.slogan} maxLength={140} className="md:col-span-2" placeholder="Seminovos com procedência em Belo Horizonte" />
            </div>

            <div className="rounded-xl border border-linha p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-tinta">Cores</p>
                {sugeridas.length > 0 && (
                  <button type="button" onClick={usarCoresDaLogo} className="botao-secundario h-9 px-3 text-sm">
                    <Sparkles className="size-4" aria-hidden="true" /> Usar cores da logo
                  </button>
                )}
              </div>
              {sugeridas.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Cores encontradas na logo">
                  {sugeridas.map((c) => (
                    <li key={c}>
                      <button type="button" onClick={() => setPrimaria(c)} title={`Usar ${c} como principal`} aria-label={`Usar ${c} como cor principal`}
                        className="size-8 rounded-full border border-black/10 ring-offset-2 hover:ring-2 hover:ring-tinta/30" style={{ background: c }} />
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <SeletorCor id="corPrimaria" rotulo="Cor principal" valor={primaria} aoMudar={setPrimaria} dica={erros.corPrimaria ?? "Botões, destaques e links."} />
                <SeletorCor id="corSecundaria" rotulo="Cor secundária (hover)" valor={secundaria} aoMudar={setSecundaria} dica={erros.corSecundaria ?? "Botão ao passar o mouse."} />
                <SeletorCor id="corEscura" rotulo="Cor escura" valor={escura} aoMudar={setEscura} dica={erros.corEscura ?? "Banner, rodapé e faixas."} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {PREDEFINIDAS.map((p) => {
                  const ativa = p.primaria === primaria && p.escura === escura;
                  return (
                    <button key={p.nome} type="button" aria-pressed={ativa} onClick={() => { setPrimaria(p.primaria); setSecundaria(p.secundaria); setEscura(p.escura); }}
                      className={cn("flex h-9 items-center gap-2 rounded-full border bg-white pl-1.5 pr-3 text-sm", ativa ? "border-tinta text-tinta" : "border-linha-forte text-texto hover:border-suave")}>
                      <span className="flex"><span className="size-6 rounded-full border-2 border-white" style={{ background: p.primaria }} /><span className="-ml-2 size-6 rounded-full border-2 border-white" style={{ background: p.escura }} /></span>
                      {p.nome}{ativa && <Check className="size-4" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
              {validas && (
                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg p-3" style={{ background: escura }} aria-hidden="true">
                  <span className="rounded-lg px-4 py-2 text-sm font-semibold" style={{ background: primaria, color: contraste(primaria, "#fff") >= 3 ? "#fff" : "#1b1d26" }}>Botão</span>
                  <span className="rounded-lg px-4 py-2 text-sm font-semibold" style={{ background: secundaria, color: contraste(secundaria, "#fff") >= 3 ? "#fff" : "#1b1d26" }}>Hover</span>
                  <span className="text-sm text-white">Texto sobre a cor escura</span>
                </div>
              )}
              {avisos.map((a) => (
                <p key={a} className="mt-3 flex gap-2 rounded-lg bg-alerta-fundo px-3 py-2 text-sm text-alerta"><TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{a}</p>
              ))}
            </div>
          </div>
        </Secao>

        <Secao titulo="Contato">
          <div className={grade}>
            <CampoTelefone id="whatsapp" rotulo="WhatsApp principal" ddi={loja.whatsappDdi} numero={loja.whatsapp} erro={erros.whatsapp}
              dica="Usado quando o carro não tem vendedor e no botão flutuante." />
            <CampoTelefone id="telefone" rotulo="Telefone" ddi={loja.telefoneDdi} numero={loja.telefone} erro={erros.telefone} />
            <CampoTexto id="email" rotulo="E-mail" type="email" defaultValue={loja.email} erro={erros.email} />
            <CampoTexto id="horario" rotulo="Horário de atendimento" defaultValue={loja.horario} placeholder="Seg a sex 8h–18h · Sáb 8h–13h" />
            <CampoTexto id="endereco" rotulo="Endereço" defaultValue={loja.endereco} placeholder="Av. do Contorno, 5000" />
            <CampoTexto id="bairro" rotulo="Bairro" defaultValue={loja.bairro} />
            <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-3">
              <CampoTexto id="cidade" rotulo="Cidade" defaultValue={loja.cidade} />
              <CampoSelecao id="uf" rotulo="UF" defaultValue={loja.uf} erro={erros.uf}>
                <option value="">—</option>
                {UFS.map((u) => <option key={u}>{u}</option>)}
              </CampoSelecao>
            </div>
            <CampoTexto id="cep" rotulo="CEP" inputMode="numeric" defaultValue={cep(loja.cep)} erro={erros.cep} />
            <CampoTexto id="instagram" rotulo="Instagram (URL)" type="url" defaultValue={loja.instagram} placeholder="https://instagram.com/minhaloja" erro={erros.instagram} />
            <CampoTexto id="facebook" rotulo="Facebook (URL)" type="url" defaultValue={loja.facebook} placeholder="https://facebook.com/minhaloja" erro={erros.facebook} />
            <CampoTexto id="tiktok" rotulo="TikTok (URL)" type="url" defaultValue={loja.tiktok} placeholder="https://tiktok.com/@minhaloja" erro={erros.tiktok} />
            <CampoTexto id="youtube" rotulo="YouTube (URL)" type="url" defaultValue={loja.youtube} placeholder="https://youtube.com/@minhaloja" erro={erros.youtube} />
          </div>
        </Secao>

        <Secao titulo="Botão flutuante de WhatsApp" descricao="Botão verde fixo no canto inferior direito de todas as páginas. Usa o WhatsApp principal acima.">
          <div className="grid items-end gap-4 md:grid-cols-[auto_minmax(0,1fr)]">
            <label className="flex h-11 cursor-pointer items-center gap-2.5 text-sm font-medium text-tinta">
              <input type="checkbox" name="whatsappFlutuante" defaultChecked={loja.whatsappFlutuante} className="size-4 accent-marca-600" /> Exibir no site
            </label>
            <CampoTexto id="whatsappMensagem" rotulo="Mensagem inicial" defaultValue={loja.whatsappMensagem} maxLength={200} />
          </div>
        </Secao>

        <Secao titulo="Textos e imagens do site">
          <div className="grid gap-4">
            <CampoTexto id="heroTitulo" rotulo="Título do banner da home" defaultValue={loja.heroTitulo} maxLength={90} placeholder={loja.slogan || "Seu próximo carro está aqui"}
              dica="Vazio: usa o slogan." />
            <CampoTexto id="heroSubtitulo" rotulo="Subtítulo do banner" defaultValue={loja.heroSubtitulo} maxLength={200} dica="Vazio: mostra quantos carros há no estoque." />
            <ArquivoImagem key={`banner-${loja.banner}`} campo="banner" rotulo="Imagem de fundo do banner" url={bannerProprio ? loja.banner : null} padrao={bannerPadrao} largo
              aceita="image/png,image/jpeg,image/webp" reduzirPara={2000} erro={erros.banner}
              dica={bannerProprio ? "Ideal 1920×1080, com o assunto à direita (o texto fica à esquerda)." : "Sem imagem própria: usa a foto padrão. Ideal 1920×1080, JPG ou WebP."} />
            <CampoTexto id="heroVideo" rotulo="Vídeo de fundo do banner (opcional)" type="url" defaultValue={loja.heroVideo} placeholder="https://www.youtube.com/watch?v=…" erro={erros.heroVideo}
              dica="YouTube, Vimeo ou arquivo .mp4. Toca sem som, em loop, com véu escuro; a imagem acima fica como capa enquanto carrega." />
            <CampoArea id="sobre" rotulo="Texto da página “A loja”" rows={5} defaultValue={loja.sobre} maxLength={4000} dica="Separe parágrafos com uma linha em branco." />
            <CampoArea id="textoVendaCarro" rotulo="Texto da página “Venda seu carro”" rows={4} defaultValue={loja.textoVendaCarro} maxLength={2000}
              placeholder="Compramos seu carro com avaliação justa e pagamento rápido…" />
          </div>
        </Secao>
      </Form>

      <div className="mt-5 grid gap-5">
        <Acessos acessos={acessos} euId={eu.id} />
        <Senha resposta={resposta?.senha} />
      </div>

      <BarraSalvar>
        <button type="submit" form="form-config" disabled={salvando} className="botao-primario h-10 min-w-44 px-5 text-sm">{salvando ? "Salvando…" : "Salvar configurações"}</button>
      </BarraSalvar>
    </div>
  );
}

function Acessos({ acessos, euId }: { acessos: { id: string; nome: string; email: string; criadoEm: number }[]; euId: string }) {
  const novo = useFetcher<Resposta>();
  const remover = useFetcher<Resposta>();
  const erros = novo.data?.acesso?.erros ?? {};
  const removendo = remover.formData?.get("id");

  return (
    <Secao titulo="Acessos ao painel" descricao="Todos têm as mesmas permissões. Passe a senha inicial pessoalmente; a pessoa troca depois de entrar.">
      <ul className="divide-y divide-linha rounded-xl border border-linha">
        {acessos.filter((a) => a.id !== removendo).map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <span className="grid size-9 place-items-center rounded-full bg-marca-50 text-sm font-bold text-marca-700" aria-hidden="true">{a.nome.charAt(0).toUpperCase()}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-tinta">{a.nome}{a.id === euId && <span className="ml-1.5 font-normal text-suave">(você)</span>}</p>
              <p className="truncate text-xs text-suave">{a.email} · desde {tempoRelativo(a.criadoEm)}</p>
            </div>
            {a.id !== euId && (
              <remover.Form method="post" onSubmit={(e) => { if (!confirm(`Remover o acesso de ${a.nome}? A pessoa sai do painel na hora.`)) e.preventDefault(); }}>
                <input type="hidden" name="intencao" value="acesso-remover" />
                <input type="hidden" name="id" value={a.id} />
                <button className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-erro hover:bg-erro-fundo"><Trash2 className="size-3.5" aria-hidden="true" /> Remover</button>
              </remover.Form>
            )}
          </li>
        ))}
      </ul>
      {remover.data?.acesso?.erro && <p role="alert" className="mt-2 text-sm text-erro">{remover.data.acesso.erro}</p>}

      <novo.Form key={novo.data?.acesso?.criado ?? "novo"} method="post" noValidate className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-start">
        <input type="hidden" name="intencao" value="acesso-criar" />
        <CampoTexto id="acesso-nome" name="nome" rotulo="Nome" autoComplete="off" erro={erros.nome} />
        <CampoTexto id="acesso-email" name="email" rotulo="E-mail" type="email" autoComplete="off" erro={erros.email} />
        <CampoTexto id="acesso-senha" name="senha" rotulo="Senha inicial" type="password" autoComplete="new-password" erro={erros.senha} />
        <button type="submit" disabled={novo.state !== "idle"} className="botao-secundario h-11 px-4 text-sm md:mt-[26px]">{novo.state !== "idle" ? "Criando…" : "Dar acesso"}</button>
      </novo.Form>
      {novo.data?.acesso?.criado && <p role="status" className="mt-2 text-sm font-medium text-sucesso">Acesso criado para {novo.data.acesso.criado}.</p>}
    </Secao>
  );
}

function Senha({ resposta }: { resposta?: { ok?: boolean; erros?: Erros } }) {
  const navigation = useNavigation();
  const enviando = navigation.state === "submitting" && navigation.formData?.get("intencao") === "senha";
  const erros = resposta?.erros ?? {};
  return (
    <Secao titulo="Alterar minha senha" descricao="Use pelo menos 8 caracteres. Ao trocar, as sessões abertas em outros aparelhos são encerradas.">
      {resposta?.ok ? (
        <p role="status" className="rounded-lg bg-sucesso-fundo px-3 py-2.5 text-sm text-sucesso">Senha alterada. Sessões abertas em outros aparelhos foram encerradas.</p>
      ) : (
        <Form method="post" noValidate className="grid gap-3 md:grid-cols-3">
          <input type="hidden" name="intencao" value="senha" />
          <CampoTexto id="atual" rotulo="Senha atual" type="password" autoComplete="current-password" erro={erros.atual} />
          <CampoTexto id="nova" rotulo="Nova senha" type="password" autoComplete="new-password" erro={erros.nova} />
          <CampoTexto id="confirmar" rotulo="Confirmar nova senha" type="password" autoComplete="new-password" erro={erros.confirmar} />
          <div className="flex justify-end md:col-span-3">
            <button type="submit" disabled={enviando} className="botao h-10 border border-tinta bg-white px-5 text-sm text-tinta hover:bg-fundo">{enviando ? "Alterando…" : "Alterar senha"}</button>
          </div>
        </Form>
      )}
    </Secao>
  );
}

export { ErroPainel as ErrorBoundary } from "~/components/admin/ErroPainel";
