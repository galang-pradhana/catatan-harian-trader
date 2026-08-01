# PRD: Catatan Harian Trader — ADDENDUM V2
**Versi:** 2.0 (Addendum)
**Tanggal:** 31 Juli 2026
**Status:** Draft
**Dokumen Induk:** `catatan-harian-trader-prd.md` (V1) — dokumen ini TIDAK menggantikan V1, hanya menambahkan 2 fitur baru di atas fondasi yang sudah ada
**Solo Dev Mode:** Ya — dikerjakan setelah V1 (S-00 s/d S-09) selesai dan stabil di production

---

## 0. Kenapa Dokumen Terpisah?

PRD ini fokus ke 2 fitur yang diidentifikasi dari benchmark terhadap aplikasi trading journal existing (TradeNote, janzofx/Trading_Journal) yang belum ada di V1:

1. **Fallback Import CSV/Statement** — jalur input data selain EA, biar app tidak 100% bergantung ke koneksi MT5 real-time
2. **Analitik Lanjutan: MFE & SQN** — metrik profesional yang belum ada di dashboard V1

Semua referensi ke section V1 di dokumen ini memakai format `[V1-section-X]`.

---

## BAGIAN I — SRS (SOURCE OF TRUTH #1)

### 1. Overview

- **Konteks:** V1 sudah live, user sudah bisa auto-sync dari MT5 dan isi jurnal kualitatif. Addendum ini melengkapi 2 celah yang ditemukan dari studi banding kompetitor (lihat percakapan sebelumnya — TradeNote & janzofx/Trading_Journal).
- **Target User:** Sama seperti V1 — trader forex individual, multi-user.
- **Constraint tambahan:** Kedua fitur ini harus terasa sebagai "pelengkap", tidak boleh mengubah alur utama V1 (EA tetap jalur utama, CSV import cuma pelengkap/darurat).

---

### 2. SRS Index (lanjutan dari V1)

> Penomoran melanjutkan dari V1 yang berakhir di F-08 dan NF-05.

| ID     | Kategori   | Nama Requirement                          | Prioritas | Status  |
|--------|------------|---------------------------------------------|-----------|---------|
| F-09   | Import     | Fallback Import CSV / Statement Broker      | Sedang    | Planned |
| F-10   | Analitik   | Metrik Lanjutan: MFE & SQN                  | Sedang    | Planned |
| NF-06  | Data       | Import tidak boleh duplikat dengan data EA  | Tinggi    | Planned |

---

### 3. SRS Functional Detail

#### F-09 — Fallback Import CSV / Statement Broker

- **Deskripsi:** User bisa upload file CSV/statement export dari MT5 (atau broker lain di masa depan) untuk mengisi data trade lama sebelum mulai pakai EA, atau sebagai cadangan kalau EA gagal konek untuk sementara.
- **Actor:** User
- **Pre-condition:** User sudah login. EA tidak wajib aktif untuk pakai fitur ini.
- **Main flow:**
  1. User buka halaman "Import Data" (menu baru di bawah Hubungkan MT5)
  2. User upload file CSV export dari MT5 (Report → Export ke CSV/HTML dari terminal MT5)
  3. Sistem tampilkan preview mapping kolom (symbol, arah, harga, waktu, dst) — auto-detect format standar MT5 export
  4. User konfirmasi mapping (atau perbaiki manual kalau auto-detect salah)
  5. Sistem proses import: validasi tiap baris, skip yang duplikat (berdasarkan ticket ID + waktu open, sama seperti F-03 di V1)
  6. Sistem tampilkan ringkasan hasil: X baris berhasil diimpor, Y baris di-skip (duplikat), Z baris gagal (format salah) + detail baris yang gagal
- **Alternative flow:**
  - File bukan CSV/format tidak dikenali → pesan error jelas sebelum proses dimulai
  - Semua baris duplikat dengan data yang sudah ada (misal user re-upload file yang sama) → informasikan "Tidak ada data baru, semua sudah tersinkron sebelumnya"
  - Trade hasil import bentrok dengan trade dari EA (ticket ID sama tapi connection berbeda) → prioritaskan data dari EA (lebih real-time), tandai baris import sebagai skip
- **Validation rules:**
  - Ukuran file max 10MB
  - Kolom wajib ada: symbol, direction, volume, open_price, open_time, status
  - Baris dengan data tidak lengkap di kolom wajib → masuk daftar "gagal", tidak menghentikan proses baris lain
- **Output:** Trade dari file masuk ke tabel `trades` dengan `source = 'csv_import'`, siap dilengkapi jurnal kualitatif seperti trade dari EA

---

#### F-10 — Metrik Lanjutan: MFE & SQN

- **Deskripsi:** Menambahkan dua metrik analitik profesional ke Dashboard: **MFE (Maximum Favorable Excursion)** — seberapa jauh harga sempat bergerak menguntungkan sebelum trade ditutup, dan **SQN (System Quality Number)** — skor kualitas sistem trading berdasarkan konsistensi R-multiple.
- **Actor:** User (sistem menghitung otomatis)
- **Pre-condition:** Ada minimal 20 trade closed dengan data R:R terisi (untuk SQN — di bawah itu hasil kurang bermakna secara statistik)
- **Main flow (MFE):**
  1. Untuk trade yang tersinkron dari EA (bukan CSV import), EA menghitung MFE secara lokal di MT5 saat trade ditutup — ambil harga tertinggi (untuk buy) atau terendah (untuk sell) yang tercapai selama posisi terbuka, dari data candle M1 di terminal
  2. EA kirim nilai MFE (dalam pip/harga) bersamaan dengan data trade lain saat sync (F-03)
  3. Dashboard tampilkan rata-rata "efisiensi exit" = actual profit ÷ MFE potensial — makin dekat 100%, makin efisien exit-nya
- **Main flow (SQN):**
  1. Sistem hitung SQN dari seluruh trade closed yang punya data R-multiple (actual R:R dari F-04) dalam periode terpilih
  2. Rumus: `SQN = (rata-rata R-multiple / standar deviasi R-multiple) × akar(jumlah trade, dibatasi maksimal 100)`
  3. Tampilkan skor SQN + kategori kualitatif (contoh: di bawah 1.6 = "Kurang", 1.6-2.4 = "Rata-rata", 2.5-2.9 = "Baik", 3.0+ = "Sangat Baik" — skala umum di komunitas trading, ditampilkan sebagai konteks bukan patokan mutlak)
- **Alternative flow:**
  - Trade hasil CSV import tidak punya data MFE (karena tidak ada akses candle history saat import) → field MFE kosong, ditampilkan "Tidak tersedia untuk data import", tidak menghentikan kalkulasi SQN
  - Data trade closed < 20 → tampilkan SQN tetap, tapi dengan catatan "Sampel masih kecil, hasil belum terlalu bermakna secara statistik"
- **Output:** Dua kartu metrik baru di Dashboard: "Efisiensi Exit (MFE)" dan "SQN"

---

### 4. Non-Functional Requirements (tambahan)

| ID    | Requirement | Target                                            | Cara Ukur                                  |
|-------|--------------|------------------------------------------------------|-----------------------------------------------|
| NF-06 | Data Integrity | Trade dari import tidak boleh duplikat dengan trade dari EA | Test: import file yang overlap dengan data EA, pastikan tidak dobel |

---

### 5. Out of Scope (masih di luar addendum ini)

- MFE untuk trade hasil CSV import (butuh akses data historis harga eksternal — dicatat sebagai Open Question)
- Import dari broker selain MT5 (v3+, kalau nanti ada permintaan)
- Import otomatis terjadwal (v1 & addendum ini tetap manual upload)

---

## BAGIAN II — INFORMATION ARCHITECTURE (SOT #2, delta dari V1)

### 6. Struktur Navigasi (tambahan)

```
App (lanjutan dari V1 [V1-section-6])
├── ...
├── Hubungkan MT5
│   └── Import Data (BARU — sub-menu di halaman yang sama)
├── Dashboard
│   └── Kartu MFE & SQN (BARU — tambahan di halaman yang sudah ada)
└── ...
```

### 7. Database Schema (delta dari V1)

#### Perubahan tabel `trades` [V1-section-7]
| Field baru | Tipe Data | Constraint     | Keterangan                              |
|--------------|-----------|-----------------|--------------------------------------------|
| source       | VARCHAR   | DEFAULT 'mt5_sync' | 'mt5_sync' / 'csv_import' / 'manual'   |
| mfe_value    | DECIMAL   | NULLABLE         | Harga MFE, hanya terisi untuk source='mt5_sync' |
| mfe_percent  | DECIMAL   | NULLABLE         | Efisiensi exit = actual profit / MFE potensial |

#### Entitas baru: import_batches
| Field           | Tipe Data | Constraint         | Keterangan                          |
|-----------------|-----------|----------------------|----------------------------------------|
| id              | UUID      | PK                    |                                        |
| user_id         | UUID      | FK → users.id         |                                        |
| file_name       | VARCHAR   | NOT NULL              |                                        |
| status          | VARCHAR   | DEFAULT 'processing'  | processing / success / partial / failed |
| total_rows      | INTEGER   | DEFAULT 0             |                                        |
| imported_count  | INTEGER   | DEFAULT 0             |                                        |
| skipped_count   | INTEGER   | DEFAULT 0             | Duplikat                              |
| failed_count    | INTEGER   | DEFAULT 0             |                                        |
| error_log       | JSONB     | NULLABLE               | Detail baris yang gagal               |
| created_at      | TIMESTAMP | DEFAULT NOW()          |                                        |

**Relasi tambahan:**
- `users` 1-to-many `import_batches`
- `trades.source` menentukan asal data, dipakai untuk prioritas saat ada bentrok data (EA > CSV import)

---

## BAGIAN III — DESIGN SYSTEM (SOT #3, delta dari V1)

### 8-9. Komponen Baru

Mengikuti token warna & tipografi dari V1 [V1-section-8], tidak ada perubahan visual identity — hanya komponen baru:

#### Import Wizard (komponen baru)
| Step    | Tampilan                                                        |
|-----------|---------------------------------------------------------------------|
| Upload    | Drag & drop zone + tombol "Pilih File", info format yang didukung   |
| Preview   | Tabel preview mapping kolom, bisa edit mapping manual                 |
| Hasil     | Ringkasan: berhasil (hijau), di-skip duplikat (kuning/abu), gagal (merah) — tiap kategori bisa expand lihat detail |

#### Kartu Metrik Lanjutan (tambahan di Dashboard)
| Metrik | Tampilan |
|---|---|
| Efisiensi Exit (MFE) | Kartu dengan progress bar/ring — persentase efisiensi, warna gradasi merah→hijau |
| SQN | Kartu angka besar + label kategori (Kurang/Rata-rata/Baik/Sangat Baik), tooltip penjelasan singkat rumus |

### 10. Design Prompt tambahan

```
Design an "Import Data" wizard screen for Catatan Harian Trader (forex trading journal).
Steps: 1) drag-and-drop CSV upload zone, 2) column mapping preview table,
3) result summary with success/skipped/failed counts in green/yellow/red.
Consistent with existing dark/light theme (gold accent #D4A94C dark theme).
Mobile-first, 375px viewport first.
```

```
Design two new metric cards for the Catatan Harian Trader dashboard:
1) "Efisiensi Exit" — circular progress ring showing percentage, red-to-green gradient
2) "SQN Score" — large number with qualitative label badge (Kurang/Rata-rata/Baik/Sangat Baik)
Match existing dashboard card style (dark theme, gold accent). Mobile-first.
```

---

## BAGIAN IV — USER FLOW (SOT #4)

### 11. Flow F-09 — Import CSV/Statement
```
[START] Buka halaman "Import Data"
  │
  ▼
Upload file CSV
  │
  ├─ [Format tidak dikenali] → pesan error → kembali ke upload
  │
  └─ [Format valid] → Tampilkan preview mapping kolom
       │
       ▼
     User konfirmasi/perbaiki mapping
       │
       ▼
     Proses import per baris
       │
       ├─ Duplikat (cocok dengan trade existing) → skip, hitung di ringkasan
       ├─ Data tidak lengkap → gagal, catat di error log
       └─ Valid & baru → insert, source = 'csv_import'
       │
       ▼
     Tampilkan ringkasan hasil (berhasil/skip/gagal)
                                                    [END]
```

### 11b. Flow F-10 — Lihat Metrik Lanjutan
```
[START] Buka Dashboard
  │
  ▼
Sistem hitung SQN dari trade closed dengan data R-multiple
  │
  ├─ [< 20 trade] → tampilkan skor + catatan "sampel kecil"
  └─ [>= 20 trade] → tampilkan skor + kategori kualitatif

Sistem tampilkan rata-rata efisiensi MFE dari trade source='mt5_sync'
  │
  └─ [Ada trade dari csv_import di periode itu] → tampilkan catatan
     "X trade tidak punya data MFE (dari import)"
                                                    [END]
```

### 12. Edge Case & Error State (tambahan)

| Kondisi                                        | Behaviour yang diharapkan                                       |
|---------------------------------------------------|----------------------------------------------------------------------|
| File CSV kosong/hanya header                       | Pesan "File tidak berisi data trade"                                 |
| User upload file yang sama 2x                       | Semua baris terdeteksi duplikat, tidak ada yang masuk dua kali        |
| Trade dari CSV bentrok dengan trade dari EA (ticket sama) | Data EA menang (lebih real-time & terverifikasi), baris CSV di-skip |
| SQN dihitung dengan 0 trade ber-data R:R lengkap    | Tampilkan "Belum cukup data untuk menghitung SQN"                     |

---

## BAGIAN V — SEQUENCE DIAGRAM (SOT #5)

### 13. Sequence F-09 — Import CSV
```
User        → Frontend    : Upload file CSV
Frontend    → API         : POST /api/import (multipart file)
API         → API         : Parse CSV, deteksi mapping kolom
API         → Frontend    : 200 OK { preview_rows, detected_mapping }
Frontend    → User        : Tampilkan preview + mapping

User        → Frontend    : Konfirmasi mapping
Frontend    → API         : POST /api/import/{batch_id}/confirm { mapping }
API         → Database    : INSERT import_batches (status: processing)
API         → API         : Loop tiap baris — validasi & cek duplikat
API         → Database    : UPSERT trades (source: csv_import) untuk baris valid & baru
API         → Database    : UPDATE import_batches (status: success/partial, counts)
API         → Frontend    : 200 OK { imported, skipped, failed }
Frontend    → User        : Tampilkan ringkasan hasil
```

### 13b. Sequence F-10 — Hitung SQN & MFE
```
Frontend    → API         : GET /api/dashboard/advanced-metrics?month=YYYY-MM
API         → Database    : SELECT trades WHERE status='closed' AND actual_rr IS NOT NULL
Database    → API         : Return list R-multiple per trade
API         → API         : Hitung SQN = (mean(R) / stdev(R)) * sqrt(min(count, 100))
API         → Database    : SELECT AVG(mfe_percent) WHERE source='mt5_sync'
Database    → API         : Return rata-rata efisiensi MFE
API         → Frontend    : 200 OK { sqn_score, sqn_category, mfe_avg_percent, mfe_excluded_count }
Frontend    → User        : Tampilkan 2 kartu metrik baru
```

---

## BAGIAN VI — TECHNICAL STANDARD (delta dari V1)

### 14-20. Tidak ada perubahan tech stack

Tetap pakai stack dari V1 [V1-section-14]: Next.js + Supabase + Recharts. Tambahan library:

| Kategori          | Library         | Alasan                                          |
|----------------------|-------------------|------------------------------------------------------|
| CSV Parsing          | PapaParse          | Parsing CSV di frontend untuk preview sebelum submit, dan di backend untuk proses final |
| Statistik             | simple-statistics (atau kalkulasi manual) | Hitung mean, stdev untuk SQN |

### 19. Error Handling (tambahan)

| Code                  | Kapan dipakai                                      |
|-------------------------|---------------------------------------------------------|
| IMPORT_FILE_INVALID      | File bukan CSV atau kolom wajib tidak ditemukan          |
| IMPORT_FILE_TOO_LARGE    | File > 10MB                                                |
| IMPORT_ROW_INCOMPLETE    | Baris tertentu tidak lengkap (dicatat di error_log, bukan menghentikan proses) |

### 21. Security Considerations (tambahan)

- File upload divalidasi tipe MIME-nya (bukan cuma ekstensi `.csv`), untuk cegah upload file berbahaya
- File yang diupload tidak disimpan permanen setelah diproses (cukup simpan hasil parsing di database, bukan file mentahnya) — mengurangi permukaan risiko keamanan

---

## BAGIAN VII — QA

### 23. Test Case

#### Fitur: Import CSV (ref: F-09)

| ID     | Skenario                                  | Kondisi Awal            | Yang Diharapkan                                      | Prioritas |
|--------|-----------------------------------------------|----------------------------|------------------------------------------------------------|-----------|
| TC-101 | Import file valid, semua baris baru            | Belum ada trade sejenis     | Semua baris masuk sebagai trade baru, source=csv_import     | Tinggi    |
| TC-102 | Import file yang sudah pernah diimpor          | Sudah ada trade dari file sama | Semua baris terdeteksi duplikat, tidak ada yang dobel      | Tinggi    |
| TC-103 | Import bentrok dengan data EA                  | Trade dari EA sudah ada     | Baris CSV yang ticket-nya sama di-skip, data EA tidak berubah | Tinggi    |
| TC-104 | Upload file > 10MB                             | -                            | Ditolak sebelum upload selesai, pesan jelas                 | Sedang    |

#### Fitur: MFE & SQN (ref: F-10)

| ID     | Skenario                                  | Kondisi Awal              | Yang Diharapkan                                | Prioritas |
|--------|-----------------------------------------------|------------------------------|------------------------------------------------------|-----------|
| TC-105 | SQN dengan < 20 trade                          | 10 trade closed dengan R:R    | Skor tetap tampil + catatan sampel kecil                | Sedang    |
| TC-106 | MFE untuk trade hasil import                    | Trade source=csv_import       | Field MFE kosong, ditampilkan "tidak tersedia"           | Sedang    |

---

## BAGIAN VIII — GITHUB REFERENCE (lanjutan dari V1)

> Tetap wajib pakai referensi yang sama seperti V1 [V1-section-24]. Tambahan khusus addendum ini:

| No | Nama Repo | Link | Lisensi | Status | Rekomendasi Penggunaan |
|----|-------------|--------|-----------|----------|----------------------------|
| 6  | janzofx/Trading_Journal | github.com/janzofx/Trading_Journal | Cek LICENSE | **WAJIB** — basis rumus SQN | Sudah dirujuk di V1 untuk analitik dasar, sekarang WAJIB dipelajari lebih detail khusus bagian kalkulasi SQN-nya |
| 7  | Eleven-Trading/TradeNote | github.com/Eleven-Trading/TradeNote | Cek LICENSE | **WAJIB** — basis fitur import & MFE | Pelajari folder `brokers/` di repo mereka untuk pola mapping kolom CSV MT5 → field standar, dan pola kalkulasi MFE mereka |

---

## BAGIAN IX — SPRINT BACKLOG

### 25. Ringkasan Sprint (lanjutan dari V1, mulai S-10)

| Sprint | Nama                                       | SOT yang dirujuk                     | Estimasi |
|----------|------------------------------------------------|------------------------------------------|------------|
| S-10     | UI Import Wizard + Kartu MFE/SQN (static)      | F-09, F-10, Design System addendum        | 2 hari     |
| S-11     | Backend Import CSV + EA Update (kirim MFE) + Backend SQN + Integrasi | F-09, F-10, Sequence addendum | 2-3 hari |

---

### 26. Sprint Detail + Prompt Siap Pakai

#### SPRINT S-10 — UI Import Wizard + Kartu MFE/SQN (Static)

**Tujuan:** Halaman import CSV (3 step: upload, preview, hasil) dan 2 kartu metrik baru di Dashboard, dengan data dummy.

**Task list:**
- [ ] Halaman Import Data: drag & drop upload, preview mapping kolom, ringkasan hasil (semua dummy)
- [ ] Kartu "Efisiensi Exit (MFE)" — progress ring, dummy percentage
- [ ] Kartu "SQN" — angka + badge kategori, dummy value
- [ ] State loading saat proses import (simulasi)
- [ ] State ketika data sampel kecil (< 20 trade) untuk SQN

**SOT yang dirujuk:** F-09, F-10 (section 3), Flow F-09/F-10 (section 11), Komponen Import Wizard & Kartu Metrik (section 9)

**Prompt untuk Claude — Sprint S-10:**
```
Kita mulai Sprint S-10: UI Import Wizard + Kartu MFE/SQN (Static) untuk Catatan Harian Trader.
Ini addendum V2 di atas fondasi V1 yang sudah selesai (S-00 s/d S-09).
Sprint ini murni frontend — data masih dummy.

⚠️ PRINSIP SPRINT INI:
- Mobile-first, layout 375px dulu
- Gunakan skill yang relevan dengan pekerjaan ini (multi-step wizard, file upload UI, chart)
- Konsisten dengan Design System V1 yang sudah ada — jangan bikin token warna baru

⚠️ WAJIB PAKAI REFERENSI REPO:
- Pelajari pola UX folder `brokers/` di `Eleven-Trading/TradeNote` (github.com/Eleven-Trading/TradeNote)
  untuk alur mapping kolom CSV — adaptasi pola stepper/wizard-nya

Requirement UI (F-09 & F-10):
[paste SRS F-09 dan F-10 dari section 3]

Alur yang disimulasikan:
[paste Flow F-09 dan F-10 dari section 11]

Halaman 1 — Import Wizard (3 step):
[paste komponen Import Wizard dari section 9]
- Step Upload: drag-drop zone, validasi ekstensi file di client-side (dummy)
- Step Preview: tabel dummy hasil parsing, kolom mapping bisa diedit
- Step Hasil: ringkasan berhasil/skip/gagal dengan warna berbeda, bisa expand detail gagal

Halaman 2 — Tambahan di Dashboard (cari halaman Dashboard yang sudah ada dari S-04, tambahkan):
[paste komponen Kartu Metrik Lanjutan dari section 9]
- Kartu Efisiensi Exit (MFE): circular progress, dummy 68%
- Kartu SQN: angka dummy 2.3 + badge "Baik"
- State khusus: kalau data < 20 trade, tampilkan catatan sampel kecil

Standar:
- Tap target minimal 44x44px
- Token Design System dari V1
- Naming: [paste V1 section 17]

Tunjukkan di 375px dulu, lalu 768px+.
```

---

#### SPRINT S-11 — Backend Import CSV + EA Update + Backend SQN

**Tujuan:** Import CSV benar-benar berjalan, EA mengirim data MFE, SQN dihitung dari data asli.

**Task list:**
- [ ] Migration schema: tambah kolom `source`, `mfe_value`, `mfe_percent` di `trades`; tabel baru `import_batches`
- [ ] Endpoint `POST /api/import` (parse & preview) dan `POST /api/import/{batch_id}/confirm` (proses final)
- [ ] Logic dedup: prioritaskan data EA di atas data CSV import kalau ticket ID sama
- [ ] Update EA (.mq5) dari V1: tambah kalkulasi MFE saat trade closed, kirim bersamaan data sync
- [ ] Endpoint `GET /api/dashboard/advanced-metrics` — hitung SQN & rata-rata MFE
- [ ] Sambungkan UI dari S-10 ke API nyata

**SOT yang dirujuk:** F-09, F-10 (section 3), Sequence addendum (section 13), Schema addendum (section 7)

**Prompt untuk Claude — Sprint S-11:**
```
Kita mulai Sprint S-11: Backend Import CSV + EA Update + Backend SQN untuk Catatan Harian Trader.
UI sudah selesai di S-10. Ini addendum V2 di atas fondasi V1 yang sudah production-ready.

⚠️ PRINSIP SPRINT INI:
- Gunakan skill yang relevan dengan pekerjaan ini (parsing CSV, statistik, MQL5)
- Jangan ubah alur EA V1 yang sudah jalan — ini UPDATE, bukan rombak ulang
- Data dari EA tetap prioritas di atas data CSV import kalau ada bentrok ticket ID

⚠️ WAJIB PAKAI REFERENSI REPO:
- Pelajari rumus SQN dari `janzofx/Trading_Journal` (github.com/janzofx/Trading_Journal),
  translasikan ke TypeScript
- Pelajari pola mapping kolom broker dari `Eleven-Trading/TradeNote` folder `brokers/`
  untuk parsing format export CSV MT5

1. Migration schema:
   [paste schema addendum trades (source, mfe_value, mfe_percent) dan import_batches dari section 7]

2. Endpoint import:
   [paste Sequence F-09 dari section 13]
   - POST /api/import → terima file, parse dengan PapaParse, deteksi mapping, return preview
   - POST /api/import/{batch_id}/confirm → proses final, cek duplikat (termasuk vs data EA),
     insert trade baru dengan source='csv_import'

3. Update EA (.mq5) dari Sprint S-06/S-07 (V1):
   - Saat trade closed, hitung MFE dari data candle M1 selama posisi terbuka
     (harga tertinggi untuk buy / terendah untuk sell)
   - Kirim mfe_value bersamaan payload sync yang sudah ada — JANGAN ubah struktur
     payload lain yang sudah berjalan di V1

4. Endpoint metrik lanjutan:
   [paste Sequence F-10 dari section 13]
   - GET /api/dashboard/advanced-metrics?month=YYYY-MM
   - Hitung SQN dari trade dengan actual_rr terisi
   - Hitung rata-rata mfe_percent dari trade source='mt5_sync'

5. Sambungkan UI (S-10) ke API nyata.

Requirement lengkap (F-09 & F-10):
[paste SRS F-09 dan F-10 dari section 3]

Format error: [paste addendum section 19] + [paste V1 section 19]
Standar: [paste V1 section 17 & 18]

Mulai dari migration → endpoint import → update EA → endpoint metrik → sambungkan UI.
Tunjukkan tiap langkah, dan pastikan test yang sudah ada di V1 tetap lolos (regression check).
```

---

## BAGIAN X — PENUTUP

### 27. Assumptions & Open Questions

#### Asumsi yang Diambil
- [ ] MFE hanya bisa dihitung untuk trade dari EA (MT5 punya akses candle history lokal), TIDAK bisa untuk trade dari CSV import kecuali suatu saat kita integrasi API data harga historis eksternal (berbayar/rate-limited)
- [ ] SQN dihitung per periode yang dipilih user (misal per bulan), bukan sepanjang umur akun — supaya relevan dengan kondisi trading terkini
- [ ] Update EA tidak boleh breaking change terhadap EA V1 yang sudah dipakai user — wajib backward compatible

#### Open Questions
- [ ] Kalau nanti mau MFE untuk data CSV import juga, provider data harga historis forex apa yang mau dipakai (gratis vs berbayar)? Perlu keputusan terpisah sebelum dikerjakan
- [ ] Apakah kategori skor SQN (Kurang/Rata-rata/Baik/Sangat Baik) perlu bisa dikustomisasi user, atau tetap standar industri saja?

---

### 28. Cara Pakai Dokumen Ini

```
Dokumen ini adalah ADDENDUM — dikerjakan SETELAH V1 (S-00 s/d S-09) production-ready.

Urutan pengerjaan tetap sama seperti V1: frontend-first (S-10), lalu backend (S-11).
Regression check WAJIB di S-11 — pastikan fitur V1 (terutama sync EA) tidak rusak
akibat update EA untuk kirim data MFE.

Setelah S-11 selesai, update SRS Index gabungan (V1 + V2) statusnya di file V1,
supaya tetap ada SATU sumber kebenaran soal status keseluruhan project.
```

---

*Addendum ini dibuat dengan PRD Generator v4, melengkapi `catatan-harian-trader-prd.md` (V1).*
*Output ini adalah file `catatan-harian-trader-prd-v2.md` — simpan berdampingan dengan V1 di root folder project.*
