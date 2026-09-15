import { useConfig } from "@/hooks/useConfig";

/**
 * Textos-base de LGPD. São um ponto de partida revisável pelo jurídico
 * da revenda, não um parecer — está dito na própria página.
 */
export function Privacidade() {
  const { data: config } = useConfig();
  const nome = config?.nome ?? "a revenda";

  return (
    <div className="container max-w-2xl py-12 prose-sm">
      <h1 className="font-display text-3xl font-bold">Política de privacidade</h1>
      <div className="mt-6 space-y-4 text-muted-foreground">
        <p>
          Esta página explica como {nome} trata os dados pessoais recebidos pelo site,
          conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).
        </p>
        <h2 className="font-display text-lg font-bold text-foreground">Quais dados coletamos</h2>
        <p>
          Nome, telefone de WhatsApp e, quando informado, e-mail — sempre fornecidos por você
          ao preencher um formulário. Registramos também a página de origem, os parâmetros de
          campanha e o endereço de IP do envio.
        </p>
        <h2 className="font-display text-lg font-bold text-foreground">Para que usamos</h2>
        <p>
          Exclusivamente para responder ao seu contato sobre um veículo e conduzir a negociação.
          Não vendemos, alugamos nem compartilhamos seus dados com terceiros para publicidade.
        </p>
        <h2 className="font-display text-lg font-bold text-foreground">Por quanto tempo guardamos</h2>
        <p>
          Enquanto durar o atendimento e por até 24 meses depois, para histórico comercial.
          Depois disso os registros são eliminados.
        </p>
        <h2 className="font-display text-lg font-bold text-foreground">Seus direitos</h2>
        <p>
          Você pode pedir a qualquer momento a confirmação, a correção ou a exclusão dos seus
          dados{config?.email ? <> pelo e-mail <b className="text-foreground">{config.email}</b></> : null}.
          Atendemos em até 15 dias.
        </p>
        <h2 className="font-display text-lg font-bold text-foreground">Cookies</h2>
        <p>
          Usamos cookies de medição de audiência apenas após o seu consentimento, solicitado na
          primeira visita. Recusar não limita o uso do site.
        </p>
        <p className="border-t pt-4 text-xs">
          Modelo de referência: recomendamos revisão pelo jurídico da revenda antes da publicação.
        </p>
      </div>
    </div>
  );
}

export function Termos() {
  const { data: config } = useConfig();
  return (
    <div className="container max-w-2xl py-12">
      <h1 className="font-display text-3xl font-bold">Termos de uso</h1>
      <div className="mt-6 space-y-4 text-muted-foreground">
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
          <p className="border-t pt-4 text-xs">
            {config.razao_social}{config.cnpj && ` · CNPJ ${config.cnpj}`}
          </p>
        )}
        <p className="text-xs">
          Modelo de referência: recomendamos revisão pelo jurídico da revenda antes da publicação.
        </p>
      </div>
    </div>
  );
}
