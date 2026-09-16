import { Link } from "react-router";
import { CARROCERIAS } from "~/lib/veiculos";
import { slugify } from "~/lib/formato";
import { SITE } from "~/lib/site";
import { Logo } from "./Logo";

const MARCAS_RODAPE = ["Chevrolet", "Fiat", "Honda", "Hyundai", "Jeep", "Toyota", "Volkswagen", "BYD"];

export function SiteFooter() {
  return (
    <footer className="mt-20 bg-noite text-white/75">
      <div className="conteiner grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo claro />
          <p className="mt-4 max-w-xs text-sm leading-relaxed">{SITE.descricao}</p>
        </div>

        <nav aria-label="Marcas">
          <h2 className="text-sm font-semibold text-white">Carros por marca</h2>
          <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
            {MARCAS_RODAPE.map((m) => (
              <li key={m}><Link to={`/carros/${slugify(m)}`} className="hover:text-white">{m}</Link></li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Categorias">
          <h2 className="text-sm font-semibold text-white">Carros por categoria</h2>
          <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
            {CARROCERIAS.slice(0, 6).map((c) => (
              <li key={c}><Link to={`/carros?carroceria=${encodeURIComponent(c)}`} className="hover:text-white">{c}</Link></li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Anunciantes">
          <h2 className="text-sm font-semibold text-white">Para quem vende</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link to="/painel/anuncios/novo" className="hover:text-white">Anunciar grátis</Link></li>
            <li><Link to="/painel" className="hover:text-white">Meus anúncios</Link></li>
            <li><Link to="/termos" className="hover:text-white">Termos de uso</Link></li>
            <li><Link to="/privacidade" className="hover:text-white">Política de privacidade</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <p className="conteiner py-6 text-xs text-white/60">
          © {new Date().getFullYear()} {SITE.nome}. Os anúncios são de responsabilidade de quem anuncia.
        </p>
      </div>
    </footer>
  );
}
