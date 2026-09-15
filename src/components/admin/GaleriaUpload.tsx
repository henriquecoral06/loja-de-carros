import { useState } from "react";
import { ArrowLeft, ArrowRight, Star, Trash } from "@phosphor-icons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Upload múltiplo, capa e reordenação. O bucket 'veiculos' é público. */
export default function GaleriaUpload({ veiculoId }: { veiculoId: string }) {
  const qc = useQueryClient();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  const { data: fotos } = useQuery({
    queryKey: ["admin-fotos", veiculoId],
    queryFn: async () => {
      const { data } = await supabase.from("veiculo_fotos").select("*")
        .eq("veiculo_id", veiculoId).order("ordem");
      return data ?? [];
    },
  });

  const recarregar = () => {
    qc.invalidateQueries({ queryKey: ["admin-fotos", veiculoId] });
    qc.invalidateQueries({ queryKey: ["fotos", veiculoId] });
    qc.invalidateQueries({ queryKey: ["veiculos"] });
  };

  async function enviar(arquivos: FileList | null) {
    if (!arquivos?.length) return;
    setEnviando(true);
    setErro("");
    const base = fotos?.length ?? 0;

    for (let i = 0; i < arquivos.length; i++) {
      const arquivo = arquivos[i];
      if (arquivo.size > 10 * 1024 * 1024) {
        setErro(`${arquivo.name} passa de 10 MB e foi ignorado.`);
        continue;
      }
      const extensao = arquivo.name.split(".").pop();
      const caminho = `${veiculoId}/${crypto.randomUUID()}.${extensao}`;
      const { error: erroUpload } = await supabase.storage.from("veiculos").upload(caminho, arquivo);
      if (erroUpload) { setErro(erroUpload.message); continue; }

      const { data: publica } = supabase.storage.from("veiculos").getPublicUrl(caminho);
      await supabase.from("veiculo_fotos").insert({
        veiculo_id: veiculoId,
        url: publica.publicUrl,
        ordem: base + i,
        capa: base === 0 && i === 0,
      });
    }
    setEnviando(false);
    recarregar();
  }

  async function definirCapa(id: string) {
    await supabase.from("veiculo_fotos").update({ capa: false }).eq("veiculo_id", veiculoId);
    await supabase.from("veiculo_fotos").update({ capa: true }).eq("id", id);
    recarregar();
  }

  async function mover(id: string, direcao: -1 | 1) {
    const lista = [...(fotos ?? [])];
    const i = lista.findIndex((f: any) => f.id === id);
    const j = i + direcao;
    if (j < 0 || j >= lista.length) return;
    await Promise.all([
      supabase.from("veiculo_fotos").update({ ordem: j }).eq("id", lista[i].id),
      supabase.from("veiculo_fotos").update({ ordem: i }).eq("id", lista[j].id),
    ]);
    recarregar();
  }

  async function remover(foto: any) {
    const caminho = foto.url.split("/veiculos/").pop();
    if (caminho) await supabase.storage.from("veiculos").remove([caminho]);
    await supabase.from("veiculo_fotos").delete().eq("id", foto.id);
    recarregar();
  }

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="fotos" className="text-sm font-medium">Fotos</label>
        <input id="fotos" type="file" accept="image/*" multiple disabled={enviando}
          onChange={(e) => enviar(e.target.files)}
          className="mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground" />
        <p className="mt-1 text-xs text-muted-foreground">
          Até 10 MB por imagem. A primeira vira capa automaticamente.
        </p>
      </div>

      {enviando && <p className="text-sm text-muted-foreground">Enviando…</p>}
      {erro && <p className="text-sm text-destructive">{erro}</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(fotos ?? []).map((f: any, i: number) => (
          <div key={f.id} className="group relative overflow-hidden rounded-lg border">
            <img src={f.url} alt="" className="aspect-[4/3] w-full object-cover" />
            {f.capa && (
              <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                Capa
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex justify-center gap-0.5 bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button onClick={() => mover(f.id, -1)} disabled={i === 0} title="Mover para trás"
                className="rounded p-1 text-white disabled:opacity-30"><ArrowLeft className="h-3.5 w-3.5" /></button>
              <button onClick={() => definirCapa(f.id)} title="Definir como capa"
                className="rounded p-1 text-white"><Star className="h-3.5 w-3.5" /></button>
              <button onClick={() => mover(f.id, 1)} disabled={i === (fotos?.length ?? 0) - 1} title="Mover para frente"
                className="rounded p-1 text-white disabled:opacity-30"><ArrowRight className="h-3.5 w-3.5" /></button>
              <button onClick={() => confirm("Remover esta foto?") && remover(f)} title="Remover"
                className="rounded p-1 text-white"><Trash className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
