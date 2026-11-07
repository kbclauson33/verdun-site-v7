#!/usr/bin/env python3
"""Build the SEO / AI-search layer for the Verdun site (idempotent).

- Per-page <head> block between <!-- seo:start --> and <!-- seo:end -->:
  title, description, canonical (verdun.ai), Open Graph, Twitter, JSON-LD.
- New pages: faq.html (Common questions), 404.html.
- Root files: robots.txt, sitemap.xml, llms.txt, llms-full.txt, site.webmanifest.
- Footer link to Common questions on every page.
All visible copy comes from the site's approved copy (verdun.ai + Ethan's doc).
Run from the repo root:  python3 tools/seo.py
"""
import html, json, re, sys
from html.parser import HTMLParser
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
BASE = 'https://verdun.ai'
TODAY = __import__('datetime').date.today().isoformat()
ORG_ID = f'{BASE}/#org'
SONNY_ID = f'{BASE}/about#sonny-tai'
TUNG_ID = f'{BASE}/about#tung-hoang'

ORG = {
    '@type': 'Organization', '@id': ORG_ID, 'name': 'Verdun', 'legalName': 'Enari Inc.',
    'alternateName': 'Enari Inc. (dba Verdun)', 'url': f'{BASE}/', 'logo': f'{BASE}/icon-512.png',
    'image': f'{BASE}/og-image.jpg', 'email': 'support@verdun.ai',
    'description': 'A remote video monitoring service. AI agents review every alarm. Trained operators respond to real threats.',
    'slogan': 'We built the world’s most advanced monitoring center.',
    'founder': [{'@id': SONNY_ID}, {'@id': TUNG_ID}],
    'sameAs': ['https://www.linkedin.com/company/verdunai', 'https://www.ycombinator.com/companies/verdun', 'https://x.com/VerdunAI'],
    'knowsAbout': ['Remote video monitoring', 'AI video analytics', 'Alarm verification', 'Live talk-down', 'Security dispatch'],
}
WEBSITE = {'@type': 'WebSite', '@id': f'{BASE}/#website', 'url': f'{BASE}/', 'name': 'Verdun', 'publisher': {'@id': ORG_ID}}
SERVICE = {
    '@type': 'Service', '@id': f'{BASE}/#monitoring', 'name': 'Verdun remote video monitoring',
    'serviceType': 'Remote video monitoring', 'provider': {'@id': ORG_ID},
    'description': 'AI agents review every alarm in parallel. They dismiss the noise, log what’s routine, and escalate what’s real or uncertain. Human operators talk down the threat, call the police, and notify other relevant parties by call, text, or email.',
    'audience': {'@type': 'BusinessAudience', 'name': 'Commercial, multifamily, and industrial properties'},
}
SONNY = {
    '@type': 'Person', '@id': SONNY_ID, 'name': 'Sonny Tai', 'jobTitle': 'Co-Founder & CEO', 'worksFor': {'@id': ORG_ID},
    'image': f'{BASE}/static/media/sonny.webp',
    'description': 'Former US Marine officer and founder of Actuate, a computer vision company for physical security. He scaled Actuate to more than 110,000 cameras across 15,000+ customer sites.',
    'alumniOf': [{'@type': 'CollegeOrUniversity', 'name': 'University of Illinois at Urbana-Champaign'}, {'@type': 'CollegeOrUniversity', 'name': 'University of Chicago'}],
}
TUNG = {
    '@type': 'Person', '@id': TUNG_ID, 'name': 'Tung Hoang', 'jobTitle': 'Co-Founder & CTO', 'worksFor': {'@id': ORG_ID},
    'image': f'{BASE}/static/media/tung.webp',
    'description': 'PhD in Applied Mathematics and National Math Olympiad Gold Medalist. Built Actuate’s first gun-detection AI model and held senior AI engineering roles at LinkedIn, VergeSense, and WeWork.',
    'alumniOf': [{'@type': 'CollegeOrUniversity', 'name': 'University of Illinois Chicago'}],
}

# Common questions: every answer is assembled from copy already on the site.
FAQ = [
    ('What is Verdun?',
     'Verdun is a remote video monitoring service, backed by Y Combinator. AI agents review every alarm. Trained operators respond to real threats. We built the world’s most advanced monitoring center.'),
    ('How is Verdun different from traditional video monitoring?',
     'Traditional monitoring centers are flooded with more alarms than people can get through. When activity spikes, the queue backs up and a real threat waits its turn. At Verdun, AI agents review every alarm in parallel. They dismiss the noise, log what’s routine, and escalate what’s real or uncertain.'),
    ('How fast does an operator see a real threat?',
     'Anything real or uncertain is reviewed by a human in under 90 seconds. At a traditional center during peak hours, a real threat can wait 20+ minutes before an operator even opens it.'),
    ('Can I choose what Verdun looks for?',
     'Yes. Tell us what you want to monitor for: theft, loitering, fire, weapons, trespassing and more. Our AI looks for it and our human operators act on it. Arming schedules and response rules reflect how each property operates.'),
    ('What happens when there is a real threat?',
     'Anything real or uncertain goes to our operators, trained on your site’s protocol, for talk-down, dispatch, and notification. The operator gets the clip, a live view, the agent’s assessment, and your protocol on one screen. They talk down intruders through on-site speakers, dispatch police or guards, and send your team an update the agent has already drafted.'),
    ('Are Verdun’s operators available around the clock?',
     'Our human operators are active 24/7 to review alerts. They aren’t bogged down trying to clear a queue, so they pay real attention to your property.'),
    ('What kinds of properties does Verdun monitor?',
     'Verdun monitors commercial, multifamily, and industrial properties from one console.'),
    ('Does Verdun work with my existing cameras?',
     'Yes. Provide us with your deployment details: network information and camera or device credentials. We hook up to your cameras, configure our AI for your use cases, then test for a few days. We can have you up and running within days.'),
    ('Do I get reports?',
     'Yes. Daily reports show how many alarms we reviewed, how fast we reviewed them, and any incidents at your property.'),
    ('What if Verdun misses something?',
     'If AI or human error causes a miss that leads to damage, we’ll reimburse you up to $20,000.'),
    ('Can I try Verdun before switching?',
     'If you have monitoring today and your deployment supports it, we’ll monitor side by side with your current provider for free. We agree up front on what counts. You can also start us at your next site with a 30-day pilot and nothing to cancel.'),
    ('Do you work with integrators and security dealers?',
     'Yes. Add monthly recurring revenue to every camera that you install. We run the service and it’s your name on the contract.'),
    ('Who founded Verdun?',
     'Verdun was founded by Sonny Tai, a former US Marine officer and the founder of Actuate, and Tung Hoang, who holds a PhD in Applied Mathematics and built Actuate’s first gun-detection AI model.'),
]

PAGES = {
    'index.html': dict(path='/', title='Verdun | AI video monitoring with human operators',
        desc='Most monitoring tells you what already happened. Verdun’s AI agents review every alarm and human operators respond to real threats while they’re still happening.',
        graph=[ORG, WEBSITE, SERVICE]),
    'about.html': dict(path='/about', title='About Verdun | Founding team',
        desc='Verdun’s founding team: Sonny Tai, Co-Founder and CEO, a former US Marine officer and founder of Actuate, and Tung Hoang, Co-Founder and CTO.',
        graph=[{'@type': 'AboutPage', '@id': f'{BASE}/about', 'url': f'{BASE}/about', 'name': 'About Verdun', 'about': {'@id': ORG_ID}}, SONNY, TUNG, ORG]),
    'get-started.html': dict(path='/get-started', title='Book a demo | Verdun',
        desc='Tell us about your site, what you want to look for, and your deployment details. We hook up to your cameras and monitoring begins.',
        graph=[{'@type': 'ContactPage', '@id': f'{BASE}/get-started', 'url': f'{BASE}/get-started', 'name': 'Book a demo', 'about': {'@id': ORG_ID}}, ORG]),
    'integrators.html': dict(path='/integrators', title='For integrators and security dealers | Verdun',
        desc='Add monthly recurring revenue to every camera that you install. We run the service, it’s your name on the contract, and your clients get daily reports with your brand on them.',
        graph=[{'@type': 'WebPage', '@id': f'{BASE}/integrators', 'url': f'{BASE}/integrators', 'name': 'For integrators and security dealers'},
               {**SERVICE, '@id': f'{BASE}/integrators#service', 'name': 'Verdun monitoring for integrators and security dealers',
                'audience': {'@type': 'BusinessAudience', 'name': 'Security integrators and dealers'},
                'description': 'We run the service and it’s your name on the contract. Our AI agents clear the noise, so monitoring doesn’t take nearly as many people. That’s where your margin comes from.'}, ORG]),
    'faq.html': dict(path='/faq', title='Common questions | Verdun',
        desc='How Verdun’s AI agents and human operators monitor your cameras, review every alarm, and respond to real threats.',
        graph=[{'@type': 'FAQPage', '@id': f'{BASE}/faq', 'url': f'{BASE}/faq',
                'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in FAQ]}, ORG]),
    '404.html': dict(path=None, title='Page not found | Verdun', desc='This page doesn’t exist. Head back to Verdun.', graph=None),
}

GTAG = '''<script async src="https://www.googletagmanager.com/gtag/js?id=AW-18541176135"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config","AW-18541176135");</script>'''


def seo_block(p):
    e = lambda s: html.escape(s, quote=True)
    url = f"{BASE}{p['path']}" if p['path'] else None
    lines = [f"<title>{e(p['title'])}</title>", f'<meta name="description" content="{e(p["desc"])}">']
    if url:
        lines.append(f'<link rel="canonical" href="{url}">')
    else:
        lines.append('<meta name="robots" content="noindex">')
    lines += [
        '<meta property="og:type" content="website">', '<meta property="og:site_name" content="Verdun">',
        f'<meta property="og:title" content="{e(p["title"])}">', f'<meta property="og:description" content="{e(p["desc"])}">',
        f'<meta property="og:image" content="{BASE}/og-image.jpg">', '<meta property="og:image:width" content="1200">', '<meta property="og:image:height" content="630">',
    ]
    if url:
        lines.append(f'<meta property="og:url" content="{url}">')
    lines += ['<meta name="twitter:card" content="summary_large_image">', '<meta name="twitter:site" content="@VerdunAI">',
              f'<meta name="twitter:title" content="{e(p["title"])}">', f'<meta name="twitter:description" content="{e(p["desc"])}">',
              f'<meta name="twitter:image" content="{BASE}/og-image.jpg">', '<link rel="manifest" href="/site.webmanifest">', GTAG]
    if p['graph']:
        lines.append('<script type="application/ld+json">' + json.dumps({'@context': 'https://schema.org', '@graph': p['graph']}, ensure_ascii=False) + '</script>')
    return '<!-- seo:start -->\n' + '\n'.join(lines) + '\n<!-- seo:end -->'


STRIP = [r'<title>.*?</title>\n?', r'<meta name="description"[^>]*>\n?', r'<meta property="(og|twitter):[^"]*"[^>]*>\n?', r'<meta name="twitter:[^"]*"[^>]*>\n?', r'<link rel="canonical"[^>]*>\n?']


def apply_head(path, p):
    h = path.read_text()
    h = re.sub(r'<!-- seo:start -->.*?<!-- seo:end -->\n?', '', h, flags=re.S)
    for pat in STRIP:
        h = re.sub(pat, '', h, flags=re.S)
    h = h.replace('<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
                  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' + seo_block(p), 1)
    path.write_text(h)


def chrome():
    h = (SITE / 'about.html').read_text()  # sub-page chrome already uses ./ links
    head_end = h.index('<main id="main">')
    foot = h[h.index('<!-- ============ FOOTER ============ -->'):h.index('<script src="static/vendor/gsap.min.js">')]
    return h[:head_end], foot


def page_from(prefix, footer, main, body_class):
    prefix = re.sub(r'<body class="[^"]*">', f'<body class="{body_class}">', prefix)
    tail = '''<script src="static/vendor/gsap.min.js"></script>
<script src="static/vendor/ScrollTrigger.min.js"></script>
<script src="static/vendor/lenis.min.js"></script>
<script src="static/js/about.js"></script>
<script src="static/js/demo.js" defer></script>
</body>
</html>
'''
    return prefix + '<main id="main">\n' + main + '\n</main>\n\n' + footer + tail


def build_pages():
    prefix, footer = chrome()
    items = '\n'.join(
        f'''      <details class="faq__item" data-more data-reveal>
        <summary><h2>{html.escape(q)}</h2><i aria-hidden="true"></i></summary>
        <div class="more__body"><div class="more__inner"><p>{html.escape(a)}</p></div></div>
      </details>''' for q, a in FAQ)
    faq_main = f'''  <section class="page wrap" aria-labelledby="faq-title">
    <div class="page__head" data-reveal>
      <span class="label">Common questions</span>
      <h1 class="page__title" id="faq-title">How Verdun <em>works.</em></h1>
    </div>
    <div class="faq">
{items}
    </div>
    <div class="page__cta" data-reveal>
      <a class="btn btn--blue" href="/get-started" data-magnetic data-demo><span>Book a demo</span><svg aria-hidden="true"><use href="#i-arrow"/></svg></a>
      <a class="text-link" href="mailto:support@verdun.ai">support@verdun.ai</a>
    </div>
  </section>'''
    (SITE / 'faq.html').write_text(page_from(prefix, footer, faq_main, 'page-sub'))
    nf_main = '''  <section class="page wrap page--404" aria-labelledby="nf-title">
    <div class="page__head" data-reveal>
      <span class="label">404</span>
      <h1 class="page__title" id="nf-title">This page doesn’t exist. <em>Your cameras still do.</em></h1>
      <div class="page__cta"><a class="btn btn--blue" href="/" data-magnetic><span>Back to Verdun</span><svg aria-hidden="true"><use href="#i-arrow"/></svg></a>
      <a class="text-link" href="/get-started" data-demo>Book a demo</a></div>
    </div>
  </section>'''
    nf = page_from(prefix, footer, nf_main, 'page-sub')
    # 404 can render at any depth, so every local link becomes root-absolute.
    nf = re.sub(r'(href|src)="(?!https?:|mailto:|#|/)(\./)?', lambda m: f'{m.group(1)}="/', nf)
    (SITE / '404.html').write_text(nf)


def footer_links():
    for f in ['index.html', 'about.html', 'get-started.html', 'integrators.html', 'faq.html', '404.html']:
        p = SITE / f
        h = p.read_text()
        if '/faq">Common questions' not in h:
            h = h.replace('<a href="/about">About</a>\n      <a href="https://verdun.ai/essays">Essays</a>',
                          '<a href="/about">About</a>\n      <a href="/faq">Common questions</a>\n      <a href="https://verdun.ai/essays">Essays</a>', 1)
        p.write_text(h)


class _Visible(HTMLParser):
    """Collect the text a reader sees: skips scripts, icons, dialogs, the header, menu and footer,
    and anything marked aria-hidden (decorative mock-ups, tags, the skip-intro control)."""
    VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'}
    BREAK = {'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'dt', 'dd', 'summary', 'figcaption', 'blockquote', 'span', 'title', 'a', 'button'}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.skip, self.out = 0, []

    def handle_starttag(self, tag, attrs):
        if tag in self.VOID:
            if tag == 'br' and not self.skip:
                self.out.append(' ')
            return
        if self.skip:
            self.skip += 1
            return
        a = dict(attrs)
        cls = (a.get('class') or '').split()
        if (tag in ('head', 'script', 'style', 'svg', 'dialog', 'footer', 'template') or a.get('aria-hidden') == 'true'
                or (tag == 'header' and 'site-header' in cls) or (tag == 'div' and cls[:1] == ['menu'])
                or 'skip-intro' in cls or 'skip-link' in cls):
            self.skip = 1

    def handle_endtag(self, tag):
        if tag in self.VOID:
            return
        if self.skip:
            self.skip -= 1
            return
        if tag in self.BREAK:
            self.out.append('\n')

    def handle_data(self, d):
        if not self.skip:
            self.out.append(d)


def visible_text(path):
    v = _Visible()
    v.feed(path.read_text())
    out = []
    for line in (re.sub(r'\s+', ' ', l).strip() for l in ''.join(v.out).split('\n')):
        if line and (not out or out[-1] != line):
            out.append(line)
    return '\n'.join(out)


def root_files():
    (SITE / 'robots.txt').write_text(f'''# Verdun welcomes search and AI crawlers.
User-agent: *
Allow: /

User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Applebot-Extended
Allow: /

Sitemap: {BASE}/sitemap.xml
''')
    urls = [('/', '1.0'), ('/get-started', '0.9'), ('/integrators', '0.9'), ('/faq', '0.8'), ('/about', '0.7'),
            ('/careers', '0.5'), ('/careers/evals-engineer', '0.4'), ('/careers/ml-cv-engineer', '0.4'),
            ('/essays', '0.6'), ('/essays/traditional-video-monitoring-is-badly-broken', '0.6'),
            ('/leadership', '0.5'), ('/privacy', '0.3'), ('/terms', '0.3'), ('/sms-opt-in', '0.3')]
    body = '\n'.join(f'  <url><loc>{BASE}{u}</loc><lastmod>{TODAY}</lastmod><priority>{pr}</priority></url>' for u, pr in urls)
    (SITE / 'sitemap.xml').write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{body}\n</urlset>\n')
    faq_md = '\n'.join(f'- **{q}** {a}' for q, a in FAQ)
    (SITE / 'llms.txt').write_text(f'''# Verdun

> Verdun is a remote video monitoring service, backed by Y Combinator. AI agents review every alarm on your cameras, and trained operators respond to real threats with talk-down, dispatch, and notification. "We built the world’s most advanced monitoring center."

Verdun (Enari Inc., dba Verdun) monitors commercial, multifamily, and industrial properties. Customers tell Verdun what to look for. AI agents watch every camera, dismiss the noise, log what’s routine, and escalate what’s real or uncertain to human operators, who talk down intruders through on-site speakers, dispatch police or guards, and notify the customer.

## Pages

- [Home]({BASE}/): how Verdun’s AI agents and human operators replace the traditional monitoring queue
- [Book a demo]({BASE}/get-started): how to get started, in four steps, and the 30-day pilot
- [For integrators and security dealers]({BASE}/integrators): add monthly recurring revenue to every camera you install, with your name on the contract
- [Common questions]({BASE}/faq): plain answers about how Verdun works
- [About]({BASE}/about): founding team, Sonny Tai (CEO) and Tung Hoang (CTO)
- [Essay: Traditional video monitoring is badly broken]({BASE}/essays/traditional-video-monitoring-is-badly-broken): Sonny Tai on why the monitoring industry is structurally broken
- [Careers]({BASE}/careers): open roles

## Common questions

{faq_md}

## Contact

- Email: support@verdun.ai
- Book a demo: {BASE}/get-started
- Full text of the site: {BASE}/llms-full.txt
''')
    parts = ['# Verdun: full site text', '', f'Source: {BASE}. Generated {TODAY}.', '']
    for f, p in PAGES.items():
        if not p['path']:
            continue
        parts += [f"## {p['title']}", f"URL: {BASE}{p['path']}", '', visible_text(SITE / f), '']
    (SITE / 'llms-full.txt').write_text('\n'.join(parts))
    (SITE / 'site.webmanifest').write_text(json.dumps({
        'name': 'Verdun', 'short_name': 'Verdun', 'start_url': '/', 'display': 'browser',
        'background_color': '#080b10', 'theme_color': '#080b10',
        'icons': [{'src': '/static/media/apple-touch-icon.png', 'sizes': '180x180', 'type': 'image/png'},
                  {'src': '/static/media/favicon.svg', 'sizes': 'any', 'type': 'image/svg+xml'}]}, indent=2) + '\n')


def image_sizes():
    dims = {'field-poster.webp': (1280, 720), 'garage.webp': (1600, 900), 'sonny.webp': (1000, 1750), 'tung.webp': (1100, 1466),
            'warehouse.webp': (1672, 941), 'yard.webp': (1920, 1080)}
    for n in ['dismissed', 'drafted', 'pipeline', 'protocol', 'queue', 'record', 'response', 'verify']:
        dims[f'product-{n}.webp'] = (1600, 900)
    for f in SITE.glob('*.html'):
        h = f.read_text()
        def add(m):
            tag = m.group(0)
            if ' width=' in tag:
                return tag
            name = re.search(r'src="static/media/([^"]+)"', tag)
            if not name or name.group(1) not in dims:
                return tag
            w, hh = dims[name.group(1)]
            return tag.replace('<img ', f'<img width="{w}" height="{hh}" ', 1)
        f.write_text(re.sub(r'<img [^>]*>', add, h))


def main():
    build_pages()
    footer_links()
    for f, p in PAGES.items():
        apply_head(SITE / f, p)
    image_sizes()
    root_files()
    print('seo layer built:', ', '.join(PAGES))


if __name__ == '__main__':
    main()
