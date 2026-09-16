import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { lojaDasRotas } from "~/lib/site";
import { useLoja } from "~/lib/useLoja";
import type { Route } from "./+types/sobre";

export function meta({ matches }: Route.MetaArgs) {
  const loja = lojaDasRotas(matches);
  return [
    { title: `A loja — ${loja.nome}` },
    { name: "description", content: loja.slogan || `Conheça ${loja.nome}.` },
  ];
}

export default function Sobre() {
  const loja = useLoja();
  const paragrafos = loja.sobre.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  return (
    <>
      <section className="bg-noite">
        <div className="conteiner py-14 sm:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-marca-200">A loja</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">{loja.nome}</h1>
          {loja.slogan && <p className="mt-4 max-w-xl text-lg text-white/75">{loja.slogan}</p>}
        </div>
      </section>
      <div className="conteiner grid gap-8 py-12 lg:grid-cols-[minmax(0,1fr)_340px]">
        <article className="cartao p-6 sm:p-8">
          <h2 className="text-2xl font-extrabold tracking-tight text-tinta">Nossa história</h2>
          {paragrafos.length ? (
            <div className="mt-4 max-w-[68ch] space-y-4 leading-relaxed text-texto">
              {paragrafos.map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}
            </div>
          ) : (
            <p className="mt-4 text-suave">Em breve contaremos mais sobre a loja por aqui.</p>
          )}
        </article>
        <aside className="grid content-start gap-4">
          <div className="cartao p-6">
            <h2 className="font-bold text-tinta">Venha conhecer</h2>
            <p className="mt-2 text-sm text-suave">Veja o estoque pelo site e agende uma visita para ver o carro de perto.</p>
            <Link to="/carros" className="botao-primario mt-4 w-full">Ver o estoque <ArrowRight className="size-4" aria-hidden="true" /></Link>
            <Link to="/contato" className="botao-secundario mt-2 w-full">Endereço e contato</Link>
          </div>
        </aside>
      </div>
    </>
  );
}
