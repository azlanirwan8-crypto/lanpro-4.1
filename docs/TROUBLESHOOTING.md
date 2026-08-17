# Catatan Insiden & Pemecahan Masalah — LanPro

> Dokumen ini mencatat seluruh insiden yang ditemui saat menjalankan LanPro di
> lingkungan pengembangan lokal (17 Agustus 2026) beserta akar penyebab dan cara
> mengatasinya. Berguna sebagai rujukan cepat bila masalah serupa muncul kembali.

---

## Daftar Isi

| # | Insiden | Gejala | Penyebab | Status |
|---|---------|--------|----------|--------|
| 1 | [Database tidak terhubung](#1-database-tidak-terhubung) | Aplikasi jalan tapi data kosong | `.env` belum diisi | ✅ Selesai |
| 2 | [Tombol Login Google tidak muncul](#2-tombol-login-google-tidak-muncul) | Halaman login hanya menampilkan form manual | Variabel OIDC belum diisi | ✅ Selesai |
| 3 | [Tombol Google tetap tidak muncul setelah `.env` diisi](#3-tombol-google-tetap-tidak-muncul-setelah-env-diisi) | `.env` sudah benar tapi tombol tetap hilang | Server belum di-restart | ✅ Selesai |
| 4 | [Daftar proyek kosong untuk admin](#4-daftar-proyek-kosong-untuk-admin) | Admin login tapi sidebar "PROYEK AKTIF" kosong | Middleware `authenticateJWT` hilang di rute | ✅ Selesai |
| 5 | [Daftar pengguna & proyek kosong (0 Total User)](#5-daftar-pengguna--proyek-kosong-0-total-user) | User Management menampilkan 0 user, sidebar 0 proyek | Validasi status akun hanya menerima `'active'` | ✅ Selesai |
| 6 | [Login Google Error 400: redirect_uri_mismatch](#6-login-google-error-400-redirect_uri_mismatch) | Google menolak permintaan OAuth | Redirect URI belum didaftarkan di Google Cloud Console | ✅ Selesai |

---

## 1. Database tidak terhubung

### Gejala
Aplikasi berjalan di `http://localhost:3000` tetapi semua data kosong. `npm run
doctor` gagal di pemeriksaan koneksi database.

### Akar Penyebab
Berkas `.env` belum berisi `DATABASE_URL` yang menunjuk ke database Neon
PostgreSQL. Tanpa variabel ini, adapter database (`src/lib/db.ts`) tidak dapat
membuka koneksi.

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
   > **Penting:** Gunakan endpoint yang berakhiran `-pooler` agar connection
   > pooling Neon aktif.

3. Jalankan verifikasi:
   ```bash
   npm run doctor
   ```
   Pastikan seluruh 8 pemeriksaan berstatus `OK`.

### Berkas Terkait
- `.env` — konfigurasi environment
- `.env.example` — template referensi
- `scripts/doctor.cjs` — skrip pemeriksaan kesehatan

---

## 2. Tombol Login Google tidak muncul

### Gejala
Halaman login (`http://localhost:3000`) hanya menampilkan form username/password.
Tombol "Masuk dengan Google" tidak ada sama sekali.

### Akar Penyebab
Frontend memanggil `GET /api/auth/oidc/providers` untuk mengetahui provider SSO
yang aktif. Backend hanya mengembalikan provider yang variabel lingkungannya
lengkap. Bila `OIDC_GOOGLE_CLIENT_ID` dan `OIDC_GOOGLE_CLIENT_SECRET` kosong,
Google tidak masuk daftar dan tombolnya tidak dirender.

### Cara Mengatasi

1. Buka [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
2. Buat atau gunakan OAuth 2.0 Client ID yang ada
3. Tambahkan ke `.env`:
   ```env
   OIDC_GOOGLE_CLIENT_ID=<client-id>.apps.googleusercontent.com
   OIDC_GOOGLE_CLIENT_SECRET=GOCSPX-<secret>
   OIDC_REDIRECT_URI=http://localhost:3000/api/auth/oidc/callback
   ```
4. Restart server (`npm run dev`)

### Berkas Terkait
- `server/services/oidc.service.ts` — logika pengecekan provider aktif
- `server/routes/auth-oidc.routes.ts` — endpoint `/api/auth/oidc/providers`

---

## 3. Tombol Google tetap tidak muncul setelah `.env` diisi

### Gejala
Variabel `OIDC_GOOGLE_CLIENT_ID` dan `OIDC_GOOGLE_CLIENT_SECRET` sudah diisi di
`.env`, tetapi tombol "Masuk dengan Google" tetap tidak muncul di halaman login.

### Akar Penyebab
`process.env` hanya dibaca **sekali** saat proses Node.js dimulai. Mengubah
`.env` saat server sedang berjalan **tidak** otomatis memuat ulang variabel baru.

### Cara Mengatasi

1. Hentikan server yang sedang berjalan (Ctrl+C)
2. Jalankan ulang:
   ```bash
   npm run dev
   ```
3. Buka tab peramban **baru** (bukan refresh tab lama) ke `http://localhost:3000`
4. Verifikasi: `GET /api/auth/oidc/providers` harus mengembalikan `["google"]`

### Catatan Penting
> Setiap kali mengubah `.env`, **wajib restart server**. Hot-reload Vite hanya
> berlaku untuk kode sumber frontend/backend, bukan untuk variabel environment.

---

## 4. Daftar proyek kosong untuk admin

### Gejala
Admin berhasil login, tetapi sidebar "PROYEK AKTIF" kosong dan area utama
menampilkan "Pilih atau Buat Proyek Baru" meski database memiliki 2 proyek.

### Akar Penyebab
Rute `GET /api/projects` di `server/routes/project.routes.ts` **tidak** dipasangi
middleware `authenticateJWT`. Akibatnya, `req.user` bernilai `undefined` dan
handler tidak dapat menentukan peran pemanggil untuk memfilter proyek.

Meskipun ada middleware global di `server.ts` (baris 407–415) yang memasang
`authenticateJWT` untuk seluruh `/api/*`, rute `/api/projects` didaftarkan
**setelah** middleware global tersebut dalam urutan mount Express, sehingga
pencocokan bergantung pada urutan registrasi yang rentan terhadap perubahan.

### Cara Mengatasi

**Perbaikan yang diterapkan** (commit `a31880b`):

```diff
// server/routes/project.routes.ts
- router.get("/api/projects", async (req: any, res) => {
+ router.get("/api/projects", authenticateJWT, async (req: any, res) => {
```

Middleware `authenticateJWT` ditambahkan secara eksplisit pada deklarasi rute,
sehingga `req.user` selalu terisi terlepas dari urutan mount.

### Berkas Terkait
- `server/routes/project.routes.ts` — deklarasi rute proyek
- `server/routes/project.list.test.ts` — unit test penjaga rute (baru)
- `src/AppContainer.tsx` (baris 890–925) — `fetchProjects()` di frontend

---

## 5. Daftar pengguna & proyek kosong (0 Total User)

### Gejala
Admin login berhasil. Sidebar menunjukkan 0 proyek. Menu "User Management"
menunjukkan "Total User: 0", "No users found matching your criteria."

Database **terverifikasi** berisi 11 pengguna dan 2 proyek (dibuktikan dengan
query langsung ke Neon PostgreSQL).

### Akar Penyebab
Middleware `authenticateJWT` di `server/middleware/auth.ts` (baris 95) memvalidasi
status akun pengguna dengan logika:

```ts
// SEBELUM perbaikan (SALAH)
if (dbUser.status && dbUser.status.toLowerCase() !== "active") {
  return res.status(403).json({ ... });
}
```

Masalahnya: di database LanPro, status akun yang sah adalah `'approved'` (bukan
`'active'`). Tipe TypeScript di `src/types/user.ts` mendefinisikan:

```ts
status: "pending" | "approved" | "rejected";
```

Karena `'approved' !== 'active'`, middleware menolak **seluruh** permintaan API
(`/api/users`, `/api/projects`, `/api/master-data`, dll.) dengan:

> `HTTP 403: "Akses ditolak: Akun Anda dinonaktifkan atau belum aktif."`

Frontend menerima error tersebut secara diam-diam (silent catch) dan menampilkan
daftar kosong.

### Cara Mengatasi

**Perbaikan yang diterapkan** (commit `80a6acb`):

```diff
// server/middleware/auth.ts
- // Tolak akun yang dinonaktifkan atau belum aktif
- if (dbUser.status && dbUser.status.toLowerCase() !== "active") {
+ // Tolak akun yang dinonaktifkan atau belum aktif (status sah: 'approved' atau 'active')
+ const statusLower = dbUser.status ? String(dbUser.status).toLowerCase() : "";
+ if (statusLower && statusLower !== "active" && statusLower !== "approved") {
```

Unit test ditambahkan di `server/middleware/auth.sinkron-peran.test.ts` untuk
memastikan status `'approved'` diterima:

```ts
it("menerima akses jika status akun di database adalah 'approved'", async () => {
  // ... mock DB mengembalikan status: "approved"
  await authenticateJWT(req, res, next);
  expect(next).toHaveBeenCalled();
  expect(req.user.status).toBe("approved");
});
```

### Diagnosis Cepat

Bila gejala ini muncul lagi, jalankan query berikut untuk memeriksa status akun:

```sql
SELECT id, username, role, status FROM "Users";
```

Lalu bandingkan nilai `status` dengan yang diterima oleh middleware
`authenticateJWT`.

### Berkas Terkait
- `server/middleware/auth.ts` (baris 94–101) — validasi status akun
- `server/middleware/auth.sinkron-peran.test.ts` — unit test sinkronisasi peran
- `src/types/user.ts` — definisi tipe status akun

---

## 6. Login Google Error 400: redirect_uri_mismatch

### Gejala
Klik tombol "Masuk dengan Google" → diarahkan ke Google → Google menampilkan:

> **Akses diblokir: Permintaan aplikasi ini tidak valid**
> Error 400: redirect_uri_mismatch

### Akar Penyebab
Aplikasi mengirimkan redirect URI:
```
http://localhost:3000/api/auth/oidc/callback
```

URI ini **belum didaftarkan** di pengaturan OAuth Client ID di Google Cloud
Console. Google menolak redirect karena URI tidak cocok dengan daftar yang
diizinkan.

### Cara Mengatasi

1. Buka [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
2. Klik **OAuth 2.0 Client ID** yang digunakan
3. Di bagian **Authorized redirect URIs**, tambahkan:
   ```
   http://localhost:3000/api/auth/oidc/callback
   ```
4. Klik **Save**
5. Tunggu hingga 5 menit untuk propagasi
6. Coba login Google lagi

### Catatan untuk Deployment

Saat deploy ke domain produksi, URI harus diperbarui di **dua tempat**:

| Tempat | Nilai |
|--------|-------|
| `.env` (`OIDC_REDIRECT_URI`) | `https://domain-produksi.com/api/auth/oidc/callback` |
| Google Cloud Console (Authorized redirect URIs) | `https://domain-produksi.com/api/auth/oidc/callback` |

Kedua nilai **harus identik persis** (termasuk protokol, domain, port, dan path).

### Berkas Terkait
- `.env` (`OIDC_REDIRECT_URI`) — redirect URI yang dikirim aplikasi
- `server/services/oidc.service.ts` — fungsi `ambilRedirectUri()`

---

## Checklist Pengaturan Awal LanPro

Untuk menghindari seluruh insiden di atas saat menjalankan LanPro di mesin baru:

- [ ] Salin `.env.example` → `.env`
- [ ] Isi `DATABASE_URL` dan `POSTGRES_URL` dengan connection string Neon (endpoint `-pooler`)
- [ ] Isi `JWT_SECRET` dengan string acak yang kuat
- [ ] Isi `APP_URL=http://localhost:3000`
- [ ] (Opsional) Isi `OIDC_GOOGLE_CLIENT_ID`, `OIDC_GOOGLE_CLIENT_SECRET`, dan `OIDC_REDIRECT_URI`
- [ ] (Opsional) Daftarkan `OIDC_REDIRECT_URI` di Google Cloud Console
- [ ] Jalankan `npm run doctor` — pastikan semua `OK`
- [ ] Jalankan `npm run dev`
- [ ] Buka tab peramban **bersih** ke `http://localhost:3000`
- [ ] Verifikasi: login → proyek muncul → user management menampilkan data

---

*Dokumen ini terakhir diperbarui: 17 Agustus 2026*
