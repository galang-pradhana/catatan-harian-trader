# PRD: Catatan Harian Trader — ADDENDUM V3 (Admin Panel & Freemium Readiness)
**Versi:** 3.0 (Addendum)
**Tanggal:** 2 Agustus 2026
**Status:** Draft
**Dokumen Terkait:** `catatan-harian-trader-prd.md` (V1), `catatan-harian-trader-prd-v2.md` (V2) — dokumen ini TIDAK menggantikan keduanya
**Solo Dev Mode:** Ya — admin panel ini HANYA diakses oleh 1 orang (owner/solo dev), bukan tim
**Konteks:** Dibuat setelah ditemukan gap — seluruh PRD V1/V2 dirancang dari sudut pandang user, belum ada sisi operasional buat pemilik aplikasi. Sekaligus menyiapkan fondasi freemium (rencana monetisasi setelah app terbukti stabil menampung ±1000 user).

---

## 0. Prinsip Scope

- **Sekarang dibangun:** user management, monitoring sistem, support tools, struktur data plan (free/premium)
- **BELUM dibangun sekarang:** payment gateway, billing invoice, upgrade/downgrade plan otomatis oleh user — ini nunggu app terbukti stabil di skala target
- **Prinsip privasi tetap berlaku:** admin (kamu) bisa lihat data operasional (status koneksi, error log, metadata akun), TAPI TIDAK BISA lihat isi jurnal trading, screenshot, atau catatan personal user manapun. Ini konsisten dengan keputusan di V1 (data user 100% privat, section 1).

---

## BAGIAN I — SRS (SOURCE OF TRUTH #1)

### 1. Overview

- **Nama Modul:** Admin Panel
- **Problem Statement:** Solo dev butuh cara mengelola user, memantau kesehatan sistem, dan membantu troubleshooting tanpa akses langsung ke database — sekaligus menyiapkan fondasi data untuk model freemium di masa depan.
- **Target User:** Owner aplikasi (kamu sendiri), 1 akun admin.
- **Platform:** Web, desktop-first (bukan mobile-first) — ini internal tool, dipakai dari laptop, prioritas beda dari app utama.
- **Constraint:** Tidak boleh membuka celah privasi — admin tidak pernah melihat konten jurnal/catatan/screenshot user.

---

### 2. SRS Index (lanjutan dari V1 & V2)

| ID     | Kategori   | Nama Requirement                              | Prioritas | Status  |
|--------|------------|--------------------------------------------------|-----------|---------|
| F-11   | Admin Auth | Login Admin & Kontrol Akses                       | Tinggi    | Planned |
| F-12   | Admin      | Manajemen User (lihat, cari, suspend, hapus)      | Tinggi    | Planned |
| F-13   | Admin      | Monitoring Kesehatan Sistem                        | Tinggi    | Planned |
| F-14   | Admin      | Support Tools (lihat status MT5 & error per user) | Sedang    | Planned |
| F-15   | Data       | Freemium Readiness (field plan & limit dasar)     | Sedang    | Planned |
| NF-07  | Keamanan   | Semua aksi admin tercatat di audit log            | Tinggi    | Planned |
| NF-08  | Privasi    | Admin tidak bisa akses konten jurnal/catatan user | Tinggi    | Planned |

---

### 3. SRS Functional Detail

#### F-11 — Login Admin & Kontrol Akses
- **Deskripsi:** Akses admin panel terpisah dari login user biasa, dengan proteksi ekstra karena privilege-nya tinggi.
- **Actor:** Admin (owner)
- **Main flow:**
  1. Owner buka `/admin/login` (route terpisah dari login user biasa)
  2. Login dengan email + password + verifikasi tambahan (rekomendasi: 2FA/OTP email, karena cuma 1 akun dan risikonya tinggi kalau bocor)
  3. Sistem cek `users.role = 'admin'` — kalau bukan admin, akses ditolak meski password benar
  4. Masuk ke Admin Dashboard
- **Alternative flow:**
  - User biasa coba akses `/admin/*` → redirect 403, TIDAK ada hint bahwa halaman admin itu ada (hindari leak informasi struktur sistem)
  - Gagal login 2FA berkali-kali → cooldown lebih ketat dibanding login user biasa (misal 3x percobaan lalu lockout 30 menit)
- **Validation rules:** Sama seperti F-01, ditambah verifikasi role & 2FA
- **Output:** Sesi admin aktif, terpisah dari sesi user biasa

---

#### F-12 — Manajemen User
- **Deskripsi:** Admin bisa melihat daftar semua user, mencari user tertentu, dan melakukan aksi dasar (suspend, hapus) kalau diperlukan.
- **Actor:** Admin
- **Main flow:**
  1. Admin buka halaman "Users"
  2. Lihat list: nama, email, tanggal daftar, status (aktif/suspended), plan (free/premium), jumlah koneksi MT5, terakhir aktif
  3. Cari user by email/nama
  4. Klik satu user → lihat detail (metadata akun, TIDAK termasuk isi jurnal)
  5. Admin bisa: Suspend (nonaktifkan sementara, user tidak bisa login), Hapus (permanen, dengan konfirmasi berlapis)
- **Alternative flow:**
  - Admin coba hapus akun sendiri (akun admin) → diblokir, tidak boleh
  - Suspend user yang sedang login → sesi mereka langsung invalid di request berikutnya
- **Validation rules:**
  - Aksi Hapus wajib re-autentikasi admin (masukkan password lagi) sebelum eksekusi — mencegah aksi tidak sengaja
- **Output:** Status user berubah, tercatat di audit log (NF-07)

---

#### F-13 — Monitoring Kesehatan Sistem
- **Deskripsi:** Dashboard metrik operasional — bantu admin tahu kondisi sistem secara keseluruhan, termasuk validasi kesiapan skala (target 1000 user).
- **Actor:** Admin
- **Main flow:**
  1. Admin buka Admin Dashboard
  2. Lihat metrik: Total User, User Aktif (7 hari/30 hari terakhir), Signup baru per hari/minggu, Total Koneksi MT5 aktif, Persentase koneksi MT5 berstatus "Error", Total trade tersinkron, Rata-rata waktu load (kalau ada instrumentasi)
  3. Grafik tren signup & aktivitas dari waktu ke waktu
- **Alternative flow:**
  - Data belum cukup (aplikasi baru jalan) → tampilkan apa adanya, tidak perlu grafik palsu
- **Output:** Gambaran kesehatan sistem yang bisa dipakai buat keputusan "sudah siap buka fitur premium belum"

---

#### F-14 — Support Tools
- **Deskripsi:** Kalau ada user yang komplain (misal via email), admin bisa cek status teknis akun mereka tanpa melihat data privat.
- **Actor:** Admin
- **Main flow:**
  1. Admin cari user (dari F-12)
  2. Buka tab "Status Teknis" di detail user: status koneksi MT5, waktu sync terakhir, riwayat error (`last_error` dari `mt5_connections`, lihat V1 section 7), jumlah trade tersinkron
  3. Admin bisa bantu diagnosa masalah berdasarkan data ini
- **Batasan tegas:** Tab ini TIDAK menampilkan: isi jurnal, mood, catatan, screenshot, atau data kualitatif lain milik user — hanya metadata teknis
- **Output:** Admin bisa bantu troubleshoot tanpa melanggar privasi

---

#### F-15 — Freemium Readiness
- **Deskripsi:** Menyiapkan struktur data supaya nanti gampang aktifkan model freemium, tanpa membangun billing system dulu.
- **Actor:** Sistem
- **Main flow:**
  1. Tambah field `plan` di tabel `users` (default: `free`)
  2. Definisikan batasan dasar per plan di level konstanta aplikasi (BUKAN tabel database dulu, supaya simpel) — contoh kandidat limit: jumlah koneksi MT5 (misal free = 1, premium = unlimited), riwayat data yang bisa diakses (misal free = 3 bulan terakhir, premium = semua riwayat)
  3. Admin bisa manual ubah `plan` seorang user dari `free` ke `premium` (dan sebaliknya) — INI JALUR SEMENTARA sebelum ada payment gateway beneran
- **Alternative flow:**
  - User mencoba aksi yang melebihi limit plan free → tampilkan pesan "Upgrade ke Premium" (UI-nya sudah ada dari mockup) alih-alih error teknis
- **Output:** Aplikasi siap dipasangi payment gateway nanti tanpa perlu restrukturisasi data besar-besaran

---

### 4. Non-Functional Requirements (tambahan)

| ID    | Requirement | Target                                             | Cara Ukur                              |
|-------|--------------|-------------------------------------------------------|--------------------------------------------|
| NF-07 | Auditability | 100% aksi admin (suspend, hapus, ubah plan) tercatat  | Cek tabel `admin_audit_log` setiap aksi dilakukan |
| NF-08 | Privasi      | Admin panel tidak punya endpoint/UI yang expose konten jurnal/catatan | Code review + test khusus (lihat QA section 23) |

---

### 5. Out of Scope (v3, ditunda ke fase berikutnya)

- Payment gateway & billing invoice (Midtrans/Stripe/dll) — ditunda sampai app siap skala 1000 user
- Upgrade/downgrade plan otomatis oleh user sendiri (self-service) — v3 masih manual by admin
- Tim admin dengan multiple role (owner/support/dst) — v3 cuma 1 akun admin
- Notifikasi otomatis ke user saat plan mereka diubah admin — bisa manual dulu (email langsung)
- A/B testing atau feature flag granular per user — cukup plan-level dulu

---

## BAGIAN II — INFORMATION ARCHITECTURE (SOT #2)

### 6. Struktur Navigasi (Admin Panel — terpisah dari app utama)

```
/admin
├── Login (F-11)
├── Dashboard (F-13 — metrik kesehatan sistem)
├── Users (F-12)
│   └── Detail User
│       ├── Info Akun (nama, email, plan, status, tanggal daftar)
│       └── Status Teknis (F-14 — koneksi MT5, sync, error log)
└── Audit Log (NF-07 — riwayat semua aksi admin)
```

### 7. Database Schema (delta dari V1)

#### Perubahan tabel `users` [V1-section-7]
| Field baru | Tipe Data | Constraint          | Keterangan                          |
|--------------|-----------|------------------------|----------------------------------------|
| role         | VARCHAR   | DEFAULT 'user'          | 'user' / 'admin'                       |
| plan         | VARCHAR   | DEFAULT 'free'          | 'free' / 'premium'                     |
| status       | VARCHAR   | DEFAULT 'active'        | 'active' / 'suspended' / 'deleted'     |
| last_active_at | TIMESTAMP | NULLABLE              | Update tiap kali user melakukan aksi   |

#### Entitas baru: admin_audit_log
| Field           | Tipe Data | Constraint             | Keterangan                                  |
|-----------------|-----------|---------------------------|--------------------------------------------------|
| id              | UUID      | PK                          |                                                    |
| admin_user_id   | UUID      | FK → users.id               | Admin yang melakukan aksi                         |
| action          | VARCHAR   | NOT NULL                    | 'suspend_user' / 'delete_user' / 'change_plan' / dst |
| target_user_id  | UUID      | FK → users.id, NULLABLE     | User yang kena aksi (kalau relevan)               |
| details         | JSONB     | NULLABLE                     | Detail tambahan (misal plan lama → baru)          |
| created_at      | TIMESTAMP | DEFAULT NOW()                |                                                    |

**Relasi tambahan:**
- `users` (role='admin') 1-to-many `admin_audit_log` (sebagai pelaku)
- `users` (role='user') 1-to-many `admin_audit_log` (sebagai target, opsional)

---

## BAGIAN III — DESIGN SYSTEM (SOT #3, ringkas)

### 8. Visual Identity (Admin Panel)

- Tetap pakai token warna dari V1 [V1-section-8] biar brand konsisten, tapi layout **desktop-first** (bukan mobile-first) karena ini internal tool
- Style: lebih fungsional/dense dibanding app utama — banyak tabel data, bukan kartu besar-besar
- Tidak perlu dark/light theme dua-duanya untuk MVP admin panel — cukup 1 tema (boleh reuse dark theme V1) untuk mempercepat development, karena cuma dipakai 1 orang

### 9. Komponen Tambahan

| Komponen | Kegunaan |
|---|---|
| Data Table (sortable, searchable, pagination) | List user, audit log |
| Status Badge | Active/Suspended/Deleted, Free/Premium |
| Confirmation Modal (dengan re-auth) | Aksi destruktif (hapus user) |
| Metric Card | Dashboard admin (Total User, dst) |

---

## BAGIAN IV — USER FLOW (SOT #4)

### 11. Flow F-12 — Suspend/Hapus User
```
[START] Admin buka halaman Users
  │
  ▼
Cari/pilih user tertentu
  │
  ▼
Klik "Suspend" atau "Hapus"
  │
  ├─ [Suspend] → Konfirmasi → status user = 'suspended' → sesi user itu invalid
  │
  └─ [Hapus] → Modal re-autentikasi (masukkan password admin)
       │
       ├─ [Password salah] → ditolak, tidak ada perubahan
       │
       └─ [Password benar] → Konfirmasi final ("Yakin? Tidak bisa dibatalkan")
            │
            └─ Data user dihapus/di-anonymize → tercatat di audit log
                                                    [END]
```

---

## BAGIAN V — SEQUENCE DIAGRAM (SOT #5)

### 13. Sequence F-12 — Hapus User
```
Admin       → Frontend    : Klik "Hapus User", masukkan password re-auth
Frontend    → API         : POST /admin/users/{id}/delete { admin_password }
API         → Database    : Verify admin_password
API         → Database    : Cascading delete (trades, journal, mt5_connections, notes, dst)
API         → Database    : INSERT admin_audit_log (action: delete_user, target: id)
Database    → API         : OK
API         → Frontend    : 200 OK
Frontend    → Admin       : Toast "User berhasil dihapus"
```

### 13b. Sequence F-13 — Load Dashboard Admin
```
Admin       → Frontend    : Buka /admin/dashboard
Frontend    → API         : GET /admin/metrics
API         → Database    : Aggregate: COUNT users, COUNT active (last_active_at > 7 hari),
                              COUNT mt5_connections WHERE status='error', dst
Database    → API         : Return metrik
API         → Frontend    : 200 OK { metrics }
Frontend    → Admin       : Tampilkan Dashboard
```

---

## BAGIAN VI — TECHNICAL STANDARD

### 14. Tech Stack

Tetap pakai stack V1 [V1-section-14] — Next.js + Supabase. Admin panel dibangun sebagai route group terpisah (`/admin/*`) dalam project yang sama, BUKAN aplikasi terpisah — lebih simpel buat solo dev, cukup dijaga lewat role-based route guard.

### 19. Error Handling (tambahan)

| Code                     | Kapan dipakai                                   |
|----------------------------|------------------------------------------------------|
| ADMIN_ACCESS_DENIED         | User non-admin coba akses route `/admin/*`             |
| ADMIN_REAUTH_REQUIRED       | Aksi destruktif tanpa re-autentikasi valid              |
| ADMIN_SELF_ACTION_BLOCKED   | Admin coba suspend/hapus akunnya sendiri                |

### 21. Security Considerations (tambahan — PENTING)

- **Route guard di backend, bukan cuma frontend** — cek `role='admin'` di setiap API call `/admin/*`, jangan hanya sembunyikan menu di UI
- **2FA/OTP wajib** untuk login admin — karena cuma 1 akun dengan privilege sangat tinggi, kalau bobol dampaknya ke semua user
- **Re-autentikasi untuk aksi destruktif** (hapus user) — password saja tidak cukup untuk aksi yang tidak bisa dibatalkan
- **Audit log tidak boleh bisa dihapus/diedit** siapapun termasuk admin sendiri (append-only) — supaya tetap valid sebagai catatan akuntabilitas
- **Privasi tetap prioritas (NF-08)** — endpoint admin secara sengaja TIDAK dibuatkan untuk fetch `trade_journal`, `trade_screenshots`, atau `notes` (dari Addendum V3 gap analysis sebelumnya). Ini harus jadi bagian dari code review checklist, bukan cuma asumsi

---

## BAGIAN VII — QA

### 23. Test Case

| ID | Skenario | Kondisi Awal | Yang Diharapkan | Prioritas |
|----|-----------|----------------|---------------------|-----------|
| TC-201 | User biasa coba akses `/admin/dashboard` | Login sebagai user biasa | Ditolak (403 atau redirect), tidak ada info bahwa halaman admin ada | Tinggi |
| TC-202 | Login admin tanpa 2FA valid | Coba login admin, salah OTP | Ditolak, tidak masuk ke dashboard | Tinggi |
| TC-203 | Suspend user | User aktif, sedang login di device lain | Setelah admin suspend, sesi user itu invalid di request berikutnya | Tinggi |
| TC-204 | Hapus user tanpa re-auth password | Coba hapus user tanpa masukkan password admin | Ditolak, aksi tidak jalan | Tinggi |
| TC-205 | Cascading delete lengkap | Hapus user test yang punya trades, journal, notes, koneksi MT5 | Semua data terkait benar-benar terhapus dari database | Tinggi |
| TC-206 | **Privasi — endpoint admin tidak expose jurnal** | Coba akses/inspect semua endpoint `/admin/*` | Tidak ada satupun response yang mengandung field jurnal/catatan/screenshot user | Tinggi |
| TC-207 | Audit log tercatat | Lakukan aksi suspend/hapus/ubah plan | Muncul entry baru di `admin_audit_log` dengan detail yang benar | Tinggi |
| TC-208 | Dashboard metrik akurat | Bandingkan "Total User" di dashboard dengan `SELECT COUNT(*) FROM users` manual | Harus sama | Tinggi |
| TC-209 | Ubah plan user manual | Admin ubah plan user dari free ke premium | Perubahan tersimpan, tercermin di app utama user tersebut (misal CTA "Upgrade" hilang) | Sedang |

---

## BAGIAN IX — SPRINT BACKLOG

### 25. Ringkasan Sprint (lanjutan dari V2, mulai S-12)

| Sprint | Nama                                        | SOT yang dirujuk                     | Estimasi |
|----------|------------------------------------------------|------------------------------------------|------------|
| S-12     | UI Admin Panel (static)                        | F-11 s/d F-14, Design System addendum V3  | 2 hari     |
| S-13     | Backend Admin + Freemium Field + Integrasi     | F-11 s/d F-15, NF-07/NF-08, Sequence V3   | 2-3 hari   |

### 26. Sprint Detail + Prompt Siap Pakai

#### SPRINT S-12 — UI Admin Panel (Static)

**Prompt untuk Claude — Sprint S-12:**
```
Kita mulai Sprint S-12: UI Admin Panel (Static) untuk Catatan Harian Trader.
Ini addendum V3 di atas fondasi V1 & V2 yang sudah ada. Admin panel HANYA dipakai
oleh 1 orang (owner), jadi desktop-first, bukan mobile-first seperti app utama.

⚠️ PRINSIP SPRINT INI:
- Desktop-first (beda dari app utama yang mobile-first)
- Gunakan skill yang relevan dengan pekerjaan ini (data table, dashboard admin)
- Reuse token warna dari Design System V1, tapi layout lebih dense/fungsional
- Data masih dummy

Requirement (F-11 s/d F-14):
[paste SRS F-11 sampai F-14 dari section 3]

Halaman yang dibangun:
1. /admin/login — form login + field OTP/2FA (dummy)
2. /admin/dashboard — kartu metrik (Total User, User Aktif, Signup Trend, dst)
3. /admin/users — data table dengan search, pagination, kolom: nama, email, status, plan,
   tanggal daftar, terakhir aktif
4. /admin/users/[id] — detail user: Info Akun + tab "Status Teknis" (status MT5, sync terakhir,
   error log) — TEGASKAN di komentar kode bahwa tab ini TIDAK BOLEH pernah menampilkan
   data jurnal/catatan/screenshot
5. /admin/audit-log — data table riwayat aksi admin

Komponen: [paste section 9 — Data Table, Status Badge, Confirmation Modal, Metric Card]

Standar: Naming [paste V1 section 17], Coding standard [paste V1 section 18]

Tunjukkan tiap halaman satu-satu.
```

---

#### SPRINT S-13 — Backend Admin + Freemium Field + Integrasi

**Prompt untuk Claude — Sprint S-13:**
```
Kita mulai Sprint S-13: Backend Admin Panel untuk Catatan Harian Trader.
UI sudah selesai di S-12. Sprint ini krusial soal KEAMANAN — admin panel punya privilege tinggi.

⚠️ PRINSIP SPRINT INI:
- Route guard WAJIB di backend (cek role='admin' di setiap endpoint /admin/*), jangan
  cuma sembunyikan di frontend
- Endpoint admin TIDAK BOLEH ADA yang query tabel trade_journal, trade_screenshots, atau notes
  — ini pelanggaran privasi (NF-08), review ulang sebelum submit
- Audit log wajib tercatat untuk SETIAP aksi admin (append-only, tidak bisa diedit/dihapus)

1. Migration schema:
   [paste schema addendum users (role, plan, status, last_active_at) dan admin_audit_log
   dari section 7]

2. Endpoint auth admin:
   [paste Sequence login dari section 13, kalau ada, atau ikuti pola F-11]
   - Login admin dengan 2FA/OTP
   - Middleware cek role='admin' di semua route /admin/*

3. Endpoint user management:
   [paste Sequence F-12 dari section 13]
   - GET /admin/users (list, search, pagination)
   - GET /admin/users/{id} (detail + status teknis MT5, TANPA data jurnal)
   - POST /admin/users/{id}/suspend
   - POST /admin/users/{id}/delete (wajib re-auth password admin)
   - POST /admin/users/{id}/change-plan

4. Endpoint dashboard metrik:
   [paste Sequence F-13 dari section 13]

5. Endpoint audit log:
   - GET /admin/audit-log (list, dengan filter by action/admin/tanggal)
   - Setiap endpoint di atas yang melakukan perubahan WAJIB insert ke admin_audit_log

6. Sambungkan UI (S-12) ke semua endpoint ini.

Requirement lengkap (F-11 s/d F-15):
[paste SRS lengkap dari section 3]

Security checklist wajib dicek ulang sebelum selesai:
[paste section 21]

Format error: [paste section 19] + [paste V1 section 19]

Mulai dari migration → auth admin → user management → dashboard metrik → audit log →
sambungkan UI. Di akhir, tunjukkan hasil test case dari section 23, terutama TC-206
(privasi) — ini yang paling kritis.
```

---

## BAGIAN X — PENUTUP

### 27. Assumptions & Open Questions

#### Asumsi yang Diambil
- [ ] Admin panel dan app utama tetap dalam 1 project Next.js yang sama (bukan project terpisah) — lebih simpel untuk solo dev, dijaga lewat role-based guard
- [ ] Limit plan free/premium (section F-15) masih berupa konstanta di kode, belum tabel database — cukup untuk tahap "siap-siap", nanti direvisi saat billing beneran dibangun
- [ ] 1000 user adalah milestone validasi kesiapan skala, bukan hard limit teknis — Dashboard (F-13) dirancang untuk bantu memantau ini

#### Open Questions
- [ ] Metode 2FA apa yang mau dipakai untuk login admin — email OTP (paling simpel) atau authenticator app (lebih aman tapi sedikit lebih ribet setup)?
- [ ] Kalau nanti tim support bertambah (>1 admin), perlu role granular (misal admin vs support-only) — ini didesain sebagai perluasan dari `role` enum yang sudah ada, tidak perlu redesain dari nol
- [ ] Limit spesifik plan free vs premium (jumlah koneksi MT5, retensi data historis, dll) — perlu diputuskan sebelum Sprint S-13 dimulai, karena ini akan jadi konstanta yang dipakai di banyak tempat

---

*Addendum ini dibuat dengan PRD Generator v4, melengkapi V1 dan V2.*
*Output ini adalah file `catatan-harian-trader-prd-v3-admin.md` — simpan berdampingan dengan V1 & V2 di root folder project.*
