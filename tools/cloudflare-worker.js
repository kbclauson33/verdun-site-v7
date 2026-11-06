// Cloudflare Worker for verdun.ai: serve the new site's pages from Vercel and leave every other path on the current site.
// Deploy: Cloudflare dashboard → Workers & Pages → Create Worker → paste this → add a route `verdun.ai/*` on the verdun.ai zone.
// Roll back: delete the route. The current site takes over again immediately.
const ORIGIN = 'https://verdun-site.vercel.app'; // change if the Vercel project moves to Verdun's team
const NEW_PAGES = new Set(['/', '/about', '/get-started', '/integrators', '/faq', '/llms.txt', '/llms-full.txt', '/robots.txt', '/sitemap.xml', '/site.webmanifest']);

export default {
  async fetch(request) {
    const url = new URL(request.url);
    let path = url.pathname.replace(/\/+$/, '') || '/';
    if (path.endsWith('.html')) path = path === '/index.html' ? '/' : path.slice(0, -5); // /about.html → /about
    const toNew = NEW_PAGES.has(path) || path.startsWith('/static/') || path === '/api/demo';
    if (!toNew) return fetch(request); // Leadership, Essays, Careers, Privacy, Terms, SMS opt-in, images, film: current site

    const target = new URL(url.pathname + url.search, ORIGIN);
    const upstream = await fetch(new Request(target, request));
    const headers = new Headers(upstream.headers);
    headers.delete('x-robots-tag'); // the vercel.app preview is noindex; verdun.ai must not be
    return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers });
  },
};
