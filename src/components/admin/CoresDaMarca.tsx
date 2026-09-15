import { useEffect, useState } from "react";
import { ArrowsClockwise, Check, Warning } from "@phosphor-icons/react";
import {
  contraste, escreverHsl, extrairPaleta, faixaEscura, hexParaHsl, hslParaHex, lerHsl,
  type Amostra, type Hsl,
} from "@/lib/cores";
import { Badge, SegmentedControl } from "@/components/ui";

type Modo = "logo" | "manual";

const BRANCO: Hsl = { h: 0, s: 0, l: 100 };
const TINTA: Hsl = { h: 0, s: 0, l: 12 };

const CAMPOS = [
  { chave: "cor_primaria", rotulo: "Cor principal", apoio: "Botões, links e a faixa escura da home." },
  { chave: "cor_destaque", rotulo: "Cor de destaque", apoio: "Usada com parcimônia, em detalhes." },
] as const;

interface Props {
  form: Record<string, any>;
  campo: (chave: string, valor: any) => void;
}

/** O texto sobre a cor é decidido por contraste, não escolhido no olho. */
const frenteIdeal = (c: Hsl) =>
  contraste(c, BRANCO) >= contraste(c, TINTA) ? BRANCO : TINTA;

export default function CoresDaMarca({ form, campo }: Props) {
  const [modo, setModo] = useState<Modo>("manual");
  const [paleta, setPaleta] = useState<Amostra[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [alvo, setAlvo] = useState<string>("cor_primaria");

  const logo = form.logo_url as string | undefined;

  async function extrair() {
    if (!logo) return;
    setCarregando(true);
    setErro("");
    try {
      setPaleta(await extrairPaleta(logo));
    } catch (e: any) {
      setErro(
        e.message === "sem_permissao"
          ? "O navegador não deixou ler os pixels desta imagem. Envie o logo de novo pelo painel."
          : e.message === "imagem_vazia"
          ? "A imagem está totalmente transparente."
          : "Não foi possível abrir o logo. Tente enviar em PNG ou JPG.",
      );
      setPaleta([]);
    }
    setCarregando(false);
  }

  // Ao entrar no modo logo, extrai sozinho: pedir um clique a mais para
  // ver o que o sistema já consegue mostrar é atrito à toa.
  useEffect(() => {
    if (modo === "logo" && logo && !paleta.length && !erro) extrair();
  }, [modo, logo]);

  function aplicar(amostra: Amostra) {
    campo(alvo, `${amostra.hsl.h} ${amostra.hsl.s}% ${amostra.hsl.l}%`);
    if (alvo === "cor_primaria") {
      const f = frenteIdeal(amostra.hsl);
      campo("cor_primaria_fg", `${f.h} ${f.s}% ${f.l}%`);
    }
  }

  const atualHsl = lerHsl(form.cor_primaria);
  const frenteHsl = lerHsl(form.cor_primaria_fg);
  const contrasteAtual = atualHsl && frenteHsl ? contraste(atualHsl, frenteHsl) : null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-label-md tracking-label text-body">Como definir as cores</p>
        <SegmentedControl
          value={modo}
          onChange={(v) => setModo(v as Modo)}
          options={[
            { value: "logo", label: "Puxar do logotipo" },
            { value: "manual", label: "Escolher manualmente" },
          ]}
        />
      </div>

      {modo === "logo" && (
        <div className="mt-4">
          {!logo ? (
            <p className="rounded-ds-md border border-dashed border-hairline-strong p-4 text-body-sm text-mute">
              Envie o logotipo acima para liberar esta opção.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-body-sm text-mute">Aplicar a cor escolhida em:</p>
                <SegmentedControl
                  value={alvo}
                  onChange={(v) => setAlvo(String(v))}
                  options={CAMPOS.map((c) => ({ value: c.chave, label: c.rotulo }))}
                />
                <button type="button" onClick={extrair} disabled={carregando}
                  className="ds-focus inline-flex items-center gap-1.5 rounded-ds-sm text-label-md text-mute hover:text-ink">
                  <ArrowsClockwise size={13} /> {carregando ? "Lendo…" : "Ler de novo"}
                </button>
              </div>

              {erro && <p className="mt-3 text-body-sm text-danger-deep">{erro}</p>}

              {!erro && (
                <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {carregando && !paleta.length && (
                    <li className="text-body-sm text-mute">Lendo as cores do logotipo…</li>
                  )}
                  {paleta.map((a) => {
                    const selecionada = form[alvo] === `${a.hsl.h} ${a.hsl.s}% ${a.hsl.l}%`;
                    return (
                      <li key={a.hex}>
                        <button type="button" onClick={() => aplicar(a)}
                          className={`ds-focus flex w-full items-center gap-3 rounded-ds-md border p-2.5 text-left transition-colors ${
                            selecionada ? "border-ink bg-ink/[0.04]" : "border-hairline hover:border-hairline-strong"}`}>
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-ds-sm border border-hairline"
                            style={{ background: a.hex }}>
                            {selecionada && (
                              <Check size={15} weight="bold"
                                color={hslParaHex(frenteIdeal(a.hsl))} />
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="block font-mono text-label-md text-ink">{a.hex}</span>
                            <span className="block text-caption text-faint">
                              {a.peso < 0.005 ? "menos de 1%" : `${Math.round(a.peso * 100)}%`} do logo
                            </span>
                          </span>
                          {alvo === "cor_primaria" && !a.serveComoPrimaria && (
                            <span className="ml-auto shrink-0"><Badge tone="warning">baixo contraste</Badge></span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              <p className="mt-3 max-w-[60ch] text-caption text-mute">
                A porcentagem é quanto da imagem aquela cor ocupa. Pixels transparentes
                e tons de cinza ficam de fora — quase sempre são fundo ou contorno, não
                a cor da marca.
              </p>
            </>
          )}
        </div>
      )}

      {modo === "manual" && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {CAMPOS.map(({ chave, rotulo, apoio }) => {
            const hsl = lerHsl(form[chave]);
            return (
              <div key={chave}>
                <label htmlFor={chave} className="mb-1.5 block text-label-md tracking-label text-body">{rotulo}</label>
                <div className="flex items-center gap-2">
                  {/* Seletor nativo: abre a roda de cores do sistema e já
                      vem com conta-gotas no desktop. */}
                  <input
                    type="color"
                    aria-label={`${rotulo} — seletor`}
                    value={hsl ? hslParaHex(hsl) : "#000000"}
                    onChange={(e) => {
                      const novo = hexParaHsl(e.target.value);
                      if (!novo) return;
                      campo(chave, `${novo.h} ${novo.s}% ${novo.l}%`);
                      if (chave === "cor_primaria") {
                        const f = frenteIdeal(novo);
                        campo("cor_primaria_fg", `${f.h} ${f.s}% ${f.l}%`);
                      }
                    }}
                    className="h-10 w-12 shrink-0 cursor-pointer rounded-ds-sm border border-hairline-strong bg-surface p-1"
                  />
                  <input
                    id={chave}
                    className="ds-field font-mono"
                    value={hsl ? hslParaHex(hsl) : (form[chave] ?? "")}
                    onChange={(e) => {
                      const novo = hexParaHsl(e.target.value);
                      if (novo) {
                        campo(chave, `${novo.h} ${novo.s}% ${novo.l}%`);
                        if (chave === "cor_primaria") {
                          const f = frenteIdeal(novo);
                          campo("cor_primaria_fg", `${f.h} ${f.s}% ${f.l}%`);
                        }
                      }
                    }}
                  />
                </div>
                <p className="mt-1.5 text-caption text-faint">{apoio}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Prévia: o que a escolha produz no site, incluindo a faixa escura
          derivada da cor principal. */}
      {atualHsl && (
        <div className="mt-6 overflow-hidden rounded-ds-md border border-hairline">
          <div className="flex items-center justify-between gap-3 px-4 py-3"
            style={{ background: escreverHsl(faixaEscura(atualHsl)) }}>
            <span className="text-label-md" style={{ color: "#fff" }}>Faixa escura da home</span>
            <span className="rounded-full px-4 py-2 text-label-md"
              style={{ background: escreverHsl(atualHsl), color: form.cor_primaria_fg ? `hsl(${form.cor_primaria_fg})` : "#fff" }}>
              Botão principal
            </span>
          </div>

          {contrasteAtual !== null && (
            <p className={`flex items-center gap-1.5 px-4 py-2.5 text-caption ${
              contrasteAtual >= 4.5 ? "text-mute" : "text-warning-deep"}`}>
              {contrasteAtual < 4.5 && <Warning size={13} />}
              Texto do botão em {contrasteAtual.toFixed(1)}:1
              {contrasteAtual >= 4.5
                ? " — legível."
                : " — abaixo do mínimo de 4,5:1. Escolha um tom mais escuro para a cor principal."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
