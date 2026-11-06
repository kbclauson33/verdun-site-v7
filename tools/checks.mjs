// node tools/checks.mjs: local asset references, script syntax, SEO head, provenance rules.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'static/css/style.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'static/js/main.js'), 'utf8');
const subs = ['about.html','get-started.html','integrators.html','faq.html','404.html'].map((f) => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
const refs = new Set();
for (const m of (html + subs).matchAll(/(?:src|href|poster)="([^"#:]+?\.(?:webp|jpg|png|svg|mp4|vtt|css|js|ttf|html))"/g)) refs.add(m[1]);
for (const m of js.matchAll(/'(static\/media\/[^']+)'/g)) refs.add(m[1]);
for (const m of css.matchAll(/url\('\.\.\/([^']+)'\)/g)) refs.add('static/' + m[1]);
for (const r of refs) ok(fs.existsSync(path.join(root, r)), `asset exists: ${r}`);
for (const f of ['static/js/main.js', 'static/js/barfilm.js', 'static/js/demo.js', 'static/js/about.js', 'api/demo.js']) { try { execSync(`node --check "${path.join(root, f)}"`); ok(true, `syntax: ${f}`); } catch { ok(false, `syntax: ${f}`); } }
const ext = [...html.matchAll(/<script[^>]+src="(https?:[^"]+)"/g)].map((m) => m[1]);
ok(ext.every((u) => u.startsWith('https://www.googletagmanager.com/gtag/js?id=AW-18541176135')), 'only external script is the Google Ads tag (vendor libraries are local)');
ok(/Added people and classifications simulated/.test(html), 'hero photo disclosure present');
ok(/Real product · Customer names changed/.test(html), 'product-frame disclosure present');
ok(!/autoplay/.test(html.replace(/--autoplay[^"]*/g, '')), 'no autoplaying media with sound');
ok(/<video[^>]+data-field[^>]+muted/.test(html), 'field footage is muted');
ok(/prefers-reduced-motion/.test(html), 'reduced motion skips the opening');
ok(/data-skip/.test(html) && /data-replay/.test(html), 'skip and replay controls present');
const imgs = fs.readdirSync(path.join(root, 'static/media'));
ok(!imgs.some((f) => /generated|ai-|subject|property\.(png|jpg)/i.test(f)), 'no generated imagery in assets');
for (const f of ['robots.txt', 'sitemap.xml', 'llms.txt', 'llms-full.txt', 'site.webmanifest', '404.html']) ok(fs.existsSync(path.join(root, f)), `${f} present`);
for (const f of ['index.html', 'about.html', 'get-started.html', 'integrators.html', 'faq.html']) {
  const h = fs.readFileSync(path.join(root, f), 'utf8');
  const ld = [...h.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)];
  let valid = ld.length > 0; for (const m of ld) { try { JSON.parse(m[1]); } catch { valid = false; } }
  ok(valid && /rel="canonical" href="https:\/\/verdun\.ai/.test(h) && (h.match(/<h1\b/g) || []).length === 1, `SEO head + JSON-LD + one h1: ${f}`);
}
ok(!/[?&]timers/.test(html), 'test hooks removed');
console.log(fail ? `\n${fail} failing` : '\nall checks pass');
process.exit(fail ? 1 : 0);
