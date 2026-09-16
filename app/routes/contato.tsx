import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { useEffect } from "react";
import { data, useFetcher } from "react-router";
import { db, schema } from "~/.server/db";
import { obterLoja } from "~/.server/loja";
import { validarMensagem, type ErrosMensagem } from "~/.server/mensagens";
import { enviarLeadAoCrm } from "~/.server/webhook";
import { dentroDoLimite, exigirMesmaOrigem, ipDe } from "~/.server/seguranca";
import { CamposMensagem } from "~/components/CamposMensagem";
import { IconeWhatsApp, LinkWhatsApp } from "~/components/WhatsApp";
import { cep, telefone } from "~/lib/formato";
import { rastrear } from "~/lib/rastreamento";
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
  const id = crypto.randomUUID();
  await db.insert(schema.mensagens).values({ id, anuncioId: null, ...resultado.mensagem });
  await enviarLeadAoCrm({
    id, criado_em: new Date().toISOString(), origem: "contato", veiculo: null, rastreio: resultado.rastreio,
    lead: { nome: resultado.mensagem.nome, email: resultado.mensagem.email, telefone: resultado.mensagem.telefone, mensagem: resultado.mensagem.texto },
  }, (await obterLoja()).nome);
  return { enviada: true };
}

type Resposta = { enviada?: boolean; erro?: string; erros?: ErrosMensagem };

export default function Contato() {
  const loja = useLoja();
  const envio = useFetcher<Resposta>();
  const enviada = Boolean(envio.data?.enviada);
  useEffect(() => { if (enviada) rastrear("lead", { origem: "contato" }); }, [enviada]);

  const linha1 = [loja.endereco, loja.bairro].filter(Boolean).join(", ");
  const linha2 = [[loja.cidade, loja.uf].filter(Boolean).join(" - "), loja.cep && `CEP ${cep(loja.cep)}`].filter(Boolean).join(" · ");
  const mapa = linha1 || linha2
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([loja.nome, linha1, linha2].filter(Boolean).join(", "))}`
    : null;
  const icone = "mt-0.5 size-5 shrink-0 text-marca-700";

  return (
    <div className="conteiner py-10 sm:py-12">
      <h1 className="text-3xl font-extrabold tracking-tight text-tinta sm:text-4xl">Fale com a gente</h1>
      <p className="mt-2 max-w-xl text-lg text-suave">Tire dúvidas, agende uma visita ou peça a avaliação do seu carro.</p>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section aria-labelledby="titulo-form" className="cartao p-6 sm:p-8">
          <h2 id="titulo-form" className="text-xl font-bold text-tinta">Envie uma mensagem</h2>
          <p className="mt-1 text-sm text-suave">Respondemos em horário comercial.</p>
          {enviada ? (
            <div role="status" className="mt-5 rounded-xl bg-sucesso-fundo p-5 text-sucesso">
              <p className="font-semibold">Mensagem enviada.</p>
              <p className="mt-1 text-sm">Vamos responder pelo telefone ou e-mail que você informou.</p>
            </div>
          ) : (
            <envio.Form method="post" noValidate className="mt-5">
              <CamposMensagem erros={envio.data?.erros} prefixo="contato" largo />
              {envio.data?.erro && <p role="alert" className="mt-3 text-sm text-erro">{envio.data.erro}</p>}
              <button type="submit" disabled={envio.state !== "idle"} className="botao-primario mt-5 w-full sm:w-auto sm:min-w-48">
                {envio.state !== "idle" ? "Enviando…" : "Enviar mensagem"}
              </button>
            </envio.Form>
          )}
        </section>

        <aside aria-labelledby="titulo-atendimento" className="cartao p-6 sm:p-8">
          <h2 id="titulo-atendimento" className="text-xl font-bold text-tinta">Atendimento</h2>
          <ul className="mt-5 space-y-5 text-[15px] text-texto">
            {(linha1 || linha2) && (
              <li className="flex gap-3">
                <MapPin className={icone} aria-hidden="true" />
                <div>
                  {linha1 && <p>{linha1}</p>}
                  {linha2 && <p>{linha2}</p>}
                  {mapa && <a href={mapa} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block py-1 text-sm font-semibold text-marca-700 hover:underline">Abrir no mapa</a>}
                </div>
              </li>
            )}
            {loja.horario && <li className="flex gap-3"><Clock className={icone} aria-hidden="true" /><p>{loja.horario}</p></li>}
            {loja.telefone && (
              <li className="flex gap-3">
                <Phone className={icone} aria-hidden="true" />
                <a href={`tel:+55${loja.telefone}`} onClick={() => rastrear("telefone")} className="numeros hover:underline">{telefone(loja.telefone)}</a>
              </li>
            )}
            {loja.email && <li className="flex gap-3"><Mail className={icone} aria-hidden="true" /><a href={`mailto:${loja.email}`} className="min-w-0 break-all hover:underline">{loja.email}</a></li>}
          </ul>
          <LinkWhatsApp className="botao-primario mt-7 w-full">
            <IconeWhatsApp className="size-[18px]" /> Chamar no WhatsApp
          </LinkWhatsApp>
        </aside>
      </div>
    </div>
  );
}
