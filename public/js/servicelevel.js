import { get } from './api.js';
import { $, esc, nf, pc, skeleton } from './ui.js';

let bulan = '';
const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const label = ym => { const [y, m] = ym.split('-'); return BLN[+m - 1] + ' ' + y; };

export async function renderSL(view) {
  view.innerHTML = skeleton();
  const d = await get('serviceLevel', { bulan });
  bulan = d.bulan;
  const t = d.total, c = d.config, ok = t.sl >= 100;
  const last = new Date(+d.bulan.slice(0, 4), +d.bulan.slice(5), 0);
  view.innerHTML = `
  <div class="page-h noprint"><div><div class="crumb">PPIC Hub &rsaquo; Service Level HEW to HNI</div><h1>Laporan Service Level Bulanan</h1></div>
    <div class="row"><select id="bl" aria-label="Bulan">${d.bulanList.map(b => `<option value="${b}" ${b === d.bulan ? 'selected' : ''}>${label(b)}</option>`).join('')}</select>
    <button class="btn" id="csv">Export Excel</button><button class="btn pri" onclick="print()">Cetak Dokumen (A4)</button></div></div>

  <div class="grid g12 noprint">
    <div class="card kpi b s3"><span class="lbl">Total order masuk</span><div class="v tnum">${nf(t.order)}<small>Pcs</small></div><span class="muted" style="font-size:12px">${t.sku} SKU dialokasikan ke HNI</span></div>
    <div class="card kpi t s3"><span class="lbl">Realisasi pengiriman</span><div class="v tnum">${nf(t.kirim)}<small>Pcs</small></div><span class="delta ${t.selisih >= 0 ? 'up' : 'dn'}">${t.selisih >= 0 ? '+' : ''}${nf(t.selisih)} Pcs ${t.selisih >= 0 ? 'surplus buffer' : 'kurang kirim'}</span></div>
    <div class="card kpi s3"><span class="lbl">Service level HEW</span><div class="v tnum" style="color:var(--primary)">${nf(t.sl, 2)}%<small>Target: 100%</small></div><div class="bar"><i style="width:${Math.min(100, t.sl)}%"></i></div></div>
    <div class="card kpi s3"><span class="lbl">Status pemenuhan</span><div style="margin:14px 0 6px"><span class="chip ${ok ? 'ok' : 'bad'}">${ok ? '100% target tercapai' : 'Target belum tercapai'}</span></div><span class="muted" style="font-size:12px">${d.rows.filter(r => r.sl < 100).length} SKU di bawah 100%</span></div>
  </div>

  <div class="a4">
    <div class="row" style="justify-content:space-between;align-items:flex-start;border-bottom:1px solid var(--line);padding-bottom:12px">
      <div><h2>PT HERBA EMAS WAHIDATAMA</h2><div class="muted" style="font-size:12px;max-width:420px">${esc(c.alamat)} | Telp: ${esc(c.telp)}</div></div>
      <div class="r muted" style="font-size:12px">Dokumen resmi PPIC<br>Tanggal cetak: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}<br><span class="chip ok">Status: Verified</span></div></div>
    <h2 style="color:var(--ink);margin:16px 0 4px">SERVICE LEVEL ${label(d.bulan).toUpperCase()} &ndash; BRAND PRODUK FG HEW KE HNI</h2>
    <div class="muted" style="font-size:12px;margin-bottom:12px">Evaluasi realisasi pengiriman Finished Goods dari PT Herba Emas Wahidatama ke PT Halal Network International (HNI). Periode: 1 &ndash; ${last.getDate()} ${BLN[last.getMonth()]} ${last.getFullYear()}</div>
    <div class="tw"><table><thead><tr><th>No</th><th>Nama produk</th><th>Standar Pcs/MC</th><th>Order ${BLN[last.getMonth()].slice(0, 3)} (Pcs)</th><th>Total pengiriman (Pcs)</th><th>Service level (%)</th><th>Keterangan</th></tr></thead><tbody>
    ${d.rows.map((r, i) => `<tr><td class="c">${i + 1}</td><td><b>${esc(r.produk)}</b></td><td class="r">${nf(r.std)}</td><td class="r">${nf(r.order)}</td><td class="r">${nf(r.kirim)}</td><td class="r">${nf(r.sl, 1)}%</td><td class="c"><span class="chip ${r.sl >= 100 ? 'ok' : 'bad'}">${esc(r.ket)}</span></td></tr>`).join('')}
    <tr class="tot"><td colspan="3" class="r">SUBTOTAL / KONSOLIDASI BULANAN</td><td class="r">${nf(t.order)}</td><td class="r">${nf(t.kirim)}</td><td class="r">${nf(t.sl, 2)}%</td><td class="c">${t.selisih >= 0 ? 'SURPLUS (+' : 'DEFISIT ('}${nf(Math.abs(t.selisih))})</td></tr>
    <tr class="goal"><td colspan="4">TARGET MINIMAL PEMENUHAN SERVICE LEVEL : 100,00%</td><td colspan="3" class="r">ACHIEVEMENT TERVALIDASI : ${nf(t.sl, 2)}% (${ok ? 'SELESAI PENUH' : 'BELUM PENUH'})</td></tr></tbody></table></div>
    <div class="grid" style="grid-template-columns:1fr 1fr;margin-top:28px;text-align:center">
      <div><span class="lbl">Dibuat oleh,</span><div style="height:56px"></div><b>${esc(c.sl_dibuat)}</b><div class="muted" style="font-size:11px">NIP: ${esc(c.sl_dibuat_nip)}</div></div>
      <div><span class="lbl">Disetujui oleh,</span><div style="height:56px"></div><b>${esc(c.sl_setuju)}</b><div class="muted" style="font-size:11px">NIP: ${esc(c.sl_setuju_nip)}</div></div></div>
  </div>`;

  $('#bl').onchange = e => { bulan = e.target.value; renderSL(view); };
  $('#csv').onclick = () => {
    const csv = [['No', 'Produk', 'Std', 'Order', 'Pengiriman', 'SL %'], ...d.rows.map((r, i) => [i + 1, r.produk, r.std, r.order, r.kirim, r.sl.toFixed(1)])].map(l => l.map(x => `"${x}"`).join(',')).join('\n');
    Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv' })), download: `service-level-${d.bulan}.csv` }).click();
  };
}
