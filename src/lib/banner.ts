import type { Config } from "@/integrations/supabase/types";

/* =====================================================================
   Gerador do prompt do banner da home.

   O banner não é uma imagem solta: ele entra atrás do título da home,
   recortado em `object-cover` e rebaixado a 30% de opacidade. Isso muda
   tudo no prompt — é por isso que ele pede área limpa no centro, proíbe
   texto na imagem e cobra contraste que sobreviva ao rebaixamento.
   ===================================================================== */

/** "191 78% 21%" (token do banco) → "#0b5560", que é o que a IA entende. */
export function hslParaHex(hsl?: string | null): string | null {
  if (!hsl) return null;
  const m = hsl.trim().match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (!m) return null;
  const h = Number(m[1]) / 360, s = Number(m[2]) / 100, l = Number(m[3]) / 100;

  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    const v = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * v).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export interface Tom {
  chave: string;
  rotulo: string;
  /** Como o tom vira direção de arte. */
  direcao: string;
  luz: string;
}

export const TONS: Tom[] = [
  {
    chave: "proximo", rotulo: "Próximo e acolhedor",
    direcao: "clima caloroso e humano, gente de verdade, sensação de atendimento sem pressa",
    luz: "luz natural quente de fim de tarde, sombras suaves",
  },
  {
    chave: "profissional", rotulo: "Profissional e direto",
    direcao: "composição limpa e organizada, nada de excesso, transmite competência e eficiência",
    luz: "luz de dia neutra e uniforme, sem drama",
  },
  {
    chave: "premium", rotulo: "Premium e sofisticado",
    direcao: "elegância contida, superfícies polidas e reflexos, muito espaço vazio",
    luz: "luz baixa e direcional, fundo escuro, brilhos controlados na lataria",
  },
  {
    chave: "jovem", rotulo: "Jovem e enérgico",
    direcao: "ângulo dinâmico, sensação de movimento, cores vivas",
    luz: "luz forte de meio-dia com contraste alto",
  },
  {
    chave: "familiar", rotulo: "Familiar e confiável",
    direcao: "ambiente aberto e tranquilo, espaço para a família, nada agressivo",
    luz: "luz de manhã clara e difusa",
  },
];

export interface Formato {
  chave: string;
  rotulo: string;
  largura: number;
  altura: number;
  onde: string;
  /** Onde o site desenha texto por cima — a IA precisa deixar limpo. */
  areaSegura: string;
}

export const FORMATOS: Formato[] = [
  {
    chave: "hero-desktop", rotulo: "Banner da home — desktop",
    largura: 1920, altura: 800,
    onde: "fundo do bloco de abertura da home, no computador",
    areaSegura: "o terço esquerdo da imagem",
  },
  {
    chave: "hero-mobile", rotulo: "Banner da home — celular",
    largura: 1080, altura: 1350,
    onde: "fundo do bloco de abertura da home, no celular",
    areaSegura: "a metade superior da imagem",
  },
  {
    chave: "og", rotulo: "Imagem de compartilhamento",
    largura: 1200, altura: 630,
    onde: "card que aparece ao colar o link da revenda no WhatsApp",
    areaSegura: "",
  },
];

export type Estilo = "fotografico" | "grafico";

export interface Opcoes {
  formato: string;
  estilo: Estilo;
  mostrarCarro: boolean;
  mostrarPessoas: boolean;
  observacoes?: string;
}

const mdc = (a: number, b: number): number => (b === 0 ? a : mdc(b, a % b));

/** "1920x800" também como "12:5": alguns geradores só aceitam a razão. */
const proporcao = (largura: number, altura: number) => {
  const d = mdc(largura, altura);
  return `${largura / d}:${altura / d}`;
};

/** A área segura muda de gênero entre os formatos ("o terço", "a metade"),
 *  então a frase é construída sem adjetivo que precise concordar. */
const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

const linhas = (texto?: string | null, limite = 4) =>
  (texto ?? "").split("\n").map((l) => l.trim()).filter(Boolean).slice(0, limite);

export function montarPrompt(config: Partial<Config> & Record<string, any>, opcoes: Opcoes): string {
  const formato = FORMATOS.find((f) => f.chave === opcoes.formato) ?? FORMATOS[0];
  const tom = TONS.find((t) => t.chave === config.tom_de_voz) ?? TONS[0];

  const primaria = hslParaHex(config.cor_primaria);
  const destaque = hslParaHex(config.cor_destaque);
  const local = config.regiao || [config.cidade, config.uf].filter(Boolean).join(" - ");
  const difs = linhas(config.diferenciais, 3);
  const provas = linhas(config.provas_numeros, 2);

  const paleta = [
    primaria && `cor dominante ${primaria}`,
    destaque && `acento pontual ${destaque}`,
    "neutros de apoio em cinza-grafite e off-white",
  ].filter(Boolean).join(", ");

  const sujeito = opcoes.estilo === "grafico"
    ? "Composição gráfica abstrata — formas geométricas amplas, gradientes suaves e textura sutil. Sem representação literal de veículos."
    : [
        "Fotografia publicitária de revenda de automóveis.",
        opcoes.mostrarCarro
          ? "Um único veículo seminovo bem conservado, em três quartos, ocupando o lado oposto à área segura."
          : "Ambiente da loja sem destacar nenhum veículo específico — pátio, vitrine ou showroom.",
        opcoes.mostrarPessoas
          ? "Uma ou duas pessoas em situação natural de atendimento, sem encarar a câmera."
          : "Sem pessoas em quadro.",
      ].join(" ");

  const bloco = (titulo: string, corpo: string) => `${titulo}\n${corpo}`;

  return [
    bloco("CONTEXTO",
      [
        `Imagem de fundo para ${formato.onde}.`,
        `Negócio: ${config.nome ?? "revenda de veículos"}${local ? `, em ${local}` : ""}.`,
        config.o_que_vende && `Vende: ${config.o_que_vende}.`,
        config.para_quem && `Fala com: ${config.para_quem}.`,
      ].filter(Boolean).join(" ")),

    bloco("O QUE MOSTRAR", sujeito),

    bloco("DIREÇÃO DE ARTE", `${maiuscula(tom.direcao)}. ${maiuscula(tom.luz)}.`),

    // Diferencial é argumento de venda, não elemento de cena. Jogado
    // literalmente no prompt, "aceitamos seu usado na troca" vira uma
    // tentativa de desenhar a frase. Entra como sensação a transmitir.
    bloco("SENSAÇÃO A TRANSMITIR",
      [
        "Traduza em clima e enquadramento, nunca em texto, ícone ou símbolo literal:",
        ...(difs.length ? difs.map((d) => `- ${d}`) : ["- procedência e confiança"]),
        // Lista, não prosa: as provas vêm digitadas pelo lojista com
        // maiúscula própria ("Nota 4,8 no Google") e emendá-las numa
        // frase deixa maiúscula no meio do texto.
        provas.length
          ? `\nO negócio precisa parecer estabelecido e cuidado, não improvisado:\n${provas.map((p) => `- ${p}`).join("\n")}`
          : null,
      ].filter(Boolean).join("\n")),

    bloco("PALETA", `${paleta}. Mantenha a imagem tonalmente coesa: nada de cores fora dessa faixa competindo com a marca.`),

    bloco("COMPOSIÇÃO",
      formato.chave === "og"
        ? "Assunto centralizado e legível em miniatura, porque este card costuma aparecer pequeno na conversa."
        : `Deixe ${formato.areaSegura} sem nenhum detalhe — fundo liso, nenhum ponto de interesse — porque é ali que o site escreve o título e desenha os botões. Todo o peso visual vai para o lado oposto.`),

    bloco("RESTRIÇÕES TÉCNICAS",
      [
        `Proporção ${proporcao(formato.largura, formato.altura)} (${formato.largura}x${formato.altura} px).`,
        "SEM NENHUM TEXTO, palavra, letra, número ou marca-d'água na imagem — todo o texto é escrito pelo site por cima. Texto gerado sai deformado e ainda repete o que já está escrito.",
        "Sem logotipos de montadoras, sem placas legíveis, sem rostos de pessoas reais identificáveis.",
        formato.chave !== "og"
          ? "A imagem será exibida a 30% de opacidade sobre um fundo claro: use contraste médio e formas amplas. Cena escura ou muito detalhada vira mancha cinza depois do rebaixamento."
          : "Contraste alto, porque o card é exibido pequeno.",
        "Nada de colagem, moldura, borda ou divisão da imagem em painéis.",
      ].join(" ")),

    opcoes.observacoes?.trim() && bloco("PEDIDOS DA LOJA", opcoes.observacoes.trim()),

    bloco("EVITAR",
      "texto, letras, números, logos, placas, watermark, colagem, bordas, molduras, pessoas olhando para a câmera, carros esportivos de luxo irreais, iluminação neon, HDR exagerado, distorção de lente, reflexos com formas estranhas, qualidade de renderização 3D amadora."),
  ].filter(Boolean).join("\n\n");
}
