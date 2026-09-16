import { PaginaLegal } from "~/components/PaginaLegal";
import { lojaDasRotas } from "~/lib/site";
import { useLoja } from "~/lib/useLoja";
import type { Route } from "./+types/termos";

export function meta({ matches }: Route.MetaArgs) {
  return [{ title: `Termos de uso — ${lojaDasRotas(matches).nome}` }];
}

export default function Termos() {
  const loja = useLoja();
  return (
    <PaginaLegal titulo="Termos de uso">
      <p>Este site pertence a {loja.nome}{loja.cnpj && ` (CNPJ ${loja.cnpj})`} e apresenta os veículos disponíveis no estoque da loja.</p>
      <h2>Informações dos veículos</h2>
      <p>Fotos, preços, quilometragem e itens são conferidos pela equipe, mas podem conter erros de digitação e mudar sem aviso. As condições valem no momento da negociação, confirmadas pela loja.</p>
      <h2>Disponibilidade</h2>
      <p>O estoque muda todos os dias. Um veículo pode ser vendido antes de a página ser atualizada; confirme a disponibilidade antes de ir até a loja.</p>
      <h2>Preços e pagamento</h2>
      <p>O preço anunciado é para pagamento à vista, salvo indicação em contrário. Financiamento está sujeito à aprovação de crédito. Nunca fazemos cobrança antecipada por mensagem.</p>
      <h2>Uso do conteúdo</h2>
      <p>Fotos e textos deste site não podem ser reproduzidos sem autorização.</p>
    </PaginaLegal>
  );
}
