import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useConfig } from "@/hooks/useConfig";

const CHAVE = "consentimento-cookies";

/**
 * Analytics e Pixel só sobem depois do "aceitar". Sem isso, o disparo é
 * irregular sob a LGPD — e é o erro mais comum em site de revenda.
 */
export default function BannerCookies() {
  const { data: config } = useConfig();
  // Três estados, não dois: "lendo" enquanto o localStorage não foi
  // consultado, null quando não há decisão (é aí que o banner aparece),
  // e o valor escolhido depois.
  const [decisao, setDecisao] = useState<string | null | "lendo">("lendo");

  useEffect(() => {
    try { setDecisao(localStorage.getItem(CHAVE)); } catch { setDecisao(null); }
  }, []);

  useEffect(() => {
    if (decisao !== "aceito" || !config) return;

    if (config.ga_measurement_id) {
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${config.ga_measurement_id}`;
      document.head.appendChild(script);
      (window as any).dataLayer = (window as any).dataLayer || [];
      function gtag(...args: any[]) { (window as any).dataLayer.push(args); }
      gtag("js", new Date());
      gtag("config", config.ga_measurement_id);
    }
  }, [decisao, config]);

  const decidir = (valor: "aceito" | "recusado") => {
    try { localStorage.setItem(CHAVE, valor); } catch { /* modo privado */ }
    setDecisao(valor);
  };

  if (decisao !== null) return null;

  return (
    <div role="region" aria-label="Aviso de cookies"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-[var(--s-hairline-strong)] bg-[var(--s-canvas)]">
      <div className="site-container flex flex-col items-start gap-4 py-6 sm:flex-row sm:items-center">
        <p className="t-body-sm flex-1 text-[var(--s-body)]">
          Usamos cookies para medir a audiência do site. Você escolhe.{" "}
          <Link to="/privacidade" className="underline">Política de privacidade</Link>.
        </p>
        <div className="flex w-full gap-2 sm:w-auto">
          <button onClick={() => decidir("recusado")} className="s-btn s-btn-secondary flex-1 sm:flex-none">Recusar</button>
          <button onClick={() => decidir("aceito")} className="s-btn s-btn-primary flex-1 sm:flex-none">Aceitar</button>
        </div>
      </div>
    </div>
  );
}
