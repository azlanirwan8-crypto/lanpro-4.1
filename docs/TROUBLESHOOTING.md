# Catatan Insiden & Pemecahan Masalah — LanPro

> Dokumen ini mencatat seluruh insiden teknis yang ditemui saat menjalankan LanPro di
> lingkungan pengembangan lokal maupun deployment produksi (Vercel Serverless / Cloud)
> beserta gejala, analisis akar penyebab, berkas terkait, dan cara penanganannya secara mendalam.
> Berguna sebagai rujukan operasional resmi tim pengembang.

---

## Daftar Isi

| # | Insiden | Lingkup | Gejala | Akar Penyebab | Status |
|---|---------|---------|--------|---------------|--------|
| 1 | [Database tidak terhubung](#1-database-tidak-terhubung) | Lokal / Dev | Aplikasi jalan tapi data kosong | `.env` belum diisi connection string Neon | ✅ Selesai |
| 2 | [Tombol Login Google tidak muncul di Lokal](#2-tombol-login-google-tidak-muncul-di-lokal) | Lokal / Dev | Halaman login hanya menampilkan form manual | Variabel OIDC di `.env` belum diisi | ✅ Selesai |
| 3 | [Tombol Google tetap tidak muncul setelah `.env` diisi](#3-tombol-google-tetap-tidak-muncul-setelah-env-diisi) | Lokal / Dev | `.env` sudah benar tapi tombol tetap hilang | Server belum di-restart (Vite HMR tidak reload env) | ✅ Selesai |
| 4 | [Daftar proyek kosong untuk admin](#4-daftar-proyek-kosong-untuk-admin) | Semua | Admin login tapi sidebar "PROYEK AKTIF" kosong | Middleware `authenticateJWT` hilang di rute `/api/projects` | ✅ Selesai |
| 5 | [Daftar pengguna & proyek kosong (0 Total User)](#5-daftar-pengguna--proyek-kosong-0-total-user) | Semua | User Management 0 user, sidebar 0 proyek | Validasi status akun hanya menerima `'active'`, padahal DB memakai `'approved'` | ✅ Selesai |
| 6 | [Login Google Error 400: redirect_uri_mismatch](#6-login-google-error-400-redirect_uri_mismatch) | Semua | Google menolak permintaan OAuth saat dialihkan | Redirect URI belum didaftarkan di Google Cloud Console | ✅ Selesai |
| 7 | [Vercel 504 Timeout — ALLOWED_ORIGINS Wajib di Production](#7-vercel-504-timeout--allowed_origins-wajib-di-production) | Vercel | API mengembalikan 504 Gateway Timeout, serverless crash saat startup | `server.ts` melempar error inisialisasi jika `APP_URL` / `ALLOWED_ORIGINS` kosong | ✅ Selesai |
| 8 | [Vercel Rate Limit Crash — ERR_ERL_UNEXPECTED_X_FORWARDED_FOR](#8-vercel-rate-limit-crash--err_erl_unexpected_x_forwarded_for) | Vercel | Login/API crash: `ValidationError: The 'X-Forwarded-For' header is set` | Express `trust proxy` bernilai `false` di belakang reverse proxy Vercel | ✅ Selesai |
| 9 | [Tombol SSO Google Tidak Muncul di Deployment Vercel](#9-tombol-sso-google-tidak-muncul-di-deployment-vercel) | Vercel | Halaman login di domain Vercel tidak menampilkan tombol Google | Environment Variables OIDC belum diset di Vercel Dashboard | ✅ Selesai |
| 10 | [Vercel Login Crash / Gagal Token — JWT_SECRET Kosong](#10-vercel-login-crash--gagal-token--jwt_secret-kosong) | Vercel | Login gagal di Vercel, token JWT tidak dapat ditandatangani | Integrasi database menginjeksi DB env, namun `JWT_SECRET` belum ditambahkan di Vercel | ✅ Selesai |

---

## 1. Database tidak terhubung

### Gejala
Aplikasi berjalan di `http://localhost:3000` tetapi semua data kosong. `npm run doctor` gagal di pemeriksaan koneksi database.

### Akar Penyebab
Berkas `.env` belum berisi `DATABASE_URL` yang menunjuk ke database Neon PostgreSQL. Tanpa variabel ini, adapter database (`src/lib/db.ts`) tidak dapat membuka pool koneksi.

### Cara Mengatasi
1. Salin `.env.example` menjadi `.env`:
   ```bash
   cp .env.example .env
   ```
2. Isi variabel berikut di `.env` dengan nilai dari dashboard Neon:
   ```env
   DATABASE_URL=postgresql://<user>:<password>@<host>/<dbname>?sslmode=require
   POSTGRES_URL=postgresql://<user>:<password>@<host>/<dbname>?sslmode=require
   JWT_SECRET=<rahasia-jwt-anda>
   ```
   > **Penting:** Gunakan endpoint yang berakhiran `-pooler` agar connection pooling Neon aktif.
3. Jalankan verifikasi kesehatan:
   ```bash
   npm run doctor
   ```
   Pastikan seluruh 8 pemeriksaan berstatus `OK`.

### Berkas Terkait
- `.env` — konfigurasi environment lokal
- `.env.example` — template referensi
- `scripts/doctor.cjs` — skrip diagnosa kesehatan aplikasi

---

## 2. Tombol Login Google tidak muncul di Lokal

### Gejala
Halaman login (`http://localhost:3000`) hanya menampilkan form username/password. Tombol "Masuk dengan Google" tidak ada sama sekali.

### Akar Penyebab
Frontend memanggil endpoint `GET /api/auth/oidc/providers` untuk mengetahui provider SSO mana yang siap dipakai. Backend mengisolasi provider yang belum lengkap kuncinya. Bila `OIDC_GOOGLE_CLIENT_ID` dan `OIDC_GOOGLE_CLIENT_SECRET` kosong di `.env`, Google tidak masuk daftar dan komponen UI `SsoButtons.tsx` secara sengaja menyembunyikan tombol tersebut agar pengguna tidak mengklik tombol yang pasti gagal.

### Cara Mengatasi
1. Buka [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials).
2. Buat atau gunakan OAuth 2.0 Client ID jenis Web Application.
3. Tambahkan ke `.env`:
   ```env
   OIDC_GOOGLE_CLIENT_ID=<client-id>.apps.googleusercontent.com
   OIDC_GOOGLE_CLIENT_SECRET=GOCSPX-<secret>
   OIDC_REDIRECT_URI=http://localhost:3000/api/auth/oidc/callback
   SSO_ALLOWED_DOMAINS=rajonet.com,bni.co.id,gmail.com
   ```
4. Restart server backend (`npm run dev`).

### Berkas Terkait
- `server/services/oidc.service.ts` — logika pengecekan `providerTersedia()`
- `server/routes/auth-oidc.routes.ts` — endpoint `GET /api/auth/oidc/providers`
- `src/features/auth/components/SsoButtons.tsx` — render tombol SSO kondisional

---

## 3. Tombol Google tetap tidak muncul setelah `.env` diisi

### Gejala
Variabel `OIDC_GOOGLE_CLIENT_ID` dan `OIDC_GOOGLE_CLIENT_SECRET` sudah diisi di `.env`, tetapi tombol "Masuk dengan Google" tetap tidak muncul di halaman login.

### Akar Penyebab
`process.env` di Node.js dibaca **hanya sekali** pada saat proses pertama kali boot. Mengubah berkas `.env` saat dev server sedang berjalan tidak memicu hot-reload nilai environment.

### Cara Mengatasi
1. Hentikan server yang sedang berjalan di terminal (`Ctrl + C`).
2. Jalankan ulang:
   ```bash
   npm run dev
   ```
3. Buka tab peramban **baru** (bukan refresh tab lama) ke `http://localhost:3000`.
4. Verifikasi: `GET /api/auth/oidc/providers` harus mengembalikan `{"status":"success","providers":["google"]}`.

---

## 4. Daftar proyek kosong untuk admin

### Gejala
Admin berhasil login, tetapi sidebar "PROYEK AKTIF" kosong dan area utama menampilkan "Pilih atau Buat Proyek Baru" meski database terbukti memiliki proyek.

### Akar Penyebab
Rute `GET /api/projects` di `server/routes/project.routes.ts` sebelumnya tidak dipasangi middleware `authenticateJWT` secara eksplisit pada rute bersangkutan, menyebabkan `req.user` bernilai `undefined` jika urutan mount Express berubah.

### Cara Mengatasi
Perbaikan diterapkan pada `server/routes/project.routes.ts`:
```diff
- router.get("/api/projects", async (req: any, res) => {
+ router.get("/api/projects", authenticateJWT, async (req: any, res) => {
```
Middleware `authenticateJWT` ditambahkan secara eksplisit pada rute proyek.

### Berkas Terkait
- `server/routes/project.routes.ts`
- `server/routes/project.list.test.ts`

---

## 5. Daftar pengguna & proyek kosong (0 Total User)

### Gejala
Admin login berhasil, namun sidebar 0 proyek dan User Management menampilkan 0 user. Database terbukti berisi data pengguna.

### Akar Penyebab
Middleware autentikasi memvalidasi status pengguna dengan aturan:
```ts
// SEBELUM perbaikan (SALAH)
if (dbUser.status && dbUser.status.toLowerCase() !== "active") {
  return res.status(403).json({ ... });
}
```
Di database LanPro, status akun yang sah untuk user yang disetujui adalah `'approved'` (berdasarkan enum tipe di `src/types/user.ts`). Akibatnya, middleware menolak semua request API pengguna terdaftar dengan HTTP 403.

### Cara Mengatasi
Perbaikan diterapkan pada `server/middleware/auth.ts`:
```diff
- if (dbUser.status && dbUser.status.toLowerCase() !== "active") {
+ const statusLower = dbUser.status ? String(dbUser.status).toLowerCase() : "";
+ if (statusLower && statusLower !== "active" && statusLower !== "approved") {
```

### Berkas Terkait
- `server/middleware/auth.ts`
- `server/middleware/auth.sinkron-peran.test.ts`
- `src/types/user.ts`

---

## 6. Login Google Error 400: redirect_uri_mismatch

### Gejala
Klik tombol "Masuk dengan Google" → diarahkan ke akun Google → muncul pesan galat:
> **Akses diblokir: Permintaan aplikasi ini tidak valid**
> Error 400: redirect_uri_mismatch

### Akar Penyebab
URL callback `http://localhost:3000/api/auth/oidc/callback` belum didaftarkan pada Authorized Redirect URIs di Google Cloud Console.

### Cara Mengatasi
1. Buka [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. Edit OAuth 2.0 Client ID.
3. Pada bagian **Authorized redirect URIs**, tambahkan:
   - Untuk Lokal: `http://localhost:3000/api/auth/oidc/callback`
   - Untuk Produksi: `https://<domain-anda>.vercel.app/api/auth/oidc/callback`
4. Klik **Save** dan tunggu 1–5 menit untuk propagasi konfigurasi Google.

---

## 7. Vercel 504 Timeout — ALLOWED_ORIGINS Wajib di Production

### Gejala
Saat aplikasi dideploy ke Vercel dan pengguna mencoba memanggil API (misalnya POST `/api/auth/login`), Vercel mengembalikan response **504 Gateway Timeout**. Pada log runtime Vercel tercatat:
```text
[error] [VERCEL] Initialization promise failed: Error: [CONFIG] ALLOWED_ORIGINS (atau APP_URL) wajib diisi di production.
Tanpa itu seluruh koneksi Socket.IO dari browser akan ditolak.
    at startServer (/var/task/dist/server.cjs:...)
```

### Akar Penyebab
Pemeriksaan keamanan startup di `server.ts` mewajibkan variabel `ALLOWED_ORIGINS` atau `APP_URL` terisi saat `NODE_ENV === "production"` agar Socket.IO dan CORS tidak terbuka bebas. Di platform Vercel, pengguna seringkali belum membuat variabel `APP_URL`, sehingga fungsi serverless mengalami throw error saat inisialisasi cold-start dan memicu timeout 504.

### Cara Mengatasi
1. **Otomatisasi Deteksi Domain Vercel di Kode**:
   Pada `server.ts` dan `api/index.ts`, kode diperbarui untuk secara otomatis membaca variabel bawaan platform Vercel (`VERCEL_PROJECT_PRODUCTION_URL` dan `VERCEL_URL`):
   ```ts
   // server.ts & api/index.ts
   const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
     ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
     : null;
   const vercelDeploymentUrl = process.env.VERCEL_URL
     ? `https://${process.env.VERCEL_URL}`
     : null;

   const allowedOrigins = [
     process.env.APP_URL,
     ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : []),
     vercelProductionUrl,
     vercelDeploymentUrl,
   ].filter(Boolean);
   ```
2. **Hasil**: Aplikasi di Vercel langsung mengenali domain `https://*.vercel.app` miliknya sendiri tanpa mewajibkan pengisian manual `APP_URL`.

### Berkas Terkait
- `server.ts` — inisialisasi Socket.IO & origins check
- `api/index.ts` — Vercel Serverless Function entry point & CORS handler

---

## 8. Vercel Rate Limit Crash — ERR_ERL_UNEXPECTED_X_FORWARDED_FOR

### Gejala
Pada runtime Vercel, pemanggilan endpoint login atau endpoint dengan rate limiting melempar exception:
```text
ValidationError: The 'X-Forwarded-For' header is set but the Express 'trust proxy' setting is false (default).
This could indicate a misconfiguration which would prevent express-rate-limit from accurately identifying users.
  code: 'ERR_ERL_UNEXPECTED_X_FORWARDED_FOR'
  help: 'https://express-rate-limit.github.io/ERR_ERL_UNEXPECTED_X_FORWARDED_FOR/'
```

### Akar Penyebab
Vercel adalah reverse proxy yang menyertakan header `X-Forwarded-For` berisi IP asli pengunjung. Pustaka keamanan `express-rate-limit` (v7+) memiliki mekanisme validasi ketat yang melempar `ValidationError` jika mendeteksi header proxy tersebut saat setelan Express `trust proxy` masih `false`.

### Cara Mengatasi
1. **Aktifkan `trust proxy` pada Express**:
   Pada `server.ts`, tepat setelah `app` diinisialisasi:
   ```ts
   export const app = express();
   app.set('trust proxy', 1);
   ```
2. **Sesuaikan Opsi Validasi Rate Limiters**:
   Tambahkan `validate: { xForwardedForHeader: false }` pada `globalLimiter`, `loginLimiter`, dan `registerLimiter` di `server.ts`.
3. **Hasil**: Express membaca IP asli klien dengan benar melalui hop pertama reverse proxy Vercel dan `express-rate-limit` bekerja tanpa melempar exception.

### Berkas Terkait
- `server.ts` — konfigurasi Express instance & rate limiters

---

## 9. Tombol SSO Google Tidak Muncul di Deployment Vercel

### Gejala
Halaman login di domain Vercel (`https://<project-name>.vercel.app`) hanya menampilkan form username & password, tanpa tombol "Masuk dengan Google".

### Akar Penyebab
Mekanisme *Smart SSO Detection* LanPro menyembunyikan tombol Google bila variabel lingkungan kredensial OAuth belum lengkap di server Vercel. Meskipun di laptop lokal `.env` sudah diisi, Environment Variables di Vercel bersifat terpisah dan harus diisi di dashboard Vercel.

### Cara Mengatasi
1. Buka dashboard Vercel → Pilih Proyek LanPro → **Settings** → **Environment Variables**.
2. Tambahkan variabel-variabel berikut:
   - `OIDC_GOOGLE_CLIENT_ID` = Client ID OAuth Google Cloud
   - `OIDC_GOOGLE_CLIENT_SECRET` = Client Secret OAuth Google Cloud
   - `OIDC_REDIRECT_URI` = `https://<project-name>.vercel.app/api/auth/oidc/callback`
   - `SSO_ALLOWED_DOMAINS` = `rajonet.com,gmail.com` *(daftar domain email yang diizinkan)*
3. Pastikan URL `https://<project-name>.vercel.app/api/auth/oidc/callback` juga terdaftar di **Authorized redirect URIs** pada Google Cloud Console.
4. Lakukan **Redeploy** di Vercel.
5. Tombol Google akan otomatis muncul setelah deploy selesai.

### Berkas Terkait
- `server/services/oidc.service.ts`
- `src/features/auth/components/SsoButtons.tsx`

---

## 10. Vercel Login Crash / Gagal Token — JWT_SECRET Kosong

### Gejala
Login di Vercel gagal atau token otentikasi tidak valid.

### Akar Penyebab
Saat integrasi Neon PostgreSQL dihubungkan ke Vercel, Vercel secara otomatis menginjeksi variabel database (`POSTGRES_URL`, `DATABASE_URL`), tetapi kunci enkripsi JWT (`JWT_SECRET`) tidak dibuat otomatis dan harus disediakan oleh admin.

### Cara Mengatasi
1. Masuk ke **Vercel Settings → Environment Variables**.
2. Tambahkan variabel:
   - Key: `JWT_SECRET`
   - Value: String rahasia yang panjang dan kuat (minimal 32 karakter acak).
3. Lakukan **Redeploy**.

---

## Checklist Pengaturan Deployment Vercel (Produksi)

Untuk memastikan deployment Vercel langsung berjalan lancar tanpa kendala:

- [ ] Hubungkan Neon PostgreSQL Integration di Vercel (otomatis mengisi `POSTGRES_URL`)
- [ ] Tambahkan `JWT_SECRET` di Vercel Environment Variables
- [ ] (Opsional SSO) Tambahkan `OIDC_GOOGLE_CLIENT_ID` dan `OIDC_GOOGLE_CLIENT_SECRET`
- [ ] (Opsional SSO) Tambahkan `OIDC_REDIRECT_URI=https://lanpro-mu.vercel.app/api/auth/oidc/callback`
- [ ] (Opsional SSO) Tambahkan `SSO_ALLOWED_DOMAINS=rajonet.com,gmail.com`
- [ ] Daftarkan URL redirect di Google Cloud Console → Authorized redirect URIs
- [ ] Pastikan nilai `OIDC_REDIRECT_URI` di Vercel **SAMA PERSIS** dengan yang di Google Console
- [ ] Trigger deploy / push ke branch `main`

---

## 11. Google SSO Error 400: redirect_uri_mismatch Persisten (Vercel)

### Gejala
Setelah klik "Daftar dengan Google" atau "Masuk dengan Google" pada deployment Vercel, browser diarahkan ke halaman Google dengan pesan:

```
Access blocked: This app's request is invalid
Error 400: redirect_uri_mismatch
```

Muncul setelah pengguna memilih akun Google mereka, sebelum kembali ke aplikasi.

### Lingkup
- Vercel production
- Terjadi meskipun tombol SSO sudah muncul di UI

### Akar Penyebab

Ada **dua sisi** yang harus cocok, dan kedua-duanya harus diperbarui:

1. **Sisi server (Vercel env var)**: Nilai `OIDC_REDIRECT_URI` yang dikirim server ke Google
2. **Sisi Google Cloud Console**: Daftar URI yang diizinkan oleh Google

Jika salah satu tidak diperbarui, Google menolak permintaan dengan `redirect_uri_mismatch`.

Contoh skenario yang paling sering terjadi:
- `OIDC_REDIRECT_URI` di Vercel masih berisi nilai localhost (`http://localhost:3000/api/auth/oidc/callback`) → Google menerima URI localhost namun tidak cocok dengan `https://lanpro-mu.vercel.app/...`
- Google Cloud Console belum didaftarkan URL Vercel sama sekali

### Diagnosis

Cek Vercel Logs saat klik tombol Google. Akan muncul baris:

```
[OIDC] Memulai otorisasi provider=google mode=... redirect_uri=<URI yang dikirim>
```

URI yang tercetak di log **harus sama persis** dengan yang terdaftar di Google Cloud Console.

### Cara Penanganan

**Langkah 1: Google Cloud Console**
1. Buka https://console.cloud.google.com/apis/credentials
2. Klik OAuth 2.0 Client ID project LanPro
3. Di bagian **Authorized redirect URIs** → **+ ADD URI**
4. Masukkan: `https://lanpro-mu.vercel.app/api/auth/oidc/callback`
5. Klik **SAVE**

**Langkah 2: Vercel Environment Variables**
1. Buka Vercel → Project lanpro-mu → Settings → Environment Variables
2. Set atau perbarui `OIDC_REDIRECT_URI` menjadi:
   ```
   https://lanpro-mu.vercel.app/api/auth/oidc/callback
   ```
3. Klik **Save**

**Langkah 3: Redeploy**
- Pergi ke Vercel → Deployments → klik **Redeploy** pada deployment terbaru
- Tunggu hingga deployment selesai

### Berkas Terkait
- `server/services/oidc.service.ts` — fungsi `ambilRedirectUri()`, `siapkanOtorisasi()`
- `server/routes/auth-oidc.routes.ts` — endpoint `/api/auth/oidc/callback`

### Status
✅ Perbaikan kode: auto-deteksi Vercel domain & log diagnostik ditambahkan (commit `089c6cd`)
⚠️ Masih membutuhkan konfigurasi manual di Google Cloud Console dan Vercel env vars

---

*Dokumen ini dikelola secara berkala sebagai panduan teknis operasional LanPro.*
