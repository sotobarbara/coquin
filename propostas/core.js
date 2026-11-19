/* Coquin · propostas · núcleo compartilhado entre o gerador (index.html) e o formulário público (orcamento.html).
 * Cálculo, textos e documento da proposta. As funções usam a variável global S (preços/ajustes) que cada página define. */
'use strict';
const TIPOS=[
  {id:'casamento', nome:'Casamento', capa:'Uma sobremesa à altura do grande dia',
   msg:'Que alegria fazer parte desse dia! Preparamos uma proposta para levar o gelato tailandês da Coquin, servido na quenga do coco, para o casamento de vocês: um momento leve, bonito e diferente, que os convidados vão lembrar.'},
  {id:'intimo', nome:'Casamento íntimo', capa:'Um gesto doce para quem é mais próximo',
   msg:'Casamentos íntimos pedem detalhes especiais. Preparamos uma proposta para servir o gelato tailandês da Coquin na quenga do coco, com atendimento próximo e caprichado para cada convidado.'},
  {id:'aniversario', nome:'Aniversário', capa:'A sobremesa que vira assunto da festa',
   msg:'Obrigado por pensar na Coquin para essa comemoração! Preparamos uma proposta para levar o nosso gelato tailandês, servido na quenga do coco, para a sua festa.'},
  {id:'15anos', nome:'15 anos', capa:'Uma sobremesa tão marcante quanto a festa',
   msg:'Uma festa de 15 anos merece uma sobremesa à altura. Preparamos uma proposta para levar o gelato tailandês da Coquin, servido na quenga do coco, para essa noite.'},
  {id:'corporativo', nome:'Corporativo', capa:'Uma experiência que a sua equipe e seus clientes vão lembrar',
   msg:'Obrigado pelo contato! Preparamos uma proposta para levar a experiência Coquin ao seu evento: gelato tailandês artesanal, sem lactose e sem glúten, servido na quenga do coco por uma equipe treinada.'},
  {id:'formatura', nome:'Formatura', capa:'Para celebrar a conquista com leveza',
   msg:'Parabéns pela conquista! Preparamos uma proposta para levar o gelato tailandês da Coquin, servido na quenga do coco, para a festa de formatura.'},
  {id:'outro', nome:'Outro', capa:'Gelato tailandês servido na quenga do coco',
   msg:'Obrigado pelo contato! Preparamos uma proposta para levar o gelato tailandês da Coquin, servido na quenga do coco, para o seu evento.'}
];
const MODOS=[
  {id:'open', nome:'Open (por convidado)', hint:'O contratante paga e os convidados se servem à vontade dentro da quantidade estimada.'},
  {id:'pacote', nome:'Pacote fechado', hint:'O contratante compra uma quantidade fechada de gelatos.'},
  {id:'local', nome:'Venda no local', hint:'Os convidados compram na hora (preço de balcão). O contratante paga só a taxa de presença e o deslocamento.'}
];
const STATUS=[{id:'rascunho',nome:'Rascunho'},{id:'enviada',nome:'Enviada'},{id:'aprovada',nome:'Aprovada'},{id:'recusada',nome:'Recusada'}];

/* Valores da operação: gelato 3 bolas R$ 35 · 2 bolas R$ 30 · R$ 1/km saindo do Centro · diária R$ 150 por pessoa (mín. 2).
   Mínimo do evento R$ 4.000. O resto (horas, atendentes por convidado, adicionais) é exemplo: confira em Ajustes. */
const DEFAULT_SETTINGS={
  precoGelato:35,                                      // 3 bolas
  preco2:30,                                           // 2 bolas
  faixas:[],                                           // desconto por volume (opcional): a partir de X gelatos, preço da 3 bolas
  minimo:4000,                                         // valor mínimo do evento (0 = sem mínimo); fds ~400 gelatos, dia fraco ~150
  taxaPresenca:0,                                      // venda no local: taxa além de equipe e deslocamento
  diaria:150,                                          // diária cobrada por pessoa da equipe
  horasInclusas:4,                                     // horas de serviço cobertas pela diária
  convPorAtendente:100,                                // 1 pessoa a cada N convidados
  minAtendentes:2,
  horaExtra:0,                                         // por hora adicional, por pessoa (0 = não cobra)
  consumoPadrao:1,
  precoKm:1,                                           // R$ por km rodado
  idaVolta:true,                                       // cobra ida e volta
  origem:'Rua Dom Joaquim, 33, Centro, Fortaleza - CE',
  origemLat:-3.7275, origemLon:-38.5275,               // Centro de Fortaleza (ajuste em Ajustes se quiser precisão)
  deslocamentos:[{nome:'Fortaleza',preco:0}],          // (legado) usado só quando não há km
  extras:[
    {id:'tag',nome:'Tag personalizada no coco',desc:'Nome dos noivos / logo da empresa',preco:2.5,unid:'gelato',on:false},
    {id:'carrinho',nome:'Carrinho decorado com o tema do evento',desc:'Flores e identidade visual combinadas',preco:250,unid:'fixo',on:false},
    {id:'agua',nome:'Água mineral',desc:'',preco:4,unid:'unidade',on:false},
    {id:'refri',nome:'Refrigerante lata',desc:'',preco:7,unid:'unidade',on:false}
  ],
  sinal:50,
  validadeDias:15,
  inclusos:['Gelato tailandês artesanal servido na quenga do coco natural','Sem lactose e sem glúten','Finalização com coco tostado','Carrinho Coquin no local do evento','Equipe uniformizada e treinada','Montagem, serviço e desmontagem','Utensílios, guardanapos e descarte','Transporte com controle de temperatura'],
  condicoes:['Reserva da data com {sinal}% de sinal; o restante até 3 dias antes do evento.','Pagamento por Pix, transferência ou cartão.','O contratante disponibiliza um ponto de energia próximo ao carrinho e acesso para montagem 1h antes do serviço.','Quantidade final de convidados confirmada até 7 dias antes.'],
  custoGelato:0,                                       // custo de insumos por gelato (coco + sorvete + embalagem)
  custoAtendenteHora:0,                                // (legado)
  custoDiaria:150,                                     // diária paga a cada pessoa da equipe
  custoKm:0,
  whatsapp:'(85) 99971-9276', email:'coquingelato@gmail.com', instagram:'@coquingelato',
  empresa:'Coquin Comércio de Alimentos LTDA',
  // formulário público (orcamento.html)
  mostrarValor:'faixa',                                // 'exato' | 'faixa' | 'oculto'
  faixaPct:10,                                         // faixa = total −X% a +X%
  ressalva:'Esta é uma pré-proposta automática, feita a partir das suas respostas. Ela ainda não reserva a data e não é o valor final: disponibilidade, valores e detalhes são confirmados e podem ser negociados com o nosso comercial.',
  seq:1, revisado:false, v:3
};
/* o que o formulário público pode ver (custos internos ficam de fora) */
const PUBLIC_KEYS=['v','precoGelato','preco2','diaria','precoKm','idaVolta','origem','origemLat','origemLon','faixas','minimo','taxaPresenca','horasInclusas','convPorAtendente','minAtendentes','horaExtra','consumoPadrao','deslocamentos','extras','sinal','validadeDias','inclusos','condicoes','whatsapp','email','instagram','empresa','mostrarValor','faixaPct','ressalva'];
const INTERNAL_KEYS=['custoGelato','custoAtendenteHora','custoDiaria','custoKm','seq'];
const pick=(o,keys)=>{const r={};keys.forEach(k=>{if(o[k]!==undefined)r[k]=o[k]});return r};

/* Supabase: mesmo projeto dos outros apps (a anon key é pública por design; RLS protege os dados) */
const SUPABASE_URL='https://anrfipczginloozmatht.supabase.co';
const SUPABASE_ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFucmZpcGN6Z2lubG9vem1hdGh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5ODk3NzEsImV4cCI6MjEwMDU2NTc3MX0.Je1pF13l5Lael0EZkDC6o1Qk2XJWcusmX_ElcvdPx40';



/* ---------------- utilidades ---------------- */
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>{const n=parseFloat(String(v??'').replace(',','.'));return isFinite(n)?n:0};
const BRL=(v,cents)=>{const c=cents??(Math.round(v)!==Math.round(v*100)/100);return 'R$ '+Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:c?2:0,maximumFractionDigits:c?2:0})};
const MESES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const DIAS=['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
function fmtData(iso,curta){ if(!iso) return ''; const [y,m,d]=iso.split('-').map(Number); const dt=new Date(y,m-1,d);
  return curta? `${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}` : `${DIAS[dt.getDay()]}, ${d} de ${MESES[m-1]} de ${y}`; }
const hojeISO=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
function addDias(iso,n){const [y,m,d]=iso.split('-').map(Number);const dt=new Date(y,m-1,d+n);return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`}
const uid=()=>Math.random().toString(36).slice(2,10);
const plural=(n,s,p)=>`${n.toLocaleString('pt-BR')} ${n===1?s:(p||s+'s')}`;

/* ---------------- cálculo ---------------- */
function precoUnit(qtd,tam){ let p=S.precoGelato; [...(S.faixas||[])].filter(f=>f.min>0&&f.preco>0).sort((a,b)=>a.min-b.min).forEach(f=>{if(qtd>=f.min)p=f.preco});
  return String(tam)==='2'? Math.max(0,p-(S.precoGelato-(S.preco2||S.precoGelato))) : p; }
const TAMANHOS=[{id:'3',nome:'3 bolas'},{id:'2',nome:'2 bolas'}];
const tamNome=t=>String(t)==='2'?'2 bolas':'3 bolas';
function calc(p){
  const conv=Math.max(0,Math.round(num(p.convidados)));
  const tipo=TIPOS.find(t=>t.id===p.tipo)||TIPOS[0];
  const autoAt=Math.max(S.minAtendentes||1,Math.ceil(conv/(S.convPorAtendente||80))||0);
  const atend=num(p.atendentes)>0?Math.round(num(p.atendentes)):autoAt;
  const horas=num(p.horas)>0?num(p.horas):S.horasInclusas;
  let gelatos=0; if(p.modo==='open') gelatos=Math.ceil(conv*(num(p.consumo)||S.consumoPadrao)); else if(p.modo==='pacote') gelatos=Math.round(num(p.qtdGelatos));
  const L=[];
  let unit=0;
  if(p.modo==='local'){
    if(S.taxaPresenca>0) L.push({d:'Taxa de presença Coquin',s:`Gelato vendido aos convidados no local (3 bolas ${BRL(S.precoGelato)} · 2 bolas ${BRL(S.preco2||S.precoGelato)})`,q:1,u:S.taxaPresenca,t:S.taxaPresenca});
  } else if(gelatos>0){
    unit=precoUnit(gelatos,p.tamanho);
    const sub=p.modo==='open'?`Estimativa de ${String(num(p.consumo)||S.consumoPadrao).replace('.',',')} por convidado · ${plural(conv,'convidado')}`:'Quantidade fechada';
    L.push({d:`Gelato Coquin ${tamNome(p.tamanho)} na quenga do coco`,s:sub,q:gelatos,u:unit,t:gelatos*unit,gel:true});
  }
  if(S.diaria>0) L.push({d:`Equipe Coquin (${plural(atend,'pessoa')})`,s:`Diária de ${BRL(S.diaria)} por pessoa · até ${S.horasInclusas}h de serviço`+(p.modo==='local'?' · os convidados compram o gelato no local':''),q:atend,u:S.diaria,t:atend*S.diaria});
  const extraH=Math.max(0,horas-S.horasInclusas);
  if(extraH>0&&S.horaExtra>0) L.push({d:'Horas adicionais de serviço',s:`${extraH.toLocaleString('pt-BR')}h além das ${S.horasInclusas}h inclusas · ${plural(atend,'atendente')}`,q:extraH*atend,u:S.horaExtra,t:extraH*atend*S.horaExtra,qLbl:`${extraH.toLocaleString('pt-BR')}h × ${atend}`});
  const km=Math.round(num(p.km)*10)/10;
  let desl=null;
  if(km>0){ const kmCob=Math.round(km*(S.idaVolta?2:1)); desl={nome:`${km.toLocaleString('pt-BR')} km`,km,kmCob};
    if(S.precoKm>0) L.push({d:'Deslocamento',s:`${km.toLocaleString('pt-BR')} km do Centro de Fortaleza${S.idaVolta?' · ida e volta':''}`,q:kmCob,u:S.precoKm,t:kmCob*S.precoKm,qLbl:`${kmCob} km`}); }
  else { desl=(S.deslocamentos||[])[p.deslocamento]||null; if(desl&&desl.preco>0) L.push({d:'Deslocamento',s:desl.nome,q:1,u:desl.preco,t:desl.preco}); }
  S.extras.forEach(x=>{const sel=p.extras[x.id]; if(!sel||!sel.on) return; let q=1;
    if(x.unid==='gelato') q=p.modo==='local'?0:gelatos; else if(x.unid==='convidado') q=conv; else if(x.unid==='unidade') q=Math.max(0,Math.round(num(sel.q)));
    if(q>0) L.push({d:x.nome,s:x.desc,q,u:x.preco,t:q*x.preco}); });
  let sub=L.reduce((a,l)=>a+l.t,0);
  let ajusteMin=0;
  if(p.modo!=='local' && gelatos>0 && S.minimo>0 && sub<S.minimo){ ajusteMin=S.minimo-sub; L.push({d:'Complemento para o valor mínimo do evento',s:`Valor mínimo para eventos: ${BRL(S.minimo)}`,q:1,u:ajusteMin,t:ajusteMin}); sub=S.minimo; }
  const descPct=Math.min(100,Math.max(0,num(p.desconto)));
  const desc=Math.round(sub*descPct)/100;
  const total=sub-desc;
  // interno
  const custoIns=(p.modo==='local'?Math.ceil(conv*(num(p.consumo)||S.consumoPadrao)*0.5):gelatos)*S.custoGelato; // venda no local: estimativa de 50% de adesão
  const custoEq=atend*(S.custoDiaria||0)+atend*horas*(S.custoAtendenteHora||0);
  const custoKm=(desl&&desl.kmCob?desl.kmCob:0)*(S.custoKm||0);
  const custo=custoIns+custoEq+custoKm;
  return {conv,tipo,atend,autoAt,horas,gelatos,unit,km,L,sub,descPct,desc,total,ajusteMin,custo,custoIns,custoEq,custoKm,lucro:total-custo,porConv:conv?total/conv:0,desl};
}

/* ---------------- documento ---------------- */
function condicoes(){ return S.condicoes.filter(Boolean).map(c=>c.replace('{sinal}',S.sinal)); }
function docHTML(p,c,snap){
  const st=snap||S, t=c.tipo;
  const titulo=p.nomeEvento||(t.id==='outro'?'Seu evento':`${t.nome}${p.cliente?' · '+p.cliente:''}`);
  const validade=addDias(p.criadaEm||hojeISO(),st.validadeDias);
  const msg=(p.mensagem||t.msg).trim();
  const fq=l=>l.qLbl||(l.q===1&&!l.gel?'—':l.q.toLocaleString('pt-BR'));
  const inc=[...st.inclusos];
  if(c.atend) inc.splice(Math.min(5,inc.length),0,`${plural(c.atend,'atendente')} durante ${c.horas.toLocaleString('pt-BR')}h de serviço`);
  return `<article class="doc">
  <div class="cover">
    <div class="txt">
      <img src="img/logo-coquin-oficial-branca.png" alt="Coquin Gelato">
      <div class="kick">Proposta para ${esc(t.nome.toLowerCase())}</div>
      <h1>${esc(titulo)}</h1>
      <div class="meta">
        ${p.cliente?`<span>Para: ${esc(p.cliente)}</span>`:''}
        ${p.data?`<span>${esc(fmtData(p.data))}${p.horario?' · a partir das '+esc(p.horario):''}</span>`:''}
        ${p.local?`<span>${esc(p.local)}</span>`:''}
      </div>
    </div>
    <div class="ph"><img src="img/coco-produto.webp" alt="Gelato Coquin servido na quenga do coco"><span class="num">${esc(p.numero||'Rascunho')}</span></div>
  </div>
  <div class="pg">
    <p class="msg">${esc(msg)}</p>
    <div class="facts avoid">
      <div><small>Convidados</small><b>${c.conv?c.conv.toLocaleString('pt-BR'):'—'}</b></div>
      <div><small>${p.modo==='local'?'Formato':'Gelatos'}</small><b>${p.modo==='local'?'Venda no local':(c.gelatos?c.gelatos.toLocaleString('pt-BR')+' · '+tamNome(p.tamanho):'—')}</b></div>
      <div><small>Serviço</small><b>${c.horas.toLocaleString('pt-BR')}h</b></div>
      <div><small>Equipe</small><b>${plural(c.atend,'atendente')}</b></div>
    </div>

    <div class="sec avoid">
      <h3>O que está incluso</h3>
      <ul class="inc">${inc.map(i=>`<li>${esc(i)}</li>`).join('')}</ul>
    </div>

    <div class="sec avoid">
      <h3>Investimento</h3>
      <table class="inv">
        <thead><tr><th>Item</th><th class="r">Qtd.</th><th class="r">Valor</th><th class="r">Total</th></tr></thead>
        <tbody>
          ${c.L.map(l=>`<tr><td>${esc(l.d)}${l.s?`<small>${esc(l.s)}</small>`:''}</td><td class="r">${fq(l)}</td><td class="r">${BRL(l.u)}</td><td class="r">${BRL(l.t)}</td></tr>`).join('')||'<tr><td colspan="4" style="color:var(--muted)">Preencha convidados ou quantidade para calcular.</td></tr>'}
          ${c.desc>0?`<tr class="disc"><td>Desconto de ${String(c.descPct).replace('.',',')}%${p.descontoMotivo?`<small>${esc(p.descontoMotivo)}</small>`:''}</td><td class="r"></td><td class="r"></td><td class="r">− ${BRL(c.desc)}</td></tr>`:''}
        </tbody>
      </table>
      <div class="tot">
        <div><small>Total do investimento</small><div class="v">${BRL(c.total)}</div></div>
        ${c.conv&&c.total?`<div class="pp">por convidado<b>${BRL(c.porConv,true)}</b></div>`:''}
      </div>
    </div>

    ${p.obs?`<div class="sec avoid"><h3>Observações</h3><p style="margin:0;white-space:pre-line">${esc(p.obs)}</p></div>`:''}

    <div class="sec">
      <h3>Condições</h3>
      <ul class="cond">${condicoes().map(x=>`<li>${esc(x)}</li>`).join('')}<li>Proposta válida até ${esc(fmtData(validade,true))}. A data só fica garantida após a reserva.</li></ul>
    </div>

    ${p.assinatura?`<div class="sign avoid"><div>${esc(p.cliente||'Contratante')}</div><div>${esc(st.empresa)}</div></div>`:''}

    <div class="foot">
      <img src="img/logo-coquin-oficial.png" alt="Coquin Gelato">
      <span>${esc(st.whatsapp)} · ${esc(st.email)} · ${esc(st.instagram)}</span>
    </div>
  </div>
</article>`;
}

function textoWhats(p,c){
  const t=c.tipo, linhas=[];
  linhas.push(`*Proposta Coquin · ${p.nomeEvento||t.nome}*${p.numero?` (${p.numero})`:''}`);
  linhas.push('');
  const info=[];
  if(p.data) info.push(`📅 ${fmtData(p.data)}${p.horario?', a partir das '+p.horario:''}`);
  if(p.local) info.push(`📍 ${p.local}`);
  if(c.conv) info.push(`👥 ${plural(c.conv,'convidado')}`);
  linhas.push(...info); if(info.length) linhas.push('');
  linhas.push('🥥 *Gelato tailandês servido na quenga do coco*, sem lactose e sem glúten, com carrinho Coquin, equipe uniformizada'+(c.atend?` (${plural(c.atend,'atendente')})`:'')+` e ${c.horas.toLocaleString('pt-BR')}h de serviço.`);
  linhas.push('');
  c.L.forEach(l=>linhas.push(`• ${l.d}${l.q>1?` (${l.qLbl||l.q.toLocaleString('pt-BR')} × ${BRL(l.u)})`:''}: ${BRL(l.t)}`));
  if(c.desc>0) linhas.push(`• Desconto ${String(c.descPct).replace('.',',')}%: − ${BRL(c.desc)}`);
  linhas.push('');
  linhas.push(`*Total: ${BRL(c.total)}*`+(c.conv&&c.total?` (${BRL(c.porConv,true)} por convidado)`:''));
  linhas.push('');
  linhas.push(`Reserva com ${S.sinal}% de sinal. Proposta válida até ${fmtData(addDias(p.criadaEm||hojeISO(),S.validadeDias),true)}.`);
  return linhas.join('\n');
}


/* ---------------- endereço do evento e distância (km) ----------------
   Busca: Photon (OpenStreetMap, feito para autocompletar). Rota de carro: OSRM.
   Se a rota falhar, usa a linha reta × 1,3 (aproximação de ruas). */
const GEO={
  async buscar(q){
    if(!q||q.trim().length<4) return [];
    const u=`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lat=${S.origemLat}&lon=${S.origemLon}&bbox=-41.6,-7.9,-37.2,-2.7`;
    const r=await fetch(u); if(!r.ok) throw new Error('busca '+r.status); const j=await r.json();
    return (j.features||[]).map(f=>{const p=f.properties||{};const [lon,lat]=f.geometry.coordinates;
      const l1=[p.name,p.street&&p.street!==p.name?p.street+(p.housenumber?', '+p.housenumber:''):''].filter(Boolean).join(' · ');
      const l2=[p.district||p.locality,p.city||p.county,p.state].filter(Boolean).join(', ');
      return {lat,lon,l1:l1||l2,l2,label:[l1,l2].filter(Boolean).join(' - ')};}).filter(x=>x.l1);
  },
  linha(a,b){const R=6371,r=x=>x*Math.PI/180,dl=r(b.lat-a.lat),dn=r(b.lon-a.lon);const h=Math.sin(dl/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(h));},
  async km(dest){
    const o={lat:+S.origemLat,lon:+S.origemLon};
    try{ const r=await fetch(`https://router.project-osrm.org/route/v1/driving/${o.lon},${o.lat};${dest.lon},${dest.lat}?overview=false`);
      const j=await r.json(); if(j.code==='Ok'&&j.routes&&j.routes[0]) return {km:Math.round(j.routes[0].distance/100)/10,rota:true}; }catch(e){}
    return {km:Math.round(this.linha(o,dest)*1.3*10)/10,rota:false};
  }
};
/* liga um campo de texto a uma lista de sugestões. onPick({label,lat,lon}) */
function enderecoAuto(input,box,onPick){
  let t=0,seq=0,itens=[];
  const fechar=()=>{box.innerHTML='';box.hidden=true};
  input.setAttribute('autocomplete','off');
  input.addEventListener('input',()=>{clearTimeout(t); const q=input.value; const my=++seq;
    t=setTimeout(async()=>{ try{ itens=await GEO.buscar(q); }catch(e){ itens=[]; } if(my!==seq) return;
      if(!itens.length){fechar();return}
      box.innerHTML=itens.map((x,i)=>`<button type="button" data-i="${i}"><b>${esc(x.l1)}</b><small>${esc(x.l2)}</small></button>`).join(''); box.hidden=false; },350); });
  box.addEventListener('mousedown',e=>e.preventDefault());
  box.addEventListener('click',e=>{const b=e.target.closest('button'); if(!b) return; const x=itens[+b.dataset.i]; input.value=x.label; fechar(); onPick(x);});
  input.addEventListener('blur',()=>setTimeout(fechar,150));
  input.addEventListener('keydown',e=>{if(e.key==='Escape')fechar()});
}
