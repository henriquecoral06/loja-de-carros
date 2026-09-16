import { redirect } from "react-router";
import { encerrarSessao } from "~/.server/sessao";
import { exigirMesmaOrigem } from "~/.server/seguranca";
import type { Route } from "./+types/sair";

// Sair só por POST: um link GET para cá deslogaria qualquer um que
// abrisse uma imagem ou página maliciosa apontando para este endereço.
export const loader = () => redirect("/admin");

export async function action({ request }: Route.ActionArgs) {
  exigirMesmaOrigem(request);
  return encerrarSessao(request);
}
