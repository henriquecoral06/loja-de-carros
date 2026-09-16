import { redirect } from "react-router";
import { encerrarSessao } from "~/.server/sessao";
import { exigirMesmaOrigem } from "~/.server/seguranca";
import type { Route } from "./+types/sair";

// Sair só por POST: um link GET para /sair deslogaria qualquer um que
// abrisse uma imagem ou página maliciosa apontando para cá.
export const loader = () => redirect("/");

export async function action({ request }: Route.ActionArgs) {
  exigirMesmaOrigem(request);
  return encerrarSessao(request);
}
