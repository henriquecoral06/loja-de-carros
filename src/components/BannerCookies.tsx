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
    <div className="fixed inset-x-0 bottom-0 z-[60] border-t bg-card p-4 shadow-lg">
      <div className="container flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <p className="flex-1 text-sm text-muted-foreground">
          Usamos cookies para medir a audiência do site. Você escolhe.{" "}
          <Link to="/privacidade" className="underline">Política de privacidade</Link>.
        </p>
        <div className="flex gap-2">
          <button onClick={() => decidir("recusado")} className="rounded-md border px-4 py-2 text-sm font-medium">
            Recusar
          </button>
          <button onClick={() => decidir("aceito")}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            Aceitar
          </button>
        </div>
      </div>
    </div>
  );
}
