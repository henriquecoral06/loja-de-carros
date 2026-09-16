import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { data, useFetcher } from "react-router";
import { db, schema } from "~/.server/db";
import { validarMensagem, type ErrosMensagem } from "~/.server/mensagens";
import { dentroDoLimite, exigirMesmaOrigem, ipDe } from "~/.server/seguranca";
import { CamposMensagem } from "~/components/CamposMensagem";
import { IconeWhatsApp } from "~/components/WhatsApp";
import { cep, linkWhatsApp, telefone } from "~/lib/formato";
import { lojaDasRotas } from "~/lib/site";
import { useLoja } from "~/lib/useLoja";
import type { Route } from "./+types/contato";

export function meta({ matches }: Route.MetaArgs) {
  const loja = lojaDasRotas(matches);
  return [
    { title: `Contato — ${loja.nome}` },
    { name: "description", content: `${loja.nome}: endereço, horário, telefone e WhatsApp${loja.cidade ? ` em ${loja.cidade}` : ""}.` },
  ];
}

export async function action({ request }: Route.ActionArgs) {
  exigirMesmaOrigem(request);
  const form = await request.formData();
  if (form.get("empresa")) return { enviada: true };

  const resultado = validarMensagem(form);
  if ("erros" in resultado) return data({ erros: resultado.erros }, { status: 400 });

  if (!(await dentroDoLimite(`mensagem:${ipDe(request)}`, 8, 3_600_000))) {
    return data({ erro: "Você enviou muitas mensagens em pouco tempo. Tente de novo mais tarde." }, { status: 429 });
  }
  await db.insert(schema.mensagens).values({ id: crypto.randomUUID(), anuncioId: null, ...resultado.mensagem });
  return { enviada: true };
}

type Resposta = { enviada?: boolean; erro?: string; erros?: ErrosMensagem };

export default function Contato() {
  const loja = useLoja();
  const envio = useFetcher<Resposta>();
  const endereco = [loja.endereco, loja.bairro, [loja.cidade, loja.uf].filter(Boolean).join(" - "), loja.cep && `CEP ${cep(loja.cep)}`]
    .filter(Boolean).join(", ");
  const mapa = endereco ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${loja.nome}, ${endereco}`)}` : null;

  return (
    <div className="conteiner py-10">
      <h1 className="text-3xl font-extrabold tracking-tight text-tinta">Fale com a gente</h1>
      <p className="mt-2 text-suave">Tire dúvidas, agende uma visita ou peça a avaliação do seu carro.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="grid content-start gap-4">
          <div className="cartao p-6">
            <h2 className="font-bold text-tinta">Atendimento</h2>
            <ul className="mt-4 space-y-4 text-sm text-texto">
              {endereco && (
                <li className="flex gap-3">
                  <MapPin className="mt-0.5 size-5 shrink-0 text-marca-600" aria-hidden="true" />
                  <div>
                    <p>{endereco}</p>
                    {mapa && <a href={mapa} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block py-1 font-semibold text-marca-700 hover:underline">Abrir no mapa</a>}
                  </div>
                </li>
              )}
              {loja.horario && <li className="flex gap-3"><Clock className="mt-0.5 size-5 shrink-0 text-marca-600" aria-hidden="true" />{loja.horario}</li>}
              {loja.telefone && <li className="flex gap-3"><Phone className="mt-0.5 size-5 shrink-0 text-marca-600" aria-hidden="true" /><a href={`tel:+55${loja.telefone}`} className="numeros hover:underline">{telefone(loja.telefone)}</a></li>}
              {loja.email && <li className="flex gap-3"><Mail className="mt-0.5 size-5 shrink-0 text-marca-600" aria-hidden="true" /><a href={`mailto:${loja.email}`} className="break-all hover:underline">{loja.email}</a></li>}
            </ul>
            {loja.whatsapp && (
              <a href={linkWhatsApp(loja.whatsapp, `Olá! Vim pelo site ${loja.nome}.`)} target="_blank" rel="noopener noreferrer" className="botao-primario mt-6 w-full">
                <IconeWhatsApp className="size-[18px]" /> Chamar no WhatsApp
              </a>
            )}
          </div>
        </aside>

        <section aria-labelledby="titulo-form" className="cartao p-6 sm:p-8">
          <h2 id="titulo-form" className="text-xl font-bold text-tinta">Envie uma mensagem</h2>
          {envio.data?.enviada ? (
            <div role="status" className="mt-4 rounded-xl bg-sucesso-fundo p-5 text-sucesso">
              <p className="font-semibold">Mensagem enviada.</p>
              <p className="mt-1 text-sm">Respondemos pelo telefone ou e-mail que você informou.</p>
            </div>
          ) : (
            <envio.Form method="post" noValidate className="mt-4 max-w-xl">
              <CamposMensagem erros={envio.data?.erros} prefixo="contato" />
              {envio.data?.erro && <p role="alert" className="mt-3 text-sm text-erro">{envio.data.erro}</p>}
              <button type="submit" disabled={envio.state !== "idle"} className="botao-primario mt-4">
                {envio.state !== "idle" ? "Enviando…" : "Enviar mensagem"}
              </button>
            </envio.Form>
          )}
        </section>
      </div>
    </div>
  );
}
