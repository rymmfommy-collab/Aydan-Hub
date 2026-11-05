// Aydan Hub Worker
// Serves the static site from /Aydan Hub and adds three dynamic routes:
//   /app/<slug>   one indexable page per item in the Supabase `files` table
//   /sitemap.xml  lists the home page and every item page
//   /robots.txt   points crawlers to the sitemap
//   /api/comments accepts new comments/questions (shown right away; admin can delete)

const SUPABASE_URL = 'https://tvasdkfdizdwkroatgno.supabase.co';
// Publishable key: safe to be public. Access is limited by row-level security.
const SUPABASE_KEY = 'sb_publishable_UQ0g7DJ4_Um1nrAEd6z4nA_LnMUIcSA';
const SITE_NAME = 'Aydan Hub';
const CACHE_SECONDS = 120;

// IndexNow (Bing, Yandex and others). The key is public by design: the same
// text is served at /<key>.txt so search engines can confirm you own the site.
const INDEXNOW_KEY = 'c2f08c072e75993255f893bafcf1877d';
// Tried in order. IndexNow shares submissions between participating search engines,
// so the first one that accepts is enough. If one is throttling (429), try the next.
const INDEXNOW_ENDPOINTS = [
  'https://api.indexnow.org/IndexNow',
  'https://www.bing.com/indexnow',
  'https://yandex.com/indexnow',
];
// Only this account may trigger notifications.
const ADMIN_EMAIL = 'rymmfommy@gmail.com';

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

async function supabase(path, fresh = false) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Accept: 'application/json' },
    ...(fresh ? {} : { cf: { cacheTtl: CACHE_SECONDS, cacheEverything: true } }),
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
  ul.links { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:10px; }
  ul.links a { display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:14px; color:#fff; text-decoration:none; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.12); }
  ul.links a:hover { border-color:var(--p); }
  ul.links .t { flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
  ul.links .n { font-weight:900; }
  ul.links .d { font-size:.85rem; color:#b9b3dd; }
  ul.links .go { flex-shrink:0; background:linear-gradient(45deg,var(--p),var(--s)); border-radius:8px; padding:6px 12px; font-size:.75rem; font-weight:900; text-transform:uppercase; }
  .cm { list-style:none; margin:0 0 18px; padding:0; display:flex; flex-direction:column; gap:10px; }
  .cm li { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.1); border-radius:14px; padding:12px 14px; }
  .cm .who { font-weight:900; }
  .cm .q { margin-left:8px; font-size:.65rem; background:rgba(255,0,222,.2); color:#ffb3f3; border-radius:999px; padding:1px 8px; text-transform:uppercase; letter-spacing:1px; }
  .cm .when { color:#9a93c4; font-size:.75rem; margin-left:8px; }
  .cm p { margin:6px 0 0; white-space:pre-line; overflow-wrap:anywhere; color:#e6e2ff; }
  .cm .rep { margin-top:8px; padding:8px 12px; border-left:3px solid var(--p); background:rgba(125,95,255,.12); border-radius:0 10px 10px 0; font-size:.92rem; }
  .cm .rep b { color:#cfc4ff; }
  form.cf { display:flex; flex-direction:column; gap:10px; background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.08); border-radius:14px; padding:16px; }
  form.cf input, form.cf textarea, form.cf select { font:inherit; color:#fff; background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.15); border-radius:10px; padding:10px 12px; width:100%; }
  form.cf textarea { min-height:90px; resize:vertical; }
  form.cf .row { display:flex; gap:10px; } form.cf .row > * { flex:1; min-width:0; }
  form.cf button { font:inherit; border:0; cursor:pointer; color:#fff; background:linear-gradient(45deg,var(--p),var(--s)); border-radius:12px; padding:12px; font-weight:900; text-transform:uppercase; letter-spacing:1px; }
  form.cf button:disabled { opacity:.6; }
  form.cf .hp { position:absolute; left:-9999px; height:0; overflow:hidden; }
  #cmsg { font-size:.9rem; min-height:1.2em; margin:0; }
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

// Search engines show roughly 25-160 characters. Trim long text at a word boundary.
function metaDescription(text, fallback) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length < 25) return fallback;
  if (clean.length <= 155) return clean;
  const cut = clean.slice(0, 155);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 100 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.\-]+$/, '') + '…';
}

function fmtDate(d) {
  const t = String(d || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : '';
}

function renderComments(item, comments) {
  const list = (comments || []).map((c) => `<li><span class="who">${esc(c.name)}</span>${c.kind === 'question' ? '<span class="q">Question</span>' : ''}<span class="when">${esc(fmtDate(c.created_at))}</span><p>${esc(c.body)}</p>${c.reply ? `<div class="rep"><b>${SITE_NAME}:</b> ${esc(c.reply)}</div>` : ''}</li>`).join('');
  return `<h2>Comments &amp; questions</h2>
${list ? `<ul class="cm">${list}</ul>` : '<p class="desc">No comments yet. Be the first to ask or comment.</p>'}
<form class="cf" id="cform" data-slug="${esc(item.slug)}">
  <div class="row">
    <input name="name" placeholder="Your name" maxlength="40" required autocomplete="nickname">
    <select name="kind" aria-label="Type"><option value="comment">Comment</option><option value="question">Question</option></select>
  </div>
  <textarea name="body" placeholder="Write your comment or question (no links)" maxlength="1000" required></textarea>
  <div class="hp" aria-hidden="true"><input name="website" tabindex="-1" autocomplete="off"></div>
  <button type="submit">Post</button>
  <p id="cmsg" role="status"></p>
</form>
<script>
(function(){
  var f=document.getElementById('cform'); if(!f) return;
  var m=document.getElementById('cmsg'), b=f.querySelector('button');
  var T={bad_name:'Please enter your name.',bad_body:'Please write at least 2 characters.',links:'Links are not allowed in comments.',rate:'You are posting too fast. Try again in a few minutes.',busy:'Too many comments waiting right now. Try again later.',bad_item:'This item no longer exists.'};
  f.addEventListener('submit',function(e){
    e.preventDefault(); b.disabled=true; m.textContent='Sending...';
    var d=new FormData(f);
    fetch('/api/comments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug:f.dataset.slug,name:d.get('name'),kind:d.get('kind'),body:d.get('body'),website:d.get('website')})})
    .then(function(r){return r.json();})
    .then(function(j){
      if(j&&j.ok){f.reset();m.textContent='Thank you! Your message is posted. It will show on this page within a couple of minutes.';}
      else{m.textContent=T[j&&j.error]||'Could not send. Please try again.';}
      b.disabled=false;
    }).catch(function(){m.textContent='Could not send. Please try again.';b.disabled=false;});
  });
})();
</script>`;
}

function renderAppPage(item, origin, comments) {
  const canonical = `${origin}/app/${item.slug}`;
  const label = CATEGORY_LABELS[item.category] || 'Item';
  const image = safeHttp(item.image_url);
  const download = safeHttp(item.url);
  // Up to 3 extra links, each with a short description (used for games)
  const links = (Array.isArray(item.links) ? item.links : [])
    .map((l) => ({ label: String((l && l.label) || '').slice(0, 40), url: safeHttp(l && l.url), description: String((l && l.description) || '').slice(0, 140) }))
    .filter((l) => l.url)
    .slice(0, 3);

  const description = metaDescription(
    item.description,
    `${item.title}: details and official download link on ${SITE_NAME}.`
  );

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
    ${download && !links.length ? `<a class="btn" href="${esc(download)}" target="_blank" rel="noopener noreferrer nofollow">Get ${esc(item.title)}</a>` : ''}
  </div>
</div>
${item.description ? `<h2>About</h2><p class="desc">${esc(item.description)}</p>` : ''}
${links.length ? `<h2>Links</h2><ul class="links">${links.map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer nofollow"><span class="t"><span class="n">${esc(l.label || 'Link')}</span>${l.description ? `<span class="d">${esc(l.description)}</span>` : ''}</span><span class="go">Get</span></a></li>`).join('')}</ul>` : ''}
${renderComments(item, comments)}
${rows.length ? `<h2>Details</h2><dl>${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` : ''}
<p class="note">${SITE_NAME} links to the official source where possible. Check the permissions, license and terms of any app before you install it.</p>`;

  // A front-page tile that just points to another page of the site has no content of its own
  const robots = String(item.url || '').startsWith('/') ? 'noindex' : undefined;
  return layout({ title, description, canonical, image, robots, jsonLd, body });
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
  // Comments are optional: if they fail to load, the page still works.
  let comments = [];
  try {
    comments = await supabase(`comments?item_slug=eq.${encodeURIComponent(slug)}&status=eq.approved&select=name,body,kind,reply,created_at&order=created_at.asc&limit=100`);
  } catch (e) { /* show the page without comments */ }
  return htmlResponse(renderAppPage(rows[0], origin, comments));
}

async function handleSitemap(origin) {
  let rows;
  try {
    rows = await supabase('files?select=slug,url,created_at&slug=not.is.null&order=created_at.desc&limit=1000');
  } catch (e) {
    return new Response('Sitemap temporarily unavailable', { status: 503, headers: { 'Retry-After': '60' } });
  }
  const urls = [`<url><loc>${esc(origin)}/</loc></url>`].concat(
    rows
      .filter((r) => /^[a-z0-9-]+$/.test(r.slug || '') && !String(r.url || '').startsWith('/'))
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

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

// Confirms the caller is logged in to Supabase as the admin account.
async function isAdmin(request) {
  const auth = request.headers.get('Authorization') || '';
  if (!/^Bearer [\w-]+\.[\w-]+\.[\w-]+$/.test(auth)) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_KEY, Authorization: auth },
    });
    if (!res.ok) return false;
    const user = await res.json();
    return String(user.email || '').toLowerCase() === ADMIN_EMAIL;
  } catch (e) {
    return false;
  }
}

// POST /api/indexnow  body: { "slugs": ["moviebox"], "all": false }
// The Worker builds the URL list itself, so a caller can never submit other sites.
async function handleIndexNow(request, url) {
  if (!(await isAdmin(request))) return json({ ok: false, error: 'Not allowed' }, 401);

  let body = {};
  try { body = await request.json(); } catch (e) { /* empty body is fine */ }

  const origin = url.origin;
  const urls = new Set([`${origin}/`]);

  if (body && body.all === true) {
    try {
      const rows = await supabase('files?select=slug&slug=not.is.null&limit=1000', true);
      rows.forEach((r) => { if (/^[a-z0-9-]{1,100}$/.test(r.slug || '')) urls.add(`${origin}/app/${r.slug}`); });
    } catch (e) {
      return json({ ok: false, error: 'Could not read the list of pages' }, 502);
    }
  }
  const slugs = Array.isArray(body && body.slugs) ? body.slugs.slice(0, 50) : [];
  slugs.forEach((s) => { if (/^[a-z0-9-]{1,100}$/.test(String(s))) urls.add(`${origin}/app/${s}`); });

  const urlList = [...urls];
  const payload = JSON.stringify({
    host: url.hostname,
    key: INDEXNOW_KEY,
    keyLocation: `${origin}/${INDEXNOW_KEY}.txt`,
    urlList,
  });

  // IndexNow answers 200 or 202 when the submission is accepted.
  const tried = [];
  for (const endpoint of INDEXNOW_ENDPOINTS) {
    const name = new URL(endpoint).hostname;
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: payload,
      });
      tried.push({ endpoint: name, status: res.status });
      if (res.status === 200 || res.status === 202) {
        return json({ ok: true, status: res.status, via: name, submitted: urlList.length, tried });
      }
    } catch (e) {
      tried.push({ endpoint: name, status: 0 });
    }
  }
  // Report the last real status so the admin page can show a useful code.
  const last = [...tried].reverse().find((t) => t.status) || { status: 0 };
  return json({ ok: false, status: last.status || undefined, error: last.status ? undefined : 'Could not reach IndexNow', tried }, last.status ? 200 : 502);
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// POST /api/comments  body: { slug, name, kind, body, website }
async function handleComment(request, url) {
  const origin = request.headers.get('Origin');
  if (origin && origin !== url.origin) return json({ ok: false, error: 'forbidden' }, 403);
  const raw = await request.text();
  if (raw.length > 6000) return json({ ok: false, error: 'too_big' }, 413);
  let b;
  try { b = JSON.parse(raw); } catch (e) { return json({ ok: false, error: 'bad_request' }, 400); }
  if (!b || typeof b !== 'object') return json({ ok: false, error: 'bad_request' }, 400);
  // Hidden field only bots fill in: pretend it worked.
  if (b.website) return json({ ok: true });

  const slug = String(b.slug || '');
  if (!/^[a-z0-9-]{1,100}$/.test(slug)) return json({ ok: false, error: 'bad_item' }, 400);
  const ip = request.headers.get('CF-Connecting-IP') || '';
  const ipHash = ip ? (await sha256Hex(`aydan:${ip}`)).slice(0, 32) : null;

  let res;
  try {
    res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/submit_comment`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_slug: slug,
        p_name: String(b.name || '').slice(0, 100),
        p_body: String(b.body || '').slice(0, 2000),
        p_kind: String(b.kind || 'comment'),
        p_ip: ipHash,
      }),
    });
  } catch (e) {
    return json({ ok: false, error: 'unavailable' }, 502);
  }
  if (!res.ok) return json({ ok: false, error: 'unavailable' }, 502);
  const code = await res.json();
  if (code === 'ok') return json({ ok: true });
  return json({ ok: false, error: String(code) }, code === 'rate' ? 429 : 400);
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

    if (path === '/api/indexnow') {
      if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
      return handleIndexNow(request, url);
    }

    if (path === '/api/comments') {
      if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
      return handleComment(request, url);
    }

    if (path === `/${INDEXNOW_KEY}.txt`) {
      if (!isRead) return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
      return new Response(INDEXNOW_KEY, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }

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
