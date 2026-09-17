import { Armchair, Award, Baby, BadgeCheck, Banknote, BatteryCharging, Bluetooth, Calendar, Camera, CarFront, Check, Clock, Cog, CreditCard, Disc3, FileCheck, Fuel, Gauge, Gem, Handshake, KeyRound, Leaf, Lightbulb, Link, Lock, MapPin, Mountain, Music, Navigation, Percent, Radar, Receipt, Route, ShieldCheck, ShieldPlus, Smartphone, Snowflake, Sparkles, Star, Sun, ThumbsUp, Truck, Tv, UserCheck, Wind, Wrench, Zap, type LucideIcon } from "lucide-react";
import type { Destaque } from "./conteudo";

/** Ícones dos diferenciais (nomes do lucide-react), pensados para carro e revenda. */
export const OPCOES_ICONE: { valor: string; rotulo: string }[] = [
  { valor: "Check", rotulo: "Genérico" },
  { valor: "BadgeCheck", rotulo: "Garantia" },
  { valor: "FileCheck", rotulo: "Laudo cautelar" },
  { valor: "Wrench", rotulo: "Revisado" },
  { valor: "UserCheck", rotulo: "Único dono" },
  { valor: "Receipt", rotulo: "IPVA pago" },
  { valor: "Handshake", rotulo: "Aceita troca" },
  { valor: "Banknote", rotulo: "Financiamento" },
  { valor: "CreditCard", rotulo: "Cartão" },
  { valor: "Percent", rotulo: "Taxa / desconto" },
  { valor: "Snowflake", rotulo: "Ar-condicionado" },
  { valor: "Camera", rotulo: "Câmera de ré" },
  { valor: "Radar", rotulo: "Sensor de estacionamento" },
  { valor: "Tv", rotulo: "Central multimídia" },
  { valor: "Smartphone", rotulo: "CarPlay / Android Auto" },
  { valor: "Bluetooth", rotulo: "Bluetooth" },
  { valor: "Navigation", rotulo: "GPS" },
  { valor: "Music", rotulo: "Som" },
  { valor: "Armchair", rotulo: "Banco de couro" },
  { valor: "Gauge", rotulo: "Piloto automático / painel" },
  { valor: "Lightbulb", rotulo: "Faróis de LED" },
  { valor: "Sun", rotulo: "Teto solar" },
  { valor: "Disc3", rotulo: "Rodas de liga leve" },
  { valor: "ShieldCheck", rotulo: "Airbag / segurança" },
  { valor: "ShieldPlus", rotulo: "Freios ABS / estabilidade" },
  { valor: "Baby", rotulo: "Isofix" },
  { valor: "KeyRound", rotulo: "Chave presencial" },
  { valor: "Lock", rotulo: "Travas elétricas" },
  { valor: "Wind", rotulo: "Vidros elétricos" },
  { valor: "BatteryCharging", rotulo: "Carregador / elétrico" },
  { valor: "Link", rotulo: "Engate" },
  { valor: "Fuel", rotulo: "Combustível / economia" },
  { valor: "Zap", rotulo: "Motor potente" },
  { valor: "Leaf", rotulo: "Econômico / híbrido" },
  { valor: "Cog", rotulo: "Câmbio" },
  { valor: "Mountain", rotulo: "4x4 / off-road" },
  { valor: "Route", rotulo: "Viagem" },
  { valor: "Truck", rotulo: "Picape / carga" },
  { valor: "CarFront", rotulo: "Carro" },
  { valor: "Calendar", rotulo: "Ano / revisão em dia" },
  { valor: "Clock", rotulo: "Entrega rápida" },
  { valor: "MapPin", rotulo: "Localização" },
  { valor: "Award", rotulo: "Premiado" },
  { valor: "ThumbsUp", rotulo: "Recomendado" },
  { valor: "Sparkles", rotulo: "Impecável" },
  { valor: "Star", rotulo: "Destaque" },
  { valor: "Gem", rotulo: "Exclusivo" },
];

const ICONE_DO_OPCIONAL: Record<string, string> = {
  "Ar-condicionado": "Snowflake",
  "Direção elétrica": "Gauge",
  "Vidros elétricos": "Wind",
  "Travas elétricas": "Lock",
  "Banco de couro": "Armchair",
  "Piloto automático": "Gauge",
  "Central multimídia": "Tv",
  "Apple CarPlay / Android Auto": "Smartphone",
  "Câmera de ré": "Camera",
  "Sensor de estacionamento": "Radar",
  "Faróis de LED": "Lightbulb",
  "Teto solar": "Sun",
  "Rodas de liga leve": "Disc3",
  Airbag: "ShieldCheck",
  "Freios ABS": "ShieldPlus",
  "Controle de estabilidade": "ShieldPlus",
  Isofix: "Baby",
  "Chave presencial": "KeyRound",
  "Carregador por indução": "BatteryCharging",
  Engate: "Link",
};

/** Diferenciais automáticos: os opcionais cadastrados no carro. */
export const destaquesDosOpcionais = (opcionais: string[]): Destaque[] =>
  opcionais.map((o) => ({ rotulo: o.slice(0, 40), icone: ICONE_DO_OPCIONAL[o] ?? "Check" }));

export const iconeValido = (nome: string) => OPCOES_ICONE.some((o) => o.valor === nome);

/** Só os ícones oferecidos: importar o lucide inteiro pesaria ~700 KB na página. */
const COMPONENTES: Record<string, LucideIcon> = { Armchair, Award, Baby, BadgeCheck, Banknote, BatteryCharging, Bluetooth, Calendar, Camera, CarFront, Check, Clock, Cog, CreditCard, Disc3, FileCheck, Fuel, Gauge, Gem, Handshake, KeyRound, Leaf, Lightbulb, Link, Lock, MapPin, Mountain, Music, Navigation, Percent, Radar, Receipt, Route, ShieldCheck, ShieldPlus, Smartphone, Snowflake, Sparkles, Star, Sun, ThumbsUp, Truck, Tv, UserCheck, Wind, Wrench, Zap };
export const componenteIcone = (nome: string): LucideIcon => COMPONENTES[nome] ?? Check;
