import { useConfig } from "@/hooks/useConfig";
import { useTituloPagina } from "@/hooks/useTituloPagina";

/**
 * Textos-base de LGPD. São um ponto de partida revisável pelo jurídico
 * da revenda, não um parecer — está dito na própria página.
 */
export function Privacidade() {
  const { data: config } = useConfig();
  useTituloPagina("Política de privacidade");
  const nome = config?.nome ?? "a revenda";

  return (
    <div className="site-container site-section max-w-[46rem]">
      <h1 className="t-display-md text-[var(--s-ink)]">Política de privacidade</h1>
      <div className="t-body-md mt-8 space-y-5 text-[var(--s-body)]">
        <p>
          Esta página explica como {nome} trata os dados pessoais recebidos pelo site,
          conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).
        </p>
        <h2 className="t-title-md pt-3 text-[var(--s-ink)]">Quais dados coletamos</h2>
        <p>
          Nome, telefone de WhatsApp e, quando informado, e-mail — sempre fornecidos por você
          ao preencher um formulário. Registramos também a página de origem, os parâmetros de
          campanha e o endereço de IP do envio.
        </p>
        <h2 className="t-title-md pt-3 text-[var(--s-ink)]">Para que usamos</h2>
        <p>
          Exclusivamente para responder ao seu contato sobre um veículo e conduzir a negociação.
          Não vendemos, alugamos nem compartilhamos seus dados com terceiros para publicidade.
        </p>
        <h2 className="t-title-md pt-3 text-[var(--s-ink)]">Por quanto tempo guardamos</h2>
        <p>
          Enquanto durar o atendimento e por até 24 meses depois, para histórico comercial.
          Depois disso os registros são eliminados.
        </p>
        <h2 className="t-title-md pt-3 text-[var(--s-ink)]">Seus direitos</h2>
        <p>
          Você pode pedir a qualquer momento a confirmação, a correção ou a exclusão dos seus
          dados{config?.email ? <> pelo e-mail <b className="font-bold text-[var(--s-ink)]">{config.email}</b></> : null}.
          Atendemos em até 15 dias.
        </p>
        <h2 className="t-title-md pt-3 text-[var(--s-ink)]">Cookies</h2>
        <p>
          Usamos cookies de medição de audiência apenas após o seu consentimento, solicitado na
          primeira visita. Recusar não limita o uso do site.
        </p>
        <p className="t-caption border-t border-[var(--s-hairline)] pt-5 text-[var(--s-muted)]">
          Modelo de referência: recomendamos revisão pelo jurídico da revenda antes da publicação.
        </p>
      </div>
    </div>
  );
}

export function Termos() {
  const { data: config } = useConfig();
  useTituloPagina("Termos de uso");
  return (
    <div className="site-container site-section max-w-[46rem]">
      <h1 className="t-display-md text-[var(--s-ink)]">Termos de uso</h1>
      <div className="t-body-md mt-8 space-y-5 text-[var(--s-body)]">
        <p>
          Os veículos anunciados neste site estão sujeitos a disponibilidade. Preços, condições e
          fotos têm caráter informativo e podem mudar sem aviso.
        </p>
        <p>
          O anúncio não constitui proposta de venda. Valores de financiamento e parcelas são
          simulações e dependem de aprovação de crédito pela instituição financeira.
        </p>
        <p>
          Recomendamos a conferência presencial do veículo e da documentação antes da compra.
        </p>
        {config?.razao_social && (
          <p className="t-caption border-t border-[var(--s-hairline)] pt-5 text-[var(--s-muted)]">
            {config.razao_social}{config.cnpj && ` · CNPJ ${config.cnpj}`}
          </p>
        )}
        <p className="t-caption text-[var(--s-muted)]">
          Modelo de referência: recomendamos revisão pelo jurídico da revenda antes da publicação.
        </p>
      </div>
    </div>
  );
}
