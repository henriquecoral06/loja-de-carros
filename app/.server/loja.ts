import { eq } from "drizzle-orm";
import { db, schema } from "./db";

/**
 * Dados da loja (linha única). Se o banco ainda não foi populado, devolve
 * um padrão para o site não quebrar — o painel mostra o aviso para
 * preencher.
 */
export async function obterLoja() {
  const [loja] = await db.select().from(schema.loja).where(eq(schema.loja.id, 1)).limit(1);
  return loja ?? {
    id: 1, nome: "Sua Loja de Carros", slogan: "", sobre: "", whatsapp: "", telefone: "", email: "",
    endereco: "", bairro: "", cidade: "", uf: "", cep: "", horario: "", cnpj: "", instagram: "", facebook: "",
    atualizadoEm: 0,
  };
}

export type DadosLoja = Awaited<ReturnType<typeof obterLoja>>;
