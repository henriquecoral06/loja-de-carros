import { useState } from "react";
import { Clock, WhatsappLogo } from "@phosphor-icons/react";
import { useLeads, useAtualizarLead, useInteracoes, useRegistrarInteracao } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { linkWhatsApp } from "@/lib/utils";
import { Badge, Button, Select, Textarea } from "@/components/ui";

const COLUNAS = [
  { valor: "novo", rotulo: "Novo" },
  { valor: "em_atendimento", rotulo: "Em atendimento" },
  { valor: "proposta", rotulo: "Proposta" },
  { valor: "negociacao", rotulo: "Negociação" },
  { valor: "vendido", rotulo: "Vendido" },
  { valor: "perdido", rotulo: "Perdido" },
];

const MOTIVOS = [
  { valor: "preco", rotulo: "Preço" },
  { valor: "comprou_outro_lugar", rotulo: "Comprou em outro lugar" },
  { valor: "credito_negado", rotulo: "Crédito negado" },
  { valor: "sem_retorno", rotulo: "Sumiu / sem retorno" },
  { valor: "outro", rotulo: "Outro" },
];

const desde = (iso: string) => {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 60) return `${min} min`;
  if (min < 1440) return `${Math.round(min / 60)} h`;
  return `${Math.round(min / 1440)} d`;
};

function Detalhe({ lead, aoFechar }: { lead: any; aoFechar: () => void }) {
  const { data: interacoes } = useInteracoes(lead.id);
  const registrar = useRegistrarInteracao();
  const atualizar = useAtualizarLead();
  const [texto, setTexto] = useState("");
  const [enviandoZap, setEnviandoZap] = useState(false);
  const [avisoZap, setAvisoZap] = useState("");

  /**
   * Tenta a Evolution API. Se ela estiver fora — e ela cai, porque é não
   * oficial — a nota entra no histórico assim mesmo e o vendedor recebe
   * o link wa.me para responder na mão.
   */
  async function enviarPeloWhatsApp() {
    if (!texto.trim()) return;
    setEnviandoZap(true);
    setAvisoZap("");
    const { data, error } = await supabase.functions.invoke("notificar-whatsapp", {
      body: { lead_id: lead.id, texto },
    });
    setEnviandoZap(false);
    if (error || !(data as any)?.ok) {
      setAvisoZap("A Evolution não respondeu. A mensagem ficou registrada — responda pelo link do WhatsApp.");
      await registrar.mutateAsync({ leadId: lead.id, texto, canal: "whatsapp_falhou" });
    }
    setTexto("");
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/40 backdrop-blur-[1px]" onClick={aoFechar}>
      <div className="h-full w-full max-w-md overflow-y-auto border-l border-hairline bg-canvas p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-heading-md text-ink">{lead.nome}</h2>
            <p className="text-body-sm text-mute">{lead.whatsapp}{lead.email && ` · ${lead.email}`}</p>
          </div>
          <button onClick={aoFechar} aria-label="Fechar" className="ds-focus rounded-ds-sm p-1 text-2xl leading-none text-mute hover:bg-ink/[0.05] hover:text-ink">×</button>
        </div>

        <a href={linkWhatsApp(lead.whatsapp, `Olá ${lead.nome}! Sou da revenda.`)}
          target="_blank" rel="noreferrer"
          className="shiny-brand ds-focus mt-4 flex h-11 items-center justify-center gap-2 text-label-lg">
          <span className="shiny-dots" aria-hidden="true" />
          <span className="shiny-cta-content"><WhatsappLogo size={17} weight="fill" /> Abrir conversa</span>
        </a>

        <div className="mt-5 space-y-3">
          <div>
            <label htmlFor="status" className="text-label-md tracking-label text-body">Etapa</label>
            <Select id="status" value={lead.status} className="mt-1"
              onChange={(e) => atualizar.mutate({ id: lead.id, dados: { status: e.target.value } })}>
              {COLUNAS.map((c) => <option key={c.valor} value={c.valor}>{c.rotulo}</option>)}
            </Select>
          </div>

          {lead.status === "perdido" && (
            <div>
              <label htmlFor="motivo" className="text-label-md tracking-label text-body">Motivo da perda</label>
              <Select id="motivo" value={lead.motivo_perda ?? ""} className="mt-1"
                onChange={(e) => atualizar.mutate({ id: lead.id, dados: { motivo_perda: e.target.value } })}>
                <option value="">Selecione</option>
                {MOTIVOS.map((m) => <option key={m.valor} value={m.valor}>{m.rotulo}</option>)}
              </Select>
              <p className="mt-1 text-caption text-faint">
                É esse campo que revela se o problema é preço ou atendimento.
              </p>
            </div>
          )}
        </div>

        {lead.mensagem && (
          <div className="mt-5 rounded-ds-md border border-hairline bg-ink/[0.03] p-3 text-body-sm">
            <p className="text-eyebrow text-mute">Mensagem original</p>
            <p className="mt-1">{lead.mensagem}</p>
          </div>
        )}

        <div className="mt-6">
          <label htmlFor="nota" className="text-label-md tracking-label text-body">Registrar contato</label>
          <textarea id="nota" rows={3} value={texto} onChange={(e) => setTexto(e.target.value)}
            placeholder="O que foi combinado?" className="mt-1" />
          <div className="mt-2 flex gap-2">
            <Button variant="secondary" className="flex-1" disabled={!texto.trim()}
              onClick={() => { registrar.mutate({ leadId: lead.id, texto }); setTexto(""); }}>
              Salvar nota
            </Button>
            <Button className="flex-1" disabled={!texto.trim() || enviandoZap} onClick={enviarPeloWhatsApp}>
              {enviandoZap ? "Enviando…" : "Enviar no WhatsApp"}
            </Button>
          </div>
          {avisoZap && <p className="mt-2 text-caption text-danger-deep">{avisoZap}</p>}
        </div>

        <div className="mt-6">
          <h3 className="text-label-lg text-ink">Histórico</h3>
          <ul className="mt-2 space-y-2">
            {(interacoes ?? []).length === 0 && (
              <li className="text-body-sm text-faint">Nenhum contato registrado ainda.</li>
            )}
            {(interacoes ?? []).map((i: any) => (
              <li key={i.id} className="rounded-ds-md border border-hairline bg-surface p-3 text-body-sm">
                <p className="flex items-center gap-1.5 text-caption text-faint">
                  <Clock size={12} />
                  {new Date(i.created_at).toLocaleString("pt-BR")} · {i.canal.replace("_", " ")}
                </p>
                <p className="mt-1">{i.texto}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function Leads() {
  const { data: leads, isLoading } = useLeads();
  const atualizar = useAtualizarLead();
  const [aberto, setAberto] = useState<any>(null);

  if (isLoading) return <div className="p-6 text-body-sm text-mute">Carregando…</div>;

  const atual = aberto ? (leads ?? []).find((l: any) => l.id === aberto.id) ?? aberto : null;

  return (
    <div className="p-5 md:p-6">
      <h1 className="text-heading-xl text-ink">Leads</h1>
      <p className="mt-1 text-body-sm text-mute">
        {leads?.length ?? 0} no total · abra um lead para mudar a etapa
      </p>

      {!leads?.length ? (
        <div className="mt-8 rounded-ds-lg border border-dashed border-hairline-strong p-12 text-center">
          <p className="text-heading-sm text-ink">Nenhum lead ainda.</p>
          <p className="mt-1 text-body-sm text-mute">
            Envie o formulário de um veículo no site para ver um aparecer aqui.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-3 overflow-x-auto lg:grid-cols-6">
          {COLUNAS.map((coluna) => {
            const daColuna = (leads ?? []).filter((l: any) => l.status === coluna.valor);
            return (
              <div key={coluna.valor} className="min-w-[220px] rounded-ds-lg border border-hairline bg-ink/[0.02] p-2">
                <p className="px-1.5 pb-2 text-eyebrow text-mute">
                  {coluna.rotulo} · {daColuna.length}
                </p>
                <ul className="space-y-2">
                  {daColuna.map((l: any) => (
                    <li key={l.id}>
                      <button onClick={() => setAberto(l)}
                        className="card-glow ds-focus w-full rounded-ds-md border border-hairline bg-surface p-3 text-left transition-colors hover:border-hairline-strong">
                        <p className="text-body-sm font-medium text-ink">{l.nome}</p>
                        <p className="text-caption text-faint">{l.whatsapp}</p>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <span className="text-caption text-faint">há {desde(l.created_at)}</span>
                          {l.status === "novo" && !l.primeira_resposta_em && (
                            <Badge tone="danger">sem resposta</Badge>
                          )}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {atual && <Detalhe lead={atual} aoFechar={() => setAberto(null)} />}
    </div>
  );
}
