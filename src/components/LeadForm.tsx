import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { VeiculoPublico } from "@/integrations/supabase/types";

/**
 * Passa pela edge function registrar-lead, não pela tabela: é lá que
 * ficam a validação, o anti-spam, a deduplicação e o disparo da
 * notificação. Não existe policy de insert para anon em leads.
 */
export default function LeadForm({ veiculo }: { veiculo?: VeiculoPublico }) {
  const [estado, setEstado] = useState<"parado" | "enviando" | "ok" | "erro">("parado");
  const [mensagemErro, setMensagemErro] = useState("");

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const form = new FormData(evento.currentTarget);
    setEstado("enviando");
    setMensagemErro("");

    const params = new URLSearchParams(window.location.search);
    const { data, error } = await supabase.functions.invoke("registrar-lead", {
      body: {
        nome: form.get("nome"),
        whatsapp: form.get("whatsapp"),
        email: form.get("email"),
        mensagem: form.get("mensagem"),
        sobrenome: form.get("sobrenome"), // honeypot
        consentimento: form.get("consentimento") === "on",
        veiculo_id: veiculo?.id ?? null,
        tipo: veiculo ? "formulario" : "contato",
        utm_source: params.get("utm_source"),
        utm_medium: params.get("utm_medium"),
        utm_campaign: params.get("utm_campaign"),
        pagina_origem: window.location.pathname,
      },
    });

    if (error || (data as any)?.erro) {
      setEstado("erro");
      setMensagemErro(
        (data as any)?.erro === "muitas_tentativas"
          ? "Você já enviou algumas mensagens. Aguarde alguns minutos ou chame no WhatsApp."
          : "Não conseguimos enviar agora. Tente pelo WhatsApp que a gente responde na hora.",
      );
      return;
    }
    setEstado("ok");
  }

  if (estado === "ok") {
    return (
      <div className="rounded-lg border bg-card p-6">
        <p className="font-display font-semibold">Recebemos seu contato.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Um consultor responde em poucos minutos no horário comercial.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="rounded-lg border bg-card p-6 space-y-4">
      <div>
        <h3 className="font-display font-semibold">Tenho interesse</h3>
        <p className="text-sm text-muted-foreground">Deixe seu contato que a gente chama você.</p>
      </div>

      <div className="grid gap-3">
        <div>
          <label htmlFor="lead-nome" className="text-sm font-medium">Nome</label>
          <input id="lead-nome" name="nome" required minLength={2}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label htmlFor="lead-whatsapp" className="text-sm font-medium">WhatsApp</label>
          <input id="lead-whatsapp" name="whatsapp" required inputMode="tel" placeholder="(11) 99999-9999"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label htmlFor="lead-email" className="text-sm font-medium">E-mail <span className="text-muted-foreground font-normal">(opcional)</span></label>
          <input id="lead-email" name="email" type="email"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label htmlFor="lead-mensagem" className="text-sm font-medium">Mensagem</label>
          <textarea id="lead-mensagem" name="mensagem" rows={3}
            defaultValue={veiculo ? `Tenho interesse no ${veiculo.marca} ${veiculo.modelo} ${veiculo.ano_modelo}.` : ""}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
        </div>
      </div>

      {/* Honeypot: invisível para gente, irresistível para robô. */}
      <div aria-hidden="true" className="absolute left-[-9999px]">
        <label htmlFor="lead-sobrenome">Sobrenome</label>
        <input id="lead-sobrenome" name="sobrenome" tabIndex={-1} autoComplete="off" />
      </div>

      <label htmlFor="lead-consentimento" className="flex items-start gap-2 text-xs text-muted-foreground">
        <input id="lead-consentimento" name="consentimento" type="checkbox" required className="mt-0.5" />
        <span>Autorizo o contato e o tratamento dos meus dados conforme a política de privacidade.</span>
      </label>

      {estado === "erro" && <p className="text-sm text-destructive">{mensagemErro}</p>}

      <button type="submit" disabled={estado === "enviando"}
        className="w-full rounded-md bg-primary px-4 py-2.5 font-semibold text-primary-foreground disabled:opacity-60">
        {estado === "enviando" ? "Enviando..." : "Quero falar com um consultor"}
      </button>
    </form>
  );
}
