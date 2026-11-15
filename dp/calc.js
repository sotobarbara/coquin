/* ============================================================
   COQUIN — Departamento Pessoal · motor de cálculo
   Funções puras (sem tela): folha, hora extra, DSR, INSS, IRRF,
   VT/VA, adiantamento, férias, 13º, rescisão e FGTS.
   Roda no navegador (window.DPCalc) e no Node (testes).

   Bases legais usadas (2026):
   · INSS progressivo — Portaria Interministerial MPS/MF nº 13/2026
   · IRRF mensal (tabela desde 05/2025) + redução da Lei 15.270/2025
     (zera o IR até R$ 5.000 e reduz aos poucos até R$ 7.350)
   · Hora = salário ÷ 220 (44h) — CLT art. 64 · HE ≥ 50% — CF art. 7º XVI, CLT art. 59
   · DSR sobre horas extras — Súmula 172 TST · Lei 605/1949
   · Adicional noturno 20% (22h–5h) — CLT art. 73
   · VT: desconto até 6% do salário-base — Lei 7.418/1985, Decreto 10.854/2021
   · Salário até o 5º dia útil — CLT art. 459 §1º (sábado conta como dia útil)
   · FGTS 8% (aprendiz 2%) — Lei 8.036/1990 · multa 40% (20% no acordo)
   · Férias + 1/3 — CF art. 7º XVII, CLT arts. 129–145 · faltas reduzem dias (art. 130)
   · 13º — Lei 4.090/1962 e 4.749/1965 (1ª parc. até 30/11, 2ª até 20/12)
   · Rescisão — CLT arts. 477, 479, 480, 484-A, 487 · aviso proporcional Lei 12.506/2011
   ============================================================ */
(function(root){
'use strict';

/* ---------------- tabelas 2026 ---------------- */
const MIN_WAGE = 1621.00;                                        /* salário mínimo 2026 */
const INSS_2026 = [[1621.00,7.5],[2902.84,9],[4354.27,12],[8475.55,14]];
const IRRF_TABLE = [[2428.80,0,0],[2826.65,7.5,182.16],[3751.05,15,394.16],[4664.68,22.5,675.49],[Infinity,27.5,908.73]];
const IRRF_DEP = 189.59, IRRF_SIMPL = 607.20;

const DEFAULT_CFG = {
  /* agenda de pagamentos da casa */
  benefitDay: 1,          /* todo dia 01: VT do mês + VA */
  vtValue: 10.80,         /* VT por dia */
  vaValue: 400,           /* VA por mês */
  advDay: 20,             /* todo dia 20: adiantamento quinzenal */
  advPct: 40,             /* % do salário no adiantamento */
  payBizDay: 5,           /* 5º dia útil: salário */
  shiftRule: 'antecipar', /* dia 01/20 caindo em domingo/feriado: antecipar | adiar | manter */
  /* regras de cálculo */
  divisor: 220, he50: 50, he100: 100, noturno: 20, pjHePct: 0,
  vtPct: 6, vaDescPct: 0, dsrHE: true, satUtil: true,
  vtSkipHolidays: true,   /* VT não conta feriado */
  vtCompensa: true,       /* faltas/atestados do mês anterior abatem no VT do dia 01 */
  irrf: true, inss: INSS_2026, minWage: MIN_WAGE,
  /* encargos da empresa */
  fgts: 8, regime: 'simples', patronal: 0, rat: 0, terceiros: 0,
  localHolidays: []       /* '01-25' (todo ano) ou '2026-06-04' */
};

/* ---------------- utilidades ---------------- */
const pad = n => String(n).padStart(2,'0');
const r2 = n => Math.round(((+n)||0)*100 + (n>=0?1e-9:-1e-9))/100;
function dOf(iso){ const p=String(iso).split('-'); return new Date(+p[0], (+p[1])-1, +(p[2]||1)); }
function isoOf(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function addDays(iso,n){ const d=dOf(iso); d.setDate(d.getDate()+n); return isoOf(d); }
function addMonthsISO(iso,n){ const d=dOf(iso), day=d.getDate(); const t=new Date(d.getFullYear(), d.getMonth()+n, 1);
  const last=new Date(t.getFullYear(), t.getMonth()+1, 0).getDate(); t.setDate(Math.min(day,last)); return isoOf(t); }
function ymOf(iso){ return String(iso).slice(0,7); }
function nextYM(ym){ const d=dOf(ym+'-01'); d.setMonth(d.getMonth()+1); return isoOf(d).slice(0,7); }
function prevYM(ym){ const d=dOf(ym+'-01'); d.setMonth(d.getMonth()-1); return isoOf(d).slice(0,7); }
function lastDay(ym){ const d=dOf(ym+'-01'); return new Date(d.getFullYear(), d.getMonth()+1, 0).getDate(); }
function daysOf(ym){ const n=lastDay(ym), a=[]; for(let i=1;i<=n;i++) a.push(ym+'-'+pad(i)); return a; }
function wd(iso){ return dOf(iso).getDay(); }
function diffDays(a,b){ return Math.round((dOf(b)-dOf(a))/864e5); }   /* b − a */

/* ---------------- feriados e dias úteis ---------------- */
function easter(y){ const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),
  h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1;
  return new Date(y,mo-1,da); }
const HOL_NAMES={'01-01':'Confraternização Universal','04-21':'Tiradentes','05-01':'Dia do Trabalho','09-07':'Independência',
  '10-12':'N. Sra. Aparecida','11-02':'Finados','11-15':'Proclamação da República','11-20':'Consciência Negra','12-25':'Natal'};
const _hol={};
function natHolidays(y){
  if(_hol[y]) return _hol[y];
  const m={}; Object.keys(HOL_NAMES).forEach(k=>m[y+'-'+k]=HOL_NAMES[k]);
  const sf=easter(y); sf.setDate(sf.getDate()-2); m[isoOf(sf)]='Sexta-feira Santa';
  return (_hol[y]=m);
}
function holidayName(iso,cfg){
  const n=natHolidays(+iso.slice(0,4))[iso]; if(n) return n;
  const loc=(cfg&&cfg.localHolidays)||[];
  for(const h of loc){ const k=String(h).split(' ')[0]; if(k===iso || k===iso.slice(5)) return String(h).split(' ').slice(1).join(' ')||'Feriado local'; }
  return '';
}
function isHoliday(iso,cfg){ return !!holidayName(iso,cfg); }
/* dia útil para pagamento: segunda a sábado, fora feriados (IN SRT/MTE 1/1989) */
function isBizDay(iso,cfg){ const w=wd(iso); if(w===0) return false; if(w===6 && cfg && cfg.satUtil===false) return false; return !isHoliday(iso,cfg); }
function nthBizDay(ym,n,cfg){ let c=0; for(const d of daysOf(ym)){ if(isBizDay(d,cfg) && ++c===n) return d; } return ym+'-'+pad(Math.min(n,28)); }
function shiftDay(iso,cfg){                        /* dia fixo (01 / 20) caindo em domingo/feriado */
  const rule=(cfg&&cfg.shiftRule)||'antecipar';
  if(rule==='manter') return iso;
  let d=iso, g=0; const step=rule==='adiar'?1:-1;
  while(!isBizDay(d,cfg) && g++<10) d=addDays(d,step);
  return d;
}
/* datas da agenda do mês */
function benefitDate(ym,cfg){ return shiftDay(ym+'-'+pad(cfg.benefitDay||1),cfg); }
function advDate(ym,cfg){ return shiftDay(ym+'-'+pad(Math.min(cfg.advDay||20,lastDay(ym))),cfg); }
function salaryDate(ym,cfg){ return nthBizDay(nextYM(ym), cfg.payBizDay||5, cfg); }     /* folha de ym paga no 5º dia útil de ym+1 */
function fgtsDate(ym,cfg){ let d=nextYM(ym)+'-20'; while(!isBizDay(d,cfg)) d=addDays(d,-1); return d; }   /* FGTS Digital: até dia 20 */
/* domingos + feriados (repousos) e dias úteis do mês, para o DSR */
function dsrDays(ym,cfg){ let u=0,r=0; daysOf(ym).forEach(d=>{ if(wd(d)===0 || isHoliday(d,cfg)) r++; else u++; }); return {uteis:u, repousos:r}; }

/* ---------------- impostos ---------------- */
function inssCalc(base,table){
  table=table||INSS_2026; let t=0, prev=0; base=Math.max(0,+base||0);
  const steps=[];
  for(const f of table){ if(base<=prev) break; const part=Math.min(base,f[0])-prev; const v=part*f[1]/100; t+=v; steps.push({ate:f[0], pct:f[1], base:r2(part), v:r2(v)}); prev=f[0]; }
  return {v:r2(t), eff: base? t/base*100 : 0, steps, teto: base>table[table.length-1][0]};
}
function irrfTax(base){ if(base<=0) return {v:0,pct:0,ded:0}; for(const f of IRRF_TABLE){ if(base<=f[0]) return {v:Math.max(0,base*f[1]/100-f[2]), pct:f[1], ded:f[2]}; } return {v:0,pct:0,ded:0}; }
/* gross = rendimento tributável do mês · inss = INSS retido · deps = dependentes */
function irrfCalc(gross,inss,deps){
  gross=Math.max(0,+gross||0);
  const baseLegal=Math.max(0, gross-(+inss||0)-(+deps||0)*IRRF_DEP), baseSimpl=Math.max(0, gross-IRRF_SIMPL);
  const tL=irrfTax(baseLegal), tS=irrfTax(baseSimpl);
  const useS=tS.v<tL.v, t=useS?tS:tL, base=useS?baseSimpl:baseLegal;
  let red=0;                                       /* Lei 15.270/2025 */
  if(gross<=5000) red=t.v; else if(gross<=7350) red=Math.min(t.v, Math.max(0, 978.62-0.133145*gross));
  const v=r2(Math.max(0, t.v-red));
  return {v, base:r2(base), pct:t.pct, ded:t.ded, simpl:useS, bruto:r2(t.v), red:r2(red), isento: v===0};
}

/* ---------------- funcionário ---------------- */
const CONTRACTS={
  clt:      {k:'clt',      label:'CLT',                      inss:true,  fgts:8, vtDesc:true,  irrf:true},
  aprendiz: {k:'aprendiz', label:'Jovem aprendiz (CLT)',     inss:true,  fgts:2, vtDesc:true,  irrf:true},
  estagio:  {k:'estagio',  label:'Estágio (bolsa)',          inss:false, fgts:0, vtDesc:false, irrf:true},
  pj:       {k:'pj',       label:'PJ / prestador',           inss:false, fgts:0, vtDesc:false, irrf:false}
};
function contractOf(e){ return CONTRACTS[e&&e.contract]||CONTRACTS.clt; }
function isCLT(e){ const c=contractOf(e); return c.k==='clt'||c.k==='aprendiz'; }
function activeIn(e,ym){
  if(!e) return false;
  if(e.admissao && ymOf(e.admissao)>ym) return false;
  if(e.demissao && ymOf(e.demissao)<ym) return false;
  return true;
}
/* adicionais fixos (insalubridade sobre o mínimo, periculosidade 30% do salário) */
function fixedAdds(e,cfg){
  const ins = (+e.insalub||0) ? r2((cfg.minWage||MIN_WAGE)*(+e.insalub)/100) : 0;
  const per = e.peric ? r2((+e.salary||0)*0.30) : 0;
  return {ins, per};
}
function remuneracao(e,cfg){ const a=fixedAdds(e,cfg); return r2((+e.salary||0)+a.ins+a.per); }
function hourValue(e,cfg){ return remuneracao(e,cfg)/(+e.divisor||+cfg.divisor||220); }

/* dias de VT de um mês para a pessoa (dias de trabalho pela folga semanal da pessoa) */
function workDaysFor(e,ym,cfg,fromISO,toISO){
  const off=Array.isArray(e.offDays)?e.offDays:[0];
  return daysOf(ym).filter(d=>{
    if(fromISO && d<fromISO) return false; if(toISO && d>toISO) return false;
    if(off.indexOf(wd(d))>=0) return false;
    if(cfg.vtSkipHolidays!==false && isHoliday(d,cfg)) return false;
    return true;
  });
}

/* ---------------- férias que caem num mês ---------------- */
function vacationDaysIn(vac,ym){
  if(!vac||!vac.start||!(+vac.days)) return 0;
  const end=addDays(vac.start,(+vac.days)-1); let n=0;
  daysOf(ym).forEach(d=>{ if(d>=vac.start && d<=end) n++; });
  return n;
}
function vacationsIn(state,empId,ym){
  return (state.vacations||[]).filter(v=>v.emp===empId).map(v=>({v, dias:vacationDaysIn(v,ym)})).filter(x=>x.dias>0);
}

/* ---------------- lançamentos do mês ---------------- */
const KINDS={
  he50:    {k:'he50',    label:'Hora extra 50%',            unit:'h',    sign:+1, group:'prov'},
  he100:   {k:'he100',   label:'Hora extra 100% (dom/fer)', unit:'h',    sign:+1, group:'prov'},
  noturno: {k:'noturno', label:'Adicional noturno',         unit:'h',    sign:+1, group:'prov'},
  comissao:{k:'comissao',label:'Comissão',                  unit:'R$',   sign:+1, group:'prov'},
  bonus:   {k:'bonus',   label:'Bônus / gratificação',      unit:'R$',   sign:+1, group:'prov'},
  outroP:  {k:'outroP',  label:'Outro provento',            unit:'R$',   sign:+1, group:'prov'},
  reembolso:{k:'reembolso',label:'Reembolso (sem imposto)', unit:'R$',   sign:+1, group:'prov'},
  falta:   {k:'falta',   label:'Falta injustificada',       unit:'dias', sign:-1, group:'desc'},
  atestado:{k:'atestado',label:'Atestado médico',           unit:'dias', sign:0,  group:'info'},
  atraso:  {k:'atraso',  label:'Atraso / saída antecipada', unit:'h',    sign:-1, group:'desc'},
  vale:    {k:'vale',    label:'Vale (dinheiro adiantado)', unit:'R$',   sign:-1, group:'desc'},
  consumo: {k:'consumo', label:'Consumo / quebra de caixa', unit:'R$',   sign:-1, group:'desc'},
  pensao:  {k:'pensao',  label:'Pensão alimentícia',        unit:'R$',   sign:-1, group:'desc'},
  outroD:  {k:'outroD',  label:'Outro desconto',            unit:'R$',   sign:-1, group:'desc'},
  vtAjuste:{k:'vtAjuste',label:'Ajuste de VT (dias ±)',     unit:'dias', sign:0,  group:'info'},
  adiant:  {k:'adiant',  label:'Adiantamento (valor manual)',unit:'R$',  sign:0,  group:'info'}
};
function entriesOf(state,empId,ym){ return (state.entries||[]).filter(x=>x.emp===empId && x.ym===ym); }
function sumK(ents,k,f){ return ents.filter(x=>x.kind===k).reduce((a,x)=>a+(+x[f||'qty']||0),0); }

/* dias de VT perdidos por uma falta/atestado: com data, conta só os dias em que a pessoa trabalharia
   (tira folga semanal e feriado); sem data, vale a quantidade lançada */
function vtLostDays(e,x,cfg){
  const q=Math.max(0,Math.round(+x.qty||0)); if(!q) return 0;
  if(!x.date) return q;
  const off=Array.isArray(e.offDays)?e.offDays:[0]; let n=0;
  for(let i=0;i<q;i++){ const d=addDays(x.date,i); if(off.indexOf(wd(d))>=0) continue; if(cfg.vtSkipHolidays!==false && isHoliday(d,cfg)) continue; n++; }
  return n;
}
/* ---------------- DIA 01: VT + VA do mês ---------------- */
function benefits(state,empId,ym){
  const cfg=state.cfg, e=(state.emps||[]).find(x=>x.id===empId);
  if(!e || !activeIn(e,ym)) return null;
  const from = e.admissao && ymOf(e.admissao)===ym ? e.admissao : null;
  const to   = e.demissao && ymOf(e.demissao)===ym ? e.demissao : null;
  const vtDia = (e.vtValue!=null && e.vtValue!=='') ? +e.vtValue : +cfg.vtValue;
  let days = workDaysFor(e,ym,cfg,from,to).length;
  /* férias no mês: não leva VT nesses dias */
  let ferDays=0; vacationsIn(state,empId,ym).forEach(x=>{
    const end=addDays(x.v.start,(+x.v.days)-1);
    ferDays+=workDaysFor(e,ym,cfg,x.v.start>ym+'-01'?x.v.start:null, end).length; });
  /* compensação: faltas + atestados do mês anterior (já pagos e não usados) */
  const pe=entriesOf(state,empId,prevYM(ym)).filter(x=>x.kind==='falta'||x.kind==='atestado');
  const compDet = cfg.vtCompensa!==false ? pe.map(x=>({kind:x.kind, date:x.date||'', qty:+x.qty||0, dias:vtLostDays(e,x,cfg)})).filter(x=>x.dias>0) : [];
  const comp = compDet.reduce((a,x)=>a+x.dias,0);
  const ajuste = sumK(entriesOf(state,empId,ym),'vtAjuste');
  const vtDays = e.vt===false ? 0 : Math.max(0, days-ferDays-comp+ajuste);
  const vt = r2(vtDays*vtDia);
  let va = e.va===false ? 0 : ((e.vaValue!=null && e.vaValue!=='') ? +e.vaValue : +cfg.vaValue);
  if(va && from){ va=r2(va*(lastDay(ym)-(+from.slice(8))+1)/lastDay(ym)); }      /* admitido no meio do mês: proporcional */
  return {e, ym, date:benefitDate(ym,cfg), vtDia, baseDays:days, ferDays, comp, compDet, ajuste, vtDays, vt, va, total:r2(vt+va)};
}

/* ---------------- DIA 20: adiantamento ---------------- */
function advance(state,empId,ym){
  const cfg=state.cfg, e=(state.emps||[]).find(x=>x.id===empId);
  if(!e || !activeIn(e,ym) || e.adv===false) return null;
  if(e.demissao && e.demissao<advDate(ym,cfg)) return null;
  const pct = (e.advPct!=null && e.advPct!=='') ? +e.advPct : +cfg.advPct;
  const ov = entriesOf(state,empId,ym).find(x=>x.kind==='adiant');
  let base=+e.salary||0, prop=1;
  if(e.admissao && ymOf(e.admissao)===ym){ const ad=+e.admissao.slice(8); prop=Math.max(0,(30-ad+1))/30; if(ad===1) prop=1; }
  const v = ov ? r2(+ov.amount||0) : r2(base*prop*pct/100);
  return {e, ym, date:advDate(ym,cfg), pct, v, manual:!!ov};
}

/* ---------------- FOLHA DO MÊS (competência ym, paga no 5º dia útil de ym+1) ---------------- */
function payroll(state,empId,ym){
  const cfg=state.cfg, e=(state.emps||[]).find(x=>x.id===empId);
  if(!e || !activeIn(e,ym)) return null;
  const C=contractOf(e), clt=isCLT(e), pj=C.k==='pj';
  const sal=+e.salary||0, dia=sal/30, adds=fixedAdds(e,cfg), hora=hourValue(e,cfg);
  const ents=entriesOf(state,empId,ym);
  /* dias do mês comercial (30) */
  let diasMes=30;
  if(e.admissao && ymOf(e.admissao)===ym){ const ad=+e.admissao.slice(8); diasMes = ad===1 ? 30 : Math.max(0, lastDay(ym)-ad+1); }
  let rescisao=false;
  if(e.demissao && ymOf(e.demissao)===ym){ rescisao=true; diasMes=Math.min(diasMes, Math.min(30,+e.demissao.slice(8))); }
  const fer=vacationsIn(state,empId,ym); const diasFerias=fer.reduce((a,x)=>a+x.dias,0);
  const diasTrab=Math.max(0, Math.min(30,diasMes)-diasFerias);
  const L=[];                                    /* linhas do holerite: {cod, desc, ref, prov, desc} */
  const P=(cod,desc,ref,v,o)=>{ v=r2(v); if(v) L.push(Object.assign({cod,desc,ref,prov:v,dsc:0,trib:true},o||{})); return v; };
  const D=(cod,desc,ref,v,o)=>{ v=r2(v); if(v) L.push(Object.assign({cod,desc,ref,prov:0,dsc:v},o||{})); return v; };
  const fmtH=m=>{ const h=Math.floor(m), mi=Math.round((m-h)*60); return pad(h)+':'+pad(mi); };

  const vSal = P('001', pj?'Honorários / valor do contrato':(C.k==='estagio'?'Bolsa-auxílio':'Salário'), diasTrab+'d', dia*diasTrab);
  const vIns = adds.ins ? P('010','Adicional de insalubridade ('+e.insalub+'%)', diasTrab+'d', adds.ins/30*diasTrab) : 0;
  const vPer = adds.per ? P('011','Adicional de periculosidade (30%)', diasTrab+'d', adds.per/30*diasTrab) : 0;
  const pct50 = pj?+cfg.pjHePct:+cfg.he50, pct100 = pj?+cfg.pjHePct:+cfg.he100;
  const h50=sumK(ents,'he50'), h100=sumK(ents,'he100'), hNot=sumK(ents,'noturno');
  const vHe50 = P('020','Horas extras '+pct50+'%', fmtH(h50), h50*hora*(1+pct50/100));
  const vHe100= P('021','Horas extras '+pct100+'%', fmtH(h100), h100*hora*(1+pct100/100));
  const vNot  = pj?0:P('022','Adicional noturno '+cfg.noturno+'%', fmtH(hNot), hNot*hora*(+cfg.noturno||20)/100);
  const varSum=vHe50+vHe100+vNot;
  const dd=dsrDays(ym,cfg);
  const vDsr = (clt && cfg.dsrHE!==false && varSum && dd.uteis) ? P('023','DSR sobre horas extras/adicional', dd.uteis+'u/'+dd.repousos+'r', varSum/dd.uteis*dd.repousos) : 0;
  const vCom = P('030','Comissões','',sumK(ents,'comissao','amount'));
  const vBon = P('031','Bônus / gratificação','',sumK(ents,'bonus','amount'));
  const vOut = P('032','Outros proventos','',sumK(ents,'outroP','amount'));
  const vRee = P('040','Reembolso (não tributável)','',sumK(ents,'reembolso','amount'),{trib:false});
  /* férias: informativo (pago no recibo de férias) */
  let ferBase=0, ferInss=0, ferIrrf=0;
  fer.forEach(x=>{ const c=x.v.calc||vacationCalc(state,x.v); const frac=x.dias/(+x.v.days||30);
    ferBase+=c.baseInss*frac; ferInss+=c.inss*frac; ferIrrf+=c.irrf*frac; });
  /* descontos por ausência */
  const nFal=sumK(ents,'falta');
  const vFal = D('101','Faltas', nFal+'d', dia*nFal + (adds.ins+adds.per)/30*nFal);
  const dsrLostN = ents.filter(x=>x.kind==='falta' && x.dsr).length;
  const vDsrL= clt ? D('102','DSR perdido (faltas)', dsrLostN+'d', dia*dsrLostN) : 0;
  const hAtr=sumK(ents,'atraso');
  const vAtr = D('103','Atrasos / saídas antecipadas', fmtH(hAtr), hAtr*hora);
  const provTrib = L.filter(x=>x.prov && x.trib).reduce((a,x)=>a+x.prov,0);
  const baseInss = r2(Math.max(0, provTrib - vFal - vDsrL - vAtr));
  /* INSS: soma com as férias do mês e abate o que já foi retido no recibo de férias */
  let inss=0, inssInfo=null;
  if(C.inss){ inssInfo=inssCalc(baseInss+ferBase,cfg.inss); inss=r2(Math.max(0, inssInfo.v-ferInss)); }
  D('201','INSS', inssInfo?inssInfo.eff.toFixed(2).replace('.',',')+'%':'', inss);
  let ir={v:0,base:0,pct:0,isento:true};
  if(C.irrf && cfg.irrf!==false){ ir=irrfCalc(baseInss, inss, +e.deps||0); }
  D('202','IRRF', ir.pct?ir.pct.toString().replace('.',',')+'%':'', ir.v);
  /* VT 6% (sobre o salário-base do mês, limitado ao VT recebido no dia 01) */
  const ben=benefits(state,empId,ym);
  const vtCost=ben?ben.vt:0;
  const vVt = (C.vtDesc && vtCost) ? D('210','Vale-transporte ('+cfg.vtPct+'%)', cfg.vtPct+'%', Math.min(vSal*(+cfg.vtPct)/100, vtCost)) : 0;
  const vaCost=ben?ben.va:0;
  const vVa = (+cfg.vaDescPct && vaCost && !pj) ? D('211','Vale-alimentação ('+cfg.vaDescPct+'%)', cfg.vaDescPct+'%', vaCost*(+cfg.vaDescPct)/100) : 0;
  const adv=advance(state,empId,ym);
  const vAdv = adv ? D('220','Adiantamento salarial (dia '+adv.date.slice(8)+'/'+adv.date.slice(5,7)+')', adv.pct+'%', adv.v) : 0;
  D('230','Vales','',sumK(ents,'vale','amount'));
  D('231','Consumo / quebra de caixa','',sumK(ents,'consumo','amount'));
  D('232','Pensão alimentícia','',sumK(ents,'pensao','amount'));
  D('239','Outros descontos','',sumK(ents,'outroD','amount'));
  const prov=r2(L.reduce((a,x)=>a+x.prov,0)), desc=r2(L.reduce((a,x)=>a+x.dsc,0));
  const liquido=r2(prov-desc);
  /* encargos da empresa */
  const fgtsPct=C.fgts||0;
  const fgts=r2(baseInss*fgtsPct/100);
  const patr = clt ? r2(baseInss*((+cfg.patronal||0)+(+cfg.rat||0)+(+cfg.terceiros||0))/100) : 0;
  const remun = remuneracao(e,cfg)+varSum+vDsr;
  const provFer = clt ? r2(remun/12*4/3) : 0, prov13 = clt ? r2(remun/12) : 0;
  const provFgts = r2((provFer+prov13)*fgtsPct/100);
  const custo = r2(prov + fgts + patr + (vtCost-vVt) + (vaCost-vVa) + provFer + prov13 + provFgts);
  return {e, ym, C, clt, pj, sal, dia, hora, adds, diasMes, diasTrab, diasFerias, rescisao, lines:L, prov, desc, liquido,
    baseInss, inss, inssInfo, ir, baseIrrf:ir.base, ferBase:r2(ferBase), ferInss:r2(ferInss),
    vt:vtCost, vtDesc:vVt, va:vaCost, vaDesc:vVa, adv:adv?adv.v:0, advInfo:adv, ben,
    variaveis:r2(varSum+vDsr), h50, h100, hNot, nFal, hAtr, nAtest:sumK(ents,'atestado'),
    fgts, fgtsPct, patr, provFer, prov13, provFgts, custo,
    payDate:salaryDate(ym,cfg), fgtsDate:fgtsDate(ym,cfg), ents};
}

/* ---------------- avos ---------------- */
/* avos do 13º no ano y: mês com 15+ dias de trabalho conta 1/12 */
function avos13(e,y,untilISO){
  let n=0; const det=[];
  for(let m=1;m<=12;m++){
    const ym=y+'-'+pad(m), first=ym+'-01', last=ym+'-'+pad(lastDay(ym));
    let a=first, b=last;
    if(e.admissao && e.admissao>a) a=e.admissao;
    if(untilISO && untilISO<b) b=untilISO;
    const dias = (a>b) ? 0 : diffDays(a,b)+1;
    const ok = dias>=15; if(ok) n++; det.push({m, dias, ok});
  }
  return {n:Math.min(12,n), det};
}
/* avos de férias proporcionais: meses do período aquisitivo; fração de 15+ dias conta 1/12 */
function avosPeriodo(startISO,endISO){
  if(!startISO||!endISO||endISO<startISO) return 0;
  let n=0, cur=startISO;
  while(n<12){
    const nxt=addMonthsISO(startISO,n+1);           /* início do próximo mês do período */
    const fimMes=addDays(nxt,-1);
    if(fimMes<=endISO){ n++; cur=nxt; continue; }
    const resto=diffDays(cur,endISO)+1;
    if(resto>=15) n++;
    break;
  }
  return Math.min(12,n);
}
/* art. 130: dias de férias conforme faltas injustificadas no período aquisitivo */
function vacationDaysByFaltas(f){ f=+f||0; if(f<=5) return 30; if(f<=14) return 24; if(f<=23) return 18; if(f<=32) return 12; return 0; }

/* períodos aquisitivos desde a admissão e o que já foi gozado */
function vacationPeriods(state,e,refISO){
  const out=[]; if(!e||!e.admissao) return out;
  refISO=refISO||isoOf(new Date());
  const taken=(state.vacations||[]).filter(v=>v.emp===e.id);
  for(let k=0;k<60;k++){
    const ini=addMonthsISO(e.admissao,12*k);
    if(ini>refISO) break;
    const fim=addDays(addMonthsISO(e.admissao,12*(k+1)),-1);
    const limite=addDays(addMonthsISO(e.admissao,12*(k+2)),-1);     /* fim do período concessivo */
    const dias=taken.filter(v=>v.periodStart===ini).reduce((a,v)=>a+(+v.days||0)+(+v.abonoDias||0),0);
    const completo=fim<refISO;
    const direito=e.feriasDireito&&e.feriasDireito[ini]!=null?+e.feriasDireito[ini]:30;
    out.push({k, ini, fim, limite, completo, gozados:dias, saldo:Math.max(0,direito-dias), direito,
      vencida: completo && dias<direito, dobro: completo && dias<direito && limite<refISO,
      venceEm: diffDays(refISO,limite)});
  }
  return out;
}

/* ---------------- FÉRIAS ---------------- */
/* vac: {emp, start, days, abonoDias, medias, adiant13, periodStart} */
function vacationCalc(state,vac){
  const cfg=state.cfg, e=(state.emps||[]).find(x=>x.id===vac.emp)||{};
  const C=contractOf(e);
  const remun=remuneracao(e,cfg)+(+vac.medias||0);
  const dias=+vac.days||0, ab=+vac.abonoDias||0;
  const valor=r2(remun/30*dias), terco=r2(valor/3);
  const abono=r2(remun/30*ab), tercoAb=r2(abono/3);
  const baseInss=r2(valor+terco);
  const inss=C.inss?inssCalc(baseInss,cfg.inss).v:0;
  const ir=(C.irrf && cfg.irrf!==false)?irrfCalc(baseInss,inss,+e.deps||0):{v:0,isento:true,base:0,pct:0};
  let adiant13=0; if(vac.adiant13){ adiant13=r2(remuneracao(e,cfg)/2); }
  const prov=r2(valor+terco+abono+tercoAb+adiant13), desc=r2(inss+ir.v);
  const end=addDays(vac.start,dias-1), volta=addDays(end,1);
  let pay=addDays(vac.start,-2); while(!isBizDay(pay,cfg)) pay=addDays(pay,-1);     /* art. 145: até 2 dias antes */
  const aviso=addDays(vac.start,-30);                                               /* art. 135: aviso 30 dias antes */
  const lines=[
    {cod:'301',desc:'Férias ('+dias+' dias)',ref:dias+'d',prov:valor,dsc:0},
    {cod:'302',desc:'1/3 constitucional de férias',ref:'',prov:terco,dsc:0},
    {cod:'303',desc:'Abono pecuniário ('+ab+' dias)',ref:ab+'d',prov:abono,dsc:0},
    {cod:'304',desc:'1/3 sobre abono pecuniário',ref:'',prov:tercoAb,dsc:0},
    {cod:'305',desc:'Adiantamento 1ª parcela 13º',ref:'50%',prov:adiant13,dsc:0},
    {cod:'201',desc:'INSS sobre férias',ref:'',prov:0,dsc:inss},
    {cod:'202',desc:'IRRF sobre férias',ref:ir.pct?ir.pct+'%':'',prov:0,dsc:ir.v}
  ].filter(x=>x.prov||x.dsc);
  return {e, remun:r2(remun), dias, ab, valor, terco, abono, tercoAb, adiant13, baseInss, inss, irrf:ir.v, ir, prov, desc,
    liquido:r2(prov-desc), end, volta, pay, aviso, fgts:r2(baseInss*(C.fgts||0)/100), lines};
}

/* ---------------- 13º SALÁRIO ---------------- */
function variableAvg(state,e,y,uptoM){
  let s=0, n=0;
  for(let m=1;m<=uptoM;m++){ const ym=y+'-'+pad(m); if(!activeIn(e,ym)) continue; const p=payroll(state,e.id,ym); if(!p) continue; s+=p.variaveis; n++; }
  return n? r2(s/n) : 0;
}
function thirteenth(state,empId,y){
  const cfg=state.cfg, e=(state.emps||[]).find(x=>x.id===empId);
  if(!e) return null; const C=contractOf(e);
  if(C.k==='pj'||C.k==='estagio') return null;
  if(e.admissao && +e.admissao.slice(0,4)>y) return null;
  const until = e.demissao && +e.demissao.slice(0,4)===y ? e.demissao : null;
  const av=avos13(e,y,until);
  const media=variableAvg(state,e,y,11);
  const base=r2(remuneracao(e,cfg)+media);
  const total=r2(base/12*av.n);
  const p1=r2(total/2);
  const paid1=(state.paid||{})[y+'-11|13a|'+empId];
  const inss=inssCalc(total,cfg.inss).v;
  const ir=cfg.irrf!==false?irrfCalc(total,inss,+e.deps||0):{v:0,isento:true,pct:0,base:0};
  const p2=r2(total-p1-inss-ir.v);
  let d1=y+'-11-30'; while(!isBizDay(d1,cfg)) d1=addDays(d1,-1);
  let d2=y+'-12-20'; while(!isBizDay(d2,cfg)) d2=addDays(d2,-1);
  return {e, y, avos:av.n, avDet:av.det, media, base, total, p1, inss, irrf:ir.v, ir, p2, d1, d2,
    fgts1:r2(p1*(C.fgts||0)/100), fgts2:r2((total-p1)*(C.fgts||0)/100), paid1:!!paid1,
    lines1:[{cod:'401',desc:'13º salário — 1ª parcela ('+av.n+'/12)',ref:av.n+'/12',prov:p1,dsc:0}],
    lines2:[{cod:'402',desc:'13º salário integral ('+av.n+'/12)',ref:av.n+'/12',prov:total,dsc:0},
      {cod:'403',desc:'(−) 1ª parcela já paga',ref:'',prov:0,dsc:p1},
      {cod:'201',desc:'INSS sobre 13º',ref:'',prov:0,dsc:inss},
      {cod:'202',desc:'IRRF sobre 13º',ref:ir.pct?ir.pct+'%':'',prov:0,dsc:ir.v}].filter(x=>x.prov||x.dsc)};
}

/* ---------------- FGTS ---------------- */
function fgtsEstimate(state,e,untilISO){
  /* depósitos estimados: 8% da remuneração por mês + 13º + 1/3 de férias (≈ 8% × 13,33 salários/ano) */
  const cfg=state.cfg, C=contractOf(e); if(!C.fgts||!e.admissao) return {v:0, meses:0, estimado:true};
  const ref=untilISO||isoOf(new Date());
  if(e.fgtsSaldo!=null && e.fgtsSaldo!=='' && e.fgtsData){
    const m=Math.max(0, monthsBetween(e.fgtsData,ref));
    return {v:r2(+e.fgtsSaldo + remuneracao(e,cfg)*C.fgts/100*m*(13.333/12)), meses:m, estimado:m>0, informado:+e.fgtsSaldo, desde:e.fgtsData};
  }
  const m=Math.max(0, monthsBetween(e.admissao,ref));
  return {v:r2(remuneracao(e,cfg)*C.fgts/100*m*(13.333/12)), meses:m, estimado:true};
}
function monthsBetween(a,b){ const A=dOf(a), B=dOf(b); return (B.getFullYear()-A.getFullYear())*12+(B.getMonth()-A.getMonth())+(B.getDate()>=A.getDate()?0:-1); }
function yearsBetween(a,b){ return Math.floor(monthsBetween(a,b)/12); }

/* ---------------- RESCISÃO ---------------- */
const TERM_TYPES={
  sem_justa:  {k:'sem_justa',  label:'Dispensa sem justa causa (empresa)', aviso:'empresa', multa:40, saque:true, seguro:true, prop:true},
  pedido:     {k:'pedido',     label:'Pedido de demissão (funcionário)',    aviso:'empregado', multa:0, saque:false, seguro:false, prop:true},
  justa_causa:{k:'justa_causa',label:'Dispensa por justa causa (art. 482)', aviso:'nenhum', multa:0, saque:false, seguro:false, prop:false},
  acordo:     {k:'acordo',     label:'Acordo entre as partes (art. 484-A)', aviso:'metade', multa:20, saque:true, seguro:false, prop:true, saquePct:80},
  fim_exp:    {k:'fim_exp',    label:'Término do contrato de experiência',  aviso:'nenhum', multa:0, saque:true, seguro:false, prop:true},
  ant_emp:    {k:'ant_emp',    label:'Experiência: empresa encerra antes (art. 479)', aviso:'nenhum', multa:40, saque:true, seguro:false, prop:true, art479:true},
  ant_func:   {k:'ant_func',   label:'Experiência: funcionário sai antes (art. 480)', aviso:'nenhum', multa:0, saque:false, seguro:false, prop:true, art480:true}
};
/* t: {emp, date, type, avisoMode:'indenizado'|'trabalhado'|'dispensado'|'descontar', fgtsSaldo, ferVencDias, feriasFaltas,
       medias, adiant13Pago, descontoAdiant (bool), outrosDesc, outrosProv, expEnd} */
function terminationCalc(state,t){
  const cfg=state.cfg, e0=(state.emps||[]).find(x=>x.id===t.emp);
  if(!e0||!t.date) return null;
  const e=Object.assign({},e0,{demissao:t.date});
  const T=TERM_TYPES[t.type]||TERM_TYPES.sem_justa, C=contractOf(e);
  const remun=r2(remuneracao(e,cfg)+(+t.medias||0)), dia=remun/30, salDia=(+e.salary||0)/30;
  const anos=e.admissao?yearsBetween(e.admissao,t.date):0;
  /* aviso prévio */
  const avisoTot = Math.min(90, 30+3*anos);
  let avisoInd=0, avisoTrab=0, avisoDesc=0, mode=t.avisoMode||'indenizado';
  if(T.aviso==='empresa'){
    if(mode==='trabalhado'){ avisoTrab=30; avisoInd=avisoTot-30; } else { avisoInd=avisoTot; }
  }else if(T.aviso==='metade'){ avisoInd = mode==='trabalhado'?0:Math.floor(avisoTot/2); }
  else if(T.aviso==='empregado'){ if(mode==='descontar') avisoDesc=30; }
  /* data projetada (aviso indenizado conta como tempo de serviço — art. 487 §1º) */
  const proj = avisoInd ? addDays(t.date, avisoInd) : t.date;
  /* saldo de salário + lançamentos do mês */
  const ym=ymOf(t.date);
  const pr=payroll(Object.assign({},state,{emps:(state.emps||[]).map(x=>x.id===e.id?e:x)}),e.id,ym);
  const L=[]; const P=(cod,desc,ref,v,o)=>{ v=r2(v); if(v) L.push(Object.assign({cod,desc,ref,prov:v,dsc:0},o||{})); return v; };
  const D=(cod,desc,ref,v,o)=>{ v=r2(v); if(v) L.push(Object.assign({cod,desc,ref,prov:0,dsc:v},o||{})); return v; };
  /* verbas do mês vêm do cálculo da folha (saldo, extras, DSR, faltas); impostos são refeitos aqui */
  let saldoBase=0;
  if(pr){ pr.lines.forEach(x=>{
    if(['201','202','210','211'].indexOf(x.cod)>=0) return;
    if(x.cod==='001'){ P('050','Saldo de salário', x.ref, x.prov); saldoBase+=x.prov; return; }
    if(x.cod==='220'){ if(t.descontoAdiant!==false) D('220',x.desc,x.ref,x.dsc); return; }
    if(x.prov){ P(x.cod,x.desc,x.ref,x.prov,{trib:x.trib}); if(x.trib!==false) saldoBase+=x.prov; }
    if(x.dsc){ D(x.cod,x.desc,x.ref,x.dsc); if(['101','102','103'].indexOf(x.cod)>=0) saldoBase-=x.dsc; }
  }); }
  const vAvisoInd = P('060','Aviso prévio indenizado ('+avisoInd+' dias)', avisoInd+'d', dia*avisoInd);
  /* 13º proporcional */
  let av13=0, v13=0, v13ind=0;
  if(T.prop && C.k!=='pj' && C.k!=='estagio'){
    av13=avos13(e,+t.date.slice(0,4),proj).n;
    const avSem=avos13(e,+t.date.slice(0,4),t.date).n;
    v13=P('070','13º salário proporcional ('+avSem+'/12)', avSem+'/12', remun/12*avSem);
    v13ind=P('071','13º sobre aviso indenizado ('+(av13-avSem)+'/12)', (av13-avSem)+'/12', remun/12*(av13-avSem));
  }
  const adiant13=+t.adiant13Pago||0;
  if(adiant13) D('404','(−) 1ª parcela do 13º já paga','',adiant13);
  /* férias */
  const per=vacationPeriods(state,e,t.date);
  let ferVencDias = (t.ferVencDias!=null && t.ferVencDias!=='') ? +t.ferVencDias : per.filter(p=>p.completo).reduce((a,p)=>a+p.saldo,0);
  const dobroDias = (t.ferVencDias!=null && t.ferVencDias!=='') ? 0 : per.filter(p=>p.dobro).reduce((a,p)=>a+p.saldo,0);
  let vFV=0,vFV3=0,vFD=0,vFD3=0,vFP=0,vFP3=0, avFer=0;
  if(C.k!=='pj'){
    vFV=P('080','Férias vencidas ('+ferVencDias+' dias)', ferVencDias+'d', dia*ferVencDias,{trib:false});
    vFV3=P('081','1/3 sobre férias vencidas','',vFV/3,{trib:false});
    if(dobroDias && t.dobro!==false){ vFD=P('082','Férias em dobro — fora do prazo (art. 137)', dobroDias+'d', dia*dobroDias,{trib:false}); vFD3=P('083','1/3 sobre dobra de férias','',vFD/3,{trib:false}); }
    if(T.prop){
      const cur=per.filter(p=>!p.completo).pop();
      const ini=cur?cur.ini:(e.admissao||t.date);
      avFer=avosPeriodo(ini,proj);
      const diasDir=vacationDaysByFaltas(t.feriasFaltas);
      vFP=P('084','Férias proporcionais ('+avFer+'/12)', avFer+'/12', remun/30*diasDir/12*avFer,{trib:false});
      vFP3=P('085','1/3 sobre férias proporcionais','',vFP/3,{trib:false});
    }
  }
  /* indenizações de contrato por prazo (experiência) */
  let v479=0, v480=0;
  if((T.art479||T.art480) && t.expEnd && t.expEnd>t.date){
    const rest=diffDays(t.date,t.expEnd);
    if(T.art479) v479=P('090','Indenização art. 479 CLT (50% de '+rest+' dias)', rest+'d', salDia*rest/2,{trib:false});
    if(T.art480) v480=D('091','Indenização art. 480 CLT (prejuízo, até 50% de '+rest+' dias)', rest+'d', salDia*rest/2);
  }
  if(avisoDesc) D('061','Aviso prévio não cumprido (art. 487 §2º)', '30d', (+e.salary||0)/30*30);
  P('095','Outros proventos','',+t.outrosProv||0);
  D('239','Outros descontos','',+t.outrosDesc||0);
  /* impostos: saldo (INSS+IRRF), 13º separado (INSS+IRRF exclusivo). Aviso indenizado e férias indenizadas: isentos */
  const baseSaldo=r2(Math.max(0,saldoBase));
  const inssS = C.inss ? inssCalc(baseSaldo,cfg.inss).v : 0;
  const b13=r2(v13+v13ind);
  const inss13= C.inss ? inssCalc(b13,cfg.inss).v : 0;
  const irS = (C.irrf&&cfg.irrf!==false) ? irrfCalc(baseSaldo,inssS,+e.deps||0) : {v:0,pct:0};
  const ir13= (C.irrf&&cfg.irrf!==false) ? irrfCalc(b13,inss13,+e.deps||0) : {v:0,pct:0};
  D('201','INSS sobre saldo de salário','',inssS);
  D('205','INSS sobre 13º salário','',inss13);
  D('202','IRRF sobre saldo de salário', irS.pct?irS.pct+'%':'', irS.v);
  D('206','IRRF sobre 13º salário', ir13.pct?ir13.pct+'%':'', ir13.v);
  const prov=r2(L.reduce((a,x)=>a+x.prov,0)), desc=r2(L.reduce((a,x)=>a+x.dsc,0));
  /* FGTS */
  const fp=(C.fgts||0)/100;
  const fgtsMes=r2(baseSaldo*fp), fgtsAviso=r2(vAvisoInd*fp), fgts13=r2(b13*fp);
  const est=fgtsEstimate(state,e,t.date);
  const saldoFgts = (t.fgtsSaldo!=null && t.fgtsSaldo!=='') ? +t.fgtsSaldo : est.v;
  const baseMulta = r2(saldoFgts+fgtsMes+fgtsAviso+fgts13);
  const multa = r2(baseMulta*(T.multa||0)/100);
  let pay=addDays(t.date,10);                                        /* art. 477 §6º: 10 dias corridos */
  return {e, T, C, date:t.date, proj, anos, avisoTot, avisoInd, avisoTrab, avisoDesc, remun, lines:L, prov, desc, liquido:r2(prov-desc),
    av13, avFer, ferVencDias, dobroDias, baseSaldo, inssS, inss13, irS:irS.v, ir13:ir13.v,
    fgtsMes, fgtsAviso, fgts13, fgtsGuia:r2(fgtsMes+fgtsAviso+fgts13), saldoFgts:r2(saldoFgts), fgtsEstimado:(t.fgtsSaldo==null||t.fgtsSaldo==='')&&est.estimado,
    baseMulta, multa, multaPct:T.multa||0, saque:T.saque, saquePct:T.saquePct||100, seguro:T.seguro,
    saqueValor: T.saque ? r2((baseMulta)*(T.saquePct||100)/100 + multa) : 0,
    payBy:pay, v479, v480};
}

/* ---------------- hora extra avulsa ---------------- */
function overtime(e,cfg,hours,pct){
  const h=hourValue(e,cfg), v=r2(h*(+hours||0)*(1+(+pct||0)/100));
  return {hora:r2(h), v};
}

/* ---------------- valor por extenso (recibos) ---------------- */
function extenso(v){
  v=r2(Math.abs(+v||0));
  const U=['','um','dois','três','quatro','cinco','seis','sete','oito','nove','dez','onze','doze','treze','quatorze','quinze','dezesseis','dezessete','dezoito','dezenove'];
  const D=['','','vinte','trinta','quarenta','cinquenta','sessenta','setenta','oitenta','noventa'];
  const C=['','cento','duzentos','trezentos','quatrocentos','quinhentos','seiscentos','setecentos','oitocentos','novecentos'];
  const tri=n=>{ if(n===0) return ''; if(n===100) return 'cem'; const c=Math.floor(n/100), r=n%100, p=[];
    if(c) p.push(C[c]); if(r){ if(r<20) p.push(U[r]); else { p.push(D[Math.floor(r/10)]+(r%10?' e '+U[r%10]:'')); } } return p.join(' e '); };
  const inteiro=Math.floor(v), cent=Math.round((v-inteiro)*100);
  const grupos=[]; let n=inteiro; while(n>0){ grupos.push(n%1000); n=Math.floor(n/1000); }
  const nomes=[['',''],['mil','mil'],['milhão','milhões'],['bilhão','bilhões']];
  const partes=[];
  for(let i=grupos.length-1;i>=0;i--){ const g=grupos[i]; if(!g) continue;
    let s = (i===1 && g===1) ? 'mil' : tri(g)+(i?' '+(g===1?nomes[i][0]:nomes[i][1]):'');
    partes.push({s, g, i}); }
  let txt='';
  partes.forEach((p,idx)=>{ if(idx===0){ txt=p.s; return; }
    const last=idx===partes.length-1; const sep=(last && (p.g<100 || p.g%100===0)) ? ' e ' : (p.i>=1?', ':' ');
    txt+=sep+p.s; });
  if(inteiro){ const mi=(inteiro>=1e6 && inteiro%1e6===0); txt+=(mi?' de':'')+(inteiro===1?' real':' reais'); }
  if(cent){ txt+=(inteiro?' e ':'')+tri(cent)+(cent===1?' centavo':' centavos'); }
  return txt||'zero real';
}

const API={MIN_WAGE, INSS_2026, IRRF_TABLE, IRRF_DEP, IRRF_SIMPL, DEFAULT_CFG, CONTRACTS, KINDS, TERM_TYPES,
  pad, r2, dOf, isoOf, addDays, addMonthsISO, ymOf, nextYM, prevYM, lastDay, daysOf, wd, diffDays, monthsBetween, yearsBetween,
  easter, natHolidays, holidayName, isHoliday, isBizDay, nthBizDay, shiftDay, benefitDate, advDate, salaryDate, fgtsDate, dsrDays,
  inssCalc, irrfCalc, contractOf, isCLT, activeIn, fixedAdds, remuneracao, hourValue, workDaysFor,
  vacationDaysIn, vacationsIn, entriesOf, benefits, advance, payroll, avos13, avosPeriodo, vacationDaysByFaltas, vacationPeriods,
  vacationCalc, vtLostDays, thirteenth, fgtsEstimate, terminationCalc, overtime, extenso};
if(typeof module!=='undefined' && module.exports) module.exports=API; else root.DPCalc=API;
})(typeof window!=='undefined'?window:globalThis);
