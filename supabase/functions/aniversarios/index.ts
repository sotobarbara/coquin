// Coquin · Agente de aniversários da equipe (WhatsApp)
// Supabase Edge Function. Roda 1x por dia (pg_cron) e:
//   1) avisa o(s) gerente(s) no privado X dias antes do aniversário de alguém ("lembrete");
//   2) no dia, o Claude escreve uma mensagem de parabéns e ela é postada no GRUPO da equipe,
//      marcando a pessoa (@) quando o WhatsApp dela estiver cadastrado.
// Cada envio é registrado em birthday_log, então rodar 2x no mesmo dia não repete mensagem.
//
// Deploy: Supabase → Edge Functions → Deploy a new function → Via Editor → nome "aniversarios"
// Secrets (Edge Functions → Secrets):
//   ANTHROPIC_API_KEY     chave da Anthropic (sem ela, usa uma mensagem padrão)
//   CRON_SECRET           senha qualquer, a mesma colocada no agendamento (SQL do README)
//   WHATSAPP_PROVIDER     zapi | evolution
//   WHATSAPP_GROUP_ID     id do grupo (Z-API: 1203...-group · Evolution: 1203...@g.us)
//   MANAGER_PHONES        WhatsApp de quem recebe os lembretes, com DDI: 5585999999999 (vários: separe por vírgula)
//   REMINDER_DAYS         dias de antecedência do lembrete (padrão "3,1"; 0 = também avisa no dia)
//   Z-API:     ZAPI_INSTANCE, ZAPI_TOKEN, ZAPI_CLIENT_TOKEN
//   Evolution: EVOLUTION_URL (ex.: https://evo.seudominio.com), EVOLUTION_INSTANCE, EVOLUTION_APIKEY
//
// Modos (POST JSON):
//   {"mode":"run"}                         → rotina diária (cron, header x-cron-secret) ou gerente logado
//   {"mode":"preview","emp":"<id>"}        → só gera a mensagem, não envia (gerente logado)
//   {"mode":"test","emp":"<id>"}           → gera e envia SÓ para MANAGER_PHONES (gerente logado)
//   {"mode":"groups"}                      → lista os grupos do WhatsApp conectado, para achar o id (gerente logado)

import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const env = (k: string, d = "") => (Deno.env.get(k) ?? d).trim();
const TZ = "America/Fortaleza";

type Person = { id: string; name: string; role: string; birth: string; admission: string | null; phone: string };

/* ---------- datas (fuso de Fortaleza) ---------- */
function todayParts() {
  const s = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const [y, m, d] = s.split("-").map(Number);
  return { y, m, d };
}
const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
/** dias até o próximo aniversário (0 = hoje). 29/02 comemora em 28/02 nos anos não bissextos. */
function daysUntil(birth: string, t = todayParts()) {
  let [, bm, bd] = birth.split("-").map(Number);
  const at = (y: number) => {
    let d = bd;
    if (bm === 2 && bd === 29 && !isLeap(y)) d = 28;
    return Date.UTC(y, bm - 1, d);
  };
  const today = Date.UTC(t.y, t.m - 1, t.d);
  let next = at(t.y);
  if (next < today) next = at(t.y + 1);
  return { days: Math.round((next - today) / 86400000), year: new Date(next).getUTCFullYear() };
}
const ddmm = (birth: string) => birth.slice(8, 10) + "/" + birth.slice(5, 7);
function yearsAtCompany(admission: string | null) {
  if (!admission) return null;
  const t = todayParts(), [y, m, d] = admission.split("-").map(Number);
  let n = t.y - y;
  if (t.m < m || (t.m === m && t.d < d)) n--;
  return n;
}
const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");

/* ---------- WhatsApp (Z-API ou Evolution API) ---------- */
async function sendWhatsApp(to: string, text: string, mentions: string[] = []) {
  const provider = env("WHATSAPP_PROVIDER", "zapi").toLowerCase();
  let res: Response;
  if (provider === "evolution") {
    const base = env("EVOLUTION_URL").replace(/\/+$/, "");
    res = await fetch(`${base}/message/sendText/${encodeURIComponent(env("EVOLUTION_INSTANCE"))}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: env("EVOLUTION_APIKEY") },
      body: JSON.stringify({ number: to, text, ...(mentions.length ? { mentioned: mentions } : {}) }),
    });
  } else {
    res = await fetch(`https://api.z-api.io/instances/${env("ZAPI_INSTANCE")}/token/${env("ZAPI_TOKEN")}/send-text`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Client-Token": env("ZAPI_CLIENT_TOKEN") },
      body: JSON.stringify({ phone: to, message: text, ...(mentions.length ? { mentioned: mentions } : {}) }),
    });
  }
  if (!res.ok) throw new Error(`WhatsApp (${provider}) respondeu ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

async function listGroups(): Promise<{ id: string; name: string }[]> {
  const provider = env("WHATSAPP_PROVIDER", "zapi").toLowerCase();
  if (provider === "evolution") {
    const base = env("EVOLUTION_URL").replace(/\/+$/, "");
    const r = await fetch(`${base}/group/fetchAllGroups/${encodeURIComponent(env("EVOLUTION_INSTANCE"))}?getParticipants=false`, {
      headers: { apikey: env("EVOLUTION_APIKEY") },
    });
    if (!r.ok) throw new Error(`Evolution respondeu ${r.status}: ${(await r.text()).slice(0, 300)}`);
    const arr = await r.json();
    return (Array.isArray(arr) ? arr : []).map((g: Record<string, string>) => ({ id: g.id, name: g.subject || g.name || "" }));
  }
  const r = await fetch(`https://api.z-api.io/instances/${env("ZAPI_INSTANCE")}/token/${env("ZAPI_TOKEN")}/groups?page=1&pageSize=100`, {
    headers: { "Client-Token": env("ZAPI_CLIENT_TOKEN") },
  });
  if (!r.ok) throw new Error(`Z-API respondeu ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const arr = await r.json();
  return (Array.isArray(arr) ? arr : []).map((g: Record<string, string>) => ({ id: g.phone || g.id, name: g.name || "" }));
}

/* ---------- mensagem de parabéns (Claude) ---------- */
const SYSTEM = `Você escreve a mensagem de parabéns que vai no grupo de WhatsApp da equipe da Coquin, marca de gelato tailandês servido no coco, em Fortaleza (CE).
Escreva em português do Brasil, com tom caloroso, alegre e de equipe — como um colega querido escreveria, não como RH.

Regras:
- Entre 3 e 6 linhas curtas, pensadas para ler no celular. Pode usar de 2 a 5 emojis (🎉🥥🍨🎂🥳 combinam com a marca).
- Use o marcador @PESSOA exatamente uma vez, no lugar onde o nome da pessoa aparece pela primeira vez (ele vira a marcação no WhatsApp). Depois disso pode usar o primeiro nome normalmente.
- Use só o que foi informado (nome, cargo, tempo de casa). Nunca mencione idade, aparência, religião, vida pessoal ou detalhes que você não recebeu.
- Se o tempo de casa for informado e for 1 ano ou mais, você pode agradecer pela caminhada juntos; se for novo(a) na equipe, dê as boas-vindas a esse primeiro aniversário com o time.
- Termine convidando a equipe a deixar os parabéns. Varie a mensagem: nada de clichê repetido.
- Responda só com o texto da mensagem, sem aspas e sem comentários.`;

async function birthdayMessage(p: Person) {
  const first = p.name.split(/\s+/)[0];
  const yrs = yearsAtCompany(p.admission);
  const fallback = `🎉 Hoje é dia de festa na Coquin! 🥥\n\nFeliz aniversário, @PESSOA! Obrigado por fazer parte do nosso time — que seu novo ano seja doce como um gelato no coco. 🍨🎂\n\nEquipe, bora deixar os parabéns pra ${first}! 🥳`;
  if (!env("ANTHROPIC_API_KEY")) return { text: fallback, ai: false };
  const info = [
    `Nome: ${p.name}`,
    `Cargo: ${p.role || "não informado"}`,
    `Tempo de casa: ${yrs == null ? "não informado" : yrs < 1 ? "menos de 1 ano" : yrs === 1 ? "1 ano" : yrs + " anos"}`,
  ].join("\n");
  try {
    const client = new Anthropic();
    const res = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 2000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      output_config: { effort: "low" },
      messages: [{ role: "user", content: `Escreva a mensagem de aniversário de hoje.\n\n${info}` }],
    });
    if (res.stop_reason === "refusal" || res.stop_reason === "max_tokens") return { text: fallback, ai: false };
    const t = res.content.find((b) => b.type === "text");
    const text = t && t.type === "text" ? t.text.trim() : "";
    return text ? { text, ai: true } : { text: fallback, ai: false };
  } catch (e) {
    console.error("Claude:", e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : String(e));
    return { text: fallback, ai: false };
  }
}

/** troca o @PESSOA pela marcação (@5585...) quando há WhatsApp; senão, pelo nome */
function applyMention(text: string, p: Person) {
  const phone = onlyDigits(p.phone);
  const first = p.name.split(/\s+/)[0];
  const tag = phone ? "@" + phone : first;
  const out = text.includes("@PESSOA") ? text.replace("@PESSOA", tag).replaceAll("@PESSOA", first) : `${tag}, ${text}`;
  return { text: out, mentions: phone ? [phone] : [] };
}

/* ---------- handler ---------- */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "método não permitido" }, 405);

  let body: { mode?: string; emp?: string } = {};
  try { body = await req.json(); } catch { /* corpo vazio = run */ }
  const mode = body.mode || "run";

  // quem chamou: o agendamento (x-cron-secret) ou um gerente logado
  const cronOK = !!env("CRON_SECRET") && req.headers.get("x-cron-secret") === env("CRON_SECRET");
  if (!cronOK) {
    const sbUser = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: isAdmin, error } = await sbUser.rpc("is_admin");
    if (error || isAdmin !== true) return json({ error: "não autorizado" }, 401);
  } else if (mode !== "run") {
    return json({ error: "o agendamento só roda o modo run" }, 400);
  }

  const sb = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));

  try {
    if (mode === "groups") return json({ groups: await listGroups() });

    const [emps, people] = await Promise.all([
      sb.from("shift_employees").select("id,name,role,active,birth_date,admission"),
      sb.from("payroll_people").select("emp,whatsapp"),
    ]);
    if (emps.error) throw emps.error;
    const phones: Record<string, string> = {};
    (people.data || []).forEach((x: { emp: string; whatsapp: string | null }) => { if (x.whatsapp) phones[x.emp] = x.whatsapp; });
    const team: Person[] = (emps.data || [])
      .filter((e) => e.active !== false && e.birth_date)
      .map((e) => ({ id: e.id, name: e.name, role: e.role || "", birth: e.birth_date, admission: e.admission, phone: phones[e.id] || "" }));

    const managers = env("MANAGER_PHONES").split(",").map(onlyDigits).filter(Boolean);

    if (mode === "preview" || mode === "test") {
      const p = team.find((x) => x.id === body.emp) || team.sort((a, b) => daysUntil(a.birth).days - daysUntil(b.birth).days)[0];
      if (!p) return json({ error: "Ninguém da equipe tem aniversário cadastrado ainda." }, 404);
      const msg = await birthdayMessage(p);
      const { text, mentions } = applyMention(msg.text, p);
      if (mode === "test") {
        if (!managers.length) return json({ error: "Cadastre MANAGER_PHONES nas Secrets da função." }, 400);
        for (const m of managers) await sendWhatsApp(m, "🧪 *Teste do agente de aniversários* — assim vai sair no grupo:\n\n" + text);
      }
      return json({ emp: p.id, name: p.name, text, ai: msg.ai, mentions, sent: mode === "test" ? managers.length : 0 });
    }

    // ---- rotina diária ----
    const remindDays = env("REMINDER_DAYS", "3,1").split(",").map((s) => parseInt(s, 10)).filter((n) => n >= 0);
    const group = env("WHATSAPP_GROUP_ID");
    const done: string[] = [], errors: string[] = [];

    // grava no log antes de enviar: se já existe, alguém já mandou hoje (não repete)
    const claim = async (emp: string, year: number, kind: string, text: string) => {
      const { error } = await sb.from("birthday_log").insert({ emp, year, kind, message: text });
      return !error;
    };

    for (const p of team) {
      const { days, year } = daysUntil(p.birth);

      if (days === 0 && group) {
        const msg = await birthdayMessage(p);
        const { text, mentions } = applyMention(msg.text, p);
        if (await claim(p.id, year, "grupo", text)) {
          try { await sendWhatsApp(group, text, mentions); done.push(`parabéns no grupo: ${p.name}`); }
          catch (e) { errors.push(String(e)); await sb.from("birthday_log").delete().match({ emp: p.id, year, kind: "grupo" }); }
        }
      }

      if (remindDays.includes(days) && managers.length) {
        const kind = "lembrete-" + days;
        const when = days === 0 ? "*hoje*" : days === 1 ? "*amanhã*" : `em *${days} dias*`;
        const text = `🎂 Lembrete: o aniversário de *${p.name}*${p.role ? ` (${p.role})` : ""} é ${when} — ${ddmm(p.birth)}.` +
          (days > 0 ? `\n\nQue tal preparar algo? Um bolo, um gelato especial ou uma folga no dia. 🥥🍨` : `\n\nA mensagem de parabéns já foi pro grupo. 🎉`);
        if (await claim(p.id, year, kind, text)) {
          try { for (const m of managers) await sendWhatsApp(m, text); done.push(`lembrete (${days}d): ${p.name}`); }
          catch (e) { errors.push(String(e)); await sb.from("birthday_log").delete().match({ emp: p.id, year, kind }); }
        }
      }
    }
    if (!group) errors.push("WHATSAPP_GROUP_ID não configurado: parabéns no grupo desligado");
    return json({ ok: errors.length === 0, done, errors });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
