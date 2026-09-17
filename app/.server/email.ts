import { chamar, registrarEnvio } from "./envios";

type ConfigResend = { resendApiKey: string; resendRemetente: string; resendDestinatarios: string };

export const destinatariosDe = (lista: string) => lista.split(",").map((e) => e.trim()).filter(Boolean);

const escapar = (t: string) => t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** E-mail pela API do Resend (https://resend.com/docs/api-reference/emails/send-email). */
export async function enviarEmail(c: ConfigResend, assunto: string, linhas: [string, string][], rodape = "") {
  const para = destinatariosDe(c.resendDestinatarios);
  if (!c.resendApiKey || !c.resendRemetente || !para.length) return { ok: false, status: 0, texto: "E-mail não configurado." };

  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#1b1d26">
    <h2 style="margin:0 0 16px">${escapar(assunto)}</h2>
    <table cellpadding="6" style="border-collapse:collapse">${linhas.map(([k, v]) =>
      `<tr><td style="color:#555966;vertical-align:top">${escapar(k)}</td><td style="white-space:pre-line">${escapar(v)}</td></tr>`).join("")}</table>
    ${rodape ? `<p style="margin-top:20px;color:#555966;font-size:13px">${escapar(rodape)}</p>` : ""}
  </div>`;
  const text = linhas.map(([k, v]) => `${k}: ${v}`).join("\n") + (rodape ? `\n\n${rodape}` : "");

  const r = await chamar("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${c.resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: c.resendRemetente, to: para, subject: assunto, html, text }),
  });
  await registrarEnvio("email", r.ok, r.status, r.ok ? `${assunto} → ${para.join(", ")}` : r.texto || `HTTP ${r.status}`);
  return r;
}
