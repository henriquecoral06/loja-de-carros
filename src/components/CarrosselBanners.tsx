import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Banner } from "@/integrations/supabase/types";
import { useConfig } from "@/hooks/useConfig";

const INTERVALO = 6000;

function useBanners() {
  return useQuery({
    queryKey: ["banners"],
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("banners").select("*").eq("ativo", true).order("ordem");
      if (error) throw error;
      return (data ?? []) as Banner[];
    },
  });
}

/**
 * Abertura do site: só imagem, sem texto e sem botão por cima. Quem
 * remixa o projeto troca as imagens pelo painel e a home inteira muda
 * de cara, sem tocar em código.
 *
 * O h1 existe, mas fica escondido: a página precisa de um título para
 * leitor de tela e buscador, e não há texto visível para cumprir esse
 * papel.
 */
export default function CarrosselBanners() {
  const { data: banners, isLoading } = useBanners();
  const { data: config } = useConfig();
  const [atual, setAtual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const trilho = useRef<HTMLDivElement>(null);
  const toqueX = useRef<number | null>(null);

  const total = banners?.length ?? 0;
  const ir = useCallback((i: number) => setAtual(((i % total) + total) % total), [total]);

  useEffect(() => {
    if (total < 2 || pausado) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setAtual((i) => (i + 1) % total), INTERVALO);
    return () => clearInterval(t);
  }, [total, pausado]);

  // Sem banner o site não pode abrir vazio: cai numa faixa na cor da
  // marca com o nome da loja, que é o estado do template recém-remixado.
  if (isLoading) {
    return <div className="aspect-[4/3] w-full animate-pulse bg-[var(--s-surface-strong)] md:aspect-[12/5]" />;
  }

  if (!total) {
    return (
      <section className="band-dark">
        <div className="site-container site-section">
          <h1 className="t-display-lg max-w-[24ch] text-[var(--s-on-dark)]">{config?.nome ?? "Revenda"}</h1>
          {config?.o_que_vende && (
            <p className="t-body-md mt-4 max-w-[46ch] text-[var(--s-on-dark-soft)]">{config.o_que_vende}</p>
          )}
        </div>
      </section>
    );
  }

  const conteudo = (b: Banner, i: number) => (
    <img
      src={b.url}
      alt={b.alt || `${config?.nome ?? "Revenda"} — imagem ${i + 1}`}
      loading={i === 0 ? "eager" : "lazy"}
      {...(i === 0 ? { fetchpriority: "high" } : {})}
      className="h-full w-full object-cover"
    />
  );

  return (
    <section
      aria-roledescription="carrossel"
      aria-label="Destaques da loja"
      className="relative w-full overflow-hidden bg-[var(--s-surface-dark)]"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocusCapture={() => setPausado(true)}
      onBlurCapture={() => setPausado(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") { ir(atual + 1); }
        if (e.key === "ArrowLeft") { ir(atual - 1); }
      }}
      onTouchStart={(e) => { toqueX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (toqueX.current === null) return;
        const d = e.changedTouches[0].clientX - toqueX.current;
        if (Math.abs(d) > 45) ir(atual + (d < 0 ? 1 : -1));
        toqueX.current = null;
      }}
    >
      <h1 className="sr-only">
        {config?.nome ?? "Revenda"}
        {config?.o_que_vende ? ` — ${config.o_que_vende}` : ""}
      </h1>

      <div ref={trilho}
        className="flex transition-transform duration-500 ease-out motion-reduce:transition-none"
        style={{ transform: `translateX(-${atual * 100}%)` }}>
        {banners!.map((b, i) => (
          <div key={b.id}
            className="aspect-[4/3] w-full shrink-0 md:aspect-[12/5]"
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} de ${total}`}
            aria-hidden={i !== atual}>
            {b.link ? (
              b.link.startsWith("/")
                ? <Link to={b.link} tabIndex={i === atual ? 0 : -1} className="block h-full w-full">{conteudo(b, i)}</Link>
                : <a href={b.link} target="_blank" rel="noopener noreferrer" tabIndex={i === atual ? 0 : -1}
                    className="block h-full w-full">{conteudo(b, i)}</a>
            ) : conteudo(b, i)}
          </div>
        ))}
      </div>

      {total > 1 && (
        <>
          <button type="button" onClick={() => ir(atual - 1)} aria-label="Imagem anterior"
            className="absolute left-0 top-1/2 grid h-14 w-11 -translate-y-1/2 place-items-center bg-white/90 text-[var(--s-ink)] transition-colors hover:bg-white md:w-14">
            <CaretLeft size={20} weight="bold" />
          </button>
          <button type="button" onClick={() => ir(atual + 1)} aria-label="Próxima imagem"
            className="absolute right-0 top-1/2 grid h-14 w-11 -translate-y-1/2 place-items-center bg-white/90 text-[var(--s-ink)] transition-colors hover:bg-white md:w-14">
            <CaretRight size={20} weight="bold" />
          </button>

          <div className="absolute inset-x-0 bottom-0 flex justify-center gap-2 p-5">
            {banners!.map((b, i) => (
              <button key={b.id} type="button" onClick={() => ir(i)}
                aria-label={`Ir para a imagem ${i + 1}`}
                aria-current={i === atual}
                className="group grid h-8 w-8 place-items-center">
                <span className={`block h-1.5 transition-all ${
                  i === atual ? "w-8 bg-white" : "w-4 bg-white/50 group-hover:bg-white/80"}`} />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
