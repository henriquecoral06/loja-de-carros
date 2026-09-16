import { eq } from "drizzle-orm";
import { Check, ImageUp, Sparkles, Trash2, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { data, Form, useNavigation } from "react-router";
import { db, schema } from "~/.server/db";
import { removerObjetos, salvarArquivoLoja, validarLogo } from "~/.server/imagens";
import { BANNER_PADRAO, obterLoja } from "~/.server/loja";
import { exigirUsuario } from "~/.server/sessao";
import { exigirMesmaOrigem } from "~/.server/seguranca";
import { avisosCores, COR_HEX, contraste, estiloTema, paleta, PREDEFINIDAS } from "~/lib/cores";
import { coresDaImagem, reduzirImagem } from "~/lib/imagem-cliente";
import { metaAdmin } from "~/lib/site";
import { cn } from "~/lib/ui";
import type { Route } from "./+types/aparencia";

export function meta({ matches }: Route.MetaArgs) {
  return metaAdmin("Aparência", matches);
}

export async function loader({ request }: Route.LoaderArgs) {
  await exigirUsuario(request);
  const loja = await obterLoja();
  return {
    nome: loja.nome, corPrimaria: loja.corPrimaria, corEscura: loja.corEscura,
    logo: loja.logo, logoClaro: loja.logoClaro, banner: loja.bannerChave ? loja.banner : null, bannerPadrao: BANNER_PADRAO,
  };
}

type Campo = "logo" | "logoClaro" | "banner" | "cores";
type Erros = Partial<Record<Campo, string>>;

const ARQUIVOS = [
  { campo: "logo", coluna: "logoChave", prefixo: "logo", svg: true },
  { campo: "logoClaro", coluna: "logoClaroChave", prefixo: "logo-claro", svg: true },
  { campo: "banner", coluna: "bannerChave", prefixo: "banner", svg: false },
] as const;

export async function action({ request }: Route.ActionArgs) {
  exigirMesmaOrigem(request);
  await exigirUsuario(request);
  const form = await request.formData();
  const atual = await obterLoja();

  const corPrimaria = String(form.get("corPrimaria") ?? "").trim().toLowerCase();
  const corEscura = String(form.get("corEscura") ?? "").trim().toLowerCase();
  const erros: Erros = {};
  if (!COR_HEX.test(corPrimaria) || !COR_HEX.test(corEscura)) erros.cores = "Use cores no formato #RRGGBB.";
  else if (contraste(corPrimaria, "#ffffff") < 1.6) erros.cores = "A cor principal está clara demais: os botões sumiriam no fundo branco.";
  else if (contraste(corEscura, "#ffffff") < 4.5) erros.cores = "A cor escura está clara demais: o texto branco do topo e do rodapé ficaria ilegível.";
  else if (contraste(corPrimaria, paleta(corPrimaria, corEscura)["sobre-marca"]) < 3) erros.cores = "Nessa cor principal o texto dos botões fica ilegível. Escolha um tom mais escuro ou mais claro.";

  // Valida tudo antes de gravar qualquer arquivo.
  const validos: { campo: (typeof ARQUIVOS)[number]; bytes: ArrayBuffer; tipo: { mime: string; extensao: string } }[] = [];
  for (const campo of ARQUIVOS) {
    const arquivo = form.get(campo.campo);
    if (!(arquivo instanceof File) || !arquivo.size) continue;
    const r = await validarLogo(arquivo, { aceitaSvg: campo.svg });
    if (r.ok) validos.push({ campo, bytes: r.bytes, tipo: r.tipo });
    else erros[campo.campo] = r.erro;
  }
  if (Object.keys(erros).length) return data({ erros, ok: false }, { status: 400 });

  const mudancas: Record<string, string> = { corPrimaria, corEscura };
  const substituidas: string[] = [];
  for (const campo of ARQUIVOS) {
    const novo = validos.find((v) => v.campo === campo);
    if (novo) mudancas[campo.coluna] = await salvarArquivoLoja(campo.prefixo, novo.bytes, novo.tipo);
    else if (form.get(`remover_${campo.campo}`) === "1") mudancas[campo.coluna] = "";
    else continue;
    if (atual[campo.coluna]) substituidas.push(atual[campo.coluna]);
  }

  if (atual.atualizadoEm) {
    await db.update(schema.loja).set({ ...mudancas, atualizadoEm: Date.now() }).where(eq(schema.loja.id, 1));
  } else {
    // Loja ainda sem cadastro: cria a linha com o nome padrão.
    await db.insert(schema.loja).values({ id: 1, nome: atual.nome, whatsapp: "", ...mudancas });
  }
  // Arquivo antigo só sai do R2 depois que o banco aponta para o novo.
  await removerObjetos(substituidas);
  return { erros: {} as Erros, ok: true };
}

export default function Aparencia({ loaderData, actionData }: Route.ComponentProps) {
  const l = loaderData;
  const erros = actionData?.erros ?? {};
  const navigation = useNavigation();
  const enviando = navigation.state === "submitting";

  const [primaria, setPrimaria] = useState(l.corPrimaria);
  const [escura, setEscura] = useState(l.corEscura);
  const [logo, setLogo] = useState<string | null>(l.logo);
  const [logoClaro, setLogoClaro] = useState<string | null>(l.logoClaro);
  const [banner, setBanner] = useState<string | null>(l.banner);
  const [sugeridas, setSugeridas] = useState<string[]>([]);

  // Depois de salvar, o loader devolve as URLs definitivas.
  useEffect(() => { setLogo(l.logo); setLogoClaro(l.logoClaro); setBanner(l.banner); }, [l.logo, l.logoClaro, l.banner]);

  // Sugestões de cor tiradas do logo atual (ou do recém-escolhido).
  useEffect(() => {
    let vivo = true;
    if (!logo) { setSugeridas([]); return; }
    coresDaImagem(logo).then((c) => vivo && setSugeridas(c)).catch(() => vivo && setSugeridas([]));
    return () => { vivo = false; };
  }, [logo]);

  const validas = COR_HEX.test(primaria) && COR_HEX.test(escura);
  const avisos = validas ? avisosCores(primaria, escura) : ["Use cores no formato #RRGGBB."];
  const aplicarSugestao = () => {
    // Principal: a cor mais presente que não seja quase preta nem quase cinza.
    const saturada = sugeridas.find((c) => contraste(c, "#000000") > 2.2 && contraste(c, "#ffffff") > 2.5);
    const escuraSug = sugeridas.find((c) => contraste(c, "#ffffff") >= 12);
    if (saturada) setPrimaria(saturada);
    setEscura(escuraSug ?? (saturada ? paleta(saturada, "#000000")["marca-800"] : escura));
  };

  return (
    <Form method="post" encType="multipart/form-data" noValidate className="pb-24">
      <h1 className="text-2xl font-extrabold tracking-tight text-tinta">Aparência</h1>
      <p className="text-suave">Logo, banner e cores do site. A prévia ao lado mostra o resultado antes de salvar.</p>

      {actionData?.ok && <p role="status" className="mt-4 rounded-xl border border-sucesso/20 bg-sucesso-fundo px-4 py-3 font-semibold text-sucesso">Aparência salva. O site já está com a nova cara.</p>}
      {Object.keys(erros).length > 0 && <p role="alert" className="mt-4 rounded-xl border border-erro/20 bg-erro-fundo px-4 py-3 text-sm text-erro">Revise os campos marcados.</p>}

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid gap-4">
          <section aria-labelledby="sec-logo" className="cartao p-5 sm:p-6">
            <h2 id="sec-logo" className="text-lg font-bold text-tinta">Logo</h2>
            <p className="mt-1 text-sm text-suave">PNG com fundo transparente ou SVG, até 1 MB. Aparece no topo do site, no rodapé e no painel.</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <ArquivoImagem key={`logo-${l.logo}`} campo="logo" rotulo="Logo principal" dica="Para fundo claro (topo do site)" url={logo} aoMudar={setLogo}
                aceita="image/png,image/jpeg,image/webp,image/svg+xml" erro={erros.logo} />
              <ArquivoImagem key={`claro-${l.logoClaro}`} campo="logoClaro" rotulo="Logo para fundo escuro" dica="Opcional. Sem ela, o rodapé usa a principal sobre uma plaquinha branca."
                url={logoClaro} aoMudar={setLogoClaro} aceita="image/png,image/jpeg,image/webp,image/svg+xml" escuro erro={erros.logoClaro} />
            </div>
          </section>

          <section aria-labelledby="sec-cores" className="cartao p-5 sm:p-6">
            <h2 id="sec-cores" className="text-lg font-bold text-tinta">Cores</h2>
            <p className="mt-1 text-sm text-suave">A principal vai nos botões, links e selos. A escura, no banner, no rodapé e nas faixas de destaque.</p>

            {sugeridas.length > 0 && (
              <div className="mt-4 rounded-xl border border-linha bg-fundo p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-tinta">
                    <Sparkles className="size-4 text-marca-700" aria-hidden="true" /> Cores encontradas na logo
                  </p>
                  <button type="button" onClick={aplicarSugestao} className="botao-secundario h-9 px-3 text-sm">Usar cores da logo</button>
                </div>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {sugeridas.map((c) => (
                    <li key={c}>
                      <button type="button" onClick={() => setPrimaria(c)} title={`Usar ${c} como principal`}
                        className="flex h-9 items-center gap-2 rounded-full border border-linha-forte bg-white pl-1 pr-3 text-xs font-medium text-texto hover:border-tinta">
                        <span className="size-7 rounded-full border border-black/10" style={{ background: c }} />
                        <span className="numeros uppercase">{c}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-suave">Clique numa cor para usá-la como principal.</p>
              </div>
            )}

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <SeletorCor id="corPrimaria" rotulo="Cor principal" valor={primaria} aoMudar={setPrimaria} />
              <SeletorCor id="corEscura" rotulo="Cor escura" valor={escura} aoMudar={setEscura} />
            </div>

            <fieldset className="mt-5">
              <legend className="text-sm font-medium text-tinta">Combinações prontas</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {PREDEFINIDAS.map((p) => {
                  const ativa = p.primaria === primaria && p.escura === escura;
                  return (
                    <button key={p.nome} type="button" onClick={() => { setPrimaria(p.primaria); setEscura(p.escura); }} aria-pressed={ativa}
                      className={cn("flex h-10 items-center gap-2 rounded-full border bg-white pl-1.5 pr-3.5 text-sm font-medium", ativa ? "border-tinta text-tinta" : "border-linha-forte text-texto hover:border-suave")}>
                      <span className="flex">
                        <span className="size-6 rounded-full border-2 border-white" style={{ background: p.primaria }} />
                        <span className="-ml-2 size-6 rounded-full border-2 border-white" style={{ background: p.escura }} />
                      </span>
                      {p.nome}
                      {ativa && <Check className="size-4" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {(avisos.length > 0 || erros.cores) && (
              <ul role="alert" className="mt-4 grid gap-2">
                {[...(erros.cores ? [erros.cores] : []), ...avisos.filter((a) => a !== erros.cores)].map((a) => (
                  <li key={a} className="flex gap-2 rounded-lg bg-alerta-fundo px-3 py-2 text-sm text-alerta">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {a}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="sec-banner" className="cartao p-5 sm:p-6">
            <h2 id="sec-banner" className="text-lg font-bold text-tinta">Banner da página inicial</h2>
            <p className="mt-1 text-sm text-suave">Foto horizontal, de preferência 2000 × 900 px — a fachada, o pátio ou um carro do estoque. O texto fica à esquerda, então deixe o assunto à direita.</p>
            <div className="mt-4 max-w-xl">
              <ArquivoImagem key={`banner-${l.banner}`} campo="banner" rotulo="Imagem do banner" dica={banner ? undefined : "Sem imagem própria, o site usa uma foto de banco de imagens."}
                url={banner} padrao={l.bannerPadrao} aoMudar={setBanner} aceita="image/png,image/jpeg,image/webp" reduzirPara={2000} largo erro={erros.banner} />
            </div>
          </section>
        </div>

        <aside aria-label="Prévia" className="xl:sticky xl:top-20">
          <p className="mb-2 text-sm font-semibold text-suave">Prévia</p>
          <Previa nome={l.nome} primaria={validas ? primaria : l.corPrimaria} escura={validas ? escura : l.corEscura}
            logo={logo} logoClaro={logoClaro} banner={banner ?? l.bannerPadrao} />
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-linha bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-end gap-3 px-4 py-3 sm:px-6">
          <button type="submit" disabled={enviando} className="botao-primario min-w-44">{enviando ? "Salvando…" : "Salvar aparência"}</button>
        </div>
      </div>
    </Form>
  );
}

function SeletorCor({ id, rotulo, valor, aoMudar }: { id: string; rotulo: string; valor: string; aoMudar: (v: string) => void }) {
  const [texto, setTexto] = useState(valor);
  useEffect(() => setTexto(valor), [valor]);
  const valido = COR_HEX.test(texto);

  return (
    <div>
      <label htmlFor={id} className="rotulo">{rotulo}</label>
      <div className="flex gap-2">
        <input type="color" aria-label={`${rotulo}: seletor`} value={COR_HEX.test(valor) ? valor : "#000000"}
          onChange={(e) => aoMudar(e.target.value)} className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-linha-forte bg-white p-1" />
        <input id={id} name={id} value={texto} maxLength={7} spellCheck={false} autoComplete="off"
          onChange={(e) => {
            const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
            setTexto(v);
            if (COR_HEX.test(v)) aoMudar(v.toLowerCase());
          }}
          className="campo numeros uppercase" aria-invalid={valido ? undefined : true} />
      </div>
    </div>
  );
}

function ArquivoImagem({ campo, rotulo, dica, url, padrao, aoMudar, aceita, escuro, largo, reduzirPara, erro }: {
  campo: string; rotulo: string; dica?: string; url: string | null; padrao?: string; aoMudar: (url: string | null) => void;
  aceita: string; escuro?: boolean; largo?: boolean; reduzirPara?: number; erro?: string;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [remover, setRemover] = useState(false);
  const [nome, setNome] = useState("");
  const mostrada = url ?? padrao ?? null;

  async function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    let arquivo = e.target.files?.[0];
    if (!arquivo) return;
    if (reduzirPara && arquivo.type !== "image/svg+xml") {
      arquivo = await reduzirImagem(arquivo, reduzirPara);
      const dt = new DataTransfer();
      dt.items.add(arquivo);
      e.target.files = dt.files;
    }
    setRemover(false);
    setNome(arquivo.name);
    aoMudar(URL.createObjectURL(arquivo));
  }

  return (
    <div>
      <p className="rotulo">{rotulo}</p>
      <div className={cn("grid place-items-center overflow-hidden rounded-xl border border-dashed border-linha-forte",
        largo ? "aspect-[20/9]" : "h-32 p-4", escuro ? "bg-noite" : "bg-fundo")}>
        {mostrada ? (
          <img src={mostrada} alt="" className={largo ? "size-full object-cover" : "max-h-full max-w-full object-contain"} />
        ) : (
          <span className={cn("text-sm", escuro ? "text-white/60" : "text-fraco")}>Nenhuma imagem</span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="botao-secundario h-9 cursor-pointer px-3 text-sm focus-within:outline-2 focus-within:outline-marca-600">
          <ImageUp className="size-4" aria-hidden="true" /> {url ? "Trocar" : "Enviar"}
          <input ref={entrada} type="file" name={campo} accept={aceita} onChange={escolher} className="sr-only" />
        </label>
        {url && (
          <button type="button" className="botao-fantasma h-9 px-3 text-sm text-erro"
            onClick={() => { setRemover(true); setNome(""); if (entrada.current) entrada.current.value = ""; aoMudar(null); }}>
            <Trash2 className="size-4" aria-hidden="true" /> Remover
          </button>
        )}
        {nome && <span className="truncate text-xs text-suave">{nome}</span>}
      </div>
      <input type="hidden" name={`remover_${campo}`} value={remover ? "1" : ""} />
      {erro ? <p className="mt-1.5 text-sm text-erro">{erro}</p> : dica ? <p className="mt-1.5 text-xs text-suave">{dica}</p> : null}
    </div>
  );
}

/** Miniatura do site com as cores e logos escolhidos, sem salvar nada. */
function Previa({ nome, primaria, escura, logo, logoClaro, banner }: { nome: string; primaria: string; escura: string; logo: string | null; logoClaro: string | null; banner: string }) {
  const logoTexto = (claro: boolean) => (
    <span className={cn("flex items-center gap-1.5 text-[13px] font-extrabold", claro ? "text-white" : "text-tinta")}>
      <span className="size-5 rounded bg-marca-600" /> {nome}
    </span>
  );

  return (
    <div style={estiloTema(primaria, escura)} className="overflow-hidden rounded-xl border border-linha bg-fundo shadow-card" aria-hidden="true">
      <div className="flex h-12 items-center justify-between gap-3 border-b border-linha bg-white px-3">
        {logo ? <img src={logo} alt="" className="h-7 max-w-[140px] object-contain" /> : logoTexto(false)}
        <span className="rounded-md bg-marca-600 px-2.5 py-1.5 text-[11px] font-semibold text-sobre-marca">Fale com a loja</span>
      </div>
      <div className="relative isolate h-28 bg-noite">
        <img src={banner} alt="" className="absolute inset-0 -z-10 size-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-noite via-noite/85 to-noite/30" />
        <p className="max-w-[60%] p-3 text-sm font-extrabold leading-tight text-white">Seu próximo carro está aqui</p>
      </div>
      <div className="grid grid-cols-2 gap-2 p-3">
        {[
          { nome: "Toyota Corolla", preco: "R$ 139.900", foto: "1638618164682-12b986ec2a75" },
          { nome: "Jeep Compass", preco: "R$ 169.900", foto: "1615063029891-497bebd4f03c" },
        ].map((carro, i) => (
          <div key={carro.nome} className="overflow-hidden rounded-lg border border-linha bg-white">
            <div className="relative aspect-[4/3] bg-linha">
              <img src={`https://images.unsplash.com/photo-${carro.foto}?auto=format&fit=crop&w=320&h=240&q=60`} alt="" className="size-full object-cover" />
              {i === 0 && <span className="absolute left-1.5 top-1.5 rounded bg-marca-600 px-1.5 py-0.5 text-[9px] font-bold uppercase text-sobre-marca">Destaque</span>}
            </div>
            <div className="p-2">
              <p className="text-[11px] font-bold uppercase text-tinta">{carro.nome}</p>
              <p className="numeros text-sm font-extrabold text-tinta">{carro.preco}</p>
              <p className="text-[10px] font-semibold text-marca-700">Ver detalhes</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2 bg-noite px-3 py-3">
        {logoClaro ? <img src={logoClaro} alt="" className="h-6 max-w-[120px] object-contain" />
          : logo ? <span className="rounded bg-white px-2 py-1"><img src={logo} alt="" className="h-5 max-w-[110px] object-contain" /></span>
          : logoTexto(true)}
        <span className="text-[10px] text-white/60">Rodapé</span>
      </div>
    </div>
  );
}
