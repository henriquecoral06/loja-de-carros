import { PaginaLegal } from "~/components/PaginaLegal";
import { SITE } from "~/lib/site";

export const meta = () => [{ title: `Política de privacidade — ${SITE.nome}` }];

export default function Privacidade() {
  return (
    <PaginaLegal titulo="Política de privacidade">
      <p>Esta política explica como o {SITE.nome} trata dados pessoais, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).</p>
      <h2>Dados que coletamos</h2>
      <ul>
        <li><strong>Anunciantes:</strong> nome, e-mail, WhatsApp, cidade e estado, e os dados dos veículos anunciados;</li>
        <li><strong>Interessados:</strong> nome, e-mail, telefone e a mensagem enviada ao anunciante;</li>
        <li><strong>Técnicos:</strong> endereço IP, usado apenas para limitar tentativas abusivas.</li>
      </ul>
      <h2>Para que usamos</h2>
      <p>Para manter sua conta, publicar seus anúncios e entregar as mensagens ao anunciante. Não vendemos dados a terceiros.</p>
      <h2>O que fica público</h2>
      <p>No anúncio aparecem o primeiro nome do particular ou o nome da loja, a cidade e o estado. O telefone só é exibido quando um visitante clica para ver.</p>
      <h2>Seus direitos</h2>
      <p>Você pode acessar, corrigir ou excluir seus dados a qualquer momento pelo painel ou entrando em contato conosco.</p>
      <h2>Cookies</h2>
      <p>Usamos apenas um cookie essencial para manter você conectado. Não usamos cookies de publicidade.</p>
    </PaginaLegal>
  );
}
