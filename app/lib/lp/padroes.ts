import { anos, km } from "~/lib/formato";
import type { Depoimento, Destaque, Etapa, Numero, Pergunta } from "./conteudo";

export type VeiculoBase = {
  codigo: number; marca: string; modelo: string; versao: string; anoFabricacao: number; anoModelo: number;
  km: number; preco: number; cambio: string; combustivel: string; carroceria: string; cor: string; portas: number;
  opcionais: string[]; descricao: string;
};
export type LojaBase = { nome: string; endereco: string; bairro: string; cidade: string; uf: string };

/** Textos e listas que o editor preenche de uma vez ("Preencher textos"). */
export type SementeLP = {
  nomeExibido: string;
  headline: string;
  subtitulo: string;
  secao1Titulo: string;
  secao1Texto: string;
  secao2Titulo: string;
  secao2Texto: string;
  localTitulo: string;
  localTexto: string;
  mapaEndereco: string;
  ctaTitulo: string;
  ctaSubtitulo: string;
  mensagemWhatsapp: string;
  videoTitulo: string;
  fichaTitulo: string;
  numerosTitulo: string;
  etapasTitulo: string;
  depoimentosTitulo: string;
  faq: Pergunta[];
  /** Vazio = automático (opcionais do carro). */
  destaques: Destaque[];
  numeros: Numero[];
  etapas: Etapa[];
  depoimentos: Depoimento[];
};

const ETAPAS_PADRAO: Etapa[] = [
  { titulo: "Conversa", texto: "Tire suas dúvidas pelo WhatsApp ou formulário, sem compromisso." },
  { titulo: "Test drive", texto: "Agende uma visita e dirija o carro no horário que for melhor para você." },
  { titulo: "Proposta", texto: "Avaliamos seu usado na troca e simulamos o financiamento na hora." },
  { titulo: "Entrega", texto: "Cuidamos da documentação e da transferência. Você sai dirigindo." },
];

const FAQ_PADRAO: Pergunta[] = [
  { pergunta: "Posso agendar um test drive?", resposta: "Sim. Preencha o formulário ou chame no WhatsApp e combinamos o melhor horário." },
  { pergunta: "Vocês aceitam meu carro na troca?", resposta: "Aceitamos. Avaliamos o seu usado na hora e o valor entra como parte do pagamento." },
  { pergunta: "Tem financiamento?", resposta: "Trabalhamos com os principais bancos. Simulamos as parcelas com a entrada que você tiver." },
  { pergunta: "O carro tem garantia?", resposta: "Todos os carros passam por vistoria antes da venda. Consulte as condições de garantia deste veículo." },
];

const endereco = (l: LojaBase) => [l.endereco, l.bairro, l.cidade && `${l.cidade}${l.uf ? `/${l.uf}` : ""}`].filter(Boolean).join(", ");

const comum = (v: VeiculoBase, l: LojaBase) => ({
  nomeExibido: "",
  localTitulo: "Venha conhecer o carro de perto.",
  localTexto: l.cidade ? `Estamos em ${l.bairro ? `${l.bairro}, ` : ""}${l.cidade}. Agende sua visita e faça um test drive sem compromisso.` : "Agende sua visita e faça um test drive sem compromisso.",
  mapaEndereco: endereco(l),
  mensagemWhatsapp: `Olá! Vi a página do ${v.marca} ${v.modelo} ${v.anoModelo} e quero mais informações.`,
  videoTitulo: "Veja o carro em vídeo",
  fichaTitulo: "Ficha técnica",
  numerosTitulo: "",
  etapasTitulo: "Como comprar",
  depoimentosTitulo: "Quem já comprou com a gente",
  faq: FAQ_PADRAO,
  etapas: ETAPAS_PADRAO,
});

/** Preenchido com os dados do carro. */
export function textosDoVeiculo(v: VeiculoBase, l: LojaBase): SementeLP {
  const paragrafos = v.descricao.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  return {
    ...comum(v, l),
    headline: `${v.marca} ${v.modelo} ${v.versao} ${v.anoModelo}`.slice(0, 120),
    subtitulo: `${anos(v.anoFabricacao, v.anoModelo)} · ${km(v.km)} · ${v.cambio} · ${v.combustivel}. Revisado e pronto para rodar.`,
    secao1Titulo: `Um ${v.modelo} do jeito que você procurava.`,
    secao1Texto: paragrafos[0] ?? `${v.marca} ${v.modelo} ${v.versao}, ${v.cor.toLowerCase()}, ${v.portas} portas, com ${km(v.km)} rodados.`,
    secao2Titulo: "Pronto para a próxima viagem.",
    secao2Texto: paragrafos[1] ?? "Vistoriado, com documentação em dia e condições especiais de pagamento.",
    ctaTitulo: `Garanta este ${v.modelo} antes que alguém leve.`,
    ctaSubtitulo: "Deixe seu contato e receba a proposta com as condições de pagamento.",
    destaques: [],
    numeros: [],
    depoimentos: [],
  };
}

/** Modelo de campanha genérico, para escrever do seu jeito. Fotos e ficha continuam vindo do carro. */
export function textosModelo(v: VeiculoBase, l: LojaBase): SementeLP {
  return {
    ...comum(v, l),
    headline: `Seu próximo ${v.modelo} está aqui.`,
    subtitulo: `${v.marca} ${v.modelo} ${v.anoModelo} com condições especiais. Agende seu test drive.`,
    secao1Titulo: "Procedência que dá tranquilidade.",
    secao1Texto: "Escreva aqui o que torna este carro especial: histórico, conservação, revisões e para quem ele é ideal.",
    secao2Titulo: "Feito para o seu dia a dia.",
    secao2Texto: "Fale sobre conforto, economia, espaço e tecnologia — o que o cliente vai sentir ao dirigir.",
    ctaTitulo: "Faça sua proposta hoje.",
    ctaSubtitulo: "Deixe seu contato e receba as condições exclusivas desta oferta.",
    destaques: [
      { rotulo: "Laudo cautelar aprovado", icone: "FileCheck" },
      { rotulo: "Revisões em dia", icone: "Wrench" },
      { rotulo: "Garantia", icone: "BadgeCheck" },
      { rotulo: "Aceitamos seu usado na troca", icone: "Handshake" },
      { rotulo: "Financiamento facilitado", icone: "Banknote" },
      { rotulo: "IPVA pago", icone: "Receipt" },
    ],
    numeros: [
      { valor: "10 anos", rotulo: "de mercado" },
      { valor: "2.500+", rotulo: "carros vendidos" },
      { valor: "4,9★", rotulo: "avaliação no Google" },
      { valor: "48 h", rotulo: "para sair dirigindo" },
    ],
    depoimentos: [
      { nome: "Mariana S. (exemplo — substitua)", texto: "Fui atendida pelo WhatsApp, fiz o test drive no sábado e saí com o carro na segunda. Tudo muito transparente.", contexto: "Comprou um SUV em 2025" },
      { nome: "Carlos A. (exemplo — substitua)", texto: "Avaliaram meu carro na hora e pagaram um valor justo. A documentação ficou por conta deles.", contexto: "Trocou de carro com a loja" },
    ],
  };
}
