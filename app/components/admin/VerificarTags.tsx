import { AlertTriangle, CheckCircle2, ExternalLink, LoaderCircle, SearchCheck, XCircle } from "lucide-react";
import { useState } from "react";
import { Secao } from "~/components/admin/ui";
import { cn } from "~/lib/ui";

type Ids = { metaPixelId: string; googleAdsId: string; ga4Id: string; gtmId: string };
type Linha = { tipo: "ok" | "aviso" | "erro"; texto: string };

/** O que procurar no HTML de cada página para cada tag salva. */
function marcas(ids: Ids) {
  return [
    ids.googleAdsId && { nome: `Google Ads ${ids.googleAdsId}`, achou: (h: string) => h.includes(`'config',"${ids.googleAdsId}"`) && h.includes("googletagmanager.com/gtag/js") },
    ids.ga4Id && { nome: `Google Analytics ${ids.ga4Id}`, achou: (h: string) => h.includes(`'config',"${ids.ga4Id}"`) },
    ids.gtmId && { nome: `Tag Manager ${ids.gtmId}`, achou: (h: string) => h.includes("googletagmanager.com/gtm.js") && h.includes(`"${ids.gtmId}"`) },
    ids.metaPixelId && { nome: `Meta Pixel ${ids.metaPixelId}`, achou: (h: string) => h.includes(`fbq('init',"${ids.metaPixelId}")`) },
  ].filter((m): m is { nome: string; achou: (h: string) => boolean } => Boolean(m));
}

/**
 * Abre as páginas públicas como um visitante e confere se cada tag salva
 * está no <head>. Complementa o Tag Assistant e o Pixel Helper, que
 * mostram os disparos ao vivo.
 */
export function VerificarTags({ ids, exigirConsentimento, paginas }: { ids: Ids; exigirConsentimento: boolean; paginas: string[] }) {
  const [estado, setEstado] = useState<"parado" | "verificando" | "pronto">("parado");
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const lista = marcas(ids);

  async function verificar() {
    setEstado("verificando");
    const saida: Linha[] = [];
    if (!ids.metaPixelId) saida.push({ tipo: "aviso", texto: "Meta Pixel não está salvo: preencha o ID do Pixel e clique em Salvar integrações." });
    if (!ids.googleAdsId && !ids.ga4Id && !ids.gtmId) saida.push({ tipo: "aviso", texto: "Nenhuma tag do Google salva." });
    try {
      const htmls = await Promise.all(paginas.map(async (p) => [p, await (await fetch(p, { cache: "no-store", credentials: "omit" })).text()] as const));
      for (const m of lista) {
        const faltam = htmls.filter(([, h]) => !m.achou(h)).map(([p]) => p);
        saida.push(faltam.length
          ? { tipo: "erro", texto: `${m.nome}: não encontrada em ${faltam.join(", ")}` }
          : { tipo: "ok", texto: `${m.nome}: instalada no <head> de ${htmls.map(([p]) => p).join(", ")}` });
      }
      if (lista.length && exigirConsentimento) {
        const consent = htmls.every(([, h]) => h.includes("gtag('consent','default'"));
        saida.push(consent
          ? { tipo: "ok", texto: "Modo de Consentimento ativo: antes do “Aceitar” o Google recebe só sinais sem cookies e o Pixel fica em espera." }
          : { tipo: "erro", texto: "Modo de Consentimento não encontrado no HTML." });
      }
    } catch (e) {
      saida.push({ tipo: "erro", texto: `Não consegui abrir as páginas: ${e instanceof Error ? e.message : String(e)}` });
    }
    setLinhas(saida);
    setEstado("pronto");
  }

  const Icone = { ok: CheckCircle2, aviso: AlertTriangle, erro: XCircle };
  const cor = { ok: "text-sucesso", aviso: "text-alerta", erro: "text-erro" };

  return (
    <Secao titulo="Verificar instalação das tags" descricao="Abre as páginas do site e das landing pages como um visitante e confere se as tags salvas estão no código."
      acao={
        <button type="button" onClick={verificar} disabled={estado === "verificando"} className="botao-primario h-9 px-3 text-sm">
          {estado === "verificando" ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <SearchCheck className="size-4" aria-hidden="true" />}
          {estado === "verificando" ? "Verificando…" : "Verificar instalação"}
        </button>
      }>
      {estado === "pronto" && (
        <ul role="status" className="mb-4 grid gap-1.5 text-sm">
          {linhas.map((l, i) => {
            const I = Icone[l.tipo];
            return <li key={i} className="flex items-start gap-2"><I className={cn("mt-0.5 size-4 shrink-0", cor[l.tipo])} aria-hidden="true" /> <span className="text-texto">{l.texto}</span></li>;
          })}
        </ul>
      )}
      <div className="grid gap-2 text-sm text-suave">
        <p><strong className="text-tinta">Ver disparando ao vivo:</strong> no Google, abra o{" "}
          <a href="https://tagassistant.google.com/" target="_blank" rel="noopener" className="inline-flex items-center gap-1 font-semibold text-marca-700 underline">Tag Assistant <ExternalLink className="size-3.5" aria-hidden="true" /></a>{" "}
          e informe o endereço do site; no Meta, use a extensão{" "}
          <a href="https://chromewebstore.google.com/detail/meta-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc" target="_blank" rel="noopener" className="inline-flex items-center gap-1 font-semibold text-marca-700 underline">Meta Pixel Helper <ExternalLink className="size-3.5" aria-hidden="true" /></a>{" "}
          ou Gerenciador de Eventos → Testar eventos.
        </p>
        {exigirConsentimento && <p>Com o aviso de cookies ligado, clique em <strong className="text-tinta">Aceitar</strong> no site antes de testar: só então o Pixel envia eventos e o Google grava cookies.</p>}
        <p><strong className="text-tinta">Por que o depurador mostra só o Google Analytics:</strong> a tag do Google Ads envia dados quando acontece uma <strong className="text-tinta">conversão</strong> (formulário enviado ou clique no WhatsApp), não a cada visita. A cada página, quem envia é o Analytics ligado à mesma tag. Para ver o Google Ads no depurador, envie o formulário do site uma vez e depois exclua o lead em Leads. No Google Ads, a conversão fica “Inativa” até a primeira acontecer.</p>
      </div>
    </Secao>
  );
}
