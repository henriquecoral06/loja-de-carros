import { useRef, useState } from "react";
import { Trash, UploadSimple } from "@phosphor-icons/react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui";

const LIMITE_MB = 5;
const TIPOS = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

interface Props {
  valor?: string | null;
  onChange: (url: string | null) => void;
  pasta: string;
  label: string;
  hint?: string;
  /** Fundo xadrez para logo com transparência; capa larga para banner. */
  formato?: "logo" | "largo";
}

/**
 * Upload direto para o bucket 'marca'. O lojista escolhe o arquivo e a
 * URL pública volta pronta — sem hospedar imagem em outro lugar e sem
 * colar link, que era o que o cadastro exigia antes.
 */
export default function UploadImagem({ valor, onChange, pasta, label, hint, formato = "logo" }: Props) {
  const entrada = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  async function enviar(arquivo?: File) {
    if (!arquivo) return;
    setErro("");

    if (!TIPOS.includes(arquivo.type)) {
      setErro("Use PNG, JPG, WEBP ou SVG.");
      return;
    }
    if (arquivo.size > LIMITE_MB * 1024 * 1024) {
      setErro(`O arquivo tem ${(arquivo.size / 1048576).toFixed(1)} MB. O limite é ${LIMITE_MB} MB.`);
      return;
    }

    setEnviando(true);
    const extensao = arquivo.name.split(".").pop()?.toLowerCase() ?? "png";
    const caminho = `${pasta}/${crypto.randomUUID()}.${extensao}`;

    const { error } = await supabase.storage.from("marca").upload(caminho, arquivo, {
      cacheControl: "31536000",
      upsert: false,
    });
    setEnviando(false);

    if (error) { setErro(error.message); return; }

    const { data } = supabase.storage.from("marca").getPublicUrl(caminho);
    onChange(data.publicUrl);
    if (entrada.current) entrada.current.value = "";
  }

  async function remover() {
    // O arquivo antigo sai do storage junto: sem isso o bucket acumula
    // todo logo que o lojista já testou.
    const caminho = valor?.split("/marca/").pop();
    if (caminho) await supabase.storage.from("marca").remove([caminho]);
    onChange(null);
  }

  return (
    <div>
      <p className="mb-1.5 text-label-md tracking-label text-body">{label}</p>

      {valor ? (
        <div className="flex items-center gap-3">
          <div className={`grid shrink-0 place-items-center overflow-hidden rounded-ds-sm border border-hairline bg-[repeating-conic-gradient(#e9e9e9_0_25%,transparent_0_50%)] bg-[length:14px_14px] ${
            formato === "largo" ? "h-16 w-32" : "h-16 w-16"}`}>
            <img src={valor} alt="" className="max-h-full max-w-full object-contain" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Button type="button" variant="secondary" size="sm" onClick={() => entrada.current?.click()}>
              Trocar
            </Button>
            <button type="button" onClick={remover}
              className="ds-focus inline-flex items-center gap-1.5 rounded-ds-sm text-label-md text-mute hover:text-danger-deep">
              <Trash size={13} /> Remover
            </button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="secondary" disabled={enviando}
          onClick={() => entrada.current?.click()}
          icon={<UploadSimple size={14} />}>
          {enviando ? "Enviando…" : "Escolher arquivo"}
        </Button>
      )}

      <input ref={entrada} type="file" accept={TIPOS.join(",")} className="hidden"
        onChange={(e) => enviar(e.target.files?.[0])} />

      {erro && <p className="mt-1.5 text-caption text-danger-deep">{erro}</p>}
      {hint && !erro && <p className="mt-1.5 text-caption text-faint">{hint}</p>}
    </div>
  );
}
