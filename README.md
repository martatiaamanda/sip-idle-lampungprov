# SIP-IDLE PROV — Sistem Informasi Pencatatan & Pemantauan Aset Daerah Idle

**Pemerintah Provinsi Lampung — Badan Pengelolaan Keuangan dan Aset Daerah (BPKAD)**

Aplikasi web dashboard komprehensif untuk inventarisasi, pemantauan, dan optimalisasi Barang Milik Daerah (BMD) yang berada dalam kondisi tidak digunakan / belum dioptimalkan (*aset idle*) di lingkungan Pemerintah Provinsi Lampung. Desain dan arsitektur portal ini mengacu pada tata kelola transparansi dan dashboard monitoring inventarisasi aset daerah BPKAD.

---

## 🏛️ Fitur Utama Sistem

### 1. 📊 Executive Summary & Indikator Kunci (KPI)
- **Total Objek Aset Idle**: Jumlah persil/unit aset menganggur yang terdata.
- **Estimasi Nilai Wajar / NJOP**: Nilai pasar aset hasil penilaian appraisal / BPKAD.
- **Total Luas Lahan**: Agregasi luas tanah idle dalam satuan m² dan Hektar (Ha).
- **Potensi PAD / Tahun**: Estimasi penerimaan retribusi daerah melalui skema sewa atau Kerja Sama Pemanfaatan (KSP).
- **Rasio Pengamanan & Legalitas**: Persentase aset yang telah memiliki Sertifikat Hak Pakai (SHP) atas nama Pemerintah Provinsi Lampung.

### 2. 🗺️ Peta Geospasial Interaktif (GIS Leaflet)
- Pemetaan titik lokasi koordinat GPS aset se-Kabupaten/Kota di Provinsi Lampung (Bandar Lampung, Metro, Lampung Selatan, Lampung Tengah, Lampung Timur, Lampung Utara, Pesisir Barat, Tanggamus, dll.).
- Penanda warna dinamis berdasarkan klasifikasi KIB (KIB A Tanah, KIB B Mesin, KIB C Bangunan, KIB D Jaringan).
- Pin Popup interaktif menampilkan foto kondisi lapangan, estimasi nilai, dan tautan langsung ke **Google Maps Navigation** dan **Dossier Detail Aset**.

### 3. 📋 Buku Inventarisasi & Tabel Interaktif BMD Idle
- Pencarian cerdas *multi-field* (nama aset, kode KIB, alamat, OPD).
- Filter bertingkat berdasarkan:
  - Organisasi Perangkat Daerah (OPD) Pengurus
  - Kabupaten / Kota
  - Kategori KIB (KIB A Tanah, KIB B Peralatan, KIB C Gedung, KIB D Jaringan)
  - Status Pemanfaatan (Siap KSP/BGS, Siap Sewa, Proses Kajian, Dalam Pengamanan, Pinjam Pakai, Usulan Lelang)
- Fitur CRUD lengkap (Tambah aset baru, Edit data, Hapus) dengan penyimpanan otomatis di browser (`localStorage`).
- Tombol Reset Database Contoh untuk mengembalikan data awal jika diperlukan.

### 4. 📂 Dossier Kartu Identitas Barang (Modal Detail)
- Rincian komprehensif aset:
  - Foto kondisi fisik terbaru
  - Legalitas & nomor sertifikat BPN
  - Faktor penyebab *idle* (contoh: relokasi kantor, perubahan struktur, penundaan proyek)
  - Rekomendasi rencana aksi pemanfaatan
  - Penanggung jawab penatausahaan & nomor kontak pejabat BPKAD.

### 5. 🤝 Katalog Peluang Kemitraan (Investor & BUMD)
- Etalase khusus aset-aset strategis siap kerja sama (Sewa, KSP, BGS) untuk pihak ketiga/swasta/UMKM.
- Formulir Surat Pernyataan Minat (*Letter of Intent*) daring.

### 6. 📑 Rekonsiliasi OPD & Cetak Berita Acara Resmi
- Tabel rekapitulasi jumlah aset dan nilai menurut masing-masing OPD.
- **Cetak Berita Acara Rekapitulasi BMD Resmi (Print Friendly)**: Diformat lengkap dengan KOP Surat Pemerintah Provinsi, nomor surat, format standar Permendagri No. 47 Tahun 2021, serta kolom tanda tangan Kepala Bidang Aset dan Sekretaris Daerah selaku Pengelola BMD.
- **Ekspor Data ke File Excel/CSV**: Sekali klik untuk keperluan audit BPK / Inspektorat Daerah.

---

## 🚀 Cara Menjalankan & Deploy ke Vercel

### Opsi 1: Deploy Langsung ke Vercel (Online Gratis)
Proyek ini sudah dilengkapi konfigurasi [`vercel.json`](file:///Users/kartupetaniberjaya/Downloads/Belajar/vercel.json) dan Git repository lokal:

#### Cara A: Menggunakan GitHub (Paling Mudah)
1. Buat repository baru di [GitHub](https://github.com/new) (misal: `sip-idle-pemprov`).
2. Hubungkan repository lokal ini ke GitHub dengan perintah:
   ```bash
   git remote add origin https://github.com/<USERNAME-ANDA>/sip-idle-pemprov.git
   git branch -M main
   git push -u origin main
   ```
3. Buka [Vercel Dashboard](https://vercel.com/dashboard) -> klik tombol **"Add New..."** -> pilih **"Project"**.
4. Pilih repository `sip-idle-pemprov` yang baru dibuat -> klik **"Deploy"**.
5. Dalam 15 detik, website langsung aktif online dengan URL resmi `https://sip-idle-pemprov.vercel.app` (gratis dengan SSL/HTTPS).

#### Cara B: Menggunakan Vercel CLI
Jika komputer Anda memiliki Node.js / Vercel CLI:
```bash
npm install -g vercel
vercel
```

---

### Opsi 2: Buka Langsung di Web Browser Lokal
Cukup klik dua kali (*double click*) file `index.html` pada File Explorer / Finder macOS untuk membuka langsung di Google Chrome, Safari, Firefox, atau Edge.

### Opsi 3: Menggunakan Local Web Server (Python)
Buka terminal dan jalankan server lokal:

```bash
cd /Users/kartupetaniberjaya/Downloads/Belajar
python3 -m http.server 8080
```

Buka peramban di: `http://localhost:8080`

---

## 📁 Struktur Berkas

```
Belajar/
├── index.html          # Halaman utama dashboard, visualisasi, dan modal dialog
├── css/
│   └── custom.css      # Desain tema resmi Pemprov Lampung, styling badge, popup map & layout cetak
├── js/
│   ├── data.js         # Master data 12+ objek aset realistis, daftar OPD, dan wilayah
│   └── app.js          # Logika aplikasi (Chart.js, Leaflet GIS, Filter, CRUD, Export CSV, Print)
└── README.md           # Dokumentasi sistem
```

---

## ⚖️ Landasan Regulasi & Ketentuan Pengelolaan
1. **Peraturan Pemerintah No. 27 Tahun 2014 jo. PP No. 28 Tahun 2020** tentang Pengelolaan Barang Milik Negara/Daerah.
2. **Permendagri No. 19 Tahun 2016** tentang Pedoman Pengelolaan Barang Milik Daerah.
3. **Permendagri No. 47 Tahun 2021** tentang Tata Cara Pelaksanaan Pembukuan, Inventarisasi, dan Pelaporan Barang Milik Daerah.

