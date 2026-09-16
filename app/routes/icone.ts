import { obterLoja } from "~/.server/loja";
import { paleta } from "~/lib/cores";

/** Ícone da aba na cor da loja. */
export async function loader() {
  const loja = await obterLoja();
  const cor = paleta(loja.corPrimaria, loja.corEscura);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="${cor["marca-600"]}"/><g fill="none" stroke="${cor["sobre-marca"]}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 21h18l-2.1-7a2.6 2.6 0 0 0-2.5-1.9h-8.8A2.6 2.6 0 0 0 9.1 14L7 21Z"/></g><circle cx="11" cy="21.5" r="2.3" fill="${cor["sobre-marca"]}"/><circle cx="21" cy="21.5" r="2.3" fill="${cor["sobre-marca"]}"/></svg>`;
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600" } });
}
