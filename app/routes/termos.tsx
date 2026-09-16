import { PaginaLegal } from "~/components/PaginaLegal";
import { SITE } from "~/lib/site";

export const meta = () => [{ title: `Termos de uso — ${SITE.nome}` }];

export default function Termos() {
  return (
    <PaginaLegal titulo="Termos de uso">
      <p>O {SITE.nome} é uma plataforma que aproxima quem quer vender e quem quer comprar veículos. Não somos parte da negociação.</p>
      <h2>Responsabilidade pelos anúncios</h2>
      <p>Cada anunciante responde pela veracidade das informações, fotos e preço do que anuncia, e deve ser o proprietário do veículo ou ter autorização para vendê-lo.</p>
      <h2>Condutas proibidas</h2>
      <ul>
        <li>Anunciar veículo que não existe, que não está à venda ou com dados falsos;</li>
        <li>Usar fotos de terceiros sem autorização;</li>
        <li>Coletar contatos de outros usuários para envio de mensagens não solicitadas.</li>
      </ul>
      <h2>Negociação</h2>
      <p>Recomendamos ver o carro pessoalmente, conferir a documentação e nunca fazer pagamento antecipado antes disso.</p>
      <h2>Remoção de conteúdo</h2>
      <p>Anúncios que descumpram estes termos podem ser removidos sem aviso prévio.</p>
    </PaginaLegal>
  );
}
