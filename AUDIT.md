# AUDIT LanPro — Papan Rekap Kendala & Perbaikan

**Dokumen ini adalah SATU-SATUNYA pedoman perbaikan.** Tujuannya menghapus
kebutuhan mengevaluasi ulang dari nol setiap kali memulai sesi kerja.

- Baseline diukur: **15 Agustus 2026**, commit `9053d8f`
- Semua angka di sini hasil **pengukuran perintah nyata**, bukan perkiraan.
- Perintah pengukurannya ikut ditulis (§9) supaya angka bisa diperbarui siapa pun
  dan hasilnya bisa dibandingkan secara adil.

---

## §0 STATUS SERAH TERIMA — baca ini lebih dulu

Bagian ini ditulis agar siapa pun — manusia maupun agen AI lain — bisa
melanjutkan pekerjaan tanpa perlu menelusuri riwayat percakapan.

**Diperbarui: 16 Agustus 2026.** Seluruh pekerjaan ada di branch `main` lokal.
**BELUM di-push ke `origin/main`** (tertinggal sekitar 40+ commit).

### 0.1 Kondisi aplikasi saat ini

| Cek                 | Nilai                                                       | Perintah                                     |
| ------------------- | ----------------------------------------------------------- | -------------------------------------------- |
| `tsc --noEmit`      | 0 error                                                     | `npm run lint`                               |
| ESLint              | 0 error, 449 warning                                        | `npx eslint src server`                      |
| Test                | **184 lulus / 19 suite**                                    | `npm test`                                   |
| Build               | sukses                                                      | `npm run build`                              |
| Doctor              | SIAP JALAN (1 peringatan disengaja: `STORAGE_DRIVER=local`) | `npm run doctor`                             |
| Aplikasi di browser | tampil normal, 0 error console                              | `npm run dev` → buka `http://localhost:3000` |

⚠️ Port di-hardcode **3000** (`server.ts:62`). Bila port terpakai, server keluar
sendiri dengan pesan `Port 3000 is already in use`.

### 0.2 Fase yang SUDAH SELESAI

**F5 · SSO Google/Microsoft — SELESAI, gerbang LULUS 16 Agu 2026.**

Dinyatakan lulus karena alur ujung-ke-ujung benar-benar dijalankan pemilik
proyek dengan akun Google sungguhan — bukan disimpulkan dari test hijau.
Pendaftaran membuat akun `pending`; login masuk ke dashboard; jalur
username+password dan pendaftaran manual tetap utuh.

| Sub-fase | Isi                   | Hasil                                                                           |
| -------- | --------------------- | ------------------------------------------------------------------------------- |
| F5.1     | Keputusan & desain    | 5 ketetapan resmi, lihat §1.5                                                   |
| F5.2     | Pecah `auth` berlapis | `AuthScreens.tsx` 762 → 7 berkas ≤378; `auth.routes.ts` 620 → 423 + service 219 |
| F5.3     | Fondasi OIDC generik  | `oidc.service.ts` 327 baris, **0 dependensi baru**, 22 test                     |
| F5.4     | Kebijakan akun + rute | tabel `UserIdentities`, `sso.service.ts`, 4 rute, 21 test                       |
| F5.5     | Antarmuka             | tombol SSO, layar Lengkapi Pendaftaran, penanganan kembalian                    |
| F5.5b    | Usulan username       | terisi otomatis dari email, tetap bisa diubah                                   |
| F5.5c    | Sederhanakan layar    | nama & email dihapus dari tampilan                                              |

**Tiga bug ditemukan saat pengujian nyata, tak satu pun tertangkap test:**
#41 identitas yatim mengunci email selamanya · #42 pembuatan akun tanpa
transaksi · #43 sesi SSO tak terdaftar sehingga login gagal SENYAP.

**F0 · Kejelasan & fondasi dokumen — SELESAI, gerbang LULUS 16 Agu 2026.**

| #   | Hasil                                                                                                                                                                                                             |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Tiga sistem migrasi jadi SATU. `runner.ts` ternyata BUKAN mati — ia satu-satunya pembuat `discussion_point_comments` yang punya 4 baris data dan dipakai kode aktif. Dipindahkan dulu, diverifikasi, baru dihapus |
| 39  | Migrasi tidak lagi gagal senyap: 3x ulangan, status terbaca di `/api/health`, `console.error` bukan `warn`                                                                                                        |
| 10  | `docs/DATABASE_SCHEMA.md` dibuat dari DB hidup + skrip `npm run db:schema`                                                                                                                                        |
| 12  | 6 angka ARCHITECTURE.md diukur ulang — termasuk `FlowchartContainer` yang ternyata NAIK 3.420 → 3.880                                                                                                             |
| 38  | `APP_URL` diisi nilai sungguhan + penjaga baru di doctor                                                                                                                                                          |

**Dua temuan baru muncul dari pekerjaan ini:** #47 kolom kembar di
`discussion_point_comments`, dan #48 lima pasang TABEL kembar akibat satu
sistem migrasi menulis nama tabel tanpa kutip.

**F6.1 · Bersihkan pondasi email — SELESAI 16 Agu 2026.**

| #   | Hasil                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------ |
| 22  | Penjadwal digest akhirnya menyala — sebelumnya di-import tapi tak pernah dipanggil                     |
| 23  | Fallback token ter-hardcode dibuang; tanpa token, penjadwal melewat dengan pesan jelas                 |
| 24  | Ditelusuri: **TIDAK ADA backend email sama sekali**. Form Settings hanya `useState` lokal tanpa simpan |

### 0.3 Perbaikan di luar fase yang sudah dikerjakan

| Perbaikan                                                              | Sebab                                                                                                                                                |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getJwtSecret` pindah ke `server/helpers/jwtSecret.ts`                 | `middleware/auth.ts` menarik adapter DB, sehingga test unit membuka koneksi Postgres lalu gagal saat Jest dibongkar — 22 test lulus tapi exit code 1 |
| `urlFrontend` tidak lagi memercayai `APP_URL` mentah                   | `.env` berisi placeholder harfiah `MY_APP_URL`, dan `res.redirect` memperlakukannya sebagai jalur relatif                                            |
| **`POST /api/projects` kini `verifyGlobalAdmin`**                      | Endpoint sama sekali tidak memeriksa peran; siapa pun yang login bisa membuat proyek lewat API                                                       |
| Tombol "Buat Proyek Baru" di layar kosong dijaga izin                  | Sebelumnya tanpa penjaga, padahal tombol serupa di sidebar sudah dijaga                                                                              |
| Ikon dialog galat DIHAPUS (sempat tong sampah, lalu pengguna-disilang) | Pemilik proyek menilai lebih baik tanpa ikon                                                                                                         |
| Identitas yatim dibersihkan + FK `ON DELETE CASCADE`                   | Baris `UserIdentities` yang menunjuk user terhapus MENGUNCI email itu selamanya — tombol Daftar pun ikut tertolak                                    |
| Pembuatan akun SSO jadi transaksional                                  | Menulis dua tabel tanpa transaksi adalah cara tautan yatim itu lahir                                                                                 |
| `daftarkanSesi()` dipanggil di callback SSO                            | `authenticateJWT` menegakkan sesi tunggal; tanpa ini login SSO gagal SENYAP bagi siapa pun yang pernah login memakai password                        |
| Form email Settings terbukti dekoratif                                 | `useState` lokal, tanpa pemuatan/penyimpanan, tanpa tombol simpan (item #45)                                                                         |

### 0.4 Yang PALING MUNGKIN dikerjakan berikutnya

**F6 sedang DITAHAN** atas keputusan pemilik proyek 16 Agu 2026: menunggu
domain email disiapkan lebih dulu.

Alasannya nyata, bukan kehati-hatian berlebih. Tanpa domain terverifikasi,
penyedia email mana pun (Resend, SendGrid, SES — semuanya sama, ini aturan
anti-spam) hanya mengizinkan pengiriman ke alamat pemilik akun. Artinya email
selamat datang **tidak akan sampai** ke user yang mendaftar dengan alamat lain,
dan gagalnya senyap. Membangun F6.3 sekarang berarti membangun sesuatu yang
tidak bisa dibuktikan bekerja.

Yang sudah disiapkan supaya tinggal lanjut:

- `.env` sudah memuat `RESEND_API_KEY` (kosong) dan `EMAIL_FROM`
- Alamat pengirim hanya **satu variabel** — ganti `EMAIL_FROM` saat domain siap,
  kode tidak berubah sedikit pun

Urutan saran setelah domain siap:

1. **F6.2** fondasi `email.service.ts` → **F6.3** email selamat datang (#26)
2. **F1 · Storage** — wajib tutup **sebelum rilis production**
3. **F0** — #39 migrasi gagal senyap & #38 `APP_URL` placeholder

⚠️ **Tiga hal yang WAJIB beres sebelum production**, semuanya menunggu
keputusan pemilik proyek:

| #   | Hal                              | Akibat bila terlewat                         |
| --- | -------------------------------- | -------------------------------------------- |
| 30  | Storage drive-per-user (F11)     | Berkas unggahan hilang tiap deploy di Vercel. Driver `s3` (#2) DITAHAN 16 Agu 2026 — jalan rilis kini lewat F11 |
| 44  | Domain email belum terverifikasi | Email tidak sampai ke user, gagal senyap     |
| 46  | `SSO_ALLOWED_DOMAINS=gmail.com`  | Siapa pun ber-Gmail bisa mendaftar           |

### 0.5 Aturan yang WAJIB dipatuhi penerus

Ini bukan preferensi gaya; semuanya lahir dari insiden nyata di repo ini.

1. **Review-first.** Untuk permintaan perbaikan: analisa & laporkan dulu
   (format A–F), tunggu persetujuan sebelum mengubah kode.
2. **Build hijau BUKAN bukti aplikasi jalan.** Wajib buka browser (§15.3).
3. **Jangan sentuh `src/lib/db.ts`.**
4. **Jangan sabotase source untuk pembuktian** — pakai salinan di luar repo.
5. **Jangan pernah memasukkan kredensial** — minta pemilik proyek yang login.
6. **Satu branch per item**, merge ke `main`, lapor sebelum lanjut.
7. **Laporkan apa adanya.** Yang belum diuji ditulis "belum terverifikasi".
8. **Baca §18 sebelum mengklaim apa pun soal kepatuhan.** Audit ini BUKAN audit
   ISO 27001 dan tidak akan menjadi ISO 27001 hanya dengan dirapikan. §18 memuat
   pemetaan OWASP/CWE, rubrik keparahan, batas lingkup, dan klasifikasi data.

### 0.6 Jebakan teknis khas repo ini

| Jebakan                            | Akibat bila terlewat                                                                                                                                           |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cek rute lewat status **401**      | TIDAK VALID — auth berjalan sebelum handler 404, rute palsu pun menjawab 401. Pakai perbandingan **himpunan rute**                                             |
| Menghitung **total** error `tsc`   | Pakai `diff` baris-per-baris; sudah **5×** menangkap simbol terlewat                                                                                           |
| `tsconfig.json` **tanpa `strict`** | Penyempitan tipe lewat diskriminan **boolean** tidak bekerja. Pakai diskriminan **string** (`{hasil: "berhasil"} \| {hasil: "gagal"}`)                         |
| Migrasi otomatis saat boot         | Hanya mencatat **warning** bila gagal. Pernah timeout dan tabel tidak terbentuk sementara server menyala seolah sehat — **verifikasi ke `information_schema`** |
| Kunci token localStorage           | **`lanpro_jwt_token`**, bukan `'token'`                                                                                                                        |
| Console peramban saat HMR          | Vite menyisakan error dari versi berkas yang sedang diedit. **Verifikasi di tab bersih**, bukan setelah hot-reload                                             |
| Menambah test                      | Periksa jumlahnya benar-benar bertambah — Prettier pernah membuat penyisipan gagal diam-diam                                                                   |
| Cek tabel lewat `information_schema` | Adaptor MENCEGAT kueri itu dan mengembalikan `{tableName, rowCount, sizeBytes}` — BUKAN `table_name`. Memakai `table_name` menghasilkan `undefined` untuk SEMUA baris (#78) |

### 0.7 Peta berkas SSO

```
server/
  services/oidc.service.ts      Verifikasi OIDC. Tanpa DB, tanpa kebijakan.
  services/sso.service.ts       Kebijakan akun. Menyentuh DB.
  routes/auth-oidc.routes.ts    4 rute, berkas TERPISAH dari auth.routes.ts
  helpers/jwtSecret.ts          Dipisah agar tidak menarik adapter DB
src/features/auth/
  lib/ssoCallback.ts            Baca query kembalian. Fungsi murni.
  lib/ssoUsername.ts            Usulan username dari email. Fungsi murni.
  services/sso.service.ts       Satu-satunya pintu ke backend
  components/SsoButtons.tsx     Tombol Google/Microsoft
  CompleteRegistrationScreen.tsx
src/main.tsx                    Menangkap sso_token SEBELUM React dirender
```

Pemisahan `oidc.service` (kriptografi) dari `sso.service` (kebijakan) disengaja:
keduanya punya alasan berubah yang berbeda, dan mencampurnya membuat keduanya
sulit diuji sendiri-sendiri.

---

## Cara memakai dokumen ini

1. Buka **§1.5 Peta Fase**. Kerjakan **fase paling awal yang belum lulus
   gerbang** — jangan meloncat fase.
2. Di dalam fase itu, buka **§1 Papan Prioritas** dan ambil item yang statusnya
   `TERBUKA`.
3. Setelah selesai, **ukur ulang** dengan perintah di §9, lalu perbarui:
   - kolom `Aktual` di tabel terkait,
   - kolom `Status` di §1 dan di ringkasan fase §1.5,
   - baris di **§10 Riwayat Perbaikan** (tanggal, commit, angka sebelum→sesudah).
4. **Isi kartu verifikasi §16 untuk SETIAP item.** Item tidak boleh berstatus
   `SELESAI` sebelum aplikasi terbukti berjalan di browser.
5. Sebelum merge, periksa **standar develop §17**.
6. Sebuah fase baru boleh ditutup bila **seluruh itemnya `SELESAI`** DAN
   **gerbang keluarnya lulus**. Gerbang tidak boleh dilewati karena "sudah
   terlihat jalan".
7. **Jangan menghapus baris temuan yang sudah selesai.** Ubah statusnya menjadi
   `SELESAI` beserta tanggalnya. Riwayat itu yang membuat dokumen ini berguna.
8. Bila sebuah angka memburuk, itu bukan kegagalan dokumen — itu justru fungsinya.
   Catat apa adanya.

> Satu branch per item (bukan per fase), merge ke `main`, lapor sebelum lanjut
> (§12 aturan 3). Fase adalah pengelompokan untuk urutan & gerbang, bukan satuan
> commit.

### Arti status

| Status     | Arti                                              |
| ---------- | ------------------------------------------------- |
| `TERBUKA`  | Belum dikerjakan sama sekali                      |
| `JALAN`    | Sedang dikerjakan, sebutkan nama branch-nya       |
| `SELESAI`  | Sudah diperbaiki DAN sudah diukur ulang           |
| `DITUNDA`  | Sengaja tidak dikerjakan, alasannya wajib ditulis |
| `MENUNGGU` | Terblokir oleh keputusan/aksi pemilik proyek      |

### Arti severity

| Severity | Arti                                                                 |
| -------- | -------------------------------------------------------------------- |
| 🔴       | Menghambat production ATAU membuat biaya penambahan modul naik terus |
| 🟠       | Utang nyata, belum menghambat, tapi makin mahal bila ditunda         |
| 🟡       | Kerapian & konsolidasi                                               |

---

## §1 PAPAN PRIORITAS — 81 item aktif + 1 dibatalkan

Tidak ada item yang berada di luar fase. Bila muncul temuan baru, ia **wajib**
diberi nomor dan dimasukkan ke salah satu fase — bukan ditulis sebagai catatan
lepas. Catatan lepas selalu terlupakan.

| #   | Temuan                                                                                   |   Fase   | Sev | Biaya         |   Blokir modul baru?    | Status                   | Detail |
| --- | ---------------------------------------------------------------------------------------- | :------: | :-: | ------------- | :---------------------: | ------------------------ | ------ |
| 1   | ~~Tiga sistem migrasi DB~~ disatukan jadi satu                                           |  **F0**  | 🔴  | Rendah        |           Ya            | `SELESAI` 16 Agu         | §4     |
| 12  | ~~ARCHITECTURE.md drift~~ angka diukur ulang                                             |  **F0**  | 🟡  | Rendah        |    Ya (menyesatkan)     | `SELESAI` 16 Agu         | §8     |
| 10  | ~~Schema DB tidak terdokumentasi~~ `docs/DATABASE_SCHEMA.md` dari DB hidup               |  **F0**  | 🟠  | Sedang        |           Ya            | `SELESAI` 16 Agu         | §4     |
| 2   | ~~Driver `s3` belum pernah dieksekusi~~ DITAHAN — storage beralih ke drive user (#30)      |  **F1**  | 🔴  | Rendah        |    Blokir production    | `DITAHAN` 16 Agu       | §6     |
| 15  | Dua Google API key lama belum dicabut                                                    |  **F1**  | 🔴  | Rendah        |          Tidak          | `MENUNGGU` pemilik       | §6     |
| 16  | **Logika aplikasi belum pernah diaudit**                                                 |  **F2**  | 🔴  | Sedang        |           Ya            | `TERBUKA`                | §13    |
| 18  | notebook-lm rusak di dua sisi                                                            |  **F2**  | 🟠  | Rendah        |          Tidak          | `MENUNGGU` keputusan     | §6.3   |
| 19  | `POST /api/db-query` tanpa penjaga read-only                                             |  **F2**  | 🔴  | Rendah        |          Tidak          | `MENUNGGU` keputusan     | §6.3   |
| 20  | Kode mati DB Explorer                                                                    |  **F2**  | 🟡  | Rendah        |          Tidak          | `MENUNGGU` keputusan     | §6.3   |
| 17  | **UI belum pernah diaudit di balik login**                                               |  **F3**  | 🔴  | Sedang        |           Ya            | `MENUNGGU` login         | §14    |
| 3   | ~~Nol code splitting~~ 901 -> 420 KB gzip, 29 chunk                                      |  **F4**  | 🔴  | Rendah        |           Ya            | `SELESAI` 16 Agu         | §5     |
| 29  | **SSO Google/Microsoft** (poin 1)                                                        |  **F5**  | 🟢  | Tinggi        |          Tidak          | `SELESAI` 15 Agu         | §1.5   |
| 32  | **Daftar dengan Google/Microsoft** — akun otomatis, status `pending`                     |  **F5**  | 🟢  | Sedang        |          Tidak          | `SELESAI` 15 Agu         | §1.5   |
| 33  | ~~`getJwtSecret` di `middleware/auth.ts` menarik adapter DB~~ dipindah ke `helpers/`     | **F5.3** | 🟠  | Sangat rendah |          Tidak          | `SELESAI` 15 Agu         | §1.5   |
| 34  | ~~`POST /api/projects` tanpa penjaga peran~~ kini khusus admin                           |  **F5**  | 🔴  | Rendah        |          Tidak          | `SELESAI` 16 Agu         | §0.3   |
| 35  | ~~Tombol "Buat Proyek Baru" di layar kosong tanpa penjaga izin~~                         |  **F5**  | 🟠  | Sangat rendah |          Tidak          | `SELESAI` 16 Agu         | §0.3   |
| 36  | ~~Ikon dialog galat memakai tong sampah~~ diganti pengguna-disilang                      |  **F5**  | 🟡  | Rendah        |          Tidak          | `SELESAI` 16 Agu         | §0.3   |
| 37  | ~~`urlFrontend` memercayai `APP_URL` mentah~~ kini divalidasi                            |  **F5**  | 🟠  | Sangat rendah |          Tidak          | `SELESAI` 15 Agu         | §0.3   |
| 38  | ~~`APP_URL` placeholder~~ diisi + penjaga di doctor                                      |  **F0**  | 🟠  | Sangat rendah |   Ya (CORS produksi)    | `SELESAI` 16 Agu         | §0.6   |
| 39  | ~~Migrasi gagal senyap~~ kini mengulang + status terbaca                                 |  **F0**  | 🔴  | Rendah        |           Ya            | `SELESAI` 16 Agu         | §0.6   |
| 40  | `tsconfig.json` tanpa `strict` — penyempitan diskriminan boolean tidak bekerja           |  **F8**  | 🟠  | Tinggi        |           Ya            | `TERBUKA`                | §0.6   |
| 41  | ~~Identitas yatim mengunci email selamanya~~ dibersihkan + FK `ON DELETE CASCADE`        |  **F5**  | 🔴  | Rendah        |          Tidak          | `SELESAI` 16 Agu         | §0.3   |
| 42  | ~~Pembuatan akun SSO menulis 2 tabel tanpa transaksi~~ kini transaksional                |  **F5**  | 🟠  | Rendah        |          Tidak          | `SELESAI` 16 Agu         | §0.3   |
| 43  | ~~Callback SSO tak menyetel `currentSessionToken`~~ — login gagal SENYAP                 |  **F5**  | 🔴  | Rendah        |          Tidak          | `SELESAI` 16 Agu         | §0.3   |
| 44  | Domain email belum terverifikasi — email HANYA sampai ke pemilik akun Resend             |  **F6**  | 🔴  | Rendah        | Ya (blokir rilis email) | `MENUNGGU` pemilik       | §0.4   |
| 45  | Form konfigurasi email di Settings **dekoratif** — `useState` lokal, tanpa simpan        |  **F6**  | 🟠  | Sedang        |          Tidak          | `TERBUKA`                | §0.3   |
| 46  | `SSO_ALLOWED_DOMAINS=gmail.com` — celah daftar, DAN membatalkan asumsi kuota F11         |  **F1**  | 🔴  | Sangat rendah | Ya (blokir production)  | `MENUNGGU` pemilik       | §0.4   |
| 47  | `discussion_point_comments` punya KOLOM KEMBAR camelCase + snake_case                    |  **F9**  | 🟠  | Sedang        |          Tidak          | `TERBUKA`                | §0.3   |
| 48  | ~~5 TABEL KEMBAR huruf kecil~~ dihapus, 35 tabel -> 30                                   |  **F0**  | 🟠  | Rendah        |          Tidak          | `SELESAI` 16 Agu         | §0.3   |
| 49  | `verifyProjectAccess(['*'])` lolos SEBELUM cek keanggotaan — bocor lintas proyek         |  **F2**  | 🔴  | Rendah        | Ya (blokir production)  | `SELESAI` 16 Agu | §13.5  |
| 50  | Socket.IO **tanpa autentikasi sama sekali** — tak ada `io.use()` handshake               |  **F2**  | 🔴  | Sedang        | Ya (blokir production)  | `SELESAI` 16 Agu | §13.5  |
| 51  | `FORCE_LOGOUT_EVENT` menyiarkan JWT sah ke SELURUH socket lewat `io.emit`                |  **F2**  | 🔴  | Sangat rendah | Ya (blokir production)  | `SELESAI` 16 Agu | §13.5  |
| 52  | `/api/auth/force-logout` memeriksa password TANPA `loginLimiter` — jalur brute force     |  **F2**  | 🔴  | Sangat rendah | Ya (blokir production)  | `SELESAI` 16 Agu | §13.5  |
| 53  | `POST /api/auth/logout` tanpa auth, `userId` sembarang → NULL-kan sesi siapa pun         |  **F2**  | 🔴  | Rendah        |          Tidak          | `TERBUKA`                | §13.5  |
| 54  | `rbac.ts:27` identitas boleh datang dari `x-user-id`/query/body — ranjau impersonasi     |  **F2**  | 🟠  | Sangat rendah |          Tidak          | `TERBUKA`                | §13.5  |
| 55  | `rbac.ts:50` `!targetProjectId → next()` — RBAC no-op senyap bila nama param berbeda     |  **F2**  | 🟡  | Sangat rendah |          Tidak          | `TERBUKA`                | §13.5  |
| 56  | Proses Jest mencetak crash `pg` (`isIP` of undefined) saat dibongkar — exit code tetap 0 |  **F8**  | 🟡  | Rendah        |          Tidak          | `TERBUKA`                | §13.5  |
| 57  | Dua endpoint health; `/api/health` terkunci auth sehingga probe eksternal dapat 401      |  **F2**  | ⚪  | Sangat rendah |          Tidak          | `TERBUKA`                | §13.6  |
| 58  | `GET /metrics` terbuka TANPA autentikasi — di luar `/api/`, lolos gerbang global         |  **F2**  | 🟠  | Sangat rendah | Ya (blokir production)  | `SELESAI` 16 Agu | §13.6  |
| 59  | `presence_sync` menyiarkan profil LENGKAP + matriks permission ke klien mana pun         |  **F2**  | 🔴  | Sangat rendah | Ya (blokir production)  | `SELESAI` 16 Agu | §13.6  |
| 60  | `POST .../tasks` buka transaksi tanpa `ROLLBACK` — koneksi balik ke pool masih terbuka   |  **F2**  | 🔴  | Rendah        | Ya (blokir production)  | `SELESAI` 16 Agu | §13.8  |
| 61  | Transaksi `POST .../tasks` hanya melingkupi penghitung, bukan INSERT task-nya           |  **F2**  | 🟠  | Rendah        |          Tidak          | `SELESAI` 16 Agu | §13.8  |
| 62  | Hapus proyek memakai kode galat MySQL; di Postgres `continue` dalam transaksi mustahil   |  **F2**  | 🟡  | Rendah        |          Tidak          | `SELESAI` 16 Agu | §13.8  |
| 63  | Register menelan `ER_DUP_ENTRY` (MySQL) — di Postgres jadi 500, bukan pesan yang benar   |  **F2**  | 🟡  | Sangat rendah |          Tidak          | `SELESAI` 16 Agu | §13.8  |
| 64  | `tasks/reorder` melepas koneksi dua kali bila galat terjadi setelah `commit`             |  **F2**  | 🟡  | Sangat rendah |          Tidak          | `SELESAI` 16 Agu | §13.8  |
| 65  | `affectedRows` selalu `undefined` — 3 pemeriksaan mati; penjaga jendela balapan mati    |  **F2**  | 🔴  | Rendah        | Ya (blokir production)  | `SELESAI` 16 Agu | §13.9  |
| 66  | 5 rute DELETE dijaga hanya `['*']` — anggota berperan `viewer` bisa menghapus data        |  **F2**  | 🔴  | Rendah        | Ya (blokir production)  | `SELESAI` 16 Agu | §13.9  |
| 67  | `/uploads` menyajikan SEMUA berkas gambar tanpa autentikasi — bukan hanya avatar        |  **F2**  | 🔴  | Rendah        | Ya (blokir production)  | `SELESAI` 16 Agu | §13.10 |
| 68  | `DELETE .../tasks/:taskId/links/:linkId` TANPA `verifyProjectAccess` sama sekali        |  **F2**  | 🔴  | Sangat rendah | Ya (blokir production)  | `SELESAI` 16 Agu         | §13.10 |
| 69  | `POST /api/users/:userId/notifications` tanpa cek kepemilikan — GET & PUT punya          |  **F2**  | 🔴  | Sangat rendah | Ya (blokir production)  | `MENUNGGU` keputusan     | §13.11 |
| 70  | Rute `/api/v1/meetings/:id*` tanpa penjaga proyek — baca & ubah rapat lintas proyek      |  **F2**  | 🔴  | Rendah        | Ya (blokir production)  | `MENUNGGU` keputusan     | §13.11 |
| 71  | `project-modules` POST/PUT/DELETE tanpa penjaga — CRUD modul lintas proyek               |  **F2**  | 🟠  | Sangat rendah |          Tidak          | `MENUNGGU` keputusan     | §13.11 |
| 72  | 16 rute POST/PUT/PATCH masih ber-`['*']` — `viewer` bisa membuat & mengubah data         |  **F2**  | 🟠  | Rendah        |          Tidak          | `MENUNGGU` keputusan     | §13.11 |
| 73  | `PUT .../dashboard-layout` menyelipkan `"*"` di daftar peran sehingga penjaganya korslet |  **F2**  | 🟡  | Sangat rendah |          Tidak          | `MENUNGGU` keputusan     | §13.11 |
| 74  | 7 pengambil data tanpa penjaga respons basi — data proyek lama menimpa proyek baru      |  **F2**  | 🟠  | Rendah        |          Tidak          | `MENUNGGU` keputusan     | §13.12 |
| 75  | Angka §13.1 & ARCHITECTURE drift lagi: 21 `useState` aktualnya 11, 104 rute aktualnya 119 |  **F0**  | 🟡  | Sangat rendah |          Tidak          | `SELESAI` 16 Agu         | §13.12 |
| 76  | Otorisasi tidak deny-by-default — akar 56% temuan F2 (14 dari 25 masuk OWASP A01)        |  **F7**  | 🔴  | Sedang        | Ya (blokir production)  | `MENUNGGU` keputusan     | §18.3  |
| 77  | 4 kerentanan `moderate` di dependensi — hanya tertutup lewat kenaikan versi mayor      |  **F8**  | 🟠  | Sedang        |          Tidak          | `MENUNGGU` keputusan     | §18.7  |
| 78  | Kode menulis ke tabel `TaskAttachments` yang TIDAK ADA di DB — lampiran task selalu gagal |  **F2**  | 🔴  | Sangat rendah | Ya (blokir production)  | `SELESAI` 16 Agu | §13.13 |
| 79  | **Migrasi ≠ database hidup**: 13 tabel drift, 54 kolom tak akan dibuat migrasi           |  **F0**  | 🔴  | Sedang        | Ya (blokir production)  | `SELESAI` 16 Agu | §13.14 |
| 80  | `POST /api/projects/generate-bni-demo` membuat proyek TANPA penjaga admin — pintu kedua  |  **F2**  | 🟠  | Sangat rendah | Ya (blokir production)  | `MENUNGGU` keputusan     | §13.15 |
| 81  | `ProjectMembers.parentAdminId` ditulis tapi TIDAK PERNAH dibaca — 6 baris, nol `SELECT`  |  **F7**  | 🟡  | Sangat rendah |          Tidak          | `MENUNGGU` keputusan     | §19.2  |
| 82  | Dropdown peran HARDCODED, tidak membaca katalog `MasterData` — duplikat & nilai bentrok |  **F7**  | 🔴  | Rendah        | Ya (blokir production)  | `TERBUKA`                | §19.12 |
| 31  | ~~Login dengan email di kolom form~~                                                     |  **—**   |  —  | —             |          Tidak          | `DIBATALKAN` 15 Agu 2026 | §1.5   |
| 22  | ~~`initWhatsAppScheduler` tak pernah dipanggil~~ kini menyala                            | **F6.1** | 🔴  | Sangat rendah |          Tidak          | `SELESAI` 16 Agu         | §1.5   |
| 23  | ~~Fallback token WhatsApp ter-hardcode~~ dibuang                                         | **F6.1** | 🔴  | Sangat rendah |          Tidak          | `SELESAI` 16 Agu         | §1.5   |
| 24  | ~~`EmailConfigForm` nol panggilan API~~ ditelusuri: TIDAK ada backend email              | **F6.1** | 🟡  | Rendah        |          Tidak          | `SELESAI` 16 Agu         | §1.5   |
| 25  | Fondasi `email.service.ts`                                                               |  **F6**  | 🟢  | Sedang        |          Tidak          | `MENUNGGU` domain email  | §1.5   |
| 26  | **Email selamat datang** (poin 2)                                                        |  **F6**  | 🟢  | Rendah        |          Tidak          | `MENUNGGU` domain email  | §1.5   |
| 27  | **Lupa password → password random** (poin 3)                                             |  **F6**  | 🟢  | Sedang        |          Tidak          | `MENUNGGU` domain email  | §1.5   |
| 28  | **Digest task pending + jumlah** (poin 4)                                                |  **F6**  | 🟢  | Rendah        |          Tidak          | `MENUNGGU` domain email  | §1.5   |
| 30  | **Drive-per-user** — kini ARAH RESMI storage, menggantikan driver `s3` (#2)             |  **F11**  |  🔴  | Tinggi        |    Blokir production    | `MENUNGGU` desain      | §1.5   |
| 4   | ±100 endpoint tanpa validasi skema                                                       |  **F7**  | 🔴  | Sedang        |      Ya (keamanan)      | `TERBUKA`                | §3     |
| 9   | Rasio test ±1 : 1.000 baris                                                              |  **F8**  | 🟠  | Tinggi        |           Ya            | `TERBUKA`                | §7     |
| 8   | 1.313 `any` melemahkan seluruh jaring tipe                                               |  **F8**  | 🟠  | Sedang        |           Ya            | `TERBUKA`                | §7     |
| 11  | ~~`auth` 762 baris tanpa lapisan~~ dipecah                                               | **F5.2** | 🟠  | Rendah        |          Tidak          | `SELESAI` 15 Agu         | §2     |
| 6   | 222 query SQL di lapisan rute, repository tak ada                                        |  **F9**  | 🟠  | Tinggi        |           Ya            | `TERBUKA`                | §3     |
| 5   | Routing palsu + 47 props di satu persimpangan                                            | **F10**  | 🔴  | Tinggi        |           Ya            | `TERBUKA`                | §5     |
| 7   | 59% baris kode di 37 berkas > 500 baris                                                  | **F10**  | 🟠  | Tinggi        |           Ya            | `TERBUKA`                | §2     |
| 21  | `authStore` & `uiStore` menganggur                                                       | **F10**  | 🟡  | Rendah        |          Tidak          | `DITUNDA` (disengaja)    | §5.3   |
| 14  | Kontras sidebar & jarak target sentuh                                                    | **F12**  | 🟠  | Sedang        |          Tidak          | `TERBUKA`                | §8     |
| 13  | 28 berkas `dark:` + 48 hex di luar token                                                 | **F12**  | 🟡  | Sedang        |          Tidak          | `TERBUKA`                | §8     |

---

## §1.5 PETA FASE — panggil pekerjaan lewat nomor fase

Cukup sebut **"kerjakan F2"** dan seluruh cakupannya sudah terdefinisi di sini:
item apa saja, syarat masuk, definisi selesai, target terukur, dan gerbang keluar.

### Indeks cepat

|  Fase   | Nama                               | Item                                 | Sesi | Risiko            | Status                    | TERTAHAN OLEH APA — dan siapa yang harus bergerak                                                                         |
| :-----: | ---------------------------------- | ------------------------------------ | ---- | ----------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **F0**  | Kejelasan & fondasi dokumen        | #1, #12, #10, #38, #39, #79          | 1–2  | Sangat rendah     | `SELESAI` 16 Agu (ulang)  | — tidak ada. Gerbangnya kini PUNYA PERINTAH: `npm run db:verify-schema`, dan lulus 3× berturut-turut. Sempat dicabut hari yang sama karena ternyata tidak pernah diuji (§13.14) |
| **F1**  | Cabut kredensial lama              | #15 (#2 DITAHAN)                     | <1   | Sangat rendah     | `MENUNGGU`                | **PEMILIK.** Cabut 2 Google API key lama di Google Cloud Console. Kerja ±5 menit, tidak menyentuh kode. **#2 ditahan 16 Agu 2026** — storage beralih ke drive user (#30), jadi fase ini TIDAK lagi membuka jalan rilis; yang membukanya kini F11 |
| **F2**  | Audit & perbaikan LOGIKA           | #16, #18–#20, #49–#75                | 3–5  | Rendah            | `JALAN` — audit SELESAI    | **PEMILIK, 9 keputusan.** Audit 9 area §13.1 tuntas & 15 item diperbaiki. Sisa murni keputusan peran/perilaku: #69 #70 #71 #72 #73 (penetapan peran), #74 (izin sentuh `AppContainer`), #18 #19 #20 (perilaku notebook-lm, penjaga read-only `db-query`, kode mati DB Explorer), #57 (dua endpoint health) |
| **F3**  | Audit UI menyeluruh                | #17                                  | 2–4  | Sangat rendah     | `SIAP JALAN`              | **TIDAK LAGI TERTAHAN.** Syarat "login pemilik" sudah terpenuhi — sesi hidup dipakai sepanjang 16 Agu. Yang masih perlu Anda: izin membuat objek percobaan untuk alur TULIS (§14.2), dan sesi admin bila layar khusus admin ikut diperiksa |
| **F4**  | Performa muat                      | #3                                   | 1    | Rendah–sedang     | `SELESAI` 16 Agu          | — tidak ada                                                                                                                 |
| **F5**  | **SSO Google/Microsoft** (poin 1)  | #11 → #29 → #32                      | 4–6  | Tinggi            | `SELESAI` 16 Agu          | — tidak ada                                                                                                                 |
| **F6**  | **Email: 3 fungsi** (poin 2, 3, 4) | #22, #23, #24 → #25 → #26, #27 → #28 | 3–4  | Rendah–sedang     | `MENUNGGU` domain          | **PEMILIK.** Domain email belum terverifikasi (#44). Tanpa itu penyedia mana pun hanya mengirim ke alamat pemilik akun, jadi email tidak akan sampai ke user lain dan gagalnya SENYAP. F6.1 sudah beres; tinggal isi `RESEND_API_KEY` + `EMAIL_FROM` |
| **F7**  | **Two-Tier RBAC** & validasi       | **#76**, #4, #81                     | 5–8  | **Tinggi**        | `JALAN` — tahap 0 selesai | **PEMILIK, 4 keputusan (K1–K4 §19.9).** Rancangan lengkap di **§19**. Tahap 0 (katalog peran di MasterData) SELESAI 16 Agu. Tahap 1–2 bisa jalan tanpa pemilik. Menutup akar 56% temuan F2 |
| **F8**  | Jaring pengaman                    | #9, #8                               | 4–6  | Rendah            | `TERBUKA`                 | — bisa jalan tanpa pemilik. Sebaiknya SESUDAH F3, karena F3 akan menambah kasus uji                                        |
| **F9**  | Lapisan backend                    | #6                                   | 6–10 | Tinggi            | `TERBUKA`                 | — bisa jalan tanpa pemilik, tapi butuh F7 & F8 lebih dulu sebagai pengaman                                                  |
| **F10** | Arsitektur frontend                | #5, #7, #21                          | 8–15 | **Sangat tinggi** | `TERBUKA`                 | — bisa jalan tanpa pemilik, tapi JANGAN sebelum F8. Merefactor 4.581 baris `AppContainer` dengan jaring pengaman sekarang adalah judi |
| **F11** | **Drive-per-user — JALUR RILIS**   | #30 (prasyarat #46)                  | 6–10 | **Tinggi**        | `SIAP DIRANCANG`          | **PEMILIK, 3 hal.** 6 keputusan desain sudah DIJAWAB 16 Agu (§11.1). Sisa: konfirmasi D1b & D3b · perbaiki **#46** (`SSO_ALLOWED_DOMAINS=gmail.com` membatalkan asumsi kuota corporate, §11.1b) · setujui rancangan penyimpanan refresh token terenkripsi |
| **F12** | Konsolidasi desain                 | #14, #13                             | 2–3  | Rendah            | `TERBUKA`                 | — bisa jalan tanpa pemilik. Sebaiknya SESUDAH F3, yang akan mendata sendiri layar mana yang kontras & jarak sentuhnya bermasalah |

\*Perkiraan kasar dan **belum terverifikasi** — untuk membandingkan bobot antar
fase, bukan janji jadwal. Perbarui dengan angka nyata setelah fase pertama tutup.

### Cara membaca kolom "TERTAHAN OLEH APA"

Kolom ini menggantikan kolom lama "Perlu pemilik?", yang hanya menjawab **ya/tidak**
dan karena itu tidak pernah cukup: ia tidak memberi tahu apa yang sebenarnya
harus dilakukan, sehingga tiap sesi harus menggali ulang.

| Isi kolom | Artinya |
| --------- | ------- |
| `— tidak ada` | Fase tutup, atau tidak ada penghalang sama sekali |
| `— bisa jalan tanpa pemilik` | Boleh dimulai kapan saja. Catatan sesudahnya menerangkan **urutan yang disarankan**, bukan penghalang |
| **PEMILIK** | Benar-benar berhenti sampai pemilik proyek bertindak. Tindakannya ditulis persis, bukan "menunggu keputusan" |

**Aturan mengisinya:** tulis TINDAKAN yang menutup penghalang, bukan perasaan
tentangnya. "Menunggu keputusan" tidak berguna; "tetapkan peran mana yang boleh
menghapus dokumen" bisa langsung dikerjakan. Bila sebuah fase tertahan lebih dari
satu hal, sebut semuanya beserta nomor itemnya — supaya sekali duduk bisa
diselesaikan sekaligus.

**Perbarui kolom ini setiap kali status fase berubah.** Kolom yang basi lebih
berbahaya daripada kolom kosong: F2 sempat tertulis `JALAN gel. 2 tutup` padahal
audit sudah sampai gelombang 6 — dan itu baru ketahuan karena pemilik proyek
menanyakannya.

### Prinsip urutan

Fase disusun berdasarkan **ketergantungan**, bukan severity:

> **Tahu dulu** (F0 dokumen, F2 logika, F3 UI) → **buka jalan rilis** (F1) →
> **kemenangan murah** (F4, F5) → **tebalkan jaring pengaman** (F6) →
> **baru** bongkar arsitektur (F7, F8) → **rapikan** (F9).

Tiga alasan urutan ini yang perlu dipahami sebelum menggesernya:

1. **F2 & F3 (audit) sengaja di depan.** Keduanya bisa **menambah item baru** ke
   fase-fase sesudahnya. Mengerjakan F7/F8 lebih dulu berarti merefactor kode
   yang belum diketahui benar-salahnya — kalau logikanya memang keliru, kita
   memindahkan bug ke tempat yang lebih rapi.
2. **F5 (zod) mendahului F7 (repository).** Menulis skema memaksa bentuk data
   tiap endpoint jadi eksplisit, dan bentuk itulah bahan mentah repository.
   Dibalik urutannya = merancang repository di atas tipe yang masih `any`.
3. **F6 (jaring pengaman) wajib sebelum F9–F10.** Refactor besar dengan 84 test
   dan 1.313 `any` sebagai satu-satunya pengaman adalah judi — persis kondisi
   yang dulu menghasilkan "28/28 test lolos tapi AppContainer crash".

### Fase yang terblokir boleh dilewati sementara

**F1 dan F3 menunggu pemilik proyek** (kredensial bucket, sesi login). Bila
keduanya belum siap, **lanjutkan ke fase berikutnya** — jangan berhenti menunggu.
Yang tidak boleh: menutup F1/F3 tanpa gerbangnya lulus, atau **merilis ke
production** selama F1 belum tutup.

### Gerbang antar fase

Gerbang dasar berlaku di **SEMUA** fase:

```bash
npm run doctor && npm run lint && npm test && npm run build
# lalu WAJIB: npm run dev -> buka browser -> pastikan UI benar-benar tampil
```

Build hijau bukan bukti aplikasi jalan (§12 aturan 1). **Gerbang tidak lulus bila
langkah browser dilewati.** Tiap fase menambahkan gerbang khususnya sendiri.

---

### F0 · Kejelasan & fondasi dokumen

**Kenapa pertama.** Semua fase berikutnya membaca dokumen dan schema. Selama ada
tiga sistem migrasi dan angka dokumen yang salah, setiap keputusan sesudahnya
berdiri di atas informasi keliru. Biayanya paling rendah di seluruh peta.

| Item | Pekerjaan                               | Definisi selesai                                                                                                   |
| ---- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| #1   | Satukan tiga sistem migrasi jadi satu   | Hanya satu jalur migrasi tersisa; dua lainnya dihapus **setelah** isinya terbukti tercakup                         |
| #10  | Dokumentasikan schema DB                | Daftar tabel + kolom diambil dari **database hidup**, bukan pemindaian teks; standar penamaan diputuskan & ditulis |
| #12  | Perbaiki angka drift di ARCHITECTURE.md | Angka ARCHITECTURE.md == angka AUDIT.md                                                                            |

**Syarat masuk:** tidak ada.

**Gerbang keluar:** gerbang dasar + `npm run db:migrate` pada database bersih
menghasilkan schema yang identik dengan production.

**Perintah pembuktiannya:**

```bash
npm run db:verify-schema
```

⚠️ **RIWAYAT — gerbang ini sempat DICABUT 16 Agu 2026.** Diukur pada tanggal yang
sama: 13 tabel drift dan 54 kolom ada di database hidup tetapi tidak akan dibuat
migrasi (§13.14, item #79). Syaratnya **tidak terpenuhi**, dan besar kemungkinan
tidak pernah benar-benar diuji — karena tidak ada perintah untuk menjalankannya.

Diperbaiki pada hari yang sama: migrasi disamakan dengan production, dan
gerbangnya diberi perintah yang bisa dijalankan siapa pun. Kini LULUS 3× berturut-
turut, dan **gagal secara jelas** bila migrasi kembali menyimpang.

Pelajarannya melampaui F0: **gerbang bisa dinyatakan lulus tanpa dijalankan.**
Untuk gerbang yang menuntut lingkungan bersih, tulis perintah pembuktiannya —
jangan hanya kalimat syaratnya.

⚠️ **Jangan menghapus sistem migrasi apa pun sebelum membandingkan daftar tabel
DAN kolomnya**, bukan hanya nama berkasnya. Ini operasi yang tidak bisa dibatalkan
kalau ternyata ada kolom yang hanya didefinisikan di sistem yang dibuang.

---

### F1 · Buka jalan ke production

**Kenapa di sini.** Ini satu-satunya fase yang benar-benar **memblokir rilis**.

| Item | Pekerjaan                      | Definisi selesai                                              |
| ---- | ------------------------------ | ------------------------------------------------------------- |
| #2   | Jalankan driver `s3` sungguhan | Urutan wajib di §6.1: **(f) dulu → (d)(e) → baru uji bucket** |
| #15  | Cabut 2 Google API key lama    | Dikonfirmasi tercabut di Google Cloud Console                 |

**Syarat masuk (dari pemilik proyek):**

1. Isi 6 variabel `STORAGE_*` di `.env`.
2. Jawab: dokumen QA & rekaman rapat tetap lewat penjaga auth server
   (**rekomendasi: ya**), atau boleh disajikan langsung dari bucket publik?

**Gerbang keluar:** unggah 1 avatar + 1 rekaman → **muncul di bucket** DAN
**tampil di browser** → objek uji dihapus. `npm run doctor` HIJAU.

⚠️ **Doctor hijau bukan bukti jalur s3 jalan** (§6.1) — pemeriksanya tidak pernah
menyentuh bucket. Gerbang ini hanya lulus lewat unggahan nyata.

---

### F2 · Audit & perbaikan LOGIKA

**Kenapa fase tersendiri.** Audit 15 Agu 2026 mengukur **struktur** — jumlah
berkas, baris, query, endpoint. **Tidak satu pun mengukur apakah logikanya
benar.** Lubang ini tidak terlihat sampai ditanyakan, dan itu persis alasan ia
sekarang jadi fase bernomor.

Bisa dikerjakan **tanpa login** — telaah lewat pembacaan kode + pengujian
endpoint yang tidak butuh auth.

| Item | Pekerjaan                                                        | Definisi selesai                                                                              |
| ---- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| #16  | Audit logika menyeluruh (cakupan di §13)                         | Tiap domain punya catatan temuan; tiap temuan jadi item bernomor di papan                     |
| #18  | notebook-lm: kunci token salah + endpoint wiki tak ada           | **Menunggu keputusan** — perbaikannya kecil tapi MENGUBAH PERILAKU                            |
| #19  | `POST /api/db-query` tanpa penjaga read-only                     | **Menunggu keputusan** — mengaktifkan penjaga MEMATIKAN fitur ubah/hapus baris di DB Explorer |
| #20  | Kode mati DB Explorer (toggle mode + request sia-sia tiap mount) | **Menunggu keputusan** — konfirmasi memang tak terpakai                                       |

**Syarat masuk:** tidak ada untuk #16. Item #18–#20 butuh keputusan pemilik.

**Gerbang keluar:** seluruh cakupan §13 tertelaah + setiap temuan sudah masuk
papan §1 dengan nomor & fase, bukan mengendap sebagai catatan.

⚠️ **Audit ini tidak boleh mengubah source untuk pembuktian** (§12 aturan 4).
Bila perlu membuktikan sebuah dugaan, lakukan di salinan di luar repo.

⚠️ Temuan F2 kemungkinan besar **menambah pekerjaan di F7–F10**. Itu memang
tujuannya — lebih baik ketahuan sekarang daripada saat refactor berjalan.

---

### F3 · Audit UI menyeluruh

**Kenapa fase tersendiri.** Dari 21 fitur, **nol** yang pernah dibuka di browser.
Satu-satunya layar yang benar-benar terlihat adalah halaman Sign In. Yang selama
ini disebut "audit UI" sebenarnya hitungan berkas lewat grep — itu mengukur
kepatuhan token, bukan apakah layarnya tampil benar.

| Item | Pekerjaan                                    | Definisi selesai                                                        |
| ---- | -------------------------------------------- | ----------------------------------------------------------------------- |
| #17  | Sisir 21 fitur di browser (checklist di §14) | Tiap fitur punya catatan: tampil/rusak, terang & gelap, 375px & desktop |

**Syarat masuk:** **pemilik proyek login lebih dulu.** Kredensial tidak boleh
dimasukkan oleh siapa pun selain pemilik (§12).

**Gerbang keluar:** 21 fitur tercatat statusnya + kontras sidebar & jarak target
sentuh **diukur ulang** (angka saat ini warisan audit lama) + tiap kerusakan jadi
item bernomor di papan §1.

⚠️ Jangan memperbaiki apa pun selama F3 — F3 **mencatat**, perbaikannya masuk
fase yang sesuai. Mencampur audit dengan perbaikan membuat cakupannya kabur.

---

### F4 · Performa muat

**Kenapa di sini.** Biaya paling rendah dengan dampak paling terasa bagi pengguna,
dan **tidak bergantung pada fase mana pun**. Menundanya sampai setelah F7/F8
berarti setiap modul baru memperburuk bundel lebih dulu.

| Item | Pekerjaan                                                              | Definisi selesai                     |
| ---- | ---------------------------------------------------------------------- | ------------------------------------ |
| #3   | 19 import statis di `AppRoutes.tsx` → `React.lazy` + satu `<Suspense>` | Tiap fitur besar jadi chunk terpisah |

**Target terukur:** bundle utama gzip **898 KB → di bawah 400 KB**.

**Gerbang keluar:** gerbang dasar + ukur ulang dengan perintah bundle di §9
(**setelah `npm run build`, bukan `npm run dev`**) + buka minimal 5 view berbeda
di browser, pastikan tidak ada layar kosong saat chunk dimuat.

---

### F5 · SSO Google/Microsoft (poin 1)

Dipecah 5 sub-fase. **Tiap sub-fase satu branch, merge ke `main` hanya bila
gerbangnya lulus.** Sub-fase adalah titik berhenti yang aman — bila satu gagal,
yang sudah ter-merge tetap sehat.

#### F5.1 · Keputusan & desain — ✅ SELESAI 15 Agu 2026

> **Seluruh 5 keputusan sudah ditetapkan pemilik proyek.** Tidak ada lagi yang
> menggantung; F5.3 dan seterusnya boleh berjalan tanpa menunggu jawaban.
>
> | #   | Ketetapan                                                                          |
> | --- | ---------------------------------------------------------------------------------- |
> | 1   | Google **dan** Microsoft, satu adaptor OIDC                                        |
> | 2   | Penautan **hanya** bila `email_verified=true`                                      |
> | 3   | Email tidak terdaftar → tombol LOGIN menolak; tombol DAFTAR membuat akun `pending` |
> | 4   | Batas domain **wajib**, dari env                                                   |
> | 5   | Login username+password & form daftar manual **tidak berubah**                     |
>
> Username akun SSO: **opsi C** — layar "Lengkapi Pendaftaran" setelah SSO.

**KONSEP LOGIN LANPRO — ditetapkan pemilik proyek, 15 Agu 2026.**

> ## ⛔ BATASAN MUTLAK F5
>
> **F5 hanya MENAMBAH. Tidak ada satu pun perilaku lama yang boleh berubah.**
>
> Dua jalur berikut **wajib tetap berfungsi persis seperti sekarang**:
>
> | Jalur lama | Isi                             | Status                  |
> | ---------- | ------------------------------- | ----------------------- |
> | **Login**  | Username + password             | **TIDAK BOLEH BERUBAH** |
> | **Daftar** | Nama, username, email, password | **TIDAK BOLEH BERUBAH** |
>
> Yang ditambahkan hanyalah **tombol**: Google & Microsoft di halaman login,
> dan Google & Microsoft di halaman daftar. Penambahan, bukan penggantian.
>
> Termasuk yang tidak boleh berubah:
>
> - Aturan validasi username (huruf saja, maks 10 karakter, unik)
> - Aturan kekuatan password (min 8, huruf besar, huruf kecil, angka, simbol)
> - Status awal pendaftaran manual
> - Perilaku `currentSessionToken` & force-logout
> - Pesan galat yang sudah ada
>
> **Ini diuji di SETIAP sub-fase F5, bukan hanya di akhir** (§16 syarat 4).
> Bila salah satu jalur lama berubah perilakunya, sub-fase itu tidak lulus
> gerbang — walaupun fitur barunya sudah berfungsi.

LanPro punya **tepat dua metode login**:

| Metode                           | Cara                                         | Status              |
| -------------------------------- | -------------------------------------------- | ------------------- |
| 1. Username + password           | Yang berjalan sekarang                       | Tetap dipertahankan |
| 2. Login with Google / Microsoft | Ikon di layar Sign In → redirect ke provider | Dibangun di F5      |

**SSO adalah pintu MASUK, bukan pintu DAFTAR.** Bila email dari provider tidak
terdaftar di LanPro, sistem menampilkan **notifikasi** dan menolak — **tidak**
membuat akun baru, tidak membuat akun `pending`.

Konsekuensinya: pendaftaran user tetap lewat jalur yang ada sekarang. SSO tidak
menambah cara baru untuk masuk ke sistem — ia hanya menambah cara baru untuk
membuktikan identitas user yang **sudah** ada.

##### Alur yang harus dibangun

1. Halaman login menampilkan form username+password **yang ada sekarang**, tanpa
   perubahan perilaku, **ditambah** dua tombol: "Login with Google" dan
   "Login with Microsoft".
2. User mengklik salah satu → diarahkan ke layar pemilihan akun milik provider.
3. Provider mengembalikan identitas (email + `email_verified`).
4. LanPro mencocokkan email itu dengan user terdaftar.
5. **Cocok & memenuhi syarat** → masuk, terbitkan JWT LanPro yang sama seperti
   login biasa.
6. **Tidak terdaftar** → tampilkan "Akun Anda belum terdaftar". Berhenti di situ.

⚠️ **Tidak ada metode ketiga.** Mengetik alamat email di kolom username pada form
biasa **bukan** bagian dari konsep ini — lihat item #31 yang dibatalkan.

##### Konsep PENDAFTARAN — ditetapkan 15 Agu 2026

Selain login, **pendaftaran** juga punya dua jalur:

| Jalur                                 | Cara                     | Hasil                                        |
| ------------------------------------- | ------------------------ | -------------------------------------------- |
| 1. Form pendaftaran                   | Yang berjalan sekarang   | Akun dibuat                                  |
| 2. "Daftar dengan Google / Microsoft" | Klik tombol → pilih akun | Akun dibuat **otomatis**, `status = pending` |

Akun hasil jalur 2 **belum bisa dipakai** sampai admin memvalidasinya — sama
seperti jalur 1 yang juga berstatus `pending`.

**Perbedaan tombol LOGIN dan tombol DAFTAR — jangan tertukar:**

| Tombol                             | Email belum terdaftar                                                |
| ---------------------------------- | -------------------------------------------------------------------- |
| **Login** with Google/Microsoft    | **Tolak** + pesan "Akun Anda belum terdaftar". Tidak membuat apa pun |
| **Daftar** dengan Google/Microsoft | **Buat akun** berstatus `pending`                                    |

⚠️ **Konsekuensi keamanan: batas domain kembali WAJIB.**

Selama SSO hanya untuk login, daftar user sudah berfungsi sebagai allowlist
sehingga batas domain cukup bersifat opsional. Dengan adanya daftar-via-SSO,
alasan itu gugur: siapa pun ber-Gmail bisa membuat akun. Walau berstatus
`pending`, dampaknya nyata — tabel `Users` bisa dibanjiri, admin menerima
antrean persetujuan tak berujung, dan ini menjadi endpoint tulis yang dapat
dipanggil tanpa autentikasi.

Wajib menyertainya:

| Pengaman                    | Catatan                                                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Daftar domain diizinkan** | Dari env. Di luar daftar → tolak                                                                                                     |
| **Rate limit**              | Pakai `registerLimiter` yang ada — 5/jam, `skipSuccessfulRequests` **mati**, karena pada register justru keberhasilan yang berbahaya |
| **`email_verified=true`**   | Tanpa ini, orang bisa mendaftar memakai alamat email orang lain                                                                      |
| **Email sudah terdaftar**   | Tolak dengan pesan jelas, jangan buat duplikat                                                                                       |

##### Username untuk akun SSO — DITETAPKAN: opsi C

Pendaftaran sekarang mewajibkan `username`: `UNIQUE NOT NULL`, **huruf saja,
maksimal 10 karakter** (skema zod di `auth.routes.ts`). Google dan Microsoft
hanya memberi **email dan nama** — tidak ada username.

| Opsi                                          | Contoh untuk `budi.santoso@perusahaan.com` | Masalah                                   |
| --------------------------------------------- | ------------------------------------------ | ----------------------------------------- |
| A · Otomatis dari nama                        | `budisantos`                               | Tabrakan bila sudah dipakai               |
| B · Otomatis + angka bila bentrok             | `budisanto2`                               | Username jadi tidak enak dibaca           |
| **C · Tanya user setelah SSO** ✅ **DIPILIH** | user memilih sendiri                       | Satu layar tambahan, tapi paling bersih   |
| D · Longgarkan aturan, pakai email            | `budi.santoso@…`                           | **Membatalkan pengaman** — jangan dipakai |

⚠️ **Opsi D jangan dipilih.** Aturan huruf-saja maks 10 karakter itulah yang
membuat sebuah email tidak mungkin menyamai username siapa pun. Melonggarkannya
membuka kemungkinan query pencocokan identitas mengembalikan lebih dari satu
baris, sementara kode mengambil `rows[0]`.

**Ketetapan pemilik proyek: opsi C.** Setelah provider mengembalikan identitas,
user diarahkan ke satu layar "Lengkapi Pendaftaran" untuk memilih username
sendiri. Aturan lama tetap utuh: huruf saja, maksimal 10 karakter, unik.

Yang harus dibangun karena pilihan ini:

| Komponen                                | Catatan                                                                           |
| --------------------------------------- | --------------------------------------------------------------------------------- |
| Layar "Lengkapi Pendaftaran"            | Menampilkan email & nama dari provider (tidak bisa diubah), user mengisi username |
| Validasi username **langsung di layar** | Huruf saja, maks 10, dan **cek ketersediaan** sebelum kirim                       |
| State sementara antar langkah           | Identitas provider harus bertahan sampai username dipilih, **berbatas waktu**     |
| Penanganan user membatalkan             | Jangan tinggalkan akun setengah jadi di database                                  |

⚠️ **Akun baru dibuat setelah username dipilih, bukan sebelumnya.** Bila akun
dibuat lebih dulu lalu user menutup layar, tabel `Users` akan terisi baris tanpa
username yang melanggar `NOT NULL` — atau lebih buruk, terisi username
sementara yang tidak pernah diperbaiki.

⚠️ State sementara itu **jangan** disimpan di localStorage tanpa tanda tangan —
isinya menentukan identitas akun yang akan dibuat.

##### Password untuk akun SSO

Akun hasil daftar-SSO tidak punya password. `Users.passwordHash` sudah nullable
sehingga tidak perlu perubahan schema — **tetapi endpoint login password wajib
menolak user berpassword `NULL`.** Jangan sampai string kosong lolos sebagai
password yang sah.

##### Email selamat datang

Akun yang lahir lewat jalur SSO juga harus menerima email selamat datang
(item #26, fase F6). Isinya harus jujur menyebut status `pending` —
"berhasil daftar, menunggu persetujuan admin", bukan "akun aktif".

##### Keputusan resmi

| #   | Keputusan             | Ketetapan                                                                                                                                        | Kalau salah pilih                                  |
| --- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| 1   | Provider              | **Google & Microsoft** — keduanya OIDC, satu adaptor generik melayani dua-duanya                                                                 | Pilih satu lalu menambah nanti = rombak adaptor    |
| 2   | Penautan akun         | ✅ **DISETUJUI 15 Agu 2026** — tautkan ke akun yang ada **HANYA bila `email_verified=true`** dari provider                                       | Tanpa syarat itu → **pengambilalihan akun**        |
| 3   | Email tidak terdaftar | **Tolak + tampilkan notifikasi.** Jangan buat akun                                                                                               | Auto-daftar = pintu masuk tanpa penjaga            |
| 4   | Batas domain          | **WAJIB** — daftar domain diizinkan, dari env. (Sempat diturunkan jadi opsional saat SSO hanya untuk login; naik lagi karena ada daftar-via-SSO) | Tanpa batas, siapa pun ber-Gmail bisa membuat akun |
| 5   | Password lama         | Tetap hidup berdampingan                                                                                                                         | Mematikannya mengunci user tanpa akun provider     |

##### Riwayat keputusan #4 — kenapa sempat berubah dua kali

Dicatat supaya alasannya tidak hilang, dan supaya tidak ada yang menurunkannya
lagi tanpa menyadari akibatnya.

| Tahap                                 | Status         | Alasan                                                                                   |
| ------------------------------------- | -------------- | ---------------------------------------------------------------------------------------- |
| Awal                                  | **Wajib**      | Tanpa batas, siapa pun ber-Gmail bisa mendaftar lewat SSO                                |
| Saat SSO ditetapkan hanya untuk login | Opsional       | Yang bisa masuk hanya email terdaftar, sehingga daftar user sendiri sudah jadi allowlist |
| **Setelah daftar-via-SSO ditetapkan** | **Wajib lagi** | Alasan di atas gugur — pendaftaran otomatis membuka kembali pintu bagi email mana pun    |

Yang berubah adalah konsepnya, bukan analisanya.

##### Pesan notifikasi yang dibutuhkan

Layar Sign In harus bisa menampilkan sebab penolakan secara spesifik — pesan
generik akan membuat user mengira aplikasinya rusak:

| Sebab                                      | Pesan yang ditampilkan                                                     |
| ------------------------------------------ | -------------------------------------------------------------------------- |
| Email tidak terdaftar                      | "Email ini belum terdaftar di LanPro. Hubungi admin untuk dibuatkan akun." |
| Email provider belum terverifikasi         | "Email Google/Microsoft Anda belum terverifikasi."                         |
| Akun ada tapi `status` bukan aktif         | "Akun Anda belum aktif. Menunggu persetujuan admin."                       |
| Identitas provider sudah tertaut user lain | Pesan netral — jangan bocorkan milik siapa                                 |
| Gagal di sisi provider                     | "Login dibatalkan atau gagal. Silakan coba lagi."                          |

⚠️ Keputusan #2 adalah **satu-satunya lubang keamanan serius** di rencana ini.
Penautan dilakukan berdasarkan email; tanpa memeriksa `email_verified`, seseorang
bisa membuat akun provider memakai alamat email orang lain lalu tertaut ke akun
LanPro milik korban. Ini **tetap berlaku** walaupun SSO tidak membuat akun baru —
justru di sinilah risikonya, karena akun korban sudah ada.

**Definisi selesai:** kelima keputusan tertulis di dokumen ini sebagai ketetapan
resmi.

#### F5.2 · Pecah `auth` jadi berlapis (item #11)

`auth` kini **762 baris, nol lapisan** — satu-satunya fitur berskor 0/4.
Menempelkan OIDC ke situ menjadikannya ±1.200 baris tanpa struktur, tepat di
fitur paling sensitif keamanannya.

| Pekerjaan                                                  | Definisi selesai                                  |
| ---------------------------------------------------------- | ------------------------------------------------- |
| Pecah `src/features/auth`                                  | `types.ts`, `services/`, komponen bernama         |
| Pecah `server/routes/auth.routes.ts` (620 baris, 13 query) | Logika turun ke `server/services/auth.service.ts` |

**Gerbang:** gerbang dasar + himpunan rute sebelum/sesudah **identik** + `diff`
keluaran `tsc` baris-per-baris.

⚠️ Verifikasi rute lewat status 401 **tidak valid** — pakai perbandingan
himpunan rute.

#### F5.3 · Fondasi OIDC generik — ✅ SELESAI 15 Agu 2026

> **Hasil:** `server/services/oidc.service.ts` (327 baris) + 22 test.
> **Nol dependensi baru** — verifikasi JWKS memakai `crypto.createPublicKey`
> format JWK yang sudah ada di Node 24, sehingga `jwks-rsa`/`jose` tidak perlu.
>
> State disimpan sebagai **token bertanda tangan**, bukan di memori proses.
> Memori tidak bisa diandalkan di serverless: tiap instance punya memorinya
> sendiri, sehingga pengguna yang kembali dari provider bisa mendarat di
> instance lain dan login gagal secara acak.
>
> Dua kebijakan memilih sisi aman: `email_verified` yang tidak ada dianggap
> **belum** terverifikasi (Microsoft tidak selalu mengirimnya), dan
> `SSO_ALLOWED_DOMAINS` kosong berarti **menolak semua**.
>
> ⚠️ Belum menyentuh rute maupun UI — itu F5.4 dan F5.5.

Google dan Microsoft sama-sama OpenID Connect → **satu adaptor melayani
keduanya**; yang berbeda hanya URL discovery dan client id/secret.

| Komponen                                                                  | Catatan                                          |
| ------------------------------------------------------------------------- | ------------------------------------------------ |
| Discovery endpoint per provider                                           | dari env, **tanpa fallback ter-hardcode** (§3.2) |
| Redirect + `state` (anti-CSRF) + **PKCE**                                 | `state` sekali pakai, ada kedaluwarsa            |
| Callback: tukar `code` → `id_token`                                       |                                                  |
| **Verifikasi `id_token`**: signature (JWKS), `iss`, `aud`, `exp`, `nonce` | inti keamanannya                                 |
| Keluaran seragam `{provider, sub, email, email_verified, name}`           |                                                  |

⚠️ **Jangan pakai `passport`** — ia berbasis session, LanPro memakai JWT +
`currentSessionToken`. Mencampurnya menghasilkan dua sistem sesi.

⚠️ **Cukup scope `openid email profile`.** Jangan minta scope Drive di sini;
bila F11 jadi dikerjakan, scope ditambah lewat consent terpisah. Meminta akses
Drive di layar login membuat user menolak consent.

**Definisi selesai:** `id_token` palsu / kedaluwarsa / salah `aud` **ditolak**,
dibuktikan lewat test.

#### F5.4 · Provider + kebijakan akun

| Aturan                                    | Perilaku                                                                                   |
| ----------------------------------------- | ------------------------------------------------------------------------------------------ |
| `email_verified=false`                    | **Tolak**, jangan tautkan                                                                  |
| Email cocok user yang ada                 | Tautkan — simpan `provider` + `sub`                                                        |
| **Email belum terdaftar — tombol LOGIN**  | **TOLAK + notifikasi.** Jangan buat akun                                                   |
| **Email belum terdaftar — tombol DAFTAR** | Lanjut ke layar "Lengkapi Pendaftaran"; akun dibuat `pending` **setelah** username dipilih |
| Domain di luar daftar yang diizinkan      | **TOLAK** — berlaku untuk kedua tombol                                                     |
| Akun ada tapi belum aktif                 | Tolak, pesan "menunggu persetujuan admin"                                                  |
| Domain di luar daftar (bila dipakai)      | Tolak dengan pesan jelas                                                                   |
| `sub` sudah tertaut user lain             | Tolak — jangan pindahkan tautan diam-diam                                                  |

**Skema:** tabel `UserIdentities` (`user_id`, `provider`, `sub`, unik pada
`provider+sub`) — **bukan** kolom baru di `Users`, supaya satu user bisa punya
Google **dan** Microsoft.

⚠️ `Users.passwordHash` sudah nullable, jadi user SSO tanpa password tidak butuh
perubahan schema. Tapi **pastikan login password menolak user berpassword
`NULL`** — jangan sampai string kosong lolos sebagai password sah.

#### F5.5 · Frontend, sesi & pengujian

| Pekerjaan                                             | Catatan                                                   |
| ----------------------------------------------------- | --------------------------------------------------------- |
| Tombol "Masuk dengan Google / Microsoft"              | ≥44px (§6.3), pakai token warna (§6.1)                    |
| Halaman callback + status memuat                      |                                                           |
| Pesan galat spesifik                                  | domain ditolak, email belum terverifikasi, akun `pending` |
| **Terbitkan JWT LanPro yang sama** setelah SSO sukses | jangan bikin jenis sesi kedua                             |
| Hormati `currentSessionToken` & force-logout          | sesi tunggal sudah ditegakkan                             |

⚠️ Kunci token di `localStorage` adalah **`lanpro_jwt_token`**. Jangan mengulang
kesalahan notebook-lm (#18) yang memakai `'token'` sehingga header terkirim
kosong.

**Gerbang keluar F5** (selain gerbang dasar):

| Uji                                                 | Harus                                                                             |
| --------------------------------------------------- | --------------------------------------------------------------------------------- |
| Login Google akun terdaftar                         | Masuk, JWT terbit                                                                 |
| Login Microsoft akun terdaftar                      | Masuk                                                                             |
| Email di luar domain                                | Ditolak, pesan jelas                                                              |
| `email_verified=false`                              | Ditolak                                                                           |
| Email belum terdaftar → tombol LOGIN                | Ditolak + notifikasi jelas, **tidak** membuat akun                                |
| Email belum terdaftar → tombol DAFTAR               | Layar "Lengkapi Pendaftaran" muncul; akun jadi `pending` setelah username dipilih |
| User membatalkan di layar "Lengkapi Pendaftaran"    | **Tidak ada baris tersisa** di tabel `Users`                                      |
| Email di luar domain → tombol DAFTAR                | Ditolak, tidak membuat akun                                                       |
| Daftar berulang dengan email sama                   | Ditolak, tidak membuat duplikat                                                   |
| Ikon Google & Microsoft di Sign In                  | Tampil, ≥44px, pakai token warna                                                  |
| `id_token` palsu/kedaluwarsa                        | Ditolak — **uji di salinan luar repo**                                            |
| **Login username + password lama**                  | ✅ wajib — persis seperti sebelum F5                                              |
| **Daftar manual (nama, username, email, password)** | ✅ wajib — persis seperti sebelum F5                                              |
| Aturan validasi username & password                 | ✅ wajib — tidak berubah                                                          |
| Force-logout                                        | Sesi SSO ikut mati                                                                |

---

### F6 · Email: 3 fungsi (poin 2, 3, 4)

#### F6.1 · Bersihkan pondasi lebih dulu (prasyarat)

Tiga temuan ini **harus beres sebelum** `email.service.ts` dibangun — kalau
tidak, cacatnya ikut tersalin ke kanal baru.

| #   | Temuan                                                                                                                   | Definisi selesai                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| 22  | `initWhatsAppScheduler` di-import di `server.ts:57` tapi **tidak pernah dipanggil** → digest harian belum pernah menyala | Penjadwal benar-benar jalan, dibuktikan lewat log/uji                       |
| 23  | `WA_API_TOKEN` punya fallback ter-hardcode `'TOKEN_ANDA_DISINI'` — langgar §3.2                                          | Konfigurasi hilang **gagal terbuka**, bukan diam-diam pakai nilai lain      |
| 24  | `EmailConfigForm` 172 baris, **nol panggilan API**                                                                       | Ditelusuri: sudah punya backend atau belum. Jangan bangun konfigurasi kedua |

#### F6.2 · Fondasi `email.service.ts` (item #25)

| Komponen                                     | Catatan                                                    |
| -------------------------------------------- | ---------------------------------------------------------- |
| Pilih pengirim: SMTP sendiri vs layanan      | **menunggu keputusan pemilik**                             |
| `email.service.ts` — satu pintu keluar email | Meniru struktur `whatsapp.service.ts`, **tanpa** cacat #23 |
| Template terpisah dari logika                |                                                            |
| Log pengiriman gagal                         | Gagal kirim **tidak boleh** menggagalkan operasi utama     |

#### F6.3 · Email selamat datang (#26) & lupa password (#27)

**#26 — selamat datang.** Dikirim **setelah** transaksi commit. Kegagalan email
tidak menggagalkan pendaftaran.

⚠️ `Users.status` default `'pending'` — kalimat emailnya harus jujur. "Berhasil
daftar, menunggu persetujuan admin" berbeda dari "akun aktif".

**#27 — lupa password.** Pemilik proyek memilih **kirim password random**
(bukan tautan reset). Keputusan ini dicatat sebagai keputusan resmi.

Empat pengaman yang **wajib** menyertainya:

| Pengaman                                          | Alasan                                                          |
| ------------------------------------------------- | --------------------------------------------------------------- |
| **Rate limit** endpoint reset                     | Pola `loginLimiter` sudah ada, tinggal dicontoh                 |
| **Balasan seragam** untuk email terdaftar & tidak | Tanpa ini endpoint jadi alat mendata user                       |
| **Wajib ganti password saat login berikutnya**    | Membatasi umur password yang pernah melintas sebagai teks polos |
| **Batalkan sesi aktif** setelah reset             | `currentSessionToken` sudah ada                                 |

⚠️ Password random yang dikirim lewat email **menetap di kotak masuk** dan tidak
punya kedaluwarsa. Pengaman "wajib ganti saat login berikutnya" adalah mitigasi
utamanya — jangan dilewati.

#### F6.4 · Digest task pending + jumlah (#28)

**Pondasinya sudah ada** di `whatsapp.service.ts` — tidak membangun dari nol.

| Komponen                                                        | Status                                                  |
| --------------------------------------------------------------- | ------------------------------------------------------- |
| Query task pending per user (`To Do`, `In Progress`, `Testing`) | ✅ sudah ada                                            |
| Penjadwal cron 07:00                                            | ✅ ada, **menyala setelah #22**                         |
| Format pesan                                                    | ✅ ada (WhatsApp)                                       |
| **Jumlah** task                                                 | ❌ pesan sekarang merinci daftar, tidak menyebut jumlah |
| Kanal email                                                     | ❌ belum ada                                            |
| Preferensi user (mau/tidak dikirimi)                            | ❌ belum ada                                            |

**Menunggu keputusan:** email menggantikan WhatsApp, atau keduanya berjalan?

**Gerbang keluar F6:** gerbang dasar + tiap jenis email benar-benar **diterima di
kotak masuk sungguhan** (bukan hanya "tidak error di log") + digest memuat jumlah
yang **cocok** dengan isi DB.

---

### F7 · Kontrak & validasi

| Item | Pekerjaan                     | Definisi selesai                                          |
| ---- | ----------------------------- | --------------------------------------------------------- |
| #4   | Skema zod untuk ±100 endpoint | Tiap endpoint memvalidasi body/param sebelum menyentuh DB |

**Syarat masuk:** F2 tutup — temuan logika menentukan bentuk skema yang benar.

**Kerjakan per domain**, bukan sapuan sekali jadi. Urutan mengikuti bobot query
di §3.1: `auth` → `task` → `qa` → `project` → sisanya.

**Gerbang keluar per domain:** gerbang dasar + himpunan rute sebelum/sesudah
identik.

⚠️ **Jangan verifikasi rute lewat status 401** — middleware auth berjalan sebelum
handler 404, jadi rute palsu pun menjawab 401 (§12).

---

### F8 · Jaring pengaman

**Kenapa wajib sebelum F9–F10.** Fase ini yang menentukan apakah dua fase terakhir
aman dikerjakan.

| Item | Pekerjaan                                              | Definisi selesai                                                        |
| ---- | ------------------------------------------------------ | ----------------------------------------------------------------------- |
| #9   | Tambah test, prioritaskan **test render** jalur kritis | Tiap fitur besar punya minimal 1 test render (saat ini hanya flowchart) |
| #8   | Kurangi `any` **di jalur yang akan disentuh F9–F10**   | `AppContainer`, `AppRoutes`, rute ber-query terbanyak tidak lagi `any`  |

**Target terukur:** rasio test 1:1.000 → **1:400 atau lebih baik**; `any` 1.313 →
**di bawah 900**.

⚠️ **Jangan mengejar angka `any` secara global.** Yang bernilai hanya `any` di
jalur yang akan di-refactor.

⚠️ Setelah menambah test, **periksa jumlahnya benar-benar bertambah** — pernah
penyisipan gagal diam-diam karena Prettier (§12).

**Gerbang keluar:** gerbang dasar + jumlah test naik terverifikasi + test render
sengaja dibuat merah **di salinan luar repo** untuk membuktikan ia benar-benar
menangkap crash.

---

### F9 · Lapisan backend

| Item | Pekerjaan                             | Definisi selesai                                       |
| ---- | ------------------------------------- | ------------------------------------------------------ |
| #11  | Pecah `auth` (762 baris, nol lapisan) | Dikerjakan **pertama** — kecil, sekaligus latihan pola |
| #6   | Bangun lapisan repository             | Query di `server/routes/` **222 → 0**                  |

**Syarat masuk:** F8 lulus.

**Urutan per berkas** mengikuti bobot di §3.1: `task` (46) → `qa` (33) →
`project` (30) → `meetings` (19) → sisanya.

⚠️ **Cek DOMAIN NYASAR lebih dulu.** Pelajaran dari dua langkah L4 sebelumnya:
kalau ada domain nyasar di berkas itu, **pecah domainnya dulu** — jauh lebih
murah dan aman daripada membangun repository di atas berkas campur.

**Gerbang keluar:** gerbang dasar + perbandingan himpunan rute + `diff` keluaran
`tsc` baris-per-baris (bukan hitung total — sudah 4x menangkap simbol terlewat).

---

### F10 · Arsitektur frontend

**Fase paling berisiko di seluruh peta.** Jangan dimulai di sesi yang ruang
konteksnya sudah sempit.

| Item | Pekerjaan                                              | Definisi selesai                                                                           |
| ---- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| #5   | Routing sungguhan (react-router terpasang, menganggur) | URL berubah saat pindah view; deep-link & tombol back berfungsi; 47 props menyusut drastis |
| #7   | Pecah 37 berkas > 500 baris                            | Konsentrasi baris **59% → di bawah 35%**                                                   |
| #21  | Aktifkan `authStore` & `uiStore`                       | State auth bersumber dari satu tempat                                                      |

**Syarat masuk:** F8 lulus **dan** F9 lulus. Memindahkan routing sementara state
masih terikat `AppContainer` 4.481 baris akan menghasilkan dua sumber kebenaran.

⚠️ #21 `DITUNDA` dengan alasan yang masih berlaku: mengambil setter dari store
sementara state dibaca dari hook menghasilkan penulisan yang tidak dibaca siapa
pun — crash berubah jadi bug senyap yang jauh lebih sulit dilacak. Kerjakan hanya
**setelah** test render tebal (F8).

**Urutan aman memecah berkas** (ARCHITECTURE.md §2, risiko menaik):
tipe → fungsi murni → konstanta → panggilan API → **baru** komponennya.
Setelah **tiap langkah**, `diff` keluaran `tsc` baris-per-baris.

**Gerbang keluar:** gerbang dasar + klik seluruh menu sidebar di browser +
refresh di tiap view memuat view yang sama (bukti routing sungguhan).

---

### Item yang dibatalkan

**#31 · Login dengan email di kolom form** — `DIBATALKAN` 15 Agu 2026.

Item ini lahir dari salah tafsir atas permintaan "login dengan email". Yang
dimaksud pemilik proyek adalah **login lewat akun email Google/Microsoft (SSO)**,
bukan mengetik alamat email di kolom username. Konsep resmi hanya mengenal dua
metode login (lihat F5.1).

Barisnya sengaja tidak dihapus dari papan §1 agar alasan pembatalannya tercatat.

Catatan teknis yang tetap berguna: backend sudah menerima email —
`auth.routes.ts` memakai `WHERE username = ? OR email = ?` — sementara frontend
membuang semua karakter selain huruf. Keduanya tidak selaras, tetapi **bukan
celah keamanan**: aturan username saat ini (huruf saja, maks 10 karakter)
membuat sebuah email tidak mungkin menyamai username siapa pun, dan kolom
`username` maupun `email` sama-sama `UNIQUE`. Jadi query itu tidak pernah bisa
mengembalikan dua baris dengan data yang sah.

**Belum terverifikasi** terhadap isi database sungguhan. Bila suatu saat aturan
username dilonggarkan, tinjau ulang — kode mengambil `rows[0]` tanpa memeriksa
jumlah baris.

---

### F11 · Drive-per-user — JALUR RILIS sejak 16 Agu 2026

**Ketetapan pemilik proyek 16 Agu 2026:** driver `s3` (#2) **DITAHAN**. Storage
akan mengambil dari drive milik pengguna sendiri. Item #30 karena itu berhenti
menjadi opsional dan **menjadi arah resmi storage**.

⚠️ **Akibat yang harus disadari sebelum melangkah.** Sebelum keputusan ini, jalan
menuju rilis adalah F1 — satu fase kecil, 1–2 sesi, sebagian besar hanya mengisi
`.env`. Sesudah keputusan ini, jalan menuju rilis adalah F11 — **6–10 sesi,
risiko tinggi**, dan mengubah kontrak lapisan penyimpanan.

Selama F11 belum jadi, **risiko #2 berjalan terus**: berkas unggahan hilang
setiap kali deploy di Vercel, sementara baris database tetap menunjuknya. Itu
bukan alasan menolak keputusan ini — hanya harus tercatat, bukan terlupa.

#### 11.1 Enam keputusan desain — DIPUTUSKAN 16 Agu 2026

Dijawab pemilik proyek 16 Agu 2026. Dua di antaranya dikembalikan sebagai
pertanyaan balik dan dijawab dengan rekomendasi; keduanya menunggu konfirmasi
akhir (ditandai ⏳).

| # | Keputusan | Status |
| - | --------- | ------ |
| **D1** | Berkas tinggal di drive milik **pengunggah**, mengikuti akun email yang dipakai login | ✅ |
| **D1b** | Cara berbagi: **server sebagai perantara**, BUKAN tautan berbagi — lihat alasan di bawah | ⏳ rekomendasi |
| **D2** | Anggota lain membaca dari dalam LanPro. **Izin LanPro yang berlaku**: punya akses view/download di LanPro berarti bisa | ✅ |
| **D3** | Saat pemilik mencabut/mengganti: berkas tidak bisa diunduh | ✅ |
| **D3b** | Perilakunya dibedakan jadi **tiga keadaan** + pemeriksa terjadwal, bukan satu "not found" | ⏳ rekomendasi |
| **D4** | Data bisnis di drive pribadi **diterima untuk sekarang** | ✅ risiko diterima |
| **D5** | Google Drive **dan** OneDrive — akun corporate punya kuota besar | ✅ |
| **D6** | Kuota teratasi oleh D5 (drive corporate) | ✅ bersyarat |

##### D1b — kenapa BUKAN tautan berbagi

Konsekuensi langsung dari D2. Karena **LanPro yang memegang otoritas izin**,
tautan berbagi merusaknya total: siapa pun pemegang URL bisa membaca tanpa
LanPro pernah tahu, dan mencabut izin seseorang di LanPro tidak mencabut apa pun.

Itu juga persis kebocoran yang baru ditutup di **#67** — berkas terbaca tanpa
autentikasi. Memakai tautan berbagi berarti membukanya kembali, kali ini di
drive orang lain dan di luar jangkauan penjaga LanPro.

| | Tautan berbagi | Izin per-email | **Server perantara** |
| --- | :-: | :-: | :-: |
| Izin LanPro berlaku | ❌ | ❌ hanyut | ✅ |
| Cabut di LanPro langsung berlaku | ❌ | ❌ | ✅ |
| Anggota wajib punya akun provider | — | ❌ wajib | ✅ tidak |
| Bandwidth lewat server | ✅ tidak | ✅ tidak | ⚠️ ya |

⚠️ **Harga yang harus dibayar dan wajib ditangani:** LanPro menyimpan *refresh
token* drive tiap pengguna. Itu rahasia bernilai tinggi — **wajib terenkripsi
saat disimpan**, masuk daftar rotasi (§18.9 langkah 5), dan tercatat di §18.8
sebagai data rahasia. Ini syarat, bukan detail teknis yang bisa ditunda.

##### D3b — kenapa satu "not found" tidak cukup

Masalahnya bukan kata-katanya, melainkan **kapan orang tahu**. Dengan satu
pesan "not found", kehilangan berkas baru ketahuan **saat seseorang
membutuhkannya** — biasanya di saat paling genting.

| Keadaan | Yang dilihat pengguna | Yang terjadi di belakang |
| ------- | --------------------- | ------------------------ |
| Token dicabut / kedaluwarsa | "Pemilik berkas perlu menyambungkan ulang drive-nya" | Notifikasi ke **pemilik**, bukan ke yang mengunduh |
| Berkas dihapus/dipindah di drive | "Berkas sudah tidak ada di drive pemilik" | Ditandai di DB, tidak dicoba berulang |
| Pemilik keluar / akun nonaktif | Peringatan tingkat admin proyek | Daftar berkas terdampak |

Ditambah **pemeriksa terjadwal** yang menandai berkas bermasalah sebelum ada
yang membutuhkannya. Polanya sudah ada di repo ini — penjadwal digest (#22).

Dan satu hal kecil berdampak besar: **beri tahu saat mengunggah** bahwa
ketersediaan berkas bergantung pada akun pengunggah. Sekarang tidak ada yang
mengetahuinya.

#### 11.1b ⚠️ D5 & D6 bertabrakan dengan konfigurasi yang ada

Jawaban D5/D6 bersandar pada asumsi akun **corporate** yang kuotanya besar.
Konfigurasi sekarang menyatakan sebaliknya:

```
.env:26   SSO_ALLOWED_DOMAINS=gmail.com
```

Hanya akun **Gmail pribadi** yang bisa mendaftar, dan Gmail pribadi berbagi
**15 GB dengan Gmail serta Google Foto** — persis masalah D6 yang dikira sudah
teratasi oleh D5.

**Akibatnya #46 naik status.** Selama ini ia tercatat sebagai item keamanan
(siapa pun ber-Gmail bisa mendaftar); kini ia juga **prasyarat rencana storage**.
F11 tidak bisa memenuhi asumsi kuotanya sebelum `SSO_ALLOWED_DOMAINS` diisi
domain corporate.

Untuk OneDrive, syarat setaranya: akun Microsoft yang dipakai harus akun
organisasi (Microsoft 365), bukan akun Microsoft pribadi.

#### 11.2 Yang berubah di kode — bukan sekadar menambah driver ketiga

`storage.service` sekarang **tidak punya konsep pemilik**:

```ts
simpanBerkas(nama, isi, tipe)   // tidak tahu berkas ini milik siapa
```

Drive-per-user menuntut identitas pemilik dan token OAuth-nya ikut mengalir
sampai ke lapisan penyimpanan. Itu **mengubah kontrak lapisan**, dan setiap
pemanggil ikut berubah.

Yang juga ikut terdampak dan mudah terlewat:

| Bagian | Kenapa terdampak |
| ------ | ---------------- |
| **#67** penjaga `/uploads` | Berkas tidak lagi berada di disk server; penjaga berbasis nama berkas kehilangan makna |
| Presigned URL (`src/lib/fileSecurity.ts`) | Drive punya mekanisme berbaginya sendiri; dua sistem token akan bertabrakan |
| Pemrosesan AI rapat | `runAIPipeline` membaca isi berkas dari disk. Bila berkas ada di drive orang, server harus mengunduhnya dulu — dan itu butuh izin yang mungkin sudah dicabut |
| Cakupan OAuth F5 | Login SSO sekarang hanya minta identitas. Menambah cakupan Drive **mengubah layar persetujuan Google**, dan pengguna lama harus menyetujui ulang |
| §18.6 batas lingkup | Storage pindah ke pihak ketiga — audit keamanan bertambah satu wilayah yang belum pernah diperiksa |

#### 11.3 Syarat masuk

1. ~~Enam keputusan §11.1 terjawab~~ — **SELESAI 16 Agu 2026**. Sisa dua
   konfirmasi akhir: D1b (server perantara) dan D3b (tiga keadaan).
2. F5 lulus — **sudah**, fondasi OAuth ada sehingga biayanya turun.
3. **#46 diperbaiki lebih dulu.** `SSO_ALLOWED_DOMAINS` harus berisi domain
   corporate, bukan `gmail.com`. Tanpa itu asumsi kuota D5/D6 tidak berlaku dan
   F11 dibangun di atas dasar yang salah — lihat §11.1b.
4. Keputusan tertulis soal cakupan OAuth tambahan dan persetujuan ulang pengguna
   lama (layar persetujuan Google & Microsoft berubah).
5. Rancangan penyimpanan *refresh token* terenkripsi disetujui — konsekuensi
   langsung D1b.

#### 11.4 Gerbang keluar

Unggah 1 dokumen + 1 rekaman dari akun **A** → **anggota lain (akun B)** bisa
membukanya dari aplikasi → akun A mencabut akses → aplikasi memberi pesan yang
jelas, **bukan** layar rusak → objek uji dihapus.

⚠️ Gerbang ini sengaja memuat pencabutan akses. Itu satu-satunya bagian yang
tidak akan pernah terjadi di jalur bahagia, dan justru paling mungkin terjadi di
production.

---

### F12 · Konsolidasi desain

Di akhir bukan karena tidak penting, melainkan karena **tidak memblokir apa pun**
dan akan tersentuh ulang bila F8 memindahkan komponen.

| Item | Pekerjaan                                                        | Definisi selesai                       |
| ---- | ---------------------------------------------------------------- | -------------------------------------- |
| #14  | Perbaiki **palet sidebar**, bukan menambal per-node              | 20/20 node lulus WCAG AA di kedua mode |
| #13  | 28 berkas `dark:` → token; 48 hex di `className`/`style` → token | Keduanya nol                           |

**Syarat masuk:** F3 tutup — hasil audit UI menentukan apa yang sebenarnya perlu
diperbaiki di sini.

⚠️ Kontras sidebar gagal dengan angka hampir sama di mode terang **maupun** gelap
(§8) — bukti masalahnya di palet, bukan di penanganan mode gelap. Menambal
per-node menghabiskan waktu tanpa menyelesaikan sebabnya.

⚠️ Angka #14 **diwarisi dari audit lama dan belum diukur ulang** (§11). F3 yang
mengukurnya ulang.

---

## §2 Volume kode & beban berkas

### 2.1 Baseline volume

| Area                |  Berkas |      Baris | Catatan                    |
| ------------------- | ------: | ---------: | -------------------------- |
| `src/` (frontend)   |     232 |     62.392 | 83% dari total             |
| `server/` (backend) |      47 |     12.800 |                            |
| `server.ts`         |       1 |        992 | entry point                |
| `scripts/`          |      47 |      7.227 | doctor, validate, tooling  |
| `api/`              |       1 |         81 | adapter Vercel             |
| `database/`         |       7 |        239 | **0 referensi — lihat §4** |
| **TOTAL**           | **335** | **83.731** |                            |

### 2.2 Sebaran ukuran berkas (`src` + `server` + `server.ts`)

| Kategori      | Target | Aktual | Status             |
| ------------- | -----: | -----: | ------------------ |
| > 2.000 baris |      0 |  **4** | 🔴                 |
| 1.001 – 2.000 |      0 | **14** | 🔴                 |
| 501 – 1.000   |      0 | **19** | 🟠                 |
| 301 – 500     |      — |     24 | 🟡 mendekati batas |
| ≤ 300         |      — |    217 | ✅                 |

**Metrik utama yang dipantau: 59% dari seluruh baris kode berada di 37 berkas
yang melanggar batas 500 baris** (44.575 dari 75.149 baris). Selama angka ini
tinggi, setiap modul baru akan terus menabrak berkas yang sama.

### 2.3 Daftar berkas > 1.000 baris

| Baris | Berkas                                                 | Status                                           |
| ----: | ------------------------------------------------------ | ------------------------------------------------ |
| 4.481 | `src/AppContainer.tsx`                                 | `TERBUKA`                                        |
| 3.880 | `src/features/flowchart/FlowchartContainer.tsx`        | `TERBUKA` — **naik 460 dari catatan lama 3.420** |
| 2.074 | `src/features/flowchart/lib/shapes.tsx`                | `TERBUKA`                                        |
| 2.053 | `src/features/issues/IssueListView.tsx`                | `TERBUKA`                                        |
| 1.864 | `src/features/meeting-notes/AiMeetingCompanion.tsx`    | `TERBUKA`                                        |
| 1.813 | `src/features/timeline/TimelinePanel.tsx`              | `TERBUKA`                                        |
| 1.635 | `src/features/wiki/WikiView.tsx`                       | `TERBUKA`                                        |
| 1.614 | `src/features/issues/TaskDetailModal.tsx`              | `TERBUKA`                                        |
| 1.591 | `src/features/master/MasterDataPanel.tsx`              | `TERBUKA`                                        |
| 1.530 | `server/routes/task.routes.ts`                         | `TERBUKA`                                        |
| 1.384 | `src/features/dashboard/DashboardView.tsx`             | `TERBUKA`                                        |
| 1.375 | `src/features/users/AdminUserPanel.tsx`                | `TERBUKA`                                        |
| 1.336 | `server/routes/qa.routes.ts`                           | `TERBUKA`                                        |
| 1.282 | `src/features/notebook-lm/NotebookLM.tsx`              | `TERBUKA`                                        |
| 1.263 | `src/features/users/UserDetailView.tsx`                | `TERBUKA`                                        |
| 1.240 | `src/components/LiveChatWidget.tsx`                    | `TERBUKA`                                        |
| 1.052 | `server/routes/meetings.routes.ts`                     | `TERBUKA`                                        |
| 1.034 | `src/features/meeting-notes/DiscussionPointsTable.tsx` | `TERBUKA`                                        |

> Cara memecah berkas besar dengan aman: ARCHITECTURE.md §2. Urutannya
> tipe → fungsi murni → konstanta → panggilan API → **baru** komponennya.

### 2.4 Standardisasi struktur fitur (21 fitur)

Acuan resmi = `src/features/flowchart/`. `➖` berarti lapisan itu memang tidak
diperlukan (fitur tidak bicara ke backend).

| Fitur            | Berkas |  Baris | types | lib | services | components | barrel | Skor            |
| ---------------- | -----: | -----: | :---: | :-: | :------: | :--------: | :----: | --------------- |
| flowchart        |     22 | 10.136 |  ✅   | ✅  |    ✅    |     ✅     |   ❌   | 4/5             |
| dashboard        |     15 |  3.638 |  ✅   | ❌  |    ✅    |     ✅     |   ✅   | 4/5             |
| wiki             |      5 |  1.943 |  ✅   | ❌  |    ✅    |     ✅     |   ✅   | 4/5             |
| qa               |      9 |  2.885 |  ✅   | ❌  |    ✅    |     ✅     |   ❌   | 3/5             |
| users            |      9 |  3.654 |  ✅   | ❌  |    ✅    |     ❌     |   ✅   | 3/5             |
| kanban           |      8 |  1.240 |  ✅   | ❌  |    ✅    |     ✅     |   ❌   | 3/5             |
| issues           |      8 |  4.328 |  ✅   | ❌  |    ✅    |     ❌     |   ✅   | 3/5             |
| meeting-notes    |      7 |  4.183 |  ✅   | ✅  |    ✅    |     ❌     |   ❌   | 3/5             |
| settings         |      7 |  1.064 |  ❌   | ❌  |    ✅    |     ✅     |   ❌   | 2/5             |
| notebook-lm      |      3 |  1.355 |  ❌   | ❌  |    ✅    |     ❌     |   ✅   | 2/5             |
| planning         |      5 |    702 |  ✅   | ❌  |    ➖    |     ❌     |   ❌   | 1/4             |
| sidebar          |      5 |    611 |  ✅   | ❌  |    ➖    |     ❌     |   ❌   | 1/4             |
| timeline         |      3 |  2.300 |  ❌   | ❌  |    ➖    |     ❌     |   ✅   | 1/4             |
| master           |      2 |  1.699 |  ❌   | ❌  |    ✅    |     ❌     |   ❌   | 1/5             |
| backup           |      2 |    419 |  ❌   | ❌  |    ✅    |     ❌     |   ❌   | 1/5             |
| connect          |      2 |    296 |  ❌   | ❌  |    ✅    |     ❌     |   ❌   | 1/5             |
| enterprise-audit |      3 |    714 |  ❌   | ❌  |    ✅    |     ❌     |   ❌   | 1/5             |
| explorer         |      2 |    646 |  ❌   | ❌  |    ✅    |     ❌     |   ❌   | 1/5             |
| team             |      2 |    688 |  ❌   | ❌  |    ✅    |     ❌     |   ❌   | 1/5             |
| activity         |      1 |    192 |  ❌   | ❌  |    ➖    |     ❌     |   ❌   | 0/4             |
| auth             |      7 |    793 |  ✅   | ❌  |    ➖    |     ✅     |   ✅   | **3/4 ✅ F5.2** |

**Yang paling perlu perhatian:**

- 🔴 **`auth` — 762 baris dalam satu berkas tunggal, nol lapisan.** Fitur paling
  sensitif keamanannya justru paling tidak terstruktur. Biaya perbaikannya rendah
  (item #11), jadi rasio manfaatnya tinggi.
- 🟠 **`master` 1.699 baris dalam 2 berkas** dan **`timeline` 2.300 baris dalam
  3 berkas** — kepadatan tertinggi di repo.
- Rendahnya skor pada fitur kecil (`backup`, `connect`, `team`, …) **bukan
  masalah**. Menambahkan `types.ts` dan `lib/` kosong di sana hanya kerapian semu.
  Skor baru bermakna bila berkasnya sudah melewati ±500 baris.

---

## §3 Backend

### 3.1 Lapisan repository belum ada

| Lokasi query SQL   |  Jumlah | Seharusnya         |
| ------------------ | ------: | ------------------ |
| `server/routes/`   | **222** | 0                  |
| `server/services/` |      53 | (lewat repository) |
| `server.ts`        |       8 | 0                  |

81% query berada di lapisan yang seharusnya hanya mengurus request/response.

| Berkas rute                    |  Baris | Query | Prioritas | Status    |
| ------------------------------ | -----: | ----: | :-------: | --------- |
| `task.routes.ts`               |  1.530 |    46 |    🔴     | `TERBUKA` |
| `qa.routes.ts`                 |  1.336 |    33 |    🔴     | `TERBUKA` |
| `project.routes.ts`            |    675 |    30 |    🔴     | `TERBUKA` |
| `meetings.routes.ts`           |  1.052 |    19 |    🟠     | `TERBUKA` |
| `user.routes.ts`               |    646 |    14 |    🟠     | `TERBUKA` |
| `auth.routes.ts`               |    620 |    13 |    🟠     | `TERBUKA` |
| `chat.routes.ts`               |    369 |     9 |    🟡     | `TERBUKA` |
| `milestones.routes.ts`         |    181 |     9 |    🟡     | `TERBUKA` |
| `documents.routes.ts`          |    159 |     8 |    🟡     | `TERBUKA` |
| `discussion-points.routes.ts`  |    178 |     7 |    🟡     | `TERBUKA` |
| `master-data.routes.ts`        |    173 |     7 |    🟡     | `TERBUKA` |
| `notifications.routes.ts`      |    313 |     7 |    🟡     | `TERBUKA` |
| `sprints.routes.ts`            |    209 |     6 |    🟢     | `TERBUKA` |
| `project-modules.routes.ts`    |     93 |     5 |    🟢     | `TERBUKA` |
| `system.routes.ts`             |     89 |     5 |    🟢     | `TERBUKA` |
| `db-admin.routes.ts`           |    206 |     3 |    🟢     | lihat §6  |
| `audit.routes.ts`              |     37 |     1 |    🟢     | `TERBUKA` |
| `file`, `health`, `notebooklm` | 19–193 |     0 |    ✅     | —         |

> **`project.routes.ts` (30 query) sebelumnya tidak tercatat** di rencana kerja
> mana pun, padahal bebannya setara `qa.routes.ts`. Jangan sampai terlewat lagi.

> **Pelajaran dari dua langkah L4 sebelumnya:** sebelum membangun repository,
> periksa dulu apakah ada DOMAIN NYASAR di berkas itu. Kalau ada, pecah domainnya
> lebih dulu — jauh lebih murah dan aman daripada langsung membuat repository.

### 3.2 Validasi input — celah terbesar di sisi keamanan

| Metrik                      | Target |  Aktual | Status |
| --------------------------- | -----: | ------: | ------ |
| Total endpoint              |      — | **104** |        |
| Berkas server memakai `zod` |     22 |   **2** | 🔴     |

Hanya `auth.routes.ts` dan `server.ts` yang memvalidasi skema. Artinya **sekitar
100 endpoint menerima body apa adanya**. Ini item #4 dan sebaiknya dikerjakan
per-domain bersamaan dengan pekerjaan repository (§3.1), bukan sebagai sapuan
terpisah.

### 3.3 Yang sudah sehat di backend

| Hal                                                            | Status     |
| -------------------------------------------------------------- | ---------- |
| `server/middleware/` — auth, rbac, errorHandler                | ✅ lengkap |
| Rate limit berlapis (global, login, register)                  | ✅         |
| CORS Socket.IO pakai daftar origin, tolak menyala bila kosong  | ✅         |
| CSP aktif di production                                        | ✅         |
| Pola resmi `routes/` + `services/` (controllers sudah dihapus) | ✅         |

---

## §4 Database

### 4.1 🔴 TIGA sistem migrasi hidup berdampingan

| Sistem                        |    Baris | Dipakai?                            | Bukti                               |
| ----------------------------- | -------: | ----------------------------------- | ----------------------------------- |
| `src/lib/pg-migrate.ts`       |      580 | ✅ **AKTIF**                        | dipanggil `server.ts:183` saat boot |
| `server/migrations/runner.ts` |      447 | ⚠️ hanya lewat `npm run db:migrate` | tidak dipanggil server              |
| `database/migrations/*.ts`    | 7 berkas | ❌ **NOL referensi**                | tak ada yang mengimpor              |

**Ini risiko onboarding tertinggi di repo.** Developer baru yang ingin menambah
tabel punya tiga tempat berbeda untuk menaruhnya, dan dua di antaranya tidak akan
pernah dieksekusi. Kesalahannya tidak akan terlihat sampai data hilang.

Biayanya rendah dan risikonya kecil — karena itu ditempatkan sebagai item **#1**.

> Sebelum menghapus apa pun: pastikan isi `server/migrations/runner.ts` dan
> `database/migrations/` benar-benar sudah tercakup di `src/lib/pg-migrate.ts`.
> Bandingkan daftar tabel & kolomnya, jangan hanya nama berkasnya.

### 4.2 Schema tidak terdokumentasi

Tidak ada ERD maupun daftar tabel. Yang bisa ditemukan hanya 10 pernyataan
`CREATE TABLE` yang tersebar di dalam kode:

`Documents` · `MasterData` · `Messages` · `ProjectModules` ·
`QATestCaseExecutionLogs` · `QATestCases` · `QATestSuites` · `ai_learning_logs` ·
`discussion_point_comments` · `meeting_details`

Perhatikan penamaannya **tidak konsisten**: `PascalCase` (`QATestCases`)
bercampur `snake_case` (`meeting_details`). Standar penamaan tabel perlu
diputuskan sekali, lalu ditulis di sini.

> Daftar 10 tabel di atas **belum tentu lengkap** — itu hasil pemindaian teks
> `CREATE TABLE`, bukan pembacaan schema hidup dari Neon. Saat mengerjakan item
> #10, ambil daftar sebenarnya dari database.

### 4.3 Yang sudah sehat di database

| Hal                                             | Status             |
| ----------------------------------------------- | ------------------ |
| Neon PostgreSQL, satu adapter (`src/lib/db.ts`) | ✅ tidak ada MySQL |
| Connection pooling Neon                         | ✅                 |
| `sslmode=require`                               | ✅                 |
| Password lama sudah dirotasi & terbukti mati    | ✅                 |

⛔ **`src/lib/db.ts` tidak boleh disentuh.**

---

## §5 Frontend — flow aplikasi & performa

### 5.1 🔴 Routing yang tidak benar-benar routing

| Temuan                                | Angka                                                    | Dampak                                                             |
| ------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------ |
| `react-router-dom` terpasang          | v6.30.4                                                  | ada di dependencies                                                |
| `<BrowserRouter>` / `<Route>` dipakai | **0**                                                    | library terpasang tapi menganggur                                  |
| Mekanisme sebenarnya                  | `switch (currentView)` di `src/routes/AppRoutes.tsx:137` |                                                                    |
| Props di `AppRoutesProps`             | **47**                                                   | tiap modul baru menambah props di 2 tempat                         |
| `any` di `AppRoutes.tsx`              | 21                                                       | tipe hilang tepat di persimpangan utama                            |
| URL berubah saat pindah view          | **tidak**                                                | tak bisa bookmark, tak bisa deep-link, tombol back tidak berfungsi |

Untuk aplikasi yang direncanakan punya banyak modul, ini penghambat terbesar
setelah §2.2. Setiap modul baru wajib menyentuh `AppContainer.tsx` (4.481 baris)
**dan** `AppRoutes.tsx` (47 props). Biaya penambahan modul **naik terus**, tidak
mendatar.

Perbaikan ini besar (item #5) — jangan dimulai di sesi yang ruangnya sudah sempit.

### 5.2 🔴 Nol code splitting

| Metrik                     |  Target |                 Aktual | Status |
| -------------------------- | ------: | ---------------------: | ------ |
| Bundle JS utama (raw)      |       — |               3.320 KB | 🔴     |
| Bundle JS utama (**gzip**) | ±300 KB |             **898 KB** | 🔴     |
| CSS (gzip)                 |       — |                  36 KB | ✅     |
| Total gzip semua asset     |       — |              ~1.053 KB | 🔴     |
| `React.lazy` di `src/`     |     > 0 |                  **0** | 🔴     |
| `<Suspense>`               |     > 0 |                  **0** | 🔴     |
| Sumber eksternal           |       — | 1 (`cdn.lordicon.com`) | 🟡     |

Seluruh 21 fitur — flowchart, QA, notebook-lm, docx — dimuat sekaligus pada
request pertama walaupun pengguna hanya membuka Dashboard. Penyebab langsungnya
19 import statis di `src/routes/AppRoutes.tsx`, dan di situ pula titik perbaikan
termurahnya: ubah menjadi `React.lazy` + satu `<Suspense>`.

⚠️ **Jangan memakai angka dev server sebagai patokan.** Pengukuran di
`localhost` dev (TTFB 20 ms, load 1.107 ms, 214 modul terpisah) **tidak valid**
sebagai gambaran loading production — Vite menyajikan modul tanpa bundling di
dev. Yang sah sebagai baseline adalah **898 KB gzip dalam satu chunk**. Ukur
ulang dengan `npm run build`, bukan dengan `npm run dev`.

### 5.3 State global menganggur

`authStore` dan `uiStore` sudah dibuat tetapi belum dipakai; `AppContainer` masih
mengambil state auth dari `hooks/useAuth.ts`. Ini **disengaja** dan tetap
`DITUNDA`: mengambil setter dari store sementara state dibaca dari hook akan
menghasilkan penulisan yang tidak dibaca siapa pun — crash berubah menjadi bug
senyap yang jauh lebih sulit dilacak. Tunggu jaring test render lebih tebal (§7).

---

## §6 Production & keamanan — item yang menunggu pemilik proyek

### 6.1 🔴 Driver `s3` belum pernah dieksekusi (item #2)

Kode ada di `server/services/storage.service.ts`, tetapi seluruh test memakai
driver lokal. Di Vercel, folder `uploads/` hilang setiap deploy. **Ini memblokir
production.**

Temuan pendukung dari audit terpisah:

| #   | Temuan                                                                                                              | Status              |
| --- | ------------------------------------------------------------------------------------------------------------------- | ------------------- |
| a   | `.env` belum punya satu pun variabel `STORAGE_*` (hanya ada di `.env.example`)                                      | `MENUNGGU` pemilik  |
| b   | `@aws-sdk/client-s3` ^3.1111.0 sudah terpasang                                                                      | ✅ bukan penghalang |
| c   | Hanya 3 berkas rute memakai `storage.service` (`file`, `qa`, `user`)                                                | `TERBUKA`           |
| d   | `meetings.routes.ts:228` menyimpan rekaman **langsung ke disk** — akan tetap hilang di Vercel walau driver s3 diisi | `TERBUKA`           |
| e   | `server.ts:774` menulis berkas ke `process.cwd()`, bahkan bukan ke `uploads/`                                       | `TERBUKA`           |
| f   | Penyaji `/uploads/:filename` (`server.ts:303–352`) memakai `fs` langsung, **tidak mengenal driver**                 | `TERBUKA` 🔴        |

Konsekuensi (f) begitu driver = `s3`:

- `STORAGE_PUBLIC_URL` **diisi** → berkas tampil, tetapi **seluruh penjaga
  otorisasi (presigned token & JWT) terlewati**; keamanan berpindah ke setelan
  bucket. Untuk avatar mungkin diterima, untuk dokumen QA tidak.
- `STORAGE_PUBLIC_URL` **kosong** → `simpanBerkas` tetap mengembalikan
  `/uploads/<nama>`, dan penyaji lokal membalas **404 untuk setiap berkas baru**.
  Kegagalan senyap.

⚠️ **`npm run doctor` akan HIJAU walau (c)–(f) masih rusak** — pemeriksanya hanya
mengecek variabel terisi, tidak pernah menyentuh bucket. Jangan perlakukan doctor
hijau sebagai bukti jalur s3 berjalan.

**Urutan yang disarankan:** tutup (f) dulu → lalu (d) dan (e) → **baru** uji
dengan bucket sungguhan → opsional tambahkan satu `HeadBucket` ke `doctor.cjs`
supaya hijaunya berarti.

**Keputusan yang masih dibutuhkan dari pemilik proyek:** apakah dokumen QA &
rekaman rapat tetap wajib lewat penjaga auth server (rekomendasi: **ya**), atau
boleh disajikan langsung dari bucket publik. Bentuk perbaikan (f) bergantung pada
jawaban ini.

### 6.2 🔴 Dua Google API key lama belum dicabut (item #15)

Kedua kunci pernah ada di histori git dan **belum dicabut** di Google Cloud
Console. Keduanya sudah tidak ada di source aktif dan tidak sedang dipakai.
**Hanya pemilik proyek yang bisa melakukan ini.**

Password Neon lama sudah dirotasi dan terbukti mati (`28P01`); nilainya masih
tercatat di histori git. Pembersihan histori kini bersifat higiene, bukan lagi
mitigasi risiko.

### 6.3 Menunggu keputusan — JANGAN dikerjakan tanpa konfirmasi pemilik

| Hal                   | Kondisi                                                                                                                             | Kenapa menunggu                                                     |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `POST /api/db-query`  | Versi aktif **tanpa** penjaga read-only; versi bergaris-pengaman ada tapi mati di `server/routes/db-admin.routes.ts`                | Mengaktifkannya **mematikan** fitur ubah/hapus baris di DB Explorer |
| `notebook-lm`         | Kunci token salah (`'token'`, seharusnya `'lanpro_jwt_token'`) dan memanggil `GET /api/projects/:id/wiki` yang tidak ada di backend | Perbaikannya kecil tapi **mengubah perilaku**                       |
| Kode mati DB Explorer | Toggle mode DB + request sia-sia tiap mount                                                                                         | Perlu konfirmasi memang tak terpakai                                |

---

## §7 Kualitas kode & pengujian

| Metrik                                |      Target |         Aktual | Status           |
| ------------------------------------- | ----------: | -------------: | ---------------- |
| `tsc --noEmit`                        |     0 error |          **0** | ✅               |
| ESLint error                          |           0 |          **0** | ✅               |
| ESLint warning                        | turun terus |        **451** | 🟠 naik dari 447 |
| — `@typescript-eslint/no-unused-vars` |             |            381 |                  |
| — `max-lines`                         |             |             33 |                  |
| — `no-case-declarations`              |             |             10 |                  |
| — `no-useless-escape`                 |             |              8 |                  |
| — `prefer-const`                      |             |              8 |                  |
| — lainnya                             |             |             11 |                  |
| `any` di `src/`                       | turun terus |        **768** | 🔴               |
| `any` di `server/`                    | turun terus |        **545** | 🔴               |
| Test lulus                            |       semua |    **84 / 84** | ✅               |
| Suite                                 |           — |             12 | ✅               |
| **Rasio test : baris**                |           — | **±1 : 1.000** | 🔴               |

**1.313 `any` adalah alasan kenapa refactor besar di repo ini berbahaya** —
`tsc` hijau tidak berarti banyak bila sepertiga persimpangan tipenya `any`.
Perbaiki `any` di jalur yang akan di-refactor **sebelum** refactornya, bukan
sesudah.

Rasio test 1:1.000 berarti jaring pengaman sangat tipis. Ini yang membuat aturan
"verifikasi tidak boleh berhenti di build hijau" (ARCHITECTURE.md §3.3) berlaku
mutlak di repo ini.

### 7.1 Perkakas penegakan yang sudah aktif

| Perkakas                                                                                         | Status                     |
| ------------------------------------------------------------------------------------------------ | -------------------------- |
| ESLint 9 flat config + Prettier                                                                  | ✅                         |
| husky + lint-staged (pre-commit **terbukti** menahan commit)                                     | ✅                         |
| Aturan LAPISAN = `error` (komponen dilarang impor `apiRequest`; `lib/` dilarang impor React/api) | ✅                         |
| `max-lines` 500 & `no-unused-vars` = `warn`                                                      | 🟡 sengaja belum dinaikkan |
| CI menjalankan `npm test` PENUH + `npm run build`                                                | ✅                         |

---

## §8 UI & sistem desain

| Aturan                                 | Target |                  Aktual | Tercatat di ARCHITECTURE | Status           |
| -------------------------------------- | -----: | ----------------------: | -----------------------: | ---------------- |
| Hex di `className`                     |      0 |                  **35** |                        — | 🔴               |
| Hex di `style={{}}`                    |      0 |                  **13** |                        — | 🔴               |
| Hex di SVG `fill`/`stroke` (diizinkan) |      — |                     146 |                       46 | 🟡 drift         |
| Berkas memakai prefix `dark:`          |      0 |                  **28** |                    **4** | 🔴 drift besar   |
| `alert()` / `confirm()` bawaan         |      0 |                   **0** |                        — | ✅               |
| `Swal.fire` langsung                   |      0 |                   **0** |                        — | ✅               |
| `<table>` tanpa `ResponsiveTable`      |      0 |                2 berkas |                        — | 🟡               |
| Kontras sidebar WCAG AA                |  20/20 | 15–16 dari 20 **gagal** |                     sama | 🟠 belum digarap |
| Jarak antar target sentuh ≥ 8px        |  semua |         11 pasang gagal |                     sama | 🟡 belum digarap |

**Selisih 4 → 28 pada prefix `dark:` berarti dokumen sistem desain sudah tidak
bisa dipakai sebagai alat kontrol.** Angka itu tidak naik pelan-pelan;
kemungkinan besar hitungan lamanya memang keliru sejak awal. Karena itu item #12
(memperbaiki angka di ARCHITECTURE.md) diberi prioritas walaupun severity-nya 🟡
— dokumen yang salah angka lebih berbahaya daripada tidak ada dokumen.

Kontras sidebar gagal dengan angka yang hampir sama di mode terang **maupun**
gelap. Itu menunjukkan masalahnya ada pada **palet sidebar itu sendiri**, bukan
pada penanganan mode gelap. Perbaiki paletnya, jangan menambal per-node.

### 8.1 Angka yang drift di ARCHITECTURE.md (item #12)

| Yang tertulis                  | Yang sebenarnya                   |
| ------------------------------ | --------------------------------- |
| 303 file, 71.669 baris         | 335 file, 83.731 baris            |
| `AppContainer.tsx` 4.903       | 4.481                             |
| `FlowchartContainer.tsx` 3.420 | 3.880 (**naik**)                  |
| `task.routes.ts` 1.779         | 1.530                             |
| 4 berkas memakai `dark:`       | 28 berkas                         |
| 46 nilai hex                   | 146 di SVG + 48 pelanggaran nyata |

---

## §9 Perintah pengukuran ulang

Jalankan dari root repo. Gunakan perintah yang sama persis supaya angkanya bisa
dibandingkan antar waktu.

```bash
# Volume per area
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec cat {} + | wc -l

# Sebaran ukuran berkas + konsentrasi baris (metrik utama §2.2)
find src server -type f \( -name "*.ts" -o -name "*.tsx" \) -exec wc -l {} + \
  | grep -v " total" \
  | awk '{if($1>500)a+=$1; else b+=$1} END{print "di berkas >500:",a; print "sisanya:",b; print int(a*100/(a+b))"%"}'

# 20 berkas terbesar
find src server -type f \( -name "*.ts" -o -name "*.tsx" \) -exec wc -l {} + \
  | grep -v " total" | sort -rn | head -20

# Query SQL per lapisan (§3.1)
grep -h "db\.query\|db\.execute\|pool\.query\|\.query(" server/routes/*.ts | wc -l
grep -h "db\.query\|db\.execute\|pool\.query\|\.query(" server/services/*.ts | wc -l

# Jumlah endpoint & cakupan zod (§3.2)
grep -rhoE "router\.(get|post|put|patch|delete)\(" server/routes/*.ts | wc -l
grep -rl "zod" server/ server.ts

# Beban tipe longgar (§7)
grep -rhoE ": any\b|<any>|as any" src --include=*.ts --include=*.tsx | wc -l
grep -rhoE ": any\b|<any>|as any" server server.ts --include=*.ts | wc -l

# Utang lint (§7)
npx eslint src server --format json > lint.json   # lalu hitung per ruleId

# Bundle & code splitting (§5.2) — WAJIB build dulu, bukan dev
npm run build
for f in dist/assets/*.js dist/assets/*.css; do \
  echo "$(basename $f) raw $(( $(wc -c < $f)/1024 ))KB gzip $(( $(gzip -c $f | wc -c)/1024 ))KB"; done
grep -rc "React.lazy\|= lazy(" src/ --include=*.tsx | grep -v ":0" | wc -l

# Pelanggaran token warna (§8)
grep -rhoE 'className="[^"]*#[0-9a-fA-F]{6}' src --include=*.tsx | wc -l
grep -rhoE 'style=\{\{[^}]*#[0-9a-fA-F]{6}' src --include=*.tsx | wc -l
grep -rl 'dark:' src --include=*.tsx | wc -l

# Kesehatan menyeluruh
npm run doctor && npm run lint && npm test && npm run build
```

---

## §10 Riwayat perbaikan

Tambahkan satu baris **setiap kali** sebuah item berpindah ke `SELESAI`.
Kolom angka wajib diisi sebelum→sesudah, supaya kemajuannya terukur, bukan terasa.

| Tanggal     |   Fase    | Item                                                         | Branch / Commit                      | Sebelum                                                           | Sesudah                                                               | Aplikasi jalan? | Terverifikasi dengan                                                                                                                                    |
| ----------- | :-------: | ------------------------------------------------------------ | ------------------------------------ | ----------------------------------------------------------------- | --------------------------------------------------------------------- | :-------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 15 Agu 2026 |     —     | Baseline audit                                               | `docs/audit-baseline`                | —                                                                 | —                                                                     |        —        | seluruh perintah §9                                                                                                                                     |
| 15 Agu 2026 |     —     | Pemfasean F0–F7                                              | `docs/audit-fase`                    | —                                                                 | —                                                                     |        —        | —                                                                                                                                                       |
| 15 Agu 2026 |     —     | Audit logika & UI masuk fase (F0–F9, 21 item)                | `docs/audit-fase-lengkap`            | —                                                                 | —                                                                     |        —        | —                                                                                                                                                       |
| 15 Agu 2026 |     —     | Fase SSO (F5) & Email (F6) masuk peta, 30 item               | `docs/fase-sso-email`                | —                                                                 | —                                                                     |       ✅        | baseline §15.1                                                                                                                                          |
| 15 Agu 2026 |     —     | Login dengan email masuk F5.2 (31 item)                      | `docs/fase-login-email`              | —                                                                 | —                                                                     |        —        | —                                                                                                                                                       |
| 15 Agu 2026 |     —     | Kartu verifikasi §16 & standar develop §17                   | `docs/verifikasi-standar`            | —                                                                 | —                                                                     |        —        | —                                                                                                                                                       |
| 15 Agu 2026 | **F5.2**  | #11 pecah `auth` jadi berlapis                               | `refactor/f5.2-pecah-auth`           | AuthScreens 762 baris; auth.routes 620 baris                      | 7 berkas ≤378; auth.routes 423 + auth.service 219                     |       ✅        | tsc diff IDENTIK; himpunan rute 86→86 IDENTIK; 84/84 test; lint 451→449 warning; browser: layar login, layar daftar, validasi username, 0 error console |
| 15 Agu 2026 | **F5.3**  | Fondasi OIDC generik                                         | `feat/f5.3-fondasi-oidc`             | tanpa OIDC; 84 test                                               | `oidc.service.ts` 327 baris; 106 test                                 |       ✅        | tsc diff IDENTIK; rute 86→86; 106/106 test (exit 0); browser: layar login & daftar utuh, 0 error console                                                |
| 15 Agu 2026 | **F5.4**  | Kebijakan akun SSO + rute OIDC + tabel `UserIdentities`      | `feat/f5.4-kebijakan-akun`           | tanpa kebijakan; 106 test                                         | 4 rute baru; 127 test                                                 |       ✅        | tsc IDENTIK; rute 86→90; tabel terverifikasi di `information_schema`; jalur lama utuh                                                                   |
| 15 Agu 2026 | **F5.5**  | Tombol SSO, layar Lengkapi Pendaftaran, penanganan kembalian | `feat/f5.5-ui-sso`                   | tanpa UI SSO; 127 test                                            | 139 test                                                              |       ✅        | tsc IDENTIK; rute 90→90; browser: tombol tampil dengan mode benar                                                                                       |
| 15 Agu 2026 | **F5.5b** | Usulan username otomatis dari email                          | `feat/f5.5b-usulan-username`         | kolom kosong; 139 test                                            | terisi otomatis; 146 test                                             |       ✅        | `budi.santoso@…` → `budisantos`, tetap bisa diubah                                                                                                      |
| 15 Agu 2026 | **F5.5c** | Sederhanakan layar — username saja                           | `feat/f5.5c-sederhanakan-layar`      | 3 kolom                                                           | 1 kolom                                                               |       ✅        | 0 error console di tab bersih                                                                                                                           |
| 16 Agu 2026 |  **F5**   | #34–#36 buat proyek khusus admin + ikon galat baru           | `fix/rbac-create-project-ikon-galat` | endpoint tanpa penjaga peran; ikon tong sampah                    | `verifyGlobalAdmin`; ikon pengguna-disilang                           |       ✅        | tsc IDENTIK; rute 90→90; POST tanpa token → 401                                                                                                         |
| 16 Agu 2026 |  **F5**   | #41 identitas yatim + FK cascade                             | `fix/identitas-yatim`                | email terkunci selamanya; 146 test                                | 0 yatim, FK aktif; 152 test                                           |       ✅        | kueri langsung ke `information_schema` + isi tabel                                                                                                      |
| 16 Agu 2026 |  **F5**   | #43 sesi SSO tidak terdaftar                                 | `fix/sso-sesi-tunggal`               | login SSO gagal senyap; 152 test                                  | `daftarkanSesi()`; 155 test                                           |       ✅        | diuji pemilik proyek dengan akun Google sungguhan                                                                                                       |
| 16 Agu 2026 | **F6.1**  | #22, #23, #24 bersihkan pondasi email                        | `fix/f6.1-bersihkan-pondasi`         | penjadwal mati; token ber-fallback; backend email belum diketahui | penjadwal menyala; fallback dibuang; terbukti TIDAK ada backend email |       ✅        | log boot menampilkan pesan penjadwal; 159 test                                                                                                          |
| 16 Agu 2026 |  **F0**   | #39 migrasi gagal senyap                                     | `fix/f0-migrasi-senyap`              | hanya `warning`, tak terlihat                                     | 3x ulangan + status di `/api/health` + doctor bagian 8                |       ✅        | log `[MIGRASI] Berhasil pada percobaan ke-1`; 166 test                                                                                                  |
| 16 Agu 2026 |  **F0**   | #1 satukan tiga sistem migrasi                               | `fix/f0-satukan-migrasi`             | 3 sistem, 1 tabel hanya ada di sistem non-aktif                   | 1 sistem                                                              |       ✅        | data `discussion_point_comments` sebelum/sesudah IDENTIK (11 kolom, 4 baris)                                                                            |
| 16 Agu 2026 |  **F0**   | #10 schema DB + #12 angka drift                              | `docs/f0-schema-db`                  | tak ada dok schema; 6 angka drift                                 | `docs/DATABASE_SCHEMA.md` + `npm run db:schema`                       |       ✅        | dijalankan 2x, hasil sama: 35 tabel / 30 aktif                                                                                                          |
| 16 Agu 2026 |  **F0**   | #38 `APP_URL` placeholder                                    | `fix/f0-app-url`                     | `MY_APP_URL`                                                      | `http://localhost:3000` + penjaga doctor 5d                           |       ✅        | doctor hijau; redirect SSO benar                                                                                                                        |
| 16 Agu 2026 |  **F0**   | #48 hapus 5 tabel kembar                                     | `chore/f0-hapus-tabel-kembar`        | 35 tabel, 5 kembar kosong                                         | 30 tabel, 0 kembar                                                    |       ✅        | data tabel asli utuh (MasterData 76, ProjectModules 2, QATestCases 1, QATestSuites 2); kembaran TIDAK lahir lagi setelah migrasi                        |
| 16 Agu 2026 |  **F4**   | #3 code splitting                                            | `feat/f4-code-splitting`             | 901 KB gzip, 6 chunk, 0 lazy                                      | 420 KB gzip, 29 chunk, 17 lazy                                        |       ✅        | 7 tampilan dibuka di peramban dengan data nyata; 184 test                                                                                               |

### Gerbang fase yang sudah lulus

| Fase | Nama                               | Tanggal lulus   | Dibuktikan dengan                                                                                                                                                                                                       |
| :--: | ---------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|  F0  | Kejelasan & fondasi dokumen        | **16 Agu 2026** | Satu sistem migrasi tersisa; `docs/DATABASE_SCHEMA.md` dibuat dari DB hidup; angka ARCHITECTURE.md diukur ulang; `APP_URL` diisi. Migrasi diverifikasi jalan, data `discussion_point_comments` utuh 11 kolom / 4 baris. |
|  F1  | Storage minimal — buka jalan rilis | belum           | —                                                                                                                                                                                                                       |
|  F2  | Audit & perbaikan LOGIKA           | belum           | —                                                                                                                                                                                                                       |
|  F3  | Audit UI menyeluruh                | belum           | —                                                                                                                                                                                                                       |
|  F4  | Performa muat                      | **16 Agu 2026** | Bundel awal 901 -> 420 KB gzip. Tujuh tampilan dibuka satu per satu di peramban dengan data sungguhan, 0 error console. Target 400 KB belum tercapai — sisanya di AppContainer (F10).                                   |
|  F5  | SSO Google/Microsoft               | **16 Agu 2026** | Alur ujung-ke-ujung dijalankan pemilik proyek dengan akun Google sungguhan: pendaftaran membuat akun `pending`, login masuk ke dashboard. Jalur username+password & daftar manual tetap utuh.                           |
|  F6  | Email: 3 fungsi                    | belum           | —                                                                                                                                                                                                                       |
|  F7  | Kontrak & validasi                 | belum           | —                                                                                                                                                                                                                       |
|  F8  | Jaring pengaman                    | belum           | —                                                                                                                                                                                                                       |
|  F9  | Lapisan backend                    | belum           | —                                                                                                                                                                                                                       |
| F10  | Arsitektur frontend                | belum           | —                                                                                                                                                                                                                       |
| F11  | Drive-per-user (OPSIONAL)          | belum           | —                                                                                                                                                                                                                       |
| F12  | Konsolidasi desain                 | belum           | —                                                                                                                                                                                                                       |

---

## §11 Batas audit ini — yang BELUM terverifikasi

Ditulis eksplisit supaya tidak ada yang salah menganggapnya sudah dicek.
Kolom terakhir menunjuk fase yang bertugas menutup lubang itu — tidak ada baris
di sini yang dibiarkan tanpa pemilik.

| Hal                                       | Alasan                                                                                                                                                                              | Ditutup oleh |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------: |
| **21 fitur di balik login**               | Sesi login habis. Hanya halaman Sign In yang benar-benar dibuka di browser. Yang selama ini disebut "audit UI" adalah hitungan berkas lewat grep — kepatuhan token, bukan tampilan. |    **F3**    |
| **Logika aplikasi**                       | Audit hanya mengukur struktur (222 query, 104 endpoint, 47 props). Tidak satu pun mengukur apakah logikanya benar.                                                                  |    **F2**    |
| **Fungsi 104 endpoint**                   | Tidak diuji satu per satu.                                                                                                                                                          |    **F2**    |
| **RBAC, perhitungan, alur state, socket** | Belum ditelaah sama sekali.                                                                                                                                                         |    **F2**    |
| **Loading time production**               | Hanya diukur di dev server localhost, tidak representatif. Yang sah: 898 KB gzip.                                                                                                   |    **F4**    |
| **Kontras sidebar & jarak target sentuh** | Angka diwarisi audit sebelumnya, **tidak diukur ulang**.                                                                                                                            |    **F3**    |
| **Layar > 1024px**                        | Panel pengujian terbatas 679px.                                                                                                                                                     |    **F3**    |
| **Kelengkapan daftar 10 tabel**           | Hasil pemindaian teks, bukan pembacaan schema hidup dari Neon.                                                                                                                      |    **F0**    |

---

## §12 Aturan kerja yang tetap berlaku

Diringkas di sini supaya satu dokumen ini cukup sebagai pegangan.

1. **Aplikasi tidak boleh crash.** `npm run build` hijau **bukan** bukti aplikasi
   jalan — verifikasi wajib sampai membuka browser. Pernah terjadi 28/28 test
   lolos sementara `AppContainer` crash saat render.
2. **Jangan sentuh `src/lib/db.ts`.**
3. **Satu branch per pekerjaan**, merge ke `main`, lapor sebelum lanjut ke tahap
   berikutnya.
4. **Jangan sabotase source untuk pembuktian, jangan bypass, jangan mengarang
   hasil.** Bila perlu membuktikan sebuah test bisa merah, lakukan di salinan di
   luar repo.
5. **Review-first.** Untuk permintaan perbaikan: analisa & laporkan dulu
   (format A–F), tunggu persetujuan sebelum mengubah kode.
6. **Laporkan apa adanya.** Bila sesuatu belum terverifikasi, tulis
   "belum terverifikasi" — jangan diklaim berhasil.

### Jebakan verifikasi khas repo ini

- **Cek "rute terdaftar" lewat status 401 TIDAK VALID.** Middleware auth berjalan
  sebelum handler 404, jadi rute palsu pun menjawab 401. Pakai perbandingan
  **himpunan rute** (scan berkas rute sebelum vs sesudah).
- **Bandingkan keluaran `tsc` baris-per-baris pakai `diff`, bukan hitung
  totalnya.** Ini sudah 4× menangkap simbol yang terlewat saat ekstraksi.
- **Setelah menambah test, periksa jumlahnya benar-benar bertambah.** Pernah
  penyisipan gagal diam-diam karena Prettier mengubah kutip tunggal jadi ganda.
- **Untuk pengujian yang menulis data**, pakai objek percobaan terpisah lalu
  hapus (pola yang sudah dipakai: flowchart `ZZ-TEST-REFACTOR`).
- **Jangan pernah memasukkan kredensial sendiri.** Bila verifikasi runtime butuh
  sesi login, minta pemilik proyek login lebih dulu.

## §13 Cakupan audit LOGIKA (isi kerja F2, item #16)

**Kondisi awal: nol.** Audit 15 Agu 2026 tidak menyentuh logika sama sekali.
Yang diukur adalah 222 query, 104 endpoint, 47 props — semuanya **struktur**.

Tabel ini adalah daftar kerja F2. Isi kolom `Status` sambil jalan.

### 13.1 Yang belum pernah diperiksa

| Area                                          | Kenapa berisiko                                                                                            | Status                                                                                              |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| RBAC / permission per peran                   | `hasPermission` dioper sebagai prop ke seluruh view; satu kekeliruan membocorkan fitur ke peran yang salah | `JALAN` — sisi server ditelaah, temuan #49/#54/#55 (§13.5); sisi klien belum                        |
| 119 rute (tertulis 104)                                 | Tak satu pun diuji perilakunya                                                                             | `JALAN` — 119 rute dipetakan menyeluruh; 5 temuan #69–#73 (§13.11) |
| Perhitungan (progress, sprint, KPI, timeline) | Salah hitung tidak melempar error — ia hanya menampilkan angka keliru                                      | `TERBUKA`                                                                                           |
| Alur state antar view                         | 21 `useState` + 21 `useEffect` di `AppContainer`, dioper 47 props                                          | `JALAN` — ditelusuri, menghasilkan #74 (§13.12). Angka 21 useState dikoreksi jadi 11 |
| Socket.IO realtime                            | Pemancaran event sebagian di `runAIPipeline()` yang jalan **setelah** response terkirim                    | `JALAN` — autentikasi handshake ditelaah, temuan #50/#51 (§13.5); urutan emit `runAIPipeline` belum |
| Race condition / concurrency                  | Ada 1 test, belum ditelaah cakupannya                                                                      | `JALAN` — #65 optimistic locking terbukti mati senyap (§13.9); pola lain belum |
| Alur unggah–simpan–tampil berkas              | Baru dibaca kodenya (§6.1), belum dijalankan                                                               | `JALAN` — sisi unggah diuji & bersih; sisi tampil menghasilkan #67 (§13.10) |
| Penanganan error & rollback transaksi         | Belum ditelaah                                                                                             | `JALAN` — gelombang 2 menutup #60–#64 di rute task/project/auth (§13.8); 100+ endpoint lain belum |
| Kedaluwarsa & refresh JWT                     | Belum ditelaah                                                                                             | `JALAN` — penegakan sesi tunggal ditelaah, temuan #52/#53 (§13.5); alur refresh belum               |

### 13.2 Urutan telaah yang disarankan

Ikuti bobot query di §3.1 — makin banyak query, makin banyak logika tersembunyi:

`auth` (13 query, sekaligus paling sensitif) → `task` (46) → `qa` (33) →
`project` (30) → `meetings` (19) → `user` (14) → sisanya.

### 13.3 Cara telaah yang sah di repo ini

| Boleh                                       | Tidak boleh                                        |
| ------------------------------------------- | -------------------------------------------------- |
| Membaca kode & menelusuri alur              | Mengubah source untuk pembuktian (§12 aturan 4)    |
| Menguji endpoint yang tidak butuh auth      | Memasukkan kredensial sendiri                      |
| Membuktikan dugaan di **salinan luar repo** | Menyimpulkan dari nama fungsi tanpa membaca isinya |
| Menulis test baru yang mengunci perilaku    | Mengklaim "sudah benar" tanpa bukti                |

⚠️ **Verifikasi rute lewat status 401 TIDAK VALID** — middleware auth berjalan
sebelum handler 404, jadi rute palsu pun menjawab 401. Pakai perbandingan
**himpunan rute**.

### 13.4 Temuan logika yang SUDAH diketahui

Ketiganya warisan sesi sebelumnya, bukan hasil audit ini. Semua sudah bernomor
di papan §1.

| #   | Temuan                                                                                                                                                                   | Kenapa menunggu keputusan                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| 18  | notebook-lm membaca kunci token `'token'` (seharusnya `'lanpro_jwt_token'`) → header kosong → 401. Juga memanggil `GET /api/projects/:id/wiki` yang tidak ada di backend | Perbaikannya kecil tapi **mengubah perilaku**                            |
| 19  | `POST /api/db-query` aktif **tanpa** penjaga read-only; versi bergaris-pengaman ada tapi mati di `server/routes/db-admin.routes.ts`                                      | Mengaktifkan penjaga **mematikan** fitur ubah/hapus baris di DB Explorer |
| 20  | Kode mati DB Explorer: toggle mode DB + request sia-sia tiap mount                                                                                                       | Perlu konfirmasi memang tak terpakai                                     |

---

### 13.5 Temuan audit F2 — gelombang 1 (auth · RBAC · socket), 16 Agu 2026

Baseline diukur ulang lebih dulu dan **cocok persis** dengan §0.1: `tsc` 0 error,
184 test / 19 suite (exit 0), build sukses, doctor SIAP JALAN (1 peringatan
`STORAGE_DRIVER=local`). Jadi seluruh temuan di bawah ada pada kondisi "sehat"
menurut gerbang dasar — persis pola yang §0 peringatkan.

Semua temuan berikut **hasil pembacaan kode**, belum ada yang dieksekusi
terhadap server hidup. Statusnya: **belum terverifikasi lewat percobaan nyata.**
Tidak ada satu baris source pun diubah untuk audit ini.

#### #49 🔴 `verifyProjectAccess(['*'])` lolos sebelum cek keanggotaan

`server/middleware/rbac.ts:46`

```ts
if (req.user && allowedRoles.includes("*")) {
  return next(); // <- keluar SEBELUM baris 52 (owner) & 57 (member)
}
```

Cek pemilik proyek (baris 52) dan keanggotaan `ProjectMembers` (baris 57) berada
**sesudahnya**, jadi tidak pernah dijalankan untuk rute `['*']`. Akibatnya `['*']`
berarti "siapa pun yang punya JWT", bukan "anggota proyek dengan peran apa pun".

Bahwa ini menyimpang dari maksud terlihat dari kontras di rute daftar proyek —
`server/routes/project.routes.ts:29-38` menyaring ketat untuk non-admin:

```sql
WHERE p.ownerId = ? OR pm.userId = ?
```

Jadi daftar proyek disaring, tetapi detail dan seluruh isinya tidak. Rute `['*']`
yang terdampak (dihitung dari definisi rute, bukan perkiraan): `project` 3,
`task` 6, `qa` 13, `meetings` 5, `documents` 5, `discussion-points` 4,
`milestones` 1, `sprints` 1. Termasuk `GET /api/projects/:projectId/documents/:id/download`
dan `GET /api/projects/:projectId/meetings/:id/download`.

Rute dengan daftar peran eksplisit (`['admin','manager','head']`) **tidak**
terdampak — keduanya benar-benar sampai ke cek keanggotaan. Kecuali
`project.routes.ts:199`, yang mencantumkan `"*"` di ujung daftar perannya
sehingga ikut korslet.

#### #50 🔴 Socket.IO tanpa autentikasi sama sekali

`server.ts:580` — `io.on("connection", ...)` dipasang **tanpa** `io.use()`
handshake di mana pun. Tidak ada verifikasi JWT pada koneksi socket. Akibat yang
terbaca dari kodenya:

| Baris                                        | Perilaku                                                                                      |
| -------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `server.ts:661` `join_project`               | Masuk room proyek mana pun hanya dengan menebak `projectId`; tidak ada cek keanggotaan        |
| `server.ts:377` `io.emit("data_changed", …)` | Setiap POST/PUT/DELETE menyiarkan path URL ke SELURUH klien, termasuk yang tak terautentikasi |
| `server.ts:637` `send_message`               | `senderId` diambil apa adanya dari payload — pesan bisa dikirim atas nama siapa pun           |
| `server.ts:644` `receiverId === "group"`     | Menyiarkan ke seluruh socket                                                                  |
| `server.ts:606` `join_presence`              | Profil pengguna diambil apa adanya dari payload                                               |

#### #51 🔴 `FORCE_LOGOUT_EVENT` menyiarkan JWT sah ke seluruh socket

`server/routes/auth.routes.ts:250`

```ts
io.emit("FORCE_LOGOUT_EVENT", { userId, newToken: token, ... });
```

`io.emit` = **semua** klien yang terhubung, bukan hanya pemilik akun. `token`
adalah JWT yang baru saja diterbitkan dan sah selama 2 jam. Digabung dengan #50
(socket tidak terautentikasi), penerimanya tidak perlu login sama sekali.

#### #52 🔴 `/api/auth/force-logout` memeriksa password tanpa pembatas laju

`server/routes/auth.routes.ts:179` memanggil `handleUserAuthentication(username,
password)` — verifikasi password penuh. Tapi `loginLimiter` hanya dipasang di
`/api/auth/login` (`server.ts:274`) dan `registerLimiter` di `/api/auth/register`
(`server.ts:293`). Yang tersisa untuk force-logout hanya `globalLimiter`
(1000 request / 5 menit) — dan globalLimiter **membebaskan localhost**
(`server.ts:243-247`), sementara loginLimiter sengaja tidak.

Komentar di `server.ts:252-256` sudah menyatakan alasannya sendiri: 1000
percobaan per IP "tidak menahan brute force sama sekali". Endpoint ini adalah
jalur kedua ke pemeriksa password yang sama, tanpa penjaga itu.

#### #53 🟠 `POST /api/auth/logout` tanpa auth menerima `userId` sembarang

`server/routes/auth.routes.ts:267-275`. Tidak ada `authenticateJWT` (dan ia
berada di bawah prefix publik `/api/auth`, `server.ts:362`). `userId` diambil
dari body lalu:

```sql
UPDATE Users SET currentSessionToken = NULL WHERE id = ?
```

`authenticateJWT` hanya menolak bila `currentToken` **terisi** dan berbeda
(`server/middleware/auth.ts:82`). Menge-NULL-kannya karena itu **melemahkan**
penegakan sesi tunggal: token lama yang tadinya sudah tergantikan menjadi
berlaku kembali sampai kedaluwarsa. Bisa dipanggil siapa saja untuk user mana pun.

#### #54 🟠 `rbac.ts:27` identitas boleh datang dari header/query/body

```ts
let userId =
  req.user?.id || req.user?.uid || req.headers["x-user-id"] || req.query.userId || req.body.userId;
```

Bila `userId` itu ketemu di tabel `Users` dan perannya `admin`, baris 41 langsung
`return next()`. **Saat ini tertutup** oleh gerbang global `authenticateJWT`
(`server.ts:360-368`) yang selalu mengisi `req.user.id`, jadi jalur cadangan itu
tidak tercapai — sudah saya periksa, seluruh rute ber-`verifyProjectAccess`
berada di bawah `/api/` dan di luar daftar publik. Tetapi ini ranjau: satu rute
baru di luar gerbang, atau satu perubahan pada daftar prefix publik, dan
impersonasi admin cukup dengan menambah satu header.

#### #55 🟡 `rbac.ts:50` `!targetProjectId → next()`

`targetProjectId` hanya dibaca dari `req.params.projectId` atau `req.params.id`.
Bila tak satu pun ada, middleware **meloloskan** permintaan. Saya sudah
memeriksa seluruh 46 rute ber-`verifyProjectAccess`: semuanya punya `:projectId`
atau `:id`, jadi **saat ini tidak tereksploitasi**. Yang jadi masalah: rute baru
dengan nama param lain (`:taskId`, `:qaId`) akan membuat RBAC-nya mati **senyap**
— tanpa error, tanpa log.

#### #56 🟡 Proses Jest mencetak crash `pg` saat dibongkar

`npm test` mencetak `TypeError: Cannot read properties of undefined (reading
'isIP')` dari `node_modules/pg/lib/connection.js:116` disertai jejak
`Connection.upgradeToSSL`. **Exit code tetap 0** dan 184 test tetap lulus, jadi
ini bukan kegagalan test — tapi polanya sama dengan insiden `getJwtSecret` di
§0.3: ada suite yang membuka koneksi Postgres sungguhan lalu tersambung setelah
Jest membongkar lingkungannya. Dibiarkan, ia bisa berubah jadi exit code 1 yang
membingungkan seperti dulu. Dimasukkan ke **F8** (jaring pengaman), bukan F2.

#### Yang BELUM disentuh gelombang ini

Dari 9 area §13.1, gelombang 1 hanya menutup RBAC (sebagian), Socket.IO
(sebagian), dan kedaluwarsa/sesi JWT (sebagian). Masih `TERBUKA` penuh:
104 endpoint, perhitungan (progress/sprint/KPI/timeline), alur state antar view,
race condition, alur unggah–simpan–tampil, penanganan error & rollback transaksi.
Urutan berikutnya menurut §13.2: `task` (46 query) → `qa` (33) → `project` (30).

### 13.6 Temuan tambahan saat verifikasi #49 — 16 Agu 2026

Keduanya muncul di luar rencana, saat memeriksa apa yang sedang menempati port
3000. Berbeda dari §13.5, dua temuan ini **sudah dibuktikan dengan permintaan
nyata** ke instance yang sedang berjalan.

#### #57 🟡 Dua endpoint health; yang terdokumentasi justru terkunci auth

| Endpoint | Terdaftar di | Hasil `curl` tanpa token |
| -------- | ------------ | ------------------------ |
| `/api/health` | `server/routes/health.routes.ts:24` | **401** — bukan di daftar prefix publik |
| `/api/health-check` | `server.ts:505` | **200** `{"status":"ok","migrasi":"berhasil"}` |

Daftar prefix publik di `server.ts:362` hanya memuat `/api/auth` dan
`/api/health-check`, jadi `/api/health` tertutup gerbang global. Probe uptime
eksternal (termasuk pemeriksa platform) yang menembak `/api/health` akan selalu
mendapat 401 dan menyimpulkan aplikasi mati.

§0.6 menyebut status migrasi "terbaca di `/api/health`" — **itu keliru**, yang
benar `/api/health-check`. Perlu keputusan: buka `/api/health` sebagai publik,
atau hapus salah satunya supaya tidak ada dua sumber kebenaran.

#### #58 🟠 `GET /metrics` terbuka tanpa autentikasi

`server/routes/health.routes.ts:7`. Karena path-nya **tidak** diawali `/api/`,
gerbang global di `server.ts:360-368` tidak pernah menyentuhnya. Dibuktikan:

```
$ curl -o /dev/null -w "%{http_code}" http://localhost:3000/metrics
200
```

Isinya metrik Prometheus: waktu CPU proses, dan `httpRequestsTotal` yang
berlabel **method, route, dan status** — artinya peta rute internal beserta pola
lalu lintas dan tingkat errornya terbaca siapa pun. Bukan kebocoran data
pengguna, tapi bahan pengintaian yang bagus, dan gratis untuk ditutup.

#### #59 🔴 `presence_sync` menyiarkan profil lengkap beserta matriks permission

Ditemukan saat membuktikan #50, dan lebih berat dari #50 itu sendiri.

`server.ts` menyimpan objek user **apa adanya** dari payload klien ke
`globalPresence`, lalu menyiarkan seluruh isinya lewat `io.emit("presence_sync",
…)`. Karena `join_presence` dipanggil klien dengan profil pengguna yang sedang
login, yang tersiar bukan sekadar "siapa yang online" melainkan:

email · nomor telepon · departemen · jabatan · path avatar · **seluruh matriks
permission** (16 modul × create/read/update/delete)

Dibuktikan dengan klien anonim, tanpa token: profil lengkap akun `admin` yang
sedang login diterima utuh. Juga terbukti bisa menyuntikkan identitas palsu —
hadir sebagai pengguna lain hanya dengan menyebut id-nya di payload.

### 13.7 Kartu verifikasi gelombang 1 — apa yang terbukti, apa yang belum

Dicatat terpisah supaya tidak ada yang menyimpulkan "sudah diperbaiki" sama
dengan "sudah terbukti bekerja untuk pengguna sungguhan".

| # | Terbukti | Sisa |
| - | -------- | ---- |
| 49 | Test yang sama dibuktikan MERAH terhadap commit sebelum perbaikan (`git worktree` di luar repo). **Jalur anggota non-admin diuji sungguhan:** `rido` (peran `user`, anggota `2SGXiPUTwHnF8D576hfO`) login dan memakai aplikasi — 0 "Akses ditolak", 0 RBAC error | — |
| 52 | Regex penjaga dibuktikan tidak cocok pada `server.ts` sebelum perbaikan; aplikasi normal dengan pembatas terpasang | Penolakan percobaan ke-11 belum diuji perilakunya — penjaganya STATIS |
| 50 + 59 | Klien anonim yang sama kini dijawab `AUTENTIKASI_DIBUTUHKAN`, token palsu dijawab `TOKEN_TIDAK_VALID`. **Realtime terbukti tetap hidup** untuk dua pengguna sekaligus: socket lolos gerbang, `[CHAT_SOCKET] User rido`, `[GLOBAL PRESENCE] Total online: 2`, dan data pengguna lain muncul di layar tanpa muat ulang | — |
| 51 | Sidik jari dicocokkan dengan nilai SHA-256 acuan yang dikenal, sehingga sisi server & peramban tidak sekadar sepakat pada implementasi yang sama | Pemicunya sendiri — memancing `FORCE_LOGOUT_EVENT` butuh username & password sungguhan |

**Verifikasi penentu, 16 Agu 2026.** Dua sesi berjalan bersamaan di Chrome —
`admin` dan `rido`. Ini yang membuat #49 dan #50 benar-benar tertutup, sebab
sesi admin saja TIDAK cukup: admin `return next()` di `rbac.ts:41`, sebelum baris
yang diubah. Hanya sesi non-admin yang melewatinya.

Bukti dari log server, empat layar (Dashboard, Documentation, Team, QA):

```
[CHAT_SOCKET] User rido terhubung dengan socket 82WX32KFkzegv5RZAAAL
[PRESENCE] Rido bergabung di proyek 2SGXiPUTwHnF8D576hfO
[GLOBAL PRESENCE] User Rido joined. Total online: 2
```

`Akses ditolak` 0 · `RBAC Middleware error` 0 · `LOG ANOMALI` 0 · error console 0.

Keempatnya di-merge ke `main` dengan urutan #49 → #52 → #50 → #51 (#51 dibangun
di atas #50 dan memerlukan `roomPengguna` serta `penjagaSocket` dari sana).
Gerbang di `main` sesudah merge: tsc 0 · lint 0 · **216 test / 22 suite** ·
build sukses · doctor SIAP JALAN.

Dua sisa di kolom kanan sengaja tidak dipaksakan tertutup. Keduanya butuh
memancing kejadian yang menuntut kredensial sungguhan, dan itu tidak dilakukan.

### 13.8 Temuan audit F2 — gelombang 2 (task · project · transaksi), 16 Agu 2026

Sasaran gelombang ini: **penanganan error & rollback transaksi**, salah satu dari
9 area §13.1 yang sebelumnya belum tersentuh. Semua temuan hasil pembacaan kode;
tidak ada yang dipicu terhadap server hidup, dan tidak ada source yang diubah.

Benang merahnya satu: **sisa-sisa MySQL di basis kode yang kini murni Postgres.**
Ketiganya (#60, #62, #63) tidak menghasilkan error saat build maupun test — ia
hanya diam sampai jalur galatnya benar-benar terlewati.

#### #60 🔴 `POST /api/projects/:projectId/tasks` membuka transaksi tanpa `ROLLBACK`

`server/routes/task.routes.ts:290` `START TRANSACTION` → `:306` `COMMIT`.
`catch` di `:468` **tidak** memanggil rollback, dan `finally` di `:471`
mengembalikan koneksi ke pool.

Yang membuat ini serius adalah perilaku pelepasannya. `src/lib/db.ts:255`:

```ts
release: () => { try { client.release(); } catch {} },
```

Tidak ada reset, tidak ada rollback. Jadi bila salah satu query di antara baris
290 dan 306 gagal — `SELECT … FOR UPDATE` bentrok kunci, atau `UPDATE` gagal —
koneksi kembali ke pool dengan **transaksi masih terbuka**, memegang kunci baris
`Projects`. Permintaan berikutnya yang mengambil koneksi itu mewarisi transaksi
tersebut.

Bahwa pola yang benar sudah dikenal di repo ini terlihat di
`server/routes/project.routes.ts:498-499`, yang memanggil `connection.rollback()`
di `catch`. Rute task hanya tidak mengikutinya. Adapter juga sudah menyediakan
`beginTransaction`/`commit`/`rollback` (`src/lib/db.ts:246-254`), tapi rute ini
memakai SQL mentah.

#### #61 🟠 Transaksinya hanya melingkupi penghitung, bukan task-nya

Masih di rute yang sama: `COMMIT` terjadi di baris 306, sedangkan `INSERT` task
baru berlangsung jauh sesudahnya. Artinya `taskCounter` sudah bertambah permanen
sebelum task-nya ada. Bila pembuatan task gagal, penghitung tetap termakan dan
penomoran `PROJECTKEY-n` berlubang.

Tidak berbahaya bagi data, tapi bertentangan dengan komentar di atasnya sendiri
yang menyebut "atomic increment-and-read … to prevent race conditions".

#### #62 🟠 Hapus proyek: kode galat MySQL & `continue` yang mustahil di Postgres

`server/routes/project.routes.ts:477-490` menjalankan 22 perintah `DELETE`
berurutan di dalam satu transaksi, dan sengaja melewati tabel yang tidak ada:

```ts
if (execError.code === "ER_NO_SUCH_TABLE" || execError.code === "ER_BAD_TABLE_ERROR" …)
  continue;
```

Dua hal salah sekaligus:

1. `ER_NO_SUCH_TABLE` dan `ER_BAD_TABLE_ERROR` adalah kode **MySQL**. Postgres
   memakai `42P01`, jadi cabang ini tidak pernah tercapai.
2. Bahkan seandainya kodenya benar, `continue` tetap tidak bisa bekerja: di
   Postgres, satu galat **membatalkan seluruh transaksi**. Perintah berikutnya
   pasti gagal dengan "current transaction is aborted".

Akibatnya satu tabel yang hilang membuat seluruh penghapusan gagal, sementara
pesan yang sampai ke pengguna menyalahkan "kendala integritas database".

#### #63 🟠 Register menelan kode duplikat milik MySQL

`server/routes/auth.routes.ts:400`:

```ts
if (insertError.code === "ER_DUP_ENTRY" || insertError.errno === 1062) { … }
else { throw insertError; }
```

Postgres memakai `23505` untuk pelanggaran keunikan, jadi cabang penelan itu
tidak pernah tercapai dan galatnya **selalu** dilempar ke `catch` luar. Alih-alih
jawaban 201 dengan pesan "hubungi Admin untuk diaktifkan", pendaftaran dengan
email yang sudah ada menghasilkan **500 "Terjadi kesalahan internal server"**.

**Belum dipicu terhadap server hidup** — membuktikannya berarti mencoba membuat
akun, dan itu tidak dilakukan.

#### #64 🟡 `tasks/reorder` berpotensi melepas koneksi dua kali

`server/routes/task.routes.ts:501-515`. `connection.release()` dipanggil di dalam
`try` setelah `commit`, lalu `catch` memanggil `rollback()` **dan** `release()`
lagi. Bila ada yang gagal setelah `commit` — misalnya pemancaran socket di
bawahnya — koneksi yang sudah dilepas akan di-rollback dan dilepas ulang.

Dampaknya kecil karena `release()` membungkus dirinya dengan `try/catch`, tapi
`rollback()` pada koneksi yang sudah kembali ke pool bisa mengenai transaksi
milik permintaan lain.

#### Kartu verifikasi #60, #62, #63 — SELESAI 16 Agu 2026

| # | Terbukti | Sisa |
| - | -------- | ---- |
| 60 | 5 test perilaku lewat supertest, menjalankan rutenya sungguhan dan memaksa galat tepat di dalam jendela transaksi. **4 dari 5 dibuktikan MERAH** terhadap commit sebelum perbaikan di `git worktree` luar repo; yang 1 lulus memang sudah benar | — |
| 62 | Dibuktikan langsung ke database (semua di dalam transaksi yang di-ROLLBACK): kode lama → `25P02 current transaction is aborted`; kode baru → setelah `ROLLBACK TO SAVEPOINT`, perintah berikutnya **berhasil**. SQLSTATE nyatanya `42P01` | Penghapusan proyek sungguhan — merusak, tidak dijalankan |
| 63 | 8 test, termasuk penguncian bahwa kode MySQL lama TIDAK lagi dianggap cocok | Pendaftaran email ganda — berarti membuat akun, tidak dijalankan |

Diverifikasi di browser dengan **sesi non-admin (`rido`)**: dashboard termuat
penuh, menu khusus admin tidak muncul, 0 error console, dan dari log server
0 "Akses ditolak" · 0 `RBAC Middleware error` · 0 `LOG ANOMALI`.

`main` sesudah merge: tsc 0 · **229 test / 24 suite** · build sukses.

⚠️ Satu jebakan baru yang layak dicatat: saat server di-restart, tab yang
sedang terbuka menampilkan **skeleton yang tidak pernah selesai** dan console
memuat `xhr poll error`. Itu bukan cacat kode — halaman kebetulan dimuat saat
server sedang mati. Setelah muat ulang, semuanya normal. Gejalanya sangat mirip
kerusakan sungguhan, jadi periksa timestamp-nya sebelum menyimpulkan.

#### Kartu verifikasi #61 & #64 — SELESAI 16 Agu 2026

| # | Terbukti | Sisa |
| - | -------- | ---- |
| 61 | 3 test perilaku, **ketiganya MERAH** terhadap `main` di worktree luar repo, sementara 5 test #60 di berkas yang sama tetap hijau — jadi batas transaksinya bergeser tanpa melemahkan penguncian #60 | — |
| 64 | 4 test perilaku memakai `io` yang sengaja melempar galat saat memancarkan event, satu-satunya jalur yang memicu kasus ini. **1 test MERAH** terhadap `main`, 3 lainnya hijau | — |

⚠️ **Satu test #60 sengaja diubah, dan itu bukan pelemahan.** Test
"tidak me-rollback transaksi yang sudah di-commit" memakai kegagalan pada
`INSERT INTO Tasks` sebagai titik "sesudah commit". Premis itu ikut berubah
karena #61 memang menggeser `commit` ke sesudah `INSERT`, jadi titik gagalnya
dipindah ke pengambilan data reporter — tetap sesudah commit. Bukti bahwa
asersinya tidak dilemahkan: kelima test #60 tetap hijau saat dijalankan
terhadap commit sebelum #61.

Diverifikasi di browser dengan sesi non-admin (`rido`): dashboard termuat
penuh, 0 error console, dan dari log server 0 "Akses ditolak" · 0
`RBAC Middleware error` · 0 `LOG ANOMALI`.

`main` sesudah merge: tsc 0 · lint 0 · **236 test / 25 suite** · build sukses.

**Gelombang 2 TUTUP.** Kelima temuannya (#60–#64) `SELESAI`. Area §13.1
"penanganan error & rollback transaksi" karena itu naik dari `TERBUKA` menjadi
sebagian tertutup — tiga rute penulis utama sudah rapi, tetapi 100+ endpoint
lain belum ditelusuri satu per satu.

#### Yang belum tersentuh sesudah gelombang 2

Masih `TERBUKA` penuh: 104 endpoint, perhitungan (progress/sprint/KPI/timeline —
baru diperiksa sekilas, pembagiannya sudah dijaga `=== 0`), alur state antar
view, race condition, alur unggah–simpan–tampil. Berikutnya `qa` (33 query).

### 13.9 Temuan audit F2 — gelombang 3 (qa · race condition), 16 Agu 2026

#### #65 🔴 `affectedRows` selalu `undefined` — optimistic locking gagal SENYAP

Adapter mengembalikan `[result.rows, result.fields]` (`src/lib/db.ts:228`).
`result.rowCount` **dibuang**, dan `affectedRows` adalah properti MySQL yang
tidak pernah ada di node-postgres. Jadi setiap `affectedRows === 0` berbunyi
`undefined === 0`, yang selalu `false`.

Dibuktikan dengan UPDATE nyata memakai adapter repo apa adanya, seluruhnya di
dalam transaksi yang di-ROLLBACK:

```
UPDATE 0 baris  -> []   .affectedRows: undefined   `=== 0` bernilai: false
UPDATE 1 baris  -> []   .affectedRows: undefined      <- tak terbedakan
RETURNING id    -> jumlah baris: 1                    <- cara yang bekerja
```

Tiga tempat terdampak, dan yang pertama jauh lebih berat dari dua lainnya:

| Lokasi | Akibat |
| ------ | ------ |
| `server/routes/task.routes.ts:959` | **Penjaga jendela balapan mati.** SQL-nya memakai `AND version = ?`, jadi saat kalah balapan UPDATE tidak menulis apa pun — tetapi API tetap menjawab 200 dan memancarkan `task_updated`. Suntingan pengguna **hilang tanpa pesan apa pun** |
| `server/routes/auth.routes.ts:146` | Login: 404 "User tidak ditemukan" tidak pernah terkirim |
| `server/routes/auth.routes.ts:242` | force-logout: sama |

**KOREKSI atas catatan pertama temuan ini.** Versi awal §13.9 menulis
"optimistic locking mati" dan "409 tidak pernah terkirim". Itu **berlebihan**,
dan yang menunjukkannya adalah test yang ditulis untuk menguncinya — test 409
pertama justru LULUS terhadap kode lama. Rute ini punya **dua** pemeriksaan
konflik, dan hanya satu yang rusak:

| Pemeriksaan | Keadaan |
| ----------- | ------- |
| `oldTask.version !== version` (`task.routes.ts:773`), dibandingkan di memori | **Sehat sejak dulu.** Menangkap kasus terlumrah: klien membawa versi usang, dijawab 409 "Konflik versi tugas" |
| Hasil `AND version = ?` pada UPDATE (`:959`) | **Mati.** Menjaga jendela balapan sesungguhnya |

Jadi yang hilang adalah penjaga **jendela balapan**: penulis lain menyelesaikan
UPDATE-nya di antara `SELECT` dan `UPDATE` permintaan ini. Versi yang dibawa
klien masih cocok dengan yang dibaca, sehingga penjaga pertama meloloskannya,
tetapi barisnya sudah bergeser. Di situlah 200 palsu terjadi.

Lebih sempit dari dugaan pertama, tetapi tetap 🔴: jendela itulah satu-satunya
yang tidak bisa ditangkap klien, dan kegagalannya berupa kehilangan data yang
senyap. Ini juga mengisi area §13.1 **race condition** yang selama ini kosong.

⚠️ Perbaikannya **tidak boleh** lewat `src/lib/db.ts` (§0.5 aturan 3). Jalur yang
benar adalah `RETURNING` di sisi pemanggil, sebagaimana terbukti di atas.

#### Kartu verifikasi #65 — SELESAI 16 Agu 2026

| Yang diperiksa | Hasil |
| -------------- | ----- |
| Perilaku jendela balapan | 6 test; **3 MERAH** terhadap `main` di worktree luar repo, 3 sisanya (pengunci perilaku yang sudah benar) tetap hijau di sana |
| `RETURNING id` sah di Postgres | Dibuktikan langsung ke database: `RETURNING id -> jumlah baris: 1` |
| Aplikasi berjalan | Sesi non-admin (`rido`), dashboard termuat penuh, 0 error console |
| Log server | 0 "Akses ditolak" · 0 `RBAC Middleware error` · 0 `LOG ANOMALI` · 0 `query error` |

⚠️ **BELUM terverifikasi: jalur login itu sendiri.** Dua dari tiga perbaikan #65
berada di `auth.routes.ts` (login dan force-logout), dan sesi `rido` yang dipakai
menguji sudah terbentuk SEBELUM perubahan itu — jadi query-nya belum pernah
benar-benar dijalankan. Bentuk SQL-nya sudah dibuktikan sah terhadap database,
tetapi alurnya belum. **Cukup satu kali logout lalu login ulang** untuk
menutupnya; itu tidak dilakukan di sini karena menuntut kredensial.

#### #66 🔴 Lima rute DELETE dijaga hanya `['*']`

Sesudah #49, `['*']` berarti "anggota proyek dengan peran apa pun" — termasuk
`viewer`. Lima operasi merusak berada di bawah penjaga itu:

```
DELETE /api/projects/:projectId/documents/:id
DELETE /api/projects/:projectId/meetings/:id
DELETE /api/projects/:projectId/meetings/:id/discussionPoints/:pointId
DELETE /api/projects/:projectId/qa-test-cases/:id
DELETE /api/projects/:projectId/qa-test-suites/:id
```

Yang terakhir menghapus berjenjang: seluruh test case di dalam suite ikut
terhapus (`qa.routes.ts:405-418`).

Bandingkan dengan `milestones` dan `sprints`, yang penghapusannya sudah dibatasi
`['admin','head']` dan `['admin','manager','head']`. Jadi pembatasannya memang
sudah menjadi kebiasaan di repo ini — lima rute ini tertinggal.

**`MENUNGGU` keputusan pemilik proyek**, bukan diperbaiki sepihak: menaikkan
penjaganya akan MENOLAK pengguna yang selama ini bisa menghapus. Yang perlu
diputuskan cuma satu — peran mana yang boleh menghapus tiap jenis data.
Rekomendasi, mengikuti pola yang sudah ada: `['admin','manager','head']` untuk
dokumen/rapat/QA, dan poin diskusi mengikuti pembuatnya.

### 13.10 Temuan audit F2 — gelombang 4 (alur unggah–simpan–tampil), 16 Agu 2026

Area §13.1 "alur unggah–simpan–tampil" sebelumnya berstatus "baru dibaca kodenya,
belum dijalankan". Kini dijalankan.

**Sisi UNGGAH ternyata solid** — tidak ada temuan, dan itu layak dicatat supaya
tidak diperiksa ulang tanpa alasan. `validateFileBuffer` (`src/lib/fileSecurity.ts:81`)
menegakkan whitelist ekstensi, menolak header executable (MZ/ELF/Java/shebang),
mencocokkan magic bytes per tipe, membatasi ukuran, memindai `<script>` /
`javascript:` / `onerror=` pada 2 KB pertama, lalu memberi nama berkas
`nama_<timestamp>_<6 byte acak>.<ext>` sehingga tidak mungkin bertabrakan.

Yang bermasalah adalah sisi **TAMPIL**.

#### #67 🔴 `/uploads` menyajikan semua berkas gambar tanpa autentikasi

`server.ts:338`:

```ts
// 3. For public image assets like user profile avatars, allow rendering if
//    filename starts with avatar- or is an image
if (!isAuthorized && (safeName.startsWith('avatar-') || /\.(png|jpe?g|webp|gif)$/i.test(safeName))) {
  isAuthorized = true;
}
```

Klausa keduanya yang jadi soal. Niatnya "avatar boleh publik", tetapi
`/\.(png|jpe?g|webp|gif)$/` membuat **setiap berkas berekstensi gambar** ikut
publik — termasuk yang diunggah lewat `POST /api/v1/upload-document`, yang
memang menerima `png`/`jpg`. Artinya tangkapan layar bukti QA, dokumen hasil
pindai, dan foto papan tulis rapat bisa dibaca siapa pun yang tahu namanya,
tanpa token dan tanpa login.

Dibuktikan terhadap server yang sedang berjalan, tanpa kredensial apa pun:

```
avatar-1-1786840166479.jpg   -> 200
avatar-rido-1786779498126.png -> 200
```

Nama berkas memang memuat 6 byte acak sehingga sulit ditebak, tetapi "sulit
ditebak" bukan kendali akses — URL bocor lewat riwayat peramban, header
referrer, tautan yang diteruskan, dan `presignedUrl` yang tampil apa adanya di
respons API.

Yang membuatnya lebih buruk: pesan penolakan di `server.ts:345` menyatakan
"Storage Bucket bersifat PRIVATE. Akses file membutuhkan Presigned URL yang sah
atau Autentikasi JWT" — dan untuk berkas gambar itu **tidak benar**.

**`MENUNGGU` keputusan pemilik proyek.** Yang perlu diputuskan satu hal:
apakah avatar memang disengaja publik? Bila ya, perbaikannya cukup membuang
klausa ekstensi dan menyisakan `startsWith('avatar-')`. Bila tidak, keduanya
dibuang dan avatar ikut lewat token — tetapi itu menuntut penyesuaian di sisi
antarmuka pada setiap tempat avatar dirender.

#### #68 🔴 `DELETE .../tasks/:taskId/links/:linkId` tanpa penjaga sama sekali

`server/routes/task.routes.ts:1577`. Rute ini **tidak punya**
`verifyProjectAccess`; yang menjaganya hanya gerbang global `authenticateJWT`.
Siapa pun yang login — dari proyek mana pun — bisa menghapus tautan task di
proyek orang lain hanya dengan mengetahui `taskId` dan `linkId`.

**Ditemukan oleh test, bukan oleh mata.** Daftar #66 hasil pembacaan manual
hanya memuat lima rute ber-`['*']`; yang ini luput justru karena tidak punya
penjaga untuk dicari. Test penjaga #66 sengaja ditulis memeriksa SELURUH rute
DELETE di 8 berkas rute, bukan hanya lima yang diputuskan — dan itulah yang
menangkapnya.

Bukan kebijakan baru: pasangan `POST`-nya (`:1530`) sudah memakai
`['admin','manager','head','developer','member']`, dan daftar itu yang dipakai.

### Kartu verifikasi gelombang 4 — #58, #66, #67, #68 SELESAI 16 Agu 2026

Ketiga keputusan pemilik proyek diambil 16 Agu 2026 lewat pilihan tertulis:
avatar tetap publik (#67), penghapusan dibatasi admin/manager/head (#66), dan
`/metrics` dijaga token khusus (#58).

| # | Terbukti | Sisa |
| - | -------- | ---- |
| 67 | Terhadap server berjalan tanpa kredensial: avatar tetap `200`, berkas gambar non-avatar berubah `200` → **`403`**. Berkas uji dibuat di `uploads/` (data runtime ber-gitignore) lalu dihapus | — |
| 66 + 68 | 5 test penjaga, **4 MERAH** terhadap `main` di worktree luar repo | Penolakan `viewer` sungguhan — penjaganya STATIS; perilaku `verifyProjectAccess` sendiri diuji di `rbac.test.ts` |
| 58 | 7 test perilaku, **5 MERAH** terhadap `main`. Terhadap server berjalan: `/metrics` → **503**, `/api/health-check` tetap `200` | Scraping dengan token sungguhan — `METRIK_TOKEN` sengaja dibiarkan kosong |

⚠️ **`METRIK_TOKEN` masih KOSONG di `.env`**, jadi `/metrics` saat ini
**dinonaktifkan (503)**. Itu perilaku yang disengaja — aman secara bawaan. Isi
variabelnya bila Prometheus perlu kembali men-scrape; contoh pembuatannya ada di
`.env.example`. Nilainya tidak diisi dari sisi ini karena itu rahasia milik
pemilik proyek.

⚠️ **Satu test lama sengaja diubah, dan itu bukan pelemahan.**
`health.routes.test.ts` memuat `expect([200, 500]).toContain(status)` yang
mengunci keadaan SEBELUM #58 — endpoint terbuka. Ia gagal setelah perubahan,
dan justru kegagalannya membuktikan perubahan berlaku. Asersinya disesuaikan ke
`[401, 503]` **plus** penjaminan bahwa isi metrik tidak ikut terkirim.

`main` sesudah merge: tsc 0 · lint 0 · **254 test / 28 suite** · build sukses ·
doctor SIAP JALAN. Diverifikasi di browser dengan sesi non-admin (`rido`):
dashboard termuat penuh, avatar tetap tampil, 0 error console, dan dari log
server 0 "Akses ditolak" · 0 `LOG ANOMALI` · 0 `query error`.

### 13.11 Temuan audit F2 — gelombang 5 (104 endpoint), 16 Agu 2026

Area §13.1 "104 endpoint · tak satu pun diuji perilakunya" akhirnya ditelusuri
**menyeluruh**, bukan lewat sampel. Metodenya sama dengan yang menemukan #68:
memetakan penjaga SETIAP rute, lalu membaca isi handler yang tampak telanjang.

**119 rute terdeteksi, 84 di antaranya mutasi** (POST/PUT/PATCH/DELETE).
Angka 104 di §13.1 karena itu perlu dikoreksi menjadi **119**.

⚠️ **Hasil pemindaian bukan temuan.** Beberapa rute yang tampak tanpa penjaga
ternyata memeriksanya DI DALAM handler, dan itu hanya terlihat dengan membaca.
Contoh terbaik `POST /api/chat/messages` (`chat.routes.ts:131`): tanpa
`verifyProjectAccess`, tetapi memakai `matchesCaller(req.user, senderId)` dan
menolak 403. **Bukan temuan.** Empat rute lain gugur dengan alasan serupa.

#### #69 🔴 `POST /api/users/:userId/notifications` tanpa cek kepemilikan

Yang membuatnya meyakinkan adalah kontras di dalam berkasnya sendiri:

| Rute | Penjaga |
| ---- | ------- |
| `GET /api/users/:userId/notifications` (`:19`) | Ada — komentarnya bahkan menyebut "Anti-IDOR / Data Leakage Protection" |
| `PUT /api/users/:userId/notifications/:id` (`:274`) | Ada — `matchesCaller(req.user, userId)` |
| `POST /api/users/:userId/notifications` (`:233`) | **TIDAK ADA** |

`recipientId` diambil dari parameter URL dan `senderId` dari body — keduanya
tidak diperiksa. Siapa pun yang login bisa menyuntikkan notifikasi ke kotak
masuk siapa pun, **mengatasnamakan orang lain**. Itu jalur phishing di dalam
aplikasi: notifikasi palsu dari "Administrator" tampak asli karena memang
dirender oleh aplikasi sendiri.

#### #70 🔴 Rute `/api/v1/meetings/:id*` tanpa penjaga proyek

`meetings.routes.ts`. `POST /api/projects/:projectId/meetings/:id/upload-recording`
sekilas aman karena ber-`:projectId`, tetapi isinya hanya:

```ts
res.redirect(307, `/api/v1/meetings/${req.params.id}/upload-recording`);
```

dan tujuannya itu **tidak** punya penjaga proyek. Serupa untuk `/cancel`,
`/analyze`, dan `GET /api/v1/meetings/:id` yang mengembalikan seluruh baris
rapat. Jadi siapa pun yang login bisa membaca, mengunggah rekaman ke, dan
membatalkan rapat di proyek mana pun, cukup bermodal id rapat.

#### #71 🟠 `project-modules` POST/PUT/DELETE tanpa penjaga

`projectId` diambil dari body dan tidak pernah diadu dengan keanggotaan
pemanggil. Siapa pun yang login bisa membuat, mengubah, dan menghapus modul di
proyek mana pun.

#### #72 🟠 Enam belas rute POST/PUT/PATCH masih ber-`['*']`

#66 baru menutup sisi DELETE. Sisi buat/ubah masih terbuka bagi anggota berperan
apa pun, termasuk `viewer`: `documents` (2), `meetings` (2),
`discussion-points` (2), `qa` (8), `task` (2 — komentar dan activity).

Perlu keputusan yang sama bentuknya dengan #66: peran mana yang boleh membuat
dan mengubah. Tidak otomatis sama dengan hak menghapus — lumrah bila `developer`
dan `member` boleh menulis tetapi tidak boleh menghapus.

#### #73 🟡 `"*"` diselipkan di daftar peran `dashboard-layout`

```ts
verifyProjectAccess(["admin", "manager", "head", "developer", "designer", "viewer", "*"])
```

`project.routes.ts:199`. Sekilas tampak dibatasi enam peran, padahal `"*"` di
ujungnya membuat penjaganya berperilaku persis seperti `['*']`. Sudah disinggung
di §13.5 saat #49 dikerjakan, kini diberi nomor sendiri supaya tidak hilang.

#### Yang tersisa di F2 sesudah gelombang 5

Satu area §13.1 belum tersentuh: **alur state antar view** (21 `useState` +
21 `useEffect` di `AppContainer`, 47 props). Sisanya sudah `JALAN` atau tertutup.

### 13.12 Temuan audit F2 — gelombang 6 (alur state antar view), 16 Agu 2026

Area §13.1 terakhir. Dengan ini **kesembilan area sudah ditelusuri**.

#### #74 🟠 Tujuh pengambil data tanpa penjaga respons basi

`src/AppContainer.tsx`. Efek pengambil data bergantung pada
`[selectedProject?.id]` dan memakai jeda 300 ms dengan `clearTimeout` di
cleanup. Jeda itu menahan permintaan yang belum berangkat — tetapi **tidak
membatalkan yang sudah berangkat**, dan hasilnya tetap ditulis ke state tanpa
memeriksa apakah proyeknya masih sama.

Kontras di dalam berkas yang sama membuat ini jelas bukan gaya melainkan
kelalaian: `fetchMembers` (`:1300`) memakai penjaga `isMounted` dan
membersihkannya di cleanup. Tujuh pengambil lain tidak.

| Pengambil | Penjaga | `setState` | Ulangan 429 memakai closure basi |
| --------- | :-----: | :--------: | :------------------------------: |
| `fetchSprints` | — | 3 | **ya** |
| `fetchActivityLogs` | — | 3 | **ya** |
| `fetchProjects` | — | 3 | **ya** |
| `fetchTasks` | — | 3 | — |
| `fetchComments` | — | 2 | — |
| `fetchMasterData` | — | 3 | — |
| `fetchMembers` | `isMounted` | — | — |

Akibatnya: berpindah dari proyek A ke B di dalam jendela permintaan membuat
jawaban A bisa mendarat **sesudah** jawaban B, sehingga layar proyek B
menampilkan sprint dan aktivitas milik proyek A. Tidak ada error, tidak ada
peringatan — persis bentuk kegagalan yang §13.1 khawatirkan: "salah hitung
tidak melempar error, ia hanya menampilkan angka keliru".

Yang memperburuk pada tiga pengambil: jalur ulangan 429 memanggil
`setTimeout(fetchSprints, 5000)`. Fungsi itu menangkap `selectedProject` dari
lima detik sebelumnya, jadi sesudah 429 data proyek lama hampir pasti mendarat
di layar proyek yang sedang dibuka.

**`MENUNGGU` keputusan.** Perbaikannya sendiri jelas — tangkap `selectedProject.id`
saat permintaan berangkat, lalu buang hasilnya bila id sudah berubah — tetapi
letaknya di `AppContainer.tsx`, tempat state global aplikasi. Aturan §0.5 nomor 1
dan pemisahan cakupan menuntut persetujuan sebelum menyentuhnya. Perlu juga
disepakati apakah jalur ulangan 429 dipertahankan atau dibuang.

#### #75 🟡 Angka dokumen drift lagi — sudah dikoreksi

Dua angka yang dipakai untuk menakar pekerjaan ternyata keliru:

| Tempat | Tertulis | Aktual |
| ------ | -------- | ------ |
| §13.1 "104 endpoint" | 104 | **119** rute (84 mutasi) |
| §13.1 "21 `useState` di AppContainer" | 21 | **11** |

Keduanya dikoreksi di §13.11 dan di sini. Ini pengulangan item #12 dari F0 —
angka dokumen memburuk lagi begitu kode bergerak. Dicatat sebagai temuan
tersendiri supaya polanya terlihat, bukan diperbaiki diam-diam.

---

### 13.13 Temuan #78 — tabel `TaskAttachments` tidak ada di database

Ditemukan 16 Agu 2026 saat mengukur volume berkas untuk memilih penyedia
penyimpanan — bukan dari audit yang direncanakan. Dicatat karena cara
menemukannya sendiri berguna: **pertanyaan sizing memaksa melihat data nyata**,
dan data nyata membantah kode.

#### Yang terjadi

| Lokasi | Tabel yang dipakai | Ada di database? |
| ------ | ------------------ | :--------------: |
| `server/routes/task.routes.ts:419` — menyimpan lampiran task | `TaskAttachments` | ❌ **TIDAK ADA** |
| `server/routes/project.routes.ts:439` — membersihkan saat proyek dihapus | `Attachments` | ✅ ada |

Diverifikasi ke `information_schema` pada database hidup: **30 tabel**, tidak
satu pun bernama `TaskAttachments`. Yang ada adalah `Attachments`.

Akibatnya **membuat task dengan lampiran SELALU gagal** — `INSERT` melempar
`42P01 relation does not exist`.

#### Interaksinya dengan #61, dan kenapa itu penting

Perilakunya berubah karena perbaikan #61, dan perubahan itu perlu dicatat supaya
tidak disalahpahami sebagai regresi:

| | Sebelum #61 | Sesudah #61 |
| --- | --- | --- |
| Penghitung task | Bertambah permanen | Dikembalikan |
| Baris task | **Tercipta**, lalu yatim tanpa lampiran | Tidak tercipta |
| Jawaban ke pengguna | 500 | 500 |

Jadi #61 **tidak menyebabkan** kegagalan ini — jalur itu sudah gagal sebelumnya,
hanya menyisakan task yatim. Sesudah #61 kegagalannya menjadi bersih: tidak ada
task setengah jadi. Tetap 500, tetap harus diperbaiki.

Bahwa bug ini bertahan sekian lama menunjukkan jalur lampiran task **belum
pernah benar-benar dijalankan** — sejalan dengan §14.2 yang mencatat seluruh
9 alur ujung-ke-ujung masih `TERBUKA`.

#### Yang perlu diputuskan sebelum diperbaiki

Bukan sekadar mengganti nama tabel. Perlu dipastikan lebih dulu:

1. `Attachments` yang ada sekarang — apakah skemanya cocok dengan kolom yang
   ditulis `task.routes.ts` (`id, taskId, name, url, fileType, uploadedByName,
   createdAt`)?
2. Bila cocok: cukup samakan nama, dan `project.routes.ts` sudah benar.
3. Bila tidak cocok: `TaskAttachments` perlu dibuat lewat sistem migrasi tunggal
   (#1), DAN `project.routes.ts:439` ikut diperbaiki agar membersihkannya —
   kalau tidak, lampiran tertinggal saat proyek dihapus.

⚠️ Jangan diperbaiki dengan `CREATE TABLE` manual di luar sistem migrasi. Item #1
menyatukan tiga sistem migrasi jadi satu justru supaya keadaan seperti ini tidak
lahir lagi.

#### Jebakan yang ikut ditemukan

Adaptor `src/lib/db.ts` **mencegat kueri `information_schema`** dan mengembalikan
bentuknya sendiri — `{ tableName, rowCount, sizeBytes }`, bukan `{ table_name }`.
Memeriksa keberadaan tabel dengan `x.table_name` mengembalikan `undefined` untuk
SEMUA baris, sehingga tampak seperti "tidak ada tabel apa pun". Pakai `tableName`.

---


### 13.14 Temuan #79 — migrasi tidak menghasilkan schema production

Ditemukan 16 Agu 2026 sebagai lanjutan #78. Menyelidiki satu tabel membuka
masalah yang jauh lebih luas.

#### Angkanya

Dibandingkan lewat klien `pg` mentah terhadap database hidup — bukan lewat
adaptor, supaya tidak ada kueri yang dicegat:

> ⚠️ **KOREKSI 16 Agu 2026.** Angka yang pertama kali ditulis di sini SALAH,
> dan dua-duanya karena alat ukurnya sendiri cacat. Dikoreksi di bawah, dan
> kekeliruannya sengaja tidak dihapus — cara mengukur yang salah adalah bagian
> dari temuannya.
>
> | Klaim awal | Sebenarnya | Sebab |
> | ---------- | ---------- | ----- |
> | 12 tabel drift | **13** | — |
> | 52 kolom | **54** | — |
> | 0 kolom hanya di migrasi | **2** | — |
> | **3 tabel tidak ada di migrasi** | **0 — SALAH TOTAL** | Parser hanya menerima nama BER-KUTIP. `meeting_details`, `ai_learning_logs`, dan `discussion_point_comments` ditulis TANPA kutip, jadi terlewat. Ketiganya ADA di migrasi (baris 410, 538, 548) |
>
> Kekeliruan kedua: membandingkan nama kolom secara TEKSTUAL. Postgres
> **melipat identifier tanpa kutip menjadi huruf kecil**, sehingga `pointId`
> di migrasi menjadi `pointid` di database. Perbandingan tekstual melaporkannya
> sebagai beda padahal identik. Versi ketiga alat ukur membandingkan nama
> **sebagaimana akan dibuat Postgres**.

| Ukuran | Nilai |
| ------ | ----- |
| Tabel di `src/lib/pg-migrate.ts` | 30 |
| Tabel di database hidup | 30 |
| Tabel di database yang tidak ada di migrasi | **0** |
| **Tabel yang drift** | **13** |
| **Kolom ada di database, TIDAK dibuat migrasi** | **54** |
| Kolom ada di migrasi, tidak ada di database | **2** — `discussion_point_comments`: `userid`, `createdat` |

Arahnya hampir seluruhnya satu: **database hidup lebih lengkap daripada
migrasi.** Migrasi bukan tertinggal versi — ia **tidak pernah menjadi sumber
kebenaran**.

Dua kolom yang hanya ada di migrasi bukan pengecualian, melainkan gejala yang
sama dari sisi lain: migrasi menulis `userId` dan `createdAt` **tanpa kutip**
pada `discussion_point_comments`, sehingga database bersih akan memiliki
`userid` dan `createdat`, sementara production memiliki `userId` dan
`createdAt`. Kode menulis versi ber-kutip. **Di database bersih, penyimpanan
komentar akan gagal.**

#### Kenapa ini 🔴

Kolom yang hanya ada di database **dipakai kode secara aktif**. Diverifikasi:

| Kolom | Rujukan di `server/routes` | Contoh |
| ----- | :-----------------------: | ------ |
| `description` | 80 | tersebar |
| `content` | 26 | `Comments`, `Messages` |
| `namaModul` | 8 | `QATestCases` |
| `expectedResult` | 6 | `qa.routes.ts:273, 300, 504` |
| `executionStatus` | 6 | jalur eksekusi QA |
| `actionType` | 3 | `ActivityLogs` |
| `environment` | 3 | `Tasks` |

Jadi **deployment ke database baru akan rusak.** `npm run db:migrate` pada
database bersih menghasilkan schema yang kekurangan 54 kolom yang dibutuhkan
kode, dan fitur QA termasuk yang paling parah (9 kolom hilang).

Selama ini tidak ketahuan karena semua pengembangan memakai **satu database
yang sama** — yang sudah lengkap sejak lama, entah dari sistem migrasi lama atau
perubahan manual.

#### ⚠️ Gerbang keluar F0 ternyata TIDAK terpenuhi

AUDIT.md baris 418–419 menetapkan gerbang keluar F0:

> `npm run db:migrate` pada database bersih menghasilkan schema yang **identik
> dengan production**.

F0 dinyatakan `SELESAI` 16 Agu 2026 dengan gerbang LULUS. Berdasarkan
pengukuran di atas, **syarat itu tidak terpenuhi** — dan kemungkinan besar tidak
pernah benar-benar diuji pada database bersih, karena satu-satunya cara
membuktikannya adalah membuat database kosong lalu membandingkannya.

Ini bukan sekadar satu item yang meleset. Ini menunjukkan **gerbang bisa
dinyatakan lulus tanpa dijalankan**, dan itu jenis kegagalan yang paling
berbahaya di dokumen ini: ia membuat orang berhenti memeriksa.

**Tindakan:** status F0 diturunkan dari `SELESAI` menjadi `JALAN`, dan gerbang
keluarnya ditandai belum terverifikasi sampai perbandingan pada database bersih
benar-benar dilakukan.

#### Dampaknya ke #78

#78 tidak bisa diperbaiki hanya dengan mengganti nama tabel:

| Rencana | Hasilnya |
| ------- | -------- |
| Ganti `TaskAttachments` → `Attachments` | **Tetap gagal.** `filename` di database `NOT NULL` tanpa default, dan kode tidak menulisnya → galat `23502` |
| Andalkan migrasi membuat `Attachments` | **Tetap gagal di database baru.** Migrasi tidak punya `fileType` dan `createdAt`, padahal kode menulis keduanya |

Jadi #78 dan #79 harus diselesaikan bersama, bukan berurutan.

Catatan tambahan: `Attachments` di database hidup punya **18 kolom dengan
tumpang tindih berat** — `filename`/`fileName`/`name`/`originalName`,
`mimetype`/`fileType`/`type`, `size`/`fileSize`,
`uploadedBy`/`uploadedByUserId`/`uploadedByName`, `uploadedAt`/`createdAt`,
`url`/`fileRef`. Penyakit yang sama dengan #47 pada
`discussion_point_comments`. Tabel ini berisi **0 baris**, jadi ini kesempatan
paling murah untuk membereskannya — tidak ada data yang perlu dimigrasikan.

#### Yang perlu diputuskan

1. **Migrasi jadi sumber kebenaran** — tambahkan 54 kolom yang hilang ke
   `pg-migrate.ts` dan perbaiki 2 kolom tanpa kutip, lalu buktikan pada database
   bersih. Melelahkan tapi lurus.
2. **Atau hasilkan migrasi dari database hidup** — pakai `npm run db:schema`
   yang sudah ada (#10) sebagai dasar, lalu rapikan manual.

⚠️ Apa pun pilihannya, **jangan sentuh kolom kembar dulu**. Menyatukan schema
dan merapikan kolom kembar dalam satu langkah membuat kegagalan sulit
ditelusuri. Samakan dulu, rapikan belakangan — kecuali `Attachments`, yang
kosong sehingga aman dirapikan sekalian.

---


#### Kartu verifikasi #78 & #79 — SELESAI 16 Agu 2026

Keduanya dikerjakan bersama karena #78 tidak bisa diperbaiki di atas schema yang
belum benar.

##### Gerbang F0 kini punya PERINTAH, bukan hanya kalimat

`npm run db:verify-schema` — `scripts/verifikasi-schema.cjs`.

Menjalankan seluruh blok SQL migrasi pada **schema terpisah** di database yang
sama, lalu membandingkannya dengan `public` kolom per kolom, **termasuk tipe dan
nullability**. Schema uji dihapus di akhir, juga bila terjadi galat. Skrip hanya
MEMBACA `public`.

Inilah tindak lanjut pelajaran #79: gerbang yang menuntut lingkungan bersih
harus punya perintah, atau ia akan dinyatakan lulus tanpa dijalankan.

| Sebelum | Sesudah |
| ------- | ------- |
| 13 tabel drift · 54 kolom kurang | **0 · 0** |
| Gerbang tidak bisa dijalankan | `npm run db:verify-schema`, exit 0 |

Hasil akhir, tiga kali berturut-turut:

```
tabel — bersih: 30 · production: 30
GERBANG F0 LULUS — schema database bersih IDENTIK dengan production.
```

##### Dua jebakan yang ditemukan saat membangun gerbangnya

Keduanya sempat membuat gerbang ini sendiri melaporkan hasil palsu.

**1. `SET search_path` TIDAK andal di balik pooler Neon.** Dua dari enam
percobaan menghasilkan schema uji separuh jadi — 11 atau 16 tabel alih-alih 30 —
karena sebagian perintah mendarat di backend lain. Risikonya lebih besar daripada
sekadar hasil salah: perintah migrasi bisa mendarat di `public`. Diperbaiki
dengan menyetel schema di **startup koneksi**, bukan lewat `SET`.

**2. Neon MENOLAK `search_path` di startup pada endpoint ber-pooler:**

```
unsupported startup parameter in options: search_path.
Please use unpooled connection or remove this parameter
```

Penolakan itu justru menegaskan jebakan pertama. `DATABASE_URL` LanPro memang
memakai endpoint `-pooler`, dan itu benar untuk aplikasi. Verifikasi schema
karena itu memakai endpoint **unpooled** — host yang sama tanpa `-pooler`.

Ditambah penjaga: bila schema uji berisi kurang dari setengah jumlah tabel
production, skrip **berhenti dengan galat** alih-alih melaporkan daftar panjang
"KURANG" yang salah sebabnya.

##### Yang diubah di migrasi

| Perubahan | Alasan |
| --------- | ------ |
| +54 kolom lewat `ADD COLUMN IF NOT EXISTS` | No-op di production, memperbaiki database bersih |
| `"userId"` & `"createdAt"` di `discussion_point_comments` diberi kutip | Tanpa kutip, Postgres melipatnya jadi `userid`/`createdat` sementara production memakai camelCase — komentar akan gagal disimpan di database bersih |
| `filename`, `testCaseId`, `content` diberi `NOT NULL` | Menyamai production. Terdeteksi hanya setelah gerbang membandingkan nullability, bukan sekadar nama kolom |

Kolom kembar **sengaja disalin apa adanya** — merapikannya pekerjaan terpisah
(#47). Menyatukan schema dan membersihkan bentuk sekaligus membuat kegagalan
sulit ditelusuri.

##### Yang diubah untuk #78

`task.routes.ts` menulis ke `Attachments`, bukan `TaskAttachments` yang tidak
pernah ada, **dan mengisi `filename`** yang `NOT NULL` tanpa default. Tanpa
bagian kedua, kegagalannya hanya berpindah dari `42P01` ke `23502`. Nilainya
diambil dari nama berkas pada URL — nama yang benar-benar tersimpan di
penyimpanan — dengan `att.name` sebagai cadangan.

+2 test, keduanya **MERAH** terhadap `main` di worktree luar repo.

##### Gerbang

tsc 0 · lint 0 · **256 test / 28 suite** · build sukses · doctor SIAP JALAN ·
`audit:deps` LULUS · `db:verify-schema` LULUS 3× berturut-turut.

Aplikasi dijalankan ulang: migrasi otomatis berjalan tanpa galat, halaman Sign In
tampil, 0 error console.

⚠️ **BELUM terverifikasi:** membuat task berlampiran sungguhan lewat antarmuka.
Sesi login di peramban berakhir saat pengujian, dan memulihkannya butuh
kredensial. Jalur ini juga yang membuat #78 bertahan sekian lama tanpa ketahuan
— §14.2 mencatat seluruh 9 alur ujung-ke-ujung masih `TERBUKA`.


---

### 13.15 Temuan #80 — pintu kedua pembuatan proyek tanpa penjaga admin

Ditemukan 16 Agu 2026 saat pemilik proyek menetapkan bahwa **pembuatan proyek
difokuskan hanya ke Administrator** pada rancangan Two-Tier RBAC (F7 / #76).

Aturan itu ternyata **sudah terpasang di jalur utama** — `POST /api/projects`
memakai `verifyGlobalAdmin` sejak item #34. Yang belum: jalur kedua.

```ts
// server/routes/project.routes.ts:85
router.post("/api/projects/generate-bni-demo", authenticateJWT, async (req, res) => {
  return buatProyekDemoBni(req, res);
});
```

Hanya `authenticateJWT`. Tidak ada `verifyGlobalAdmin`, tidak ada
`verifyProjectAccess`. Dan layanan di baliknya benar-benar membuat baris proyek:

```sql
-- server/services/demo-seed.service.ts:46
INSERT INTO Projects (id, name, projectKey, description, ownerId, status, taskCounter)
```

Akibatnya **siapa pun yang login bisa membuat proyek**, cukup dengan memanggil
endpoint demo. Ketetapan "hanya Administrator" batal lewat pintu ini.

#### Kenapa ini luput dari audit sebelumnya

Gelombang 5 (§13.11) memetakan seluruh 119 rute dan menandai
`POST /api/projects/generate-bni-demo` sebagai "tanpa penjaga rute". Ia **ada di
daftar**, tetapi digugurkan bersama empat rute lain yang ternyata memeriksa izin
di dalam handler — dan yang ini tidak diperiksa satu per satu karena namanya
terbaca seperti utilitas demo, bukan pembuat proyek.

Pelajarannya: **nama rute bukan bukti tentang apa yang dilakukannya.** §13.11
sudah menuliskan aturan "hasil pemindaian bukan temuan, wajib dibaca isinya" —
dan justru di sini aturan itu tidak dijalankan sampai tuntas.

#### Yang perlu diputuskan

| Pilihan | Konsekuensi |
| ------- | ----------- |
| Tambahkan `verifyGlobalAdmin` | Konsisten dengan `POST /api/projects`. Fitur demo tetap ada, tapi hanya untuk admin |
| Hapus rutenya | Paling bersih bila penyemaian demo memang tidak dipakai lagi |
| Biarkan | ❌ Membatalkan ketetapan pembuatan proyek |

Rekomendasi: **tambahkan `verifyGlobalAdmin`**, jangan dihapus — penyemaian demo
berguna untuk pengujian F3 nanti, dan menghapusnya membuang alat yang sudah ada.

---


## §14 Checklist audit UI (isi kerja F3, item #17)

**Kondisi awal: 1 dari 22 layar.** Hanya halaman Sign In yang benar-benar dibuka
di browser (ter-render benar, console bersih, 15 Agu 2026). Sisanya belum pernah
dilihat.

**Syarat menjalankan: pemilik proyek login lebih dulu.**

### 14.1 Per fitur

Isi tiap kolom: `✅` benar · `⚠️` ada masalah (catat & beri nomor item) ·
`❌` rusak · `—` belum dicek.

| #   | Fitur                  | Tampil | Mode gelap | 375px | Desktop | Console bersih | Catatan                       |
| --- | ---------------------- | :----: | :--------: | :---: | :-----: | :------------: | ----------------------------- |
| 0   | Sign In                |   ✅   |     —      |   —   |    —    |       ✅       | satu-satunya yang sudah dicek |
| 1   | dashboard              |   —    |     —      |   —   |    —    |       —        |                               |
| 2   | issues                 |   —    |     —      |   —   |    —    |       —        |                               |
| 3   | planning               |   —    |     —      |   —   |    —    |       —        |                               |
| 4   | kanban                 |   —    |     —      |   —   |    —    |       —        |                               |
| 5   | qa                     |   —    |     —      |   —   |    —    |       —        |                               |
| 6   | wiki                   |   —    |     —      |   —   |    —    |       —        |                               |
| 7   | meeting-notes          |   —    |     —      |   —   |    —    |       —        |                               |
| 8   | notebook-lm            |   —    |     —      |   —   |    —    |       —        | diketahui rusak, lihat #18    |
| 9   | flowchart              |   —    |     —      |   —   |    —    |       —        |                               |
| 10  | master                 |   —    |     —      |   —   |    —    |       —        |                               |
| 11  | connect                |   —    |     —      |   —   |    —    |       —        |                               |
| 12  | enterprise-audit       |   —    |     —      |   —   |    —    |       —        |                               |
| 13  | activity               |   —    |     —      |   —   |    —    |       —        |                               |
| 14  | timeline               |   —    |     —      |   —   |    —    |       —        |                               |
| 15  | team                   |   —    |     —      |   —   |    —    |       —        |                               |
| 16  | explorer (DB Explorer) |   —    |     —      |   —   |    —    |       —        | lihat #19, #20                |
| 17  | settings               |   —    |     —      |   —   |    —    |       —        |                               |
| 18  | users                  |   —    |     —      |   —   |    —    |       —        |                               |
| 19  | sidebar                |   —    |     —      |   —   |    —    |       —        | kontras gagal, lihat #14      |
| 20  | backup                 |   —    |     —      |   —   |    —    |       —        |                               |
| 21  | auth (profil/sesi)     |   —    |     —      |   —   |    —    |       —        |                               |

### 14.2 Alur aplikasi ujung-ke-ujung

Bukan per layar, tapi per **perjalanan pengguna**. Ini yang menangkap kerusakan
yang tidak terlihat saat membuka layar satu per satu.

| Alur                                               | Status    |
| -------------------------------------------------- | --------- |
| Login → dashboard → pilih proyek                   | `TERBUKA` |
| Buat task → assign → pindah kolom kanban → selesai | `TERBUKA` |
| Buat sprint → isi task → mulai → selesaikan        | `TERBUKA` |
| Unggah avatar → tampil di seluruh layar            | `TERBUKA` |
| Unggah dokumen → unduh kembali                     | `TERBUKA` |
| Rekam rapat → analisis AI → discussion point       | `TERBUKA` |
| Buat flowchart → simpan → buka lagi                | `TERBUKA` |
| Notifikasi & chat realtime (2 sesi berbeda)        | `TERBUKA` |
| Logout → sesi benar-benar mati                     | `TERBUKA` |

⚠️ **Untuk alur yang menulis data**, pakai objek percobaan terpisah lalu hapus —
pola yang sudah dipakai: flowchart `ZZ-TEST-REFACTOR` (§12).

### 14.3 Pengukuran ulang yang wajib dilakukan di F3

Angka-angka ini **diwarisi dari audit lama dan belum diverifikasi**:

| Metrik                    | Angka warisan                             | Diukur ulang? |
| ------------------------- | ----------------------------------------- | ------------- |
| Kontras sidebar WCAG AA   | 15–16 dari 20 node gagal                  | ❌            |
| Jarak antar target sentuh | 11 pasang < 8px di 375px                  | ❌            |
| Layar > 1024px            | belum pernah diuji (panel terbatas 679px) | ❌            |

---

## §15 Protokol jaga-jaga: memastikan LanPro tidak error

Bagian ini menjawab satu kekhawatiran spesifik: **jangan sampai penambahan fitur
membuat aplikasi rusak.** Isinya bukan janji, melainkan prosedur yang bisa
diperiksa.

### 15.1 Baseline sehat — diukur 15 Agu 2026

Kondisi awal sebelum pekerjaan fitur dimulai. **Angka inilah pembandingnya.**
Bila salah satu memburuk setelah sebuah sub-fase, penyebabnya ada di sub-fase itu
— bukan warisan lama.

| Cek                                        | Hasil baseline                                                 |
| ------------------------------------------ | -------------------------------------------------------------- |
| `npm run lint` (tsc + validasi permission) | ✅ 0 error                                                     |
| `npm test`                                 | ✅ **84 lulus / 12 suite**                                     |
| `npm run build`                            | ✅ sukses — `dist/server.cjs` 506,6 KB                         |
| Browser `localhost:3000`                   | ✅ UI ter-render, **0 error console**                          |
| `npm run doctor`                           | ✅ SIAP JALAN, 1 peringatan disengaja (`STORAGE_DRIVER=local`) |

### 15.2 Empat lapis pengaman

**Lapis 1 — satu branch per sub-fase.**
`main` selalu berisi kondisi yang gerbangnya sudah lulus. Bila sebuah sub-fase
gagal, branch-nya dibuang; `main` tidak pernah tersentuh. Ini yang membuat
kegagalan **selalu bisa dibatalkan**.

**Lapis 2 — pre-commit hook.**
husky + lint-staged sudah **terbukti** menahan commit yang melanggar. Aturan
lapisan berstatus `error`, bukan `warn`.

**Lapis 3 — gerbang per sub-fase.**
Tidak ada sub-fase yang di-merge sebelum ini lulus SEMUA:

```bash
npm run doctor && npm run lint && npm test && npm run build
# lalu WAJIB: buka browser, pastikan UI benar-benar tampil
```

**Lapis 4 — verifikasi khusus per jenis pekerjaan.**

| Jenis perubahan | Verifikasi tambahan yang WAJIB                     |
| --------------- | -------------------------------------------------- |
| Menyentuh rute  | Perbandingan **himpunan rute** sebelum/sesudah     |
| Memecah berkas  | `diff` keluaran `tsc` **baris-per-baris**          |
| Menambah test   | **Periksa jumlahnya bertambah** (84 → berapa)      |
| Menyentuh auth  | Login password lama **wajib masih jalan**          |
| Menyentuh email | Email benar-benar **diterima di kotak masuk**      |
| Menyentuh UI    | Buka layar terkait di browser, mode terang & gelap |

### 15.3 Kenapa "build hijau" tidak dihitung sebagai bukti

Pernah terjadi di repo ini: **28/28 test lolos dan build sukses**, sementara
`AppContainer` melempar `ReferenceError` saat render sehingga seluruh UI diganti
error boundary. `GET /` tetap membalas 200 karena yang terkirim hanya HTML shell.

Vite dan esbuild hanya melakukan transpile **tanpa type-check** — 128 error
TypeScript dan sebelas endpoint rusak pernah bertahan lama tanpa terdeteksi.

Karena itu **langkah browser tidak boleh dilewati**, dan gerbang dinyatakan tidak
lulus bila hanya bersandar pada build.

### 15.4 Risiko spesifik empat fitur ini, dan penawarnya

| Risiko                                    | Kenapa nyata di sini                                      | Penawar                                                           |
| ----------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------- |
| **Login lama rusak gara-gara SSO**        | Keduanya berbagi `auth.routes.ts` & `currentSessionToken` | Uji login password di **setiap** gerbang F5, bukan hanya di akhir |
| **`auth` makin kacau**                    | 762 baris, nol lapisan                                    | F5.2 memecahnya **sebelum** OIDC masuk                            |
| **Pengambilalihan akun**                  | Penautan otomatis lewat email                             | Wajib `email_verified=true` (F5.1 keputusan #2)                   |
| **Endpoint reset jadi alat mendata user** | Balasan berbeda membocorkan email terdaftar               | Balasan seragam + rate limit (F6.3)                               |
| **Password random menetap di email**      | Tidak punya kedaluwarsa                                   | Wajib ganti password saat login berikutnya (F6.3)                 |
| **Cacat #23 tersalin ke kanal email**     | `email.service` meniru `whatsapp.service`                 | F6.1 membereskannya **lebih dulu**                                |
| **Kirim email menggagalkan pendaftaran**  | Efek samping ikut menggagalkan transaksi                  | Kirim setelah commit; gagal kirim tidak melempar                  |
| **Endpoint baru tanpa validasi**          | ±100 endpoint sudah tanpa zod (item #4)                   | Endpoint F5 & F6 **wajib zod sejak lahir**, tidak menunggu F7     |

### 15.5 Aturan yang tidak boleh dilanggar selama pekerjaan ini

1. **Jangan sentuh `src/lib/db.ts`.**
2. **Jangan sabotase source untuk pembuktian.** Bila perlu membuktikan sebuah
   test bisa merah atau `id_token` palsu ditolak, lakukan **di salinan luar
   repo**.
3. **Jangan pernah memasukkan kredensial.** Uji login SSO dilakukan oleh pemilik
   proyek.
4. **Akun & data uji pakai objek terpisah lalu dihapus** — pola `ZZ-TEST-REFACTOR`.
5. **Laporkan apa adanya.** Yang belum diuji ditulis "belum terverifikasi".

### 15.6 Bila tetap terjadi error

| Langkah | Tindakan                                                                    |
| ------- | --------------------------------------------------------------------------- |
| 1       | Jangan lanjut ke sub-fase berikutnya                                        |
| 2       | Bandingkan dengan baseline §15.1 — cek mana yang berubah                    |
| 3       | Bila sudah ter-merge: `git revert` merge commit-nya (jangan `reset --hard`) |
| 4       | Catat sebagai item bernomor di §1, bukan diperbaiki diam-diam               |

---

## §16 KARTU VERIFIKASI WAJIB — setiap perbaikan harus terbukti tidak merusak

Aturan tunggal bagian ini:

> **Tidak ada satu pun item yang boleh berstatus `SELESAI` sebelum kartu di bawah
> terisi lengkap dan aplikasi terbukti berjalan di browser.**

Ini berlaku untuk **setiap** item — sekecil apa pun perubahannya, termasuk
perubahan satu baris. Alasannya ada di §15.3: repo ini pernah mengalami 28/28
test lolos & build sukses sementara seluruh UI diganti error boundary.

### 16.1 Kartu yang wajib diisi per item

Salin kartu ini ke §10 Riwayat (atau ke laporan sesi) untuk **tiap** item:

```text
ITEM      : #__  (nama)
FASE      : F__
BRANCH    : ______

SEBELUM (ambil dari baseline §15.1 atau pengukuran terakhir)
  lint            : ____
  test            : ____ lulus / ____ suite
  build           : ____
  aplikasi jalan  : ____  (URL yang dibuka: ____________)

SESUDAH
  lint            : ____   <- WAJIB 0 error
  test            : ____ lulus / ____ suite   <- WAJIB >= sebelum
  build           : ____   <- WAJIB sukses
  APLIKASI JALAN  : ____   <- WAJIB ya
    - halaman dibuka   : ____________
    - UI benar tampil  : ya / tidak
    - error console    : ____ (WAJIB 0)
    - alur diuji       : ____________

VERIFIKASI KHUSUS (sesuai jenis perubahan, lihat §15.2 lapis 4)
  ______________________________________

BELUM TERVERIFIKASI (tulis jujur, jangan dikosongkan)
  ______________________________________
```

### 16.2 Empat syarat yang tidak bisa ditawar

| Syarat                    | Cara membuktikan                   | Bila gagal   |
| ------------------------- | ---------------------------------- | ------------ |
| **Aplikasi menyala**      | `npm run dev` tanpa keluar sendiri | Jangan merge |
| **UI benar-benar tampil** | Buka di browser, lihat layarnya    | Jangan merge |
| **Console bersih**        | 0 error                            | Jangan merge |
| **Yang lama masih jalan** | Uji fitur yang bersinggungan       | Jangan merge |

Syarat keempat yang paling sering terlewat. Untuk F5 artinya konkret:
**setiap kali menyentuh auth, login dengan password lama wajib diuji ulang** —
bukan hanya di akhir fase, tapi di **tiap** sub-fase.

### 16.3 Bila aplikasi crash setelah sebuah perubahan

| Langkah | Tindakan                                                                |
| ------- | ----------------------------------------------------------------------- |
| 1       | **Berhenti.** Jangan lanjut ke item berikutnya                          |
| 2       | Bandingkan dengan baseline §15.1 — cari yang berubah                    |
| 3       | Belum ter-merge → perbaiki di branch, atau buang branch-nya             |
| 4       | Sudah ter-merge → `git revert` merge commit (**jangan** `reset --hard`) |
| 5       | Catat sebagai item bernomor di §1 — jangan diperbaiki diam-diam         |
| 6       | Laporkan apa adanya, termasuk bila penyebabnya belum ketahuan           |

---

## §17 STANDAR DEVELOP — daftar periksa sebelum merge

Diringkas dari ARCHITECTURE.md supaya satu dokumen ini cukup sebagai pegangan.
Periksa yang relevan sebelum tiap merge.

### 17.1 Struktur & lapisan

| Aturan               | Batas                                                                |
| -------------------- | -------------------------------------------------------------------- |
| Berkas baru maksimal | **500 baris**                                                        |
| `types.ts`           | tipe saja, tanpa runtime                                             |
| `lib/`               | fungsi murni — tanpa state, `fetch`, atau DOM global                 |
| `services/`          | `apiRequest` & pemetaan data — **tanpa** JSX / hook React            |
| `components/`        | JSX & hook UI — **dilarang** memanggil `apiRequest` langsung         |
| Container            | hanya menyusun; logika turun ke lapisan lain                         |
| Backend              | pola resmi `routes/` + `services/`. **Jangan** tambah lapisan ketiga |

Aturan lapisan berstatus **`error`** di ESLint, bukan `warn` — pelanggaran akan
menahan commit.

### 17.2 Keamanan

| Aturan                                  | Catatan                                                                                               |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Kredensial **hanya** dari `process.env` | **Tidak boleh ada fallback ter-hardcode** — konfigurasi hilang harus gagal terbuka (ini isi item #23) |
| `.gitleaks.toml`                        | Jangan daftar-putihkan **nilai** rahasia; kecualikan **commit**-nya                                   |
| Endpoint baru                           | **Wajib zod sejak lahir**, jangan menunggu F7                                                         |
| Rate limit                              | Endpoint sensitif punya limiter sendiri (contoh: `loginLimiter`)                                      |
| XSS                                     | Jangan menambah `rehype-raw` tanpa sanitasi                                                           |
| CSP                                     | Menambah sumber eksternal = perbarui direktif **dan** uji dengan build produksi                       |

### 17.3 Sistem desain

| Aturan      | Catatan                                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------------------- |
| Warna       | **Hanya lewat token semantik**. Dilarang menulis hex di JSX                                              |
| Mode gelap  | **Tanpa prefix `dark:`** — token sudah berganti sendiri di `html.dark`                                   |
| Area sentuh | Minimal **44px** (`min-h-11`)                                                                            |
| Tipografi   | Mobile-first: `text-xs sm:text-[10px]`, bukan `text-[10px]`                                              |
| Komponen    | Pakai `CoreUI` (`Button`, `Input`, `Card`, `Badge`) — jangan menyusun ulang utility                      |
| Tabel       | **Wajib** dibungkus `<ResponsiveTable>`                                                                  |
| Notifikasi  | **Wajib** lewat `src/lib/sweetalert.ts`. Dilarang `Swal.fire` langsung atau `alert()`/`confirm()` bawaan |

### 17.4 Alur kerja

| Aturan                                   | Catatan                                                                         |
| ---------------------------------------- | ------------------------------------------------------------------------------- |
| Satu branch per **item**                 | Bukan per fase                                                                  |
| Merge ke `main` hanya bila gerbang lulus | §15.2 lapis 3                                                                   |
| Lapor sebelum lanjut ke tahap berikutnya |                                                                                 |
| Review-first                             | Untuk permintaan perbaikan: analisa & laporkan (format A–F), tunggu persetujuan |
| Dilarang                                 | Menyentuh `src/lib/db.ts`                                                       |
| Dilarang                                 | Sabotase source untuk pembuktian — pakai salinan **di luar repo**               |
| Dilarang                                 | Memasukkan kredensial sendiri                                                   |
| Data uji                                 | Objek terpisah lalu dihapus (pola `ZZ-TEST-REFACTOR`)                           |

### 17.5 Jebakan verifikasi khas repo ini

| Jebakan                          | Cara benar                                                                                                             |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Cek rute lewat status **401**    | **TIDAK VALID** — auth berjalan sebelum handler 404, rute palsu pun menjawab 401. Pakai perbandingan **himpunan rute** |
| Menghitung **total** error `tsc` | Pakai `diff` **baris-per-baris** — sudah 4x menangkap simbol terlewat                                                  |
| Menambah test                    | **Periksa jumlahnya bertambah** — pernah gagal diam-diam karena Prettier                                               |
| Berhenti di build hijau          | Build & test **bukan** bukti aplikasi jalan (§15.3)                                                                    |
| Kunci token localStorage         | **`lanpro_jwt_token`**, bukan `'token'` (kesalahan notebook-lm, item #18)                                              |

---

## §18 STANDAR & KEPATUHAN — posisi audit ini terhadap acuan internasional

Ditulis 16 Agu 2026 atas pertanyaan pemilik proyek: **apakah audit ini sudah
mengikuti ISO 27001 atau standar internasional lain?**

### 18.1 Jawaban jujurnya: BELUM — dan sebagian memang salah kategori

**ISO/IEC 27001 bukan standar audit kode.** Ia standar **ISMS** (*Information
Security Management System*) — sistem manajemen tingkat organisasi. Yang diaudit
di sana adalah kebijakan, peran, manajemen risiko, pelatihan, kontrol pemasok,
respons insiden, dan tinjauan manajemen. Sertifikasinya diterbitkan lembaga
terakreditasi, bukan dihasilkan dari membaca kode.

Jadi kalimat "AUDIT.md sudah ISO 27001" **tidak akan pernah benar**, sebaik apa
pun dokumen ini ditulis. Yang bisa benar: temuan teknis di sini menjadi **bukti**
untuk sebagian kontrol Annex A bila suatu hari ISMS dibangun.

Yang sebenarnya paling mendekati isi dokumen ini:

| Acuan | Apa itu | Posisi AUDIT.md |
| ----- | ------- | --------------- |
| **OWASP ASVS 4.0** | Standar verifikasi keamanan aplikasi — syarat yang bisa diuji per fitur | Paling relevan. Dokumen ini **belum** memetakan diri ke sana, dan belum menyatakan menargetkan Level berapa |
| **OWASP Top 10 (2021)** | Sepuluh kategori risiko aplikasi web terlazim | Belum dipetakan. Pemetaannya di §18.3 memunculkan temuan sistemik yang tidak terlihat per item |
| **CWE** | Taksonomi kelemahan perangkat lunak | Belum dipakai. Tanpa ini temuan sulit dibandingkan lintas proyek atau lintas alat |
| **CVSS v3.1** | Skor keparahan baku 0–10 beserta vektornya | Belum dipakai. Skala 🔴/🟠/🟡 di sini buatan sendiri |
| **NIST SSDF (SP 800-218)** | Praktik pengembangan perangkat lunak aman | Sebagian besar sudah dijalankan tanpa disebut namanya — lihat §18.2 |
| **ISO 27001:2022 Annex A** | 93 kontrol organisasi & teknologi | Hanya sebagian kecil kontrol A.8 (teknologi) yang tersentuh |

### 18.2 Yang SUDAH melampaui audit kebanyakan — jangan dibongkar

Ini bukan pujian; ini catatan agar praktik berikut tidak hilang saat dokumen
dirapikan mengikuti format standar. Banyak laporan audit formal justru **tidak**
punya ini:

| Praktik di sini | Padanan standarnya |
| --------------- | ------------------ |
| Tiap temuan menyertakan berkas & nomor baris | *Evidence traceability* — ASVS & ISO 27001 A.8.8 |
| Perbaikan wajib disertai test yang **dibuktikan MERAH** terhadap kode lama | Melampaui ASVS. Menutup celah "perbaikan yang tidak memperbaiki apa pun" |
| Pembuktian dijalankan terhadap sistem hidup, bukan disimpulkan | *Dynamic verification* (DAST) — disyaratkan ASVS untuk level tinggi |
| Kolom "BELUM terbukti" ditulis eksplisit di tiap kartu verifikasi | *Scope limitation statement* — wajib di laporan audit formal, sering dilewat |
| Larangan mengubah source untuk pembuktian (§0.5 no. 4) | *Audit integrity* — bukti tidak boleh lahir dari lingkungan yang dimanipulasi |
| Riwayat per item tidak pernah dihapus, hanya diubah statusnya | *Audit trail* — ISO 27001 A.5.28 |
| Angka diukur ulang dengan perintah yang ikut ditulis (§9) | *Repeatability* |

### 18.3 Pemetaan temuan F2 ke OWASP Top 10 & CWE

Dikerjakan 16 Agu 2026 atas 25 temuan F2 (#49–#74; #56 masuk F8, #75 masuk F0).

| # | Kategori OWASP 2021 | CWE | Sev |
| - | ------------------- | --- | :-: |
| 49 | A01 Broken Access Control | CWE-284 Improper Access Control | 🔴 |
| 50 | A07 Identification & Authentication Failures | CWE-306 Missing Authentication for Critical Function | 🔴 |
| 51 | A02 Cryptographic Failures | CWE-200 Exposure of Sensitive Information | 🔴 |
| 52 | A07 | CWE-307 Improper Restriction of Excessive Authentication Attempts | 🔴 |
| 53 | A01 | CWE-639 Authorization Bypass Through User-Controlled Key | 🔴 |
| 54 | A01 | CWE-290 Authentication Bypass by Spoofing | 🟠 |
| 55 | A01 | CWE-284 | 🟡 |
| 57 | — (operasional, bukan keamanan) | — | ⚪ |
| 58 | A05 Security Misconfiguration | CWE-200 | 🟠 |
| 59 | A01 | CWE-359 Exposure of Private Personal Information | 🔴 |
| 60 | A04 Insecure Design | CWE-459 Incomplete Cleanup | 🔴 |
| 61 | A04 | CWE-662 Improper Synchronization | 🟠 |
| 62 | A04 | CWE-544 Missing Standardized Error Handling | 🟡 |
| 63 | A04 | CWE-544 | 🟡 |
| 64 | A04 | CWE-459 | 🟡 |
| 65 | A04 | CWE-362 Race Condition | 🔴 |
| 66 | A01 | CWE-285 Improper Authorization | 🔴 |
| 67 | A01 | CWE-200 / CWE-548 | 🔴 |
| 68 | A01 | CWE-306 | 🔴 |
| 69 | A01 | CWE-639 (IDOR) | 🔴 |
| 70 | A01 | CWE-639 | 🔴 |
| 71 | A01 | CWE-285 | 🟠 |
| 72 | A01 | CWE-285 | 🟠 |
| 73 | A01 | CWE-284 | 🟡 |
| 74 | A04 | CWE-362 | 🟠 |

#### Temuan sistemik yang HANYA terlihat setelah dipetakan

**14 dari 25 temuan (56%) jatuh ke A01 Broken Access Control.** Tidak satu pun
item menyatakan ini, karena tiap item hanya melihat dirinya sendiri.

Artinya masalah LanPro **bukan** dua puluh lima kekeliruan terpisah, melainkan
**satu kelemahan struktural**: tidak ada satu tempat pun yang menjadi sumber
kebenaran untuk otorisasi. Penjaga ditempelkan per rute, dengan tangan, dan
karena itu bisa lupa ditempel (#68, #70, #71), ditempel terlalu longgar (#66,
#72), atau ditulis benar tetapi korslet oleh satu karakter (#73).

Selama pola itu bertahan, rute ke-120 akan mengulanginya. Perbaikan per item
tidak menutupnya — yang menutupnya adalah **otorisasi yang menolak secara bawaan
(deny-by-default)**, sehingga rute tanpa penjaga eksplisit otomatis DITOLAK alih-
alih otomatis lolos. Diusulkan sebagai item baru **#76**.

### 18.4 Kesenjangan terhadap standar — dan cara menutupnya

| Kesenjangan | Akibatnya sekarang | Penutupnya |
| ----------- | ------------------ | ---------- |
| Skala 🔴/🟠/🟡 tidak punya rubrik | §1 mendefinisikan severity dari **biaya bisnis** ("menghambat production"), bukan dampak keamanan. Akibatnya #57 (operasional) dan #55 (kontrol akses) sama-sama 🟡 padahal beda total | Rubrik §18.5 |
| Tidak ada pernyataan dampak C-I-A | Tidak terbaca mana yang membocorkan data, merusak data, atau mematikan layanan | Kolom C/I/A pada §18.5 |
| Tidak ada CVSS | Tidak bisa dibandingkan dengan temuan alat lain atau vendor | Beri vektor CVSS v3.1 saat ada penilai yang kompeten. **Jangan dikarang** — skor tanpa dasar lebih buruk daripada tanpa skor |
| Tidak ada definisi lingkup & aset | Tidak jelas apa yang TIDAK diaudit | §18.6 |
| Tidak ada catatan penerimaan risiko | Item `MENUNGGU` menggantung tanpa siapa/kapan | §18.7 |
| Tidak ada klasifikasi data | #59 membocorkan nomor telepon & email — tidak tercatat bahwa itu data pribadi | §18.8 |
| Target ASVS tidak dinyatakan | Tidak ada tolok "kapan cukup" | Tetapkan ASVS Level 1 dulu, Level 2 sebelum production |

### 18.5 Rubrik keparahan — menggantikan penilaian intuitif

Severity ditetapkan dari **dampak** dan **keterjangkauan**, bukan dari perasaan
maupun dari biaya perbaikannya.

| Sev | Syarat | Contoh dari temuan nyata |
| :-: | ------ | ------------------------ |
| 🔴 **Kritis** | Bisa dieksploitasi **tanpa kredensial sah**, ATAU membocorkan data pribadi, ATAU menghilangkan/merusak data pengguna tanpa jejak | #50 socket anonim menerima PII admin · #65 suntingan hilang senyap · #67 berkas terbaca tanpa login |
| 🟠 **Tinggi** | Butuh akun sah tetapi melampaui hak yang seharusnya, ATAU merusak keandalan pada kondisi yang wajar terjadi | #66 `viewer` menghapus data · #74 data proyek lain menimpa layar |
| 🟡 **Sedang** | Belum bisa dieksploitasi hari ini, tetapi menghapus lapisan pertahanan atau menjadi ranjau bagi perubahan berikutnya | #55 RBAC mati senyap bila nama param berubah · #73 `"*"` terselip |

**Dampak C-I-A** ditulis bersama severity mulai temuan #76 dan seterusnya:
**C** kerahasiaan · **I** keutuhan · **A** ketersediaan.

Bila severity dari rubrik ini berbeda dengan penilaian lama, **rubrik yang
menang** — dan perubahannya dicatat, bukan diam-diam diganti.

### 18.6 Lingkup audit — dan yang TEGAS di luarnya

Wajib dibaca sebelum menyimpulkan "LanPro sudah aman".

**Di dalam lingkup** (sudah dikerjakan): kode aplikasi di `server/`, `src/`,
`api/`; 119 rute HTTP; handshake & event Socket.IO; alur unggah–simpan–tampil
berkas; RBAC; transaksi basis data; schema DB dari database hidup.

**DI LUAR lingkup — belum pernah diperiksa sama sekali:**

| Area | Kenapa penting |
| ---- | -------------- |
| Konfigurasi & pengerasan Neon PostgreSQL | Enkripsi saat diam, retensi cadangan, pembatasan IP |
| Konfigurasi platform Vercel | Variabel lingkungan, header, log |
| Rantai pasok dependensi | `npm audit`, SBOM, dependensi tertinggal versi |
| Keamanan pipeline CI/CD | Siapa boleh merge, siapa memegang rahasia |
| Rotasi & penyimpanan rahasia | `JWT_SECRET` tidak pernah dirotasi; prosedurnya tidak ada |
| Ketahanan cadangan & pemulihan | Belum pernah diuji pulih |
| Pencatatan & pemantauan keamanan | `AuditLogs` ada, tetapi tidak ada yang membacanya |
| Uji penetrasi pihak ketiga | Belum pernah |
| Proses organisasi | Respons insiden, pelatihan, kontrol pemasok — seluruh wilayah ISO 27001 |

⚠️ Audit ini memeriksa **kode**. Sistem yang kodenya bersih tetap bisa jebol
lewat kredensial yang bocor, dependensi bermasalah, atau cadangan yang tidak
pernah teruji.

### 18.7 Catatan penerimaan risiko

Item berstatus `MENUNGGU` berarti **risikonya masih hidup dan sedang ditanggung**
— bukan berarti sudah beres. Mulai sekarang tiap item `MENUNGGU` mencatat siapa
yang menanggung dan sejak kapan.

| # | Risiko yang sedang ditanggung | Ditanggung oleh | Sejak |
| - | ----------------------------- | --------------- | ----- |
| 69 | Notifikasi palsu atas nama orang lain — jalur phishing di dalam aplikasi | Pemilik proyek | 16 Agu 2026 |
| 70 | Rapat lintas proyek bisa dibaca, direkam-ulang, dibatalkan | Pemilik proyek | 16 Agu 2026 |
| 71 | Modul proyek bisa di-CRUD lintas proyek | Pemilik proyek | 16 Agu 2026 |
| 72 | `viewer` bisa membuat & mengubah data proyek | Pemilik proyek | 16 Agu 2026 |
| 73 | Penjaga `dashboard-layout` korslet | Pemilik proyek | 16 Agu 2026 |
| 74 | Data proyek lama menimpa layar proyek baru | Pemilik proyek | 16 Agu 2026 |
| 77 | 4 kerentanan dependensi `moderate`: react-router & react-router-dom (open redirect → XSS), exceljs, uuid. Hanya tertutup lewat `npm audit fix --force` = kenaikan versi mayor | Pemilik proyek | 16 Agu 2026 |
| 30 · D4 | Data bisnis (rekaman rapat, bukti QA, dokumen) tinggal di **drive pribadi** pengguna. Diterima "untuk sekarang" 16 Agu 2026 — menyulitkan audit, penghapusan atas permintaan, dan pembuktian saat sengketa | Pemilik proyek | 16 Agu 2026 |
| 2 / 30 | Berkas unggahan hilang tiap deploy. **Alasannya berubah 16 Agu 2026**: driver `s3` DITAHAN atas keputusan pemilik, storage beralih ke drive user (F11). Risikonya tetap hidup, dan kini berjalan selama F11 belum jadi — 6–10 sesi, bukan 1–2 | Pemilik proyek | 15 Agu 2026 |
| 15 | Dua Google API key lama belum dicabut | Pemilik proyek | 15 Agu 2026 |
| 46 | `SSO_ALLOWED_DOMAINS=gmail.com` — siapa pun ber-Gmail bisa mendaftar | Pemilik proyek | 15 Agu 2026 |

Kolom "sampai kapan" sengaja dikosongkan: **tidak boleh diisi oleh siapa pun
selain pemilik proyek.**

### 18.8 Klasifikasi data — dasar kepatuhan UU PDP

LanPro menyimpan dan menampilkan data pribadi. Ini belum pernah dinyatakan di
mana pun, padahal menentukan bobot beberapa temuan.

| Data | Klasifikasi | Tersimpan di | Temuan terkait |
| ---- | ----------- | ------------ | -------------- |
| Nama, email, nomor telepon | **Data pribadi** | `Users` | **#59** — bocor ke socket anonim |
| Jabatan, departemen | Data pribadi | `Users` | #59 |
| Matriks permission | Internal sensitif | `Users` | #59 |
| Foto profil | Data pribadi | `uploads/` | #67 — sengaja publik atas keputusan pemilik |
| Isi rapat, rekaman, notulen | Rahasia bisnis | `Meetings` | **#70** |
| Dokumen & bukti QA | Rahasia bisnis | `Documents`, `uploads/` | **#67** |
| Kata sandi | Rahasia — di-hash | `Users` | #52 |
| **Refresh token drive** pengguna (Google/Microsoft) | **Rahasia bernilai tinggi** | belum ada — akan lahir dari F11 | #30 · wajib terenkripsi saat disimpan, lihat §11.1 D1b |

⚠️ **Perlu perhatian pemilik proyek, bukan nasihat hukum.** Indonesia memiliki
UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi. Temuan #59 adalah
kebocoran data pribadi (nomor telepon & email) ke pihak tak terautentikasi, dan
sudah diperbaiki 16 Agu 2026 sebelum rilis production. Bila kejadian serupa
terjadi **setelah** rilis, ada kewajiban pemberitahuan yang berlaku. Silakan
periksakan ke penasihat hukum — dokumen ini tidak berwenang menyimpulkannya.

### 18.9 Yang harus dikerjakan supaya benar-benar bisa mengaku "berstandar"

Urut dari yang paling murah dan paling berdampak. **Tidak satu pun ini membuat
LanPro tersertifikasi ISO 27001** — itu menuntut ISMS dan lembaga terakreditasi.
Yang ini membuat klaim "mengikuti praktik yang diakui" menjadi **jujur dan bisa
dibuktikan**.

| Langkah | Isi | Butuh pemilik? |
| ------- | --- | :------------: |
| 1 | Tetapkan target **OWASP ASVS Level 1**, lalu Level 2 sebelum production. Tanpa target, tidak ada definisi "cukup" | Ya — 1 keputusan |
| 2 | Kerjakan **#76** (otorisasi deny-by-default). Menutup akar 56% temuan sekaligus | Ya — izin arsitektur |
| 3 | ~~`npm audit` + SBOM ke gerbang CI~~ **SELESAI 16 Agu 2026** — lihat §18.10 | — |
| 4 | ~~Terapkan rubrik §18.5 ke temuan lama~~ **SELESAI 16 Agu 2026** — lihat §18.11 | — |
| 5 | Prosedur rotasi rahasia — `JWT_SECRET` belum pernah dirotasi | Ya |
| 6 | Uji pulih dari cadangan, sekali, dan catat hasilnya | Ya |
| 7 | Tetapkan siapa membaca `AuditLogs` dan seberapa sering | Ya |
| 8 | Baru setelah itu: pertimbangkan uji penetrasi pihak ketiga | Ya — biaya |

**Jangan lakukan:** menempelkan kata "ISO 27001" di dokumen ini tanpa ISMS.
Klaim kepatuhan yang tidak berdasar lebih berbahaya daripada mengaku belum
patuh — ia membuat orang berhenti memeriksa.

---

### 18.10 Gerbang rantai pasok & SBOM — SELESAI 16 Agu 2026

Langkah 3 §18.9. Dua perintah baru, keduanya juga jalan di CI:

| Perintah | Isi |
| -------- | --- |
| `npm run audit:deps` | Menjalankan `npm audit`, memblokir bila ada kerentanan `high` ke atas |
| `npm run sbom` | Menghasilkan `sbom.cyclonedx.json` — CycloneDX 1.5, **790 dependensi production** |

Di `.github/workflows/deploy.yml` keduanya berjalan sesudah Gitleaks, dan
SBOM-nya diunggah sebagai artefak dengan retensi 90 hari.

**Kenapa ambangnya `high`, bukan `moderate`.** Repo ini punya 4 kerentanan
`moderate` yang **hanya** bisa ditutup lewat `npm audit fix --force`, dan itu
berarti kenaikan versi mayor pada `react-router`, `exceljs`, dan `uuid`.
Memasang ambang di `moderate` hari ini membuat CI merah tanpa jalan keluar yang
aman — dan gerbang yang selalu merah cepat dimatikan orang, sehingga hasilnya
justru lebih buruk daripada tidak punya gerbang. Keempatnya tercatat sebagai
risiko yang ditanggung (#77), bukan disembunyikan. Ambang dinaikkan ke
`moderate` begitu #77 tuntas.

**Gerbangnya dibuktikan bisa merah**, bukan hanya bisa hijau:

```
AUDIT_AMBANG=high      -> LULUS  (exit 0)
AUDIT_AMBANG=moderate  -> GAGAL  (exit 1), 4 kerentanan disebut satu per satu
```

Keduanya ditulis tanpa menambah dependensi apa pun — SBOM dibangun dari
`package-lock.json` yang sudah ada. ARCHITECTURE.md menuntut alasan kuat untuk
tiap dependensi baru, dan untuk membaca daftar dari lockfile alasan itu tidak
ada.

Hanya dependensi **production** yang masuk SBOM. Alat build dan test tidak
terkirim ke pengguna, jadi memasukkannya membuat SBOM menakut-nakuti tanpa
sebab.

### 18.11 Penerapan rubrik §18.5 ke temuan lama — SELESAI 16 Agu 2026

Langkah 4 §18.9. Seluruh 25 temuan F2 dinilai ulang memakai rubrik berbasis
**dampak & keterjangkauan**, menggantikan penilaian lama yang berbasis biaya
bisnis.

**Hasilnya: 21 dari 25 tidak berubah.** Itu sendiri sebuah temuan — penilaian
intuitif ternyata sudah cukup dekat, jadi rubriknya bukan mengoreksi besar-besaran
melainkan **membuat alasannya bisa diperiksa orang lain**.

Empat yang berubah, beserta sebabnya:

| # | Lama | Baru | Sebab |
| - | :--: | :--: | ----- |
| 53 | 🟠 | 🔴 | Bisa dipanggil **tanpa kredensial apa pun** — `POST /api/auth/logout` berada di prefix publik. Rubrik menaruh "dapat dieksploitasi tanpa kredensial sah" di 🔴 tanpa syarat lain. Penilaian lama menurunkannya karena dampaknya "hanya" melemahkan sesi tunggal, dan itu mencampur dampak dengan keterjangkauan |
| 57 | 🟡 | ⚪ | **Bukan temuan keamanan.** Dua endpoint health adalah cacat operasional; memaksanya masuk skala keamanan membuat ⚪ berarti dua hal berbeda. Diberi tanda ⚪ **operasional** |
| 62 | 🟠 | 🟡 | Butuh kondisi yang tidak wajar terjadi (tabel hilang di database yang sehat). Rubrik menaruhnya di 🟡: melemahkan pertahanan dan menyesatkan saat insiden, tetapi tidak bisa dipicu pada operasi normal |
| 63 | 🟠 | 🟡 | Sama — hanya muncul saat mendaftar dengan email ganda, dan akibatnya pesan galat yang keliru, bukan kehilangan atau kebocoran data |

**#61 dan #74 sengaja TIDAK diturunkan** meski butuh akun sah: keduanya
menghilangkan atau merusak data pengguna tanpa jejak, dan rubrik menaruh itu di
🟠 walaupun butuh kredensial. #65 tetap 🔴 karena kehilangannya senyap.

Tanda baru **⚪ operasional** ditambahkan ke §1: temuan nyata yang **bukan**
soal keamanan. Tanpa itu skala keamanan ikut menampung cacat operasional dan
kehilangan arti.

**Yang tidak dikerjakan, dan alasannya:** vektor CVSS v3.1 tidak diberikan.
Menyusun vektor menuntut penilaian yang kompeten atas 8 metrik per temuan, dan
angka 0–10 yang dikarang menciptakan presisi palsu — pembaca akan mengurutkan
pekerjaan berdasarkan angka yang tidak punya dasar. Lebih jujur tidak punya skor
daripada punya skor yang salah. Ini tetap terbuka di §18.4.

---

## §19 RANCANGAN TWO-TIER RBAC — isi kerja F7, item #76

Ditetapkan 16 Agu 2026. Ini rancangan resmi untuk **#76 (otorisasi
deny-by-default)**, yang lahir dari §18.3 ketika 25 temuan F2 dipetakan ke OWASP
dan **14 di antaranya (56%) jatuh ke A01 Broken Access Control** — bukan 14
kekeliruan terpisah, melainkan satu kelemahan struktural.

### 19.1 Kenapa masuk F7, bukan F2

F2 **menemukan** dan menambal lubangnya satu per satu (#49, #54, #55, #66, #68,
#72, #73, #80). F7 **menutup akarnya**: satu sumber kebenaran untuk otorisasi,
sehingga rute ke-120 tidak mengulangi kesalahan yang sama.

Urutannya tidak boleh dibalik. Menulis skema validasi (#4) di atas otorisasi yang
belum benar berarti mengunci bentuk data yang belum tentu boleh diakses.

### 19.2 Kondisi awal: LIMA kosakata peran yang tidak pernah bertemu

Diukur 16 Agu 2026 dari database hidup dan kode.

| # | Sumber | Nilai | Punya data? |
| - | ------ | ----- | ----------- |
| 1 | `Users.role` | `user` (9) · `admin` (1) · `head` (1) | ✅ |
| 2 | `ProjectMembers.role` | `member` (7) · `manager` (2) · `developer` (1) | ✅ |
| 3 | `DEFAULT_PERMISSIONS` (kode) | `admin` · `head` · `manager` · `user` · `viewer` | sebagian |
| 4 | Penjaga rute (kode) | + `developer` · `member` · `designer` · `*` | sebagian |
| 5 | **`MasterData.project_role`** | Project Admin · Product Owner · Scrum Master · Lead Developer · Frontend Engineer · Backend Engineer · QA Engineer | ✅ 7 baris |
| — | Cek `role ===` tersebar | + `superadmin` · `administrator` · `assistant` · `qa` · `lead` · `sadm` · `admn` · `system admin` · `super admin` | ❌ nol |

**Gabungan 17 nama peran. Hanya 6 yang punya data. Tidak ada satu tempat pun
yang mendefinisikannya.**

⚠️ Sumber ke-5 adalah temuan yang paling mengejutkan: `MasterData` **sudah**
punya katalog peran sejak 5 Agu 2026, lengkap dengan kolom `role_type`, dan
**tidak satu pun cocok** dengan nilai di `ProjectMembers.role`. Katalognya ada,
tidak pernah dipakai.

Ditambah dua lapis lagi yang tidak terhitung di atas:

| Lapis | Keadaan |
| ----- | ------- |
| `Users.permissions` — matriks 16 modul × CRUD per individu | Ditegakkan backend **hanya di 1 modul** (`list`), 2 aksi, di task routes. 15 modul lain: **kosmetik** |
| `ProjectMembers.parentAdminId` | **Ditulis, tidak pernah dibaca.** 6 baris terisi, nol `SELECT` (item #81) |

### 19.3 Prinsip: jabatan ≠ peran akses

Diambil dari benchmark, dan inilah yang membedakan rancangan ini dari katalog
lama:

| Aplikasi | Jumlah project role | Dasar pembedaan |
| -------- | :-----------------: | --------------- |
| GitLab | 5 — Guest, Reporter, Developer, Maintainer, Owner | Tangga hak akses |
| Jira Cloud (team-managed) | 3 — Administrator, Member, Viewer | Tangga hak akses |
| Jira Server (company-managed) | 3 — Administrators, Developers, Users | Izin di Permission Scheme |
| Azure DevOps | 3 — Readers, Contributors, Project Administrators | Tangga hak akses |

**Tidak satu pun memakai profesi sebagai peran.** `Frontend Engineer` dan
`Backend Engineer` membutuhkan hak akses yang identik — yang berbeda hanya
pekerjaannya. Menjadikannya dua peran mengulang persis masalah `developer` vs
`member`: dua nama, hak akses sama, tidak ada yang tahu bedanya.

Tempat yang benar untuk itu sudah ada: `MasterData.type = 'jabatan'` (12 baris).

### 19.4 SYSTEM ROLE — 4 peran

Mengatur hal **di luar** proyek. Tidak menentukan apa pun di dalam proyek.

| Nama Modul | Nama Role | Akses CRUD |
| ---------- | --------- | :--------: |
| `userManagement` | Administrator | CRUD |
| `userManagement` | Department Head | R |
| `userManagement` | Standard User · Observer | — |
| `masterData` | Administrator | CRUD |
| `masterData` | Department Head | R |
| `masterData` | Standard User · Observer | — |
| `auditLog` | Administrator | CRUD |
| `auditLog` | Department Head | R |
| `auditLog` | Standard User · Observer | — |
| `dbExplorer` | Administrator | CRUD |
| `dbExplorer` | Department Head · Standard User · Observer | — |
| `settings` | Administrator | CRUD |
| `settings` | Department Head | R |
| `settings` | Standard User · Observer | — |
| *(buat proyek)* | **Administrator** | **C** |
| *(buat proyek)* | Department Head · Standard User · Observer | **—** |
| *(lintas proyek)* | Administrator | **God Mode** |
| *(daftar proyek terlihat)* | Administrator | semua |
| *(daftar proyek terlihat)* | Department Head | se-departemen |
| *(daftar proyek terlihat)* | Standard User · Observer | hanya yang ia anggotai |

`Project Manager` **tidak ada** di system role atas ketetapan pemilik proyek
16 Agu 2026. Sesudah pembuatan proyek dibatasi ke Administrator, peran itu tidak
menyisakan pembeda apa pun dari Standard User.

### 19.5 PROJECT ROLE — 8 peran

Mengatur hal **di dalam** satu proyek. Tiga peran fungsional — System Analyst,
Business Analyst, dan QA — ditetapkan pemilik proyek sebagai project role
tersendiri, masing-masing **menguasai penuh satu modul**.

| Nama Modul | Nama Role | Akses CRUD |
| ---------- | --------- | :--------: |
| `dashboard` | seluruh peran | R |
| `access` (Team) | Project Owner · Project Admin | CRUD |
| `access` | Project Manager | R + U |
| `access` | System Analyst · Business Analyst · Developer · QA · Viewer | R |
| `list` (Issue List) | Project Owner · Project Admin · Project Manager | CRUD |
| `list` | System Analyst · Business Analyst · Developer · QA | CRU |
| `list` | Viewer | R |
| `board` (Kanban) | Project Owner · Project Admin · Project Manager | CRUD |
| `board` | System Analyst · Business Analyst · Developer · QA | R + U |
| `board` | Viewer | R |
| `sprints` | Project Owner · Project Admin · Project Manager | CRUD |
| `sprints` | System Analyst · Business Analyst · Developer · QA · Viewer | R |
| `timeline` | Project Owner · Project Admin · Project Manager | CRUD |
| `timeline` | System Analyst · Business Analyst · Developer · QA · Viewer | R |
| `wiki` (Documentation) | Project Owner · Project Admin · Project Manager | CRUD |
| `wiki` | **System Analyst** | **CRUD** |
| `wiki` | Business Analyst | CRU |
| `wiki` | Developer · QA · Viewer | R |
| `flowchart` | Project Owner · Project Admin · Project Manager | CRUD |
| `flowchart` | **System Analyst** | **CRUD** |
| `flowchart` | Business Analyst | CRU |
| `flowchart` | Developer · QA · Viewer | R |
| `meetingNotes` | Project Owner · Project Admin · Project Manager | CRUD |
| `meetingNotes` | **Business Analyst** | **CRUD** |
| `meetingNotes` | System Analyst · QA | CRU |
| `meetingNotes` | Developer · Viewer | R |
| `qa` (Quality Assessment) | Project Owner · Project Admin · Project Manager | CRUD |
| `qa` | **QA** | **CRUD** |
| `qa` | System Analyst · Business Analyst · Developer | R + U |
| `qa` | Viewer | R |
| `notebooklm` | Project Owner · Project Admin · Project Manager | CRUD |
| `notebooklm` | System Analyst · Business Analyst | CRU |
| `notebooklm` | Developer · QA · Viewer | R |
| *(hapus proyek)* | **Project Owner** | **D** |
| *(hapus proyek)* | selain itu | — |

#### Wilayah kuasa tiap peran fungsional

| Peran | Modul yang dikuasai penuh | Alasan |
| ----- | ------------------------- | ------ |
| **System Analyst** | `wiki` · `flowchart` | Pemilik dokumentasi sistem & alur proses |
| **Business Analyst** | `meetingNotes` | Pemilik requirement & notulen |
| **QA** | `qa` | Pemilik test case & bukti pengujian |
| **Developer** | — | Pelaksana teknis; boleh ditugasi dan mengubah task, tidak menghapus |

Keempatnya **setara**, bukan bertingkat — hanya berbeda wilayah kuasa. Padanan
benchmark: keempatnya setara `Developer` di GitLab, dan yang membedakan hanyalah
modul tempat mereka memegang `D`.

⚠️ **Catatan penting soal `D`.** Di luar modul yang dikuasainya, tiga peran
fungsional **tidak pernah menghapus**. Penghapusan lintas modul tetap milik
Project Owner, Project Admin, dan Project Manager. Inilah yang menutup #66 dan
#72 secara struktural.

### 19.6 ALUR OTORISASI — urutan pemeriksaan yang mengikat

Inilah bagian yang menutup #76. Setiap permintaan menempuh urutan ini, **tanpa
pengecualian**, dan langkah yang gagal langsung menghentikan permintaan.

```
                     Permintaan masuk
                            │
            ┌───────────────▼───────────────┐
            │ 1. authenticateJWT             │  token sah? sesi tunggal?
            └───────────────┬───────────────┘  gagal -> 401
                            │
            ┌───────────────▼───────────────┐
            │ 2. Rute punya :projectId?      │
            └───────┬───────────────┬───────┘
                 ya │               │ tidak
                    │               │
                    │   ┌───────────▼──────────────┐
                    │   │ 3a. SYSTEM ROLE saja      │  §19.4
                    │   │     modul + aksi          │  gagal -> 403
                    │   └───────────────────────────┘
                    │
    ┌───────────────▼──────────────┐
    │ 3b. System role = Administrator? │  GOD MODE
    └───────┬──────────────────┬───┘
         ya │                  │ tidak
            │                  │
      LOLOS │      ┌───────────▼─────────────────┐
            │      │ 4. Ambil PROJECT ROLE dari   │  ProjectMembers
            │      │    (projectId, userId)       │  tidak ada -> 403
            │      └───────────┬─────────────────┘
            │                  │
            │      ┌───────────▼─────────────────┐
            │      │ 5. Cocokkan modul + aksi     │  §19.5
            │      │    dengan matriks project    │  gagal -> 403
            │      └───────────┬─────────────────┘
            │                  │
            └──────────────────┴──> LANJUT ke handler
```

**Empat aturan yang mengikat:**

1. **Di dalam proyek, SYSTEM ROLE tidak dipakai** — kecuali Administrator.
   Seorang `Department Head` yang bukan anggota proyek X **tidak bisa** menyentuh
   isi proyek X.
2. **God Mode hanya milik Administrator**, dan setiap pemakaiannya **wajib
   tercatat** di `AuditLogs`. Tanpa pencatatan, tidak ada cara mengetahui
   penyalahgunaannya.
3. **Deny-by-default.** Rute tanpa penjaga eksplisit **DITOLAK**, bukan
   diloloskan. Inilah pembalikan yang menutup #68, #70, #71, dan #80 sekaligus —
   keempatnya lolos justru karena bawaannya "izinkan".
4. **Bukan anggota = 403**, meskipun system role-nya tinggi. Menutup #49.

### 19.7 Pemetaan CRUD ke operasi nyata

Agar "CRUD" tidak ditafsirkan berbeda-beda antar modul:

| Huruf | Arti | Contoh di `list` (Issue List) |
| :---: | ---- | ----------------------------- |
| **C** | Membuat entitas baru | `POST /tasks` |
| **R** | Membaca daftar & detail | `GET /tasks`, `GET /tasks/:id` |
| **U** | Mengubah isi, status, penugasan | `PUT /tasks/:id`, `PUT /tasks/reorder` |
| **D** | Menghapus permanen | `DELETE /tasks/:id`, `bulk-delete` |

**Ketetapan yang mengikat seluruh matriks:** `D` hanya dimiliki Project Owner,
Project Admin, dan Project Manager — kecuali `QA` pada modul `qa`. Pelaksana
(`Contributor`) **tidak pernah menghapus**. Ini yang menutup #66 dan #72 secara
struktural, bukan per rute.

`R + U` berarti boleh mengubah yang sudah ada tetapi tidak boleh membuat baru —
dipakai pada `board` (memindahkan kartu) dan `access` (mengubah peran anggota).

### 19.8 Keadaan pengerjaan

| Tahap | Isi | Status |
| :---: | --- | ------ |
| 0 | Katalog peran di `MasterData` | ✅ **SELESAI 16 Agu** — `npm run db:seed-roles`. Katalog final: **4 SYSTEM + 8 PROJECT**, terverifikasi tampil di layar Master Data |
| 1 | Satu enum peran, satu tempat. Hapus `\| string`, satukan dua `AppRole` | `TERBUKA` |
| 2 | Penjaga saat boot — server menolak menyala bila rute memakai peran di luar enum | `TERBUKA` |
| 3 | Migrasi data `ProjectMembers` (10 baris) & `Users` (11 baris) | `MENUNGGU` keputusan |
| 4 | `verifyProjectAccess` baca matriks terpusat + deny-by-default | `TERBUKA` |
| 5 | `can(action, module, projectId)` menggantikan 36 `hasPermission` di 13 berkas | `TERBUKA` |
| 6 | Panel "Active System Permissions & Overrides" jadi **baca-saja** | `TERBUKA` |

**Tahap 1 dan 2 tidak butuh keputusan apa pun** dan bisa dikerjakan kapan saja.
Keduanya kecil, tidak mengubah perilaku, tetapi langsung membuat kompilator dan
server menolak 11 nama peran hantu.

⚠️ Sekarang adalah saat termurah: **10 baris `ProjectMembers`, 11 baris
`Users`, 2 proyek**. Setahun lagi angka ini bisa ribuan.

### 19.9 Empat keputusan yang menahan Tahap 3 ke atas

| # | Keputusan | Rekomendasi |
| - | --------- | ----------- |
| K1 | 6 project role, atau 8 dengan System Analyst & Business Analyst terpisah? | ✅ **DIJAWAB: 8.** Pemilik proyek menetapkan System Analyst, Business Analyst, dan QA sebagai project role tersendiri, masing-masing menguasai penuh satu modul |
| K2 | Lead / Frontend / Backend Engineer pindah ke `jabatan`? | **Ya** — profesi, bukan izin |
| K3 | Product Owner & Scrum Master dilebur ke Project Manager? | **Ya** — fungsinya beririsan |
| K4 | Nasib `parentAdminId` | **Buang** — item #81, ditulis tapi tidak pernah dibaca |

### 19.10 Kontrak dengan antarmuka — kekeliruan yang layak dicatat

Versi pertama penyemai membuat `type = 'system_role'` untuk peran sistem.
Barisnya masuk ke database dengan benar dan seluruh pemeriksaan sisi database
lulus — tetapi **tidak pernah muncul di layar**. Pemilik proyek yang
menemukannya: *"saya cek di data master untuk project role dan system role masih
kosong"*.

Sebabnya: `MasterDataPanel.tsx` hanya mengenal `type = 'project_role'`, lalu
memisahkan dua lapis lewat kolom `role_type`.

```
type       = 'project_role'    untuk SELURUH peran, dua-duanya
role_type  = 'SYSTEM'          peran sistem
role_type  = 'PROJECT'         peran proyek
```

**Pelajarannya:** menambah tipe data baru tanpa memeriksa apa yang dibaca
antarmuka menghasilkan data yang benar tetapi tidak terlihat — bentuk kegagalan
paling membingungkan, karena tidak ada satu pun pemeriksaan yang merah. Ini
saudara kandung §13.14: gerbang yang dinyatakan lulus tanpa dijalankan.

### 19.11 Yang SUDAH dikerjakan dan yang SENGAJA ditahan

**K1–K3 dijawab pemilik proyek 16 Agu 2026** dengan izin hard delete, karena
LanPro masih tahap pengembangan dan katalog lama belum dirujuk satu pun baris
`ProjectMembers`.

⚠️ **KOREKSI — asumsi yang sempat saya catat sebagai keputusan.** Versi pertama
bagian ini menulis *"K1 terjawab implisit: 6 project role"*. Itu **keliru**.
Pemilik proyek sudah menyatakan sejak awal bahwa System Analyst, Business
Analyst, dan QA adalah **project role**; kalimat *"ganti yang anda rekomendasikan
tadi"* menjawab soal **membersihkan katalog**, bukan membatalkan pernyataan itu.

Kekeliruannya ditemukan pemilik proyek sendiri: *"project role bukannya ada
banyak tadi, SA, BA, QA aja tidak ada"*. Katalog dikembalikan ke **8 peran**,
`Contributor` dihapus dan dipecah menjadi System Analyst, Business Analyst, dan
Developer.

**Pelajarannya:** rekomendasi tidak boleh menimpa pernyataan pemilik proyek, dan
sebuah pertanyaan yang belum dijawab tidak boleh dicatat sebagai "terjawab
implisit". Bila jawabannya tidak eksplisit, statusnya tetap `MENUNGGU`.

Sudah dikerjakan lewat `npm run db:seed-roles`:

| Aksi | Isi |
| ---- | --- |
| **Dihapus** (9) | `Product Owner`, `Scrum Master` (K3 — dilebur ke Project Manager) · `Lead Developer`, `Frontend Engineer`, `Backend Engineer` (K2 — profesi, bukan izin) · 4 baris `system_role` keliru dari versi pertama |
| **SYSTEM** (4) | Administrator · Department Head · Standard User · Observer |
| **PROJECT** (8) | Project Owner · Project Admin · Project Manager · System Analyst · Business Analyst · Developer · QA · Viewer |
| **Jabatan** (+2) | Frontend Engineer · Backend Engineer |
| **Typo diperbaiki** | `"Businnes Analyst"` → `"Business Analyst"` |

Hasil akhir: `MasterData` **84 baris** · Project Role **12** (4 SYSTEM +
8 PROJECT) · Position **15**. Diverifikasi tampil benar di layar Master Data
dengan sesi Administrator, 0 error console.

`System Analyst` sengaja ada di DUA tempat: sebagai **project role** (hak akses)
dan sebagai **jabatan** (profesi). Itu bukan duplikasi — seseorang berjabatan
System Analyst memang wajar memegang project role bernama sama, tetapi keduanya
dipakai untuk hal yang berbeda dan boleh tidak sama.

Sengaja **masih ditahan**:

- **`ProjectMembers.role` belum dimigrasikan.** 10 baris masih berisi
  `member`/`manager`/`developer` — nilai yang tidak ada lagi di katalog. Ini
  Tahap 3, dan mengubahnya berarti mengubah hak akses orang yang sedang bekerja.
- **K4 (`parentAdminId`) belum diputuskan** — item #81.

---

### 19.12 Temuan #82 — dropdown peran tidak membaca katalog

Ditemukan pemilik proyek 16 Agu 2026, tepat setelah katalog dirapikan:
*"di dropdown detail user yang project role dan system role tidak sama nih
datanya dengan data master"*.

Benar. Katalog `MasterData` sudah rapi, tetapi **antarmuka tidak membacanya**.

#### 19.12.1 Dropdown SYSTEM ROLE — hardcoded + duplikat

`src/features/users/UserDetailView.tsx:685`. Lima opsi ditulis langsung di JSX,
lalu Master Data ditambahkan dengan penyaring yang tidak lengkap.

| Yang tampil | Nilai tersimpan | Asal |
| ----------- | --------------- | ---- |
| Administrator (Full Access) | `admin` | hardcoded |
| Department Head (Head) | `head` | hardcoded |
| **Project Manager (Manager)** | `manager` | hardcoded — **bukan system role** |
| Standard User (User) | `user` | hardcoded |
| Observer (Viewer - Read Only) | `viewer` | hardcoded |
| **Department Head** | `Department Head` | MasterData — **duplikat** |
| **Standard User** | `Standard User` | MasterData — **duplikat** |
| **Observer** | `Observer` | MasterData — **duplikat** |

Penyaringnya hanya membuang label yang persis `admin`/`head`/`manager`/`user`/
`viewer`/`administrator`. Label `"Department Head"` tidak cocok, jadi lolos.

⚠️ **Yang membuatnya 🔴:** dua baris kembar itu menyimpan **nilai berbeda** —
`head` versus `Department Head`. Memilih yang salah menulis nilai peran yang
tidak dikenal seluruh penjaga rute, dan pengguna itu kehilangan akses tanpa
pesan apa pun. Ini juga sumber ke-18 kosakata peran (§19.2).

Ditambah: `Project Manager` muncul sebagai **system role**, padahal ketetapan
16 Agu menempatkannya khusus di project role.

#### 19.12.2 Dropdown PROJECT ROLE — sepenuhnya hardcoded

`src/features/users/UserDetailView.tsx:1056`. Tidak membaca katalog sama sekali.

| Dropdown | Ada di katalog? |
| -------- | :-------------: |
| Project Admin · Project Manager · Viewer · Owner | ✅ |
| **Project Lead** · **Member** | ❌ tidak ada |
| System Analyst · Business Analyst · Developer · QA | ❌ **tidak bisa dipilih** |

Akibatnya **empat peran yang baru ditetapkan tidak terjangkau dari antarmuka**,
dan dua peran yang tidak ada di katalog masih bisa ditetapkan ke pengguna.

Ini juga menjelaskan kenapa `ProjectMembers` berisi `member` — nilai itu memang
disediakan dropdown, meski tidak pernah ada di katalog mana pun.

#### 19.12.3 Cakupan sesungguhnya

Hanya **3 berkas** yang membaca `project_role` dari `MasterData`:
`MasterDataPanel.tsx`, `AdminUserPanel.tsx`, `UserDetailView.tsx` — dan dua
terakhir hanya sebagian. **Tidak satu pun** komponen penetap peran anggota
proyek membaca katalog.

#### 19.12.4 Perbaikannya

Bagian dari Tahap 5 (§19.8), tetapi **harus dikerjakan lebih dulu** — selama
dropdown masih hardcoded, memperbaiki backend tidak ada gunanya karena pengguna
tetap hanya bisa memilih peran lama.

1. Hapus SELURUH `<option>` peran yang ditulis langsung
2. Ambil dari `MasterData`: `type='project_role'`, disaring `role_type`
3. Nilai yang disimpan = **kode peran baku**, bukan label — supaya penggantian
   nama label di Master Data tidak merusak otorisasi
4. Tahap 2 (penjaga saat boot) ikut memvalidasi bahwa katalog dan enum sepadan

---
