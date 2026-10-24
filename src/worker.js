// Aydan Hub Worker
// Serves the static site from /Aydan Hub and adds three dynamic routes:
//   /app/<slug>   one indexable page per item in the Supabase `files` table
//   /sitemap.xml  lists the home page and every item page
//   /robots.txt   points crawlers to the sitemap

const SUPABASE_URL = 'https://tvasdkfdizdwkroatgno.supabase.co';
// Publishable key: safe to be public. Access is limited by row-level security.
const SUPABASE_KEY = 'sb_publishable_UQ0g7DJ4_Um1nrAEd6z4nA_LnMUIcSA';
const SITE_NAME = 'Aydan Hub';
const CACHE_SECONDS = 120;

const CATEGORY_LABELS = {
  GAMES: 'Game',
  APPS: 'App',
  LINK: 'Link',
  FILES: 'File',
  HOME: 'File',
};

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// Returns a normalised http(s) URL, or null for anything else.
function safeHttp(u) {
  try {
    const x = new URL(u);
    return x.protocol === 'https:' || x.protocol === 'http:' ? x.href : null;
  } catch (e) {
    return null;
  }
}

async function supabase(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Accept: 'application/json' },
    cf: { cacheTtl: CACHE_SECONDS, cacheEverything: true },
  });
  if (!res.ok) throw new Error(`Supabase responded ${res.status}`);
  return res.json();
}

function htmlResponse(body, status = 200, extra = {}) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': status === 200 ? `public, max-age=${CACHE_SECONDS}` : 'no-store',
      ...extra,
    },
  });
}

const BASE_CSS = `
  :root { --p:#7d5fff; --s:#ff00de; --bg:#070512; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:#fff; font-family:'Inter',system-ui,sans-serif; line-height:1.55; }
  header { display:flex; align-items:center; gap:10px; padding:10px 5%; background:rgba(7,5,18,.95); border-bottom:1px solid rgba(255,255,255,.1); }
  header a { display:flex; align-items:center; gap:10px; color:#fff; text-decoration:none; font-weight:900; letter-spacing:2px; }
  header img { width:40px; height:40px; filter:drop-shadow(0 0 8px rgba(125,95,255,.45)); }
  main { max-width:720px; margin:0 auto; padding:28px 5% 60px; }
  h1 { font-size:clamp(1.6rem,6vw,2.4rem); font-weight:900; margin:0 0 6px; }
  .crumbs { font-size:.8rem; color:#9a93c4; margin-bottom:18px; }
  .crumbs a { color:#cfc4ff; text-decoration:none; }
  .hero { display:flex; gap:18px; align-items:flex-start; flex-wrap:wrap; margin-bottom:22px; }
  .icon { width:140px; height:140px; border-radius:18px; object-fit:cover; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1); }
  .tag { display:inline-block; background:rgba(125,95,255,.25); color:#cfc4ff; border-radius:999px; padding:2px 12px; font-size:.75rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; }
  .btn { display:inline-block; margin-top:14px; background:linear-gradient(45deg,var(--p),var(--s)); color:#fff; text-decoration:none; padding:14px 28px; border-radius:12px; font-weight:900; text-transform:uppercase; letter-spacing:1px; }
  h2 { font-size:1.1rem; margin:30px 0 10px; color:var(--p); text-transform:uppercase; letter-spacing:1px; }
  p.desc { white-space:pre-line; color:#e6e2ff; }
  dl { display:grid; grid-template-columns:max-content 1fr; gap:8px 18px; margin:0; background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.08); border-radius:14px; padding:16px 18px; }
  dt { color:#9a93c4; font-size:.8rem; text-transform:uppercase; letter-spacing:1px; font-weight:700; }
  dd { margin:0; overflow-wrap:anywhere; }
  .note { margin-top:26px; font-size:.8rem; color:#9a93c4; }
`;

function layout({ title, description, canonical, image, robots, jsonLd, body }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#070512">
${robots ? `<meta name="robots" content="${esc(robots)}">` : ''}
<link rel="canonical" href="${esc(canonical)}">
<link rel="icon" type="image/png" href="/favicon.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
${image ? `<meta property="og:image" content="${esc(image)}">` : ''}
<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
<style>${BASE_CSS}</style>
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>` : ''}
</head>
<body>
<header><a href="/"><img src="/logo.png" alt="${SITE_NAME} logo"><span>AYDAN</span></a></header>
<main>
${body}
</main>
</body>
</html>`;
}

function renderAppPage(item, origin) {
  const canonical = `${origin}/app/${item.slug}`;
  const label = CATEGORY_LABELS[item.category] || 'Item';
  const image = safeHttp(item.image_url);
  const download = safeHttp(item.url);

  const description =
    (item.description && item.description.trim().slice(0, 300)) ||
    `${item.title}: details and official download link on ${SITE_NAME}.`;

  const title = `${item.title} Download & Details | ${SITE_NAME}`;

  // Only include structured-data fields we actually have. Nothing is invented.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': item.category === 'GAMES' ? 'VideoGame' : 'SoftwareApplication',
    name: item.title,
    url: canonical,
  };
  if (item.description) jsonLd.description = item.description.trim().slice(0, 500);
  if (image) jsonLd.image = image;
  if (item.version) jsonLd.softwareVersion = item.version;
  if (item.developer) jsonLd.author = { '@type': 'Organization', name: item.developer };
  if (item.license) jsonLd.license = item.license;
  if (item.created_at) jsonLd.datePublished = item.created_at;
  if (download) jsonLd.downloadUrl = download;

  const rows = [
    ['Type', label],
    ['Version', item.version],
    ['Developer', item.developer],
    ['License', item.license],
    ['Size', item.size],
  ].filter(([, v]) => v);

  const body = `
<p class="crumbs"><a href="/">Home</a> / ${esc(label)}s / ${esc(item.title)}</p>
<div class="hero">
  ${image ? `<img class="icon" src="${esc(image)}" alt="${esc(item.title)} icon" width="140" height="140">` : ''}
  <div>
    <span class="tag">${esc(label)}</span>
    <h1>${esc(item.title)}</h1>
    ${download ? `<a class="btn" href="${esc(download)}" target="_blank" rel="noopener noreferrer nofollow">Get ${esc(item.title)}</a>` : ''}
  </div>
</div>
${item.description ? `<h2>About</h2><p class="desc">${esc(item.description)}</p>` : ''}
${rows.length ? `<h2>Details</h2><dl>${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` : ''}
<p class="note">${SITE_NAME} links to the official source where possible. Check the permissions, license and terms of any app before you install it.</p>`;

  return layout({ title, description, canonical, image, jsonLd, body });
}

function renderNotFound() {
  return layout({
    title: `Not found | ${SITE_NAME}`,
    description: 'This page does not exist.',
    canonical: 'https://x.aydanhub.workers.dev/',
    robots: 'noindex',
    body: `<h1>Page not found</h1><p>That item does not exist or was removed.</p><a class="btn" href="/">Back to ${SITE_NAME}</a>`,
  });
}

function renderUnavailable() {
  return layout({
    title: `Temporarily unavailable | ${SITE_NAME}`,
    description: 'Please try again shortly.',
    canonical: 'https://x.aydanhub.workers.dev/',
    robots: 'noindex',
    body: `<h1>Please try again</h1><p>The page could not load right now. Try again in a minute.</p>`,
  });
}

async function handleApp(slug, origin) {
  let rows;
  try {
    rows = await supabase(`files?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`);
  } catch (e) {
    return htmlResponse(renderUnavailable(), 503, { 'Retry-After': '60' });
  }
  if (!rows.length) return htmlResponse(renderNotFound(), 404);
  return htmlResponse(renderAppPage(rows[0], origin));
}

async function handleSitemap(origin) {
  let rows;
  try {
    rows = await supabase('files?select=slug,created_at&slug=not.is.null&order=created_at.desc&limit=1000');
  } catch (e) {
    return new Response('Sitemap temporarily unavailable', { status: 503, headers: { 'Retry-After': '60' } });
  }
  const urls = [`<url><loc>${esc(origin)}/</loc></url>`].concat(
    rows
      .filter((r) => /^[a-z0-9-]+$/.test(r.slug || ''))
      .map((r) => {
        const lastmod = r.created_at ? `<lastmod>${esc(String(r.created_at).slice(0, 10))}</lastmod>` : '';
        return `<url><loc>${esc(origin)}/app/${esc(r.slug)}</loc>${lastmod}</url>`;
      })
  );
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': `public, max-age=${CACHE_SECONDS}`,
    },
  });
}

function handleRobots(origin) {
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const isRead = request.method === 'GET' || request.method === 'HEAD';

    if (path === '/robots.txt' || path === '/sitemap.xml' || path.startsWith('/app/')) {
      if (!isRead) return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });

      if (path === '/robots.txt') return handleRobots(url.origin);
      if (path === '/sitemap.xml') return handleSitemap(url.origin);

      const match = path.match(/^\/app\/([a-z0-9-]{1,100})\/?$/);
      if (!match) return htmlResponse(renderNotFound(), 404);
      return handleApp(match[1], url.origin);
    }

    return env.ASSETS.fetch(request);
  },
};
