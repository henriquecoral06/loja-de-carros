import { Cookie } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { concederConsentimento, gravarConsentimento, iniciarTags, lerConsentimento, rastrear, registrarOrigem } from "~/lib/rastreamento";
import { temTags } from "~/lib/tags";
import { useRastreamento } from "~/lib/useLoja";

/**
 * Rastreamento das páginas públicas e aviso de cookies (LGPD). As tags já
 * vêm no <head> em Modo de Consentimento; o "Aceitar" libera os cookies.
 * Sem tag configurada, não aparece nada.
 */
export function Rastreamento() {
  const config = useRastreamento();
  const location = useLocation();
  const [aviso, setAviso] = useState(false);
  const temTag = temTags(config);

  useEffect(() => registrarOrigem(), []);

  useEffect(() => {
    if (!config || !temTag) return;
    // O page_view da primeira página vem das próprias tags (código oficial).
    iniciarTags(config);
    if (config.exigirConsentimento && lerConsentimento() === null) setAviso(true);
    // Só na montagem: as navegações seguintes são tratadas abaixo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [temTag]);

  // PageView a cada troca de página (o site não recarrega ao navegar).
  const primeira = useRef(true);
  useEffect(() => {
    if (primeira.current) { primeira.current = false; return; }
    rastrear("pagina");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);

  if (!aviso || !config) return null;

  const decidir = (valor: "aceito" | "recusado") => {
    gravarConsentimento(valor);
    setAviso(false);
    if (valor === "aceito") concederConsentimento();
  };

  return (
    <div role="region" aria-label="Aviso de cookies" className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-xl border border-linha bg-white p-4 shadow-flutuante sm:flex-row sm:items-center sm:gap-5">
        <Cookie className="hidden size-6 shrink-0 text-marca-700 sm:block" aria-hidden="true" />
        <p className="text-sm leading-relaxed text-texto">
          Usamos cookies de parceiros (Meta e Google) para medir nossos anúncios.{" "}
          <Link to="/privacidade" className="font-semibold text-marca-700 underline">Saiba mais</Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={() => decidir("recusado")} className="botao-secundario h-10 flex-1 px-4 text-sm">Recusar</button>
          <button type="button" onClick={() => decidir("aceito")} className="botao-primario h-10 flex-1 px-4 text-sm">Aceitar</button>
        </div>
      </div>
    </div>
  );
}
