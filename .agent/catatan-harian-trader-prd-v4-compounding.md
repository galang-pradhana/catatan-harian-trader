# PRD: Catatan Harian Trader — ADDENDUM V4 (Compounding Table & Position Sizing)
**Versi:** 4.0 (Addendum)
**Tanggal:** 2 Agustus 2026
**Status:** Draft
**Dokumen Terkait:** V1 (core app), V2 (import & MFE/SQN), V3 (admin panel & freemium readiness) — dokumen ini TIDAK menggantikan ketiganya
**Solo Dev Mode:** Ya

---

## 0. Ringkasan Fitur

Fitur ini mengubah "Compounding Table" (spreadsheet yang kamu kasih) jadi kalkulator interaktif di dalam app. Fungsinya dua arah:

1. **Position sizing** — kasih tau user "kalau modalku segini, lot yang harus aku pakai berapa" berdasarkan risk management yang konsisten
2. **Peta jalan jangka panjang** — proyeksi compounding dari modal awal sampai target besar, tiap level otomatis jadi milestone yang bisa dilacak progressnya lewat menu Tujuan (V3)

### Rumus yang dipakai (hasil analisis dari data yang kamu kasih)

```
Target Plan (level n)  = FLOOR( Balance(n-1) × Profit Plan % , kelipatan $10 )
Risk (level n)          = FLOOR( Balance(n-1) × Risk Plan % , kelipatan $5 )
Ideal Lot (level n)     = Risk(n) ÷ ( Pip Risk × Nilai per Pip per Lot Standar )
Asset Plan (level n)    = Balance(n-1) + Target Plan(n)   → jadi Balance awal level n+1
```

> Contoh dari data: Balance $17,031 → Target = FLOOR(17031×2.5%, $10) = $420 → Risk = FLOOR(17031×1.25%, $5) = $210 → Ideal Lot = $210 ÷ (50 pip × $10) = 0.42 lot → Asset Plan = $17,451 (jadi modal level berikutnya)

---

## BAGIAN I — SRS (SOURCE OF TRUTH #1)

### 1. Overview

- **Nama Modul:** Compounding Table & Position Sizing Calculator
- **Problem Statement:** Trader sering asal nentuin lot size tanpa hitungan risk yang konsisten, dan gak punya gambaran jelas "kalau aku disiplin, modalku bisa jadi berapa dalam X level ke depan". Fitur ini otomatiskan kalkulasi itu.
- **Target User:** Semua user (fitur ini general, tidak spesifik forex-only meski datang dari konteks forex — pip risk & pip value bisa disesuaikan)
- **Keputusan desain (dari hasil diskusi):**
  - Modal awal: default dari saldo MT5 akun yang tersambung, tapi bisa di-override manual untuk simulasi
  - Semua parameter kalkulasi full custom (Profit Plan %, Risk Plan %, Pip Risk, Nilai per Pip)
  - Tiap level compounding otomatis jadi Goal yang bisa dilacak progressnya
  - Status "tercapai" per level otomatis ter-checklist berdasarkan balance real dari sync MT5

---

### 2. SRS Index (lanjutan dari V1, V2, V3)

| ID     | Kategori     | Nama Requirement                                       | Prioritas | Status  |
|--------|--------------|-----------------------------------------------------------|-----------|---------|
| F-16   | Kalkulator   | Setup Parameter Compounding Plan                            | Tinggi    | Planned |
| F-17   | Kalkulator   | Generate & Lihat Compounding Table                           | Tinggi    | Planned |
| F-18   | Sinkronisasi | Auto-Check Level Tercapai berdasarkan Balance Real            | Sedang    | Planned |
| F-19   | Integrasi    | Compounding Level sebagai Goal Otomatis                       | Sedang    | Planned |
| NF-09  | Performa     | Generate table ratusan level tidak membebani browser         | Sedang    | Planned |
| NF-10  | Akurasi      | Kalkulasi floating-point tidak boleh melenceng dari rumus     | Tinggi    | Planned |

---

### 3. SRS Functional Detail

#### F-16 — Setup Parameter Compounding Plan
- **Deskripsi:** User membuat satu "plan" compounding dengan parameter yang bisa diatur penuh.
- **Actor:** User
- **Main flow:**
  1. User buka menu "Compounding" (baru), klik "Buat Plan Baru"
  2. User pilih sumber modal awal: (a) tarik otomatis dari salah satu akun MT5 yang tersambung, atau (b) input manual (mode simulasi)
  3. User isi parameter: Profit Plan (%), Risk Plan (%), Pip Risk (jarak SL dalam pip), Nilai per Pip per Lot Standar ($) — default $10 tapi bisa diubah (misal buat gold/instrumen lain)
  4. Sistem tampilkan preview RR ratio otomatis (Profit Plan % ÷ Risk Plan %) — misal 2.5%/1.25% = RR 1:2
  5. User beri nama plan (misal "Plan Akun Cent Utama"), simpan
- **Alternative flow:**
  - User pilih sumber MT5 tapi belum ada koneksi aktif → tampilkan pesan, arahkan ke menu Hubungkan MT5 (F-02) dulu
  - Profit Plan % lebih kecil dari Risk Plan % → tampilkan warning "RR di bawah 1:1, apakah ini disengaja?" (tetap boleh disimpan, cuma warning, bukan blokir)
- **Validation rules:**
  - Profit Plan % dan Risk Plan %: harus > 0, maksimal wajar (misal ≤ 50% guna cegah salah input, bisa disesuaikan)
  - Pip Risk: harus > 0
  - Modal awal: harus > 0
- **Output:** Plan tersimpan, siap di-generate jadi table (F-17)

---

#### F-17 — Generate & Lihat Compounding Table
- **Deskripsi:** Dari satu plan, sistem generate daftar level compounding sesuai rumus di section 0.
- **Actor:** User
- **Main flow:**
  1. User buka plan yang sudah dibuat
  2. Sistem generate & tampilkan tabel: Level, Target Plan ($), Asset Plan ($), Ideal Lot, Risk ($), Status (tercapai/belum)
  3. Default generate 100 level pertama (lihat NF-09), ada tombol "Muat Lebih Banyak" untuk generate level selanjutnya
  4. User bisa lihat ringkasan: modal saat ini ada di level berapa, estimasi berapa level lagi menuju target tertentu (misal user ketik "$1,000,000" → sistem kasih tau ada di level berapa)
- **Alternative flow:**
  - User ubah parameter plan yang sudah ada → tabel di-generate ulang dari level 1 (tidak mempertahankan histori level lama yang sudah tercapai, tampilkan konfirmasi sebelum ini terjadi karena destruktif terhadap progress)
- **Output:** Tabel compounding yang bisa di-scroll, dengan highlight level saat ini

---

#### F-18 — Auto-Check Level Tercapai berdasarkan Balance Real
- **Deskripsi:** Kalau plan terhubung ke akun MT5 (bukan mode simulasi manual), status "tercapai" tiap level otomatis ter-update berdasarkan balance real dari sync (F-03 V1).
- **Actor:** Sistem
- **Pre-condition:** EA (V1) diperluas untuk ikut mengirim `balance` akun saat ini di setiap sync — ini PERUBAHAN pada EA V1, lihat catatan di section 21
- **Main flow:**
  1. Setiap kali sync MT5 berhasil (F-03), sistem simpan `current_balance` terbaru dari akun tersebut
  2. Sistem cek plan compounding yang terhubung ke akun itu — bandingkan `current_balance` dengan `asset_plan` tiap level
  3. Level yang `asset_plan`-nya ≤ `current_balance` ditandai tercapai (`is_achieved = true`, `achieved_at` = waktu sync)
  4. Level yang levelnya jadi "level saat ini" (yang balance belum mencapai target-nya) di-highlight sebagai level aktif
- **Alternative flow:**
  - Balance turun (loss beruntun) sampai di bawah level yang sudah pernah tercapai → level itu TETAP tercatat tercapai (tidak di-un-check), karena secara historis memang pernah dicapai — hanya level "aktif saat ini" yang mundur
  - Plan mode manual (bukan dari MT5) → kolom Check tetap manual, user klik sendiri
- **Output:** Progress compounding user selalu reflect kondisi akun real tanpa perlu update manual

---

#### F-19 — Compounding Level sebagai Goal Otomatis
- **Deskripsi:** Saat user aktifkan sebuah plan, sistem otomatis membuat entri Goal (mengacu ke menu Tujuan) yang merepresentasikan target besar dari plan itu — dan progressnya sinkron dengan F-18.
- **Actor:** Sistem
- **Main flow:**
  1. User set "Goal Level" di plan (misal: "aku mau lihat progress sampai Level 100")
  2. Sistem buat 1 entri di menu Tujuan: judul otomatis (misal "Compounding: Level 100 — Asset $199,051"), progress = level tercapai saat ini ÷ 100, deadline opsional
  3. Progress Goal ini otomatis update tiap kali F-18 jalan (tidak perlu update manual oleh user)
  4. User tetap bisa lihat detail levelnya lewat link dari Goal ke halaman Compounding Table
- **Alternative flow:**
  - User hapus plan compounding → Goal terkait ditandai "Dibatalkan", bukan dihapus permanen (jaga histori)
- **Output:** Satu compounding plan otomatis punya representasi di menu Tujuan tanpa user perlu setup manual dua kali

---

### 4. Non-Functional Requirements

| ID    | Requirement | Target                                                | Cara Ukur                                |
|-------|--------------|------------------------------------------------------|----------------------------------------------|
| NF-09 | Performa     | Generate & render 100 level pertama < 1 detik di mobile | Test manual di viewport 375px, throttle 4G |
| NF-10 | Akurasi      | Semua kalkulasi level cocok 100% dengan rumus di section 0, dites terhadap data sample yang diberikan user | Unit test dengan data compounding table asli sebagai expected output |

---

### 5. Out of Scope (v4)

- Kalkulasi otomatis pip value berdasarkan instrumen/pair spesifik (misal auto-detect XAUUSD beda dengan EURUSD) — untuk MVP, user set manual nilai per pip
- Multiple compounding plan aktif bersamaan untuk 1 akun MT5 yang sama (boleh punya banyak plan, tapi cuma 1 yang "aktif"/terhubung sync per akun)
- Simulasi Monte Carlo / proyeksi dengan win rate yang tidak 100% (tabel ini asumsikan semua level "berhasil" — analisis skenario gagal/reset ditunda ke v5 kalau dibutuhkan)

---

## BAGIAN II — INFORMATION ARCHITECTURE (SOT #2)

### 6. Struktur Navigasi (tambahan)

```
App (lanjutan dari V1/V3)
├── ...
├── Compounding (BARU)
│   ├── Daftar Plan
│   └── Detail Plan → Tabel Compounding
├── Tujuan
│   └── (Goal dari compounding otomatis muncul di sini, dengan badge khusus "Compounding")
└── ...
```

### 7. Database Schema (delta)

#### Entitas baru: compounding_plans
| Field                    | Tipe Data | Constraint                | Keterangan                                     |
|-----------------------------|-----------|------------------------------|-----------------------------------------------------|
| id                          | UUID      | PK                              |                                                        |
| user_id                     | UUID      | FK → users.id                   |                                                        |
| mt5_connection_id           | UUID      | FK → mt5_connections.id, NULLABLE | NULL kalau mode manual/simulasi                     |
| name                        | VARCHAR   | NOT NULL                         |                                                        |
| initial_modal               | DECIMAL   | NOT NULL                         | Modal awal (snapshot saat plan dibuat)                |
| is_manual_modal             | BOOLEAN   | DEFAULT false                    | true kalau modal di-override manual                  |
| profit_plan_percent         | DECIMAL   | NOT NULL                         |                                                        |
| risk_plan_percent           | DECIMAL   | NOT NULL                         |                                                        |
| pip_risk                    | DECIMAL   | NOT NULL                         |                                                        |
| pip_value_per_lot           | DECIMAL   | DEFAULT 10                       | Nilai $ per pip per lot standar                       |
| goal_level_target           | INTEGER   | NULLABLE                         | Level yang jadi "target besar" (untuk F-19)           |
| status                      | VARCHAR   | DEFAULT 'active'                 | active / archived / cancelled                         |
| created_at                  | TIMESTAMP | DEFAULT NOW()                    |                                                        |
| updated_at                  | TIMESTAMP | DEFAULT NOW()                    |                                                        |

#### Entitas baru: compounding_levels
| Field          | Tipe Data | Constraint              | Keterangan                    |
|------------------|-----------|----------------------------|-----------------------------------|
| id               | UUID      | PK                            |                                    |
| plan_id          | UUID      | FK → compounding_plans.id     |                                    |
| level_number     | INTEGER   | NOT NULL                       |                                    |
| target_plan      | DECIMAL   | NOT NULL                       |                                    |
| asset_plan       | DECIMAL   | NOT NULL                       | Balance kumulatif setelah level ini |
| ideal_lot        | DECIMAL   | NOT NULL                       |                                    |
| risk_amount      | DECIMAL   | NOT NULL                       |                                    |
| is_achieved      | BOOLEAN   | DEFAULT false                  |                                    |
| achieved_at      | TIMESTAMP | NULLABLE                        |                                    |

> UNIQUE constraint: (`plan_id`, `level_number`)

#### Perubahan tabel `mt5_connections` [V1-section-7]
| Field baru          | Tipe Data | Constraint     | Keterangan                                  |
|------------------------|-----------|------------------|--------------------------------------------------|
| current_balance        | DECIMAL   | NULLABLE          | Balance terbaru dari sync terakhir (F-18)         |
| balance_updated_at     | TIMESTAMP | NULLABLE          |                                                    |

#### Entitas baru: goals (formal, dipicu kebutuhan F-19 — sekaligus melengkapi gap dari V3)
| Field           | Tipe Data | Constraint                | Keterangan                                        |
|-----------------|-----------|------------------------------|--------------------------------------------------------|
| id              | UUID      | PK                              |                                                          |
| user_id         | UUID      | FK → users.id                   |                                                          |
| title           | VARCHAR   | NOT NULL                         |                                                          |
| type            | VARCHAR   | DEFAULT 'manual'                 | 'manual' / 'compounding_level'                          |
| target_value    | DECIMAL   | NULLABLE                          | Untuk goal manual (misal target profit %)                |
| current_progress| DECIMAL   | DEFAULT 0                        | 0-100 (persentase)                                      |
| deadline        | DATE      | NULLABLE                          |                                                          |
| status          | VARCHAR   | DEFAULT 'active'                 | active / achieved / expired / cancelled                 |
| source_plan_id  | UUID      | FK → compounding_plans.id, NULLABLE | Kalau type='compounding_level'                        |
| created_at      | TIMESTAMP | DEFAULT NOW()                    |                                                          |

**Relasi tambahan:**
- `users` 1-to-many `compounding_plans`
- `compounding_plans` 1-to-many `compounding_levels`
- `mt5_connections` 1-to-many `compounding_plans` (kalau mode auto)
- `compounding_plans` 1-to-1 (opsional) `goals` (via `source_plan_id`, saat F-19 aktif)

---

## BAGIAN III — DESIGN SYSTEM (SOT #3)

### 9. Komponen Baru

| Komponen | Kegunaan |
|---|---|
| Parameter Form (F-16) | Slider/input untuk Profit Plan %, Risk Plan %, Pip Risk, Nilai per Pip — dengan preview RR ratio live |
| Compounding Table (virtualized/infinite scroll) | Tabel besar (ratusan baris), wajib pakai virtual scrolling supaya tetap ringan di mobile |
| Level Card (mobile alternative ke table) | Untuk viewport kecil, tiap level bisa ditampilkan sebagai card yang bisa di-scroll, bukan tabel lebar yang harus di-scroll horizontal |
| Progress Ring "Level Saat Ini" | Highlight visual level yang sedang berjalan, mirip indikator progress di menu Tujuan |
| Goal Badge "Compounding" | Badge khusus di menu Tujuan untuk membedakan goal otomatis dari compounding vs goal manual |

### 10. Design Prompt tambahan
```
Design a "Compounding Plan" setup screen for Catatan Harian Trader (trading journal app).
Elements: initial modal input (with toggle "use MT5 balance" vs manual), sliders for
Profit Plan %, Risk Plan %, Pip Risk, live RR ratio preview.
Dark theme, gold accent (#D4A94C), mobile-first from 375px.
```
```
Design a compounding table view — for mobile, use stacked cards instead of a wide table.
Each card shows: Level number, Target Plan, Asset Plan (running balance), Ideal Lot, Risk,
achieved checkmark badge. Current active level highlighted with gold border.
Include a sticky summary bar showing current level and balance progress.
```

---

## BAGIAN IV — USER FLOW (SOT #4)

### 11. Flow F-16/F-17 — Buat Plan & Lihat Tabel
```
[START] Buka menu Compounding → "Buat Plan Baru"
  │
  ▼
Pilih sumber modal: MT5 (pilih akun) atau Manual (input angka)
  │
  ▼
Isi parameter (Profit Plan %, Risk Plan %, Pip Risk, Nilai per Pip)
  │
  ▼
Preview RR ratio otomatis muncul
  │
  ▼
Simpan → sistem generate 100 level pertama
  │
  ▼
Tampilkan tabel, highlight level saat ini (level 1 kalau baru mulai)
                                                    [END]
```

### 11b. Flow F-18 — Auto-Check saat Sync
```
[START] EA sync trade (F-03, sudah diperluas kirim balance)
  │
  ▼
Server simpan current_balance baru
  │
  ▼
Cek semua compounding_plans yang terhubung ke akun ini
  │
  ▼
Untuk tiap level: asset_plan ≤ current_balance? 
  │
  ├─ [Ya, belum pernah ditandai] → is_achieved=true, achieved_at=now, update goal terkait
  └─ [Tidak] → level jadi "level aktif saat ini"
                                                    [END]
```

---

## BAGIAN V — SEQUENCE DIAGRAM (SOT #5)

### 13. Sequence F-17 — Generate Table
```
User        → Frontend    : Simpan plan baru
Frontend    → API         : POST /api/compounding/plans { params }
API         → Database    : INSERT compounding_plans
API         → API         : Hitung 100 level pertama sesuai rumus section 0
API         → Database    : BULK INSERT compounding_levels
Database    → API         : OK
API         → Frontend    : 200 OK { plan, levels }
Frontend    → User        : Tampilkan tabel
```

### 13b. Sequence F-18 — Auto-Check saat Sync (extend dari V1 Sequence F-03)
```
EA (MT5)    → API         : POST /mt5/sync { token, trades: [...], balance: 17451.00 }
API         → Database    : UPSERT trades (seperti V1)
API         → Database    : UPDATE mt5_connections SET current_balance=17451.00, balance_updated_at=NOW()
API         → Database    : SELECT compounding_plans WHERE mt5_connection_id = ? AND status='active'
API         → API         : Untuk tiap plan, cek level mana yang asset_plan <= 17451.00
API         → Database    : UPDATE compounding_levels SET is_achieved=true WHERE ... (yang baru tercapai)
API         → Database    : UPDATE goals SET current_progress=... WHERE source_plan_id = plan.id
API         → EA          : 200 OK
```

---

## BAGIAN VI — TECHNICAL STANDARD

### 14. Perubahan Tech Stack

Tetap Next.js + Supabase [V1-section-14]. Tambahan:

| Kategori | Library | Alasan |
|---|---|---|
| Virtual Scrolling | @tanstack/react-virtual | Render tabel ratusan baris tanpa lag, penting untuk NF-09 |

### 19. Error Handling (tambahan)

| Code                          | Kapan dipakai                                          |
|----------------------------------|-------------------------------------------------------------|
| COMPOUNDING_INVALID_PARAMS       | Profit/Risk % atau Pip Risk ≤ 0, atau melebihi batas wajar    |
| COMPOUNDING_NO_MT5_CONNECTION    | User pilih mode auto tapi belum ada koneksi MT5 aktif          |
| COMPOUNDING_REGENERATE_CONFIRM   | User ubah parameter plan existing — wajib konfirmasi eksplisit sebelum reset progress |

### Catatan Perubahan EA (dari V1)

> ⚠️ **Ini bukan EA baru — ini UPDATE ke EA yang sudah dibangun di Sprint S-06/S-07 (V1).** EA harus ditambahkan satu field di payload sync: `balance` (saldo akun saat ini, dari `AccountInfoDouble(ACCOUNT_BALANCE)` di MQL5). Ini WAJIB backward-compatible — kalau field ini tidak ada (EA versi lama yang belum update), sistem tidak boleh error, cukup skip proses auto-check (F-18) untuk koneksi itu.

---

## BAGIAN VII — QA

### 23. Test Case

| ID | Skenario | Kondisi Awal | Yang Diharapkan | Prioritas |
|----|-----------|----------------|---------------------|-----------|
| TC-301 | Kalkulasi level 1-5 sesuai data sample | Buat plan dengan modal $17,031, Profit 2.5%, Risk 1.25%, Pip Risk 50, Pip Value $10 | Hasil Target/Risk/Lot/Asset Plan level 1-5 PERSIS sama dengan data compounding table yang diberikan user | Tinggi |
| TC-302 | Modal dari MT5 vs manual | Buat 2 plan, satu auto satu manual | Plan auto ambil balance real, plan manual pakai angka yang diinput, tidak tertukar | Tinggi |
| TC-303 | Auto-check saat sync | Plan aktif, balance naik melewati asset_plan level 3 | Level 1-3 otomatis is_achieved=true setelah sync berikutnya | Tinggi |
| TC-304 | Balance turun setelah level tercapai | Level 5 sudah tercapai, balance turun di bawah asset_plan level 5 | Level 5 TETAP tercatat tercapai (tidak di-uncheck), cuma level aktif yang mundur | Tinggi |
| TC-305 | Goal otomatis ter-generate | Set goal_level_target=100 saat buat plan | Muncul 1 entri baru di menu Tujuan dengan progress sesuai level tercapai saat ini | Sedang |
| TC-306 | Regenerate table setelah ubah parameter | Ubah Risk Plan % di plan yang sudah punya progress | Muncul konfirmasi peringatan sebelum reset, progress lama hilang setelah konfirmasi | Tinggi |
| TC-307 | Render 500+ level di mobile | Generate table sampai level 500+ | Scroll tetap smooth (virtual scrolling bekerja), tidak freeze | Tinggi |
| TC-308 | EA versi lama (belum kirim field balance) | Simulasikan payload sync tanpa field `balance` | Sync trade tetap berhasil normal, auto-check compounding di-skip tanpa error | Tinggi |

---

## BAGIAN IX — SPRINT BACKLOG

### 25. Ringkasan Sprint (lanjutan dari V3, mulai S-14)

| Sprint | Nama                                                  | SOT yang dirujuk                | Estimasi |
|----------|------------------------------------------------------------|--------------------------------------|------------|
| S-14     | UI Compounding Calculator (static)                          | F-16, F-17, Design System addendum V4 | 2 hari     |
| S-15     | Backend Compounding + Update EA (kirim balance) + Auto-check + Integrasi Goal | F-16 s/d F-19, Sequence V4 | 3 hari |

### 26. Sprint Detail + Prompt Siap Pakai

#### SPRINT S-14 — UI Compounding Calculator (Static)

**Prompt untuk Claude — Sprint S-14:**
```
Kita mulai Sprint S-14: UI Compounding Calculator (Static) untuk Catatan Harian Trader.
Addendum V4 di atas fondasi V1-V3 yang sudah ada. Data masih dummy.

⚠️ PRINSIP SPRINT INI:
- Mobile-first, 375px dulu
- Gunakan skill yang relevan dengan pekerjaan ini (form kompleks, virtual scrolling/large list)
- WAJIB pakai virtual scrolling atau card-based list untuk tabel besar di mobile —
  JANGAN render tabel lebar yang di-scroll horizontal di HP

Requirement (F-16 & F-17):
[paste SRS F-16 dan F-17 dari section 3]

Halaman 1 — Buat Plan:
[paste Flow F-16/F-17 dari section 11]
- Toggle "Sumber Modal": MT5 (pilih dari daftar koneksi dummy) vs Manual (input angka)
- Form parameter: Profit Plan %, Risk Plan %, Pip Risk, Nilai per Pip per Lot
- Live preview RR ratio (misal ketik 2.5 dan 1.25 → otomatis tampil "RR 1:2")

Halaman 2 — Tabel Compounding:
[paste komponen Compounding Table & Level Card dari section 9]
- Di mobile: tampilkan sebagai card per level (BUKAN tabel lebar)
- Highlight level aktif saat ini dengan border gold
- Badge centang untuk level yang sudah tercapai (dummy beberapa level TRUE)
- Sticky summary bar di atas: level saat ini, balance saat ini

Gunakan data dummy PERSIS mengikuti angka dari contoh ini (modal $17,031, level 1
target $420, asset plan $17,451, lot 0.42, risk $210) supaya tampilan realistis.

Standar: Token Design System dari V1, Naming [paste V1 section 17]

Tunjukkan di 375px dulu, lalu 768px+ (di desktop boleh pakai tabel biasa).
```

#### SPRINT S-15 — Backend Compounding + Update EA + Auto-check

**Prompt untuk Claude — Sprint S-15:**
```
Kita mulai Sprint S-15: Backend Compounding untuk Catatan Harian Trader.
UI sudah selesai di S-14. Sprint ini krusial soal AKURASI kalkulasi — harus
persis sama dengan spreadsheet asli yang jadi rujukan.

⚠️ PRINSIP SPRINT INI:
- Rumus WAJIB persis seperti section 0 — Target Plan floor ke kelipatan $10,
  Risk floor ke kelipatan $5, JANGAN dibulatkan biasa (round), harus floor/pembulatan ke bawah
- WAJIB ada unit test yang membandingkan hasil kalkulasi dengan data sample berikut
  (level 1-10) sebagai expected output:
  Level 1: Target=$420, Risk=$210, Lot=0.42, Asset Plan=$17,451
  Level 2: Target=$430, Risk=$215, Lot=0.43, Asset Plan=$17,881
  Level 3: Target=$440, Risk=$220, Lot=0.44, Asset Plan=$18,321
  (modal awal $17,031, Profit Plan 2.5%, Risk Plan 1.25%, Pip Risk 50, Pip Value $10)
- Update EA HARUS backward-compatible — EA lama yang belum kirim field balance
  tidak boleh bikin sync gagal

1. Migration schema:
   [paste schema compounding_plans, compounding_levels, goals, dan perubahan
   mt5_connections dari section 7]

2. Endpoint generate plan:
   [paste Sequence F-17 dari section 13]
   - POST /api/compounding/plans → hitung & simpan 100 level pertama
   - GET /api/compounding/plans/{id}/levels?offset=100&limit=100 → untuk "muat lebih banyak"

3. Update EA (.mq5) dari V1 (Sprint S-06/S-07):
   - Tambahkan field `balance` di payload sync, ambil dari AccountInfoDouble(ACCOUNT_BALANCE)
   - JANGAN ubah struktur payload lain yang sudah berjalan

4. Endpoint auto-check (extend endpoint sync dari V1):
   [paste Sequence F-18 dari section 13]
   - Setelah sync trade berhasil, cek compounding_plans terkait, update is_achieved
   - Update goals.current_progress terkait (F-19)

5. Endpoint integrasi Goal:
   - Saat plan dibuat dengan goal_level_target terisi, otomatis insert ke tabel goals

6. Sambungkan UI (S-14) ke semua endpoint ini.

Requirement lengkap (F-16 s/d F-19):
[paste SRS lengkap dari section 3]

Format error: [paste section 19]
Standar: [paste V1 section 17 & 18]

Mulai dari migration → endpoint generate → update EA → auto-check → integrasi goal →
sambungkan UI. WAJIB jalankan & tunjukkan hasil unit test akurasi kalkulasi (TC-301)
sebelum lanjut ke langkah berikutnya.
```

---

## BAGIAN X — PENUTUP

### 27. Assumptions & Open Questions

#### Asumsi yang Diambil
- [ ] Nilai per Pip per Lot Standar default $10 mengasumsikan pair mayoritas forex (quote currency USD) — user yang trading gold/instrumen lain WAJIB set manual sesuai kalkulasi mereka sendiri
- [ ] "Modal" ($167) dan "Equity Pips" (4000) dari spreadsheet asli TIDAK dipakai langsung dalam rumus MVP ini — kemungkinan itu referensi/catatan tambahan di spreadsheet aslinya yang tidak mempengaruhi hasil kalkulasi tiap level (perlu konfirmasi kalau ternyata ada rumus tersembunyi yang memakainya)
- [ ] "Minimum Target: 100" diasumsikan sebagai catatan target pip (100 pip take profit, sesuai NOTE di spreadsheet), bukan parameter yang mempengaruhi rumus level

#### Open Questions
- [ ] Apakah field "Modal" ($167) dan "Equity Pips" (4000) dari spreadsheet asli perlu difungsikan di versi berikutnya? Perlu klarifikasi rumus aslinya kalau ada penggunaan spesifik yang terlewat
- [ ] Kalau user pakai lebih dari 1 akun MT5, apakah tiap akun boleh punya compounding plan sendiri-sendiri secara bersamaan? (Asumsi saat ini: boleh, tidak ada batasan)
- [ ] Perlu notifikasi (push/in-app) saat level baru tercapai? Ini natural buat digabung dengan menu Pengingat (V3 gap analysis) — bisa jadi Addendum V5 kalau dibutuhkan

---

*Addendum ini dibuat dengan PRD Generator v4, melengkapi V1, V2, dan V3.*
*Output ini adalah file `catatan-harian-trader-prd-v4-compounding.md`.*
