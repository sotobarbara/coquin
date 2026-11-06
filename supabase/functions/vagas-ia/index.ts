// Coquin · Vagas — "Melhorar com IA"
// Supabase Edge Function: recebe os campos da vaga (e o banner, se houver) e devolve um
// anúncio de vaga completo e profissional, em JSON, escrito pelo Claude.
//
// Deploy: Supabase → Edge Functions → Deploy a new function → Via Editor → nome "vagas-ia"
// Secret:  Edge Functions → Secrets → ANTHROPIC_API_KEY = sua chave da Anthropic
// Só a equipe logada pode chamar (o JWT do usuário é conferido abaixo).

import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "summary", "responsibilities", "requirements", "nice_to_have", "benefits", "schedule", "location", "salary", "keywords"],
  properties: {
    title: { type: "string", description: "Nome do cargo, curto e claro (ex.: Atendente)" },
    summary: { type: "string", description: "2 a 3 frases apresentando a vaga e o que a pessoa vai viver no dia a dia" },
    responsibilities: { type: "array", items: { type: "string" }, description: "4 a 7 responsabilidades, começando com verbo" },
    requirements: { type: "array", items: { type: "string" }, description: "3 a 5 requisitos realistas para a função" },
    nice_to_have: { type: "array", items: { type: "string" }, description: "1 a 3 diferenciais" },
    benefits: { type: "array", items: { type: "string" }, description: "Só o que foi informado: salário NÃO entra aqui" },
    schedule: { type: "string", description: "Escala e horário, ex.: Escala 5x2, das 15h às 00h. Vazio se não informado" },
    location: { type: "string", description: "Local de trabalho. Vazio se não informado" },
    salary: { type: "string", description: "Salário exatamente como informado. Vazio se não informado" },
    keywords: {
      type: "array",
      description: "10 a 15 termos para procurar no currículo de bons candidatos",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["w", "pts"],
        properties: {
          w: { type: "string", description: "termo em minúsculas, sem acento; use o começo da palavra para pegar variações (ex.: sorvet)" },
          pts: { type: "integer", description: "peso de 1 a 4" },
        },
      },
    },
  },
};

const SYSTEM = `Você escreve anúncios de vaga para a Coquin, marca de gelato tailandês servido no coco, com operação em Fortaleza (CE).
O público são candidatos de nível operacional (atendimento, operação, preparo), muitos em busca do primeiro emprego, que leem pelo celular vindos do Instagram.

Escreva em português do Brasil, com tom acolhedor e profissional, frases curtas e diretas, sem jargão de RH nem exageros.

Regras:
- Use só as informações fornecidas (campos e banner). Nunca invente salário, benefício, horário, escala ou local. Se algo não foi informado, deixe o campo vazio.
- Responsabilidades e requisitos podem ser deduzidos do cargo e das atividades informadas, de forma realista para a função.
- Requisitos devem ser ligados ao trabalho (disponibilidade, ensino, experiência, habilidades). Nunca use idade, gênero, aparência, estado civil, religião, origem ou qualquer critério discriminatório. "Ensino médio completo ou cursando" é aceitável para funções operacionais.
- Diferenciais informados no banner (ex.: experiência em sorveterias) vão em nice_to_have.
- Benefícios: liste cada benefício informado em um item, com o valor quando houver (ex.: "Vale-alimentação de R$ 400,00").
- keywords: termos que um currículo forte para ESTE cargo provavelmente contém, com peso maior para o que é mais relevante.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "método não permitido" }, 405);

  // só a equipe logada (logins de funcionário @ponto ficam de fora)
  const auth = req.headers.get("Authorization") ?? "";
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: u } = await sb.auth.getUser();
  const email = u?.user?.email ?? "";
  if (!u?.user || /@ponto\.coquin\.app$/i.test(email)) return json({ error: "não autorizado" }, 401);

  if (!Deno.env.get("ANTHROPIC_API_KEY")) return json({ error: "ANTHROPIC_API_KEY não configurada nas Secrets da função" }, 500);

  let body: { fields?: Record<string, unknown>; image?: { media_type: string; data: string } | null };
  try { body = await req.json(); } catch { return json({ error: "JSON inválido" }, 400); }
  const f = body.fields ?? {};
  const info = [
    `Cargo: ${f.title ?? ""}`,
    `Local: ${f.store ?? ""}`,
    `Tipo de contrato: ${f.kind ?? ""}`,
    `Salário: ${f.salary ?? ""}`,
    `Nº de vagas: ${f.openings ?? 1}`,
    `Descrição/atividades atuais:\n${f.description ?? ""}`,
    `Benefícios e condições atuais:\n${f.perks ?? ""}`,
  ].join("\n");

  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (body.image?.data && /^image\/(png|jpeg|webp|gif)$/.test(body.image.media_type)) {
    content.push({ type: "image", source: { type: "base64", media_type: body.image.media_type as "image/jpeg", data: body.image.data } });
  }
  content.push({
    type: "text",
    text: `${body.image ? "O banner da vaga está acima. " : ""}Dados atuais da vaga (lidos do banner e conferidos pela equipe — em caso de conflito, prefira estes):\n\n${info}\n\nEscreva o anúncio completo seguindo o formato pedido.`,
  });

  const client = new Anthropic();
  try {
    const res = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
      messages: [{ role: "user", content }],
    });
    if (res.stop_reason === "refusal") return json({ error: "A IA não conseguiu gerar esta descrição. Tente ajustar os campos." }, 422);
    if (res.stop_reason === "max_tokens") return json({ error: "A resposta ficou longa demais. Tente de novo." }, 502);
    const text = res.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") return json({ error: "Resposta vazia da IA" }, 502);
    return json({ job: JSON.parse(text.text) });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return json({ error: "Chave da Anthropic inválida (ANTHROPIC_API_KEY)" }, 500);
    if (e instanceof Anthropic.RateLimitError) return json({ error: "Muitas chamadas seguidas. Espere um minuto e tente de novo." }, 429);
    if (e instanceof Anthropic.APIError) return json({ error: `Erro da IA (${e.status}): ${e.message}` }, 502);
    return json({ error: String(e) }, 500);
  }
});
