# HEW Supply Chain Portal

Web app PPIC untuk PT Herba Emas Wahidatama. Backend Google Sheets + Apps Script, frontend statis di GitHub + Vercel.

```
Browser -> Vercel (public/ + api/gas.js proxy) -> Apps Script Web App -> Google Sheets
```

Halaman: Dashboard Supply Chain & Revenue, WPS Pengolahan & Primer, WPS Sekunder, Service Level HEW to HNI (cetak A4).

## 1. Backend (Google Sheets + Apps Script)
1. Buat Google Sheet baru, lalu **Extensions > Apps Script**.
2. Salin isi `apps-script/Code.gs` ke editor. Di Project Settings centang "Show appsscript.json" lalu salin `apps-script/appsscript.json`.
3. Jalankan fungsi **`setup`** sekali (izinkan akses). Fungsi ini membuat 7 sheet beserta data contoh, dan membuat `API_TOKEN` acak.
4. Buka **Project Settings > Script properties**, salin nilai `API_TOKEN` (boleh diganti sendiri).
5. **Deploy > New deployment > Web app**: Execute as *Me*, Who has access *Anyone*. Salin URL `.../exec`.
6. Setiap Code.gs diubah, buat **New version** pada deployment agar perubahan aktif.

Alternatif: pakai `clasp` (`clasp create --type sheets`, `clasp push`).

### Struktur sheet
| Sheet | Isi |
|---|---|
| Master_Produk | Produk, Kategori (MHS/Non-MHS), NPD (Y/N), Std_Pcs_MC, Kg_per_Pcs, Harga_per_Pcs |
| Transaksi_DO | Tanggal, No_DO, Jenis_DO (DO1/DO2), Klien, Produk, Qty_Pcs |
| Target | Tahun, Target_Revenue |
| WPS_Dokumen | Satu baris per Tipe (PRIMER/SEKUNDER) + Pekan: Mulai (hari Senin), No_Dok, Status, Utilisasi, Kritis, penandatangan, Catatan |
| WPS | Baris jadwal: Tipe (PENGOLAHAN/PRIMER/SEKUNDER), Pekan, No, Produk, Std, Batch_Size, Ost_Batch, Outstanding, Sen..Ahd, Flag |
| Service_Level | Bulan (teks `2026-09`), Produk, Std, Order, Pengiriman |
| Config | Key/Value: alamat, telp, penandatangan service level |

Data hasil `setup()` hanyalah contoh. **Harga, Kg_per_Pcs, dan seluruh Transaksi_DO adalah data dummy** (harga 0 pada beberapa produk sengaja memicu peringatan di dashboard). Ganti dengan data asli; omset, tonase, SL, dan total dihitung otomatis oleh script.

## 2. Frontend (GitHub + Vercel)
Kerangka deploy: `public/` (HTML/CSS/JS) + `api/gas.js` (proxy) + `package.json` (`"type": "module"`). Tidak ada langkah build.

1. Push folder ini ke repo GitHub.
2. Di Vercel: **Add New Project**, impor repo.
   - Framework Preset: **Other**
   - Root Directory: `.` (bukan `public`)
   - Build Command: kosong
   - Output Directory: `public` (sudah di `vercel.json`)
3. Tambahkan **Environment Variables** (Production + Preview):
   - `GAS_URL` = URL web app Apps Script (`.../exec`)
   - `API_TOKEN` = nilai API_TOKEN dari langkah 1.4
4. Deploy. Token dan URL hanya ada di server (`api/gas.js`), tidak masuk ke browser.

Lokal: salin `.env.example` ke `.env.local`, isi nilainya, lalu `npx vercel dev`.

## Catatan
- Mode Interaktif di WPS: sel jadwal berubah jadi input, setiap perubahan langsung ditulis ke sheet `WPS`.
- Sign Off mengubah Status jadi "Resmi Disetujui" dan membuat hash dokumen.
- Halaman belum memakai login pengguna; akses dilindungi token proxy. Untuk produksi, tambahkan Vercel password protection atau SSO.
