// Book a demo: an on-screen request form shared by every page.
// Any element with [data-demo] opens it. Without JavaScript the links still go to get-started.html.
(function () {
  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const arrow = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M7 17 17 7M8 7h9v9" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
  const close = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';

  const dlg = document.createElement('dialog');
  dlg.className = 'demo';
  dlg.setAttribute('aria-labelledby', 'demo-title');
  dlg.innerHTML = `
  <div class="demo__panel">
    <div class="demo__bar">
      <span class="label label--blue">Book a demo</span>
      <button class="icon-btn demo__close" type="button" data-demo-close aria-label="Close">${close}</button>
    </div>
    <form class="demo__form" novalidate>
      <div class="demo__intro">
        <h2 id="demo-title">Tell us about your site.</h2>
        <p>We’ll take it from there: what you want to look for, your cameras, and a time to walk you through it.</p>
      </div>
      <div class="demo__grid">
        <label class="field"><span>First name <i>*</i></span><input name="first_name" autocomplete="given-name" required maxlength="80"></label>
        <label class="field"><span>Last name</span><input name="last_name" autocomplete="family-name" maxlength="80"></label>
        <label class="field field--full"><span>Work email <i>*</i></span><input name="email" type="email" autocomplete="email" required maxlength="160"></label>
        <label class="field"><span>Company <i>*</i></span><input name="company" autocomplete="organization" required maxlength="120"></label>
        <label class="field"><span>Phone</span><input name="phone" type="tel" autocomplete="tel" maxlength="40"></label>
        <label class="field"><span>Property type</span>
          <select name="property_type"><option value="">Select</option><option>Commercial</option><option>Multifamily</option><option>Industrial</option><option>Other</option></select></label>
        <label class="field"><span>Cameras, roughly</span>
          <select name="cameras"><option value="">Select</option><option>Under 25</option><option>25 to 100</option><option>100 to 500</option><option>500+</option></select></label>
        <label class="field field--full"><span>What do you want us to look for?</span>
          <textarea name="look_for" rows="3" maxlength="2000" placeholder="For example: people in the yard after hours, someone trying truck doors, loitering by the garage."></textarea></label>
        <label class="field"><span>Current VMS</span><input name="vms" maxlength="120" placeholder="If you know it"></label>
        <fieldset class="field field--choice">
          <legend>Monitoring today?</legend>
          <label class="chip"><input type="radio" name="monitoring" value="none" checked><span>Not yet</span></label>
          <label class="chip"><input type="radio" name="monitoring" value="has"><span>Yes</span></label>
        </fieldset>
        <label class="field field--full demo__contract" hidden><span>When’s your contract up?</span><input name="contract_end" type="month"></label>
        <label class="demo__hp" aria-hidden="true">Leave this empty<input name="website" tabindex="-1" autocomplete="off"></label>
      </div>
      <p class="demo__fine">Please don’t put camera passwords here. We collect access in a secure step later. By sending, you agree we can contact you about Verdun. <a href="https://verdun.ai/privacy" target="_blank" rel="noopener">Privacy policy</a>.</p>
      <p class="demo__error" role="alert" hidden></p>
      <div class="demo__actions">
        <button class="btn btn--blue btn--lg demo__submit" type="submit"><span>Request a demo</span>${arrow}</button>
      </div>
    </form>
    <div class="demo__done" hidden tabindex="-1">
      <span class="demo__check" aria-hidden="true"></span>
      <h2>Request received.</h2>
      <p>We’ll email you to set up your demo. If anything is urgent, write to <a href="mailto:support@verdun.ai">support@verdun.ai</a>.</p>
      <button class="btn btn--ghost" type="button" data-demo-close><span>Close</span>${arrow}</button>
    </div>
  </div>`;
  document.body.appendChild(dlg);

  const form = $('form', dlg);
  const done = $('.demo__done', dlg);
  const err = $('.demo__error', dlg);
  const submit = $('.demo__submit', dlg);
  const contract = $('.demo__contract', dlg);
  let openedAt = 0, lastFocus = null;

  const lenis = () => (window.__verdun && window.__verdun.lenis) || window.__lenis;

  function open(trigger) {
    lastFocus = trigger || document.activeElement;
    form.hidden = false; done.hidden = true; err.hidden = true;
    openedAt = Date.now();
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    document.documentElement.classList.add('demo-open');
    const l = lenis(); l && l.stop();
    requestAnimationFrame(() => dlg.classList.add('is-in'));
    setTimeout(() => $('input[name="first_name"]', dlg).focus({ preventScroll: true }), REDUCE ? 0 : 380);
    if (location.hash !== '#demo') history.replaceState(null, '', '#demo');
  }
  function shut() {
    dlg.classList.remove('is-in');
    const finish = () => {
      if (dlg.open) dlg.close();
      document.documentElement.classList.remove('demo-open');
      const l = lenis(); l && l.start();
      if (location.hash === '#demo') history.replaceState(null, '', location.pathname + location.search);
      lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true });
    };
    REDUCE ? finish() : setTimeout(finish, 420);
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-demo]');
    if (t) { e.preventDefault(); open(t); return; }
    if (e.target.closest('[data-demo-close]')) { e.preventDefault(); shut(); }
  });
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); shut(); });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) shut(); });
  $$('input[name="monitoring"]', dlg).forEach((r) => r.addEventListener('change', () => { contract.hidden = !$('input[name="monitoring"][value="has"]', dlg).checked; }));

  function payload() {
    const fd = new FormData(form);
    const data = Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v).trim()]));
    if (data.monitoring !== 'has') delete data.contract_end;
    const q = new URLSearchParams(location.search);
    data.page = location.pathname;
    ['utm_source', 'utm_medium', 'utm_campaign'].forEach((k) => { if (q.get(k)) data[k] = q.get(k); });
    data.elapsed_ms = Date.now() - openedAt;
    return data;
  }
  function mailtoFallback(d) {
    const body = [
      `Name: ${d.first_name || ''} ${d.last_name || ''}`.trim(), `Email: ${d.email || ''}`, `Company: ${d.company || ''}`,
      d.phone && `Phone: ${d.phone}`, d.property_type && `Property: ${d.property_type}`, d.cameras && `Cameras: ${d.cameras}`,
      d.look_for && `Looking for: ${d.look_for}`, d.vms && `VMS: ${d.vms}`, d.contract_end && `Contract up: ${d.contract_end}`,
    ].filter(Boolean).join('\n');
    return `mailto:support@verdun.ai?subject=${encodeURIComponent('Demo request: ' + (d.company || ''))}&body=${encodeURIComponent(body)}`;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.hidden = true;
    $$('.field.is-bad', form).forEach((f) => f.classList.remove('is-bad'));
    const bad = $$('[required]', form).filter((i) => !i.value.trim() || (i.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.value.trim())));
    if (bad.length) {
      bad.forEach((i) => i.closest('.field').classList.add('is-bad'));
      err.textContent = 'Please fill in your first name, a valid work email, and your company.';
      err.hidden = false; bad[0].focus(); return;
    }
    const d = payload();
    submit.disabled = true; submit.classList.add('is-busy');
    try {
      const r = await fetch('/api/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
      if (!r.ok) throw new Error(String(r.status));
      form.hidden = true; done.hidden = false; done.focus({ preventScroll: true });
      // Google Ads: count the lead. Add a send_to conversion label here once one exists in Google Ads.
      if (typeof window.gtag === 'function') window.gtag('event', 'generate_lead', { method: 'book_a_demo' });
    } catch (x) {
      err.innerHTML = `We couldn’t send this just now. <a href="${mailtoFallback(d)}">Email it to us instead</a> and it goes straight to the team.`;
      err.hidden = false;
    } finally {
      submit.disabled = false; submit.classList.remove('is-busy');
    }
  });

  if (location.hash === '#demo') setTimeout(() => open(null), 600);
  window.__demo = { open, close: shut };
})();
