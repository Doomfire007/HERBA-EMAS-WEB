import { get, post } from './api.js';
import { $, $$, esc, nf, skeleton } from './ui.js';

const state = { primer: '', sekunder: '' };
const SIG = ['M4 28c8-14 14 8 22-4s10-10 18 0 12 6 20-6', 'M4 20c10 10 16-12 26 0s14 8 24-8 10 6 18 4'];

export async function renderWps(view, tipe) {
  view.innerHTML = skeleton();
  const d = await get('wps', { tipe, pekan: state[tipe] });
  state[tipe] = d.pekan;
  const { doc, rows, days } = d, sek = tipe === 'sekunder';
  let edit = false;

  const sumDay = k => rows.reduce((s, r) => s + (+r[k] || 0), 0);
  const ostBatch = rows.reduce((s, r) => s + (+r.Ost_Batch || 0), 0), ostQty = rows.reduce((s, r) => s + (+r.Outstanding || 0), 0);
  const rencana = days.reduce((s, x) => s + sumDay(x.key), 0);
  const unit = sek ? 'Pcs/Pack' : 'Kg / Pcs';
  const title = sek ? 'Weekly Production Schedule Pengemasan (Sekunder)' : 'Weekly Production Schedule Pengolahan & Primer';

  const cell = (r, f, cls = '') => {
    const v = r[f];
    return `<td class="r ${cls}" data-f="${f}">${edit ? `<input data-no="${r.No}" data-tipe="${r.Tipe}" data-f="${f}" value="${esc(v)}" inputmode="decimal">` : (v === '' ? '<span class="muted">-</span>' : nf(v, String(v).includes('.') ? 1 : 0))}</td>`;
  };
  const table = () => {
    let prev = '', html = '';
    rows.forEach((r, i) => {
      const span = rows.filter(x => x.Proses === r.Proses).length;
      const first = r.Proses !== prev; prev = r.Proses;
      const flag = r.Flag ? `<span class="chip warn" style="margin-left:6px">${esc(r.Flag)}</span>` : '';
      html += `<tr><td class="c muted">${r.No}</td>${first ? `<td class="proc" rowspan="${span}">${esc(r.Proses)}</td>` : ''}
        <td><b>${esc(r.Produk)}</b>${r.Line && sek ? `<span class="chip ok" style="margin-left:6px">${esc(r.Line)}</span>` : ''}${flag}</td>
        ${sek ? `<td class="c">${esc(r.Jenis)}</td><td class="c">${esc(r.Sediaan)}</td>` : `<td class="c muted">${esc(r.Satuan)}</td>`}
        ${cell(r, 'Std')}${cell(r, 'Batch_Size')}${cell(r, 'Ost_Batch', +r.Ost_Batch ? 'ost' : '')}${cell(r, 'Outstanding', +r.Outstanding ? 'ost' : '')}
        ${days.map(x => cell(r, x.key, r.Flag && +r[x.key] && +r.Outstanding ? 'fl' : (+r[x.key] ? 'has' : ''))).join('')}</tr>`;
    });
    return `<div class="tw" style="max-height:70vh"><table><thead><tr><th>No</th><th>Proses</th><th>Produk</th>${sek ? '<th>Jenis</th><th>Sediaan</th>' : '<th>Sat</th>'}<th>Std</th><th>Batch size</th><th>Ost batch</th><th>Outstanding</th>
      ${days.map(x => `<th class="c">${x.label}<br><span style="font-weight:500">${x.hari}</span></th>`).join('')}</tr></thead><tbody>${html}</tbody>
      <tfoot><tr><td colspan="${sek ? 6 : 5}" class="c">TOTAL RENCANA PRODUKSI</td><td class="r">${nf(ostBatch)}</td><td class="r">${nf(ostQty)}</td>${days.map(x => `<td class="r">${nf(sumDay(x.key)) === '0' ? '-' : nf(sumDay(x.key))}</td>`).join('')}</tr></tfoot></table></div>`;
  };

  const paint = () => {
    $('#tbl').innerHTML = table();
    $$('#tbl input').forEach(inp => inp.onchange = async () => {
      inp.className = 'saving';
      try {
        await post('saveWps', { tipe: inp.dataset.tipe, pekan: d.pekan, no: inp.dataset.no, field: inp.dataset.f, value: inp.value.trim().replace(',', '.') });
        const row = rows.find(r => String(r.No) === inp.dataset.no && r.Tipe === inp.dataset.tipe);
        row[inp.dataset.f] = inp.value.trim() === '' ? '' : (isNaN(+inp.value) ? inp.value : +inp.value);
        inp.className = 'saved';
      } catch (e) { inp.className = 'err'; inp.title = e.message; }
    });
  };

  view.innerHTML = `
  <div class="page-h"><div><div class="crumb">PPIC Hub &rsaquo; ${sek ? 'WPS Sekunder' : 'WPS Pengolahan &amp; Primer'} &rsaquo; Pekan ${d.pekan}</div>
    <div class="row"><span class="chip info tnum">No. ${esc(doc.No_Dok)}</span><span class="chip ${doc.Status === 'Resmi Disetujui' ? 'ok' : 'warn'}" id="st">${esc(doc.Status)}</span></div>
    <h1 style="margin-top:6px">${title}</h1><div class="muted">Pekan ${d.pekan} &bull; ${days[0].label} s/d ${days[6].label}</div></div>
    <div class="row noprint"><select id="pk" aria-label="Pekan">${d.pekanList.map(p => `<option ${p === d.pekan ? 'selected' : ''} value="${p}">Pekan ${p}</option>`).join('')}</select>
      <button class="btn" id="edit">Mode Interaktif</button><button class="btn" id="csv">Export Excel</button><button class="btn" onclick="print()">Print A4</button><button class="btn pri" id="sign">Sign Off Document</button></div></div>

  <div class="grid g12" style="margin-bottom:16px">
    <div class="card kpi s3"><span class="lbl">Rencana output pekan</span><div class="v tnum">${nf(rencana)}<small>${unit}</small></div></div>
    <div class="card kpi b s3"><span class="lbl">Outstanding batch</span><div class="v tnum">${nf(ostQty)}<small>${sek ? 'Pcs' : 'Kg'}</small></div><span class="chip warn">${nf(ostBatch)} batch carryover</span></div>
    <div class="card kpi t s3"><span class="lbl">Utilisasi ${sek ? 'lini sekunder' : 'reaktor & line'}</span><div class="v tnum">${nf(doc.Utilisasi, 1)}<small>%</small></div><div class="bar"><i style="width:${Math.min(100, doc.Utilisasi)}%"></i></div></div>
    <div class="card kpi w s3"><span class="lbl">${sek ? 'Prioritas kemas utama' : 'Reaktor kritis / sanitasi'}</span><div class="v" style="font-size:18px;line-height:26px">${esc(doc.Kritis)}</div><span class="muted" style="font-size:12px">${doc.Hari_Kerja} hari kerja aktif (Senin&ndash;Sabtu, Ahad sanitasi)</span></div>
  </div>

  <div class="card" style="margin-bottom:16px"><div class="legend"><b>Legenda:</b><span><i style="background:#DCFCE7"></i>Terjadwal</span><span><i style="background:#FEF3C7"></i>Outstanding</span><span><i style="background:#FDE68A"></i>Carryover berjalan</span><span class="muted">Satuan: ${sek ? 'Pcs / Botol / Pack' : 'Kg, Btr, Pcs'}</span></div></div>
  <div id="tbl"></div>

  <div class="grid g12" style="margin:16px 0">
    <div class="card s7"><div class="row" style="justify-content:space-between"><h3 style="font-size:15px">Catatan ${sek ? 'eksekusi lini & prioritas kemas' : 'mesin, filter reaktor & priority list'}</h3><span class="chip tnum">PPIC-${sek ? 'SEKUNDER' : 'ENG-LOG'}</span></div>
      <div class="note" id="note" style="margin-top:10px" ${''}>${esc(doc.Catatan)}</div><button class="btn noprint" id="editnote" style="margin-top:8px">Ubah catatan</button></div>
    <div class="card s5"><h3 style="font-size:15px">Otorisasi &amp; pengesahan dokumen</h3><div class="muted" style="font-size:12px;margin:2px 0 10px">Purbalingga, ${new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</div>
      <div class="grid" style="grid-template-columns:1fr 1fr">${[['Dibuat oleh', doc.Dibuat_Oleh, doc.Jabatan_Dibuat, 0], ['Disetujui oleh', doc.Disetujui_Oleh, doc.Jabatan_Setuju, 1]].map(([h, n, j, i]) => `<div class="sign"><span class="lbl">${h}</span><svg viewBox="0 0 80 40"><path d="${SIG[i]}" fill="none" stroke="${i ? '#0284c7' : '#00652c'}" stroke-width="1.6"/></svg><b>${esc(n)}</b><small>${esc(j)}</small></div>`).join('')}</div>
      <div class="muted tnum" style="font-size:11px;margin-top:10px">Hash: ${esc(doc.Hash) || '-'}</div></div>
  </div>`;

  paint();
  $('#pk').onchange = e => { state[tipe] = e.target.value; renderWps(view, tipe); };
  $('#edit').onclick = e => { edit = !edit; e.target.classList.toggle('on', edit); paint(); };
  $('#csv').onclick = () => {
    const head = ['No', 'Proses', 'Produk', 'Std', 'Batch', 'OstBatch', 'Outstanding', ...days.map(x => x.tgl)];
    const csv = [head, ...rows.map(r => [r.No, r.Proses, r.Produk, r.Std, r.Batch_Size, r.Ost_Batch, r.Outstanding, ...days.map(x => r[x.key])])].map(l => l.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv' })), download: `WPS-${tipe}-pekan${d.pekan}.csv` }); a.click();
  };
  $('#sign').onclick = async e => {
    if (!confirm('Sign off dokumen ini? Status akan menjadi "Resmi Disetujui".')) return;
    e.target.disabled = true;
    try { await post('saveDoc', { tipe, pekan: d.pekan, fields: { Status: 'Resmi Disetujui' } }); renderWps(view, tipe); } catch (err) { alert(err.message); e.target.disabled = false; }
  };
  $('#editnote').onclick = async () => {
    const v = prompt('Catatan (gunakan baris baru dengan \\n):', doc.Catatan.replace(/\n/g, '\\n')); if (v == null) return;
    await post('saveDoc', { tipe, pekan: d.pekan, fields: { Catatan: v.replace(/\\n/g, '\n') } }); renderWps(view, tipe);
  };
}
