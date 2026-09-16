import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { Link } from "react-router";
import type { DadosLoja } from "~/.server/loja";
import { telefone } from "~/lib/formato";
import { CARROCERIAS } from "~/lib/veiculos";
import { Logo } from "./Logo";

export function SiteFooter({ loja }: { loja: DadosLoja }) {
  const endereco = [loja.endereco, loja.bairro, [loja.cidade, loja.uf].filter(Boolean).join(" - ")].filter(Boolean).join(", ");

  return (
    <footer className="mt-20 bg-noite text-white/75">
      <div className="conteiner grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <Logo nome={loja.nome} claro />
          {loja.slogan && <p className="mt-4 max-w-xs text-sm leading-relaxed">{loja.slogan}</p>}
          <ul className="mt-5 space-y-2.5 text-sm">
            {endereco && <li className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{endereco}</li>}
            {loja.horario && <li className="flex gap-2"><Clock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{loja.horario}</li>}
            {loja.telefone && <li className="flex gap-2"><Phone className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><a href={`tel:+55${loja.telefone}`} className="hover:text-white">{telefone(loja.telefone)}</a></li>}
            {loja.email && <li className="flex gap-2"><Mail className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><a href={`mailto:${loja.email}`} className="hover:text-white">{loja.email}</a></li>}
          </ul>
        </div>

        <nav aria-label="Categorias">
          <h2 className="text-sm font-semibold text-white">Estoque por categoria</h2>
          <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
            {CARROCERIAS.slice(0, 6).map((c) => (
              <li key={c}><Link to={`/carros?carroceria=${encodeURIComponent(c)}`} className="inline-block py-1 hover:text-white">{c}</Link></li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Institucional">
          <h2 className="text-sm font-semibold text-white">{loja.nome}</h2>
          <ul className="mt-4 space-y-1 text-sm">
            <li><Link to="/sobre" className="inline-block py-1 hover:text-white">Sobre a loja</Link></li>
            <li><Link to="/contato" className="inline-block py-1 hover:text-white">Contato e localização</Link></li>
            <li><Link to="/termos" className="inline-block py-1 hover:text-white">Termos de uso</Link></li>
            <li><Link to="/privacidade" className="inline-block py-1 hover:text-white">Política de privacidade</Link></li>
          </ul>
          {(loja.instagram || loja.facebook) && (
            <ul className="mt-4 flex gap-4 text-sm font-semibold">
              {loja.instagram && <li><a href={`https://instagram.com/${loja.instagram}`} target="_blank" rel="noopener noreferrer" className="inline-block py-1 text-white hover:underline">Instagram</a></li>}
              {loja.facebook && <li><a href={loja.facebook} target="_blank" rel="noopener noreferrer" className="inline-block py-1 text-white hover:underline">Facebook</a></li>}
            </ul>
          )}
        </nav>
      </div>
      <div className="border-t border-white/10">
        <div className="conteiner flex flex-wrap items-center justify-between gap-2 py-6 text-xs text-white/60">
          <p>© {new Date().getFullYear()} {loja.nome}{loja.cnpj && ` · CNPJ ${loja.cnpj}`}</p>
          <Link to="/admin" className="inline-block py-1 hover:text-white">Área da loja</Link>
        </div>
      </div>
    </footer>
  );
}
