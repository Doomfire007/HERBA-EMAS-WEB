// Vercel Function: proxy ke Google Apps Script.
// GAS_URL dan API_TOKEN hanya di Environment Variables Vercel, tidak dikirim ke browser.

function json(res, status, body, cache) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', cache || 'no-store');
  res.status(status).send(JSON.stringify(body));
}

function queryOf(req) {
  if (req.query && typeof req.query === 'object' && Object.keys(req.query).length) return req.query;
  try {
    return Object.fromEntries(new URL(req.url, 'http://localhost').searchParams);
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  const url = process.env.GAS_URL;
  const token = process.env.API_TOKEN;
  if (!url || !token) {
    return json(res, 500, { ok: false, error: 'GAS_URL / API_TOKEN belum diset di Vercel' });
  }

  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'POST') {
    return json(res, 405, { ok: false, error: 'Method not allowed' });
  }

  try {
    let r;
    if (method === 'GET') {
      const u = new URL(url);
      Object.entries(queryOf(req)).forEach(([k, v]) => {
        if (v != null && k !== 'token') u.searchParams.set(k, String(v));
      });
      u.searchParams.set('token', token);
      r = await fetch(u, { redirect: 'follow' });
      res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');
    } else {
      const raw = req.body;
      const body = typeof raw === 'string' ? (raw ? JSON.parse(raw) : {}) : (raw || {});
      r = await fetch(url, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ ...body, token })
      });
      res.setHeader('Cache-Control', 'no-store');
    }
    const text = await r.text();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(r.ok ? 200 : 502).send(text);
  } catch (e) {
    json(res, 502, { ok: false, error: String(e.message || e) });
  }
}
