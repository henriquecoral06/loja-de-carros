import type { EstiloLP } from "~/lib/veiculos";
import type { EstiloBotao, TemaLP } from "./tema";

type InfoEstilo = { valor: EstiloLP; rotulo: string; descricao: string; botao: EstiloBotao; tema: TemaLP };

/** Estilos visuais das landing pages, cada um com a paleta completa sugerida. */
export const INFO_ESTILOS: InfoEstilo[] = [
  {
    valor: "editorial",
    rotulo: "Editorial",
    descricao: "Foto grande no topo, serifa e blocos escuros. Sofisticado, bom para seminovos premium.",
    botao: "quadrado",
    tema: { fundo: "#ffffff", titulo: "#1f3a5f", texto: "#3f3f46", fundoBloco: "#1f3a5f", tituloBloco: "#ffffff", textoBloco: "#d6dde8", botao: "#c0392b", textoBotao: "#ffffff", destaque: "#c0392b", rotulo: "#c0392b", rotuloBloco: "#d6dde8", fundoMenu: "#ffffff", textoMenu: "#1f3a5f" },
  },
  {
    valor: "vibrante",
    rotulo: "Vibrante",
    descricao: "Cores vivas, divisórias curvas e seções centralizadas. Leve e chamativo, bom para feirões.",
    botao: "pilula",
    tema: { fundo: "#fbf7f2", titulo: "#1f6f66", texto: "#4b5563", fundoBloco: "#2a9d8f", tituloBloco: "#ffffff", textoBloco: "#e6f4f2", botao: "#c2410c", textoBotao: "#ffffff", destaque: "#e76f51", rotulo: "#c2410c", rotuloBloco: "#e6f4f2", fundoMenu: "#fbf7f2", textoMenu: "#1f6f66" },
  },
  {
    valor: "clean",
    rotulo: "Clean",
    descricao: "Fundo branco, galeria no topo e card de contato fixo ao lado. Parecido com a página do carro.",
    botao: "pilula",
    tema: { fundo: "#ffffff", titulo: "#111827", texto: "#4b5563", fundoBloco: "#f7f7f7", tituloBloco: "#111827", textoBloco: "#4b5563", botao: "#0f7a53", textoBotao: "#ffffff", destaque: "#0f8a5f", rotulo: "#0f7a53", rotuloBloco: "#4b5563", fundoMenu: "#ffffff", textoMenu: "#111827" },
  },
  {
    valor: "luxo",
    rotulo: "Luxo",
    descricao: "Off-white, serifa elegante e detalhes dourados. Discreto e premium, para carros exclusivos.",
    botao: "pilula",
    tema: { fundo: "#fbfaf8", titulo: "#1a1a1a", texto: "#4a4a4a", fundoBloco: "#0b0b0b", tituloBloco: "#ffffff", textoBloco: "#d5d5d5", botao: "#8a6410", textoBotao: "#ffffff", destaque: "#a97e15", rotulo: "#8a6410", rotuloBloco: "#d5d5d5", fundoMenu: "#fbfaf8", textoMenu: "#1a1a1a" },
  },
  {
    valor: "noturno",
    rotulo: "Noturno",
    descricao: "Página escura em tons quentes, serifa itálica e formulário já no topo. Para campanhas de conversão.",
    botao: "quadrado",
    tema: { fundo: "#1c1917", titulo: "#f5f5f4", texto: "#b6afa6", fundoBloco: "#ece8e2", tituloBloco: "#1c1917", textoBloco: "#57534e", botao: "#e7e5e4", textoBotao: "#1c1917", destaque: "#b6afa6", rotulo: "#b6afa6", rotuloBloco: "#57534e", fundoMenu: "#171412", textoMenu: "#e7e5e4" },
  },
  {
    valor: "tech",
    rotulo: "Tech",
    descricao: "Preto, rótulos numerados e ficha técnica em destaque. Para quem vende com dados e transparência.",
    botao: "arredondado",
    tema: { fundo: "#0a0a0c", titulo: "#ffffff", texto: "#a1a1aa", fundoBloco: "#16161a", tituloBloco: "#ffffff", textoBloco: "#a1a1aa", botao: "#ffffff", textoBotao: "#0a0a0c", destaque: "#86efac", rotulo: "#86efac", rotuloBloco: "#a1a1aa", fundoMenu: "#0a0a0c", textoMenu: "#ffffff" },
  },
  {
    valor: "moderno",
    rotulo: "Moderno",
    descricao: "Página em moldura arredondada, azul vivo e card do carro no topo. Direto e comercial.",
    botao: "arredondado",
    tema: { fundo: "#f4f5f7", titulo: "#0f172a", texto: "#475569", fundoBloco: "#0b1220", tituloBloco: "#ffffff", textoBloco: "#cbd5e1", botao: "#2563eb", textoBotao: "#ffffff", destaque: "#2563eb", rotulo: "#2563eb", rotuloBloco: "#cbd5e1", fundoMenu: "#ffffff", textoMenu: "#0f172a" },
  },
  {
    valor: "boutique",
    rotulo: "Boutique",
    descricao: "Branco, serifa clássica e botões pílula. Acolhedor, ideal para loja de bairro e atendimento próximo.",
    botao: "pilula",
    tema: { fundo: "#ffffff", titulo: "#111111", texto: "#4b5563", fundoBloco: "#0f1720", tituloBloco: "#ffffff", textoBloco: "#cbd5e1", botao: "#111111", textoBotao: "#ffffff", destaque: "#906803", rotulo: "#906803", rotuloBloco: "#cbd5e1", fundoMenu: "#ffffff", textoMenu: "#111111" },
  },
];

export const infoEstilo = (valor: string) => INFO_ESTILOS.find((e) => e.valor === valor) ?? INFO_ESTILOS[0];
