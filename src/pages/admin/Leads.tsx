import { useState } from "react";
import { MessageCircle, Clock } from "lucide-react";
import { useLeads, useAtualizarLead, useInteracoes, useRegistrarInteracao } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { linkWhatsApp } from "@/lib/utils";

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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={aoFechar}>
      <div className="h-full w-full max-w-md overflow-y-auto bg-background p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold">{lead.nome}</h2>
            <p className="text-sm text-muted-foreground">{lead.whatsapp}{lead.email && ` · ${lead.email}`}</p>
          </div>
          <button onClick={aoFechar} aria-label="Fechar" className="rounded p-1 text-2xl leading-none hover:bg-muted">×</button>
        </div>

        <a href={linkWhatsApp(lead.whatsapp, `Olá ${lead.nome}! Sou da revenda.`)}
          target="_blank" rel="noreferrer"
          className="mt-4 flex items-center justify-center gap-2 rounded-md bg-[hsl(var(--whatsapp))] px-4 py-2.5 font-semibold text-white">
          <MessageCircle className="h-4 w-4" /> Abrir conversa
        </a>

        <div className="mt-5 space-y-3">
          <div>
            <label htmlFor="status" className="text-sm font-medium">Etapa</label>
            <select id="status" value={lead.status} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              onChange={(e) => atualizar.mutate({ id: lead.id, dados: { status: e.target.value } })}>
              {COLUNAS.map((c) => <option key={c.valor} value={c.valor}>{c.rotulo}</option>)}
            </select>
          </div>

          {lead.status === "perdido" && (
            <div>
              <label htmlFor="motivo" className="text-sm font-medium">Motivo da perda</label>
              <select id="motivo" value={lead.motivo_perda ?? ""} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                onChange={(e) => atualizar.mutate({ id: lead.id, dados: { motivo_perda: e.target.value } })}>
                <option value="">Selecione</option>
                {MOTIVOS.map((m) => <option key={m.valor} value={m.valor}>{m.rotulo}</option>)}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                É esse campo que revela se o problema é preço ou atendimento.
              </p>
            </div>
          )}
        </div>

        {lead.mensagem && (
          <div className="mt-5 rounded-md bg-muted p-3 text-sm">
            <p className="text-xs font-semibold text-muted-foreground">Mensagem original</p>
            <p className="mt-1">{lead.mensagem}</p>
          </div>
        )}

        <div className="mt-6">
          <label htmlFor="nota" className="text-sm font-medium">Registrar contato</label>
          <textarea id="nota" rows={3} value={texto} onChange={(e) => setTexto(e.target.value)}
            placeholder="O que foi combinado?" className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
          <div className="mt-2 flex gap-2">
            <button disabled={!texto.trim()} onClick={() => { registrar.mutate({ leadId: lead.id, texto }); setTexto(""); }}
              className="flex-1 rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-50">
              Salvar nota
            </button>
            <button disabled={!texto.trim() || enviandoZap} onClick={enviarPeloWhatsApp}
              className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              {enviandoZap ? "Enviando…" : "Enviar no WhatsApp"}
            </button>
          </div>
          {avisoZap && <p className="mt-2 text-xs text-destructive">{avisoZap}</p>}
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-semibold">Histórico</h3>
          <ul className="mt-2 space-y-2">
            {(interacoes ?? []).length === 0 && (
              <li className="text-sm text-muted-foreground">Nenhum contato registrado ainda.</li>
            )}
            {(interacoes ?? []).map((i: any) => (
              <li key={i.id} className="rounded-md border p-3 text-sm">
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
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

  if (isLoading) return <div className="p-6 text-muted-foreground">Carregando…</div>;

  const atual = aberto ? (leads ?? []).find((l: any) => l.id === aberto.id) ?? aberto : null;

  return (
    <div className="p-6">
      <h1 className="font-display text-2xl font-bold">Leads</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {leads?.length ?? 0} no total · arraste pelo seletor de etapa dentro do lead
      </p>

      {!leads?.length ? (
        <div className="mt-8 rounded-lg border border-dashed p-12 text-center">
          <p className="font-display font-semibold">Nenhum lead ainda.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Envie o formulário de um veículo no site para ver um aparecer aqui.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-3 overflow-x-auto lg:grid-cols-6">
          {COLUNAS.map((coluna) => {
            const daColuna = (leads ?? []).filter((l: any) => l.status === coluna.valor);
            return (
              <div key={coluna.valor} className="min-w-[220px] rounded-lg bg-muted/50 p-2">
                <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {coluna.rotulo} · {daColuna.length}
                </p>
                <ul className="space-y-2">
                  {daColuna.map((l: any) => (
                    <li key={l.id}>
                      <button onClick={() => setAberto(l)}
                        className="w-full rounded-md border bg-card p-3 text-left text-sm hover:shadow-sm">
                        <p className="font-medium">{l.nome}</p>
                        <p className="text-xs text-muted-foreground">{l.whatsapp}</p>
                        <p className={`mt-1 text-xs ${
                          l.status === "novo" && !l.primeira_resposta_em ? "font-semibold text-destructive" : "text-muted-foreground"}`}>
                          há {desde(l.created_at)}
                          {l.status === "novo" && !l.primeira_resposta_em && " · sem resposta"}
                        </p>
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
