/* Coquin Gelato · comportamento do site (navegação, WhatsApp, animações e formulários) */
(() => {
  'use strict';
  const WA = '5585999719276';                       // (85) 99971-9276
  const SUPABASE_URL = 'https://anrfipczginloozmatht.supabase.co';
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFucmZpcGN6Z2lubG9vem1hdGh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5ODk3NzEsImV4cCI6MjEwMDU2NTc3MX0.Je1pF13l5Lael0EZkDC6o1Qk2XJWcusmX_ElcvdPx40';

  /* links de WhatsApp com mensagem pronta: <a data-wa="texto"> */
  document.querySelectorAll('[data-wa]').forEach(a => {
    a.href = 'https://wa.me/' + WA + '?text=' + encodeURIComponent(a.dataset.wa || 'Olá! Vim pelo site da Coquin.');
    a.target = '_blank'; a.rel = 'noopener';
  });

  /* navegação: fica sólida ao rolar; menu no celular */
  const nav = document.querySelector('.nav');
  if (nav) {
    const solid = () => nav.classList.toggle('solid', scrollY > 10 || nav.classList.contains('open'));
    addEventListener('scroll', solid, { passive: true }); solid();
    const bt = nav.querySelector('.burger');
    bt && bt.addEventListener('click', () => {
      const o = nav.classList.toggle('open'); bt.setAttribute('aria-expanded', o); document.body.style.overflow = o ? 'hidden' : ''; solid();
    });
    nav.querySelectorAll('.menu a').forEach(a => a.addEventListener('click', () => { nav.classList.remove('open'); document.body.style.overflow = ''; }));
  }

  /* entrada suave das seções */
  const els = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    els.forEach(el => io.observe(el));
  } else els.forEach(el => el.classList.add('in'));

  /* ano no rodapé */
  document.querySelectorAll('[data-year]').forEach(el => el.textContent = new Date().getFullYear());

  /* formulários: valida, salva no Supabase (tabela site_contatos) e confirma */
  const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  const phoneOk = v => v.replace(/\D/g, '').length >= 10;
  document.querySelectorAll('form[data-form]').forEach(form => {
    const tipo = form.dataset.form;
    const tel = form.querySelector('input[type=tel]');
    tel && tel.addEventListener('input', () => {
      const d = tel.value.replace(/\D/g, '').slice(0, 11);
      tel.value = d.length > 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length > 6 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : d.length > 2 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d;
    });
    const check = f => {
      const v = f.value.trim(); let ok = true;
      if (f.required && !v) ok = false;
      else if (v && f.type === 'email') ok = emailOk(v);
      else if (v && f.type === 'tel') ok = phoneOk(v);
      else if (f.minLength > 0 && v.length < f.minLength) ok = false;
      f.closest('.field')?.classList.toggle('bad', !ok); return ok;
    };
    // ao sair do campo, só limpa o erro (mostrar erro novo aqui empurraria o botão Enviar no meio do toque)
    const recheck = f => { if (f.closest('.field')?.classList.contains('bad')) check(f); };
    form.querySelectorAll('input,select,textarea').forEach(f => { f.addEventListener('blur', () => recheck(f)); f.addEventListener('change', () => recheck(f)); });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const msg = form.querySelector('.msg'); msg && msg.classList.remove('on');
      const fields = [...form.querySelectorAll('input:not(.hp),select,textarea')];
      const bad = fields.filter(f => !check(f));
      if (bad.length) { bad[0].focus(); return; }
      if (form.querySelector('.hp')?.value) { form.classList.add('sent'); return; }   // robô
      const data = Object.fromEntries(new FormData(form)); delete data.site;
      const row = { tipo, nome: data.nome || '', email: data.email || '', telefone: data.telefone || '', assunto: data.assunto || '', mensagem: data.mensagem || '',
        empresa: data.empresa || '', segmento: data.segmento || '', cidade: data.cidade || '', pagina: location.pathname };
      const btn = form.querySelector('button[type=submit]'); const label = btn.innerHTML;
      btn.disabled = true; btn.textContent = 'Enviando…';
      try {
        const r = await fetch(SUPABASE_URL + '/rest/v1/site_contatos', {
          method: 'POST',
          headers: { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + SUPABASE_ANON, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify(row)
        });
        if (!r.ok) throw new Error('http ' + r.status);
        form.classList.add('sent'); form.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (err) {
        if (msg) { msg.innerHTML = 'Não conseguimos enviar agora. Fale com a gente pelo <a href="https://wa.me/' + WA + '" target="_blank" rel="noopener"><b>WhatsApp</b></a>.'; msg.classList.add('on'); }
      } finally { btn.disabled = false; btn.innerHTML = label; }
    });
  });
})();
