import { get } from './api.js';
import { $, $$, esc, skeleton } from './ui.js';
import { renderDashboard } from './dashboard.js';
import { renderWps } from './wps.js';
import { renderSL } from './servicelevel.js';

const routes = {
  'dashboard': v => renderDashboard(v),
  'wps-primer': v => renderWps(v, 'primer'),
  'wps-sekunder': v => renderWps(v, 'sekunder'),
  'service-level': v => renderSL(v)
};
async function go() {
  const key = (location.hash || '#/dashboard').slice(2);
  const r = routes[key] ? key : 'dashboard';
  $$('.side nav a').forEach(a => a.classList.toggle('on', a.dataset.r === r));
  $('#side').classList.remove('open');
  const view = $('#view'); view.innerHTML = skeleton();
  try { await routes[r](view); setSync(true); }
  catch (e) { setSync(false); view.innerHTML = `<div class="alert"><b>Gagal memuat data.</b> ${esc(e.message)}<br>Periksa GAS_URL / API_TOKEN di Vercel dan deployment Apps Script.</div>`; }
}
function setSync(ok) { const s = $('#sync'); s.className = 'chip ' + (ok ? 'ok' : 'bad'); s.textContent = ok ? 'Terhubung ke Sheet' : 'Sheet tidak terhubung'; }
$('#today').textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
$('#menu').onclick = () => $('#side').classList.toggle('open');
addEventListener('hashchange', go); go();
