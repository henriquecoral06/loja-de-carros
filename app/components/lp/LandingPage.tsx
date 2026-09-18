import type { EstiloLP } from "~/lib/veiculos";
import { Casca, useLP, type PropsLP } from "./base";
import { Boutique } from "./Boutique";
import { Editorial } from "./Editorial";
import { Luxo } from "./Luxo";
import { Moderno } from "./Moderno";
import { Noturno } from "./Noturno";
import { Tech } from "./Tech";

const ESTILOS: Record<EstiloLP, typeof Editorial> = { editorial: Editorial, luxo: Luxo, noturno: Noturno, tech: Tech, moderno: Moderno, boutique: Boutique };

export function LandingPage(props: PropsLP) {
  const d = useLP(props);
  // Estilo que não existe mais (ex.: Clean, Vibrante) abre como Moderno.
  const Estilo = ESTILOS[props.lp.estilo] ?? Moderno;
  return (
    <Casca d={d}>
      <Estilo {...d} />
    </Casca>
  );
}
