import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Eye, EyeSlash, Trash, UploadSimple } from "@phosphor-icons/react";
import { supabase } from "@/integrations/supabase/client";
import type { Banner } from "@/integrations/supabase/types";
import { Badge, Button, Card, Field, Input } from "@/components/ui";

const LIMITE_MB = 5;

export function useBanners() {
  return useQuery({
    queryKey: ["banners-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("banners").select("*").order("ordem");
      if (error) throw error;
      return (data ?? []) as Banner[];
    },
  });
}

/**
 * A abertura do site é um carrossel: sem texto por cima, sem botão. Tudo
 * o que a imagem precisa dizer está nela. Por isso o alt é campo de
 * cadastro e não algo gerado — é a única descrição que sobra para o
 * leitor de tela e para o buscador.
 */
export default function GestaoBanners() {
  const { data: banners, isLoading } = useBanners();
  const qc = useQueryClient();
  const entrada = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  const recarregar = () => {
    qc.invalidateQueries({ queryKey: ["banners-admin"] });
    qc.invalidateQueries({ queryKey: ["banners"] });
  };

  const atualizar = useMutation({
    mutationFn: async ({ id, dados }: { id: string; dados: Partial<Banner> }) => {
      const { error } = await supabase.from("banners").update(dados).eq("id", id);
      if (error) throw error;
    },
    onSuccess: recarregar,
  });

  async function enviar(arquivos: FileList | null) {
    if (!arquivos?.length) return;
    setEnviando(true);
    setErro("");

    // A ordem vem do banco, não da lista em memória: enviando um
    // arquivo por vez, a lista do cliente ainda não tinha o anterior e
    // todos entravam com ordem 0.
    const { data: ultimo } = await supabase
      .from("banners").select("ordem").order("ordem", { ascending: false }).limit(1).maybeSingle();
    let ordem = ((ultimo as any)?.ordem ?? -1) + 1;

    for (const arquivo of Array.from(arquivos)) {
      if (arquivo.size > LIMITE_MB * 1024 * 1024) {
        setErro(`${arquivo.name} passa de ${LIMITE_MB} MB e foi ignorado.`);
        continue;
      }
      const extensao = arquivo.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const caminho = `banners/${crypto.randomUUID()}.${extensao}`;
      const { error } = await supabase.storage.from("marca").upload(caminho, arquivo, { cacheControl: "31536000" });
      if (error) { setErro(error.message); continue; }

      const { data } = supabase.storage.from("marca").getPublicUrl(caminho);
      await supabase.from("banners").insert({ url: data.publicUrl, ordem: ordem++, alt: "" });
    }

    setEnviando(false);
    if (entrada.current) entrada.current.value = "";
    recarregar();
  }

  async function mover(id: string, direcao: -1 | 1) {
    const lista = [...(banners ?? [])];
    const i = lista.findIndex((b) => b.id === id);
    const j = i + direcao;
    if (j < 0 || j >= lista.length) return;
    await Promise.all([
      supabase.from("banners").update({ ordem: j }).eq("id", lista[i].id),
      supabase.from("banners").update({ ordem: i }).eq("id", lista[j].id),
    ]);
    recarregar();
  }

  async function remover(banner: Banner) {
    const caminho = banner.url.split("/marca/").pop();
    if (caminho) await supabase.storage.from("marca").remove([caminho]);
    await supabase.from("banners").delete().eq("id", banner.id);
    recarregar();
  }

  const semDescricao = (banners ?? []).filter((b) => b.ativo && !b.alt.trim()).length;

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-heading-md text-ink">Banners publicados</h2>
          <p className="mt-1 max-w-[58ch] text-body-sm text-mute">
            Formam o carrossel de abertura da home. Aparecem na ordem abaixo.
          </p>
        </div>
        <Button type="button" disabled={enviando} onClick={() => entrada.current?.click()}
          icon={<UploadSimple size={14} />}>
          {enviando ? "Enviando…" : "Enviar imagens"}
        </Button>
      </div>

      <input ref={entrada} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden"
        onChange={(e) => enviar(e.target.files)} />

      {erro && <p className="mb-3 text-body-sm text-danger-deep">{erro}</p>}

      {semDescricao > 0 && (
        <p className="mb-3 rounded-ds-md border border-warning-soft/40 bg-warning-soft/[0.08] p-3 text-body-sm text-body">
          {semDescricao === 1 ? "Um banner está" : `${semDescricao} banners estão`} sem descrição.
          Como não há texto na imagem, é a descrição que conta ao leitor de tela e ao
          Google o que ela mostra.
        </p>
      )}

      {isLoading ? (
        <p className="text-body-sm text-mute">Carregando…</p>
      ) : !banners?.length ? (
        <div className="rounded-ds-lg border border-dashed border-hairline-strong p-10 text-center">
          <p className="text-heading-sm text-ink">Nenhum banner ainda.</p>
          <p className="mx-auto mt-2 max-w-[42ch] text-body-sm text-mute">
            Sem banner, a home abre com uma faixa na cor da marca e o nome da loja.
            Use o gerador abaixo para criar a imagem e envie aqui.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {banners.map((b, i) => (
            <li key={b.id}>
              <Card className="flex flex-col gap-4 p-3 sm:flex-row sm:items-start">
                <div className="relative aspect-[12/5] w-full shrink-0 overflow-hidden rounded-ds-sm bg-elevated sm:w-56">
                  <img src={b.url} alt="" className={`h-full w-full object-cover ${b.ativo ? "" : "opacity-40 grayscale"}`} />
                  {!b.ativo && (
                    <span className="absolute left-1.5 top-1.5">
                      <Badge tone="neutral">oculto</Badge>
                    </span>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <Field id={`alt-${b.id}`} label="O que a imagem mostra"
                    hint="Ex.: fachada da loja com carros no pátio ao entardecer.">
                    <Input id={`alt-${b.id}`} defaultValue={b.alt}
                      placeholder="Descreva a cena em uma frase"
                      onBlur={(e) => e.target.value !== b.alt && atualizar.mutate({ id: b.id, dados: { alt: e.target.value } })} />
                  </Field>

                  <Field id={`link-${b.id}`} label="Link ao clicar (opcional)">
                    <Input id={`link-${b.id}`} defaultValue={b.link ?? ""} placeholder="/estoque"
                      onBlur={(e) => e.target.value !== (b.link ?? "") && atualizar.mutate({ id: b.id, dados: { link: e.target.value || null } })} />
                  </Field>

                  <div className="flex flex-wrap items-center gap-1">
                    <button type="button" onClick={() => mover(b.id, -1)} disabled={i === 0}
                      title="Mover para cima" aria-label="Mover para cima"
                      className="ds-focus rounded-ds-sm p-2 text-mute hover:bg-ink/[0.05] hover:text-ink disabled:opacity-30">
                      <ArrowLeft size={15} />
                    </button>
                    <button type="button" onClick={() => mover(b.id, 1)} disabled={i === banners.length - 1}
                      title="Mover para baixo" aria-label="Mover para baixo"
                      className="ds-focus rounded-ds-sm p-2 text-mute hover:bg-ink/[0.05] hover:text-ink disabled:opacity-30">
                      <ArrowRight size={15} />
                    </button>
                    <button type="button" onClick={() => atualizar.mutate({ id: b.id, dados: { ativo: !b.ativo } })}
                      className="ds-focus inline-flex items-center gap-1.5 rounded-ds-sm px-2 py-2 text-label-md text-mute hover:bg-ink/[0.05] hover:text-ink">
                      {b.ativo ? <><EyeSlash size={14} /> Ocultar</> : <><Eye size={14} /> Mostrar</>}
                    </button>
                    <button type="button"
                      onClick={() => confirm("Remover este banner? A imagem sai do storage.") && remover(b)}
                      className="ds-focus ml-auto inline-flex items-center gap-1.5 rounded-ds-sm px-2 py-2 text-label-md text-mute hover:text-danger-deep">
                      <Trash size={14} /> Remover
                    </button>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
