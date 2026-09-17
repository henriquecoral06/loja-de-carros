import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { Link } from "react-router";
import { cep } from "~/lib/formato";
import { useLoja } from "~/lib/useLoja";
import { CARROCERIAS } from "~/lib/veiculos";
import { Logo } from "./Logo";
import { LinkTelefone } from "./WhatsApp";

export function SiteFooter() {
  const loja = useLoja();
  const cidade = [loja.cidade, loja.uf].filter(Boolean).join(" - ");
  const redes = ([["Instagram", loja.instagram], ["Facebook", loja.facebook], ["TikTok", loja.tiktok], ["YouTube", loja.youtube]] as const)
    .filter(([, url]) => /^https:\/\//.test(url));
  const titulo = "text-xs font-bold uppercase tracking-[0.12em] text-white";
  const link = "inline-block py-1.5 transition-colors hover:text-white";

  return (
    <footer className="mt-20 bg-noite text-[15px] text-white/70">
      <div className="conteiner grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.3fr_0.7fr_0.8fr_1.6fr] lg:gap-12">
        <div>
          <Logo loja={loja} claro />
          {loja.slogan && <p className="mt-5 max-w-xs leading-relaxed">{loja.slogan}</p>}
          {redes.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">
              {redes.map(([nome, url]) => (
                <li key={nome}><a href={url} target="_blank" rel="noopener noreferrer" className="inline-block py-1 text-white hover:underline">{nome}</a></li>
              ))}
            </ul>
          )}
        </div>

        <nav aria-labelledby="rodape-categorias">
          <h2 id="rodape-categorias" className={titulo}>Categorias</h2>
          <ul className="mt-4">
            {CARROCERIAS.slice(0, 5).map((c) => (
              <li key={c}><Link to={`/carros?carroceria=${encodeURIComponent(c)}`} className={link}>{c}</Link></li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="rodape-institucional">
          <h2 id="rodape-institucional" className={titulo}>Institucional</h2>
          <ul className="mt-4">
            <li><Link to="/carros" className={link}>Estoque completo</Link></li>
            <li><Link to="/venda-seu-carro" className={link}>Venda seu carro</Link></li>
            <li><Link to="/sobre" className={link}>Sobre a loja</Link></li>
            <li><Link to="/contato" className={link}>Contato</Link></li>
            <li><Link to="/privacidade" className={link}>Privacidade</Link></li>
            <li><Link to="/termos" className={link}>Termos de uso</Link></li>
          </ul>
        </nav>

        <div>
          <h2 className={titulo}>Atendimento</h2>
          <ul className="mt-4 space-y-3">
            {(loja.endereco || cidade) && (
              <li className="flex gap-2.5">
                <MapPin className="mt-1 size-4 shrink-0 text-white/50" aria-hidden="true" />
                <span>
                  {[loja.endereco, loja.bairro].filter(Boolean).join(", ")}
                  {cidade && <><br />{cidade}</>}
                  {loja.cep && <><br /><span className="whitespace-nowrap">CEP {cep(loja.cep)}</span></>}
                </span>
              </li>
            )}
            {loja.horario && <li className="flex gap-2.5"><Clock className="mt-1 size-4 shrink-0 text-white/50" aria-hidden="true" />{loja.horario}</li>}
            {loja.telefone && (
              <li className="flex gap-2.5">
                <Phone className="mt-1 size-4 shrink-0 text-white/50" aria-hidden="true" />
                <LinkTelefone numero={loja.telefone} ddi={loja.telefoneDdi} className="numeros hover:text-white" />
              </li>
            )}
            {loja.email && (
              <li className="flex gap-2.5">
                <Mail className="mt-1 size-4 shrink-0 text-white/50" aria-hidden="true" />
                <a href={`mailto:${loja.email}`} className="min-w-0 [overflow-wrap:anywhere] hover:text-white">{loja.email}</a>
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        {/* Tudo à esquerda: o botão flutuante do WhatsApp ocupa o canto direito. */}
        <div className="conteiner flex flex-wrap items-center gap-x-6 gap-y-1 py-5 pr-24 text-[13px] text-white/60">
          <p>© {new Date().getFullYear()} {loja.nome}</p>
          {loja.cnpj && <p>CNPJ {loja.cnpj}</p>}
          <Link to="/admin" className="inline-block py-1 hover:text-white">Área da equipe</Link>
        </div>
      </div>
    </footer>
  );
}
