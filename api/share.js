// Vercel serverless function: gives each shared link its own preview (photo, title, price).
// Link format: https://YOUR-SITE.vercel.app/s/listing/12   (also /s/post/5 and /s/spot/3)
// No editing needed: it reads your site address automatically.

const SUPABASE_URL = 'https://xwqmcrzyxhqmjfezfedu.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3cW1jcnp5eGhxbWpmZXpmZWR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2OTk0ODEsImV4cCI6MjEwODI3NTQ4MX0.rFYyy7CqcuuflJJa6KdAChvlZ9V0xU2QtuTBz04W46U';
const TABLES = { listing: 'listings', post: 'posts', spot: 'spots' };

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clip = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

module.exports = async (req, res) => {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const origin = 'https://' + host;
  const kind = String((req.query && req.query.kind) || '');
  const id = String((req.query && req.query.id) || '');

  if (!TABLES[kind] || !/^\d+$/.test(id)) {
    res.statusCode = 302; res.setHeader('Location', origin + '/'); return res.end();
  }

  let item = null;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${TABLES[kind]}?id=eq.${id}&select=*`, {
      headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY },
    });
    item = (await r.json())[0] || null;
  } catch (e) {}

  let title = 'Coastline Fishing – Be Part of Us!';
  let desc = 'Fishing spots, tides, weather and anglers near you.';
  let image = origin + '/og-image.jpg';

  if (item && kind === 'listing') {
    const cur = item.currency || 'AED';
    const price = (cur.length > 1 ? cur + ' ' : cur) + Number(item.price).toLocaleString('en');
    title = `${item.title} – ${price}`;
    desc = clip(`${item.condition || ''} · ${item.description || 'For sale on Coastline Fishing Marketplace'}`, 160);
    if (item.photo_url) image = item.photo_url;
  } else if (item && kind === 'spot') {
    title = `Fishing spot: ${item.name}`;
    desc = clip(`Catch: ${item.species || '–'} · Bait: ${item.bait || '–'}. ${item.notes || ''}`, 160);
    if (item.photo_url) image = item.photo_url;
  } else if (item && kind === 'post') {
    title = clip(item.body, 70) || 'A post on Coastline Fishing';
    desc = 'See this post on Coastline Fishing – Be Part of Us!';
    if (item.photo_url) image = item.photo_url;
  }

  const target = `${origin}/#${kind}=${id}`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta property="og:type" content="website"><meta property="og:site_name" content="Coastline Fishing">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(image)}"><meta property="og:url" content="${esc(origin + req.url)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${esc(image)}">
<meta http-equiv="refresh" content="0;url=${esc(target)}">
</head><body><p>Opening Coastline… <a href="${esc(target)}">Tap here if nothing happens</a></p>
<script>location.replace(${JSON.stringify(target)})</script></body></html>`;

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  res.end(html);
};
