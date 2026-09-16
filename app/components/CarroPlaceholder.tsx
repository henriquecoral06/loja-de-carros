import { useId } from "react";

/**
 * Ilustração para anúncio sem foto. Muda o perfil pela carroceria — uma
 * picape sem foto não deve aparecer com silhueta de hatch.
 */
const PERFIS: Record<string, { corpo: string; janela: string; rodas: [number, number]; raio: number; base: number }> = {
  hatch: {
    corpo: "M44 118 62 98q10-8 28-10l28-20q10-6 24-6h72q16 0 24 12l18 22q14 4 18 14l2 10q0 6-8 6H52q-12 0-8-8Z",
    janela: "M100 90 124 72q6-4 16-4h26v22Zm72 0V68h36q10 0 16 8l12 14Z",
    rodas: [94, 228], raio: 16, base: 126,
  },
  seda: {
    corpo: "M40 118 60 98q10-8 28-10l30-18q10-6 24-6h54q16 0 26 8l24 16q22 2 34 10l8 14q2 10-6 12H50q-12 0-10-6Z",
    janela: "M100 88 126 72q6-4 16-4h24v20Zm74 0V68h24q10 0 18 6l18 14Z",
    rodas: [92, 238], raio: 16, base: 124,
  },
  suv: {
    corpo: "M36 120 50 96q8-10 24-12l30-24q10-8 26-8h90q18 0 28 12l18 22q18 4 24 16l2 16q0 8-10 8H46q-12 0-10-6Z",
    janela: "M96 84 122 62q6-4 14-4h32v26Zm78 0V58h42q12 0 18 8l14 18Z",
    rodas: [92, 244], raio: 18, base: 126,
  },
  picape: {
    corpo: "M30 120 44 98q8-8 22-10l30-24q8-6 22-6h50q12 0 18 10l14 22h92q6 0 6 8v22q0 6-8 6H40q-12 0-10-6Z",
    janela: "M92 88 116 68q6-4 14-4h22v24Zm66 0V64h10q8 0 12 6l12 18Z",
    rodas: [86, 248], raio: 18, base: 126,
  },
};

const perfilDe = (carroceria?: string) => {
  switch (carroceria) {
    case "Hatch": return PERFIS.hatch;
    case "SUV": case "Minivan": return PERFIS.suv;
    case "Picape": return PERFIS.picape;
    default: return PERFIS.seda;
  }
};

export function CarroPlaceholder({ carroceria, className }: { carroceria?: string; className?: string }) {
  const p = perfilDe(carroceria);
  // Um id por instância: 24 cards com o mesmo id de gradiente seriam 24
  // ids duplicados no documento.
  const gradiente = `fundo-carro-${useId().replace(/:/g, "")}`;
  return (
    // "meet", não "slice": num contêiner 4:3 o slice cortava a frente e a
    // traseira do carro. O fundo do próprio SVG cobre as sobras.
    <svg viewBox="0 0 320 180" className={className} role="img" aria-label="Veículo sem foto" preserveAspectRatio="xMidYMid meet"
      style={{ background: "linear-gradient(#edf1f6, #dfe5ed)" }}>
      <defs>
        <linearGradient id={gradiente} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#edf1f6" />
          <stop offset="1" stopColor="#dfe5ed" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#${gradiente})`} />
      <ellipse cx="164" cy={p.base + 16} rx="132" ry="7" fill="#cdd4de" />
      <path d={p.corpo} fill="#c3cbd6" />
      <path d={p.janela} fill="#dfe5ed" />
      {p.rodas.map((x) => (
        <g key={x}>
          <circle cx={x} cy={p.base} r={p.raio} fill="#8f99a7" />
          <circle cx={x} cy={p.base} r={p.raio * 0.45} fill="#c3cbd6" />
        </g>
      ))}
    </svg>
  );
}
