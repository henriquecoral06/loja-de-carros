import { PaginaLegal } from "~/components/PaginaLegal";
import { lojaDasRotas } from "~/lib/site";
import { useLoja, useRastreamento } from "~/lib/useLoja";
import type { Route } from "./+types/privacidade";

export function meta({ matches }: Route.MetaArgs) {
  return [{ title: `Política de privacidade — ${lojaDasRotas(matches).nome}` }];
}

export default function Privacidade() {
  const loja = useLoja();
  const tags = useRastreamento();
  const anuncios = Boolean(tags && (tags.metaPixelId || tags.googleAdsId || tags.ga4Id || tags.gtmId));
  return (
    <PaginaLegal titulo="Política de privacidade">
      <p>Esta política explica como {loja.nome} trata os dados pessoais recebidos por este site, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).</p>
      <h2>Dados que coletamos</h2>
      <ul>
        <li><strong>Mensagens:</strong> nome, e-mail, telefone e o texto que você envia pelos formulários;</li>
        <li><strong>Técnicos:</strong> endereço IP, usado apenas para limitar envios abusivos.</li>
      </ul>
      <h2>Para que usamos</h2>
      <p>Somente para responder ao seu contato sobre veículos e serviços da loja. Não vendemos nem compartilhamos seus dados com terceiros.</p>
      <h2>WhatsApp e telefone</h2>
      <p>Ao clicar em um botão de WhatsApp, a conversa acontece no aplicativo, sob a política de privacidade dele.</p>
      <h2>Seus direitos</h2>
      <p>Você pode pedir acesso, correção ou exclusão dos seus dados{loja.email ? <> pelo e-mail <a href={`mailto:${loja.email}`} className="underline">{loja.email}</a></> : " falando com a loja"}.</p>
      <h2>Cookies</h2>
      {anuncios ? (
        <>
          <p>Com a sua autorização no aviso de cookies, usamos ferramentas da Meta (Facebook e Instagram) e do Google para medir o resultado dos nossos anúncios: páginas visitadas, carros vistos e contatos feitos pelo site. Essas empresas tratam os dados conforme as próprias políticas de privacidade.</p>
          <p>Se recusar, nenhuma dessas ferramentas é carregada. Para mudar a escolha, limpe os dados do site no seu navegador.</p>
        </>
      ) : (
        <p>Visitantes não recebem cookies de publicidade. Só a equipe da loja usa um cookie essencial para entrar na área administrativa.</p>
      )}
      <h2>Origem da visita</h2>
      <p>Quando você envia uma mensagem, registramos de qual anúncio ou site você chegou (por exemplo, parâmetros utm da campanha), para sabermos quais canais funcionam. Essa informação pode ser enviada ao nosso sistema de atendimento (CRM) junto com a mensagem.</p>
    </PaginaLegal>
  );
}
