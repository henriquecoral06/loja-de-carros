import type { EstiloLP } from "~/lib/veiculos";
import { Casca, useLP, type PropsLP } from "./base";
import { Boutique } from "./Boutique";
import { Clean } from "./Clean";
import { Editorial } from "./Editorial";
import { Luxo } from "./Luxo";
import { Moderno } from "./Moderno";
import { Noturno } from "./Noturno";
import { Tech } from "./Tech";
import { Vibrante } from "./Vibrante";

const ESTILOS: Record<EstiloLP, typeof Editorial> = { editorial: Editorial, vibrante: Vibrante, clean: Clean, luxo: Luxo, noturno: Noturno, tech: Tech, moderno: Moderno, boutique: Boutique };

export function LandingPage(props: PropsLP) {
  const d = useLP(props);
  const Estilo = ESTILOS[props.lp.estilo] ?? Editorial;
  return (
    <Casca d={d}>
      <Estilo {...d} />
    </Casca>
  );
}
