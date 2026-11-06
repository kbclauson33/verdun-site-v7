// POST /api/demo — receives Book a demo requests from the site and forwards them to the CRM intake.
// Configure in Vercel (Project → Settings → Environment Variables):
//   DEMO_WEBHOOK_URL     CRM intake endpoint (sales stack → Attio lead + Slack ping)
//   DEMO_WEBHOOK_SECRET  shared secret; the intake verifies X-Verdun-Signature
//   DEMO_SLACK_WEBHOOK_URL (optional) Slack incoming webhook for an instant ping
// With neither URL set, the endpoint answers 503 and the form offers an email fallback, so nothing is lost silently.
const crypto = require('crypto');

const FIELDS = {
  first_name: 80, last_name: 80, email: 160, company: 120, phone: 40, property_type: 40, cameras: 40,
  look_for: 2000, vms: 120, monitoring: 10, contract_end: 10, page: 200, utm_source: 100, utm_medium: 100, utm_campaign: 100,
};

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'method_not_allowed' }); }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || typeof body !== 'object') return res.status(400).json({ error: 'bad_request' });

  // Bots: hidden field filled, or submitted faster than a person can type. Accept quietly, send nowhere.
  if (body.website || Number(body.elapsed_ms) < 2500) return res.status(200).json({ ok: true });

  const lead = {};
  for (const [k, max] of Object.entries(FIELDS)) {
    if (body[k] != null && String(body[k]).trim()) lead[k] = String(body[k]).trim().slice(0, max);
  }
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email || '');
  if (!lead.first_name || !lead.company || !emailOk) return res.status(400).json({ error: 'missing_fields' });

  const event = {
    type: 'demo_request',
    source: 'verdun-site',
    submitted_at: new Date().toISOString(),
    id: crypto.randomUUID(),
    lead,
  };

  const hook = process.env.DEMO_WEBHOOK_URL;
  const slack = process.env.DEMO_SLACK_WEBHOOK_URL;
  if (!hook && !slack) return res.status(503).json({ error: 'not_configured' });

  const sent = [];
  if (hook) {
    const raw = JSON.stringify(event);
    const ts = Math.floor(Date.now() / 1000).toString();
    const sig = crypto.createHmac('sha256', process.env.DEMO_WEBHOOK_SECRET || '').update(`${ts}.${raw}`).digest('hex');
    try {
      const r = await fetch(hook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Verdun-Timestamp': ts, 'X-Verdun-Signature': `sha256=${sig}`, 'Idempotency-Key': event.id },
        body: raw,
      });
      sent.push(r.ok);
    } catch { sent.push(false); }
  }
  if (slack) {
    const l = lead;
    const lines = [
      `*New demo request:* ${l.first_name} ${l.last_name || ''}, ${l.company}`.replace(/\s+,/, ','),
      `${l.email}${l.phone ? ' · ' + l.phone : ''}`,
      [l.property_type, l.cameras && `${l.cameras} cameras`, l.vms && `VMS: ${l.vms}`].filter(Boolean).join(' · '),
      l.look_for && `Looking for: ${l.look_for}`,
      l.contract_end && `Contract up: ${l.contract_end}`,
    ].filter(Boolean).join('\n');
    try {
      const r = await fetch(slack, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: lines }) });
      sent.push(r.ok);
    } catch { sent.push(false); }
  }
  if (!sent.some(Boolean)) return res.status(502).json({ error: 'forward_failed' });
  return res.status(200).json({ ok: true, id: event.id });
};
