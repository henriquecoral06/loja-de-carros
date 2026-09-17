import { BadgeDollarSign, Clock3, FileCheck2, Handshake } from "lucide-react";
import { useEffect } from "react";
import { data, useFetcher } from "react-router";
import { criarLead, validarLead, type ErrosLead } from "~/.server/leads";
import { dentroDoLimite, exigirMesmaOrigem, ipDe } from "~/.server/seguranca";
import { CamposMensagem } from "~/components/CamposMensagem";
import { IconeWhatsApp, LinkWhatsApp } from "~/components/WhatsApp";
import { apenasDigitos, inteiro } from "~/lib/formato";
import { rastrear } from "~/lib/rastreamento";
import { lojaDasRotas } from "~/lib/site";
import { useLoja } from "~/lib/useLoja";
import { anoMaximo } from "~/lib/veiculos";
import type { Route } from "./+types/venda-seu-carro";

export function meta({ matches }: Route.MetaArgs) {
  const loja = lojaDasRotas(matches);
  return [
    { title: `Venda seu carro — ${loja.nome}` },
    { name: "description", content: `Avaliação do seu carro para venda ou troca na ${loja.nome}${loja.cidade ? `, em ${loja.cidade}` : ""}.` },
  ];
}

type Erros = ErrosLead & Partial<Record<"veiculo" | "ano" | "km", string>>;

export async function action({ request }: Route.ActionArgs) {
  exigirMesmaOrigem(request);
  const form = await request.formData();
  if (form.get("empresa")) return { enviada: true };

  const resultado = validarLead(form, { textoObrigatorio: false });
  const veiculo = String(form.get("veiculo") ?? "").trim();
  const ano = Number(form.get("ano"));
  const kmRodado = Number(apenasDigitos(String(form.get("km") ?? "")) || NaN);
  const erros: Erros = "erros" in resultado ? { ...resultado.erros } : {};
  if (veiculo.length < 3 || veiculo.length > 80) erros.veiculo = "Informe marca e modelo (ex.: Honda Civic EXL).";
  if (!(ano >= 1970 && ano <= anoMaximo())) erros.ano = "Escolha o ano.";
  if (!(kmRodado >= 0 && kmRodado <= 2_000_000)) erros.km = "Informe a quilometragem.";
  if (Object.keys(erros).length || "erros" in resultado) return data({ erros }, { status: 400 });

  if (!(await dentroDoLimite(`mensagem:${ipDe(request)}`, 8, 3_600_000))) {
    return data({ erro: "Você enviou muitas mensagens em pouco tempo. Tente de novo mais tarde." }, { status: 429 });
  }

  const resumo = `${veiculo} ${ano} · ${inteiro(kmRodado)} km`;
  await criarLead({
    request, origem: "venda_seu_carro", rastreio: resultado.rastreio, eventId: resultado.eventId,
    dados: { ...resultado.dados, texto: `[Venda seu carro] ${resumo}${resultado.dados.texto ? `\n${resultado.dados.texto}` : ""}` },
  });
  return { enviada: true, eventId: resultado.eventId };
}

type Resposta = { enviada?: boolean; eventId?: string; erro?: string; erros?: Erros };

const PASSOS = [
  { icone: FileCheck2, titulo: "Conte sobre o carro", texto: "Modelo, ano e quilometragem já bastam para começar." },
  { icone: Clock3, titulo: "Avaliação rápida", texto: "A equipe retorna com uma proposta ou agenda a vistoria." },
  { icone: BadgeDollarSign, titulo: "Venda ou troca", texto: "Receba à vista ou use o valor como entrada em outro carro." },
];

export default function VendaSeuCarro() {
  const loja = useLoja();
  const envio = useFetcher<Resposta>();
  const enviada = Boolean(envio.data?.enviada);
  const erros = envio.data?.erros ?? {};
  useEffect(() => { if (enviada) rastrear("formulario", { origem: "venda_seu_carro", eventId: envio.data?.eventId }); }, [enviada]); // eslint-disable-line react-hooks/exhaustive-deps
  const paragrafos = (loja.textoVendaCarro || "Compramos seu carro com avaliação justa e pagamento rápido. Se preferir, use o valor como entrada em um carro do nosso estoque.")
    .split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const anos = Array.from({ length: anoMaximo() - 1969 }, (_, i) => anoMaximo() - i);

  return (
    <>
      <section className="relative isolate overflow-hidden bg-noite">
        <img src={loja.banner} alt="" className="absolute inset-0 -z-10 size-full object-cover" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-noite via-noite/90 to-noite/50" />
        <div className="conteiner py-14 sm:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-white/70">Venda seu carro</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">Quanto vale o seu carro?</h1>
          <div className="mt-4 max-w-xl space-y-3 text-lg text-white/80">
            {paragrafos.map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </div>
      </section>

      <div className="conteiner grid items-start gap-6 py-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section aria-labelledby="titulo-form" className="cartao p-6 sm:p-8">
          <h2 id="titulo-form" className="text-xl font-bold text-tinta">Peça sua avaliação</h2>
          <p className="mt-1 text-sm text-suave">Sem compromisso. Respondemos em horário comercial.</p>
          {enviada ? (
            <div role="status" className="mt-5 rounded-xl bg-sucesso-fundo p-5 text-sucesso">
              <p className="font-semibold">Recebemos os dados do seu carro.</p>
              <p className="mt-1 text-sm">A equipe vai falar com você pelo telefone informado.</p>
            </div>
          ) : (
            <envio.Form method="post" noValidate className="mt-5">
              <CamposMensagem erros={erros} prefixo="venda" largo rotuloTexto="Observações (opcional)">
                <div className="sm:col-span-2">
                  <label htmlFor="venda-veiculo" className="rotulo">Marca e modelo</label>
                  <input id="venda-veiculo" name="veiculo" placeholder="Ex.: Honda Civic EXL 2.0" className="campo"
                    aria-invalid={erros.veiculo ? true : undefined} aria-describedby={erros.veiculo ? "venda-erro-veiculo" : undefined} />
                  {erros.veiculo && <p id="venda-erro-veiculo" className="mt-1 text-sm text-erro">{erros.veiculo}</p>}
                </div>
                <div>
                  <label htmlFor="venda-ano" className="rotulo">Ano do modelo</label>
                  <select id="venda-ano" name="ano" defaultValue="" className="campo" aria-invalid={erros.ano ? true : undefined}>
                    <option value="" disabled>Selecione</option>
                    {anos.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                  {erros.ano && <p className="mt-1 text-sm text-erro">{erros.ano}</p>}
                </div>
                <div>
                  <label htmlFor="venda-km" className="rotulo">Quilometragem</label>
                  <input id="venda-km" name="km" inputMode="numeric" placeholder="Ex.: 45000" className="campo" aria-invalid={erros.km ? true : undefined} />
                  {erros.km && <p className="mt-1 text-sm text-erro">{erros.km}</p>}
                </div>
              </CamposMensagem>
              {envio.data?.erro && <p role="alert" className="mt-3 text-sm text-erro">{envio.data.erro}</p>}
              <button type="submit" disabled={envio.state !== "idle"} className="botao-primario mt-5 w-full sm:w-auto sm:min-w-56">
                {envio.state !== "idle" ? "Enviando…" : "Quero minha avaliação"}
              </button>
            </envio.Form>
          )}
        </section>

        <aside className="grid gap-4">
          <div className="cartao p-6">
            <h2 className="font-bold text-tinta">Como funciona</h2>
            <ol className="mt-4 grid gap-5">
              {PASSOS.map(({ icone: Icone, titulo, texto }) => (
                <li key={titulo} className="flex gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-marca-50 text-marca-700"><Icone className="size-5" aria-hidden="true" /></span>
                  <div>
                    <h3 className="font-semibold text-tinta">{titulo}</h3>
                    <p className="mt-0.5 text-sm text-suave">{texto}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="cartao flex flex-col gap-3 p-6">
            <p className="flex items-center gap-2 font-semibold text-tinta"><Handshake className="size-5 text-marca-700" aria-hidden="true" /> Prefere conversar?</p>
            <LinkWhatsApp mensagem="Olá! Quero vender meu carro. Podem avaliar?" className="botao-primario w-full">
              <IconeWhatsApp className="size-[18px]" /> Avaliação pelo WhatsApp
            </LinkWhatsApp>
          </div>
        </aside>
      </div>
    </>
  );
}
