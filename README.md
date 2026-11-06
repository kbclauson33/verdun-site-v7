# Verdun website (handoff)

The new verdun.ai marketing site. It's a static site: HTML, CSS and vanilla JS, plus one serverless function for the demo form.

- Preview: https://verdun-site.vercel.app. It is marked noindex, so search engines skip the preview domain.
- Pages:
  - `/` home
  - `/get-started` Book a demo overview
  - `/integrators` for integrators and security dealers
  - `/about` founding team
  - `/faq` common questions
  - `404.html`

## Edit copy (most common job)

- **All copy in one place:** `COPY.md` lists every line by page and section. Mark edits there, or paste it into a Google Doc. Regenerate it with `python3 tools/copydoc.py`.
- **Where it lives:** copy is plain text in `index.html`, `get-started.html`, `integrators.html` and `about.html`. Search for the sentence and change it. Keep the tags around it.
- **Common questions:** the answers live in `tools/seo.py` (the `FAQ` list) because they also feed the structured data and `llms.txt`. Edit them there, then run `python3 tools/seo.py`.
- **Page titles and descriptions** are also in `tools/seo.py` (`PAGES`). Run `python3 tools/seo.py` after any change. It rewrites:
  - the `<!-- seo:start -->` blocks
  - `faq.html` and `404.html`
  - `robots.txt`, `sitemap.xml`, `llms.txt` and `llms-full.txt`
- **Copy in scripts:**
  - opening words (Watch / Verify / Respond): `index.html`
  - demo form text: `static/js/demo.js`
  - queue clip labels: `static/js/main.js` (`ROUTINE`, `AGENT`)

## Design rules (keep these)

- The opening (about 7.5 s: bars → Watch / Verify / Respond → wordmark) and the hero are approved. Don't change their motion.
- No oversized section headlines. Section intros are a small label, a modest title and one line. Only the hero headline, the queue headline ("Wind. Rain…") and the big queue stats are large.
- Use real Verdun imagery only, no generated photos. The hero yard photo is Eric Skaggs / Pexels with simulated people and classifications; the footer says so.
- Pins on the hero fade out when they would touch text (`hidePinsOverText` in `main.js`).

## Run and check

```bash
npx serve -l 8861 .                          # clean URLs like /about work; open http://localhost:8861
node tools/checks.mjs                        # assets, script syntax, SEO head, disclosures
```

Review shortcuts: `/?skip` skips the opening, and `/?audit&t=3.9` freezes the opening at 3.9 s. `/#demo` opens the demo form.

## Deploy

Vercel, static, no build step (see `vercel.json`). Connect this repo to a Vercel project and every push deploys.

Environment variables for the demo form (Project → Settings → Environment Variables):

| Name | What |
| --- | --- |
| `DEMO_WEBHOOK_URL` | CRM intake: `https://n7taxhfnxa.execute-api.us-west-2.amazonaws.com/webhooks/demo` (sales stack → Attio lead, note, task, Verdun Deals Slack ping) |
| `DEMO_WEBHOOK_SECRET` | Shared secret. It lives in Kaben's Keychain and AWS. Set it with `vercel env add`; never paste it in chat. |
| `DEMO_SLACK_WEBHOOK_URL` | Optional extra Slack ping |

Without them, `/api/demo` answers 503 and the form offers a prefilled email to support@verdun.ai, so no request is lost. The request is signed with `X-Verdun-Signature: sha256=HMAC(secret, "<timestamp>.<raw body>")` and `X-Verdun-Timestamp`.

## Go live on verdun.ai

verdun.ai runs through Cloudflare. Leadership, Essays, Careers, Privacy, Terms and SMS opt-in stay on the current site: careers applications and the SMS consent page depend on its backend, and carriers reference the opt-in URL.

1. Optional preview on the real domain: add `new.verdun.ai` as a CNAME to `cname.vercel-dns.com` and add it as a domain on the Vercel project.
2. In Cloudflare, create a Worker from `tools/cloudflare-worker.js` and add the route `verdun.ai/*`. It sends these to the new site:
   - `/`, `/about`, `/get-started`, `/integrators`, `/faq`
   - `/static/*` and `/api/demo`
   - `robots.txt`, `sitemap.xml`, `llms.txt`, `llms-full.txt`
   Everything else stays on the current site.
3. Check:
   - home, Book a demo (submit a test), Leadership, Careers and SMS opt-in all load
   - `https://verdun.ai/llms.txt` responds
4. Roll back: delete the Worker route.

New files sit under `/static/` so they never collide with the current site's `/assets` and `/images`.

## Search and AI search (built in)

- **Per page:** title, description, canonical verdun.ai URL, Open Graph and Twitter cards (image `https://verdun.ai/og-image.jpg`), and one `<h1>`.
- **Structured data (JSON-LD):**
  - Organization: Enari Inc. dba Verdun, with LinkedIn, YC and X profiles
  - WebSite and Service (remote video monitoring)
  - Person entries for Sonny Tai and Tung Hoang
  - an integrator Service
  - FAQPage
- **`llms.txt` and `llms-full.txt`:** a plain-text summary and the full site text for AI assistants.
- **`robots.txt`:** allows search and AI crawlers (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended and others).
- **`sitemap.xml`:** covers the new pages plus the pages that stay on the current site.
- **Content is in the HTML:** all copy is server-delivered, so crawlers that don't run JavaScript read everything. The Common questions page answers buyer questions in plain sentences near the top.
- **Lighthouse (Nov 6, local):** SEO 100, accessibility 91 to 100.

## Ads

The Google Ads tag `AW-18541176135` matches the current site. A successful demo request fires `gtag('event', 'generate_lead')`. To count it as an Ads conversion, create a conversion in Google Ads and add its `send_to` label in `static/js/demo.js`.

## Files

| Path | Role |
| --- | --- |
| `index.html` | Home: opening, hero, queue walkthrough, approach, technology, offer, AI analytics, product, contact |
| `get-started.html`, `integrators.html`, `about.html`, `faq.html`, `404.html` | Other pages (`faq.html` and `404.html` are generated by `tools/seo.py`) |
| `static/css/style.css` | All styles |
| `static/js/main.js` | Home motion: opening timeline, scroll scenes, queue simulation |
| `static/js/barfilm.js` | WebGL renderer that draws photos as vertical bars |
| `static/js/about.js` | Sub-page motion, menu, toggles |
| `static/js/demo.js` | Book a demo form |
| `api/demo.js` | Demo form endpoint (Vercel function) |
| `static/vendor/` | GSAP 3.13 and Lenis 1.3.27 (local copies) |
| `static/media/` | Images, field footage, fonts (Geist, OFL) |
| `tools/` | `seo.py`, `copydoc.py`, `checks.mjs`, `cloudflare-worker.js` (not deployed) |

## Open decisions (from Ethan's doc and Sonny's review)

- Copy points to confirm:
  - text line into the monitoring center
  - weekly reports
  - 30-day pilots
  - side by side, the MOU and the discount
  - the $20,000 terms
  - partner name on the contract
  - no going around partners
  - whether "under 90 seconds" is measured
- Does `/about` replace `/leadership`?
- Is the cake offer still running? It was removed from the new home page.
