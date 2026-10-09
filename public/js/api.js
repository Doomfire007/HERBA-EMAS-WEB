const BASE = '/api/gas';
async function parse(r) {
  let j; try { j = await r.json(); } catch { throw new Error('Respons server tidak valid (HTTP ' + r.status + ')'); }
  if (!j.ok) throw new Error(j.error || 'Terjadi kesalahan');
  return j.data;
}
export async function get(action, params = {}) {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''));
  return parse(await fetch(BASE + '?' + new URLSearchParams({ action, ...clean })));
}
export async function post(action, body = {}) {
  return parse(await fetch(BASE, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ action, ...body }) }));
}
