import { useCallback, useRef } from "react";

/**
 * Publica a posição do ponteiro em --spot-x/--spot-y, com throttle por
 * requestAnimationFrame. O CSS desenha dois efeitos a partir dessas
 * coordenadas: o brilho interno (::after, só na premium) e o brilho de
 * borda (::before, nas duas superfícies).
 */
export function useSpotlight() {
  const quadro = useRef<number | null>(null);

  const onPointerMove = useCallback((evento: React.PointerEvent<HTMLElement>) => {
    const alvo = evento.currentTarget;
    const x = evento.clientX;
    const y = evento.clientY;
    if (quadro.current !== null) return;
    quadro.current = requestAnimationFrame(() => {
      quadro.current = null;
      const r = alvo.getBoundingClientRect();
      alvo.style.setProperty("--spot-x", `${x - r.left}px`);
      alvo.style.setProperty("--spot-y", `${y - r.top}px`);
    });
  }, []);

  return { onPointerMove };
}
