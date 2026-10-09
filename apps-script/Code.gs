/**
 * HERBA SUPPLY CHAIN PORTAL - Backend (Google Apps Script + Google Sheets)
 * Jalankan setup() sekali, lalu Deploy > New deployment > Web app.
 * Autentikasi: Script Property API_TOKEN harus sama dengan env API_TOKEN di Vercel.
 */

const SHEETS = {
  Master_Produk: ['Produk', 'Kategori', 'NPD', 'Std_Pcs_MC', 'Kg_per_Pcs', 'Harga_per_Pcs'],
  Transaksi_DO: ['Tanggal', 'No_DO', 'Jenis_DO', 'Klien', 'Produk', 'Qty_Pcs'],
  Target: ['Tahun', 'Target_Revenue'],
  WPS_Dokumen: ['Tipe', 'Pekan', 'Mulai', 'No_Dok', 'Status', 'Hari_Kerja', 'Utilisasi', 'Kritis', 'Dibuat_Oleh', 'Jabatan_Dibuat', 'Disetujui_Oleh', 'Jabatan_Setuju', 'Hash', 'Catatan'],
  WPS: ['Tipe', 'Pekan', 'No', 'Proses', 'Produk', 'Jenis', 'Sediaan', 'Line', 'Satuan', 'Std', 'Batch_Size', 'Ost_Batch', 'Outstanding', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Ahd', 'Flag'],
  Service_Level: ['Bulan', 'Produk', 'Std', 'Order', 'Pengiriman'],
  Config: ['Key', 'Value']
};
const DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Ahd'];
const WPS_EDITABLE = ['Std', 'Batch_Size', 'Ost_Batch', 'Outstanding', 'Flag', 'Line'].concat(DAYS);

/* ===================== ROUTER ===================== */
function doGet(e) { return handle_(e.parameter || {}); }
function doPost(e) {
  let b = {};
  try { b = JSON.parse(e.postData.contents); } catch (err) {}
  return handle_(b);
}

function handle_(p) {
  try {
    const token = PropertiesService.getScriptProperties().getProperty('API_TOKEN');
    if (!token || p.token !== token) throw new Error('Unauthorized');
    const routes = {
      dashboard: dashboard_, wps: wps_, saveWps: saveWps_, saveDoc: saveDoc_,
      serviceLevel: serviceLevel_, ping: () => ({ time: new Date().toISOString() })
    };
    if (!routes[p.action]) throw new Error('Action tidak dikenal: ' + p.action);
    return json_({ ok: true, data: routes[p.action](p) });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}
function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* ===================== HELPERS ===================== */
function sheet_(n) { return SpreadsheetApp.getActive().getSheetByName(n); }
function table_(n) {
  const v = sheet_(n).getDataRange().getValues();
  const h = v.shift();
  return v.filter(r => r.some(c => c !== '')).map(r => {
    const o = {}; h.forEach((k, i) => o[k] = r[i]); return o;
  });
}
function config_() {
  const o = {}; table_('Config').forEach(r => o[r.Key] = r.Value); return o;
}
function ymd_(d) { return d instanceof Date ? Utilities.formatDate(d, 'Asia/Jakarta', 'yyyy-MM-dd') : String(d); }
function ym_(d) { return d instanceof Date ? Utilities.formatDate(d, 'Asia/Jakarta', 'yyyy-MM') : String(d); }
const sum_ = a => a.reduce((s, x) => s + (+x || 0), 0);

/* ===================== DASHBOARD ===================== */
function dashboard_(p) {
  const mm = {}; table_('Master_Produk').forEach(m => mm[m.Produk] = m);
  const tx = table_('Transaksi_DO');
  const now = new Date();
  const Y = +p.tahun || now.getFullYear(), Y2 = +p.banding || Y - 1;
  const m1 = +p.bulanAwal || 1, m2 = +p.bulanAkhir || 12;
  const all = v => !v || v === 'Semua';
  const mk = () => ({ omset: Array(12).fill(0), pcs: Array(12).fill(0), kg: Array(12).fill(0) });
  const A = {}; A[Y] = mk(); A[Y2] = mk();
  const prod = {}, doSet = {};
  let mhs = 0, non = 0, npd = 0, exist = 0, do1 = 0, do2 = 0;

  tx.forEach(t => {
    const m = mm[t.Produk]; if (!m) return;
    const d = new Date(t.Tanggal), y = d.getFullYear(), mo = d.getMonth();
    if (!A[y]) return;
    if (!all(p.kategori) && m.Kategori !== p.kategori) return;
    if (!all(p.produk) && t.Produk !== p.produk) return;
    if (!all(p.jenisDO) && t.Jenis_DO !== p.jenisDO) return;
    if (!all(p.klien) && t.Klien !== p.klien) return;
    const q = +t.Qty_Pcs || 0, om = q * (+m.Harga_per_Pcs || 0), kg = q * (+m.Kg_per_Pcs || 0);
    A[y].omset[mo] += om; A[y].pcs[mo] += q; A[y].kg[mo] += kg;
    if (y === Y && mo + 1 >= m1 && mo + 1 <= m2) {
      if (m.Kategori === 'MHS') mhs += om; else non += om;
      if (String(m.NPD).toUpperCase() === 'Y') npd += om; else exist += om;
      if (t.Jenis_DO === 'DO1') do1 += om; else do2 += om;
      prod[t.Produk] = prod[t.Produk] || { nama: t.Produk, omset: 0, pcs: 0 };
      prod[t.Produk].omset += om; prod[t.Produk].pcs += q;
      doSet[t.No_DO] = 1;
    }
  });

  const rng = a => sum_(a.slice(m1 - 1, m2));
  const a = A[Y], b = A[Y2];
  const omset = rng(a.omset), omsetB = rng(b.omset);
  const pcs = rng(a.pcs), pcsB = rng(b.pcs), kg = rng(a.kg), kgB = rng(b.kg);
  const g = (x, y) => y ? (x / y - 1) * 100 : null;
  const cur = Y === now.getFullYear();

  const tgtRow = table_('Target').filter(r => +r.Tahun === Y)[0];
  const target = tgtRow ? +tgtRow.Target_Revenue : 0;
  const realisasi = sum_(a.omset);
  const frac = cur ? Math.min(1, ((now - new Date(Y, 0, 1)) / 864e5 + 1) / 365) : 1;
  let run = 0;
  const kumulatif = a.omset.map((v, i) => { run += v; return (cur && i > now.getMonth()) ? null : run; });
  const jalur = a.omset.map((_, i) => target * (i + 1) / 12);
  const pctReal = target ? realisasi / target * 100 : 0;
  const proyeksi = frac ? realisasi / frac : 0;

  const quarters = [0, 1, 2, 3].map(q => {
    const s = x => sum_(x.omset.slice(q * 3, q * 3 + 3));
    return { q: 'Q' + (q + 1), a: s(a), b: s(b), g: g(s(a), s(b)) };
  });
  const mom = a.omset.map((v, i) => (i === 0 || !a.omset[i - 1] || (cur && i > now.getMonth())) ? null : (v / a.omset[i - 1] - 1) * 100);
  const top = k => Object.values(prod).sort((x, y) => y[k] - x[k]).slice(0, 10);
  const uniq = k => Array.from(new Set(tx.map(t => t[k]))).sort();
  const years = Array.from(new Set(tx.map(t => new Date(t.Tanggal).getFullYear()))).sort();
  const noPrice = Object.keys(mm).filter(k => !(+mm[k].Harga_per_Pcs));
  const nDO = Object.keys(doSet).length;

  return {
    options: { produk: uniq('Produk'), klien: uniq('Klien'), tahun: years },
    applied: { Y, Y2, m1, m2 },
    target: { target, realisasi, pct: pctReal, sisa: Math.max(0, target - realisasi), idealPct: frac * 100, selisih: pctReal - frac * 100, proyeksi, proyeksiPct: target ? proyeksi / target * 100 : 0, kumulatif, jalur },
    kpi: { pcs, pcsG: g(pcs, pcsB), pcsB, omset, omsetG: g(omset, omsetB), omsetB, kg, kgG: g(kg, kgB), kgB, trx: nDO, trxPerBulan: nDO / Math.max(1, m2 - m1 + 1) },
    mhs: { mhs, non }, npd: { npd, exist }, doComp: { do1, do2 },
    yoy: { a, b }, quarters, mom,
    topOmset: top('omset'), topPcs: top('pcs'), noPrice
  };
}

/* ===================== WPS ===================== */
function wps_(p) {
  const tipe = String(p.tipe || 'primer').toUpperCase();         // PRIMER | SEKUNDER
  const grup = tipe === 'SEKUNDER' ? ['SEKUNDER'] : ['PENGOLAHAN', 'PRIMER'];
  const docs = table_('WPS_Dokumen').filter(d => d.Tipe === tipe);
  const pekanList = docs.map(d => +d.Pekan).sort((x, y) => y - x);
  const pekan = +p.pekan || pekanList[0];
  const doc = docs.filter(d => +d.Pekan === pekan)[0];
  if (!doc) throw new Error('Dokumen WPS pekan ' + pekan + ' tidak ditemukan');
  const mulai = new Date(doc.Mulai);
  const names = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'];
  const days = names.map((n, i) => {
    const d = new Date(mulai.getFullYear(), mulai.getMonth(), mulai.getDate() + i);
    return { key: DAYS[i], hari: n, tgl: ymd_(d), label: Utilities.formatDate(d, 'Asia/Jakarta', 'dd-MMM') };
  });
  const rows = table_('WPS').filter(r => +r.Pekan === pekan && grup.indexOf(r.Tipe) >= 0).sort((x, y) => x.No - y.No);
  doc.Mulai = ymd_(doc.Mulai);
  return { doc, rows, days, pekan, pekanList };
}

function saveWps_(p) {
  if (WPS_EDITABLE.indexOf(p.field) < 0) throw new Error('Kolom tidak boleh diubah: ' + p.field);
  const lock = LockService.getScriptLock(); lock.waitLock(15000);
  try {
    const sh = sheet_('WPS'), v = sh.getDataRange().getValues(), h = v[0];
    const c = n => h.indexOf(n);
    for (let i = 1; i < v.length; i++) {
      if (v[i][c('Tipe')] === p.tipe && +v[i][c('Pekan')] === +p.pekan && +v[i][c('No')] === +p.no) {
        const text = p.field === 'Flag' || p.field === 'Line';
        const val = (p.value === '' || text) ? p.value : (isNaN(+p.value) ? p.value : +p.value);
        sh.getRange(i + 1, c(p.field) + 1).setValue(val);
        return { updated: true };
      }
    }
    throw new Error('Baris tidak ditemukan');
  } finally { lock.releaseLock(); }
}

function saveDoc_(p) {
  const allowed = ['Status', 'Catatan', 'Kritis', 'Hari_Kerja', 'Utilisasi'];
  const lock = LockService.getScriptLock(); lock.waitLock(15000);
  try {
    const sh = sheet_('WPS_Dokumen'), v = sh.getDataRange().getValues(), h = v[0];
    for (let i = 1; i < v.length; i++) {
      if (v[i][h.indexOf('Tipe')] === String(p.tipe).toUpperCase() && +v[i][h.indexOf('Pekan')] === +p.pekan) {
        Object.keys(p.fields || {}).forEach(k => {
          if (allowed.indexOf(k) >= 0) sh.getRange(i + 1, h.indexOf(k) + 1).setValue(p.fields[k]);
        });
        if (p.fields && p.fields.Status === 'Resmi Disetujui') {
          const raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, p.tipe + p.pekan + new Date().toISOString());
          sh.getRange(i + 1, h.indexOf('Hash') + 1).setValue(Utilities.base64EncodeWebSafe(raw).slice(0, 12));
        }
        return { updated: true };
      }
    }
    throw new Error('Dokumen tidak ditemukan');
  } finally { lock.releaseLock(); }
}

/* ===================== SERVICE LEVEL ===================== */
function serviceLevel_(p) {
  const all = table_('Service_Level').map(r => { r.Bulan = ym_(r.Bulan); return r; });
  const bulanList = Array.from(new Set(all.map(r => r.Bulan))).sort().reverse();
  const bulan = p.bulan || bulanList[0];
  const rows = all.filter(r => r.Bulan === bulan).map(r => {
    const sl = r.Order ? r.Pengiriman / r.Order * 100 : 0;
    return { produk: r.Produk, std: +r.Std, order: +r.Order, kirim: +r.Pengiriman, sl, ket: sl < 100 ? 'Belum Tercapai' : sl > 100 ? 'Tercapai (Surplus)' : 'Tercapai' };
  });
  const order = sum_(rows.map(r => r.order)), kirim = sum_(rows.map(r => r.kirim));
  return { bulan, bulanList, rows, total: { order, kirim, sl: order ? kirim / order * 100 : 0, selisih: kirim - order, sku: rows.length }, config: config_() };
}

/* ===================== SETUP & SEED (jalankan sekali) ===================== */
function setup() {
  const ss = SpreadsheetApp.getActive();
  Object.keys(SHEETS).forEach(n => {
    const sh = ss.getSheetByName(n) || ss.insertSheet(n);
    sh.clear();
    sh.getRange(1, 1, 1, SHEETS[n].length).setValues([SHEETS[n]]).setFontWeight('bold').setBackground('#e5eeff');
    sh.setFrozenRows(1);
  });
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('API_TOKEN')) props.setProperty('API_TOKEN', Utilities.getUuid());
  seed_();
  Logger.log('Setup selesai. API_TOKEN = ' + props.getProperty('API_TOKEN'));
}

function put_(name, rows) {
  if (rows.length) sheet_(name).getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

function seed_() {
  // [Produk, Kategori, NPD, Std, Kg/Pcs, Harga, OrderSept] -> DATA CONTOH (harga & kg hanya perkiraan), ganti dengan data asli
  const P = [
    ['Minyak Herba Sinergi', 'MHS', 'N', 100, 0.06, 12000, 421000],
    ['Minyak Herba Sinergi Hot', 'MHS', 'N', 100, 0.06, 12500, 126000],
    ['Minyak Herba Sinergi Kids Hawkins', 'MHS', 'N', 100, 0.06, 13000, 7500],
    ['Minyak Herba Sinergi Kids Naura', 'MHS', 'N', 100, 0.06, 13000, 15500],
    ['Minyak Herba Sinergi Sensatia', 'MHS', 'N', 100, 0.06, 14000, 4500],
    ['MHS Extra Hot Roll On', 'MHS', 'N', 300, 0.01, 8000, 5000],
    ['Sinai Olive Oil', 'Non-MHS', 'N', 200, 0.1, 15000, 65000],
    ['Sari Kurma', 'Non-MHS', 'N', 50, 0.25, 20000, 47100],
    ['Mahkota Dara', 'Non-MHS', 'N', 500, 0.1, 9000, 2000],
    ['Madu Habbat', 'Non-MHS', 'N', 50, 0.3, 45000, 3000],
    ['Madu Multiflora', 'Non-MHS', 'N', 50, 0.3, 48000, 14000],
    ['Deep Olive', 'Non-MHS', 'N', 50, 0.1, 30000, 5100],
    ['Jannatea Hot & Cold', 'Non-MHS', 'N', 100, 0.02, 0, 18500],
    ['Madu Pahit', 'Non-MHS', 'N', 50, 0.3, 50000, 8200],
    ['HNI Minyak Kayu Putih', 'Non-MHS', 'N', 100, 0.1, 0, 12000],
    ['HNI Minyak Telon Plus', 'Non-MHS', 'N', 100, 0.1, 18000, 9500],
    ['Redangin', 'Non-MHS', 'N', 50, 0.2, 14000, 15000],
    ['Zidavit', 'Non-MHS', 'N', 50, 0.2, 22000, 6000],
    ['Fitago', 'Non-MHS', 'Y', 50, 0.2, 25000, 3500],
    ['Redacough', 'Non-MHS', 'Y', 80, 0.1, 16000, 6000]
  ];
  put_('Master_Produk', P.map(r => r.slice(0, 6)));
  put_('Target', [[2026, 130000000000], [2025, 125250000000]]);

  let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const klien = ['PT Halal Network International', 'CV Sehat Nusantara', 'PT Mitra Herbal', 'UD Berkah Jaya'];
  const tx = []; let n = 1;
  [2025, 2026].forEach(y => {
    for (let m = 0; m < 12; m++) {
      if (y === 2026 && m > 9) break;
      P.forEach(p => {
        for (let k = 0; k < 2; k++) {
          const q = Math.round(p[6] * (0.5 + rnd() * 0.8) / 2 / p[3]) * p[3];
          if (q <= 0) continue;
          tx.push([new Date(y, m, 3 + k * 12 + Math.floor(rnd() * 8)), 'DO-' + y + '-' + ('0000' + (n++)).slice(-5), rnd() < 0.73 ? 'DO1' : 'DO2', klien[Math.floor(rnd() * klien.length)], p[0], q]);
        }
      });
    }
  });
  put_('Transaksi_DO', tx);

  const sl = {
    'Minyak Herba Sinergi': 469490, 'Sinai Olive Oil': 66778, 'Sari Kurma': 49631, 'Mahkota Dara': 2000, 'Madu Habbat': 3000,
    'Madu Multiflora': 14350, 'Deep Olive': 5152, 'Jannatea Hot & Cold': 18500, 'Madu Pahit': 8200, 'HNI Minyak Kayu Putih': 12000,
    'HNI Minyak Telon Plus': 9500, 'Redangin': 15200, 'Zidavit': 6000, 'Minyak Herba Sinergi Hot': 129000,
    'Minyak Herba Sinergi Kids Hawkins': 7500, 'Minyak Herba Sinergi Kids Naura': 16500, 'Minyak Herba Sinergi Sensatia': 4500,
    'MHS Extra Hot Roll On': 5000, 'Fitago': 3500, 'Redacough': 6011
  };
  sheet_('Service_Level').getRange('A:A').setNumberFormat('@');
  put_('Service_Level', P.map(p => ['2026-09', p[0], p[3], p[6], sl[p[0]]]));

  const mulai = new Date(2026, 9, 12);
  put_('WPS_Dokumen', [
    ['PRIMER', 42, mulai, 'CM-09/PP/007-02.02', 'Resmi Disetujui', 6, 88.4, 'MN. MN030', 'Muhammad Subehi', 'Supervisor PPIC', 'Reza Yunidar F.', 'Supply Chain Manager', 'HEW-AUTH-2026-X992',
      'Filter line utama: MN / MN030\nOutstanding reaktor: MH / MH130 (1 batch lanjutan ekstraksi MHS)\nPlan line: MH131-MH134, MO095, R0026-R0028, ZT026\nPriority: MO (Minyak Olahan) / MHS Kemas'],
    ['SEKUNDER', 42, mulai, 'CM-09/PP/007-02.02', 'Resmi Disetujui', 6, 92.3, 'Line 1: MHS & Sinai', 'Muhammad Subehi', 'PPIC Staff', 'Reza Yunidar F.', 'Supply Chain Manager', '8F92-C4B1-HEW-PUR',
      'Ost: MH. MH0126\nNew plan: MH. MH0127-MH0130, SK. SK031, ZT. ZT025\nLine 1: 1. MHS (Minyak Herba Sinergi) 2. Sinai Olive Oil\nLine 2: 1. Sari Kurma\nLine 3: siaga / standby\nAhad: sanitasi total mesin & ruang']
  ]);

  // Primer & Pengolahan: [No, Proses, Produk, Satuan, Std, Batch, Ost, Outstanding, Sen..Ahd (7), Flag]
  const E = '';
  const pr = [
    [1, 'PENGOLAHAN', 'PENGOLAHAN MHS', 'Kg', E, 2954, E, E, 2954, 2954, 2954, 2985, E, E, E],
    [2, 'PENGOLAHAN', 'PENGOLAHAN MHS NANO', 'Kg', E, 2954, E, E, E, E, E, E, E, E, E],
    [3, 'PENGOLAHAN', 'REAKTOR NANO MHS', 'Kg', E, 1344, E, E, 1344, E, E, E, E, E, E],
    [4, 'PENGOLAHAN', 'PENGOLAHAN MAHKOTA DARA', 'Btr', E, 154500, E, E, E, E, E, E, E, E, E],
    [5, 'PENGOLAHAN', 'PENGOLAHAN ZIDAVIT', 'Kg', E, 250, E, E, E, E, E, E, E, E, E],
    [6, 'PENGOLAHAN', 'PENGOLAHAN MHS HOT', 'Kg', E, 2870, E, E, 890, 890, E, E, E, E, E],
    [7, 'PRIMER', 'MINYAK HERBA SINERGI', 'Pcs', 100, 29540, 1, 29540, 29540, E, E, 29540, 29540, E, E, 'CARRYOVER'],
    [8, 'PRIMER', 'MINYAK HERBA SINERGI HOT', 'Pcs', 100, 30000, E, E, E, 8000, 8000, 4000, E, E, E],
    [9, 'PRIMER', 'MHS KIDS Hawkins', 'Pcs', 100, 10000, E, E, E, E, E, E, E, E, E],
    [10, 'PRIMER', 'MHS KIDS Naura', 'Pcs', 100, 10000, E, E, E, E, E, E, E, E, E],
    [11, 'PRIMER', 'MINYAK HERBA SINERGI SENSATIA', 'Pcs', 100, 10000, E, E, E, E, E, E, E, E, E],
    [12, 'PRIMER', 'MHS EXTRA HOT ROLL ON', 'Pcs', 300, 20000, E, E, E, E, E, E, E, E, E],
    [13, 'PRIMER', 'SINAI OLIVE OIL', 'Pcs', 200, 21900, E, E, E, E, E, E, E, E, E],
    [14, 'PRIMER', 'SARI KURMA', 'Pcs', 50, 20000, E, E, E, E, E, E, E, E, E],
    [15, 'PRIMER', 'MAHKOTA DARA', 'Pcs', 500, 2575, E, E, E, E, E, E, E, E, E],
    [16, 'PRIMER', 'MADU HABBAT', 'Pcs', 50, 7200, E, E, E, E, E, E, E, E, E],
    [17, 'PRIMER', 'MADU MULTIFLORA', 'Pcs', 50, 7200, E, E, E, E, E, E, E, E, E],
    [18, 'PRIMER', 'DEEP OLIVE', 'Pcs', 20, 10775, E, E, E, E, E, E, E, E, E],
    [19, 'PRIMER', 'JANNATEA HOT', 'Pcs', 100, 400, E, E, E, E, E, E, E, E, E],
    [20, 'PRIMER', 'JANNATEA COOL', 'Pcs', 100, 400, E, E, E, E, E, E, E, E, E],
    [21, 'PRIMER', 'MADU PAHIT', 'Pcs', 50, 7200, E, E, E, E, E, E, E, E, E],
    [22, 'PRIMER', 'MINYAK KAYU PUTIH', 'Pcs', 100, 8210, E, E, E, E, E, E, E, E, E],
    [23, 'PRIMER', 'MINYAK TELON', 'Pcs', 100, 8000, E, E, E, E, E, E, E, E, E],
    [24, 'PRIMER', 'REDANGIN', 'Pcs', 50, 3383.4, E, E, E, E, 3383, 3383, 3383, E, E],
    [25, 'PRIMER', 'ZIDAVIT', 'Pcs', 50, 9000, E, E, E, E, E, E, E, E, E],
    [26, 'PRIMER', 'FITAGO', 'Pcs', 50, 10000, E, E, E, E, E, E, E, E, E],
    [27, 'PRIMER', 'REDACOUGH', 'Pcs', 100, 17870, E, E, E, E, E, E, E, E, E]
  ].map(r => [r[1], 42, r[0], r[1], r[2], E, E, E, r[3], r[4], r[5], r[6], r[7]].concat(r.slice(8, 15), [r[15] || E]));

  // Sekunder: [Produk, Jenis, Sediaan, Std, Batch, Line]
  const sk = [
    ['MINYAK HERBA SINERGI', 'OT', 'COL', 100, 29540, 'Line 1'], ['MINYAK HERBA SINERGI HOT', 'OT', 'COL', 100, 10000, ''],
    ['MHS KIDS Hawkins', 'OT', 'COL', 100, 10000, ''], ['MHS KIDS Naura', 'OT', 'COL', 100, 10000, ''],
    ['MINYAK HERBA SINERGI SENSATIA', 'OT', 'COL', 100, 10000, ''], ['MHS EXTRA HOT ROLL ON', 'OT', 'COL', 300, 20000, ''],
    ['SINAI OLIVE OIL', 'OT', 'COD', 200, 21900, 'Line 1'], ['SARI KURMA', 'PANGAN', 'COD', 50, 20000, 'Line 2'],
    ['MAHKOTA DARA', 'OT', 'PIL', 500, 2575, ''], ['MADU HABBAT', 'PANGAN', 'COD', 50, 7200, ''],
    ['MADU MULTIFLORA', 'PANGAN', 'COD', 50, 7200, ''], ['DEEP OLIVE', 'OT', 'COD', 20, 10775, ''],
    ['JANNATEA HOT', 'OT', 'RAJANGAN', 100, 400, ''], ['JANNATEA COOL', 'OT', 'RAJANGAN', 100, 400, ''],
    ['MADU PAHIT', 'PANGAN', 'COD', 50, 7200, ''], ['MINYAK KAYU PUTIH', 'OT', 'COL', 100, 8210, ''],
    ['MINYAK TELON', 'OT', 'COL', 100, 8000, ''], ['REDANGIN', 'OT', 'COD', 50, 3383.4, ''],
    ['ZIDAVIT', 'OT', 'COD', 50, 10000, ''], ['FITAGO', 'OT', 'COD', 50, 10000, ''], ['REDACOUGH', 'OT', 'COD', 100, 17870, '']
  ].map((r, i) => ['SEKUNDER', 42, i + 1, 'SEKUNDER', r[0], r[1], r[2], r[5], 'Pcs', r[3], r[4],
    i === 0 ? 1 : '', i === 0 ? 29540 : '',
    i === 0 ? 30000 : '', i === 0 ? 60000 : (i === 7 ? 13000 : ''), '', '', '', '', '', '']);
  put_('WPS', pr.concat(sk));

  put_('Config', [['sl_dibuat', 'MUHAMMAD SUBEHI'], ['sl_dibuat_nip', 'HEW-2018-0942 | Supervisor PPIC'],
    ['sl_setuju', 'REZA YUNIDAR FIRDAUS, S.T.'], ['sl_setuju_nip', 'HEW-2015-0211 | Supply Chain Manager'],
    ['alamat', 'Jalan Gerilya, Kelurahan Kalikabong, RT/RW 001/005, Kawasan Industri Kalikabong - Purbalingga, Jawa Tengah'], ['telp', '+622818902299']]);
}
