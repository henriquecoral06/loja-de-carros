// =====================================================================
// registrar-lead — entrada única dos formulários do site.
//
// O visitante não escreve direto na tabela: não há policy de insert para
// anon em leads. Tudo passa por aqui, que valida, aplica anti-spam,
// deduplica por telefone e dispara a notificação.
// =====================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { enviarWhatsApp, cors, json } from "../_shared/evolution.ts";

const moeda = (valor: number | null) =>
  valor == null ? "sob consulta" : valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ erro: "metodo_invalido" }, 405);

  const corpo = await req.json();
  const {
    nome, whatsapp, email, veiculo_id, mensagem, tipo = "formulario",
    utm_source, utm_medium, utm_campaign, pagina_origem,
    consentimento, sobrenome, // sobrenome = honeypot, invisível no formulário
  } = corpo ?? {};

  // Bot preencheu o campo escondido: responde 200 para não ensinar nada.
  if (sobrenome) return json({ ok: true });

  if (!nome || String(nome).trim().length < 2) return json({ erro: "nome_invalido" }, 400);

  const telefone = String(whatsapp ?? "").replace(/\D/g, "");
  if (telefone.length < 10 || telefone.length > 13) return json({ erro: "whatsapp_invalido" }, 400);
  if (!consentimento) return json({ erro: "consentimento_obrigatorio" }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  // Rate limit simples: no máximo 3 envios do mesmo IP em 10 minutos.
  if (ip) {
    const desde = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("leads").select("id", { count: "exact", head: true })
      .eq("ip", ip).gte("created_at", desde);
    if ((count ?? 0) >= 3) return json({ erro: "muitas_tentativas" }, 429);
  }

  // Deduplicação: mesmo telefone nas últimas 12h vira interação no lead
  // existente, em vez de um registro novo no funil.
  const doisDias = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
  const { data: existente } = await supabase
    .from("leads").select("id")
    .eq("whatsapp", telefone).gte("created_at", doisDias)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();

  const { data: veiculo } = veiculo_id
    ? await supabase.from("veiculos_publicos")
        .select("id, marca, modelo, versao, ano_modelo, preco_vigente, slug, codigo_interno")
        .eq("id", veiculo_id).maybeSingle()
    : { data: null };

  const descricaoVeiculo = veiculo
    ? `${veiculo.marca} ${veiculo.modelo} ${veiculo.versao ?? ""} ${veiculo.ano_modelo}`.replace(/\s+/g, " ").trim()
    : null;

  let leadId: string;

  if (existente) {
    leadId = existente.id;
    await supabase.from("lead_interacoes").insert({
      lead_id: leadId,
      texto: [
        descricaoVeiculo
          ? `Novo contato pelo site sobre o ${descricaoVeiculo}.`
          : "Novo contato pelo site, sem veículo específico.",
        mensagem,
      ].filter(Boolean).join(" "),
      canal: "site",
    });
  } else {
    const { data: novo, error } = await supabase.from("leads").insert({
      nome: String(nome).trim(),
      whatsapp: telefone,
      email: email ?? null,
      veiculo_id: veiculo?.id ?? null,
      tipo,
      mensagem: mensagem ?? null,
      origem: utm_source ? "campanha" : "direto",
      utm_source, utm_medium, utm_campaign,
      pagina_origem,
      consentimento_em: new Date().toISOString(),
      ip,
    }).select("id").single();

    if (error) {
      console.error("falha ao gravar lead", error);
      return json({ erro: "falha_ao_gravar" }, 500);
    }
    leadId = novo.id;
  }

  // Notificação ao vendedor. Falha aqui não invalida o lead já gravado.
  const destino = Deno.env.get("WHATSAPP_NOTIFICACAO");
  if (destino) {
    const preco = veiculo ? moeda(veiculo.preco_vigente) : "—";
    const texto = [
      existente ? "🔁 *Lead recorrente*" : "🚗 *Novo lead no site*",
      "",
      `*Nome:* ${nome}`,
      `*WhatsApp:* ${telefone}`,
      email ? `*E-mail:* ${email}` : null,
      descricaoVeiculo ? `*Veículo:* ${descricaoVeiculo}` : "*Veículo:* contato geral",
      veiculo ? `*Preço:* ${preco}` : null,
      mensagem ? `*Mensagem:* ${mensagem}` : null,
      utm_source ? `*Origem:* ${utm_source} / ${utm_medium ?? "-"}` : null,
      "",
      `Responda em até 15 minutos: wa.me/${telefone}`,
    ].filter(Boolean).join("\n");

    const envio = await enviarWhatsApp(destino, texto);
    if (!envio.ok) console.error("notificacao whatsapp falhou", envio.motivo);
  }

  return json({ ok: true, lead_id: leadId });
});
