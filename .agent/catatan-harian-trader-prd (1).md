# PRD: Catatan Harian Trader
**Versi:** 1.0
**Tanggal:** 31 Juli 2026
**Status:** Draft
**Solo Dev Mode:** Ya — semua sprint dirancang untuk dikerjakan sendiri dengan Claude

---

## BAGIAN I — SRS (SOURCE OF TRUTH #1)

### 1. Overview

- **Nama Aplikasi:** Catatan Harian Trader
- **Problem Statement:** Trader forex biasanya males/susah nulis jurnal trading secara manual, padahal jurnal adalah alat paling penting untuk evaluasi dan konsistensi. Catatan Harian Trader membaca otomatis history trade & posisi terbuka langsung dari MetaTrader 5, sehingga trader tinggal fokus melengkapi bagian kualitatif (alasan entry, mood, evaluasi) tanpa perlu input data angka secara manual.
- **Target User:** Trader forex retail (individual), dari pemula sampai berpengalaman, yang aktif trading di MT5 dan ingin membangun kedisiplinan lewat jurnal.
- **Platform:** Web app (mobile-first, responsive) + Backend. Mobile app native direncanakan untuk fase berikutnya, bukan bagian MVP ini.
- **Constraint / Deadline:** Tidak ada deadline ketat. Prioritas: keamanan data (khususnya koneksi MT5) dan biaya operasional gratis di tahap awal (free tier hosting).
- **Model Penggunaan:** Multi-user — setiap trader punya akun sendiri, data 100% privat (tidak ada leaderboard atau fitur sosial di v1).

---

### 2. SRS Index

| ID     | Kategori     | Nama Requirement                          | Prioritas | Status  |
|--------|--------------|--------------------------------------------|-----------|---------|
| F-01   | Auth         | Registrasi & Login (email/password)        | Tinggi    | Planned |
| F-02   | Konektivitas | Hubungkan Akun MT5                          | Tinggi    | Planned |
| F-03   | Konektivitas | Sinkronisasi Trade dari MT5                 | Tinggi    | Planned |
| F-04   | Jurnal       | Lengkapi Data Kualitatif per Trade          | Tinggi    | Planned |
| F-05   | Analitik     | Dashboard Statistik & Grafik                | Tinggi    | Planned |
| F-06   | Jurnal       | Kelola Strategi & Tag Kesalahan (custom)    | Sedang    | Planned |
| F-07   | Jurnal       | Riwayat Trade & Filter                      | Tinggi    | Planned |
| F-08   | Pengaturan   | Profil, Ganti Password, Tema Light/Dark     | Sedang    | Planned |
| NF-01  | Performa     | Load halaman < 2 detik                      | Sedang    | Planned |
| NF-02  | Keamanan     | Kredensial MT5 tidak pernah disimpan        | Tinggi    | Planned |
| NF-03  | Usability    | Mobile-first, minimal viewport 375px        | Tinggi    | Planned |
| NF-04  | Reliability  | Status sync selalu jelas & bisa didiagnosis | Tinggi    | Planned |
| NF-05  | Availability | Uptime wajar di free tier hosting           | Rendah    | Planned |

> Prefix: F- = Functional, NF- = Non-Functional

---

### 3. SRS Functional Detail

#### F-01 — Registrasi & Login
- **Deskripsi:** User dapat mendaftar dan masuk menggunakan email & password.
- **Actor:** User (trader)
- **Pre-condition:** Untuk login, user sudah pernah registrasi.
- **Main flow:**
  1. User membuka halaman registrasi, isi nama, email, password
  2. Sistem kirim email verifikasi
  3. User verifikasi email, lalu bisa login
  4. User login dengan email + password → redirect ke Dashboard
- **Alternative flow:**
  - Email sudah terdaftar → tampilkan pesan "Email sudah digunakan"
  - Password salah saat login → pesan "Email atau password salah", max 5x percobaan lalu cooldown 15 menit
  - Email belum diverifikasi → blokir login, tampilkan tombol "Kirim ulang email verifikasi"
- **Validation rules:**
  - Email: format valid
  - Password: min 8 karakter, kombinasi huruf & angka
- **Output:** Sesi login aktif (token), user diarahkan ke Dashboard

---

#### F-02 — Hubungkan Akun MT5
- **Deskripsi:** User menghubungkan akun MT5 mereka ke aplikasi tanpa perlu memasukkan username/password broker. Sistem membuatkan API token unik yang ditempel ke Expert Advisor (EA) kecil yang di-install user di terminal MT5 mereka.
- **Actor:** User
- **Pre-condition:** User sudah login
- **Main flow:**
  1. User buka halaman "Hubungkan MT5"
  2. User klik "Buat Koneksi Baru" → sistem generate API token unik + instruksi + file EA untuk didownload
  3. User install EA di MT5 (drag ke chart), masukkan API token ke parameter EA
  4. EA melakukan "handshake" pertama ke server — status koneksi berubah jadi "Terhubung"
  5. Dashboard menampilkan status: nomor akun, broker, waktu handshake terakhir
- **Alternative flow:**
  - Token salah/expired → EA menerima response 401, status tetap "Belum Terhubung", pesan error ditampilkan di log EA
  - User revoke/hapus koneksi → token langsung tidak berlaku, EA berhenti mengirim data
  - EA tidak pernah handshake dalam 24 jam setelah token dibuat → status "Menunggu Koneksi" dengan tombol bantuan troubleshoot
- **Validation rules:**
  - Satu token hanya valid untuk satu akun MT5 (dicek dari nomor akun saat handshake pertama)
  - Token di-hash saat disimpan di database (tidak disimpan plain text)
- **Output:** Koneksi MT5 aktif, siap menerima data sync

---

#### F-03 — Sinkronisasi Trade dari MT5
- **Deskripsi:** EA membaca closed trade history & open position dari terminal MT5, mengirim ke server. User juga bisa memicu refresh tampilan lewat tombol "Sync Sekarang".
- **Actor:** User, EA (sistem)
- **Pre-condition:** Koneksi MT5 sudah aktif (F-02)
- **Main flow:**
  1. EA berjalan di background MT5, secara berkala (misal tiap 1-2 menit selama terminal aktif) mengecek trade baru/berubah
  2. EA kirim data trade (ticket ID, symbol, arah, volume, harga, waktu, SL/TP, profit, komisi, swap, status open/closed) ke endpoint sync
  3. Server cek `mt5_ticket_id` — kalau baru, insert; kalau sudah ada dan berubah (misal posisi closed), update
  4. User buka Dashboard/Riwayat Trade → data yang sudah tersinkron langsung tampil
  5. User klik "Sync Sekarang" → frontend fetch ulang data terbaru dari server (bukan memaksa EA, hanya refresh tampilan)
- **Alternative flow:**
  - EA tidak bisa konek ke server (internet putus, token invalid, dsb) → status koneksi berubah "Error", pesan spesifik ditampilkan di halaman Hubungkan MT5 (bukan cuma "gagal sync" generik)
  - Terminal MT5 tidak aktif → status berubah "Terakhir sync: X jam lalu", tidak dianggap error, hanya informasi
  - Trade duplikat terkirim (EA restart, dsb) → server idempotent berdasarkan `mt5_ticket_id`, tidak dobel insert
- **Validation rules:**
  - Payload dari EA divalidasi ulang di server (tipe data, range harga wajar, dsb) — jangan percaya penuh ke EA
  - Setiap request wajib menyertakan token valid
- **Output:** Data trade tersimpan di database, status sync & waktu terakhir sync terlihat jelas di UI

---

#### F-04 — Lengkapi Data Kualitatif per Trade
- **Deskripsi:** Setelah trade terbaca otomatis, user melengkapi kolom refleksi: alasan entry, mood, strategi, disiplin, evaluasi, dan data pendukung lain.
- **Actor:** User
- **Pre-condition:** Trade sudah tersinkron (F-03)
- **Main flow:**
  1. User buka Riwayat Trade, pilih satu trade
  2. Data otomatis (symbol, arah, harga, profit, dll) ditampilkan read-only
  3. User isi form: alasan entry, mood (pilihan emoji/skala), strategi/setup (tag, bisa custom — lihat F-06), rating disiplin (mengikuti rules sendiri atau tidak), lesson learned, risk % per trade, target R:R vs realisasi, self-grade (A-F), tag kesalahan (kalau ada — lihat F-06), upload screenshot chart (opsional)
  4. User simpan → status trade berubah dari "Belum Lengkap" jadi "Lengkap"
- **Alternative flow:**
  - User tidak isi semua kolom → tetap bisa disimpan sebagian (semua kolom kualitatif optional, hanya data dari MT5 yang wajib ada)
  - Upload screenshot gagal (file terlalu besar/format salah) → pesan error jelas, batas ukuran ditampilkan
- **Validation rules:**
  - Screenshot: max 5MB, format jpg/png/webp
  - Risk %: harus angka positif, max 100
- **Output:** Trade tersimpan lengkap dengan data kualitatif, ikut terhitung di analitik

---

#### F-05 — Dashboard Statistik & Grafik
- **Deskripsi:** Ringkasan performa trading dalam periode tertentu (mengikuti gaya referensi: Total PnL, Total Trades, Win Rate, Profit Factor, Avg R:R, kalender harian, performa per minggu, performa per simbol/strategi).
- **Actor:** User
- **Pre-condition:** Ada minimal 1 trade tersinkron
- **Main flow:**
  1. User buka Dashboard
  2. User pilih periode (bulan berjalan default, bisa ganti bulan lain)
  3. Sistem tampilkan: kartu ringkasan (Total PnL, Total Trades, Win Rate, Profit Factor, Avg R:R) dibanding periode sebelumnya
  4. Kalender bulanan menampilkan PnL harian per warna (hijau/merah)
  5. Grafik performa per minggu (bar chart)
  6. Tabel performa per simbol/strategi (trades, wins, losses, win rate, PnL)
  7. Ringkasan: best day, worst day, hari paling banyak trade, max win streak, max loss streak
- **Alternative flow:**
  - Belum ada data di periode tersebut → tampilkan empty state dengan ajakan mulai sync/trading
- **Output:** Halaman analitik yang informatif dan mudah dibaca sekali lihat

---

#### F-06 — Kelola Strategi & Tag Kesalahan
- **Deskripsi:** User bisa membuat, edit, hapus tag strategi (misal: Breakout, Scalping, Swing) dan tag kesalahan (misal: Revenge Trading, Geser SL, Lot Kegedean, FOMO Entry) yang dipakai saat mengisi jurnal (F-04).
- **Actor:** User
- **Pre-condition:** User sudah login
- **Main flow:**
  1. User buka halaman Strategi & Tag
  2. User tambah tag baru (nama + warna label)
  3. Tag langsung tersedia sebagai pilihan di form jurnal trade
- **Alternative flow:**
  - User hapus tag yang masih dipakai di trade lama → tag dihapus dari pilihan baru, data historis tetap menyimpan nama tag lama (soft reference)
- **Output:** Daftar tag custom yang bisa dipakai berulang

---

#### F-07 — Riwayat Trade & Filter
- **Deskripsi:** Daftar semua trade (open & closed) dengan kemampuan filter dan pencarian.
- **Actor:** User
- **Pre-condition:** Ada trade tersinkron
- **Main flow:**
  1. User buka halaman Riwayat Trade
  2. Sistem tampilkan list trade terbaru dulu, dengan indikator status "Lengkap"/"Belum Lengkap"
  3. User filter berdasarkan: tanggal, simbol, strategi, hasil (profit/loss), status kelengkapan jurnal
  4. User klik salah satu trade → masuk ke detail (F-04)
- **Output:** List trade yang bisa disaring sesuai kebutuhan review

---

#### F-08 — Profil, Ganti Password, Tema
- **Deskripsi:** Pengaturan dasar akun.
- **Actor:** User
- **Main flow:**
  1. User ubah nama tampilan
  2. User ganti password (wajib masukkan password lama)
  3. User toggle tema Light/Dark — preferensi disimpan per akun
- **Output:** Preferensi akun tersimpan dan konsisten di sesi berikutnya

---

### 4. Non-Functional Requirements

| ID    | Requirement   | Target                                             | Cara Ukur                          |
|-------|---------------|-----------------------------------------------------|-------------------------------------|
| NF-01 | Performa      | Load halaman < 2 detik                              | Lighthouse score ≥ 80 (mobile)      |
| NF-02 | Keamanan      | Kredensial MT5 tidak pernah tersimpan di server     | Code review + audit skema database  |
| NF-03 | Usability     | Semua halaman berfungsi baik dari 375px ke atas     | Manual test tiap breakpoint         |
| NF-04 | Reliability   | Status sync (Terhubung/Error/Menunggu) selalu akurat & pesan error spesifik | Test skenario EA offline, token invalid, no internet |
| NF-05 | Availability  | Uptime wajar mengikuti SLA free tier Vercel/Supabase | Monitor via UptimeRobot (opsional)  |

---

### 5. Out of Scope (v1)

- Aplikasi mobile native (Android/iOS)
- Fitur sosial: leaderboard, share trade ke user lain, komentar
- Koneksi ke broker/platform selain MT5 (cTrader, TradingView broker feed, dll)
- Real-time sync (websocket) — v1 pakai polling berkala dari EA + manual refresh UI
- Sistem pembayaran/subscription
- Analisis otomatis berbasis AI (misal deteksi pola kesalahan otomatis) — kandidat kuat untuk v2
- Multi-akun MT5 sekaligus dalam satu dashboard gabungan (v1 bisa multi-koneksi tapi dilihat terpisah)

---

## BAGIAN II — INFORMATION ARCHITECTURE (SOT #2)

### 6. Struktur Navigasi

```
App
├── Auth
│   ├── Login
│   └── Register
├── Dashboard (home)
│   └── Statistik & grafik (F-05)
├── Riwayat Trade (F-07)
│   └── Detail Trade → Form Jurnal (F-04)
├── Hubungkan MT5 (F-02, F-03)
├── Strategi & Tag (F-06)
└── Pengaturan (F-08)
    ├── Profil
    ├── Ganti Password
    └── Tema
```

---

### 7. Database Schema

#### Entitas: users
> Dikelola oleh Supabase Auth (`auth.users`), tabel ini adalah profil tambahan.

| Field        | Tipe Data | Constraint      | Keterangan            |
|--------------|-----------|-----------------|------------------------|
| id           | UUID      | PK, FK auth.users | Sama dengan Supabase Auth user id |
| display_name | VARCHAR   | NOT NULL        | Nama tampilan          |
| theme        | VARCHAR   | DEFAULT 'dark'  | 'light' / 'dark'       |
| created_at   | TIMESTAMP | DEFAULT NOW()   |                        |

#### Entitas: mt5_connections
| Field           | Tipe Data | Constraint         | Keterangan                          |
|-----------------|-----------|--------------------|--------------------------------------|
| id              | UUID      | PK                 |                                      |
| user_id         | UUID      | FK → users.id      |                                      |
| account_number  | VARCHAR   | NULLABLE           | Terisi setelah handshake pertama    |
| broker_name     | VARCHAR   | NULLABLE           |                                      |
| api_token_hash  | VARCHAR   | NOT NULL           | Hash dari token, bukan plain text   |
| status          | VARCHAR   | DEFAULT 'pending'  | pending / connected / error         |
| last_error      | VARCHAR   | NULLABLE           | Pesan error terakhir (untuk NF-04)  |
| last_synced_at  | TIMESTAMP | NULLABLE           |                                      |
| created_at      | TIMESTAMP | DEFAULT NOW()      |                                      |

#### Entitas: trades
| Field              | Tipe Data     | Constraint                          | Keterangan                      |
|--------------------|---------------|---------------------------------------|----------------------------------|
| id                 | UUID          | PK                                    |                                  |
| user_id            | UUID          | FK → users.id                         |                                  |
| mt5_connection_id  | UUID          | FK → mt5_connections.id               |                                  |
| mt5_ticket_id      | VARCHAR       | NOT NULL                              | ID unik dari MT5                |
| symbol             | VARCHAR       | NOT NULL                              |                                  |
| direction          | VARCHAR       | NOT NULL                              | buy / sell                      |
| volume             | DECIMAL       | NOT NULL                              | Lot size                        |
| open_price         | DECIMAL       | NOT NULL                              |                                  |
| close_price        | DECIMAL       | NULLABLE                              |                                  |
| open_time          | TIMESTAMP     | NOT NULL                              |                                  |
| close_time         | TIMESTAMP     | NULLABLE                              |                                  |
| sl                 | DECIMAL       | NULLABLE                              |                                  |
| tp                 | DECIMAL       | NULLABLE                              |                                  |
| pnl                | DECIMAL       | NULLABLE                              | Profit/loss (USD)               |
| commission         | DECIMAL       | DEFAULT 0                             |                                  |
| swap               | DECIMAL       | DEFAULT 0                             |                                  |
| status             | VARCHAR       | NOT NULL                              | open / closed                   |
| session            | VARCHAR       | NULLABLE                              | asia / london / newyork (auto)  |
| journal_status     | VARCHAR       | DEFAULT 'incomplete'                  | incomplete / complete           |
| created_at         | TIMESTAMP     | DEFAULT NOW()                         |                                  |
| updated_at         | TIMESTAMP     | DEFAULT NOW()                         |                                  |

> UNIQUE constraint: (`mt5_connection_id`, `mt5_ticket_id`) — mencegah duplikat.

#### Entitas: trade_journal
| Field          | Tipe Data | Constraint            | Keterangan                          |
|----------------|-----------|------------------------|--------------------------------------|
| trade_id       | UUID      | PK, FK → trades.id     | Relasi 1-to-1                       |
| reason_entry   | TEXT      | NULLABLE                |                                      |
| mood           | VARCHAR   | NULLABLE                | skala/emoji                         |
| discipline     | VARCHAR   | NULLABLE                | ikut rules / tidak                  |
| lesson_learned | TEXT      | NULLABLE                |                                      |
| risk_percent   | DECIMAL   | NULLABLE                |                                      |
| planned_rr     | DECIMAL   | NULLABLE                |                                      |
| actual_rr      | DECIMAL   | NULLABLE                |                                      |
| self_grade     | VARCHAR   | NULLABLE                | A / B / C / D / F                   |
| updated_at     | TIMESTAMP | DEFAULT NOW()           |                                      |

#### Entitas: strategies & mistake_tags
| Field   | Tipe Data | Constraint     | Keterangan |
|---------|-----------|-----------------|------------|
| id      | UUID      | PK              |            |
| user_id | UUID      | FK → users.id   |            |
| name    | VARCHAR   | NOT NULL        |            |
| color   | VARCHAR   | NULLABLE        | hex color  |

> Dua tabel terpisah: `strategies` dan `mistake_tags`, struktur sama.

#### Entitas: trade_strategies & trade_mistakes (pivot)
| Field         | Tipe Data | Constraint                    |
|---------------|-----------|---------------------------------|
| trade_id      | UUID      | FK → trades.id                 |
| strategy_id / mistake_tag_id | UUID | FK → strategies.id / mistake_tags.id |

#### Entitas: trade_screenshots
| Field      | Tipe Data | Constraint          | Keterangan          |
|------------|-----------|----------------------|-----------------------|
| id         | UUID      | PK                    |                       |
| trade_id   | UUID      | FK → trades.id        |                       |
| type       | VARCHAR   | NOT NULL              | entry / exit          |
| storage_url| VARCHAR   | NOT NULL              | Path di Supabase Storage |
| uploaded_at| TIMESTAMP | DEFAULT NOW()         |                       |

**Relasi antar entitas:**
- `users` 1-to-many `mt5_connections`
- `mt5_connections` 1-to-many `trades`
- `trades` 1-to-1 `trade_journal`
- `trades` many-to-many `strategies` (via `trade_strategies`)
- `trades` many-to-many `mistake_tags` (via `trade_mistakes`)
- `trades` 1-to-many `trade_screenshots`

---

## BAGIAN III — DESIGN SYSTEM (SOT #3)

### 8. Visual Identity

- **Mood/Feel:** Modern, clean, sedikit "premium finance" — terinspirasi dari referensi dashboard trading yang kamu kasih, tapi disederhanakan untuk mobile-first.
- **Referensi:** Dashboard trading terminal modern (dark theme dengan aksen gold/hijau untuk profit).
- **Tema:** Dual theme — Dark (default) & Light, toggle-able per user.
- **Warna (Dark theme):**
  - Background: `#0B0E11`
  - Surface/Card: `#161A21`
  - Primary/Accent (gold): `#D4A94C`
  - Profit (hijau): `#22C55E`
  - Loss (merah): `#EF4444`
  - Teks utama: `#F5F6F7`
  - Teks muted: `#8B93A1`
  - Border: `#252A33`
- **Warna (Light theme):**
  - Background: `#F7F8FA`
  - Surface/Card: `#FFFFFF`
  - Primary/Accent (gold gelap): `#A9791E`
  - Profit: `#16A34A`
  - Loss: `#DC2626`
  - Teks utama: `#1A1D23`
  - Teks muted: `#6B7280`
  - Border: `#E5E7EB`
- **Font:** Inter (atau Plus Jakarta Sans) — sans-serif bersih, enak dibaca untuk angka & tabel data.
- **Target Device:** Mobile-first (min-width 375px), scale ke tablet (768px) dan desktop (1280px).
- **Radius komponen:** Card 12px, Button/Input 8px
- **Spacing unit:** 4px base (4, 8, 12, 16, 24, 32)

---

### 9. Komponen & State

#### Button
| Variant   | State    | Tampilan                              |
|-----------|----------|-----------------------------------------|
| Primary   | Default  | Background gold, teks gelap             |
| Primary   | Hover    | Background gold gelap 10%               |
| Primary   | Loading  | Spinner di dalam button, disabled       |
| Primary   | Disabled | Opacity 40%                             |
| Secondary | Default  | Border accent, teks accent, transparan  |
| Danger    | Default  | Background merah, teks putih (untuk hapus koneksi/tag) |

#### Input / Form
| State    | Tampilan                                    |
|----------|------------------------------------------------|
| Default  | Border abu, placeholder muted                   |
| Focus    | Border gold, subtle shadow                      |
| Error    | Border merah, pesan error di bawah field        |
| Success  | Border hijau, ikon centang                      |
| Disabled | Background abu redup, tidak bisa diketik        |

#### Status Koneksi MT5 (komponen khusus)
| Status     | Tampilan                                         |
|------------|-----------------------------------------------------|
| Connected  | Badge hijau "Terhubung", waktu sync terakhir        |
| Pending    | Badge kuning "Menunggu koneksi pertama"             |
| Error      | Badge merah "Error", pesan spesifik + tombol bantuan|

#### Feedback / Notifikasi
| Tipe    | Trigger                    | Tampilan          | Durasi          |
|---------|------------------------------|--------------------|-------------------|
| Toast   | Aksi berhasil/gagal          | Bawah layar (mobile)| 3 detik           |
| Inline  | Validasi form                | Di bawah field      | Selama error ada  |
| Modal   | Konfirmasi destruktif (hapus koneksi, hapus tag) | Overlay tengah | Sampai user aksi |
| Banner  | Status sync error persisten  | Atas halaman        | Sampai diperbaiki |

#### Loading State
| Konteks       | Tampilan                     |
|-----------------|---------------------------------|
| Full page       | Skeleton screen                 |
| Button action   | Spinner di dalam button          |
| List trade      | Skeleton row (3-5 baris)         |
| Chart/Grafik    | Skeleton block sesuai ukuran chart |

---

### 10. Design Prompt

#### Global Style Prompt
```
Design a modern, clean fintech dashboard UI for "Catatan Harian Trader",
a forex trading journal app. Target users: retail forex traders using MetaTrader 5.
Visual style: premium, minimalist finance dashboard, mobile-first.
Support both dark theme (background #0B0E11, gold accent #D4A94C, green profit #22C55E,
red loss #EF4444) and light theme (background #F7F8FA, gold accent #A9791E).
Font: Inter, clean sans-serif. All screens should feel trustworthy, focused, and calm.
```

#### Per-Screen Prompt

**Login:**
```
Design a clean login screen for Catatan Harian Trader (forex trading journal app).
Include: app logo at top, email & password input, primary CTA "Masuk",
link to register. Dark theme with gold accent. Mobile viewport 375px.
```

**Dashboard:**
```
Design the main dashboard for Catatan Harian Trader.
Key elements: summary cards (Total PnL, Total Trades, Win Rate, Profit Factor, Avg R:R),
monthly calendar with daily PnL colored green/red, weekly performance bar chart,
performance by symbol table. Layout: stacked cards on mobile, grid on desktop.
Dark theme, gold accent, realistic placeholder trading data.
```

**Hubungkan MT5:**
```
Design the "Connect MT5" screen for Catatan Harian Trader.
Purpose: guide user to generate an API token and install an EA in MT5.
Key elements: connection status badge, step-by-step instructions card,
"Generate Token" button, list of connected accounts with status.
Dark theme, mobile-first, feels secure and trustworthy.
```

**Detail Trade / Form Jurnal:**
```
Design the trade detail screen for Catatan Harian Trader.
Top section: read-only trade data (symbol, direction, entry/exit price, PnL).
Bottom section: editable journal form (reason for entry, mood selector,
strategy tags, discipline rating, lesson learned, self-grade A-F, screenshot upload).
Dark theme, mobile-first, clear separation between auto-data and manual input.
```

---

## BAGIAN IV — USER FLOW (SOT #4)

### 11. User Flow per Fitur

#### Flow F-02 — Hubungkan MT5
```
[START] Buka halaman "Hubungkan MT5"
  │
  ▼
Klik "Buat Koneksi Baru"
  │
  ▼
Sistem generate token + tampilkan instruksi & file EA
  │
  ▼
User install EA di MT5, masukkan token
  │
  ├─ [Token salah/expired] → EA log error → status tetap "Menunggu"
  │
  └─ [Handshake sukses] → Status "Terhubung" → tampilkan nomor akun & broker
                                                  [END]
```

#### Flow F-03 — Sinkronisasi Trade
```
[START] EA berjalan di background MT5
  │
  ▼
EA cek trade baru/berubah tiap interval
  │
  ├─ [Ada perubahan] → kirim ke server → server validasi & simpan
  │                                          │
  │                                          ├─ [Duplikat] → skip, tidak error
  │                                          └─ [Baru/Update] → simpan
  │
  └─ [Tidak ada perubahan] → tidak kirim apa-apa

User buka Dashboard/Riwayat → klik "Sync Sekarang"
  │
  ▼
Frontend fetch data terbaru dari server → tampilkan
[END]
```

#### Flow F-04 — Lengkapi Jurnal
```
[START] Buka Riwayat Trade
  │
  ▼
Pilih trade dengan status "Belum Lengkap"
  │
  ▼
Lihat data otomatis (read-only)
  │
  ▼
Isi form kualitatif (semua field optional)
  │
  ▼
Klik Simpan
  │
  ├─ [Upload screenshot gagal] → pesan error, form lain tetap tersimpan
  │
  └─ [Berhasil] → status berubah "Lengkap" → kembali ke Riwayat Trade
                                                [END]
```

---

### 12. Edge Case & Error State Global

| Kondisi                                  | Behaviour yang diharapkan                                             |
|--------------------------------------------|--------------------------------------------------------------------------|
| Koneksi internet user terputus (browser)   | Toast "Koneksi bermasalah", tombol retry                                 |
| Sesi login expired                         | Redirect ke login, pesan "Sesi berakhir"                                 |
| EA tidak pernah handshake                  | Status "Menunggu Koneksi" + link troubleshoot (cek WebRequest URL allowlist di MT5) |
| EA gagal kirim data (token invalid)        | Status koneksi "Error", pesan spesifik: "Token tidak valid, buat ulang koneksi" |
| Data trade kosong (belum pernah sync)      | Empty state + CTA "Hubungkan MT5 sekarang"                               |
| Server error (5xx)                         | Halaman error dengan tombol coba lagi                                    |
| Aksi tidak authorized (akses trade user lain) | Redirect ke 403, tidak ada data yang bocor                            |
| Upload screenshot > 5MB                    | Inline error sebelum upload dicoba                                       |

---

## BAGIAN V — SEQUENCE DIAGRAM (SOT #5)

### 13. Sequence Diagram per Alur

#### Sequence F-02 — Hubungkan MT5
```
User        → Frontend    : Klik "Buat Koneksi Baru"
Frontend    → API         : POST /mt5/connections
API         → Database    : INSERT mt5_connections (status: pending, token_hash)
API         → Frontend    : 200 OK { token, instructions }
Frontend    → User        : Tampilkan token + file EA + instruksi

EA (MT5)    → API         : POST /mt5/handshake { token, account_number, broker }
API         → Database    : SELECT connection WHERE token_hash = ?
API         → API         : Verify token & update status = connected
API         → EA          : 200 OK
```

#### Sequence F-03 — Sinkronisasi Trade
```
EA (MT5)    → API         : POST /mt5/sync { token, trades: [...] }
API         → API         : Validasi token & validasi tiap payload trade
API         → Database    : UPSERT trades WHERE (mt5_connection_id, mt5_ticket_id)
Database    → API         : Return jumlah trade baru/diupdate
API         → API         : Update mt5_connections.last_synced_at
API         → EA          : 200 OK { synced_count }

User        → Frontend    : Klik "Sync Sekarang"
Frontend    → API         : GET /trades?connection_id=...
API         → Database    : SELECT trades ORDER BY open_time DESC
Database    → API         : Return trades
API         → Frontend    : 200 OK { trades }
Frontend    → User        : Update tampilan list/dashboard
```

#### Sequence F-04 — Simpan Jurnal
```
User        → Frontend    : Isi form jurnal, klik Simpan
Frontend    → API         : PUT /trades/{id}/journal { reason, mood, ... }
API         → Database    : UPSERT trade_journal WHERE trade_id = ?
API         → Database    : UPDATE trades SET journal_status = 'complete'
Database    → API         : OK
API         → Frontend    : 200 OK
Frontend    → User        : Toast "Jurnal tersimpan", kembali ke Riwayat Trade
```

---

## BAGIAN VI — TECHNICAL STANDARD

### 14. Tech Stack

| Bagian        | Teknologi                          | Alasan                                                       |
|-----------------|---------------------------------------|------------------------------------------------------------------|
| Frontend        | Next.js 14+ (App Router) + TypeScript | Satu framework untuk UI, mobile-first mudah dengan Tailwind        |
| Backend         | Next.js API Routes (Route Handlers)   | Cukup untuk MVP, tidak perlu infra server terpisah                |
| Database        | Supabase (PostgreSQL)                 | Free tier, RLS bawaan untuk isolasi data per user                 |
| Auth            | Supabase Auth                         | Email/password siap pakai, gampang tambah OAuth nanti             |
| File Storage    | Supabase Storage                      | Untuk screenshot chart                                            |
| Charting        | Recharts                              | Ringan, cocok untuk bar chart & kalender performa                 |
| Konektor MT5    | Custom EA (MQL5) via `WebRequest()`   | Gratis, tidak simpan kredensial broker                            |
| Hosting         | Vercel (app) + Supabase Cloud (data)  | Free tier, deploy otomatis dari Git                                |

---

### 15. Architecture

**Pola:** Modular monolith (Next.js full-stack) + external MT5 client (EA)

**Gambaran sistem:**
```
[MT5 Terminal + EA]  ──HTTPS POST (token)──▶  [Next.js API Routes]
                                                       │
[User Browser] ──▶ [Next.js Frontend] ──▶ [Next.js API Routes] ──▶ [Supabase: Postgres, Auth, Storage]
```

---

### 16. Project Structure
```
src/
├── app/                 # Next.js App Router (pages & API routes)
│   ├── (auth)/           # Login, Register
│   ├── dashboard/
│   ├── trades/
│   ├── mt5/               # Hubungkan MT5
│   ├── settings/
│   └── api/
│       ├── auth/
│       ├── mt5/
│       │   ├── connections/
│       │   ├── handshake/
│       │   └── sync/
│       └── trades/
├── components/           # Reusable UI components
├── hooks/                # Custom hooks (React Query, dsb)
├── services/             # API calls, Supabase client wrapper
├── store/                # Zustand store (client state ringan, misal tema)
├── utils/                # Helper functions (kalkulasi win rate, dll)
├── types/                # Type definitions
├── constants/             # App-wide constants
└── assets/                # Static files
```

---

### 17. Naming Convention

| Konteks         | Format            | Contoh                        |
|-------------------|---------------------|----------------------------------|
| Komponen          | PascalCase           | `TradeCard.tsx`                  |
| Fungsi/Variabel   | camelCase             | `calculateWinRate()`             |
| Konstanta         | UPPER_SNAKE_CASE      | `MAX_SCREENSHOT_SIZE_MB`         |
| Database tabel    | snake_case             | `trade_journal`                  |
| API endpoint      | kebab-case plural      | `/api/mt5-connections`           |
| Branch Git        | prefix + kebab         | `feat/mt5-connection-ui`         |
| File CSS/module   | kebab-case              | `trade-card.module.css`          |

---

### 18. Coding Standard

- **Formatter:** Prettier — indentasi 2 spasi, trailing comma: yes
- **Linter:** ESLint — no-unused-vars, no-console in prod
- **Typing:** TypeScript strict mode aktif
- **Max fungsi:** 50 baris — jika lebih, pecah jadi subfungsi
- **Comment wajib untuk:** kalkulasi statistik (win rate, profit factor), parsing payload EA, workaround
- **Import order:** built-in → external → internal → types → styles
- **Magic number:** dilarang — semua nilai literal (misal batas ukuran file, max percobaan login) harus dikonstantakan

---

### 19. Error Handling

**Frontend:**
- Error ditampilkan via toast (aksi) atau inline message (form)
- Raw error dari server tidak ditampilkan ke user — selalu mapping ke pesan yang manusiawi (khusus penting untuk status sync MT5, sesuai NF-04)

**Backend — format response standar:**
```json
{
  "status": "error",
  "code": "MT5_TOKEN_INVALID",
  "message": "Token tidak valid atau sudah dicabut",
  "details": {}
}
```

**Kode error khusus MT5 connector:**
| Code                  | Kapan dipakai                                  |
|-------------------------|---------------------------------------------------|
| MT5_TOKEN_INVALID       | Token salah/expired/dicabut                        |
| MT5_TOKEN_ALREADY_BOUND | Token dipakai akun MT5 berbeda dari saat handshake pertama |
| MT5_PAYLOAD_INVALID     | Data trade dari EA tidak sesuai skema              |
| MT5_DUPLICATE_TICKET    | Ticket ID sudah ada (di-handle idempotent, bukan error keras) |

**HTTP Status Mapping:**
| Code | Kapan dipakai                        |
|------|------------------------------------------|
| 400  | Request tidak valid (validasi gagal)      |
| 401  | Tidak terautentikasi / token invalid      |
| 403  | Tidak punya izin (akses data user lain)   |
| 404  | Resource tidak ditemukan                  |
| 422  | Unprocessable entity                       |
| 500  | Server error                                |

- Semua async operation wajib try-catch
- Data sensitif (password, token) tidak masuk ke log

---

### 20. Library Stack

| Kategori          | Library                        | Alasan                                             |
|----------------------|-----------------------------------|--------------------------------------------------------|
| HTTP Client          | fetch native / Axios              | Cukup untuk kebutuhan MVP                                |
| State (server)       | TanStack Query (React Query)      | Caching & sync data trade dari API                       |
| State (client)       | Zustand                            | State ringan (tema, UI state)                             |
| Form & Validasi      | React Hook Form + Zod              | Validasi form jurnal & registrasi                          |
| UI Components        | shadcn/ui (Tailwind + Radix)       | Komponen accessible, gampang dikustom sesuai Design System |
| Auth                 | Supabase Auth                      | Terintegrasi langsung dengan database & RLS                |
| Database Client      | Supabase JS Client                 | Query langsung dengan RLS, tanpa ORM tambahan di MVP        |
| Charting             | Recharts                            | Bar chart performa mingguan, dsb                            |
| Testing              | Vitest + React Testing Library, Playwright (e2e) | Unit test kalkulasi statistik, e2e untuk flow kritis |

---

### 21. Security Considerations

- **Autentikasi:** Supabase Auth (JWT-based session)
- **Autorisasi:** Row Level Security (RLS) di Postgres — user hanya bisa akses baris data miliknya sendiri
- **Kredensial MT5:** TIDAK PERNAH disimpan — hanya API token unik per koneksi, di-hash saat disimpan (seperti password)
- **Token MT5:** bisa di-revoke kapan saja oleh user, langsung invalidasi akses EA
- **Input validation:** wajib di frontend (UX) dan backend (keamanan) — payload dari EA divalidasi ulang, tidak dipercaya mentah-mentah
- **Data sensitif:** transit via HTTPS, data at rest terenkripsi (default Supabase)
- **Rate limiting:** endpoint `/mt5/sync` dibatasi — cegah spam dari token yang disalahgunakan
- **CORS:** hanya izinkan origin frontend sendiri
- **Dependencies:** audit berkala dengan `npm audit`

---

### 22. Deployment Notes

- **Environment:** Development → Staging → Production
- **Env Variables:** Supabase URL/keys via `.env`, tidak di-hardcode; dikonfigurasi lewat Vercel Environment Variables
- **CI/CD:** GitHub Actions untuk lint & test → auto-deploy ke Vercel saat push ke `main`; migration Supabase dijalankan manual/CLI sebelum deploy
- **Hosting:** Vercel (frontend + API routes), Supabase Cloud (database, auth, storage) — free tier untuk MVP
- **Branching:** `main` (prod) / `develop` / `feat/*` / `fix/*`

---

## BAGIAN VII — QA

### 23. Test Case

#### Fitur: Hubungkan MT5 (ref: F-02)

| ID     | Skenario                          | Kondisi Awal          | Yang Diharapkan                                  | Prioritas |
|--------|--------------------------------------|--------------------------|-------------------------------------------------------|-----------|
| TC-001 | Happy path: buat koneksi & handshake | User login               | Status berubah "Terhubung" setelah EA handshake sukses | Tinggi    |
| TC-002 | Token salah dipakai EA               | Koneksi belum aktif      | EA dapat error, status tetap "Menunggu"                | Tinggi    |
| TC-003 | Revoke koneksi                       | Koneksi aktif             | EA yang masih pakai token lama langsung ditolak (401)  | Tinggi    |

#### Fitur: Sinkronisasi Trade (ref: F-03)

| ID     | Skenario                       | Kondisi Awal          | Yang Diharapkan                              | Prioritas |
|--------|-----------------------------------|--------------------------|---------------------------------------------------|-----------|
| TC-004 | Trade baru masuk                  | Koneksi aktif             | Trade tersimpan, muncul di Riwayat Trade            | Tinggi    |
| TC-005 | Trade sama terkirim 2x            | EA restart                | Tidak ada duplikat (idempotent by ticket ID)        | Tinggi    |
| TC-006 | EA offline > 1 jam                | Terminal MT5 ditutup      | Status "Terakhir sync: X jam lalu", bukan error keras | Sedang    |

#### Fitur: Lengkapi Jurnal (ref: F-04)

| ID     | Skenario                       | Kondisi Awal              | Yang Diharapkan                          | Prioritas |
|--------|-----------------------------------|------------------------------|-----------------------------------------------|-----------|
| TC-007 | Isi semua field, simpan           | Trade status "Belum Lengkap" | Status berubah "Lengkap"                       | Tinggi    |
| TC-008 | Upload screenshot > 5MB           | Sedang isi form                | Inline error, field lain tetap tersimpan       | Sedang    |

---

## BAGIAN VIII — GITHUB REFERENCE

### 24. Repo Rekomendasi (WAJIB DIPAKAI)

> ⚠️ **STATUS: MANDATORY.** Repo-repo di bawah ini BUKAN sekadar opsional — dijadikan basis wajib supaya pengerjaan fitur konektivitas MT5 dan struktur jurnal tidak dimulai dari nol. Setiap sprint yang menyentuh F-02, F-03, F-04, F-05, dan F-07 WAJIB merujuk ke repo yang relevan sebelum menulis kode baru. TradingView sengaja tidak dimasukkan (out of scope v1, lihat section 5).

#### A. Konektor MT5 (untuk F-02 & F-03)

| No | Nama Repo | Link | Lisensi | Status Wajib | Rekomendasi Penggunaan |
|----|-------------|--------|-----------|----------------|----------------------------|
| 1  | khramkov/MQL5-JSON-API | github.com/khramkov/MQL5-JSON-API | GPL-3.0 | **WAJIB** — basis utama EA | Jadikan basis pola untuk EA kita: struktur `WebRequest()`, cara baca order history & open position dari `CTrade`/`HistorySelect`, format JSON payload. **Tidak boleh clone/copy-paste mentah** karena GPL-3.0 mewajibkan kode turunan ikut open source dengan lisensi sama — tulis ulang logikanya dengan gaya sendiri (clean-room), tapi pola arsitekturnya WAJIB dipakai sebagai referensi utama supaya tidak reinventing the wheel |
| 2  | TheSnowGuru/PyTrader-python-mt4-mt5-trading-api-connector-drag-n-drop | github.com/TheSnowGuru/PyTrader-python-mt4-mt5-trading-api-connector-drag-n-drop | Cek LICENSE di repo (ada komponen berbayar) | Wajib dipelajari | Rujukan wajib untuk pola "EA sebagai server lokal" — pelajari cara EA jalan background & berkomunikasi keluar tanpa mengganggu trading user. Jangan clone (ada bagian berlisensi) |
| 3  | devcartel/pymt5 | github.com/devcartel/pymt5 | Cek LICENSE di repo | Opsional | Referensi tambahan kalau butuh sisi gateway Python di masa depan |

#### B. Trading Journal (untuk F-04, F-05, F-07 — struktur fitur & UX)

| No | Nama Repo | Link | Lisensi | Status Wajib | Rekomendasi Penggunaan |
|----|-------------|--------|-----------|----------------|----------------------------|
| 4  | Eleven-Trading/TradeNote | github.com/Eleven-Trading/TradeNote | Cek LICENSE di repo sebelum reuse kode | **WAJIB** — basis referensi UX & fitur | Stack beda (Vue.js + Parse), jadi TIDAK di-clone langsung. Tapi WAJIB dipakai sebagai acuan struktur fitur: kalender bulanan, jurnal harian, mistake tags, anotasi screenshot, filter multi-kriteria. Sprint S-03 & S-04 wajib "menengok" pola UX repo ini sebelum desain final |
| 5  | janzofx/Trading_Journal | github.com/janzofx/Trading_Journal | Cek LICENSE di repo sebelum reuse kode | **WAJIB** — basis parsing data MT5 | Desktop app Java, tapi WAJIB dipelajari untuk pola import generik dari MT5 dan kalkulasi analitik (equity curve, profit factor, SQN) — logika kalkulasinya bisa ditranslasi ke TypeScript untuk backend kita di Sprint S-08 |

> **Catatan penting soal lisensi:** karena beberapa repo di atas berlisensi GPL-3.0 atau belum jelas lisensinya, "wajib pakai" di sini artinya **wajib jadi rujukan pola/arsitektur/logika**, BUKAN wajib copy-paste kode mentah. Tulis ulang implementasi dengan gaya sendiri (clean-room) supaya aplikasi kita tidak otomatis terikat kewajiban lisensi GPL. Ini tetap jauh lebih cepat dibanding mulai dari nol karena kita tidak perlu riset ulang cara MT5 `WebRequest()` bekerja atau struktur fitur jurnal yang ideal.

---

## BAGIAN IX — SPRINT BACKLOG (SIAP PAKAI)

### 25. Ringkasan Sprint

**Fase 1 — Fondasi & UI Shell**

| Sprint | Nama                                | SOT yang dirujuk                                 | Estimasi |
|----------|---------------------------------------|------------------------------------------------------|------------|
| S-00     | Setup & Design System                 | Design System (section 9), Navigasi (section 6)       | 1 hari     |
| S-01     | UI Auth (static)                      | F-01, Flow F-01 (implisit), Komponen Form              | 1 hari     |
| S-02     | UI Hubungkan MT5 (static)             | F-02, Flow F-02, Komponen Status Koneksi                | 1-2 hari   |
| S-03     | UI Riwayat Trade & Detail/Jurnal (static) | F-04, F-07, Flow F-04, Schema trades & trade_journal | 2 hari     |
| S-04     | UI Dashboard Analitik (static)        | F-05, Design System chart                              | 1-2 hari   |

**Fase 2 — Backend & Integrasi**

| Sprint | Nama                                     | SOT yang dirujuk                              | Estimasi |
|----------|---------------------------------------------|----------------------------------------------------|------------|
| S-05     | Backend Auth + Integrasi UI                 | F-01, Schema users                                    | 1 hari     |
| S-06     | Backend Hubungkan MT5 + EA (Sequence F-02)  | F-02, Sequence F-02, Schema mt5_connections           | 2 hari     |
| S-07     | Backend Sync Trade + Jurnal + Integrasi     | F-03, F-04, Sequence F-03/F-04, Schema trades         | 2-3 hari   |
| S-08     | Backend Dashboard Analitik + Integrasi      | F-05, kalkulasi statistik                              | 1-2 hari   |

**Fase 3 — Polish & Deploy**

| Sprint | Nama        | SOT yang dirujuk              | Estimasi |
|----------|---------------|------------------------------------|------------|
| S-09     | Polish & QA   | TC semua, Design System, NF          | 1-2 hari   |

---

### 26. Sprint Detail + Prompt Siap Pakai

---

#### SPRINT S-00 — Setup & Design System Shell

**Tujuan:** Project bisa dijalankan di browser, semua komponen dasar UI sudah ada dan konsisten secara visual di mobile.

**Task list:**
- [ ] Inisialisasi Next.js + TypeScript + Tailwind
- [ ] Setup folder structure sesuai section 16
- [ ] Implementasi token warna, font, spacing dari Design System (section 8) sebagai CSS variables — support dark & light theme
- [ ] Buat komponen dasar: Button (semua variant & state), Input, Form, Toast, Modal, Badge Status Koneksi
- [ ] Pastikan semua komponen responsive dari 375px
- [ ] Setup routing dasar untuk semua halaman di section 6 (masih placeholder)

**SOT yang dirujuk:** Design System (section 8 & 9), Navigasi (section 6), Naming (section 17), Coding standard (section 18)

**Acceptance criteria:**
- [ ] Project jalan tanpa error di browser
- [ ] Semua komponen dasar tampil benar di 375px
- [ ] Toggle dark/light theme berfungsi dan konsisten
- [ ] Semua route bisa diakses

**Prompt untuk Claude — Sprint S-00:**
```
Kita mulai Sprint S-00: Setup & Design System Shell untuk aplikasi
"Catatan Harian Trader" (trading journal forex dengan auto-sync MT5).
Sprint ini khusus fondasi frontend — belum menyentuh backend sama sekali.

⚠️ PRINSIP SPRINT INI:
- Mobile-first: semua komponen harus berjalan baik di viewport 375px terlebih dahulu
- Gunakan skill yang relevan dengan pekerjaan ini (frontend component, styling, routing)

Konteks project:
- Nama: Catatan Harian Trader
- Tech stack: Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- Platform: Web app, mobile-first, harus support dark & light theme

Yang perlu dibangun:

1. Inisialisasi project dengan struktur folder berikut:
   [paste section 16 — Project Structure]

2. Setup Design System — implementasikan sebagai CSS variables/theme config:
   [paste section 8 — Visual Identity lengkap, dark & light theme]

3. Buat komponen dasar berikut (mobile-first, mulai dari 375px):
   [paste section 9 — semua komponen: Button, Input, Form, Status Koneksi MT5, Feedback, Loading]

4. Setup routing untuk semua halaman berikut (boleh masih placeholder):
   [paste section 6 — Struktur Navigasi]

5. Cek semua komponen di viewport mobile (375px) sebelum lanjut, termasuk toggle dark/light theme.

Standar kode:
- Naming: [paste section 17]
- Standard: [paste section 18]

Mulai dari langkah 1. Tunjukkan hasil tiap langkah sebelum lanjut ke berikutnya.
Di akhir sprint, tampilkan semua komponen dalam satu halaman preview sederhana.
```

---

#### SPRINT S-01 — UI Auth (Static)

**Tujuan:** Halaman login & register tampil sempurna di mobile dengan semua state form, pakai data dummy dulu.

**Task list:**
- [ ] Halaman Login & Register, layout mobile-first
- [ ] Semua state form (default, focus, error, loading, success)
- [ ] Validasi client-side (format email, panjang password)
- [ ] Simulasi flow: input dummy → loading → redirect ke dashboard placeholder
- [ ] Simulasi error: kredensial salah → pesan error tampil benar

**SOT yang dirujuk:** F-01 (section 3), Komponen Form (section 9), Design System (section 8)

**Prompt untuk Claude — Sprint S-01:**
```
Kita mulai Sprint S-01: UI Auth (Static / Frontend Only) untuk Catatan Harian Trader.
Sprint S-00 sudah selesai. Sprint ini membangun halaman Login & Register secara visual,
BELUM terhubung ke backend/Supabase.

⚠️ PRINSIP SPRINT INI:
- Mobile-first: mulai dari layout 375px
- Gunakan skill yang relevan dengan pekerjaan ini (form handling, UI state, routing)
- Gunakan data dummy untuk simulasi flow, jangan setup Supabase dulu

Requirement UI yang harus dipenuhi (F-01):
[paste bagian UI & validasi dari SRS F-01 section 3]

Komponen yang dipakai (sudah ada dari S-00):
[paste komponen Input, Button, Form, Toast dari section 9]

Behavior yang harus terlihat:
- Email kosong/format salah → inline error
- Password < 8 karakter → inline error
- Submit valid → loading state di tombol → simulasi redirect ke /dashboard
- Simulasi "email/password salah" → toast error muncul

Standar:
- Tap target minimal 44x44px
- Token Design System dipakai konsisten, tidak ada hardcoded value
- Naming: [paste section 17]

Tunjukkan hasil di 375px dulu, lalu tambahkan responsive untuk 768px+.
```

---

#### SPRINT S-02 — UI Hubungkan MT5 (Static)

**Tujuan:** Halaman "Hubungkan MT5" tampil lengkap — generate token dummy, instruksi install EA, status koneksi (semua state), pakai data dummy.

**Task list:**
- [ ] Halaman daftar koneksi (kosong/ada isi)
- [ ] Modal/halaman "Buat Koneksi Baru" — tampilkan token dummy + instruksi
- [ ] Komponen Status Koneksi: Pending, Connected, Error (semua state visual)
- [ ] Tombol "Sync Sekarang" (simulasi, belum ada API)
- [ ] Empty state kalau belum ada koneksi

**SOT yang dirujuk:** F-02 (section 3), Flow F-02 (section 11), Komponen Status Koneksi (section 9)

**Prompt untuk Claude — Sprint S-02:**
```
Kita mulai Sprint S-02: UI Hubungkan MT5 (Static / Frontend Only) untuk Catatan Harian Trader.
Sprint S-00 dan S-01 sudah selesai. Sprint ini membangun UI untuk fitur paling penting
di aplikasi ini — masih pakai data dummy, belum ada API/EA sungguhan.

⚠️ PRINSIP SPRINT INI:
- Mobile-first, layout 375px dulu
- Gunakan skill yang relevan dengan pekerjaan ini (form, status indicator, modal)
- Data dummy realistis: nomor akun MT5, nama broker, waktu sync terakhir

Requirement UI (F-02):
[paste bagian UI dari SRS F-02 section 3]

Alur yang disimulasikan:
[paste Flow F-02 dari section 11]

Komponen Status Koneksi yang harus ada (section 9):
- Connected: badge hijau, waktu sync terakhir
- Pending: badge kuning, instruksi lanjutan
- Error: badge merah, pesan error spesifik + tombol bantuan

Halaman yang dibangun:
1. Daftar koneksi MT5 (list kartu, tiap kartu = 1 koneksi dengan status)
2. Empty state kalau belum ada koneksi sama sekali
3. Flow "Buat Koneksi Baru" → tampilkan token dummy + instruksi cara install EA + copy button
4. Tombol "Sync Sekarang" per koneksi (simulasi delay, lalu update "waktu sync terakhir")

Standar:
- Tap target minimal 44x44px
- Token Design System (section 8)
- Naming: [paste section 17]

Tunjukkan di 375px dulu, lalu 768px+.
```

---

#### SPRINT S-03 — UI Riwayat Trade & Detail/Jurnal (Static)

**Tujuan:** List trade dengan filter, dan halaman detail trade + form jurnal lengkap — data dummy.

**Task list:**
- [ ] Halaman Riwayat Trade: list dengan status "Lengkap"/"Belum Lengkap"
- [ ] Filter: tanggal, simbol, strategi, hasil
- [ ] Halaman Detail Trade: data read-only (dari MT5) + form jurnal (editable)
- [ ] Semua state form jurnal (mood selector, tag strategi, upload screenshot dummy)
- [ ] Loading/empty/error state untuk list

**SOT yang dirujuk:** F-04, F-07 (section 3), Flow F-04 (section 11), Schema trades & trade_journal (section 7)

**Prompt untuk Claude — Sprint S-03:**
```
Kita mulai Sprint S-03: UI Riwayat Trade & Detail/Jurnal (Static) untuk Catatan Harian Trader.
Sprint sebelumnya sudah selesai. Sprint ini membangun UI paling kompleks — list trade
dan form jurnal — masih dengan data dummy yang realistis.

⚠️ PRINSIP SPRINT INI:
- Mobile-first, layout 375px dulu
- Gunakan skill yang relevan dengan pekerjaan ini (list, filter, form kompleks)
- Data dummy harus sesuai shape schema berikut:
  [paste schema trades & trade_journal dari section 7]

⚠️ WAJIB PAKAI REFERENSI REPO (section 24-B):
- Pelajari pola UX `Eleven-Trading/TradeNote` (github.com/Eleven-Trading/TradeNote) untuk
  struktur jurnal harian, mistake tags, dan anotasi screenshot — adaptasi pola ini ke Design
  System kita (section 8-9), JANGAN tiru styling-nya mentah-mentah, cukup struktur & UX flow-nya.
- Pelajari `janzofx/Trading_Journal` (github.com/janzofx/Trading_Journal) untuk pola tampilan
  hasil import MT5 generik (kolom apa yang ditampilkan read-only vs editable).

Requirement UI (F-04 & F-07):
[paste bagian UI dari SRS F-04 dan F-07 section 3]

Alur yang disimulasikan:
[paste Flow F-04 dari section 11]

Halaman 1 — Riwayat Trade:
- List trade (5-10 dummy), tiap item tampilkan symbol, arah, PnL, status jurnal
- Filter: tanggal, simbol, strategi, hasil (profit/loss)
- State: loading (skeleton), empty, populated

Halaman 2 — Detail Trade:
- Bagian atas: data read-only dari MT5 (symbol, arah, harga, waktu, PnL, SL/TP)
- Bagian bawah: form jurnal editable
  [paste komponen form dari section 9]
  Field: alasan entry, mood, strategi (tag, bisa custom), disiplin, lesson learned,
  risk %, planned vs actual R:R, self-grade A-F, upload screenshot (dummy)

Standar:
- Tap target minimal 44x44px
- Token Design System (section 8)
- Naming: [paste section 17]

Tunjukkan di 375px dulu, lalu 768px+.
```

---

#### SPRINT S-04 — UI Dashboard Analitik (Static)

**Tujuan:** Dashboard statistik lengkap (kartu ringkasan, kalender, grafik mingguan, tabel per simbol) — data dummy.

**Task list:**
- [ ] Kartu ringkasan: Total PnL, Total Trades, Win Rate, Profit Factor, Avg R:R (dengan perbandingan periode sebelumnya)
- [ ] Kalender bulanan dengan PnL harian berwarna
- [ ] Bar chart performa mingguan (Recharts)
- [ ] Tabel performa per simbol/strategi
- [ ] Ringkasan: best/worst day, streak

**SOT yang dirujuk:** F-05 (section 3), Design System (section 8)

**Prompt untuk Claude — Sprint S-04:**
```
Kita mulai Sprint S-04: UI Dashboard Analitik (Static) untuk Catatan Harian Trader.
Sprint ini membangun dashboard statistik utama — masih data dummy, belum ada kalkulasi
dari data trade sungguhan.

⚠️ PRINSIP SPRINT INI:
- Mobile-first: kartu bertumpuk 1 kolom di 375px, grid di desktop
- Gunakan skill yang relevan dengan pekerjaan ini (chart/Recharts, layout grid, kalender)
- Gunakan Recharts untuk bar chart

Requirement UI (F-05):
[paste bagian UI dari SRS F-05 section 3]

Elemen yang dibangun:
1. Kartu ringkasan (5 kartu): Total PnL, Total Trades, Win Rate, Profit Factor, Avg R:R
   — tiap kartu tampilkan angka + perbandingan vs periode sebelumnya (naik/turun %)
2. Kalender bulanan: grid 7 kolom, tiap tanggal tampilkan PnL harian, warna hijau/merah
3. Bar chart performa per minggu (5 minggu dalam bulan berjalan)
4. Tabel performa per simbol/strategi: trades, wins, losses, win rate, PnL
5. Ringkasan: best day, worst day, most trades day, max win streak, max loss streak

Data dummy harus realistis (angka PnL, win rate yang masuk akal untuk forex trader).

Standar:
- Token Design System (section 8), termasuk warna profit/loss
- Naming: [paste section 17]

Tunjukkan di 375px dulu, lalu 768px+.
```

---

#### SPRINT S-05 — Backend Auth + Integrasi

**Tujuan:** Auth berjalan dengan Supabase — login/register/logout pakai data nyata.

**Task list:**
- [ ] Setup project Supabase, aktifkan Auth (email/password)
- [ ] Buat tabel `users` (profil tambahan) + trigger otomatis saat user baru daftar
- [ ] Sambungkan halaman Login & Register (dari S-01) ke Supabase Auth nyata
- [ ] Route guard: halaman private redirect ke login jika belum ada sesi

**SOT yang dirujuk:** F-01 (section 3), Schema users (section 7), Error handling (section 19)

**Prompt untuk Claude — Sprint S-05:**
```
Kita mulai Sprint S-05: Backend Auth + Integrasi untuk Catatan Harian Trader.
UI Auth sudah selesai di S-01 dengan data dummy. Sekarang sambungkan ke Supabase Auth.

⚠️ PRINSIP SPRINT INI:
- Gunakan skill yang relevan dengan pekerjaan ini (Supabase setup, auth, database)
- Jangan ubah tampilan UI dari S-01 — hanya sambungkan datanya

1. Setup Supabase project & buat tabel profil:
   [paste schema users dari section 7]

2. Sambungkan halaman Login & Register (S-01) ke Supabase Auth:
   - Ganti semua simulasi dummy dengan pemanggilan Supabase Auth nyata
   - Pastikan semua state UI (loading, error, success) tetap berjalan
   - Setelah register sukses, buat baris di tabel users otomatis (trigger atau server action)

3. Implementasi route guard untuk semua halaman private.

Requirement lengkap (F-01):
[paste SRS F-01 dari section 3]

Format error: [paste section 19]
Standar: Naming [paste section 17], Coding standard [paste section 18]

Mulai dari setup Supabase. Tunjukkan hasil tiap langkah sebelum lanjut.
```

---

#### SPRINT S-06 — Backend Hubungkan MT5 + EA

**Tujuan:** User bisa benar-benar generate token, EA (MQL5) berhasil handshake dan status koneksi update real.

**Task list:**
- [ ] Migration schema `mt5_connections`
- [ ] Endpoint `POST /api/mt5/connections` (generate token, hash, simpan)
- [ ] Endpoint `POST /api/mt5/handshake` (validasi token, update status connected)
- [ ] Tulis file EA dasar (.mq5) yang melakukan handshake pakai `WebRequest()`
- [ ] Sambungkan UI S-02 ke API nyata
- [ ] Endpoint revoke koneksi

**SOT yang dirujuk:** F-02 (section 3), Sequence F-02 (section 13), Schema mt5_connections (section 7)

**Prompt untuk Claude — Sprint S-06:**
```
Kita mulai Sprint S-06: Backend Hubungkan MT5 + EA untuk Catatan Harian Trader.
UI sudah selesai di S-02. Ini sprint paling krusial — koneksi ke MT5 harus benar-benar jalan.

⚠️ PRINSIP SPRINT INI:
- Gunakan skill yang relevan dengan pekerjaan ini (API route, keamanan token, MQL5)
- Token TIDAK BOLEH disimpan plain text — wajib di-hash
- Ikuti sequence diagram persis:
  [paste Sequence F-02 dari section 13]

⚠️ WAJIB PAKAI REFERENSI REPO (section 24-A) — JANGAN reinvent dari nol:
- Pelajari struktur `khramkov/MQL5-JSON-API` (github.com/khramkov/MQL5-JSON-API) untuk pola
  `WebRequest()`, cara baca order history (`HistorySelect`) & open position dari MQL5.
  Ini GPL-3.0, jadi TULIS ULANG logikanya dengan gaya sendiri — jangan copy-paste mentah —
  tapi WAJIB pakai pola arsitekturnya sebagai basis biar tidak riset dari nol.
- Pelajari `TheSnowGuru/PyTrader-python-mt4-mt5-trading-api-connector-drag-n-drop` untuk pola
  "EA berjalan sebagai proses background tanpa mengganggu trading user".
- Kalau kamu (Claude) familiar dengan struktur kedua repo ini dari pengetahuanmu, langsung
  terapkan polanya. Kalau tidak yakin detail sintaks MQL5-nya, jelaskan asumsi yang diambil.

1. Migration schema:
   [paste schema mt5_connections dari section 7]

2. Endpoint API:
   - POST /api/mt5/connections → generate token, hash, simpan status 'pending'
   - POST /api/mt5/handshake → terima { token, account_number, broker }, validasi hash,
     update status jadi 'connected'
   - DELETE /api/mt5/connections/{id} → revoke, token langsung invalid

3. Buat file EA dasar (.mq5):
   - Terima parameter input: API token
   - Saat pertama kali attach ke chart, kirim POST handshake ke endpoint kita
   - Log hasil handshake di jendela Experts MT5

4. Sambungkan UI (S-02) ke API nyata — hapus semua dummy.

Requirement lengkap (F-02):
[paste SRS F-02 dari section 3]

Format error: [paste section 19]
Standar: [paste section 17 & 18]

Mulai dari migration → API → EA → sambungkan ke UI. Tunjukkan tiap langkah.
```

---

#### SPRINT S-07 — Backend Sync Trade + Jurnal + Integrasi

**Tujuan:** EA mengirim data trade sungguhan, tersimpan di database, dan user bisa mengisi jurnal untuk data asli.

**Task list:**
- [ ] Migration schema `trades`, `trade_journal`, `strategies`, `mistake_tags`, pivot tables
- [ ] Endpoint `POST /api/mt5/sync` (terima array trade dari EA, validasi, upsert idempotent)
- [ ] Update EA: baca history & open position, kirim berkala ke endpoint sync
- [ ] Endpoint `GET /api/trades` (dengan filter)
- [ ] Endpoint `PUT /api/trades/{id}/journal`
- [ ] Sambungkan UI S-03 ke API nyata

**SOT yang dirujuk:** F-03, F-04 (section 3), Sequence F-03/F-04 (section 13), Schema trades & trade_journal (section 7)

**Prompt untuk Claude — Sprint S-07:**
```
Kita mulai Sprint S-07: Backend Sync Trade + Jurnal untuk Catatan Harian Trader.
UI sudah selesai di S-03. EA sudah bisa handshake dari S-06. Sekarang EA kirim data trade
sungguhan, dan user bisa isi jurnal untuk trade asli.

⚠️ PRINSIP SPRINT INI:
- Gunakan skill yang relevan dengan pekerjaan ini (API route, MQL5, validasi data)
- Sync harus idempotent — trade yang sama tidak boleh dobel (unique by mt5_ticket_id)
- Ikuti sequence diagram:
  [paste Sequence F-03 dan F-04 dari section 13]

1. Migration schema:
   [paste schema trades, trade_journal, strategies, mistake_tags dari section 7]

2. Endpoint sync:
   - POST /api/mt5/sync → terima array trade, validasi tiap payload, UPSERT
     berdasarkan (mt5_connection_id, mt5_ticket_id)
   - Update mt5_connections.last_synced_at setiap sync berhasil

3. Update EA (.mq5):
   - Baca closed trade history & open position
   - Kirim berkala (misal tiap 60-120 detik) ke endpoint sync
   - Handle response error dengan jelas di log Experts

4. Endpoint trade:
   - GET /api/trades (dengan query filter: tanggal, simbol, strategi, hasil)
   - PUT /api/trades/{id}/journal (simpan data kualitatif)

5. Sambungkan UI (S-03) ke API nyata — hapus semua dummy, tetap jaga semua state UI.

Requirement lengkap (F-03 & F-04):
[paste SRS F-03 dan F-04 dari section 3]

Format error: [paste section 19]
Standar: [paste section 17 & 18]

Mulai dari migration → endpoint sync → update EA → endpoint jurnal → sambungkan UI.
```

---

#### SPRINT S-08 — Backend Dashboard Analitik + Integrasi

**Tujuan:** Dashboard menampilkan statistik nyata hasil kalkulasi dari data trade di database.

**Task list:**
- [ ] Endpoint/kalkulasi: Total PnL, Win Rate, Profit Factor, Avg R:R per periode
- [ ] Endpoint kalender harian & performa mingguan
- [ ] Endpoint performa per simbol/strategi
- [ ] Sambungkan UI S-04 ke API nyata

**SOT yang dirujuk:** F-05 (section 3)

**Prompt untuk Claude — Sprint S-08:**
```
Kita mulai Sprint S-08: Backend Dashboard Analitik untuk Catatan Harian Trader.
UI sudah selesai di S-04. Sekarang hitung statistik dari data trade sungguhan.

⚠️ PRINSIP SPRINT INI:
- Gunakan skill yang relevan dengan pekerjaan ini (kalkulasi statistik, query database)
- Semua kalkulasi (win rate, profit factor, dll) wajib ada unit test

⚠️ WAJIB PAKAI REFERENSI REPO (section 24-B):
- Pelajari cara `janzofx/Trading_Journal` (github.com/janzofx/Trading_Journal) menghitung
  Equity Curve, Profit Factor, dan SQN — translasikan logikanya ke TypeScript untuk backend kita.

Requirement lengkap (F-05):
[paste SRS F-05 dari section 3]

Endpoint yang dibuat:
1. GET /api/dashboard/summary?month=YYYY-MM
   → Total PnL, Total Trades, Win Rate, Profit Factor, Avg R:R
   → Bandingkan dengan bulan sebelumnya (persentase naik/turun)
2. GET /api/dashboard/calendar?month=YYYY-MM
   → PnL per hari dalam bulan tersebut
3. GET /api/dashboard/weekly?month=YYYY-MM
   → PnL per minggu dalam bulan tersebut
4. GET /api/dashboard/by-symbol?month=YYYY-MM
   → Trades, wins, losses, win rate, PnL per simbol/strategi
5. GET /api/dashboard/highlights?month=YYYY-MM
   → Best day, worst day, most trades day, max win/loss streak

Sambungkan UI (S-04) ke semua endpoint ini — hapus data dummy.

Standar: [paste section 17 & 18]

Tunjukkan hasil tiap endpoint sebelum sambungkan ke UI.
```

---

#### SPRINT S-09 — Polish & QA

**Tujuan:** Semua fitur dipoles, bug diperbaiki, siap demo atau deploy.

**Task list:**
- [ ] Jalankan semua test case (section 23)
- [ ] Cek konsistensi UI di mobile (375px) untuk semua halaman, dark & light theme
- [ ] Cek semua edge case & error state (section 12), khususnya status sync MT5
- [ ] Audit dependency dengan `npm audit`
- [ ] Cek performa mobile (NF-01) — Lighthouse
- [ ] Review security checklist (section 21), pastikan token MT5 memang ter-hash
- [ ] Siapkan environment variable production
- [ ] Deploy ke Vercel + Supabase production

**Prompt untuk Claude — Sprint S-09:**
```
Kita masuk Sprint S-09: Polish & QA untuk Catatan Harian Trader.
Semua fitur sudah dibangun dan terintegrasi. Sekarang pastikan semuanya solid,
terutama soal keamanan token MT5 dan kejelasan status sync.

⚠️ PRINSIP SPRINT INI:
- Gunakan skill yang relevan dengan pekerjaan ini (testing, audit, performance, deployment)
- Cek mobile-first: semua halaman diverifikasi di 375px, dark & light theme
- Prioritaskan test untuk skenario EA error/offline — ini ketakutan utama user (NF-04)

1. Mobile & theme UI audit — cek semua halaman di 375px, dark & light theme.

2. Jalankan test case:
   [paste semua TC dari section 23]

3. Cek semua edge case global, fokus ke status koneksi MT5:
   [paste section 12]

4. Security checklist, verifikasi token MT5 di-hash dan tidak pernah ter-log:
   [paste section 21]

5. Performa (NF-01):
   [paste NF-01 dari section 4]

6. Dependency audit: jalankan `npm audit`, perbaiki vulnerability.

Laporkan temuan per kategori, perbaiki langsung, tunjukkan perubahannya sebelum lanjut.
Setelah bersih, siapkan deploy ke Vercel (frontend+API) dan Supabase (database) production.
```

---

## BAGIAN X — PENUTUP

### 27. Assumptions & Open Questions

#### Asumsi yang Diambil
- [ ] EA berjalan di MT5 desktop (Windows/VPS), bukan MT5 mobile — karena `WebRequest()` hanya tersedia penuh di MT5 desktop
- [ ] User trading di broker yang mengizinkan Expert Advisor & koneksi WebRequest keluar (perlu ditambahkan domain aplikasi ke allowlist di MT5)
- [ ] Satu user bisa punya lebih dari satu koneksi MT5 (misal beberapa akun broker), ditampilkan terpisah di v1
- [ ] Repo referensi wajib di section 24 dipakai sebagai **pola/arsitektur**, bukan copy-paste kode mentah — terutama `khramkov/MQL5-JSON-API` yang berlisensi GPL-3.0. Kalau di kemudian hari ternyata butuh reuse kode secara langsung (bukan cuma pola), perlu evaluasi ulang kewajiban lisensi GPL (source code turunan wajib open source juga)

#### Open Questions
- [ ] Apakah user butuh export data jurnal (PDF/Excel) di v1, atau bisa nyusul v2?
- [ ] Apakah perlu batas jumlah koneksi MT5 per user di free tier (menjaga biaya server)?
- [ ] Interval ideal EA mengirim data (60 detik? 120 detik?) — perlu uji coba langsung untuk menyeimbangkan "cukup update" vs "tidak membebani server"

---

### 28. Cara Pakai Dokumen Ini

```
WORKFLOW VIBE CODING DENGAN PRD INI:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRINSIP YANG SELALU BERLAKU
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. FRONTEND-FIRST
   Fase 1 (S-00 s/d S-04): semua UI dengan data dummy
   Fase 2 (S-05 s/d S-08): backend + sambungkan ke UI
   Fase 3 (S-09): polish & deploy

2. MOBILE-FIRST
   Setiap sprint yang menyentuh UI wajib dimulai dari 375px,
   dan wajib dicek di dark & light theme.

3. SKILL REMINDER
   Setiap prompt sprint sudah mengandung perintah
   "Gunakan skill yang relevan dengan pekerjaan ini."
   Jangan hapus baris ini saat copy-paste prompt.

4. KEAMANAN MT5 ADALAH PRIORITAS
   Setiap sprint yang menyentuh token/koneksi MT5 (S-02, S-06)
   wajib dicek ulang: token tidak pernah disimpan plain text,
   dan kredensial broker tidak pernah diminta ke user.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CARA PAKAI PER SPRINT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. SEBELUM MULAI SPRINT
   Buka section SOT yang relevan sesuai tabel di section 25-26.

2. SAAT MULAI SPRINT
   Copy prompt dari section 26, isi semua [kurung kotak]
   dengan konten dari section yang dirujuk. Paste ke Claude
   sebagai pesan pertama di sesi baru.

3. SELAMA SPRINT
   Jika Claude "lupa konteks" → paste ulang section yang relevan saja.
   Format: "Ini konteks F-02 yang perlu kamu ingat: [paste section 3 F-02]"

4. SETELAH SPRINT SELESAI
   Update status di SRS Index (section 2): Planned → In Progress → Done
   Catat jika ada deviasi dari spec → update PRD dulu.

5. PRINSIP UTAMA
   PRD = satu-satunya sumber kebenaran.
   Kalau ada keputusan teknis yang berubah → update PRD dulu, baru lanjut coding.
```

---

*PRD ini dibuat dengan PRD Generator v4 — dengan integrasi SOT & Sprint Planning.*
*Output ini adalah file `catatan-harian-trader-prd.md` — simpan di root folder project.*
