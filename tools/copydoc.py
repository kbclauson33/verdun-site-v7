#!/usr/bin/env python3
"""Write COPY.md: every line of on-page copy, grouped by page and section, in page order.
Use it for copy edits: mark changes in COPY.md (or a Google Doc made from it), then apply them in the HTML.
Run from the repo root:  python3 tools/copydoc.py
"""
import html, re
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
PAGES = [('index.html', 'Home  /'), ('get-started.html', 'Get started  /get-started'), ('integrators.html', 'For integrators and security dealers  /integrators'),
         ('about.html', 'About  /about'), ('faq.html', 'Common questions  /faq (answers live in tools/seo.py, FAQ list)')]
SKIP = r'<(script|style|svg|dialog)\b.*?</\1>|<header class="site-header".*?</header>|<div class="menu".*?</div>\s*</div>\s*</div>|<footer.*?</footer>|<div class="qs__grid">.*?<!-- overlays per chapter -->'


def lines_of(fragment):
    t = re.sub(r'<br\s*/?>', ' / ', fragment)
    t = re.sub(r'</(p|h\d|li|dt|dd|summary|figcaption|blockquote|span|a|button|b|em|small|label|legend)>', '\n', t)
    t = html.unescape(re.sub(r'<[^>]+>', ' ', t))
    out = []
    for l in (re.sub(r'\s+', ' ', x).strip() for x in t.split('\n')):
        if l and len(l) > 1 and (not out or out[-1] != l):
            out.append(l)
    return out


def main():
    doc = ['# Verdun site: all copy', '',
           'Every line of on-page copy, in page order. Edit the wording here, then apply it in the matching HTML file.',
           'Labels in CAPS on the site are written in normal case here. Lines marked (alt) are image descriptions for screen readers and search.', '']
    for f, title in PAGES:
        h = (SITE / f).read_text()
        body = h[h.index('<main'):h.index('</main>')]
        body = re.sub(SKIP, ' ', body, flags=re.S)
        doc += [f'## {title}', f'File: `{f}`', '']
        parts = re.split(r'<!-- =+ (.*?) =+ -->', body)
        sections = [('Top of page', parts[0])] + list(zip(parts[1::2], parts[2::2]))
        for name, frag in sections:
            ls = lines_of(frag)
            alts = re.findall(r'<img [^>]*alt="([^"]+)"', frag)
            if not ls and not alts:
                continue
            doc.append(f'### {name.title()}')
            doc += [f'- {l}' for l in ls]
            doc += [f'- (alt) {a}' for a in alts]
            doc.append('')
    doc += ['## Opening sequence (index.html, locked design)', '',
            '- Watch. / AI agents monitor every camera continuously.',
            '- Verify. / The context to know what actually matters.',
            '- Respond. / A trained operator on every real threat.',
            '- AI agents review every alarm. / Trained operators respond to real threats.', '',
            '## Book a demo form (static/js/demo.js)', '',
            '- Tell us about your site.',
            '- We’ll take it from there: what you want to look for, your cameras, and a time to walk you through it.',
            '- Request received. / We’ll email you to set up your demo.', '']
    (SITE / 'COPY.md').write_text('\n'.join(doc))
    print('COPY.md:', sum(1 for l in doc if l.startswith('- ')), 'lines of copy')


if __name__ == '__main__':
    main()
