// Coquin · Vagas — feed XML para o Jooble (e outros agregadores que leem XML).
// Endereço público: https://vagas.coquin.com.br/jooble.xml  (rewrite em vercel.json)
// Lê só as vagas ATIVAS no Supabase com a chave pública (a mesma do site; o RLS só libera vagas ativas).
// Formato: https://help.jooble.org/en/support/solutions/articles/60001448238 (jobs > job)

const SUPABASE_URL = 'https://anrfipczginloozmatht.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFucmZpcGN6Z2lubG9vem1hdGh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5ODk3NzEsImV4cCI6MjEwMDU2NTc3MX0.Je1pF13l5Lael0EZkDC6o1Qk2XJWcusmX_ElcvdPx40';
const SITE = 'https://vagas.coquin.com.br';

const cdata = s => '<![CDATA[' + String(s == null ? '' : s).replace(/]]>/g, ']]]]><![CDATA[>') + ']]>';
const br = d => { const x = new Date(d); return [x.getDate(), x.getMonth() + 1, x.getFullYear()].map((n, i) => i < 2 ? String(n).padStart(2, '0') : n).join('.'); };
const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function description(v) {
  const parts = [];
  if (v.description) parts.push(esc(v.description).replace(/\n/g, '<br>'));
  const perks = String(v.perks || '').split('\n').map(s => s.trim()).filter(Boolean);
  if (perks.length) parts.push('<b>Benefícios e condições</b><br>' + perks.map(p => '• ' + esc(p)).join('<br>'));
  if (v.salary) parts.push('<b>Salário:</b> ' + esc(v.salary));
  if ((+v.openings || 1) > 1) parts.push('<b>Vagas:</b> ' + v.openings);
  parts.push('Candidate-se em 1 minuto (nome, e-mail e currículo): ' + SITE + '/?v=' + encodeURIComponent(v.id));
  return parts.join('<br><br>');
}

module.exports = async (req, res) => {
  try {
    const r = await fetch(SUPABASE_URL + '/rest/v1/vagas?select=id,title,store,kind,salary,description,perks,openings,created_at,updated_at&active=eq.true&order=created_at.desc',
      { headers: { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + SUPABASE_ANON } });
    if (!r.ok) throw new Error('supabase ' + r.status);
    const vagas = await r.json();
    const jobs = vagas.map(v => {
      const region = /fortaleza|beira|futuro|centro|imprensa/i.test(String(v.store)) || !v.store ? 'Fortaleza, CE' : v.store;
      return `  <job id="${esc(v.id)}">
    <link>${cdata(SITE + '/?v=' + encodeURIComponent(v.id) + '&utm_source=jooble')}</link>
    <name>${cdata(v.title)}</name>
    <region>${cdata(region)}</region>
    <description>${cdata(description(v))}</description>
    <pubdate>${br(v.created_at)}</pubdate>
    <updated>${br(v.updated_at || v.created_at)}</updated>
    <salary>${cdata(v.salary || '')}</salary>
    <company>${cdata('Coquin Gelato Tailandês')}</company>
    <jobtype>${cdata(/clt/i.test(v.kind) ? 'Efetivo (CLT)' : (v.kind || ''))}</jobtype>
  </job>`;
    }).join('\n');
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=900, stale-while-revalidate=3600');
    res.status(200).send(`<?xml version="1.0" encoding="utf-8"?>\n<jobs>\n${jobs}\n</jobs>\n`);
  } catch (e) {
    res.status(502).setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send('Feed indisponível no momento.');
  }
};
