import { get } from './api.js';
import { $, $$, MONTHS, esc, nf, rp, pc, delta, skeleton, lineChart, barChart, divBars, donut } from './ui.js';

const F = { kategori: 'Semua', produk: 'Semua', jenisDO: 'Semua', klien: 'Semua', tahun: '', banding: '', bulanAwal: 1, bulanAkhir: 12 };
const sel = (id, label, opts, val) => `<label class="field"><span class="lbl">${label}</span><select id="f-${id}">${opts.map(o => { const [v, t] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(t)}</option>`; }).join('')}</select></label>`;

export async function renderDashboard(view) {
  view.innerHTML = skeleton();
  const d = await get('dashboard', F);
  const A = d.applied, t = d.target, k = d.kpi;
  F.tahun = A.Y; F.banding = A.Y2;
  const years = d.options.tahun.map(String);
  const mOpts = MONTHS.map((m, i) => [i + 1, m]);
  const topMax = (arr, key) => Math.max(1, ...arr.map(x => x[key]));
  const colors = ['#00652c', '#dc2626', '#0f766e', '#7c2d12', '#f59e0b', '#0284c7', '#7c3aed', '#64748b', '#ca8a04', '#be185d'];
  const hb = (arr, key, fmt) => arr.map((p, i) => `<div class="hb"><span title="${esc(p.nama)}" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${i + 1}. ${esc(p.nama)}</span><div class="t"><i style="width:${p[key] / topMax(arr, key) * 100}%;background:${colors[i % 10]}"></i></div><b class="tnum">${fmt(p[key])}</b></div>`).join('');
  const totMhs = d.mhs.mhs + d.mhs.non || 1, totNpd = d.npd.npd + d.npd.exist || 1, totDo = d.doComp.do1 + d.doComp.do2 || 1;
  const yoyO = [{ data: d.yoy.a.omset, color: '#00652c', name: A.Y }, { data: d.yoy.b.omset, color: '#94a3b8', name: A.Y2, dash: true }];

  view.innerHTML = `
  <div class="page-h"><div><h1>Dashboard Supply Chain &amp; Revenue</h1><div class="muted">PT Herba Emas Wahidatama &bull; PPIC, Warehouse &amp; Logistik</div></div></div>

  <div class="card" style="margin-bottom:16px"><div class="row" style="align-items:flex-end">
    ${sel('kategori', 'Kategori', ['Semua', 'MHS', 'Non-MHS'], F.kategori)}
    ${sel('produk', 'Produk', ['Semua', ...d.options.produk], F.produk)}
    ${sel('jenisDO', 'Jenis DO', [['Semua', 'Semua'], ['DO1', 'DO 1 (Tax)'], ['DO2', 'DO 2 (Non-Tax)']], F.jenisDO)}
    ${sel('klien', 'Klien', ['Semua', ...d.options.klien], F.klien)}
    ${sel('tahun', 'Tahun utama', years, A.Y)}
    ${sel('banding', 'Tahun banding', years, A.Y2)}
    ${sel('bulanAwal', 'Bulan awal', mOpts, A.m1)}
    ${sel('bulanAkhir', 'Bulan akhir', mOpts, A.m2)}
    <button class="btn" id="reset">Reset filter</button>
  </div><div class="muted" style="font-size:12px;margin-top:8px">Omset dihitung otomatis dari Qty &times; Harga di sheet Master_Produk.</div></div>

  <div class="card" style="margin-bottom:16px"><div class="grid g12">
    <div class="s7">
      <div class="lbl">Target annual revenue ${A.Y}</div>
      <div class="row" style="justify-content:space-between;margin:10px 0 8px;align-items:flex-end">
        <div><div class="muted lbl">Realisasi</div><div class="big">${rp(t.realisasi)}</div></div>
        <div class="c"><div class="muted lbl">Tercapai</div><div class="big ${t.pct >= t.idealPct ? 'up' : 'dn'}">${nf(t.pct, 0)}%</div></div>
        <div class="r"><div class="muted lbl">Target</div><div class="big">${rp(t.target)}</div></div>
      </div>
      <div class="bar ${t.pct >= t.idealPct ? '' : 'warn'}"><i style="width:${Math.min(100, t.pct)}%"></i></div>
      <div class="grid" style="grid-template-columns:repeat(4,1fr);margin-top:12px">
        <div class="mini"><span class="lbl">Sisa ke target</span><b>${rp(t.sisa)}</b></div>
        <div class="mini"><span class="lbl">Posisi ideal</span><b>${pc(t.idealPct)}</b></div>
        <div class="mini"><span class="lbl">Selisih vs ideal</span><b class="${t.selisih >= 0 ? 'up' : 'dn'}">${nf(t.selisih, 1)} poin</b></div>
        <div class="mini"><span class="lbl">Proyeksi akhir tahun</span><b>${rp(t.proyeksi)}</b><span class="muted" style="font-size:11px">${pc(t.proyeksiPct)} dari target</span></div>
      </div>
    </div>
    <div class="s5">${lineChart([{ data: t.kumulatif, color: '#00652c', name: 'Kumulatif' }, { data: t.jalur, color: '#f59e0b', dash: true, name: 'Jalur target' }], MONTHS, { h: 170, fmt: rp })}</div>
  </div></div>

  ${d.noPrice.length ? `<div class="alert" style="margin-bottom:16px"><b>${d.noPrice.length} produk</b> belum punya harga di Master_Produk sehingga omsetnya terhitung 0: ${d.noPrice.map(esc).join(', ')}.</div>` : ''}

  <div class="grid g12" style="margin-bottom:16px">
    <div class="card s3"><span class="lbl">Total Pcs dikirim</span><div class="num big" style="margin-top:8px">${nf(k.pcs)}</div>${delta(k.pcsG, ' vs ' + A.Y2)}</div>
    <div class="card s3" style="border-color:var(--primary)"><span class="lbl">Total omset</span><div class="num big" style="margin-top:8px">${rp(k.omset)}</div>${delta(k.omsetG, ' vs ' + A.Y2)}</div>
    <div class="card s3"><span class="lbl">Total tonase</span><div class="num big" style="margin-top:8px">${nf(k.kg / 1000, 2)} Ton</div>${delta(k.kgG, ' vs ' + A.Y2)}</div>
    <div class="card s3"><span class="lbl">Total transaksi / DO</span><div class="num big" style="margin-top:8px">${nf(k.trx)}</div><span class="muted" style="font-size:12px">Rata-rata ${nf(k.trxPerBulan, 1)} DO/bulan</span></div>
  </div>

  <div class="grid g12" style="margin-bottom:16px">
    <div class="card s6"><h3 style="font-size:15px">Sumbangsih MHS Brand vs Non-MHS</h3><div class="row" style="gap:20px;margin-top:14px;flex-wrap:nowrap">
      ${donut([{ v: d.mhs.mhs, c: '#055135' }, { v: d.mhs.non, c: '#94a3b8' }], 'MHS ' + nf(d.mhs.mhs / totMhs * 100, 1) + '%')}
      <div class="grow"><div class="mini"><span class="lbl">MHS Brand Family</span><b>${rp(d.mhs.mhs)} (${pc(d.mhs.mhs / totMhs * 100)})</b></div><div class="mini" style="margin-top:8px"><span class="lbl">Non-MHS</span><b>${rp(d.mhs.non)} (${pc(d.mhs.non / totMhs * 100)})</b></div></div></div></div>
    <div class="card s6"><h3 style="font-size:15px">Sumbangsih NPD vs Existing</h3><div class="row" style="gap:20px;margin-top:14px;flex-wrap:nowrap">
      ${donut([{ v: d.npd.npd, c: '#f59e0b' }, { v: d.npd.exist, c: '#1e293b' }], 'NPD ' + nf(d.npd.npd / totNpd * 100, 1) + '%')}
      <div class="grow"><div class="mini"><span class="lbl">NPD (new products)</span><b>${rp(d.npd.npd)} (${pc(d.npd.npd / totNpd * 100)})</b></div><div class="mini" style="margin-top:8px"><span class="lbl">Existing</span><b>${rp(d.npd.exist)} (${pc(d.npd.exist / totNpd * 100)})</b></div></div></div></div>
  </div>

  <div class="grid g12" style="margin-bottom:16px">
    <div class="card s6"><div class="row" style="justify-content:space-between"><h3 style="font-size:15px">Omset YoY</h3><span class="chip ok">${A.Y}</span><span class="chip">${A.Y2}</span></div>${lineChart(yoyO, MONTHS, { fmt: rp })}
      <div class="grid" style="grid-template-columns:repeat(4,1fr);margin-top:10px">${d.quarters.map(q => `<div class="mini"><span class="lbl">${q.q}</span><b class="${(q.g ?? 0) >= 0 ? 'up' : 'dn'}">${q.g == null ? '-' : (q.g >= 0 ? '+' : '') + nf(q.g, 1) + '%'}</b><span class="muted" style="font-size:11px">${rp(q.a)}</span></div>`).join('')}</div></div>
    <div class="card s6"><div class="row" style="justify-content:space-between"><h3 style="font-size:15px">Volume YoY (<span id="vu">Pcs</span>)</h3><span class="row"><button class="btn on" data-u="pcs">Pcs</button><button class="btn" data-u="kg">Kg</button></span></div><div id="vol"></div></div>
  </div>

  <div class="grid g12" style="margin-bottom:16px">
    <div class="card s8"><h3 style="font-size:15px;margin-bottom:8px">Product value performance (Top 10)</h3>${hb(d.topOmset, 'omset', rp) || '<span class="muted">Tidak ada data</span>'}
      <h3 style="font-size:15px;margin:18px 0 8px">Product volume performance (Top 10)</h3>${hb(d.topPcs, 'pcs', v => nf(v) + ' Pcs')}</div>
    <div class="s4 grid" style="align-content:start">
      <div class="card"><h3 style="font-size:15px">Growth MoM (%)</h3>${divBars(d.mom, MONTHS)}</div>
      <div class="card"><h3 style="font-size:15px;margin-bottom:12px">Komposisi DO</h3><div class="row" style="flex-wrap:nowrap;gap:16px">${donut([{ v: d.doComp.do1, c: '#2563eb' }, { v: d.doComp.do2, c: '#cbd5e1' }], 'DO 1 ' + nf(d.doComp.do1 / totDo * 100, 1) + '%')}
        <div class="grow"><div class="row" style="justify-content:space-between"><span>DO 1 (Tax)</span><b>${pc(d.doComp.do1 / totDo * 100)}</b></div><div class="row" style="justify-content:space-between"><span>DO 2 (Non-Tax)</span><b>${pc(d.doComp.do2 / totDo * 100)}</b></div></div></div></div>
    </div>
  </div>`;

  const drawVol = u => { $('#vu').textContent = u === 'pcs' ? 'Pcs' : 'Kg'; $('#vol').innerHTML = barChart([{ data: d.yoy.a[u], color: '#2563eb' }, { data: d.yoy.b[u], color: '#cbd5e1' }], MONTHS); $$('[data-u]').forEach(b => b.classList.toggle('on', b.dataset.u === u)); };
  drawVol('pcs');
  $$('[data-u]').forEach(b => b.onclick = () => drawVol(b.dataset.u));
  ['kategori', 'produk', 'jenisDO', 'klien', 'tahun', 'banding', 'bulanAwal', 'bulanAkhir'].forEach(id => $('#f-' + id).onchange = e => { F[id] = e.target.value; renderDashboard(view).catch(err => view.innerHTML = `<div class="alert">${esc(err.message)}</div>`); });
  $('#reset').onclick = () => { Object.assign(F, { kategori: 'Semua', produk: 'Semua', jenisDO: 'Semua', klien: 'Semua', tahun: '', banding: '', bulanAwal: 1, bulanAkhir: 12 }); renderDashboard(view); };
}
