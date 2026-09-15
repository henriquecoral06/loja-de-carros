import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { VeiculoPublico } from "@/integrations/supabase/types";

/**
 * Passa pela edge function registrar-lead, não pela tabela: é lá que
 * ficam a validação, o anti-spam, a deduplicação e a notificação. Não
 * existe policy de insert para anon em leads.
 */
export default function LeadForm({ veiculo }: { veiculo?: VeiculoPublico }) {
  const [estado, setEstado] = useState<"parado" | "enviando" | "ok" | "erro">("parado");
  const [mensagemErro, setMensagemErro] = useState("");
  const [erroCampo, setErroCampo] = useState<Record<string, string>>({});
  const refNome = useRef<HTMLInputElement>(null);

  function validar(form: FormData) {
    const erros: Record<string, string> = {};
    const nome = String(form.get("nome") ?? "").trim();
    const telefone = String(form.get("whatsapp") ?? "").replace(/\D/g, "");

    if (nome.length < 2) erros.nome = "Escreva seu nome completo.";
    if (telefone.length < 10 || telefone.length > 13) erros.whatsapp = "Informe o WhatsApp com DDD.";
    if (!form.get("consentimento")) erros.consentimento = "Precisamos da sua autorização para entrar em contato.";
    return erros;
  }

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const form = new FormData(evento.currentTarget);

    const erros = validar(form);
    setErroCampo(erros);
    if (Object.keys(erros).length) {
      // Devolve o foco ao primeiro campo com problema, senão quem usa
      // teclado ou leitor de tela não descobre onde está o erro.
      const primeiro = document.getElementById(`lead-${Object.keys(erros)[0]}`);
      primeiro?.focus();
      return;
    }

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
      <div role="status" className="border border-[var(--s-hairline-strong)] p-7">
        <p className="t-title-md text-[var(--s-ink)]">Recebemos seu contato.</p>
        <p className="t-body-md mt-2 text-[var(--s-body)]">
          Um consultor responde em poucos minutos no horário comercial.
        </p>
      </div>
    );
  }

  const erroDe = (campo: string) => erroCampo[campo];

  return (
    <form onSubmit={enviar} noValidate className="border border-[var(--s-hairline-strong)] p-7">
      <h2 className="t-title-md text-[var(--s-ink)]">Tenho interesse</h2>
      <p className="t-body-sm mt-1.5 text-[var(--s-muted)]">Deixe seu contato que a gente chama você.</p>

      <div className="mt-7 flex flex-col gap-5">
        {[
          { id: "nome", rotulo: "Nome", tipo: "text", ref: refNome, autoComplete: "name" },
          { id: "whatsapp", rotulo: "WhatsApp", tipo: "tel", placeholder: "(11) 99999-9999", autoComplete: "tel" },
          { id: "email", rotulo: "E-mail (opcional)", tipo: "email", autoComplete: "email" },
        ].map((c) => (
          <div key={c.id}>
            <label htmlFor={`lead-${c.id}`} className="t-label mb-2.5 block text-[var(--s-muted)]">{c.rotulo}</label>
            <input id={`lead-${c.id}`} name={c.id} type={c.tipo} className="s-field"
              placeholder={c.placeholder} autoComplete={c.autoComplete}
              aria-invalid={erroDe(c.id) ? true : undefined}
              aria-describedby={erroDe(c.id) ? `erro-${c.id}` : undefined}
              style={erroDe(c.id) ? { borderColor: "var(--s-error)" } : undefined} />
            {erroDe(c.id) && (
              <p id={`erro-${c.id}`} className="t-caption mt-1.5 text-[var(--s-error)]">{erroDe(c.id)}</p>
            )}
          </div>
        ))}

        <div>
          <label htmlFor="lead-mensagem" className="t-label mb-2.5 block text-[var(--s-muted)]">Mensagem</label>
          <textarea id="lead-mensagem" name="mensagem" rows={3} className="s-field"
            defaultValue={veiculo ? `Tenho interesse no ${veiculo.marca} ${veiculo.modelo} ${veiculo.ano_modelo}.` : ""} />
        </div>
      </div>

      {/* Honeypot: invisível para gente, irresistível para robô. */}
      <div aria-hidden="true" className="absolute left-[-9999px]">
        <label htmlFor="lead-sobrenome">Sobrenome</label>
        <input id="lead-sobrenome" name="sobrenome" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="mt-6">
        <label htmlFor="lead-consentimento" className="flex items-start gap-2.5">
          <input id="lead-consentimento" name="consentimento" type="checkbox"
            className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-[var(--s-primary)]"
            aria-invalid={erroDe("consentimento") ? true : undefined}
            aria-describedby={erroDe("consentimento") ? "erro-consentimento" : undefined} />
          <span className="t-caption text-[var(--s-muted)]">
            Autorizo o contato e o tratamento dos meus dados conforme a política de privacidade.
          </span>
        </label>
        {erroDe("consentimento") && (
          <p id="erro-consentimento" className="t-caption mt-1.5 text-[var(--s-error)]">{erroDe("consentimento")}</p>
        )}
      </div>

      {estado === "erro" && (
        <p role="alert" className="t-body-sm mt-5 text-[var(--s-error)]">{mensagemErro}</p>
      )}

      <button type="submit" disabled={estado === "enviando"} className="s-btn s-btn-primary mt-7 w-full">
        {estado === "enviando" ? "Enviando…" : "Quero falar com um consultor"}
      </button>
    </form>
  );
}
