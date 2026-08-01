# 📈 Catatan Harian Trader

**Catatan Harian Trader** adalah aplikasi web jurnal trading forex modern berbasis **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, dan **Supabase**. Aplikasi ini terintegrasi secara otomatis dengan **MetaTrader 5 (MT5)** melalui Expert Advisor (EA) MQL5 custom.

![Catatan Harian Trader Logo](./public/logo.png)

---

## ✨ Fitur Utama

- 🔄 **Otomatisasi Sync MetaTrader 5 (MT5)**: EA MQL5 v2.0 yang secara periodik (setiap 120 detik) mengirim data posisi terbuka & closed deals dari MT5 ke server backend via WebRequest.
- 🔐 **Sistem Keamanan API Token**: Generate token API 64-karakter dengan enkripsi SHA-256 (token mentah hanya ditampilkan sekali, di-hash di database).
- 🛡️ **Batas Koneksi Akun**: Maksimal 3 koneksi akun MT5 per pengguna.
- 📊 **Dashboard Analitik Interaktif**:
  - **Stat Cards**: Total PnL, Total Trades, Win Rate %, Profit Factor, dan Average R:R (dilengkapi perbandingan vs bulan sebelumnya).
  - **PnL Calendar Grid**: Visualisasi kalender profit (hijau) & loss (merah) harian.
  - **Weekly Performance Chart**: Bar chart mingguan berbasis Recharts.
  - **Symbol Performance Table**: Ringkasan performa per instrumen/pasangan mata uang.
  - **Sorotan Rekor (Highlights)**: Hari terbaik, terburuk, streak kemenangan/kekalahan maks, dan hari terbanyak trade.
- ✍️ **Jurnal Kualitatif & Refleksi**:
  - Alasan entry, evaluasi mood (emoji), kedisiplinan (ikut rules / melanggar), lesson learned.
  - Penilaian mandiri (Self-Grade A-F), Risk %, R:R terencana vs aktual.
  - Tag strategi kustom & tag kesalahan (mistake tags).
  - Unggah screenshot chart ke Supabase Storage.
- ⚙️ **Pengaturan & Preferensi**:
  - Manajemen nama profil pengguna & ubah password.
  - Mode Gelap (Dark Mode) / Mode Terang (Light Mode) toggle.

---

## 🛠️ Teknologi & Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, React 19)
- **Bahasa**: TypeScript
- **Styling**: Tailwind CSS v4, Lucide React, Class Variance Authority
- **State & Query**: Zustand, TanStack React Query v5
- **Database & Auth**: Supabase (PostgreSQL, Row Level Security, Storage, Auth SSR)
- **Charts**: Recharts
- **Connector**: MetaTrader 5 MQL5 Expert Advisor (`CatatanHarianTrader.mq5`)

---

## 📁 Struktur Project

```text
catatan-harian-trader/
├── public/
│   └── ea/
│       └── CatatanHarianTrader.mq5   # Skrip EA MetaTrader 5 v2.0
├── src/
│   ├── app/
│   │   ├── (auth)/                   # Halaman Login & Register
│   │   ├── (main)/                   # Dashboard, Trades, MT5, Settings, Strategies
│   │   └── api/                      # REST API endpoints (MT5 sync, trades, journal, dashboard)
│   ├── components/
│   │   ├── shared/                   # Komponen Reusable (PnLCalendar, StatCard, Chart, dll)
│   │   └── ui/                       # Design system primitives (Button, Input, dll)
│   ├── services/supabase/            # Supabase client helpers (browser, server, middleware)
│   ├── store/                        # Zustand stores (theme, sidebar)
│   ├── types/                        # TypeScript types & interfaces
│   └── utils/                        # Pure utility functions (statistics, token hashing)
└── supabase/
    └── migrations/                   # SQL migration scripts (001, 002, 003)
```

---

## 🚀 Panduan Memulai (Local Setup)

### 1. Clone Repositori
```bash
git clone https://github.com/galang-pradhana/catatan-harian-trader.git
cd catatan-harian-trader
```

### 2. Install Dependensi
```bash
npm install
```

### 3. Konfigurasi Variabel Lingkungan (`.env.local`)
Buat file `.env.local` di root direktori project:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 4. Eksekusi Migration Supabase
Jalankan file SQL yang berada di folder `supabase/migrations/` di SQL Editor Supabase Dashboard Anda:
- `001_create_users_profile.sql`
- `002_create_mt5_connections.sql`
- `003_create_trades.sql`

Buat juga **Public Storage Bucket** bernama `trade-screenshots` di Supabase Storage.

### 5. Jalankan Development Server
```bash
npm run dev
```
Akses di browser: `http://localhost:3000`

---

## 🧪 Menjalankan Unit Test

Aplikasi dilengkapi dengan suite pengujian unit untuk keandalan kalkulasi statistik & enkripsi token MT5:

```bash
npm test
```

---

## 🌐 Panduan Deploy ke Vercel

1. Push repositori ke GitHub:
   ```bash
   git push -u origin main
   ```
2. Import repository di [Vercel Dashboard](https://vercel.com/new).
3. Masukkan variabel lingkungan `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, dan `SUPABASE_SERVICE_ROLE_KEY` di menu **Environment Variables**.
4. Klik **Deploy**.

---

## 📄 Lisensi
Hak Cipta © 2026 [Galang Pradhana](https://github.com/galang-pradhana). All rights reserved.
