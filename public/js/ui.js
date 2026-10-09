export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const nf = (n, d = 0) => n == null || n === '' ? '-' : Number(n).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
export const rp = n => { const a = Math.abs(n || 0); return a >= 1e9 ? 'Rp ' + nf(n / 1e9, 2) + ' M' : a >= 1e6 ? 'Rp ' + nf(n / 1e6, 2) + ' Jt' : 'Rp ' + nf(n); };
export const pc = (n, d = 1) => n == null ? '-' : nf(n, d) + '%';
export const delta = (n, suffix = ' vs tahun pembanding') => n == null ? '' : `<span class="delta ${n >= 0 ? 'up' : 'dn'}">${n >= 0 ? '+' : ''}${nf(n, 1)}%</span><span class="muted" style="font-size:12px">${suffix}</span>`;
export const skeleton = () => '<div class="grid"><div class="skel"></div><div class="skel"></div><div class="skel" style="height:260px"></div></div>';

/** Line chart SVG. series: [{data:[...|null], color, dash}] */
export function lineChart(series, labels, { w = 560, h = 190, fmt = v => nf(v) } = {}) {
  const pad = { l: 8, r: 8, t: 8, b: 20 };
  const max = Math.max(1, ...series.flatMap(s => s.data.filter(v => v != null))) * 1.08;
  const x = i => pad.l + i * (w - pad.l - pad.r) / (labels.length - 1);
  const y = v => pad.t + (1 - v / max) * (h - pad.t - pad.b);
  let g = [0, .5, 1].map(f => `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(max * f)}" y2="${y(max * f)}" stroke="#EEF2F0"/>`).join('');
  series.forEach(s => {
    let d = '', pen = false;
    s.data.forEach((v, i) => { if (v == null) { pen = false; return; } d += (pen ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); pen = true; });
    g += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" ${s.dash ? 'stroke-dasharray="4 4"' : ''}><title>${s.name || ''}</title></path>`;
    s.data.forEach((v, i) => { if (v != null && !s.dash) g += `<circle cx="${x(i)}" cy="${y(v)}" r="2.6" fill="${s.color}"><title>${labels[i]}: ${fmt(v)}</title></circle>`; });
  });
  g += labels.map((l, i) => `<text x="${x(i)}" y="${h - 5}" text-anchor="middle">${l}</text>`).join('');
  return `<svg class="ch" viewBox="0 0 ${w} ${h}" role="img">${g}</svg>`;
}
/** Grouped bar chart: series [{data, color}] */
export function barChart(series, labels, { w = 560, h = 190, fmt = v => nf(v) } = {}) {
  const pad = { t: 8, b: 20 }, max = Math.max(1, ...series.flatMap(s => s.data)) * 1.08;
  const gw = w / labels.length, bw = Math.min(10, (gw - 6) / series.length);
  let g = '';
  labels.forEach((l, i) => {
    series.forEach((s, k) => {
      const v = s.data[i] || 0, bh = v / max * (h - pad.t - pad.b);
      g += `<rect x="${i * gw + (gw - bw * series.length) / 2 + k * bw}" y="${h - pad.b - bh}" width="${bw - 1}" height="${bh}" rx="1.5" fill="${s.color}"><title>${l}: ${fmt(v)}</title></rect>`;
    });
    g += `<text x="${i * gw + gw / 2}" y="${h - 5}" text-anchor="middle">${l}</text>`;
  });
  return `<svg class="ch" viewBox="0 0 ${w} ${h}" role="img">${g}</svg>`;
}
/** Diverging bars (growth %) */
export function divBars(data, labels, { w = 360, h = 170 } = {}) {
  const max = Math.max(10, ...data.map(v => Math.abs(v || 0))), mid = (h - 20) / 2, gw = w / labels.length;
  let g = `<line x1="0" x2="${w}" y1="${mid}" y2="${mid}" stroke="#CBD5E1"/>`;
  data.forEach((v, i) => {
    if (v != null) { const bh = Math.min(Math.abs(v) / max, 1) * (mid - 4); g += `<rect x="${i * gw + 4}" y="${v >= 0 ? mid - bh : mid}" width="${gw - 8}" height="${bh}" rx="2" fill="${v >= 0 ? '#16a34a' : '#dc2626'}"><title>${labels[i]}: ${nf(v, 1)}%</title></rect>`; }
    g += `<text x="${i * gw + gw / 2}" y="${h - 5}" text-anchor="middle">${labels[i]}</text>`;
  });
  return `<svg class="ch" viewBox="0 0 ${w} ${h}" role="img">${g}</svg>`;
}
export function donut(parts, centerText) {
  const tot = parts.reduce((s, p) => s + p.v, 0) || 1; let acc = 0;
  const stops = parts.map(p => { const a = acc / tot * 100; acc += p.v; return `${p.c} ${a}% ${acc / tot * 100}%`; }).join(',');
  return `<div class="donut" style="background:conic-gradient(${stops})"><span>${centerText}</span></div>`;
}
