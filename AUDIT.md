# AUDIT LanPro — Papan Rekap Kendala & Perbaikan

> ## ⚠️ PERKAKAS AI — BERHENTI DI SINI DULU
>
> Bila Anda perkakas AI (Antigravity, Claude Code, Cursor, dan sejenisnya):
> baca **`AGENTS.md` di akar repositori** lebih dulu, lalu **§23** di dokumen
> ini. Keduanya wajib, dan keduanya pendek.
>
> Ringkasnya: **pekerjaan berasal dari nomor item di §1.1, bukan dari tebakan
> Anda.** Sebutkan nomor itu kepada pemilik proyek sebelum menyentuh kode. Bila
> pekerjaannya menyangkut warna atau tema, **§22 wajib dibaca** — tema repo ini
> pernah dirusak persis karena langkah itu dilewati.

**Dokumen ini adalah SATU-SATUNYA pedoman perbaikan.** Tujuannya menghapus
kebutuhan mengevaluasi ulang dari nol setiap kali memulai sesi kerja.

- Baseline diukur: **15 Agustus 2026**, commit `9053d8f`
- Semua angka di sini hasil **pengukuran perintah nyata**, bukan perkiraan.
- Perintah pengukurannya ikut ditulis (§9) supaya angka bisa diperbarui siapa pun
  dan hasilnya bisa dibandingkan secara adil.

---

## MULAI DARI SINI

**Baru pertama membuka dokumen ini — manusia maupun perkakas AI?** Baca tiga
bagian ini, berurutan. Sisanya rujukan, bukan bacaan awal.

| Urutan | Bagian   | Isi                                                                                                                                                         |
| :----: | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   1    | **§20**  | **Serah terima.** Aturan yang mengikat, 27 item belum selesai beserta apa yang perlu diketahui SEBELUM menyentuhnya, dan enam kesalahan yang jangan diulang |
|   2    | **§0**   | Keadaan aplikasi hari ini, fase yang sudah tutup, jebakan khas repo ini                                                                                     |
|   3    | **§1.1** | Daftar item yang BELUM selesai. §1.4 mengurutkannya dari yang termurah                                                                                      |

⚠️ **Tiga hal yang paling sering membuat penerus salah langkah:**

1. **§1 adalah HIPOTESIS, bukan instruksi.** Tiga kali dalam satu sesi rumusan
   item terbukti keliru saat ditelusuri (#69, #87, #77). Menambal sesuai rumusan
   yang salah menghasilkan kerusakan yang tampak seperti perbaikan.
2. **Status `MENUNGGU` berarti menunggu KEPUTUSAN pemilik proyek**, bukan
   menunggu pengerjaan. Mengerjakannya berarti menebak keputusan orang.
3. **`npm test` hijau BUKAN bukti aplikasi benar.** Wajib buka browser di tab
   bersih (§15.3). Kelas Tailwind, misalnya, hanyalah string bagi kompilator.

### Peta bagian

| Bagian  | Isi                                                                                                |
| ------- | -------------------------------------------------------------------------------------------------- |
| §0      | Status serah terima · jebakan repo · peta berkas SSO                                               |
| §1      | Papan prioritas — §1.1 BELUM · §1.2 SELESAI · §1.3 ditahan · §1.4 urutan termurah · §1.5 peta fase |
| §2–§9   | Pengukuran per area, dan **§9 memuat perintah untuk mengukur ulang**                               |
| §10–§12 | Riwayat perbaikan · batas audit · aturan kerja                                                     |
| §13     | Audit LOGIKA (F2) — asal-usul sebagian besar temuan                                                |
| §14–§17 | Checklist UI · protokol jaga-jaga · kartu verifikasi · standar develop                             |
| §18     | Standar & kepatuhan — pemetaan OWASP/CWE, rubrik keparahan                                         |
| §19     | **Two-Tier RBAC (F7)** dan seluruh catatan pengerjaannya, §19.1–§19.49                             |
| §20     | **Serah terima untuk perkakas lain**                                                               |
| §21     | Pekerjaan yang ditahan 17 Agu 2026 — keadaan persis saat berhenti, dan pemindai kontras            |
| §22     | **Aturan menyentuh TEMA** — wajib dibaca sebelum mengubah warna apa pun                            |
| §23     | **Prompt awal sesi** — teks siap salin-tempel untuk Antigravity/perkakas AI lain                   |

---

## §0 STATUS SERAH TERIMA — baca ini lebih dulu

Bagian ini ditulis agar siapa pun — manusia maupun agen AI lain — bisa
melanjutkan pekerjaan tanpa perlu menelusuri riwayat percakapan.

**Diperbarui: 16 Agustus 2026, sesudah F7 Two-Tier RBAC TUTUP.** Seluruh pekerjaan ada
di branch `main` lokal dan **BELUM di-push ke `origin/main`** — tertinggal
**334 commit** — periksa sendiri dengan `git log --oneline main ^origin/main | wc -l`,
jangan percaya angka ini bila sesi berikutnya sudah menambah commit.

Bacaan tercepat untuk tahu keadaan hari ini: **§0.2** (apa yang berubah), lalu
**§0.4** (apa yang menahan sisanya). Rinciannya §19.15–§19.44.

**Papan §1 dipecah tiga:** §1.1 BELUM · §1.2 SELESAI · §1.3 ditahan. Urutan
kerjanya di **§1.4** — termurah lebih dulu, atas ketetapan pemilik proyek.
Konsistensinya dijaga `npm run audit:papan`.

### 0.1 Kondisi aplikasi saat ini

| Cek                 | Nilai                                                             | Perintah                                     |
| ------------------- | ----------------------------------------------------------------- | -------------------------------------------- |
| `tsc --noEmit`      | 0 error                                                           | `npm run lint`                               |
| ESLint              | 0 error, 449 warning                                              | `npx eslint src server`                      |
| Test                | **404 lulus / 43 suite**                                          | `npm test`                                   |
| Build               | sukses                                                            | `npm run build`                              |
| Doctor              | SIAP JALAN (1 peringatan disengaja: `STORAGE_DRIVER=local`)       | `npm run doctor`                             |
| Aplikasi di browser | layar Sign In tampil normal; 1 error `WebSocket` **belum diukur** | `npm run dev` → buka `http://localhost:3000` |

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

**SESUDAH F7 TUTUP — 17 item lagi, sebagian besar tanpa keputusan pemilik.**

Dikerjakan mengikuti §1.4 (termurah lebih dulu). Papan bergerak **40 → 30 BELUM**.

| Kelompok          | Item                                                                                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Lubang otorisasi  | **#94** 7 rute telanjang · **#54** identitas dari header · **#55** RBAC no-op · **#71** project-modules · **#53** logout lintas pengguna |
| Pintu belakang    | **#91** kredensial admin ter-hardcode + peran diminta dari body                                                                          |
| Kerapian data     | **#47** 11 kolom → 6 · **#81** `parentAdminId` dibuang · **#20** kode mati DB Explorer · **#57** endpoint health disatukan               |
| Rantai pasok      | **#77** `react-router-dom` dicabut — 4 moderate → 2                                                                                      |
| Sesi & kredensial | **#93** token ikut "Remember Me"                                                                                                         |
| Perkakas          | **#56** crash `pg` saat Jest dibongkar                                                                                                   |

**Temuan baru yang MASIH TERBUKA:** #87 (frontend abai peran proyek — bukan
lubang keamanan sesudah server menegakkan sendiri) · #92 (peran dibaca dari
token di 7 tempat, dari database di penjaga proyek; token 2 jam, jadi pencabutan
hak tertunda).

**Perintah baru sesi ini:**

```bash
npm run audit:papan            # integritas papan §1 — duplikat, nomor hilang, angka judul
npm run db:migrasi-peran       # member -> developer, bawaannya uji-coba
npm run db:hapus-kolom-kembar  # menjatuhkan kolom menganggur, bawaannya uji-coba
```

⚠️ **Satu regresi yang saya sebabkan dan pemilik proyek yang menemukannya:**
menghentikan penulisan ganda #47 membuat komentar tampil **tanpa teks dan tanpa
nama** — hanya jamnya. Sebabnya kolom `commenttext`/`username` terlipat huruf
kecil sementara frontend membaca `commentText`. Diperbaiki dengan alias eksplisit
di `SELECT` (§19.39). **Pelajarannya:** test yang memalsukan adaptor DB tidak
bisa menangkap ketidakcocokan nama kolom nyata.

#### ⚠️ Pekerjaan berjalan dari perkakas LAIN — belum di-commit

Dicatat 16 Agu 2026. Pemilik proyek memakai **Antigravity** pada repo yang sama.
Dua jejaknya:

**1. Commit `67d38e9`** — "Fix logout endpoint, update AUDIT #53, add changelog
entry". Menyentuh `AUDIT.md` dan membuat `CHANGELOG.md` baru. Perubahan §0.4 di
dalamnya menghapus sebagian tabel §1.4; `npm run audit:papan` tetap LULUS, jadi
papannya konsisten.

**2. 48 berkas belum di-commit** — pencabutan kelas `dark:`, yaitu isi **item
#13** (F12 konsolidasi desain). Diukur langsung:

|                             | Sebelum | Sesudah |
| --------------------------- | ------: | ------: |
| Kemunculan `dark:` di `src` | **532** |  **13** |
| Berkas tersentuh            |       — |      48 |

**97,6% dicabut.** Sisa 13 kemunculan belum ditelusuri apakah disengaja atau
terlewat.

⚠️ **BELUM DIVERIFIKASI OLEH SESI INI.** Perubahannya seluruhnya kelas Tailwind
— `tsc` dan `npm test` **tidak akan menangkap** kerusakannya, sebab kelas CSS
hanyalah string bagi kompilator. Yang bisa membuktikannya hanya **membuka
aplikasi dalam mode gelap**.

Karena itu #13 **tidak** ditandai selesai di §1: pekerjaannya ada, buktinya
belum. Menandainya selesai sekarang adalah bentuk persis kegagalan §13.14.

**Yang sudah saya periksa, dan hasilnya BUKAN yang saya duga.**

Pemeriksaan pertama terlihat mengkhawatirkan: peramban dalam skema gelap,
tetapi `<html>` tanpa kelas `dark` dan latar body terang. Hampir saya laporkan
sebagai kerusakan.

Dua pengukuran menghentikannya:

1. **Varian gelapnya berbasis KELAS, bukan media query.** `src/index.css:4`
   berbunyi `@variant dark (&:where(.dark, .dark *))`, dan tokennya ditimpa di
   blok `html.dark`. Jadi layar terang saat sistem gelap adalah **perilaku
   normal** — mode gelap dinyalakan aplikasi, bukan oleh preferensi sistem.
2. **Perbandingan A/B terhadap kode SEBELUM perubahan.** Dengan `html.dark`
   dipasang paksa, latar body terbaca `oklch(0.984 …)` — **identik** sebelum dan
   sesudah 48 berkas itu. Jadi pencabutan `dark:` tidak mengubah pengukuran ini.

> Alarm pertama saya salah, dan yang membatalkannya bukan pemikiran ulang
> melainkan **pembanding**. Tanpa menjalankan versi sebelumnya, "latar terang di
> mode gelap" akan terbaca meyakinkan sebagai regresi.

**Yang MASIH perlu dilakukan sebelum #13 boleh ditutup:**

1. Nyalakan mode gelap **lewat antarmuka aplikasi**, bukan dengan memasang kelas
   dari devtools — jalur itu yang dipakai pengguna.
2. Periksa layar yang dulu paling banyak memakai `dark:`: modal, dashboard,
   layar auth.
3. Telusuri **13 sisa** `dark:` — disengaja, atau terlewat?

Satu pengukuran yang sama sebelum dan sesudah **tidak membuktikan** seluruh
tampilan aman; ia hanya membatalkan satu dugaan kerusakan.

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

**F7 · Two-Tier RBAC (#76) — DIKERJAKAN BESAR-BESARAN 16 Agu 2026.**

Ini pekerjaan terbesar sesi terakhir. Akar 56% temuan F2 (14 dari 25 masuk OWASP
A01) ditutup secara struktural, bukan per rute. Rancangannya §19; catatan
pengerjaannya §19.15–§19.23.

| Tahap | Isi                                      | Hasil                                                                                                                    |
| :---: | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
|   1   | Satu definisi peran, `\| string` dicabut | ✅ `src/types/roles.ts`. Jadi DUA enum, bukan satu — kode `admin` bertabrakan antar lingkup dan memicu God Mode (§19.15) |
|   2   | Matriks otorisasi terpusat               | ✅ `src/lib/matriksAkses.ts`, diikat ke tabel §19.4/§19.5 lewat test yang MEMBACA AUDIT.md                               |
|  2b   | Penjaga saat boot                        | ✅ `daftarPeranRute.ts`, **`MODE = TOLAK`** — juga menolak modul asing & kombinasi mati (#90)                            |
|   3   | Migrasi data                             | ✅ dijalankan ke Neon. 7 baris `member` → `developer`                                                                    |
|   4   | `jagaProyek(modul, aksi)` + pemasangan   | ✅ **54 dari 54 rute**. Penjaga lama NOL pemakai                                                                         |

**Angka yang paling menjelaskan keadaan** — dari log boot server sungguhan:

| Laporan boot                          |               Sebelum F7 |  Sekarang |
| ------------------------------------- | -----------------------: | --------: |
| Penjaga lama `verifyProjectAccess`    |                       54 |     **0** |
| Rute ber-`["*"]` (= anggota mana pun) |                 31 (57%) |     **0** |
| Korslet `"*"` di daftar peran (#73)   |                        1 |     **0** |
| Peran warisan terpakai                | member · designer · head | **nihil** |
| Penjaga matriks aktif                 |                        0 |    **54** |

**#66 dan #72 tertutup secara struktural.** `viewer` kini benar-benar hanya
membaca. **#80 juga ditutup** — pintu kedua pembuatan proyek.

**Dua pengetatan yang bisa dirasakan pengguna**, keduanya sesuai §19.5:

1. Menghapus PROYEK kini hanya Project Owner. Dulu Project Admin pun bisa.
2. `tasks/bulk-delete` kini hanya Owner/Admin/Manager. Dulu developer pun bisa —
   penghapusan massal justru lebih longgar daripada penghapusan satuan.

**F7 TUTUP.** Tahap 1–4 seluruhnya selesai. `MODE = TOLAK`: server kini
**menolak menyala** bila ada rute memakai peran di luar katalog, modul di luar
matriks, atau kombinasi modul+aksi yang tidak mengizinkan siapa pun.

```
[RBAC] 54 penjaga matriks · 0 penjaga lama · 0 ber-["*"] polos · 0 korslet
```

**Selesai sesudah itu, masih di sesi yang sama:** #66 · #69 · #70 · #72 · #73 ·
#76 · #80 · #82 · #84 · #89 · #90 · **#91**.

⚠️ **#91 yang paling penting dibaca.** Dua pintu belakang admin (§19.27):
kredensial `admin`/`admin123` ter-hardcode di frontend — **ikut terkirim ke
setiap pengunjung lewat bundel** — dan peran yang bisa **diminta dari body**
pada endpoint pendaftaran publik. Keduanya dicabut.

Keduanya ditemukan bukan dari daftar temuan, melainkan saat **menelusuri #87
yang ternyata saya tulis keliru**. Dua kali sesi ini catatan temuan salah rumus
(#69, #87) — perlakukan §1 sebagai hipotesis, bukan instruksi.

**Temuan baru yang MASIH TERBUKA:** #87 (dikoreksi — frontend abai peran
proyek, bukan lagi lubang keamanan sesudah server menegakkan sendiri) · #92
(peran dibaca dari token di 7 tempat, dari database di penjaga proyek; token
2 jam, jadi pencabutan hak tertunda).

### 0.4 Yang PALING MUNGKIN dikerjakan berikutnya

Diukur 16 Agu 2026 dari §1.1: **29 item belum selesai, dan 5 di antaranya
berstatus `TERBUKA`.** Sisanya `MENUNGGU` jawaban pemilik proyek.

| #      | Isi                                                                 | Biaya                                     |
| ------ | ------------------------------------------------------------------- | ----------------------------------------- |
| **21** | `authStore` & `uiStore` menganggur                                  | rendah                                    |
| **92** | Peran dibaca dari token vs database — pencabutan hak tertunda 2 jam | rendah, tapi perbaikannya butuh keputusan |

Fase yang masih bisa jalan tanpa pemilik: **F3** (audit UI — tetapi butuh sesi
login pemilik untuk alur TULIS), **F8** (jaring pengaman), **F12** (desain).

⚠️ **F8 punya sasaran terukur sekarang** (§19.30–§19.31): bukan "tambah test",
melainkan **naikkan cakupan CABANG `AppContainer`** — 8,26% saat ini. Empat test
menaikkannya 0,07 poin, jadi §19.31 menyimpulkan komponennya perlu dipecah lebih
dulu. **Itu menggeser sebagian F10 ke depan F8 dan perlu keputusan Anda.**

#### Yang menahan, berurutan dari yang paling murah bagi pemilik proyek

| #      | Yang dibutuhkan                                                                    | Membuka               |
| ------ | ---------------------------------------------------------------------------------- | --------------------- |
| **15** | Cabut 2 Google API key di Google Cloud Console — ±5 menit                          | **menutup F1**        |
| **48** | Konvensi untuk 5 pasang TABEL kembar — sebaiknya ikut ketetapan camelCase (§19.38) | F9                    |
| **77** | exceljs: turunkan · ganti pustaka · terima risiko                                  | F8                    |
| **30** | Konfirmasi D1b & D3b (§11.1)                                                       | **F11 — jalur rilis** |

_(Catatan: #46 dan #92 telah diselesaikan pada 17 Agu 2026)_

**#15 paling murah dan satu-satunya yang menutup sebuah fase.**

⚠️ **#15 TIDAK boleh ditandai selesai tanpa pernyataan pemilik proyek.**
Ia hanya bisa dikerjakan di Google Cloud Console; menandainya atas dasar
"sudah diminta" adalah persis kegagalan §13.14.

#### F6 masih DITAHAN

Atas keputusan pemilik proyek 16 Agu 2026: menunggu domain email disiapkan
lebih dulu.

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

Urutan saran setelah domain siap: **F6.2** fondasi `email.service.ts` →
**F6.3** email selamat datang (#26).

⚠️ **Dua hal yang WAJIB beres sebelum production** (sesudah #46 selesai 17 Agu 2026), semuanya menunggu
keputusan pemilik proyek:

| #   | Hal                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Akibat bila terlewat                                                                                            |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 30  | Storage drive-per-user (F11)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Berkas unggahan hilang tiap deploy di Vercel. Driver `s3` (#2) DITAHAN 16 Agu 2026 — jalan rilis kini lewat F11 |
| 135 | **Dwibahasa fase 2** — seluruh UI ikut tombol bahasa, kecuali data dari basis data. 410 string Inggris di 73 berkas, ditambah teks Indonesia yang juga harus dipindah ke kamus. Progres: Catatan Rapat, Dokumentasi, dan Diagram Alur TUNTAS sampai CRUD, modal, dan detailnya (diperiksa ulang atas temuan pemilik proyek). Dashboard, Tim, Manajemen Pengguna, Daftar Isu, Detail Pengguna juga terverifikasi dua arah; Papan Kanban, Diagram Alur, Detail Isu, Perencanaan & Sprint, dan Peta Jalan juga tuntas. SELURUH popup konfirmasi/sukses aplikasi ikut tombol bahasa lewat i18n.t() di src/lib/sweetalert.ts. Setup test jsdom kini memuat konfigurasi i18n (tanpa itu t() memulangkan nama kunci di semua test render). Master Data, Modal Tugas Baru, dan Tabel Kasus Uji QA sudah dipindah tapi BELUM terlihat di layar — ketiganya butuh data atau interaksi yang belum ada di lingkungan uji. Sisanya belum | **F12**                                                                                                         | 🟡  | Tinggi | Tidak | `BELUM` | §12 |
| 44  | Domain email belum terverifikasi                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Email tidak sampai ke user, gagal senyap                                                                        |
| 15  | Dua Google API key lama belum dicabut                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | **±5 menit kerja Anda, nol kode.** ROI tertinggi di seluruh papan (F1)                                          |

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
9. **TANPA HARDCODE — semuanya berparameter dari Master Data.** Ketetapan
   pemilik proyek 16 Agu 2026. Daftar peran, status, prioritas, departemen,
   jabatan, dan sejenisnya TIDAK BOLEH ditulis sebagai `<option>` di kode; ia
   dibaca dari `MasterData`. Yang disimpan ke database adalah **`code`**, bukan
   `label`, supaya mengganti nama tampilan tidak merusak otorisasi. Lihat #82
   dan `src/lib/roleCatalog.ts`.

### 0.6 Jebakan teknis khas repo ini

| Jebakan                               | Akibat bila terlewat                                                                                                                                                                                                                             |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Cek rute lewat status **401**         | TIDAK VALID — auth berjalan sebelum handler 404, rute palsu pun menjawab 401. Pakai perbandingan **himpunan rute**                                                                                                                               |
| Menghitung **total** error `tsc`      | Pakai `diff` baris-per-baris; sudah **5×** menangkap simbol terlewat                                                                                                                                                                             |
| `tsconfig.json` **tanpa `strict`**    | Penyempitan tipe lewat diskriminan **boolean** tidak bekerja. Pakai diskriminan **string** (`{hasil: "berhasil"} \| {hasil: "gagal"}`)                                                                                                           |
| Migrasi otomatis saat boot            | Hanya mencatat **warning** bila gagal. Pernah timeout dan tabel tidak terbentuk sementara server menyala seolah sehat — **verifikasi ke `information_schema`**                                                                                   |
| Kunci token localStorage              | **`lanpro_jwt_token`**, bukan `'token'`                                                                                                                                                                                                          |
| Console peramban saat HMR             | Vite menyisakan error dari versi berkas yang sedang diedit. **Verifikasi di tab bersih**, bukan setelah hot-reload                                                                                                                               |
| Menambah test                         | Periksa jumlahnya benar-benar bertambah — Prettier pernah membuat penyisipan gagal diam-diam                                                                                                                                                     |
| Nama kolom **terlipat huruf kecil**   | Identifier tanpa kutip dilipat PostgreSQL. Satu tabel bisa memuat TIGA gaya sekaligus (`pointid` · `"userId"` · `point_id`). `SELECT *` mengembalikannya apa adanya, dan frontend yang membaca camelCase diam-diam mendapat `undefined` (§19.39) |
| SQL di dalam template literal         | **Backtick di dalam komentar SQL pun memecah berkasnya.** Tertangkap `tsc`, tetapi mudah membingungkan                                                                                                                                           |
| Bukti NEGATIF dari keluaran tersaring | `grep` atas berkas yang SUDAH difilter selalu menemukan nol, dan nol itu terbaca seperti "bersih" (§19.35)                                                                                                                                       |
| Item yang tampak gugur sendiri        | Kode lamanya pensiun ≠ cacatnya hilang. #54 sudah tersalin ke penjaga baru tanpa ada test yang menangkapnya (§19.32)                                                                                                                             |
| Test himpunan dari daftar PENJAGA     | Ia tidak akan pernah menemukan rute yang **tidak punya** penjaga. Butuh pendataan dari daftar RUTE (§19.41)                                                                                                                                      |
| Cek tabel lewat `information_schema`  | Adaptor MENCEGAT kueri itu dan mengembalikan `{tableName, rowCount, sizeBytes}` — BUKAN `table_name`. Memakai `table_name` menghasilkan `undefined` untuk SEMUA baris (#78)                                                                      |

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
| `DITAHAN`  | Sengaja tidak dikerjakan, alasannya wajib ditulis |
| `MENUNGGU` | Terblokir oleh keputusan/aksi pemilik proyek      |

### Arti severity

| Severity | Arti                                                                 |
| -------- | -------------------------------------------------------------------- |
| 🔴       | Menghambat production ATAU membuat biaya penambahan modul naik terus |
| 🟠       | Utang nyata, belum menghambat, tapi makin mahal bila ditunda         |
| 🟡       | Kerapian & konsolidasi                                               |

---

## §1 PAPAN PRIORITAS — 2 BELUM · 126 SELESAI · 3 ditahan/dibatalkan

Tidak ada item yang berada di luar fase. Bila muncul temuan baru, ia **wajib**
diberi nomor dan dimasukkan ke salah satu fase — bukan ditulis sebagai catatan
lepas. Catatan lepas selalu terlupakan.

Dipisah 16 Agu 2026 atas permintaan pemilik proyek. Satu tabel berisi 90 baris
bercampur membuat pertanyaan paling sering — _apa yang belum?_ — hanya bisa
dijawab dengan membaca seluruhnya. Urutan bagiannya disengaja: **yang belum
dikerjakan lebih dulu**, sebab itu yang dicari saat membuka dokumen ini.

### 1.1 BELUM SELESAI — 3 item

**Sebaran per fase:** F1 0 · F2 0 · F3 0 · F5 0 · F6 0 · F7 0 · F8 0 · F9 0 · F10 0 · F11 1 · F12 2

**Masih menahan rilis production:** #30

| #   | Temuan                                                                                                                                                                                                                                                                                                            |  Fase   | Sev | Biaya  | Blokir modul baru? | Status            | Detail |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-----: | :-: | ------ | :----------------: | ----------------- | ------ |
| 30  | **Drive-per-user** — kini ARAH RESMI storage, menggantikan driver `s3` (#2)                                                                                                                                                                                                                                       | **F11** | 🔴  | Tinggi | Blokir production  | `MENUNGGU` desain | §1.5   |
| 135 | **Dwibahasa fase 2** — seluruh UI ikut tombol bahasa, kecuali data dari basis data. 410 string Inggris di 73 berkas, ditambah teks Indonesia yang juga harus dipindah ke kamus. Progres: halaman Tim selesai (17 string). Sisanya belum                                                                           | **F12** | 🟡  | Tinggi |       Tidak        | `BELUM`           | §12    |
| 137 | **`KpiMetricsRow.tsx` adalah kode mati** — tidak diimpor dari mana pun, tetapi masih menyimpan 5 string Inggris (`Stable`, `Issues`, `Stoppers`, `pts/spr`, `Users`) yang muncul di setiap penyisiran dwibahasa dan harus dilewati manual tiap kali. Hapus, atau sambungkan bila memang masih dimaksudkan dipakai | **F12** | 🟢  | Rendah |       Tidak        | `BELUM`           | §12    |

### 1.2 SUDAH SELESAI — 138 item

Disimpan, tidak dihapus: §10 mencatat bahwa riwayat perbaikan berulang kali
jadi satu-satunya bukti kenapa sebuah keputusan diambil.

| #   | Temuan                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |   Fase   | Sev | Biaya         |   Blokir modul baru?   | Status           | Detail |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------: | :-: | ------------- | :--------------------: | ---------------- | ------ |
| 144 | ~~Kategori flowchart tidak pernah tersimpan dan daftarnya beda sendiri~~ kolom `category` ditambahkan ke tabel Documents — sebelumnya kolom `type` dipakai ganda (penanda 'flowchart' untuk diagram, kategori untuk dokumen wiki) sehingga kategori flowchart tidak punya tempat. `toFlowchartData` tidak lagi mengeraskan 'Panduan'; kosong dibiarkan kosong agar 'memang Panduan' bisa dibedakan dari 'belum pernah tersimpan'. Daftar pilihannya disatukan ke `jenis_dokumen` lewat `useMasterOptions`, sumber yang sama dengan modal Dokumentasi: 9 pilihan di kedua tempat. Terverifikasi dengan cache localStorage DIKOSONGKAN, sehingga nilainya murni dari server                                                                                                                                                                                                  |  **F3**  | 🟡  | Sedang        |         Tidak          | `SELESAI` 23 Agu | §14    |
| 142 | ~~`FlowchartContainer.render.test.tsx` flaky karena timeout~~ suite ini me-mount komponen ±3.700 baris empat kali; diukur sendirian 5,3 detik untuk seluruh suite, jadi bawaan Jest 5 detik PER TEST terlalu tipis begitu 71 suite berebut CPU. Anggarannya dinaikkan ke 30 detik khusus berkas ini (±6x waktu solo) — tetap berbatas agar komponen yang benar-benar menggantung masih gagal. KOREKSI atas deskripsi awal item ini: peringatan `worker failed to exit gracefully` bukan sebab terpisah melainkan AKIBAT timeout-nya; `--detectOpenHandles` pada suite ini sendirian maupun seluruh 71 suite tidak melaporkan satu pun handle bocor. CATATAN JUJUR: kegagalannya TIDAK berhasil direproduksi sesuai permintaan meski dicoba di bawah beban 16 proses CPU plus build dan tsc bersamaan, jadi ini mitigasi berdasar pengukuran, BUKAN perbaikan yang terbukti |  **F7**  | 🟡  | Sedang        |         Tidak          | `SELESAI` 23 Agu | §12    |
| 143 | ~~Panel Master Data tidak pernah mengisi `code`~~ INSERT kini menyertakan `code`; nilainya diambil dari body bila dikirim, selain itu diturunkan dari label. Aturan penurunannya dipindah ke `server/lib/kode-master.cjs` dan DIPAKAI BERSAMA penyemai — sebelumnya penyemai punya salinannya sendiri, pola kembar yang sama seperti SIT/UAT/PTR di #140. Ditambah `findCodesByType` untuk mencegah dua label meluruh ke kode sama, karena tabel MasterData tidak punya batasan UNIQUE. Impor statis, bukan `require`: proyek ini ESM dan `require` di berkas TS akan melempar saat server jalan — diverifikasi memuat di runtime tsx DAN di bundel esbuild CJS                                                                                                                                                                                                            |  **F3**  | 🟡  | Rendah        |         Tidak          | `SELESAI` 23 Agu | §14    |
| 141 | ~~`npm run db:seed-master` berhenti di tengah jalan~~ blok migrasi #85 merujuk kolom `"Tasks"."issue_type"` yang TIDAK PERNAH ADA di skema — Tasks menyimpan jenis pekerjaan di kolom `type`. Penyemai karena itu belum pernah tuntas sejak #85 ditulis, dan dua blok sesudahnya tidak pernah berjalan sekali pun. Blok itu kini DILEWATI bila kolomnya tidak ada, bukan ditebak maksudnya: menulis ulang `issue_type` jadi `type` akan mengubah data, dan tidak ada yang perlu diubah (seluruh Tasks.category NULL). Ditambah blok penurun kode susulan dari label untuk baris di luar katalog. Hasil: 20 tipe seluruhnya OK, tanpa satu pun SISA, idempoten                                                                                                                                                                                                              |  **F3**  | 🟡  | Rendah        |         Tidak          | `SELESAI` 23 Agu | §14    |
| 140 | ~~Fase QA, status sprint, dan level task dikeraskan di 6 tempat~~ enam titik disambungkan ke MasterData lewat satu hook bersama `useMasterOptions` yang membaca store, bukan lewat prop — tiga komponen (AddSuiteModal, EditSprintModal, NewSprintModal) selama ini tidak menerima `masterData` sama sekali. SIT/UAT/PTR yang dulu kembar di dua berkas kini satu sumber. Semua titik punya cadangan bila MasterData belum tersemai; dropdown kosong lebih buruk daripada daftar keras. 9 kunci i18n yatim dihapus. Level task dan kategori status SENGAJA tetap keras: keduanya metadata tentang struktur MasterData itu sendiri                                                                                                                                                                                                                                          |  **F3**  | 🟢  | Sedang        |         Tidak          | `SELESAI` 23 Agu | §14    |
| 139 | ~~Field Resolution tidak bisa disimpan sama sekali~~ kegagalannya berlapis TIGA dan menutup satu lapis saja tidak memperbaiki apa pun: (1) `validasiBody` mengganti `req.body` dengan hasil parse zod, jadi field di luar skema dibuang sebelum rute melihatnya; (2) rute memakai allowlist eksplisit `checkUpdate`; (3) kolom `resolution`/`release`/`category` tidak ada di tabel Tasks. Ketiganya dibereskan untuk lima field: resolution, release, category, environment, projectRisk. Kolom `category` ditambahkan sebagai AREA TEKNIS sesuai #85, bukan duplikat `issue_type`. Terverifikasi menulis lewat repository: kelimanya tersimpan, nilai uji dipulihkan                                                                                                                                                                                                     |  **F3**  | 🟡  | Sedang        |         Tidak          | `SELESAI` 23 Agu | §14    |
| 138 | ~~`project_status` dan `methodology` tidak punya dropdown~~ Ubah Proyek kini membaca keduanya dari MasterData, sehingga `Planning` dan `Cancelled` bisa dipilih dan `Archived` (yang tidak ada di MasterData) hilang. Metodologi disimpan ke kolom `Projects.category` yang MEMANG sudah berisi nilai metodologi — tidak perlu kolom baru. `handleUpdateProject` kini mengirim `category`; tanpa itu dropdown tampil tapi tidak pernah tersimpan. Union `status` di tipe Project dilonggarkan jadi string karena ia salinan kedua dari daftar keras yang sama                                                                                                                                                                                                                                                                                                              |  **F3**  | 🟡  | Sedang        |         Tidak          | `SELESAI` 23 Agu | §14    |
| 136 | ~~JSON kanvas bocor sebagai subjudul di daftar Dokumentasi~~ payload `{nodes,edges}` dipindah dari kolom `description` ke kolom `canvasData` sendiri (migrasi idempoten di `pg-migrate.ts`, backfill hanya menyentuh baris `type='flowchart'` yang description-nya benar-benar payload). `description` kembali jadi deskripsi manusia dan kini IKUT DISIMPAN — sebelumnya selalu tertimpa payload, jadi apa pun yang diketik pengguna terbuang diam-diam. Pembacaan menyimpan cadangan ke `description` untuk baris yang belum tersentuh migrasi                                                                                                                                                                                                                                                                                                                           | **F12**  | 🟡  | Sedang        |         Tidak          | `SELESAI` 22 Agu | §12    |
| 1   | ~~Tiga sistem migrasi DB~~ disatukan jadi satu                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |  **F0**  | 🔴  | Rendah        |           Ya           | `SELESAI` 16 Agu | §4     |
| 3   | ~~Nol code splitting~~ 901 -> 420 KB gzip, 29 chunk                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |  **F4**  | 🔴  | Rendah        |           Ya           | `SELESAI` 16 Agu | §5     |
| 4   | ~~±100 endpoint tanpa validasi skema~~ validasi Zod terpusat di `server/middleware/validate.ts` + `schemas/`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |  **F7**  | 🔴  | Sedang        |     Ya (keamanan)      | `SELESAI` 18 Agu | §3     |
| 5   | ~~Routing palsu + 47 props di satu persimpangan~~ URL history sync, deep-link, browser popstate & perampingan `AppRoutesProps`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | **F10**  | 🔴  | Tinggi        |           Ya           | `SELESAI` 20 Agu | §5     |
| 6   | ~~222 query SQL di lapisan rute~~ dienkapsulasi ke 17 Repository di `server/repositories/`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |  **F9**  | 🟠  | Tinggi        |           Ya           | `SELESAI` 20 Agu | §3     |
| 7   | ~~59% baris kode di 37 berkas > 500 baris~~ Shapes (2k->157), TaskDetailModal (1.6k->491), IssueListView (2k->487), AppContainer 5 modal diekstrak                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | **F10**  | 🟠  | Tinggi        |           Ya           | `SELESAI` 20 Agu | §2     |
| 8   | ~~1.290 `any` melemahkan jaring tipe~~ pengetatan tipe `AuthenticatedRequest`, `Project`, `Task`, `User` di rute dan routes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |  **F8**  | 🟠  | Sedang        |           Ya           | `SELESAI` 18 Agu | §7     |
| 9   | ~~Rasio test 1:208~~ test harness & branch coverage `AppContainer` 8,46% -> 12,28% (6 suite, 20 test)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |  **F8**  | 🟠  | Tinggi        |           Ya           | `SELESAI` 20 Agu | §7     |
| 10  | ~~Schema DB tidak terdokumentasi~~ `docs/DATABASE_SCHEMA.md` dari DB hidup                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |  **F0**  | 🟠  | Sedang        |           Ya           | `SELESAI` 16 Agu | §4     |
| 11  | ~~`auth` 762 baris tanpa lapisan~~ dipecah                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | **F5.2** | 🟠  | Rendah        |         Tidak          | `SELESAI` 15 Agu | §2     |
| 12  | ~~ARCHITECTURE.md drift~~ angka diukur ulang                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |  **F0**  | 🟡  | Rendah        |    Ya (menyesatkan)    | `SELESAI` 16 Agu | §8     |
| 13  | ~~28 berkas `dark:` + 48 hex di luar token~~ dimigrasikan ke token semantik CSS                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | **F12**  | 🟡  | Sedang        |         Tidak          | `SELESAI` 16 Agu | §8     |
| 14  | ~~Kontras sidebar & jarak target sentuh~~ migrasi token inverse & target sentuh standar min 36-44px                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | **F12**  | 🟠  | Sedang        |         Tidak          | `SELESAI` 16 Agu | §8     |
| 15  | ~~Dua Google API key lama belum dicabut~~ terverifikasi 0 API key di Google Cloud Console                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |  **F1**  | 🔴  | Rendah        |         Tidak          | `SELESAI` 17 Agu | §6     |
| 16  | ~~Logika aplikasi belum pernah diaudit~~ audit logika kalkulasi analitik, KPI, workload, burndown + unit test                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |  **F2**  | 🔴  | Sedang        |           Ya           | `SELESAI` 18 Agu | §13    |
| 19  | ~~`POST /api/db-query` tanpa penjaga read-only~~ ditegakkan read-only (SELECT/SHOW/DESCRIBE)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |  **F2**  | 🔴  | Rendah        |         Tidak          | `SELESAI` 17 Agu | §6.3   |
| 22  | ~~`initWhatsAppScheduler` tak pernah dipanggil~~ kini menyala                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | **F6.1** | 🔴  | Sangat rendah |         Tidak          | `SELESAI` 16 Agu | §1.5   |
| 23  | ~~Fallback token WhatsApp ter-hardcode~~ dibuang                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | **F6.1** | 🔴  | Sangat rendah |         Tidak          | `SELESAI` 16 Agu | §1.5   |
| 24  | ~~`EmailConfigForm` nol panggilan API~~ ditelusuri: TIDAK ada backend email                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | **F6.1** | 🟡  | Rendah        |         Tidak          | `SELESAI` 16 Agu | §1.5   |
| 25  | ~~Fondasi `email.service.ts`~~ dibangun berbasis Resend REST API + 15 unit test                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | **F6.2** | 🟢  | Sedang        |         Tidak          | `SELESAI` 18 Agu | §1.5   |
| 26  | ~~Email selamat datang~~ dikirim asinkron saat daftar manual & SSO + 18 test                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | **F6.3** | 🟢  | Rendah        |         Tidak          | `SELESAI` 18 Agu | §1.5   |
| 29  | **SSO Google/Microsoft** (poin 1)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |  **F5**  | 🟢  | Tinggi        |         Tidak          | `SELESAI` 15 Agu | §1.5   |
| 32  | **Daftar dengan Google/Microsoft** — akun otomatis, status `pending`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |  **F5**  | 🟢  | Sedang        |         Tidak          | `SELESAI` 15 Agu | §1.5   |
| 33  | ~~`getJwtSecret` di `middleware/auth.ts` menarik adapter DB~~ dipindah ke `helpers/`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | **F5.3** | 🟠  | Sangat rendah |         Tidak          | `SELESAI` 15 Agu | §1.5   |
| 34  | ~~`POST /api/projects` tanpa penjaga peran~~ kini khusus admin                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |  **F5**  | 🔴  | Rendah        |         Tidak          | `SELESAI` 16 Agu | §0.3   |
| 35  | ~~Tombol "Buat Proyek Baru" di layar kosong tanpa penjaga izin~~                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |  **F5**  | 🟠  | Sangat rendah |         Tidak          | `SELESAI` 16 Agu | §0.3   |
| 36  | ~~Ikon dialog galat memakai tong sampah~~ diganti pengguna-disilang                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |  **F5**  | 🟡  | Rendah        |         Tidak          | `SELESAI` 16 Agu | §0.3   |
| 37  | ~~`urlFrontend` memercayai `APP_URL` mentah~~ kini divalidasi                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |  **F5**  | 🟠  | Sangat rendah |         Tidak          | `SELESAI` 15 Agu | §0.3   |
| 38  | ~~`APP_URL` placeholder~~ diisi + penjaga di doctor                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |  **F0**  | 🟠  | Sangat rendah |   Ya (CORS produksi)   | `SELESAI` 16 Agu | §0.6   |
| 39  | ~~Migrasi gagal senyap~~ kini mengulang + status terbaca                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |  **F0**  | 🔴  | Rendah        |           Ya           | `SELESAI` 16 Agu | §0.6   |
| 40  | ~~`tsconfig.json` tanpa `strict`~~ `strict: true` ditegakkan, null safety & diskriminan aktif (26 tipe dibersihkan)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |  **F8**  | 🟠  | Tinggi        |           Ya           | `SELESAI` 20 Agu | §0.6   |
| 41  | ~~Identitas yatim mengunci email selamanya~~ dibersihkan + FK `ON DELETE CASCADE`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |  **F5**  | 🔴  | Rendah        |         Tidak          | `SELESAI` 16 Agu | §0.3   |
| 42  | ~~Pembuatan akun SSO menulis 2 tabel tanpa transaksi~~ kini transaksional                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |  **F5**  | 🟠  | Rendah        |         Tidak          | `SELESAI` 16 Agu | §0.3   |
| 43  | ~~Callback SSO tak menyetel `currentSessionToken`~~ — login gagal SENYAP                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |  **F5**  | 🔴  | Rendah        |         Tidak          | `SELESAI` 16 Agu | §0.3   |
| 44  | ~~Domain email belum terverifikasi~~ domain `rajonet.com` & pengirim disiapkan dan diverifikasi                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |  **F6**  | 🔴  | Rendah        |         Tidak          | `SELESAI` 18 Agu | §0.4   |
| 45  | ~~Form email di Settings dekoratif~~ dihubungkan ke backend Resend status & test email API + 3 test                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |  **F6**  | 🟠  | Sedang        |         Tidak          | `SELESAI` 20 Agu | §0.3   |
| 48  | ~~5 TABEL KEMBAR huruf kecil~~ dihapus, 35 tabel -> 30                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |  **F0**  | 🟠  | Rendah        |         Tidak          | `SELESAI` 16 Agu | §0.3   |
| 49  | `verifyProjectAccess(['*'])` lolos SEBELUM cek keanggotaan — bocor lintas proyek                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |  **F2**  | 🔴  | Rendah        | Ya (blokir production) | `SELESAI` 16 Agu | §13.5  |
| 50  | Socket.IO **tanpa autentikasi sama sekali** — tak ada `io.use()` handshake                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |  **F2**  | 🔴  | Sedang        | Ya (blokir production) | `SELESAI` 16 Agu | §13.5  |
| 51  | `FORCE_LOGOUT_EVENT` menyiarkan JWT sah ke SELURUH socket lewat `io.emit`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |  **F2**  | 🔴  | Sangat rendah | Ya (blokir production) | `SELESAI` 16 Agu | §13.5  |
| 52  | `/api/auth/force-logout` memeriksa password TANPA `loginLimiter` — jalur brute force                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |  **F2**  | 🔴  | Sangat rendah | Ya (blokir production) | `SELESAI` 16 Agu | §13.5  |
| 58  | `GET /metrics` terbuka TANPA autentikasi — di luar `/api/`, lolos gerbang global                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |  **F2**  | 🟠  | Sangat rendah | Ya (blokir production) | `SELESAI` 16 Agu | §13.6  |
| 59  | `presence_sync` menyiarkan profil LENGKAP + matriks permission ke klien mana pun                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |  **F2**  | 🔴  | Sangat rendah | Ya (blokir production) | `SELESAI` 16 Agu | §13.6  |
| 60  | `POST .../tasks` buka transaksi tanpa `ROLLBACK` — koneksi balik ke pool masih terbuka                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |  **F2**  | 🔴  | Rendah        | Ya (blokir production) | `SELESAI` 16 Agu | §13.8  |
| 61  | Transaksi `POST .../tasks` hanya melingkupi penghitung, bukan INSERT task-nya                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |  **F2**  | 🟠  | Rendah        |         Tidak          | `SELESAI` 16 Agu | §13.8  |
| 62  | Hapus proyek memakai kode galat MySQL; di Postgres `continue` dalam transaksi mustahil                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |  **F2**  | 🟡  | Rendah        |         Tidak          | `SELESAI` 16 Agu | §13.8  |
| 63  | Register menelan `ER_DUP_ENTRY` (MySQL) — di Postgres jadi 500, bukan pesan yang benar                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |  **F2**  | 🟡  | Sangat rendah |         Tidak          | `SELESAI` 16 Agu | §13.8  |
| 64  | `tasks/reorder` melepas koneksi dua kali bila galat terjadi setelah `commit`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |  **F2**  | 🟡  | Sangat rendah |         Tidak          | `SELESAI` 16 Agu | §13.8  |
| 65  | `affectedRows` selalu `undefined` — 3 pemeriksaan mati; penjaga jendela balapan mati                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |  **F2**  | 🔴  | Rendah        | Ya (blokir production) | `SELESAI` 16 Agu | §13.9  |
| 66  | 5 rute DELETE dijaga hanya `['*']` — anggota berperan `viewer` bisa menghapus data                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |  **F2**  | 🔴  | Rendah        | Ya (blokir production) | `SELESAI` 16 Agu | §13.9  |
| 67  | `/uploads` menyajikan SEMUA berkas gambar tanpa autentikasi — bukan hanya avatar                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |  **F2**  | 🔴  | Rendah        | Ya (blokir production) | `SELESAI` 16 Agu | §13.10 |
| 68  | `DELETE .../tasks/:taskId/links/:linkId` TANPA `verifyProjectAccess` sama sekali                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |  **F2**  | 🔴  | Sangat rendah | Ya (blokir production) | `SELESAI` 16 Agu | §13.10 |
| 73  | ~~`PUT .../dashboard-layout` korslet~~ dijaga `jagaSetelanProyek`, `"*"` dicabut                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |  **F2**  | 🟡  | Sangat rendah |         Tidak          | `SELESAI` 16 Agu | §13.11 |
| 75  | Angka §13.1 & ARCHITECTURE drift lagi: 21 `useState` aktualnya 11, 104 rute aktualnya 119                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |  **F0**  | 🟡  | Sangat rendah |         Tidak          | `SELESAI` 16 Agu | §13.12 |
| 78  | Kode menulis ke tabel `TaskAttachments` yang TIDAK ADA di DB — lampiran task selalu gagal                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |  **F2**  | 🔴  | Sangat rendah | Ya (blokir production) | `SELESAI` 16 Agu | §13.13 |
| 79  | **Migrasi ≠ database hidup**: 13 tabel drift, 54 kolom tak akan dibuat migrasi                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |  **F0**  | 🔴  | Sedang        | Ya (blokir production) | `SELESAI` 16 Agu | §13.14 |
| 80  | ~~`POST /api/projects/generate-bni-demo` tanpa penjaga admin~~ ditutup `verifyGlobalAdmin`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |  **F2**  | 🟠  | Sangat rendah | Ya (blokir production) | `SELESAI` 16 Agu | §13.15 |
| 82  | Dropdown peran HARDCODED, tidak membaca katalog `MasterData` — duplikat & nilai bentrok                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |  **F7**  | 🔴  | Rendah        | Ya (blokir production) | `SELESAI` 16 Agu | §19.12 |
| 84  | ~~Master Data bolong & tanpa konvensi penyimpanan~~ dirapikan, semua bertipe `code`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |  **F7**  | 🟠  | Sedang        |         Tidak          | `SELESAI` 16 Agu | §19.14 |
| 88  | God Mode Administrator belum tercatat di `AuditLogs` — §19.6 aturan 2 belum penuh                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |  **F7**  | 🟠  | Rendah        |         Tidak          | `SELESAI` 16 Agu | §19.19 |
| 89  | TIGA operasi tingkat proyek tak punya modul di §19.5 — dashboard-layout, sunting, methodology                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |  **F7**  | 🟠  | Sangat rendah |         Tidak          | `SELESAI` 16 Agu | §19.21 |
| 72  | ~~16 rute POST/PUT/PATCH ber-`['*']`~~ seluruh 31 rute wildcard dijaga matriks                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |  **F2**  | 🟠  | Rendah        |         Tidak          | `SELESAI` 16 Agu | §19.21 |
| 76  | ~~Otorisasi tidak deny-by-default~~ matriks terpusat, 54/54 rute, `MODE=TOLAK`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |  **F7**  | 🔴  | Sedang        | Ya (blokir production) | `SELESAI` 16 Agu | §19.24 |
| 90  | ~~Penjaga boot mendata NOL penjaga~~ kini mengawasi penjaga matriks + kombinasi mati                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |  **F7**  | 🟠  | Sangat rendah |         Tidak          | `SELESAI` 16 Agu | §19.24 |
| 69  | ~~POST notifications tanpa cek kepemilikan~~ lubangnya `senderId` dipalsukan; dari token                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |  **F2**  | 🔴  | Sangat rendah | Ya (blokir production) | `SELESAI` 16 Agu | §13.11 |
| 70  | ~~Rute `/api/v1/meetings/:id*` tanpa penjaga proyek~~ dijaga lewat entitas rapat                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |  **F2**  | 🔴  | Rendah        | Ya (blokir production) | `SELESAI` 16 Agu | §13.11 |
| 91  | Kredensial admin ter-hardcode di frontend + peran diminta dari body saat mendaftar                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |  **F7**  | 🔴  | Rendah        | Ya (blokir production) | `SELESAI` 16 Agu | §19.27 |
| 54  | ~~identitas dari `x-user-id`/query/body~~ hanya dari token; cacat tersalin ke penjaga baru                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |  **F2**  | 🟠  | Sangat rendah |         Tidak          | `SELESAI` 16 Agu | §13.5  |
| 53  | logout menggunakan JWT; `userId` diabaikan, hanya token yang dipakai                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |  **F2**  | 🔴  | Rendah        |         Tidak          | `SELESAI` 16 Agu | §13.5  |
| 55  | ~~`rbac.ts:50` RBAC no-op senyap~~ divalidasi TIDAK tersalin ke penjaga baru bila nama param berbeda                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |  **F2**  | 🟡  | Sangat rendah |         Tidak          | `SELESAI` 16 Agu | §13.5  |
| 93  | ~~"Remember Me" hanya melupakan PROFIL~~ token kini ikut pilihan itu                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |  **F7**  | 🟠  | Rendah        |         Tidak          | `SELESAI` 16 Agu | §19.31 |
| 56  | ~~Jest mencetak crash `pg` saat dibongkar~~ fungsi murni dipisah ke helper                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |  **F8**  | 🟡  | Rendah        |         Tidak          | `SELESAI` 16 Agu | §13.5  |
| 94  | ~~4 rute komentar TANPA penjaga~~ 7 rute telanjang dijaga; test dari arah RUTE                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |  **F2**  | 🔴  | Sangat rendah | Ya (blokir production) | `SELESAI` 16 Agu | §19.40 |
| 71  | ~~`project-modules` tanpa penjaga~~ dijaga `jagaSetelanProyek` lewat entitas                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |  **F2**  | 🟠  | Sangat rendah |         Tidak          | `SELESAI` 16 Agu | §13.11 |
| 20  | ~~Kode mati DB Explorer~~ toggle mode DB, fetchDbStatus, dan servicenya dibuang                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |  **F2**  | 🟡  | Rendah        |         Tidak          | `SELESAI` 16 Agu | §6.3   |
| 57  | ~~Dua endpoint health~~ `/api/health` dibuang; `/api/health-check` pindah ke health.routes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |  **F2**  | ⚪  | Sangat rendah |         Tidak          | `SELESAI` 16 Agu | §13.6  |
| 81  | ~~`parentAdminId` ditulis tapi tidak pernah dibaca~~ berhenti ditulis; kolom menyusul                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |  **F7**  | 🟡  | Sangat rendah |         Tidak          | `SELESAI` 16 Agu | §19.2  |
| 47  | ~~kolom kembar `discussion_point_comments`~~ 11 kolom -> 6, camelCase sumber kebenaran                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |  **F9**  | 🟠  | Sedang        |         Tidak          | `SELESAI` 16 Agu | §0.3   |
| 21  | ~~`authStore` & `uiStore` menganggur~~ dibuang; hook-nya ikut                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | **F10**  | 🟡  | Rendah        |         Tidak          | `SELESAI` 16 Agu | §5.3   |
| 74  | ~~7 pengambil data tanpa penjaga respons basi~~ 4 pengambil proyek dijaga                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |  **F2**  | 🟠  | Rendah        |         Tidak          | `SELESAI` 16 Agu | §13.12 |
| 46  | ~~`SSO_ALLOWED_DOMAINS=gmail.com`~~ ditetapkan `rajonet.com,bni.co.id,gmail.com,outlook.com`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |  **F1**  | 🔴  | Sangat rendah | Ya (blokir production) | `SELESAI` 17 Agu | §0.4   |
| 92  | ~~Peran dibaca dari token vs DB~~ disinkronkan real-time di `authenticateJWT`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |  **F7**  | 🟠  | Rendah        |         Tidak          | `SELESAI` 17 Agu | §19.28 |
| 87  | ~~`effectiveRole` abai peran proyek~~ diselaraskan via `resolveProjectRole` & `can()`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |  **F7**  | 🟠  | Sedang        |         Tidak          | `SELESAI` 17 Agu | §19.27 |
| 83  | ~~Department Head & position tak fungsional~~ peran proyek `head` (akses R) diselaraskan ke matriks                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |  **F7**  | 🟠  | Rendah        |         Tidak          | `SELESAI` 17 Agu | §19.48 |
| 85  | ~~`category` memuat dua konsep~~ — duplikat `issue_type` dihapus, `category` murni area teknis                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |  **F7**  | 🟡  | Rendah        |         Tidak          | `SELESAI` 17 Agu | §19.14 |
| 86  | ~~`modul_aplikasi` punya dua sumber~~ — `ProjectModules` jadi sumber kebenaran, 4 baris dibuang                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |  **F7**  | 🟠  | Rendah        |         Tidak          | `SELESAI` 17 Agu | §19.14 |
| 77  | ~~2 kerentanan moderate tersisa~~ npm audit 0 vulnerabilities via uuid override & tsx update                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |  **F8**  | 🟠  | Sedang        |         Tidak          | `SELESAI` 20 Agu | §18.7  |
| 28  | ~~Digest task pending + jumlah~~ rekap email harian via Resend + scheduler cron 07:00 + 5 test                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |  **F6**  | 🟢  | Rendah        |         Tidak          | `SELESAI` 20 Agu | §1.5   |
| 27  | ~~Lupa password → password random~~ reset token via email Resend + modal lupa & atur ulang password + 6 test                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |  **F6**  | 🟢  | Sedang        |         Tidak          | `SELESAI` 20 Agu | §1.5   |
| 17  | ~~UI belum pernah diaudit di balik login~~ verifikasi visual 10 layar internal + direct dynamic imports                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |  **F3**  | 🔴  | Sedang        |           Ya           | `SELESAI` 20 Agu | §14    |
| 95  | ~~Modal hapus QA, Master Data & User Mgmt belum SweetAlert~~ diseragamkan ke `confirmDeleteAlert` & `showSuccessAlert` mengikuti flow Documentation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | **F12**  | 🟡  | Rendah        |         Tidak          | `SELESAI` 21 Agu | §12    |
| 96  | ~~Modal logout menampilkan animasi konfeti perayaan~~ disesuaikan ke animasi peringatan/konfirmasi standar Velzon + custom iconSrc & iconColors                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | **F12**  | 🟡  | Rendah        |         Tidak          | `SELESAI` 21 Agu | §12    |
| 97  | ~~Tombol "Task Baru" muncul di dashboard utama~~ dihapus dari toolbar atas `DashboardView` + prop dibersihkan                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | **F12**  | 🟡  | Rendah        |         Tidak          | `SELESAI` 21 Agu | §12    |
| 98  | ~~Dark mode sidebar & layout beda dengan Velzon~~ diselaraskan via token semantik `sidebar-*` (Dark Navy di Terang, Clean Dark Charcoal di Gelap) + perapian menu                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | **F12**  | 🟡  | Rendah        |         Tidak          | `SELESAI` 21 Agu | §22    |
| 99  | ~~Pengubah tema di header berupa dropdown 2-klik~~ disederhanakan jadi tombol toggle langsung 1-klik (Moon/Sun) sesuai standar Velzon                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | **F12**  | 🟡  | Rendah        |         Tidak          | `SELESAI` 21 Agu | §12    |
| 100 | ~~Kontras card Stoppers/Blocked di dashboard silau/rusak di mode gelap~~ inline style hardcoded dihapus & diselaraskan ke token semantik `bg-surface`, `danger-*`, `warning-*`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | **F12**  | 🟡  | Rendah        |         Tidak          | `SELESAI` 21 Agu | §12    |
| 103 | ~~Token aksen `-text` ditulis di dalam `@theme` di atas nilai mode terang~~ dipindah ke `html.dark` sehingga versi gelapnya berlaku; badge sprint aktif 2,15 → 5,78                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | **F12**  | 🟠  | Rendah        |         Tidak          | `SELESAI` 21 Agu | §19.50 |
| 104 | ~~Pemindai kontras §21.3 mengarang tabrakan~~ `rgb()` memakai canvas 1×1 tanpa `clearRect`, warna beralpha menumpuk hingga `bgOf` menerima lapisan transparan sebagai latar pekat                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | **F12**  | 🔴  | Sangat rendah |         Tidak          | `SELESAI` 21 Agu | §21.3  |
| 105 | ~~Kartu KPI dashboard menampilkan panah tren NAIK saat delta nol~~ ikon jadi netral (`Minus`) dan tanda `+` disembunyikan saat 0%; warna `content-muted`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |  **F3**  | 🟡  | Sangat rendah |         Tidak          | `SELESAI` 21 Agu | §14    |
| 113 | ~~Tombol "Kirim Tautan" menyebut mekanisme yang tidak ada~~ jadi "Kirim Kata Sandi Baru", selaras dengan isi modal dan `auth.routes.ts:441` yang memang mengirim kata sandi                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |  **F6**  | 🟠  | Sangat rendah |         Tidak          | `SELESAI` 21 Agu | §12    |
| 117 | ~~Sumbu Y chart memakai pecahan untuk satuan cacahan~~ `allowDecimals={false}` pada dua chart dashboard; sumbu sprint 0/0,25/0,5/0,75/1 → 0/1/2/3/4                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |  **F3**  | 🟡  | Rendah        |         Tidak          | `SELESAI` 21 Agu | §14    |
| 111 | ~~Kartu Blocked/Stoppers mewarnai nilai `0` MERAH~~ merah hanya bila ada yang tersumbat; `text-rose-600` → token `danger-text` (6,47 terang · 7,12 gelap)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | **F12**  | 🟠  | Rendah        |         Tidak          | `SELESAI` 21 Agu | §14    |
| 114 | ~~Campur bahasa DI DALAM satu label dashboard~~ 4 label KPI, ringkasan Stoppers, dropdown sprint, sapaan, dan judul sidebar diseragamkan ke bahasa Indonesia                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |  **F3**  | 🟡  | Sedang        |         Tidak          | `SELESAI` 21 Agu | §14    |
| 106 | ~~Pemindai §21.3 mengukur di TENGAH transisi~~ jeda 400ms sesudah tiap pergantian tema, tema dikembalikan ke keadaan semula, deteksi `masuk` pindah ke token (regex lama rusak oleh #101)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | **F12**  | 🔴  | Sangat rendah |         Tidak          | `SELESAI` 21 Agu | §21.3  |
| 107 | ~~`bgOf` buta terhadap panel gradasi~~ membaca `background-image` dan memakai rata-rata perhentian gradasi sebagai perkiraan latar                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | **F12**  | 🟠  | Rendah        |         Tidak          | `SELESAI` 21 Agu | §21.3  |
| 108 | ~~Token `content-subtle` 2,56:1 di mode terang~~ `#94a3b8` → `#64748b` (4,76:1, lolos AA); 641 pemakaian ikut terbawa sekaligus                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | **F12**  | 🔴  | Tinggi        |         Tidak          | `SELESAI` 21 Agu | §21.4  |
| 109 | ~~Mode terang lebih buruk daripada mode gelap~~ tertutup oleh #108; terukur 44 → 12 di mode terang, keadaannya kini terbalik                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | **F12**  | 🟠  | Tinggi        |         Tidak          | `SELESAI` 21 Agu | §21.4  |
| 110 | ~~Panel merek layar auth membalik jadi lebih terang di mode gelap~~ gradasi pindah ke peran `-surface` yang mode-stabil; token `primary-surface-active` ditambahkan supaya tampilan mode terang tidak berubah                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | **F12**  | 🟠  | Sedang        |         Tidak          | `SELESAI` 21 Agu | §22.3  |
| 124 | ~~`bgOf` melewati lapisan semi-transparan~~ lapisan beralpha kini dikomposisikan ke latar pekat di bawahnya; tombol nonaktif 1,00 → 2,90 sesuai catatan §21.4                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | **F12**  | 🟠  | Rendah        |         Tidak          | `SELESAI` 21 Agu | §21.3  |
| 112 | ~~Dashboard menampilkan dua populasi angka sekaligus~~ judul breakdown menjumlahkan isinya; terverifikasi "12 Total" di atas daftar berjumlah 12                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |  **F2**  | 🔴  | Sedang        |         Tidak          | `SELESAI` 21 Agu | §13    |
| 120 | ~~Emoji dipakai sebagai elemen antarmuka~~ empat lencana beban kerja memakai ikon lucide; terverifikasi nol emoji tersisa di layar                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |  **F3**  | 🟢  | Sangat rendah |         Tidak          | `SELESAI` 21 Agu | §14    |
| 122 | ~~Avatar 404 berulang di konsol~~ kegagalan diingat lintas instance; terverifikasi 5+ permintaan → 1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |  **F5**  | 🟡  | Sangat rendah |         Tidak          | `SELESAI` 21 Agu | §5     |
| 123 | ~~Mode gelap tertinggal, 32 temuan kontras~~ `indigo-600`/`blue-600`/`emerald-600` di dashboard dipindah ke token `primary`/`info-text`/`success-text`; gelap 32 → 26, terang 13 → 8                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | **F12**  | 🟠  | Sedang        |         Tidak          | `SELESAI` 21 Agu | §21.4  |
| 125 | ~~Inisial avatar terbaca 1,85 di mode gelap~~ palet pindah ke latar PEKAT `-700` dengan teks `content-inverse` (#ffffff di kedua mode); 8 warna terukur 5,02–7,90                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | **F12**  | 🟠  | Rendah        |         Tidak          | `SELESAI` 21 Agu | §14    |
| 126 | ~~Legenda chart terbaca 2,54 di kedua mode~~ hanya TEKS-nya dipaksa ke `content-body` lewat `formatter`; kotak penanda tetap warna seri, palet DATA tidak disentuh (§22.5)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |  **F3**  | 🟡  | Rendah        |         Tidak          | `SELESAI` 21 Agu | §22.5  |
| 131 | ~~§1.5 PETA FASE menyimpan status usang~~ 9 dari 13 fase diselaraskan dengan §1.2; hanya F11 (#30) yang benar-benar masih terbuka                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |  **F0**  | 🟡  | Sangat rendah |         Tidak          | `SELESAI` 21 Agu | §1.5   |
| 132 | ~~Sisa teks Inggris di menu sidebar dan sub-teks kartu dashboard~~ 17 label sidebar (termasuk salah ketik `DB EXplorer` dan kapitalisasi `Kanban board`/`User management`/`Setting integration`), 8 sub-teks kartu, 6 pesan keadaan kosong, dan lencana `New` diterjemahkan. `Dashboard`, `Sprint`, `Kanban`, `Master Data` sengaja dipertahankan                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | **F12**  | 🟡  | Rendah        |         Tidak          | `SELESAI` 22 Agu | §12    |
| 133 | ~~Teks Inggris tersisa di dashboard dan 11 halaman lain~~ sisa dashboard (`Tasks Dibuat/Selesai`, `tasks)`, `pts/sprint`, `Progress`, `Filter`, tombol `ALL`), judul halaman administrasi yang timpang dengan sidebar (`User Management`, `Database Tools`, `Enterprise Control Center`), 30 label+deskripsi modul & peran, 15 label kolom Daftar Isu, serta judul Tim/Kanban/Sprint/QA/Roadmap/Pengaturan                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | **F12**  | 🟡  | Sedang        |         Tidak          | `SELESAI` 22 Agu | §12    |
| 134 | **Dwibahasa Indonesia/Inggris** — fondasi i18next, Context bahasa tersimpan di localStorage, tombol bendera 1-klik di header, dan sidebar + kartu KPI + widget dashboard dipindah ke kamus `id`/`en`. Locale `en` dipanen dari git history sebelum #132/#133. **Fase 1 dari beberapa** — halaman lain (~410 string di 75 berkas) belum dipindah dan masih Indonesia di kedua mode                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | **F12**  | 🟡  | Tinggi        |         Tidak          | `SELESAI` 22 Agu | §12    |
| 127 | ~~REGRESI #44 — domain Resend tidak terverifikasi~~ penjaga `doctor` 6b menanyakan status domain langsung ke Resend; **DNS-nya sendiri masih `failed` dan menunggu tindakan pemilik proyek**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |  **F6**  | 🟠  | Sangat rendah |         Tidak          | `SELESAI` 21 Agu | §0.4   |
| 128 | ~~`avatar_url` yatim di basis data~~ `db:bersihkan-avatar-yatim` (uji-coba bawaan); 2 rujukan dikosongkan, tersisa 0                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |  **F5**  | 🟡  | Rendah        |         Tidak          | `SELESAI` 21 Agu | §5     |
| 129 | ~~Kartu KPI menulis `3` sementara dropdown dan kedua kartu Rincian menulis `12`, dan KPI menulis `3 In Progress` sementara breakdown menulis `In Progress 0`~~ diukur: bedanya **Epic**, bukan sprint aktif — kartu KPI memakai `nonEpicTasks`, dropdown/Rincian memakai `tasks`. Diberi label "Epic tidak dihitung", dan sub-teks `inProgressTasks` (= semua BELUM SELESAI) tidak lagi dinamai "In Progress"                                                                                                                                                                                                                                                                                                                                                                                                                                                              |  **F3**  | 🟠  | Rendah        |         Tidak          | `SELESAI` 22 Agu | §13    |
| 130 | ~~Tautan aksi dashboard masih berbahasa Inggris~~ 26 label antarmuka diterjemahkan; nilai status/tipe/prioritas TIDAK disentuh karena berasal dari MasterData (§3)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |  **F3**  | 🟡  | Sedang        |         Tidak          | `SELESAI` 21 Agu | §14    |
| 121 | ~~`forgot-password` membocorkan keberadaan email dan mereset kata sandi tanpa autentikasi~~ balasan netral identik untuk terdaftar/tidak, dan kini mengirim TAUTAN bertoken 15 menit alih-alih menimpa kata sandi                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |  **F2**  | 🔴  | Rendah        |     Ya (keamanan)      | `SELESAI` 21 Agu | §6     |
| 119 | ~~Ornamen rangka putus-putus di latar layar auth~~ `AuthWatermarkPattern` dihapus beserta berkasnya; sisi form kini hanya memuat kartu masuk                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |  **F3**  | 🟢  | Sangat rendah |         Tidak          | `SELESAI` 21 Agu | §14    |
| 115 | ~~Tiga kontrol layar masuk di bawah rentang sentuh #14~~ `py-2.5 -my-2.5`; terukur 36px tanpa menggeser tata letak                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | **F12**  | 🟡  | Rendah        |         Tidak          | `SELESAI` 21 Agu | §14    |
| 116 | ~~Panel merek hilang di 768–1023px~~ breakpoint turun ke `md`; diverifikasi di 375/768/1024/1440 tanpa scroll horizontal                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |  **F3**  | 🟡  | Rendah        |         Tidak          | `SELESAI` 21 Agu | §14    |
| 118 | ~~Placeholder kata sandi berupa karakter bulatan~~ diganti teks bermakna di 7 tempat (4 layar auth + 3 panel pengguna); nol bulatan tersisa                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |  **F3**  | 🟢  | Sangat rendah |         Tidak          | `SELESAI` 21 Agu | §14    |
| 101 | ~~Layar masuk & daftar mencampur label Inggris dengan kontrol Indonesia~~ seluruh teks kasat mata layar auth diterjemahkan (`LoginScreen`, `RegisterScreen`, `LoginSkeletonState`, `useAuth`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | **F12**  | 🟡  | Rendah        |         Tidak          | `SELESAI` 21 Agu | §12    |
| 102 | ~~Atribut `required` membuat validasi bawaan peramban (selalu Inggris) menyela Zod~~ `required` dilepas dari 4 input daftar sehingga pesan `registrationSchema` Indonesia yang tampil                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | **F12**  | 🟢  | Sangat rendah |         Tidak          | `SELESAI` 21 Agu | §12    |

### 1.3 DITAHAN / DIBATALKAN — 3 item

| #   | Temuan                                                                                |  Fase  | Sev | Biaya  | Blokir modul baru? | Status                   | Detail |
| --- | ------------------------------------------------------------------------------------- | :----: | :-: | ------ | :----------------: | ------------------------ | ------ |
| 2   | ~~Driver `s3` belum pernah dieksekusi~~ DITAHAN — storage beralih ke drive user (#30) | **F1** | 🔴  | Rendah | Blokir production  | `DITAHAN` 16 Agu         | §6     |
| 31  | ~~Login dengan email di kolom form~~                                                  | **—**  |  —  | —      |       Tidak        | `DIBATALKAN` 15 Agu 2026 | §1.5   |
| 18  | ~~notebook-lm rusak di dua sisi~~ DIBATALKAN — modul dibuang atas keputusan pemilik   | **F2** | 🟠  | Rendah |       Tidak        | `DIBATALKAN` 20 Agu 2026 | §6.3   |

---

## §1.4 URUTAN KERJA — termurah lebih dulu

Ketetapan pemilik proyek 16 Agu 2026: **kerjakan yang murah dulu, yang mahal
belakangan.** Bagian ini mengelompokkan §1.1 berdasarkan kolom **Biaya**, bukan
severity — sebab yang dioptimalkan di sini adalah jumlah item yang tutup per
satuan usaha.

⚠️ Severity TIDAK diabaikan; ia tetap tercantum. Bila sebuah item 🔴 muncul di
kelompok murah, ia dikerjakan lebih dulu di dalam kelompoknya.

### 1.4.1 Sangat rendah — 0 item tersisa

**#54, #55, #71, #57, #81 SELESAI 16 Agu, #46 SELESAI 17 Agu** (`rajonet.com`).

Seluruh item di kelompok sangat rendah telah selesai. Kelompok berikutnya: **§1.4.2 Rendah**.

### 1.4.2 Rendah — 16 item

| #   | Sev | Fase | Isi                                                       | Perlu pemilik? |
| --- | :-: | ---- | --------------------------------------------------------- | -------------- |
| 15  | 🔴  | F1   | Cabut 2 Google API key — **±5 menit, nol kode**           | **ya**         |
| 19  | 🔴  | F2   | `POST /api/db-query` tanpa penjaga read-only              | **ya**         |
| 53  | ✅  | F2   | `POST /api/auth/logout` tanpa auth (perbaikan selesai)    | tidak          |
| 44  | ✅  | F6   | Domain email verifikasi (`rajonet.com`, SELESAI 18 Agu)   | tidak          |
| 18  | 🟠  | F2   | notebook-lm rusak di dua sisi                             | **ya**         |
| 74  | 🟠  | F2   | 7 pengambil data tanpa penjaga respons basi               | **ya**         |
| 83  | ✅  | F7   | `head` (akses R) diselaraskan ke matriks (SELESAI 17 Agu) | tidak          |
| 86  | 🟠  | F7   | `modul_aplikasi` dua sumber                               | **ya**         |
| 92  | ✅  | F7   | Peran dari token vs database (SELESAI 17 Agu)             | tidak          |
| 93  | 🟠  | F7   | "Remember Me" tidak melupakan token                       | tidak          |
| 20  | 🟡  | F2   | Kode mati DB Explorer                                     | **ya**         |
| 21  | 🟡  | F10  | `authStore` & `uiStore` menganggur                        | tidak          |
| 56  | 🟡  | F8   | Jest mencetak crash `pg` saat dibongkar                   | tidak          |
| 85  | 🟡  | F7   | `category` memuat dua konsep                              | **ya**         |
| 26  | ✅  | F6   | Email selamat datang (SELESAI 18 Agu)                     | tidak          |
| 28  | 🟢  | F6   | Digest task pending (siap jalan, #44 & #25 selesai)       | tidak          |

**Bisa dikerjakan tanpa keputusan: #53, #93, #21, #56, #28.** #53 yang paling
mendesak — 🔴 dan tanpa penghalang.

### 1.4.3 Sedang — 12 item

Didahului yang tidak menunggu pemilik: **#8**
(1.290 `any`), **#47** (kolom kembar `discussion_point_comments`), **#87**
(frontend abai peran proyek — `SELESAI` 17 Agu), **#25** (fondasi `email.service.ts` — `SELESAI` 18 Agu), **#13**/**#14** (F12 desain).

Menunggu pemilik: #4, #16, #17, #27, **#77** (sisa exceljs — §1.4 sempat salah
menempatkannya di kelompok tanpa keputusan; papan §1 yang benar). _(#45 SELESAI 20 Agu)_

### 1.4.4 Tinggi — 5 item tersisa (#40 SELESAI 20 Agu)

#5 · #6 · #7 · #9 · #30. Kelompok ini yang membuat §19.31 menyimpulkan
jaring pengaman `AppContainer` tidak bisa dibangun sebelum komponennya dipecah.
**#30 satu-satunya penahan production di sini** dan tetap menunggu pemilik.

### Urutan yang disarankan

1. **#53** 🔴 tanpa penghalang · **#55** & **#71** sangat murah
2. **#93**, **#56**, **#21** — murah, tanpa keputusan
3. **#77** → **#47** — sedang, tanpa keputusan
4. Sisanya menunggu jawaban Anda; **#15** paling murah dan menutup F1

## §1.5 PETA FASE — panggil pekerjaan lewat nomor fase

Cukup sebut **"kerjakan F2"** dan seluruh cakupannya sudah terdefinisi di sini:
item apa saja, syarat masuk, definisi selesai, target terukur, dan gerbang keluar.

> **Diselaraskan 21 Agu 2026 (#131).** Sembilan dari tiga belas fase menyimpan
> status yang sudah usang: F1 masih `MENUNGGU`, F2 masih menuntut "9 keputusan
> pemilik", F7 "3 keputusan", dan F8/F9/F10/F12 masih `TERBUKA` — padahal
> SELURUH item di fase-fase itu sudah `SELESAI` di §1.2. Siapa pun yang membuka
> bagian ini akan mengira masih ada belasan keputusan menggantung, lalu
> menghabiskan waktu menagih jawaban yang sudah diberikan. Ini drift yang sama
> dengan #12 dan #75. **Satu-satunya fase yang benar-benar masih terbuka adalah
> F11 (#30).** Bila Anda menutup sebuah item, perbarui §1.2 DAN status fasenya
> di sini.

### Indeks cepat

|  Fase   |  Prio  | Nama                               | Item                                    | Sesi | Risiko            | Status                          | TERTAHAN OLEH APA — dan siapa yang harus bergerak                                                                                                                                                                                                         |
| :-----: | :----: | ---------------------------------- | --------------------------------------- | ---- | ----------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **F0**  |   —    | Kejelasan & fondasi dokumen        | #1, #12, #10, #38, #39, #79             | 1–2  | Sangat rendah     | `SELESAI` 16 Agu (ulang)        | — tidak ada. Gerbangnya kini PUNYA PERINTAH: `npm run db:verify-schema`, dan lulus 3× berturut-turut. Sempat dicabut hari yang sama karena ternyata tidak pernah diuji (§13.14)                                                                           |
| **F1**  | **P0** | Cabut kredensial lama              | #15 (#2 DITAHAN)                        | <1   | Sangat rendah     | `SELESAI` 21 Agu (diselaraskan) | — tidak ada. #15 terverifikasi SELESAI 17 Agu: nol API key tersisa di Google Cloud Console                                                                                                                                                                |
| **F2**  | **P0** | Audit & perbaikan LOGIKA           | #16, #18–#20, #49–#75                   | 3–5  | Rendah            | `SELESAI` 21 Agu (diselaraskan) | — tidak ada. Seluruh item F2 SELESAI; #18 DIBATALKAN atas keputusan pemilik (§1.3). Sembilan keputusan yang dulu tertulis di sini semuanya sudah dijawab                                                                                                  |
| **F3**  |   P1   | Audit UI menyeluruh                | #17                                     | 2–4  | Sangat rendah     | `SELESAI` 21 Agu (diselaraskan) | — tidak ada. #17 SELESAI 20 Agu. Audit UI dilanjutkan lewat gelombang /design-review 21 Agu (#101–#126)                                                                                                                                                   |
| **F4**  |   —    | Performa muat                      | #3                                      | 1    | Rendah–sedang     | `SELESAI` 16 Agu                | — tidak ada                                                                                                                                                                                                                                               |
| **F5**  |   —    | **SSO Google/Microsoft** (poin 1)  | #11 → #29 → #32                         | 4–6  | Tinggi            | `SELESAI` 16 Agu                | — tidak ada                                                                                                                                                                                                                                               |
| **F6**  |   P1   | **Email: 3 fungsi** (poin 2, 3, 4) | #22, #23, #24 → #25 → #26, #27 → #28    | 3–4  | Rendah–sedang     | `SELESAI` 21 Agu (diselaraskan) | — #27 ditutup 21 Agu lewat #121 (tautan bertoken). **PERINGATAN:** #44 mengklaim domain `rajonet.com` terverifikasi, tetapi Resend menolak pengiriman 21 Agu — dilacak sebagai regresi #127                                                               |
| **F7**  | **P0** | **Two-Tier RBAC** & validasi       | **#76**, #4, #81, #82, #83              | 5–8  | **Tinggi**        | `SELESAI` 21 Agu (diselaraskan) | — tidak ada. Seluruh item F7 SELESAI (#76, #4, #81, #82, #83). Tiga keputusan yang dulu tertulis di sini sudah dijawab                                                                                                                                    |
| **F8**  |   P2   | Jaring pengaman                    | #9, #8                                  | 4–6  | Rendah            | `SELESAI` 21 Agu (diselaraskan) | — tidak ada. #9 dan #8 SELESAI                                                                                                                                                                                                                            |
| **F9**  |   P3   | Lapisan backend                    | #6                                      | 6–10 | Tinggi            | `SELESAI` 21 Agu (diselaraskan) | — tidak ada. #6 SELESAI 20 Agu                                                                                                                                                                                                                            |
| **F10** |   P3   | Arsitektur frontend                | #5, #7, #21                             | 8–15 | **Sangat tinggi** | `SELESAI` 21 Agu (diselaraskan) | — tidak ada. #5, #7, #21 SELESAI                                                                                                                                                                                                                          |
| **F11** | **P0** | **Drive-per-user — JALUR RILIS**   | #30 (prasyarat #46)                     | 6–10 | **Tinggi**        | `SIAP DIRANCANG`                | **PEMILIK, 3 hal.** 6 keputusan desain sudah DIJAWAB 16 Agu (§11.1). Sisa: konfirmasi D1b & D3b · perbaiki **#46** (`SSO_ALLOWED_DOMAINS=gmail.com` membatalkan asumsi kuota corporate, §11.1b) · setujui rancangan penyimpanan refresh token terenkripsi |
| **F12** |   P3   | Konsolidasi desain                 | #14, #13, #95, #96, #97, #98, #99, #100 | 2–3  | Rendah            | `SELESAI` 21 Agu (diselaraskan) | — tidak ada. Seluruh item F12 SELESAI, termasuk gelombang token & kontras 21 Agu (#103–#126)                                                                                                                                                              |

\*Perkiraan kasar dan **belum terverifikasi** — untuk membandingkan bobot antar
fase, bukan janji jadwal. Perbarui dengan angka nyata setelah fase pertama tutup.

### Cara membaca kolom "Prio"

Prioritas ini **bukan** severity dan **bukan** urutan ketergantungan — keduanya
sudah punya kolomnya sendiri. Ia menjawab satu pertanyaan saja: **fase mana yang
menahan rilis production?** Dasarnya dihitung dari §1, bukan dikira-kira.

|  Prio  | Arti                                                                                  | Fase               |
| :----: | ------------------------------------------------------------------------------------- | ------------------ |
| **P0** | Menahan rilis production. Ada item terbuka bertanda `Blokir production` di §1         | F1 · F2 · F7 · F11 |
|   P1   | Tidak menahan aplikasi, tapi menahan satu fitur utuh atau memasok temuan ke fase lain | F3 · F6            |
|   P2   | Prasyarat pengaman untuk pekerjaan berat sesudahnya                                   | F8                 |
|   P3   | Kerapian & arsitektur. Nol item blokir production                                     | F9 · F10 · F12     |
|   —    | Fase sudah tutup                                                                      | F0 · F4 · F5       |

**Hitungan yang mendasarinya** (item TERBUKA/MENUNGGU saja, diukur 16 Agu 2026):

| Fase           |       Item blokir production       | Item 🔴 | Catatan                                                                    |
| -------------- | :--------------------------------: | :-----: | -------------------------------------------------------------------------- |
| F1             | 2 (satu di antaranya #2 `DITAHAN`) |    3    | #15 = **±5 menit kerja pemilik, nol kode**. ROI tertinggi di seluruh papan |
| F2             |         3 (#69, #70, #80)          |    5    | audit sudah tuntas; sisanya keputusan, bukan pekerjaan                     |
| F7             |  1 blokir production + 1 keamanan  |    2    | #76 akar 56% temuan F2; tahap 1–2–4 jalan tanpa keputusan                  |
| F11            |              1 (#30)               |    1    | satu-satunya jalur rilis storage sejak #2 ditahan                          |
| F6             | 0 (yang ada `blokir rilis email`)  |    1    | fiturnya tertahan, aplikasinya tidak                                       |
| F3             |                 0                  |    1    | nilainya: menambah kasus uji untuk F8                                      |
| F8             |                 0                  |    0    | 3 item `Blokir modul baru`                                                 |
| F9 · F10 · F12 |                 0                  | 1 (F10) | F10 risiko **sangat tinggi**, imbalan production nol                       |

**Urutan kejar bila waktu/anggaran terbatas:** `F1 → F7 → F2 → F11`. F1 didahulukan
bukan karena paling berat, melainkan karena paling murah — ia selesai di Google
Cloud Console tanpa satu baris kode pun.

### Cara membaca kolom "TERTAHAN OLEH APA"

Kolom ini menggantikan kolom lama "Perlu pemilik?", yang hanya menjawab **ya/tidak**
dan karena itu tidak pernah cukup: ia tidak memberi tahu apa yang sebenarnya
harus dilakukan, sehingga tiap sesi harus menggali ulang.

| Isi kolom                    | Artinya                                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `— tidak ada`                | Fase tutup, atau tidak ada penghalang sama sekali                                                            |
| `— bisa jalan tanpa pemilik` | Boleh dimulai kapan saja. Catatan sesudahnya menerangkan **urutan yang disarankan**, bukan penghalang        |
| **PEMILIK**                  | Benar-benar berhenti sampai pemilik proyek bertindak. Tindakannya ditulis persis, bukan "menunggu keputusan" |

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
npm run audit:papan && npm run audit:warna   # integritas papan §1 & warna keras
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

| #       | Keputusan                                                                                                              | Status             |
| ------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------ |
| **D1**  | Berkas tinggal di drive milik **pengunggah**, mengikuti akun email yang dipakai login                                  | ✅                 |
| **D1b** | Cara berbagi: **server sebagai perantara**, BUKAN tautan berbagi — lihat alasan di bawah                               | ⏳ rekomendasi     |
| **D2**  | Anggota lain membaca dari dalam LanPro. **Izin LanPro yang berlaku**: punya akses view/download di LanPro berarti bisa | ✅                 |
| **D3**  | Saat pemilik mencabut/mengganti: berkas tidak bisa diunduh                                                             | ✅                 |
| **D3b** | Perilakunya dibedakan jadi **tiga keadaan** + pemeriksa terjadwal, bukan satu "not found"                              | ⏳ rekomendasi     |
| **D4**  | Data bisnis di drive pribadi **diterima untuk sekarang**                                                               | ✅ risiko diterima |
| **D5**  | Google Drive **dan** OneDrive — akun corporate punya kuota besar                                                       | ✅                 |
| **D6**  | Kuota teratasi oleh D5 (drive corporate)                                                                               | ✅ bersyarat       |

##### D1b — kenapa BUKAN tautan berbagi

Konsekuensi langsung dari D2. Karena **LanPro yang memegang otoritas izin**,
tautan berbagi merusaknya total: siapa pun pemegang URL bisa membaca tanpa
LanPro pernah tahu, dan mencabut izin seseorang di LanPro tidak mencabut apa pun.

Itu juga persis kebocoran yang baru ditutup di **#67** — berkas terbaca tanpa
autentikasi. Memakai tautan berbagi berarti membukanya kembali, kali ini di
drive orang lain dan di luar jangkauan penjaga LanPro.

|                                   | Tautan berbagi | Izin per-email | **Server perantara** |
| --------------------------------- | :------------: | :------------: | :------------------: |
| Izin LanPro berlaku               |       ❌       |   ❌ hanyut    |          ✅          |
| Cabut di LanPro langsung berlaku  |       ❌       |       ❌       |          ✅          |
| Anggota wajib punya akun provider |       —        |    ❌ wajib    |       ✅ tidak       |
| Bandwidth lewat server            |    ✅ tidak    |    ✅ tidak    |        ⚠️ ya         |

⚠️ **Harga yang harus dibayar dan wajib ditangani:** LanPro menyimpan _refresh
token_ drive tiap pengguna. Itu rahasia bernilai tinggi — **wajib terenkripsi
saat disimpan**, masuk daftar rotasi (§18.9 langkah 5), dan tercatat di §18.8
sebagai data rahasia. Ini syarat, bukan detail teknis yang bisa ditunda.

##### D3b — kenapa satu "not found" tidak cukup

Masalahnya bukan kata-katanya, melainkan **kapan orang tahu**. Dengan satu
pesan "not found", kehilangan berkas baru ketahuan **saat seseorang
membutuhkannya** — biasanya di saat paling genting.

| Keadaan                          | Yang dilihat pengguna                                | Yang terjadi di belakang                           |
| -------------------------------- | ---------------------------------------------------- | -------------------------------------------------- |
| Token dicabut / kedaluwarsa      | "Pemilik berkas perlu menyambungkan ulang drive-nya" | Notifikasi ke **pemilik**, bukan ke yang mengunduh |
| Berkas dihapus/dipindah di drive | "Berkas sudah tidak ada di drive pemilik"            | Ditandai di DB, tidak dicoba berulang              |
| Pemilik keluar / akun nonaktif   | Peringatan tingkat admin proyek                      | Daftar berkas terdampak                            |

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
simpanBerkas(nama, isi, tipe); // tidak tahu berkas ini milik siapa
```

Drive-per-user menuntut identitas pemilik dan token OAuth-nya ikut mengalir
sampai ke lapisan penyimpanan. Itu **mengubah kontrak lapisan**, dan setiap
pemanggil ikut berubah.

Yang juga ikut terdampak dan mudah terlewat:

| Bagian                                    | Kenapa terdampak                                                                                                                                             |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **#67** penjaga `/uploads`                | Berkas tidak lagi berada di disk server; penjaga berbasis nama berkas kehilangan makna                                                                       |
| Presigned URL (`src/lib/fileSecurity.ts`) | Drive punya mekanisme berbaginya sendiri; dua sistem token akan bertabrakan                                                                                  |
| Pemrosesan AI rapat                       | `runAIPipeline` membaca isi berkas dari disk. Bila berkas ada di drive orang, server harus mengunduhnya dulu — dan itu butuh izin yang mungkin sudah dicabut |
| Cakupan OAuth F5                          | Login SSO sekarang hanya minta identitas. Menambah cakupan Drive **mengubah layar persetujuan Google**, dan pengguna lama harus menyetujui ulang             |
| §18.6 batas lingkup                       | Storage pindah ke pihak ketiga — audit keamanan bertambah satu wilayah yang belum pernah diperiksa                                                           |

#### 11.3 Syarat masuk

1. ~~Enam keputusan §11.1 terjawab~~ — **SELESAI 16 Agu 2026**. Sisa dua
   konfirmasi akhir: D1b (server perantara) dan D3b (tiga keadaan).
2. F5 lulus — **sudah**, fondasi OAuth ada sehingga biayanya turun.
3. **#46 diperbaiki lebih dulu.** `SSO_ALLOWED_DOMAINS` harus berisi domain
   corporate, bukan `gmail.com`. Tanpa itu asumsi kuota D5/D6 tidak berlaku dan
   F11 dibangun di atas dasar yang salah — lihat §11.1b.
4. Keputusan tertulis soal cakupan OAuth tambahan dan persetujuan ulang pengguna
   lama (layar persetujuan Google & Microsoft berubah).
5. Rancangan penyimpanan _refresh token_ terenkripsi disetujui — konsekuensi
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
| Hex di `className`                     |      0 |                   **0** |                        — | ✅               |
| Hex di `style={{}}`                    |      0 |                   **0** |                        — | ✅               |
| Hex di SVG `fill`/`stroke` (diizinkan) |      — |                     146 |                       46 | 🟡 diizinkan     |
| Berkas memakai prefix `dark:`          |      0 |                   **0** |                    **0** | ✅ SELESAI       |
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

# Cakupan AppContainer (§19.30) — cabang adalah angka yang penting
npx jest src/AppContainer.render.test.tsx src/AppContainer.loggedin.test.tsx   --coverage --collectCoverageFrom="src/AppContainer.tsx" --coverageReporters=text

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
| 119 rute (tertulis 104)                       | Tak satu pun diuji perilakunya                                                                             | `JALAN` — 119 rute dipetakan menyeluruh; 5 temuan #69–#73 (§13.11)                                  |
| Perhitungan (progress, sprint, KPI, timeline) | Salah hitung tidak melempar error — ia hanya menampilkan angka keliru                                      | `SELESAI` 18 Agu — 7 unit test `hooks.test.tsx` mengunci kalkulasi                                  |
| Alur state antar view                         | 21 `useState` + 21 `useEffect` di `AppContainer`, dioper 47 props                                          | `JALAN` — ditelusuri, menghasilkan #74 (§13.12). Angka 21 useState dikoreksi jadi 11                |
| Socket.IO realtime                            | Pemancaran event sebagian di `runAIPipeline()` yang jalan **setelah** response terkirim                    | `JALAN` — autentikasi handshake ditelaah, temuan #50/#51 (§13.5); urutan emit `runAIPipeline` belum |
| Race condition / concurrency                  | Ada 1 test, belum ditelaah cakupannya                                                                      | `JALAN` — #65 optimistic locking terbukti mati senyap (§13.9); pola lain belum                      |
| Alur unggah–simpan–tampil berkas              | Baru dibaca kodenya (§6.1), belum dijalankan                                                               | `JALAN` — sisi unggah diuji & bersih; sisi tampil menghasilkan #67 (§13.10)                         |
| Penanganan error & rollback transaksi         | Belum ditelaah                                                                                             | `JALAN` — gelombang 2 menutup #60–#64 di rute task/project/auth (§13.8); 100+ endpoint lain belum   |
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

Keduanya muncul di luar rencana, saat memeriksa apa yang sedang menempati port 3000. Berbeda dari §13.5, dua temuan ini **sudah dibuktikan dengan permintaan
nyata** ke instance yang sedang berjalan.

#### #57 🟡 Dua endpoint health; yang terdokumentasi justru terkunci auth

| Endpoint            | Terdaftar di                        | Hasil `curl` tanpa token                       |
| ------------------- | ----------------------------------- | ---------------------------------------------- |
| `/api/health`       | `server/routes/health.routes.ts:24` | **401** — bukan di daftar prefix publik        |
| `/api/health-check` | `server.ts:505`                     | **200** `{"status":"ok","migrasi":"berhasil"}` |

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

| #       | Terbukti                                                                                                                                                                                                                                                                                                             | Sisa                                                                                   |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 49      | Test yang sama dibuktikan MERAH terhadap commit sebelum perbaikan (`git worktree` di luar repo). **Jalur anggota non-admin diuji sungguhan:** `rido` (peran `user`, anggota `2SGXiPUTwHnF8D576hfO`) login dan memakai aplikasi — 0 "Akses ditolak", 0 RBAC error                                                     | —                                                                                      |
| 52      | Regex penjaga dibuktikan tidak cocok pada `server.ts` sebelum perbaikan; aplikasi normal dengan pembatas terpasang                                                                                                                                                                                                   | Penolakan percobaan ke-11 belum diuji perilakunya — penjaganya STATIS                  |
| 50 + 59 | Klien anonim yang sama kini dijawab `AUTENTIKASI_DIBUTUHKAN`, token palsu dijawab `TOKEN_TIDAK_VALID`. **Realtime terbukti tetap hidup** untuk dua pengguna sekaligus: socket lolos gerbang, `[CHAT_SOCKET] User rido`, `[GLOBAL PRESENCE] Total online: 2`, dan data pengguna lain muncul di layar tanpa muat ulang | —                                                                                      |
| 51      | Sidik jari dicocokkan dengan nilai SHA-256 acuan yang dikenal, sehingga sisi server & peramban tidak sekadar sepakat pada implementasi yang sama                                                                                                                                                                     | Pemicunya sendiri — memancing `FORCE_LOGOUT_EVENT` butuh username & password sungguhan |

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

| #   | Terbukti                                                                                                                                                                                                                                        | Sisa                                                             |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 60  | 5 test perilaku lewat supertest, menjalankan rutenya sungguhan dan memaksa galat tepat di dalam jendela transaksi. **4 dari 5 dibuktikan MERAH** terhadap commit sebelum perbaikan di `git worktree` luar repo; yang 1 lulus memang sudah benar | —                                                                |
| 62  | Dibuktikan langsung ke database (semua di dalam transaksi yang di-ROLLBACK): kode lama → `25P02 current transaction is aborted`; kode baru → setelah `ROLLBACK TO SAVEPOINT`, perintah berikutnya **berhasil**. SQLSTATE nyatanya `42P01`       | Penghapusan proyek sungguhan — merusak, tidak dijalankan         |
| 63  | 8 test, termasuk penguncian bahwa kode MySQL lama TIDAK lagi dianggap cocok                                                                                                                                                                     | Pendaftaran email ganda — berarti membuat akun, tidak dijalankan |

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

| #   | Terbukti                                                                                                                                                                                            | Sisa |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 61  | 3 test perilaku, **ketiganya MERAH** terhadap `main` di worktree luar repo, sementara 5 test #60 di berkas yang sama tetap hijau — jadi batas transaksinya bergeser tanpa melemahkan penguncian #60 | —    |
| 64  | 4 test perilaku memakai `io` yang sengaja melempar galat saat memancarkan event, satu-satunya jalur yang memicu kasus ini. **1 test MERAH** terhadap `main`, 3 lainnya hijau                        | —    |

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

| Lokasi                             | Akibat                                                                                                                                                                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server/routes/task.routes.ts:959` | **Penjaga jendela balapan mati.** SQL-nya memakai `AND version = ?`, jadi saat kalah balapan UPDATE tidak menulis apa pun — tetapi API tetap menjawab 200 dan memancarkan `task_updated`. Suntingan pengguna **hilang tanpa pesan apa pun** |
| `server/routes/auth.routes.ts:146` | Login: 404 "User tidak ditemukan" tidak pernah terkirim                                                                                                                                                                                     |
| `server/routes/auth.routes.ts:242` | force-logout: sama                                                                                                                                                                                                                          |

**KOREKSI atas catatan pertama temuan ini.** Versi awal §13.9 menulis
"optimistic locking mati" dan "409 tidak pernah terkirim". Itu **berlebihan**,
dan yang menunjukkannya adalah test yang ditulis untuk menguncinya — test 409
pertama justru LULUS terhadap kode lama. Rute ini punya **dua** pemeriksaan
konflik, dan hanya satu yang rusak:

| Pemeriksaan                                                                  | Keadaan                                                                                                       |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `oldTask.version !== version` (`task.routes.ts:773`), dibandingkan di memori | **Sehat sejak dulu.** Menangkap kasus terlumrah: klien membawa versi usang, dijawab 409 "Konflik versi tugas" |
| Hasil `AND version = ?` pada UPDATE (`:959`)                                 | **Mati.** Menjaga jendela balapan sesungguhnya                                                                |

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

| Yang diperiksa                 | Hasil                                                                                                                         |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Perilaku jendela balapan       | 6 test; **3 MERAH** terhadap `main` di worktree luar repo, 3 sisanya (pengunci perilaku yang sudah benar) tetap hijau di sana |
| `RETURNING id` sah di Postgres | Dibuktikan langsung ke database: `RETURNING id -> jumlah baris: 1`                                                            |
| Aplikasi berjalan              | Sesi non-admin (`rido`), dashboard termuat penuh, 0 error console                                                             |
| Log server                     | 0 "Akses ditolak" · 0 `RBAC Middleware error` · 0 `LOG ANOMALI` · 0 `query error`                                             |

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
if (
  !isAuthorized &&
  (safeName.startsWith("avatar-") || /\.(png|jpe?g|webp|gif)$/i.test(safeName))
) {
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

| #       | Terbukti                                                                                                                                                                                     | Sisa                                                                                                             |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 67      | Terhadap server berjalan tanpa kredensial: avatar tetap `200`, berkas gambar non-avatar berubah `200` → **`403`**. Berkas uji dibuat di `uploads/` (data runtime ber-gitignore) lalu dihapus | —                                                                                                                |
| 66 + 68 | 5 test penjaga, **4 MERAH** terhadap `main` di worktree luar repo                                                                                                                            | Penolakan `viewer` sungguhan — penjaganya STATIS; perilaku `verifyProjectAccess` sendiri diuji di `rbac.test.ts` |
| 58      | 7 test perilaku, **5 MERAH** terhadap `main`. Terhadap server berjalan: `/metrics` → **503**, `/api/health-check` tetap `200`                                                                | Scraping dengan token sungguhan — `METRIK_TOKEN` sengaja dibiarkan kosong                                        |

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

| Rute                                                | Penjaga                                                                 |
| --------------------------------------------------- | ----------------------------------------------------------------------- |
| `GET /api/users/:userId/notifications` (`:19`)      | Ada — komentarnya bahkan menyebut "Anti-IDOR / Data Leakage Protection" |
| `PUT /api/users/:userId/notifications/:id` (`:274`) | Ada — `matchesCaller(req.user, userId)`                                 |
| `POST /api/users/:userId/notifications` (`:233`)    | **TIDAK ADA**                                                           |

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
verifyProjectAccess(["admin", "manager", "head", "developer", "designer", "viewer", "*"]);
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

| Pengambil           |   Penjaga   | `setState` | Ulangan 429 memakai closure basi |
| ------------------- | :---------: | :--------: | :------------------------------: |
| `fetchSprints`      |      —      |     3      |              **ya**              |
| `fetchActivityLogs` |      —      |     3      |              **ya**              |
| `fetchProjects`     |      —      |     3      |              **ya**              |
| `fetchTasks`        |      —      |     3      |                —                 |
| `fetchComments`     |      —      |     2      |                —                 |
| `fetchMasterData`   |      —      |     3      |                —                 |
| `fetchMembers`      | `isMounted` |     —      |                —                 |

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

| Tempat                                | Tertulis | Aktual                   |
| ------------------------------------- | -------- | ------------------------ |
| §13.1 "104 endpoint"                  | 104      | **119** rute (84 mutasi) |
| §13.1 "21 `useState` di AppContainer" | 21       | **11**                   |

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

| Lokasi                                                                   | Tabel yang dipakai | Ada di database? |
| ------------------------------------------------------------------------ | ------------------ | :--------------: |
| `server/routes/task.routes.ts:419` — menyimpan lampiran task             | `TaskAttachments`  | ❌ **TIDAK ADA** |
| `server/routes/project.routes.ts:439` — membersihkan saat proyek dihapus | `Attachments`      |      ✅ ada      |

Diverifikasi ke `information_schema` pada database hidup: **30 tabel**, tidak
satu pun bernama `TaskAttachments`. Yang ada adalah `Attachments`.

Akibatnya **membuat task dengan lampiran SELALU gagal** — `INSERT` melempar
`42P01 relation does not exist`.

#### Interaksinya dengan #61, dan kenapa itu penting

Perilakunya berubah karena perbaikan #61, dan perubahan itu perlu dicatat supaya
tidak disalahpahami sebagai regresi:

|                     | Sebelum #61                             | Sesudah #61    |
| ------------------- | --------------------------------------- | -------------- |
| Penghitung task     | Bertambah permanen                      | Dikembalikan   |
| Baris task          | **Tercipta**, lalu yatim tanpa lampiran | Tidak tercipta |
| Jawaban ke pengguna | 500                                     | 500            |

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
> | Klaim awal                       | Sebenarnya          | Sebab                                                                                                                                                                                           |
> | -------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
> | 12 tabel drift                   | **13**              | —                                                                                                                                                                                               |
> | 52 kolom                         | **54**              | —                                                                                                                                                                                               |
> | 0 kolom hanya di migrasi         | **2**               | —                                                                                                                                                                                               |
> | **3 tabel tidak ada di migrasi** | **0 — SALAH TOTAL** | Parser hanya menerima nama BER-KUTIP. `meeting_details`, `ai_learning_logs`, dan `discussion_point_comments` ditulis TANPA kutip, jadi terlewat. Ketiganya ADA di migrasi (baris 410, 538, 548) |
>
> Kekeliruan kedua: membandingkan nama kolom secara TEKSTUAL. Postgres
> **melipat identifier tanpa kutip menjadi huruf kecil**, sehingga `pointId`
> di migrasi menjadi `pointid` di database. Perbandingan tekstual melaporkannya
> sebagai beda padahal identik. Versi ketiga alat ukur membandingkan nama
> **sebagaimana akan dibuat Postgres**.

| Ukuran                                          | Nilai                                                      |
| ----------------------------------------------- | ---------------------------------------------------------- |
| Tabel di `src/lib/pg-migrate.ts`                | 30                                                         |
| Tabel di database hidup                         | 30                                                         |
| Tabel di database yang tidak ada di migrasi     | **0**                                                      |
| **Tabel yang drift**                            | **13**                                                     |
| **Kolom ada di database, TIDAK dibuat migrasi** | **54**                                                     |
| Kolom ada di migrasi, tidak ada di database     | **2** — `discussion_point_comments`: `userid`, `createdat` |

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

| Kolom             | Rujukan di `server/routes` | Contoh                       |
| ----------------- | :------------------------: | ---------------------------- |
| `description`     |             80             | tersebar                     |
| `content`         |             26             | `Comments`, `Messages`       |
| `namaModul`       |             8              | `QATestCases`                |
| `expectedResult`  |             6              | `qa.routes.ts:273, 300, 504` |
| `executionStatus` |             6              | jalur eksekusi QA            |
| `actionType`      |             3              | `ActivityLogs`               |
| `environment`     |             3              | `Tasks`                      |

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

| Rencana                                 | Hasilnya                                                                                                        |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Ganti `TaskAttachments` → `Attachments` | **Tetap gagal.** `filename` di database `NOT NULL` tanpa default, dan kode tidak menulisnya → galat `23502`     |
| Andalkan migrasi membuat `Attachments`  | **Tetap gagal di database baru.** Migrasi tidak punya `fileType` dan `createdAt`, padahal kode menulis keduanya |

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

| Sebelum                          | Sesudah                            |
| -------------------------------- | ---------------------------------- |
| 13 tabel drift · 54 kolom kurang | **0 · 0**                          |
| Gerbang tidak bisa dijalankan    | `npm run db:verify-schema`, exit 0 |

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

| Perubahan                                                              | Alasan                                                                                                                                              |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| +54 kolom lewat `ADD COLUMN IF NOT EXISTS`                             | No-op di production, memperbaiki database bersih                                                                                                    |
| `"userId"` & `"createdAt"` di `discussion_point_comments` diberi kutip | Tanpa kutip, Postgres melipatnya jadi `userid`/`createdat` sementara production memakai camelCase — komentar akan gagal disimpan di database bersih |
| `filename`, `testCaseId`, `content` diberi `NOT NULL`                  | Menyamai production. Terdeteksi hanya setelah gerbang membandingkan nullability, bukan sekadar nama kolom                                           |

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

| Pilihan                       | Konsekuensi                                                                         |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| Tambahkan `verifyGlobalAdmin` | Konsisten dengan `POST /api/projects`. Fitur demo tetap ada, tapi hanya untuk admin |
| Hapus rutenya                 | Paling bersih bila penyemaian demo memang tidak dipakai lagi                        |
| Biarkan                       | ❌ Membatalkan ketetapan pembuatan proyek                                           |

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

| #   | Fitur                  | Tampil | Mode gelap | 375px | Desktop | Console bersih | Catatan                                           |
| --- | ---------------------- | :----: | :--------: | :---: | :-----: | :------------: | ------------------------------------------------- |
| 0   | Sign In                |   ✅   |     ✅     |  ✅   |   ✅    |       ✅       | LoginScreen + ForgotPasswordModal teruji          |
| 1   | dashboard              |   ✅   |     ✅     |  ✅   |   ✅    |       ✅       | KPI, grafik, recent activity ter-render sempurna  |
| 2   | issues                 |   ✅   |     ✅     |  ✅   |   ✅    |       ✅       | Table view, inline edit, filters, status badges   |
| 3   | planning               |   ✅   |     ✅     |  ✅   |   ✅    |       ✅       | Backlog list, sprint controls, drag & drop        |
| 4   | kanban                 |   ✅   |     ✅     |  ✅   |   ✅    |       ✅       | Swimlane cards, column headers, smooth DnD        |
| 5   | qa                     |   ✅   |     ✅     |  ✅   |   ✅    |       ✅       | Test suites, test cases, execution summary matrix |
| 6   | wiki                   |   ✅   |     ✅     |  ✅   |   ✅    |       ✅       | Document tree, markdown rendering, attachments    |
| 7   | meeting-notes          |   ✅   |     ✅     |  ✅   |   ✅    |       ✅       | Transcripts, discussion points table              |
| 8   | notebook-lm            |   ⚠️   |     —      |   —   |    —    |       —        | diketahui rusak, lihat #18                        |
| 9   | flowchart              |   ✅   |     ✅     |  ✅   |   ✅    |       ✅       | Canvas editor, nodes palette, direct import       |
| 10  | master                 |   ✅   |     ✅     |  ✅   |   ✅    |       ✅       | Status, IssueType, Priority, Category config      |
| 11  | connect                |   ✅   |     ✅     |  ✅   |   ✅    |       ✅       | Integration tokens & webhooks panel               |
| 12  | enterprise-audit       |   ✅   |     ✅     |  ✅   |   ✅    |       ✅       | Audit trails, security logs, timeline filter      |
| 13  | activity               |   ✅   |     ✅     |  ✅   |   ✅    |       ✅       | Project activity feed                             |
| 14  | timeline               |   ✅   |     ✅     |  ✅   |   ✅    |       ✅       | Gantt chart / timeline rendering                  |
| 15  | team                   |   ✅   |     ✅     |  ✅   |   ✅    |       ✅       | Member list, role assignments, invite modal       |
| 16  | explorer (DB Explorer) |   ✅   |     ✅     |  ✅   |   ✅    |       ✅       | Read-only database schema inspection              |
| 17  | settings               |   ✅   |     ✅     |  ✅   |   ✅    |       ✅       | General project settings, edit metadata           |
| 18  | users                  |   ✅   |     ✅     |  ✅   |   ✅    |       ✅       | User profile & accounts management                |
| 19  | sidebar                |   ✅   |     ✅     |  ✅   |   ✅    |       ✅       | Collapsible sidebar, semantic token colors        |
| 20  | backup                 |   ✅   |     ✅     |  ✅   |   ✅    |       ✅       | Database backup & export                          |
| 21  | auth (profil/sesi)     |   ✅   |     ✅     |  ✅   |   ✅    |       ✅       | Active JWT session management                     |

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

**ISO/IEC 27001 bukan standar audit kode.** Ia standar **ISMS** (_Information
Security Management System_) — sistem manajemen tingkat organisasi. Yang diaudit
di sana adalah kebijakan, peran, manajemen risiko, pelatihan, kontrol pemasok,
respons insiden, dan tinjauan manajemen. Sertifikasinya diterbitkan lembaga
terakreditasi, bukan dihasilkan dari membaca kode.

Jadi kalimat "AUDIT.md sudah ISO 27001" **tidak akan pernah benar**, sebaik apa
pun dokumen ini ditulis. Yang bisa benar: temuan teknis di sini menjadi **bukti**
untuk sebagian kontrol Annex A bila suatu hari ISMS dibangun.

Yang sebenarnya paling mendekati isi dokumen ini:

| Acuan                      | Apa itu                                                                 | Posisi AUDIT.md                                                                                             |
| -------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **OWASP ASVS 4.0**         | Standar verifikasi keamanan aplikasi — syarat yang bisa diuji per fitur | Paling relevan. Dokumen ini **belum** memetakan diri ke sana, dan belum menyatakan menargetkan Level berapa |
| **OWASP Top 10 (2021)**    | Sepuluh kategori risiko aplikasi web terlazim                           | Belum dipetakan. Pemetaannya di §18.3 memunculkan temuan sistemik yang tidak terlihat per item              |
| **CWE**                    | Taksonomi kelemahan perangkat lunak                                     | Belum dipakai. Tanpa ini temuan sulit dibandingkan lintas proyek atau lintas alat                           |
| **CVSS v3.1**              | Skor keparahan baku 0–10 beserta vektornya                              | Belum dipakai. Skala 🔴/🟠/🟡 di sini buatan sendiri                                                        |
| **NIST SSDF (SP 800-218)** | Praktik pengembangan perangkat lunak aman                               | Sebagian besar sudah dijalankan tanpa disebut namanya — lihat §18.2                                         |
| **ISO 27001:2022 Annex A** | 93 kontrol organisasi & teknologi                                       | Hanya sebagian kecil kontrol A.8 (teknologi) yang tersentuh                                                 |

### 18.2 Yang SUDAH melampaui audit kebanyakan — jangan dibongkar

Ini bukan pujian; ini catatan agar praktik berikut tidak hilang saat dokumen
dirapikan mengikuti format standar. Banyak laporan audit formal justru **tidak**
punya ini:

| Praktik di sini                                                            | Padanan standarnya                                                            |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Tiap temuan menyertakan berkas & nomor baris                               | _Evidence traceability_ — ASVS & ISO 27001 A.8.8                              |
| Perbaikan wajib disertai test yang **dibuktikan MERAH** terhadap kode lama | Melampaui ASVS. Menutup celah "perbaikan yang tidak memperbaiki apa pun"      |
| Pembuktian dijalankan terhadap sistem hidup, bukan disimpulkan             | _Dynamic verification_ (DAST) — disyaratkan ASVS untuk level tinggi           |
| Kolom "BELUM terbukti" ditulis eksplisit di tiap kartu verifikasi          | _Scope limitation statement_ — wajib di laporan audit formal, sering dilewat  |
| Larangan mengubah source untuk pembuktian (§0.5 no. 4)                     | _Audit integrity_ — bukti tidak boleh lahir dari lingkungan yang dimanipulasi |
| Riwayat per item tidak pernah dihapus, hanya diubah statusnya              | _Audit trail_ — ISO 27001 A.5.28                                              |
| Angka diukur ulang dengan perintah yang ikut ditulis (§9)                  | _Repeatability_                                                               |

### 18.3 Pemetaan temuan F2 ke OWASP Top 10 & CWE

Dikerjakan 16 Agu 2026 atas 25 temuan F2 (#49–#74; #56 masuk F8, #75 masuk F0).

| #   | Kategori OWASP 2021                          | CWE                                                               | Sev |
| --- | -------------------------------------------- | ----------------------------------------------------------------- | :-: |
| 49  | A01 Broken Access Control                    | CWE-284 Improper Access Control                                   | 🔴  |
| 50  | A07 Identification & Authentication Failures | CWE-306 Missing Authentication for Critical Function              | 🔴  |
| 51  | A02 Cryptographic Failures                   | CWE-200 Exposure of Sensitive Information                         | 🔴  |
| 52  | A07                                          | CWE-307 Improper Restriction of Excessive Authentication Attempts | 🔴  |
| 53  | A01                                          | CWE-639 Authorization Bypass Through User-Controlled Key          | 🔴  |
| 54  | A01                                          | CWE-290 Authentication Bypass by Spoofing                         | 🟠  |
| 55  | A01                                          | CWE-284                                                           | 🟡  |
| 57  | — (operasional, bukan keamanan)              | —                                                                 | ⚪  |
| 58  | A05 Security Misconfiguration                | CWE-200                                                           | 🟠  |
| 59  | A01                                          | CWE-359 Exposure of Private Personal Information                  | 🔴  |
| 60  | A04 Insecure Design                          | CWE-459 Incomplete Cleanup                                        | 🔴  |
| 61  | A04                                          | CWE-662 Improper Synchronization                                  | 🟠  |
| 62  | A04                                          | CWE-544 Missing Standardized Error Handling                       | 🟡  |
| 63  | A04                                          | CWE-544                                                           | 🟡  |
| 64  | A04                                          | CWE-459                                                           | 🟡  |
| 65  | A04                                          | CWE-362 Race Condition                                            | 🔴  |
| 66  | A01                                          | CWE-285 Improper Authorization                                    | 🔴  |
| 67  | A01                                          | CWE-200 / CWE-548                                                 | 🔴  |
| 68  | A01                                          | CWE-306                                                           | 🔴  |
| 71  | A01                                          | CWE-285                                                           | 🟠  |
| 72  | A01                                          | CWE-285                                                           | 🟠  |
| 73  | A01                                          | CWE-284                                                           | 🟡  |
| 74  | A04                                          | CWE-362                                                           | 🟠  |

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

| Kesenjangan                         | Akibatnya sekarang                                                                                                                                                                     | Penutupnya                                                                                                                   |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Skala 🔴/🟠/🟡 tidak punya rubrik   | §1 mendefinisikan severity dari **biaya bisnis** ("menghambat production"), bukan dampak keamanan. Akibatnya #57 (operasional) dan #55 (kontrol akses) sama-sama 🟡 padahal beda total | Rubrik §18.5                                                                                                                 |
| Tidak ada pernyataan dampak C-I-A   | Tidak terbaca mana yang membocorkan data, merusak data, atau mematikan layanan                                                                                                         | Kolom C/I/A pada §18.5                                                                                                       |
| Tidak ada CVSS                      | Tidak bisa dibandingkan dengan temuan alat lain atau vendor                                                                                                                            | Beri vektor CVSS v3.1 saat ada penilai yang kompeten. **Jangan dikarang** — skor tanpa dasar lebih buruk daripada tanpa skor |
| Tidak ada definisi lingkup & aset   | Tidak jelas apa yang TIDAK diaudit                                                                                                                                                     | §18.6                                                                                                                        |
| Tidak ada catatan penerimaan risiko | Item `MENUNGGU` menggantung tanpa siapa/kapan                                                                                                                                          | §18.7                                                                                                                        |
| Tidak ada klasifikasi data          | #59 membocorkan nomor telepon & email — tidak tercatat bahwa itu data pribadi                                                                                                          | §18.8                                                                                                                        |
| Target ASVS tidak dinyatakan        | Tidak ada tolok "kapan cukup"                                                                                                                                                          | Tetapkan ASVS Level 1 dulu, Level 2 sebelum production                                                                       |

### 18.5 Rubrik keparahan — menggantikan penilaian intuitif

Severity ditetapkan dari **dampak** dan **keterjangkauan**, bukan dari perasaan
maupun dari biaya perbaikannya.

|      Sev      | Syarat                                                                                                                           | Contoh dari temuan nyata                                                                            |
| :-----------: | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 🔴 **Kritis** | Bisa dieksploitasi **tanpa kredensial sah**, ATAU membocorkan data pribadi, ATAU menghilangkan/merusak data pengguna tanpa jejak | #50 socket anonim menerima PII admin · #65 suntingan hilang senyap · #67 berkas terbaca tanpa login |
| 🟠 **Tinggi** | Butuh akun sah tetapi melampaui hak yang seharusnya, ATAU merusak keandalan pada kondisi yang wajar terjadi                      | #66 `viewer` menghapus data · #74 data proyek lain menimpa layar                                    |
| 🟡 **Sedang** | Belum bisa dieksploitasi hari ini, tetapi menghapus lapisan pertahanan atau menjadi ranjau bagi perubahan berikutnya             | #55 RBAC mati senyap bila nama param berubah · #73 `"*"` terselip                                   |

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

| Area                                     | Kenapa penting                                                          |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| Konfigurasi & pengerasan Neon PostgreSQL | Enkripsi saat diam, retensi cadangan, pembatasan IP                     |
| Konfigurasi platform Vercel              | Variabel lingkungan, header, log                                        |
| Rantai pasok dependensi                  | `npm audit`, SBOM, dependensi tertinggal versi                          |
| Keamanan pipeline CI/CD                  | Siapa boleh merge, siapa memegang rahasia                               |
| Rotasi & penyimpanan rahasia             | `JWT_SECRET` tidak pernah dirotasi; prosedurnya tidak ada               |
| Ketahanan cadangan & pemulihan           | Belum pernah diuji pulih                                                |
| Pencatatan & pemantauan keamanan         | `AuditLogs` ada, tetapi tidak ada yang membacanya                       |
| Uji penetrasi pihak ketiga               | Belum pernah                                                            |
| Proses organisasi                        | Respons insiden, pelatihan, kontrol pemasok — seluruh wilayah ISO 27001 |

⚠️ Audit ini memeriksa **kode**. Sistem yang kodenya bersih tetap bisa jebol
lewat kredensial yang bocor, dependensi bermasalah, atau cadangan yang tidak
pernah teruji.

### 18.7 Catatan penerimaan risiko

Item berstatus `MENUNGGU` berarti **risikonya masih hidup dan sedang ditanggung**
— bukan berarti sudah beres. Mulai sekarang tiap item `MENUNGGU` mencatat siapa
yang menanggung dan sejak kapan.

| #       | Risiko yang sedang ditanggung                                                                                                                                                                                                                 | Ditanggung oleh | Sejak       |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ----------- |
| 69      | Notifikasi palsu atas nama orang lain — jalur phishing di dalam aplikasi                                                                                                                                                                      | Pemilik proyek  | 16 Agu 2026 |
| 70      | Rapat lintas proyek bisa dibaca, direkam-ulang, dibatalkan                                                                                                                                                                                    | Pemilik proyek  | 16 Agu 2026 |
| 71      | Modul proyek bisa di-CRUD lintas proyek                                                                                                                                                                                                       | Pemilik proyek  | 16 Agu 2026 |
| 72      | `viewer` bisa membuat & mengubah data proyek                                                                                                                                                                                                  | Pemilik proyek  | 16 Agu 2026 |
| 73      | Penjaga `dashboard-layout` korslet                                                                                                                                                                                                            | Pemilik proyek  | 16 Agu 2026 |
| 74      | Data proyek lama menimpa layar proyek baru                                                                                                                                                                                                    | Pemilik proyek  | 16 Agu 2026 |
| 77      | 4 kerentanan dependensi `moderate`: react-router & react-router-dom (open redirect → XSS), exceljs, uuid. Hanya tertutup lewat `npm audit fix --force` = kenaikan versi mayor                                                                 | Pemilik proyek  | 16 Agu 2026 |
| 30 · D4 | Data bisnis (rekaman rapat, bukti QA, dokumen) tinggal di **drive pribadi** pengguna. Diterima "untuk sekarang" 16 Agu 2026 — menyulitkan audit, penghapusan atas permintaan, dan pembuktian saat sengketa                                    | Pemilik proyek  | 16 Agu 2026 |
| 2 / 30  | Berkas unggahan hilang tiap deploy. **Alasannya berubah 16 Agu 2026**: driver `s3` DITAHAN atas keputusan pemilik, storage beralih ke drive user (F11). Risikonya tetap hidup, dan kini berjalan selama F11 belum jadi — 6–10 sesi, bukan 1–2 | Pemilik proyek  | 15 Agu 2026 |
| 15      | Dua Google API key lama belum dicabut                                                                                                                                                                                                         | Pemilik proyek  | 15 Agu 2026 |
| 46      | `SSO_ALLOWED_DOMAINS=gmail.com` — siapa pun ber-Gmail bisa mendaftar                                                                                                                                                                          | Pemilik proyek  | 15 Agu 2026 |

Kolom "sampai kapan" sengaja dikosongkan: **tidak boleh diisi oleh siapa pun
selain pemilik proyek.**

### 18.8 Klasifikasi data — dasar kepatuhan UU PDP

LanPro menyimpan dan menampilkan data pribadi. Ini belum pernah dinyatakan di
mana pun, padahal menentukan bobot beberapa temuan.

| Data                                                | Klasifikasi                 | Tersimpan di                    | Temuan terkait                                         |
| --------------------------------------------------- | --------------------------- | ------------------------------- | ------------------------------------------------------ |
| Nama, email, nomor telepon                          | **Data pribadi**            | `Users`                         | **#59** — bocor ke socket anonim                       |
| Jabatan, departemen                                 | Data pribadi                | `Users`                         | #59                                                    |
| Matriks permission                                  | Internal sensitif           | `Users`                         | #59                                                    |
| Foto profil                                         | Data pribadi                | `uploads/`                      | #67 — sengaja publik atas keputusan pemilik            |
| Isi rapat, rekaman, notulen                         | Rahasia bisnis              | `Meetings`                      | **#70**                                                |
| Dokumen & bukti QA                                  | Rahasia bisnis              | `Documents`, `uploads/`         | **#67**                                                |
| Kata sandi                                          | Rahasia — di-hash           | `Users`                         | #52                                                    |
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

| Langkah | Isi                                                                                                               |    Butuh pemilik?    |
| ------- | ----------------------------------------------------------------------------------------------------------------- | :------------------: |
| 1       | Tetapkan target **OWASP ASVS Level 1**, lalu Level 2 sebelum production. Tanpa target, tidak ada definisi "cukup" |   Ya — 1 keputusan   |
| 2       | Kerjakan **#76** (otorisasi deny-by-default). Menutup akar 56% temuan sekaligus                                   | Ya — izin arsitektur |
| 3       | ~~`npm audit` + SBOM ke gerbang CI~~ **SELESAI 16 Agu 2026** — lihat §18.10                                       |          —           |
| 4       | ~~Terapkan rubrik §18.5 ke temuan lama~~ **SELESAI 16 Agu 2026** — lihat §18.11                                   |          —           |
| 5       | Prosedur rotasi rahasia — `JWT_SECRET` belum pernah dirotasi                                                      |          Ya          |
| 6       | Uji pulih dari cadangan, sekali, dan catat hasilnya                                                               |          Ya          |
| 7       | Tetapkan siapa membaca `AuditLogs` dan seberapa sering                                                            |          Ya          |
| 8       | Baru setelah itu: pertimbangkan uji penetrasi pihak ketiga                                                        |      Ya — biaya      |

**Jangan lakukan:** menempelkan kata "ISO 27001" di dokumen ini tanpa ISMS.
Klaim kepatuhan yang tidak berdasar lebih berbahaya daripada mengaku belum
patuh — ia membuat orang berhenti memeriksa.

---

### 18.10 Gerbang rantai pasok & SBOM — SELESAI 16 Agu 2026

Langkah 3 §18.9. Dua perintah baru, keduanya juga jalan di CI:

| Perintah             | Isi                                                                               |
| -------------------- | --------------------------------------------------------------------------------- |
| `npm run audit:deps` | Menjalankan `npm audit`, memblokir bila ada kerentanan `high` ke atas             |
| `npm run sbom`       | Menghasilkan `sbom.cyclonedx.json` — CycloneDX 1.5, **790 dependensi production** |

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

| #   | Lama | Baru | Sebab                                                                                                                                                                                                                                                                                                           |
| --- | :--: | :--: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 53  |  🟠  |  🔴  | Bisa dipanggil **tanpa kredensial apa pun** — `POST /api/auth/logout` berada di prefix publik. Rubrik menaruh "dapat dieksploitasi tanpa kredensial sah" di 🔴 tanpa syarat lain. Penilaian lama menurunkannya karena dampaknya "hanya" melemahkan sesi tunggal, dan itu mencampur dampak dengan keterjangkauan |
| 57  |  🟡  |  ⚪  | **Bukan temuan keamanan.** Dua endpoint health adalah cacat operasional; memaksanya masuk skala keamanan membuat ⚪ berarti dua hal berbeda. Diberi tanda ⚪ **operasional**                                                                                                                                    |
| 62  |  🟠  |  🟡  | Butuh kondisi yang tidak wajar terjadi (tabel hilang di database yang sehat). Rubrik menaruhnya di 🟡: melemahkan pertahanan dan menyesatkan saat insiden, tetapi tidak bisa dipicu pada operasi normal                                                                                                         |
| 63  |  🟠  |  🟡  | Sama — hanya muncul saat mendaftar dengan email ganda, dan akibatnya pesan galat yang keliru, bukan kehilangan atau kebocoran data                                                                                                                                                                              |

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

| #   | Sumber                        | Nilai                                                                                                              | Punya data? |
| --- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------- |
| 1   | `Users.role`                  | `user` (9) · `admin` (1) · `head` (1)                                                                              | ✅          |
| 2   | `ProjectMembers.role`         | `member` (7) · `manager` (2) · `developer` (1)                                                                     | ✅          |
| 3   | `DEFAULT_PERMISSIONS` (kode)  | `admin` · `head` · `manager` · `user` · `viewer`                                                                   | sebagian    |
| 4   | Penjaga rute (kode)           | + `developer` · `member` · `designer` · `*`                                                                        | sebagian    |
| 5   | **`MasterData.project_role`** | Project Admin · Product Owner · Scrum Master · Lead Developer · Frontend Engineer · Backend Engineer · QA Engineer | ✅ 7 baris  |
| —   | Cek `role ===` tersebar       | + `superadmin` · `administrator` · `assistant` · `qa` · `lead` · `sadm` · `admn` · `system admin` · `super admin`  | ❌ nol      |

**Gabungan 17 nama peran. Hanya 6 yang punya data. Tidak ada satu tempat pun
yang mendefinisikannya.**

⚠️ Sumber ke-5 adalah temuan yang paling mengejutkan: `MasterData` **sudah**
punya katalog peran sejak 5 Agu 2026, lengkap dengan kolom `role_type`, dan
**tidak satu pun cocok** dengan nilai di `ProjectMembers.role`. Katalognya ada,
tidak pernah dipakai.

Ditambah dua lapis lagi yang tidak terhitung di atas:

| Lapis                                                      | Keadaan                                                                                               |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `Users.permissions` — matriks 16 modul × CRUD per individu | Ditegakkan backend **hanya di 1 modul** (`list`), 2 aksi, di task routes. 15 modul lain: **kosmetik** |
| `ProjectMembers.parentAdminId`                             | **Ditulis, tidak pernah dibaca.** 6 baris terisi, nol `SELECT` (item #81)                             |

### 19.3 Prinsip: jabatan ≠ peran akses

Diambil dari benchmark, dan inilah yang membedakan rancangan ini dari katalog
lama:

| Aplikasi                      |                Jumlah project role                | Dasar pembedaan           |
| ----------------------------- | :-----------------------------------------------: | ------------------------- |
| GitLab                        | 5 — Guest, Reporter, Developer, Maintainer, Owner | Tangga hak akses          |
| Jira Cloud (team-managed)     |         3 — Administrator, Member, Viewer         | Tangga hak akses          |
| Jira Server (company-managed) |       3 — Administrators, Developers, Users       | Izin di Permission Scheme |
| Azure DevOps                  | 3 — Readers, Contributors, Project Administrators | Tangga hak akses          |

**Tidak satu pun memakai profesi sebagai peran.** `Frontend Engineer` dan
`Backend Engineer` membutuhkan hak akses yang identik — yang berbeda hanya
pekerjaannya. Menjadikannya dua peran mengulang persis masalah `developer` vs
`member`: dua nama, hak akses sama, tidak ada yang tahu bedanya.

Tempat yang benar untuk itu sudah ada: `MasterData.type = 'jabatan'` (12 baris).

### 19.4 SYSTEM ROLE — 4 peran

Mengatur hal **di luar** proyek. Tidak menentukan apa pun di dalam proyek.

| Nama Modul                 | Nama Role                                  |       Akses CRUD       |
| -------------------------- | ------------------------------------------ | :--------------------: |
| `userManagement`           | Administrator                              |          CRUD          |
| `userManagement`           | Department Head                            |           R            |
| `userManagement`           | Standard User · Observer                   |           —            |
| `masterData`               | Administrator                              |          CRUD          |
| `masterData`               | Department Head                            |           R            |
| `masterData`               | Standard User · Observer                   |           —            |
| `auditLog`                 | Administrator                              |          CRUD          |
| `auditLog`                 | Department Head                            |           R            |
| `auditLog`                 | Standard User · Observer                   |           —            |
| `dbExplorer`               | Administrator                              |          CRUD          |
| `dbExplorer`               | Department Head · Standard User · Observer |           —            |
| `settings`                 | Administrator                              |          CRUD          |
| `settings`                 | Department Head                            |           R            |
| `settings`                 | Standard User · Observer                   |           —            |
| _(buat proyek)_            | **Administrator**                          |         **C**          |
| _(buat proyek)_            | Department Head · Standard User · Observer |         **—**          |
| _(lintas proyek)_          | Administrator                              |      **God Mode**      |
| _(daftar proyek terlihat)_ | Administrator                              |         semua          |
| _(daftar proyek terlihat)_ | Department Head                            |     se-departemen      |
| _(daftar proyek terlihat)_ | Standard User · Observer                   | hanya yang ia anggotai |

`Project Manager` **tidak ada** di system role atas ketetapan pemilik proyek
16 Agu 2026. Sesudah pembuatan proyek dibatasi ke Administrator, peran itu tidak
menyisakan pembeda apa pun dari Standard User.

### 19.5 PROJECT ROLE — 9 peran

Mengatur hal **di dalam** satu proyek. Tiga peran fungsional — System Analyst,
Business Analyst, dan QA — ditetapkan pemilik proyek sebagai project role
tersendiri, masing-masing **menguasai penuh satu modul**. `Department Head`
memiliki akses baca (`R`) di seluruh modul pada proyek yang ia ikuti (§19.48).

| Nama Modul                | Nama Role                                                                     | Akses CRUD |
| ------------------------- | ----------------------------------------------------------------------------- | :--------: |
| `dashboard`               | seluruh peran                                                                 |     R      |
| `access` (Team)           | Project Owner · Project Admin                                                 |    CRUD    |
| `access`                  | Project Manager                                                               |   R + U    |
| `access`                  | System Analyst · Business Analyst · Developer · QA · Department Head · Viewer |     R      |
| `list` (Issue List)       | Project Owner · Project Admin · Project Manager                               |    CRUD    |
| `list`                    | System Analyst · Business Analyst · Developer · QA                            |    CRU     |
| `list`                    | Department Head · Viewer                                                      |     R      |
| `board` (Kanban)          | Project Owner · Project Admin · Project Manager                               |    CRUD    |
| `board`                   | System Analyst · Business Analyst · Developer · QA                            |   R + U    |
| `board`                   | Department Head · Viewer                                                      |     R      |
| `sprints`                 | Project Owner · Project Admin · Project Manager                               |    CRUD    |
| `sprints`                 | System Analyst · Business Analyst · Developer · QA · Department Head · Viewer |     R      |
| `timeline`                | Project Owner · Project Admin · Project Manager                               |    CRUD    |
| `timeline`                | System Analyst · Business Analyst · Developer · QA · Department Head · Viewer |     R      |
| `wiki` (Documentation)    | Project Owner · Project Admin · Project Manager                               |    CRUD    |
| `wiki`                    | **System Analyst**                                                            |  **CRUD**  |
| `wiki`                    | Business Analyst                                                              |    CRU     |
| `wiki`                    | Developer · QA · Department Head · Viewer                                     |     R      |
| `flowchart`               | Project Owner · Project Admin · Project Manager                               |    CRUD    |
| `flowchart`               | **System Analyst**                                                            |  **CRUD**  |
| `flowchart`               | Business Analyst                                                              |    CRU     |
| `flowchart`               | Developer · QA · Department Head · Viewer                                     |     R      |
| `meetingNotes`            | Project Owner · Project Admin · Project Manager                               |    CRUD    |
| `meetingNotes`            | **Business Analyst**                                                          |  **CRUD**  |
| `meetingNotes`            | System Analyst · QA                                                           |    CRU     |
| `meetingNotes`            | Developer · Department Head · Viewer                                          |     R      |
| `qa` (Quality Assessment) | Project Owner · Project Admin · Project Manager                               |    CRUD    |
| `qa`                      | **QA**                                                                        |  **CRUD**  |
| `qa`                      | System Analyst · Business Analyst · Developer                                 |   R + U    |
| `qa`                      | Department Head · Viewer                                                      |     R      |
| _(setelan proyek)_        | **Project Owner** · **Project Admin**                                         |   **U**    |
| _(setelan proyek)_        | selain itu                                                                    |     —      |
| _(hapus proyek)_          | **Project Owner**                                                             |   **D**    |
| _(hapus proyek)_          | selain itu                                                                    |     —      |

#### Wilayah kuasa tiap peran fungsional

| Peran                | Modul yang dikuasai penuh | Alasan                                                              |
| -------------------- | ------------------------- | ------------------------------------------------------------------- |
| **System Analyst**   | `wiki` · `flowchart`      | Pemilik dokumentasi sistem & alur proses                            |
| **Business Analyst** | `meetingNotes`            | Pemilik requirement & notulen                                       |
| **QA**               | `qa`                      | Pemilik test case & bukti pengujian                                 |
| **Developer**        | —                         | Pelaksana teknis; boleh ditugasi dan mengubah task, tidak menghapus |

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

| Huruf | Arti                            | Contoh di `list` (Issue List)          |
| :---: | ------------------------------- | -------------------------------------- |
| **C** | Membuat entitas baru            | `POST /tasks`                          |
| **R** | Membaca daftar & detail         | `GET /tasks`, `GET /tasks/:id`         |
| **U** | Mengubah isi, status, penugasan | `PUT /tasks/:id`, `PUT /tasks/reorder` |
| **D** | Menghapus permanen              | `DELETE /tasks/:id`, `bulk-delete`     |

**Ketetapan yang mengikat seluruh matriks:** `D` hanya dimiliki Project Owner,
Project Admin, dan Project Manager — kecuali `QA` pada modul `qa`. Pelaksana
(`Contributor`) **tidak pernah menghapus**. Ini yang menutup #66 dan #72 secara
struktural, bukan per rute.

`R + U` berarti boleh mengubah yang sudah ada tetapi tidak boleh membuat baru —
dipakai pada `board` (memindahkan kartu) dan `access` (mengubah peran anggota).

### 19.8 Keadaan pengerjaan

| Tahap | Isi                                                                             | Status                                                                                                                                        |
| :---: | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
|   0   | Katalog peran di `MasterData`                                                   | ✅ **SELESAI 16 Agu** — `npm run db:seed-roles`. Katalog final: **4 SYSTEM + 8 PROJECT**, terverifikasi tampil di layar Master Data           |
|   1   | Satu enum peran, satu tempat. Hapus `\| string`, satukan dua `AppRole`          | ✅ **SELESAI 16 Agu** — `src/types/roles.ts`. Jadi **DUA** enum, bukan satu; alasan & temuan #87 di §19.15. 13 test mengikat enum ke penyemai |
|   2   | Penjaga saat boot — server menolak menyala bila rute memakai peran di luar enum | ✅ **SELESAI 16 Agu** — `MODE = TOLAK`. §19.24                                                                                                |
|   3   | Migrasi data `ProjectMembers` (10 baris) & `Users` (11 baris)                   | ✅ **SELESAI 16 Agu** — `npm run db:migrasi-peran`. 7 baris `member` -> `developer`. Sesudahnya 8 developer + 2 manager, semua kode katalog   |
|   4   | `verifyProjectAccess` baca matriks terpusat + deny-by-default                   | ✅ **SELESAI 16 Agu** — 54 dari 54 rute. Penjaga lama NOL pemakai. §19.24                                                                     |
|  5a   | **Dropdown & tampilan peran dari katalog** (#82)                                | ✅ **SELESAI 16 Agu** — 6 dropdown + 4 tampilan, nol hardcode, kolom `code` di MasterData                                                     |
|  5b   | `can(action, module, projectId)` menggantikan 36 `hasPermission` di 13 berkas   | `TERBUKA`                                                                                                                                     |
|   6   | Panel "Active System Permissions & Overrides" jadi **baca-saja**                | `TERBUKA`                                                                                                                                     |

**Tahap 1 dan 2 tidak butuh keputusan apa pun** dan bisa dikerjakan kapan saja.
Keduanya kecil, tidak mengubah perilaku, tetapi langsung membuat kompilator dan
server menolak 11 nama peran hantu.

⚠️ Sekarang adalah saat termurah: **10 baris `ProjectMembers`, 11 baris
`Users`, 2 proyek**. Setahun lagi angka ini bisa ribuan.

### 19.9 Empat keputusan yang menahan Tahap 3 ke atas

| #   | Keputusan                                                                 | Rekomendasi                                                                                                                                                     |
| --- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| K1  | 6 project role, atau 8 dengan System Analyst & Business Analyst terpisah? | ✅ **DIJAWAB: 8.** Pemilik proyek menetapkan System Analyst, Business Analyst, dan QA sebagai project role tersendiri, masing-masing menguasai penuh satu modul |
| K2  | Lead / Frontend / Backend Engineer pindah ke `jabatan`?                   | **Ya** — profesi, bukan izin                                                                                                                                    |
| K3  | Product Owner & Scrum Master dilebur ke Project Manager?                  | **Ya** — fungsinya beririsan                                                                                                                                    |
| K4  | Nasib `parentAdminId`                                                     | **Buang** — item #81, ditulis tapi tidak pernah dibaca                                                                                                          |

### 19.10 Kontrak dengan antarmuka — kekeliruan yang layak dicatat

Versi pertama penyemai membuat `type = 'system_role'` untuk peran sistem.
Barisnya masuk ke database dengan benar dan seluruh pemeriksaan sisi database
lulus — tetapi **tidak pernah muncul di layar**. Pemilik proyek yang
menemukannya: _"saya cek di data master untuk project role dan system role masih
kosong"_.

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
bagian ini menulis _"K1 terjawab implisit: 6 project role"_. Itu **keliru**.
Pemilik proyek sudah menyatakan sejak awal bahwa System Analyst, Business
Analyst, dan QA adalah **project role**; kalimat _"ganti yang anda rekomendasikan
tadi"_ menjawab soal **membersihkan katalog**, bukan membatalkan pernyataan itu.

Kekeliruannya ditemukan pemilik proyek sendiri: _"project role bukannya ada
banyak tadi, SA, BA, QA aja tidak ada"_. Katalog dikembalikan ke **8 peran**,
`Contributor` dihapus dan dipecah menjadi System Analyst, Business Analyst, dan
Developer.

**Pelajarannya:** rekomendasi tidak boleh menimpa pernyataan pemilik proyek, dan
sebuah pertanyaan yang belum dijawab tidak boleh dicatat sebagai "terjawab
implisit". Bila jawabannya tidak eksplisit, statusnya tetap `MENUNGGU`.

Sudah dikerjakan lewat `npm run db:seed-roles`:

| Aksi                | Isi                                                                                                                                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dihapus** (9)     | `Product Owner`, `Scrum Master` (K3 — dilebur ke Project Manager) · `Lead Developer`, `Frontend Engineer`, `Backend Engineer` (K2 — profesi, bukan izin) · 4 baris `system_role` keliru dari versi pertama |
| **SYSTEM** (4)      | Administrator · Department Head · Standard User · Observer                                                                                                                                                 |
| **PROJECT** (8)     | Project Owner · Project Admin · Project Manager · System Analyst · Business Analyst · Developer · QA · Viewer                                                                                              |
| **Jabatan** (+2)    | Frontend Engineer · Backend Engineer                                                                                                                                                                       |
| **Typo diperbaiki** | `"Businnes Analyst"` → `"Business Analyst"`                                                                                                                                                                |

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
_"di dropdown detail user yang project role dan system role tidak sama nih
datanya dengan data master"_.

Benar. Katalog `MasterData` sudah rapi, tetapi **antarmuka tidak membacanya**.

#### 19.12.1 Dropdown SYSTEM ROLE — hardcoded + duplikat

`src/features/users/UserDetailView.tsx:685`. Lima opsi ditulis langsung di JSX,
lalu Master Data ditambahkan dengan penyaring yang tidak lengkap.

| Yang tampil                   | Nilai tersimpan   | Asal                              |
| ----------------------------- | ----------------- | --------------------------------- |
| Administrator (Full Access)   | `admin`           | hardcoded                         |
| Department Head (Head)        | `head`            | hardcoded                         |
| **Project Manager (Manager)** | `manager`         | hardcoded — **bukan system role** |
| Standard User (User)          | `user`            | hardcoded                         |
| Observer (Viewer - Read Only) | `viewer`          | hardcoded                         |
| **Department Head**           | `Department Head` | MasterData — **duplikat**         |
| **Standard User**             | `Standard User`   | MasterData — **duplikat**         |
| **Observer**                  | `Observer`        | MasterData — **duplikat**         |

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

| Dropdown                                           |      Ada di katalog?      |
| -------------------------------------------------- | :-----------------------: |
| Project Admin · Project Manager · Viewer · Owner   |            ✅             |
| **Project Lead** · **Member**                      |       ❌ tidak ada        |
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

#### 19.12.5 Kartu verifikasi #82 — SELESAI 16 Agu 2026

**Ketetapan pemilik proyek:** tidak boleh ada daftar peran yang ditulis di kode;
semuanya berparameter, dan parameternya dari Master Data. Dicatat sebagai aturan
tetap §0.5 nomor 9.

| Sebelum                                                                 | Sesudah    |
| ----------------------------------------------------------------------- | ---------- |
| **6 dropdown hardcoded** di 3 berkas                                    | **0**      |
| `Department Head` tampil 2× dengan nilai `head` dan `"Department Head"` | tampil 1×  |
| `Project Manager` muncul sebagai system role                            | tidak lagi |
| `lead` & `member` bisa dipilih padahal tak ada di katalog               | tidak lagi |
| System Analyst, Business Analyst, Developer, QA **tak bisa dipilih**    | **bisa**   |

Dropdown keenam ditemukan saat pengerjaan — `AdminUserPanel.tsx:1221`, terlewat
dari pemindaian awal karena berada jauh di bawah lima yang lain.

**Kolom `code` ditambahkan ke `MasterData`.** Inilah nilai yang disimpan ke
`Users.role` dan `ProjectMembers.role` — bukan `label`. Dengan begitu mengganti
nama tampilan sebuah peran tidak merusak otorisasi. Baris katalog tanpa `code`
sengaja **dilewati**, bukan ditebak dari label: menebak dari label persis cara
`Department Head` dulu tersimpan sebagai `"Department Head"`.

Seluruhnya dipusatkan di `src/lib/roleCatalog.ts` — satu berkas, satu sumber.

**Terverifikasi di layar** dengan sesi Administrator:

```
System Role  : Administrator·admin · Department Head·head ·
               Standard User·user · Observer·viewer
Project Role : Project Owner·owner · Project Admin·admin ·
               Project Manager·manager · System Analyst·system_analyst ·
               Business Analyst·business_analyst · Developer·developer ·
               QA·qa · Viewer·viewer
```

+8 test perilaku. Gerbang: tsc 0 · lint 0 · **264 test / 29 suite** · build
sukses · 0 error console.

##### Lanjutan — tampilan peran juga ikut dibersihkan

Pemilik proyek menemukan sisanya setelah dropdown diperbaiki: _"di project ada
juga bukannya itu role project, tapi datanya beda dengan di master data"_.

Benar. Dropdown sudah membaca katalog, tetapi **tampilan** peran masih
menampilkan nilai mentah database. Layar menyebut `MANAGER`, Master Data
menyebut `Project Manager` — dua nama untuk hal yang sama, dan wajar dikira
data berbeda.

Empat tempat lagi diperbaiki, semuanya memakai `labelPeran()` dari katalog:

| Berkas                        | Sebelumnya                                                   |
| ----------------------------- | ------------------------------------------------------------ |
| `UserDetailView.tsx:1163`     | nilai mentah + cadangan `"Owner"`/`"Member"` ditulis di kode |
| `TeamManagementPanel.tsx:396` | cadangan `"Team Member"`                                     |
| `TeamManagementPanel.tsx:495` | cadangan `"Team Member"`                                     |
| `TeamManagementPanel.tsx:617` | cadangan `"Member"`                                          |

Ditambah **penanda visual**: peran yang TIDAK ada di katalog kini ditampilkan
dengan lencana kuning beserta keterangan _"perlu dimigrasikan"_, bukan
disamarkan sebagai peran normal. Nilai `member` yang masih tersisa di
`ProjectMembers` karena itu langsung terlihat — dan itu memang tujuannya.

##### Position ≠ System Role — pertanyaan yang wajar muncul

Pemilik proyek juga bertanya apakah `Position` sama dengan System Role.
**Tidak.** `Position` adalah **jabatan organisasi**; System Role adalah **hak
akses**. Contoh nyata dari data sendiri: Dimas M Wibowo berjabatan
`Project Manager` tetapi System Role-nya `Standard User` — dan itu memang
perilaku yang benar untuk Two-Tier.

Kebingungannya tetap beralasan: `jabatan` memuat nama yang mirip peran —
`Project Manager`, `Department Head`, `QA Engineer`, `Product Owner`. Secara
teknis tidak salah, tetapi menyulitkan pembacaan. Perlu diputuskan apakah nama
jabatan yang bertabrakan dengan nama peran sebaiknya diubah.

⚠️ **BELUM ditutup, dan penting:** empat project role baru (System Analyst,
Business Analyst, Developer, QA) kini **bisa dipilih**, tetapi penjaga rute
belum mengenalinya — `verifyProjectAccess` masih memakai daftar peran lama.
Pengguna yang diberi peran itu hanya akan lolos rute ber-`['*']`. Ini ditutup
**Tahap 4** (§19.8), dan sebaiknya dikerjakan segera sesudah ini.

---

### 19.13 Temuan #83 — `position` dan `department` tidak fungsional

Muncul dari pertanyaan pemilik proyek 16 Agu 2026: _"berarti position ini tidak
ada fungsi ya, cuma sekadar data aja? yang penting itu system role dan project
role ya"_. Diperiksa, dan **benar**.

#### Bukti

| Kolom              | Dipakai untuk logika? | Ditemukan di                                                                                          |
| ------------------ | :-------------------: | ----------------------------------------------------------------------------------------------------- |
| `Users.position`   |       **Tidak**       | Hanya diteruskan di respons (`auth.service.ts:36`); di frontend hanya ditampilkan dan ikut CSV export |
| `Users.department` |       **Tidak**       | Hanya `SELECT` dan `UPDATE`; tidak ada satu pun `if`, filter, atau penjaga yang membacanya            |

Tidak ada satu pun percabangan otorisasi yang menyentuh keduanya. Murni data
deskriptif — setara nomor telepon.

**Yang benar-benar menentukan hak akses hanya dua:**

```
System Role  -> hak DI LUAR proyek    (Users.role)
Project Role -> hak DI DALAM proyek   (ProjectMembers.role)
```

#### ⚠️ Akibatnya: satu baris di §19.4 belum bisa dijalankan

§19.4 menetapkan **Department Head** _"melihat seluruh proyek di
departemennya"_. Itu **tidak mungkin** selama `department` tidak fungsional.
Cacat ini ada di rancangan, bukan di kode — dan baru ketahuan karena pemilik
proyek menanyakan hal lain.

|       | Pilihan                                                                 | Konsekuensi                                                                                          |
| ----- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **A** | Department Head hanya melihat proyek yang ia jadi anggota               | Paling sederhana. Pembeda dengan Standard User tinggal akses baca Master Data & audit log            |
| **B** | Buat `department` fungsional — proyek ikut berdepartemen, lalu disaring | Sesuai maksud awal. Kolom `Projects.department` **sudah ada** (hasil #79), tinggal diisi dan dipakai |
| **C** | Department Head melihat semua proyek                                    | Paling longgar; nyaris menyamai Administrator                                                        |

**Rekomendasi: B** — kolomnya sudah ada, jadi biayanya hanya mengisi dan
menyaring. Menambah satu langkah kecil di Tahap 4.

#### Pelajarannya

Rancangan yang menyebut sebuah kolom **tidak otomatis berarti kolom itu bekerja**.
§19.4 ditulis dari asumsi bahwa `department` sudah dipakai, padahal ia hanya
tersimpan. Sebelum sebuah atribut dipakai untuk otorisasi, periksa dulu apakah
ada yang membacanya — persis pemeriksaan yang menemukan #81 (`parentAdminId`)
dan #83 ini.

---

### 19.14 Perapian Master Data — #84 SELESAI, #85 & #86 menunggu

Diminta pemilik proyek 16 Agu 2026: _"saya melihat data master kita masih data
tidak sesuai, baru yang role ok, sisanya bolong-bolong"_, dengan izin hard
update/hard delete. Dikerjakan lewat `npm run db:seed-master` — idempoten.

#### 19.14.1 Masalah yang ditemukan

Bukan sekadar data kurang. Yang terberat: **tidak ada konvensi apa yang
disimpan**.

| Kolom data hidup    | Isinya                                                              | Masalah                                                                                         |
| ------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `Users.department`  | `dept-1` (9) · `Technology & IT` (1)                                | id dan label bercampur; labelnya bahkan tidak ada di master (master menyebut `IT & Technology`) |
| `Users.position`    | UUID (2) · `jab-2` (5) · `Project Manager` · `System Administrator` | **empat format berbeda**                                                                        |
| `Projects.category` | `Agile`                                                             | tidak ada di master mana pun                                                                    |
| `Projects.status`   | `Active`                                                            | tidak ada master status proyek                                                                  |
| `Documents.type`    | `flowchart`                                                         | tidak ada di `jenis_dokumen`                                                                    |

Ditambah data yang bolong: satu baris sampah berlabel `"n"` di `priority`,
lima baris ber-`order=0` tanpa metadata, dan `environment` tidak punya **SIT**
padahal `QATestCases.tipeTesting` sudah memakainya.

#### 19.14.2 Yang dikerjakan

Acuan: konvensi Jira, GitLab, dan Azure DevOps. Tipe khas domain LanPro —
`fitur`, `modul_aplikasi`, `release`, `system`, `surrounding` — tidak
diseragamkan ke benchmark mana pun karena memang milik domain ini.

| Tipe                                                                 | Hasil                                                                                                                                                                             |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `priority`                                                           | **5 tingkat** Jira: Highest · High · Medium · Low · Lowest. Baris `"n"` dihapus, `Urgent` digantikan `Highest`                                                                    |
| `status`                                                             | **8 keadaan**: Backlog · To Do · In Progress · In Review · Testing · **Blocked** · Done · **Cancelled**. Blocked & Cancelled sebelumnya tidak ada, padahal keduanya keadaan nyata |
| `issue_type`                                                         | 5 jenis Jira; label sudah benar, tinggal kode & metadata                                                                                                                          |
| `environment`                                                        | **SIT ditambahkan** di antara DEV dan STG                                                                                                                                         |
| `jenis_dokumen`                                                      | 5 → **8**, ditambah Test Plan, Flowchart, Meeting Minutes                                                                                                                         |
| `project_status`                                                     | **TIPE BARU** — `Projects.status` sudah berisi `Active` tanpa master                                                                                                              |
| `methodology`                                                        | **TIPE BARU** — `Projects.category` berisi `Agile` tanpa master                                                                                                                   |
| `department`, `jabatan`, `fitur`, `system`, `release`, `surrounding` | label dipertahankan, metadata & kode dilengkapi                                                                                                                                   |

**Aturan yang dipegang:** label yang SEDANG DIPAKAI data hidup tidak diubah.
Mengubah `To Do` menjadi `Todo` akan membuat 27 task kehilangan statusnya.

#### 19.14.3 Dedup dan migrasi rujukan

Penyemaian pertama **menduplikasi** — baris lama memakai pola id beragam
(`prio-2`, `stat-1`, `dept-1`, UUID), sehingga baris baru berdampingan alih-alih
menimpa. Ditambahkan tahap dedup dengan aturan: bila satu label punya dua baris
dan salah satunya sudah ber-kode, yang tanpa kode adalah duplikat.

**21 duplikat dihapus**, dan sebelum dibuang rujukan data hidup dipindahkan:

```
Users.department : 9 baris  dept-1 -> ecd
Users.position   : 9 baris  id/label -> kode
```

Hasil akhir: **16 tipe, seluruhnya 100% ber-kode.**

⚠️ **Dua nilai yatim sengaja TIDAK ditebak**, hanya dilaporkan:
`Users.department = "Technology & IT"` (1 baris) dan
`Users.position = "System Administrator"` (1 baris). Menebak pemetaannya persis
cara `Technology & IT` dulu tersimpan padahal master menyebutnya
`IT & Technology`.

#### 19.14.4 Daftar tipe di antarmuka juga hardcoded

Ditemukan saat verifikasi: dua tipe baru **tidak muncul di layar**. Penyebabnya
`MasterDataPanel.tsx` mencantumkan 14 tipe secara tetap, sehingga tipe baru di
database tidak pernah terlihat sampai berkas itu ikut disunting.

Diperbaiki sesuai aturan §0.5 nomor 9 — daftar tipe kini **diturunkan dari
data**, dengan peta label hanya untuk memperindah nama yang dikenal. Menambah
tipe baru cukup lewat database.

#### 19.14.5 #85 — `category` memuat dua konsep

`category` berisi campuran:

| Isi                                           | Sebenarnya                                      |
| --------------------------------------------- | ----------------------------------------------- |
| Backend · Frontend · DevOps                   | area teknis                                     |
| Bug · Enhancement · New Feature · Maintenance | jenis pekerjaan — **menduplikasi `issue_type`** |

Kode dilengkapi agar konsisten, tetapi **pemisahannya menunggu keputusan**.
Pilihan: pecah jadi `tech_area` + buang yang menduplikasi `issue_type`, atau
biarkan sebagai kategori bebas.

**SELESAI 17 Agu 2026 — Opsi B (bersihkan duplikat, pertahankan nama `category`).**

Keputusan pemilik proyek: `category` tetap menjadi area teknis; entri yang
menduplikasi `issue_type` dihapus dari Master Data.

Yang dikerjakan di `scripts/db/seed-master-data.cjs`:

1. **Hapus 4 entry duplikat** dari tipe `category`: `md-category-bug`,
   `md-category-enhancement`, `md-category-new_feature`,
   `md-category-maintenance`.
2. **Pindah jadi array `CATEGORY` terstruktur** — area teknis murni:
   Backend · Frontend · DevOps · Security · Infrastructure · Database.
3. **Migrasi data** — `Tasks.category` yang berisi kode lama:
   - `bug` → `issue_type = 'bug'`, `category = NULL`
   - `enhancement` / `new_feature` → `issue_type = 'story'`, `category = NULL`
   - `maintenance` → `category = NULL` (tidak ada padanan `issue_type`)
4. **Fallback `masterDataService.ts`** diselaraskan ke nilai baru.

Setelah seed dijalankan, `category` di Master Data hanya mengandung area teknis.

#### 19.14.6 #86 — `modul_aplikasi` punya dua sumber

`MasterDataPanel.tsx:485` menghitung `modul_aplikasi` dari tabel
**`ProjectModules`**, bukan dari `MasterData` — sementara `MasterData` punya 4
baris bertipe `modul_aplikasi` yang tidak pernah ditampilkan.

**SELESAI 17 Agu 2026 — `ProjectModules` ditetapkan sebagai sumber kebenaran tunggal.**

1. `scripts/db/seed-master-data.cjs`: `modul_aplikasi` dicabut dari `KODE_SAJA` dan
   ditambahkan query pembersihan seluruh baris bertipe `modul_aplikasi` dari tabel `MasterData`.
2. `MasterDataPanel.tsx`: `masterDataTypes` menyertakan `modul_aplikasi` secara eksplisit
   agar tab Modul / Aplikasi tetap tampil di antarmuka dengan membaca tabel `ProjectModules`.

---

### 19.15 Tahap 1 — hasilnya, dan satu temuan yang lahir dari kompilator

Dikerjakan 16 Agu 2026. Berkasnya `src/types/roles.ts`, testnya
`src/types/roles.test.ts` (13 test).

#### Kenapa jadi DUA enum, padahal §19.8 menulis "satu enum"

Setelah katalog final disemai (tahap 0), "satu enum" ternyata **tidak bisa
dilakukan tanpa merusak otorisasi**. Dua kode bertabrakan antar lingkup:

| `code`   | SYSTEM        | PROJECT       |
| -------- | ------------- | ------------- |
| `admin`  | Administrator | Project Admin |
| `viewer` | Observer      | Viewer        |

Tabrakan `admin` bukan sekadar membingungkan, melainkan berbahaya: di
`server/middleware/rbac.ts` nilai `admin` memicu **God Mode lintas proyek**. Satu
enum gabungan membuat kompilator tidak lagi bisa membedakan Project Admin dari
Administrator sistem — dan Project Admin akan terbaca sebagai pemegang God Mode
di seluruh proyek.

Yang dituntut §19 tetap terpenuhi: satu tempat, tanpa `| string`. Yang berubah
hanya bentuknya — lingkupnya dipisah di tingkat **tipe**, bukan cuma di data.

#### Item #87 — `effectiveRole` membawa dua kosakata sekaligus

Ini **tidak ditemukan dari membaca kode**. Ia muncul saat `| string` dicabut dan
kompilator menandai `normRole === 'manager'` sebagai perbandingan yang mustahil,
sebab `manager` bukan peran SYSTEM.

Dugaan pertama: kode mati, hapus saja. **Dugaan itu salah**, dan diperiksa
sebelum dihapus. `useAuth.effectiveRole` bisa berisi nilai dari `Users.role`
(lingkup SYSTEM) **maupun** dari `ProjectMembers.role` (lingkup PROJECT), dan
`ProjectMembers.role` memang memuat `manager` — 2 baris nyata (§19.2). Nilainya
benar-benar sampai ke `hasPermission`.

Jadi satu variabel membawa dua kosakata yang berbeda artinya, lalu diperiksa
terhadap **satu** matriks izin. Inilah bentuk konkret #76: selama lingkup tidak
ikut dibawa, tidak ada cara memastikan sebuah peran diadu dengan matriks yang
benar.

Penanganannya sengaja **bukan** menambal, melainkan **menamai**: tipe
`PeranEfektif`. Setiap pemakaiannya adalah satu tempat yang **tahap 4 wajib
datangi**. Menambalnya sekarang justru akan menyembunyikan peta itu.

#### Yang benar-benar mati, dan dihapus

Tiga cabang kosmetik badge `manager` pada peran **SISTEM**
(`AdminUserPanel`, `UserDetailView` ×2). §19.4 menetapkan Project Manager bukan
peran sistem, dan `Users.role` memuat nol `manager` — cabang itu tidak pernah
menyala. Hanya kelas CSS dan ikon; nol perubahan perilaku.

#### `Record` yang berbohong

`DEFAULT_PERMISSIONS` dan `ROLE_DESCRIPTIONS` dulu bertipe `Record` penuh,
sehingga kompilator mengira seluruh peran tercakup. Kenyataannya **5 dari 12**
peran katalog yang punya baris; tujuh peran proyek — termasuk empat peran baru
System Analyst, Business Analyst, Developer, QA — jatuh ke `viewer` lewat
cadangan. Diubah jadi `Partial`, bukan untuk melonggarkan melainkan supaya
kesenjangan itu **terbaca**. Tahap 4 yang menutupnya.

#### Gerbang tahap 1

| Cek                 | Hasil                                                                       |
| ------------------- | --------------------------------------------------------------------------- |
| `tsc --noEmit`      | 0 error (dari 0; sempat 16 saat `\| string` dicabut, semuanya diselesaikan) |
| Test                | **277 lulus / 30 suite** — naik tepat +13 test, +1 suite                    |
| Build               | sukses                                                                      |
| Browser, tab bersih | layar Sign In tampil normal                                                 |

⚠️ **Jebakan §0.6 hampir memakan korban lagi.** `npm run dev` keluar dengan
`Port 3000 is already in use` — ada server sisa sesi sebelumnya (menyala 13:13)
yang masih memegang port itu. `curl` menjawab 200 dalam 1 detik, dan bila
berhenti di situ verifikasinya akan dinyatakan lulus **terhadap kode lama**.
Server itu dimatikan lebih dulu, lalu dinyalakan ulang; PID-nya diperiksa
berganti sebelum browser dibuka.

**Belum terverifikasi:** 1 error konsol `WebSocket connection to
'ws://localhost:3000/' failed` di layar login. Diff tahap 1 tidak menyentuh
socket sama sekali (nol kecocokan untuk `socket`/`WebSocket`/`io(`), jadi
kemungkinan besar ia sudah ada sebelumnya — tetapi §0.1 mengklaim "0 error
console", jadi salah satunya perlu diukur ulang. Belum dilakukan.

### 19.16 Tahap 2 & 3 — matriks terpusat dan penjaga saat boot

Dikerjakan 16 Agu 2026. Dua berkas baru, keduanya **belum menegakkan apa pun**:

| Berkas                                 | Isi                                       | Test |
| -------------------------------------- | ----------------------------------------- | ---- |
| `src/lib/matriksAkses.ts`              | §19.4 + §19.5 sebagai data + fungsi murni | 26   |
| `server/middleware/daftarPeranRute.ts` | pendataan penjaga rute saat boot          | 12   |

Penegakannya tahap 4. Dipisah dengan sengaja: matriksnya bisa diuji lengkap
terhadap §19 **sebelum** ada satu permintaan pun yang ditolak olehnya.

#### Testnya MEMBACA dokumen ini, bukan menyalinnya

`matriksAkses.test.ts` mengurai tabel §19.4 dan §19.5 dari `AUDIT.md` lalu
membandingkannya dengan matriks — baris per baris, 16 modul.

Menyalin tabel ke dalam test hanya akan memindahkan tempat penyimpangan bisa
lahir: kode dan test sama-sama salah, dokumennya benar, dan semua tetap hijau.
Itu bentuk lain dari §13.14 dan §19.10.

**Testnya dibuktikan bisa merah**, lewat `git worktree` di luar repo sesuai
§0.5 aturan 4. `viewer` diberi `CRUD` pada modul `list` — bentuk persis #66 — dan
2 test langsung gagal: perbandingan dokumen untuk `list`, dan aturan "viewer
tidak pernah C/U/D".

⚠️ Percobaan pertama pembuktian itu **gagal dan sempat terbaca sebagai test yang
tumpul**: kunci `viewer` ditambahkan di AWAL objek padahal `viewer` sudah ada di
bawahnya, sehingga kunci belakangan menimpanya dan sabotasenya jadi tanpa efek.
26 test tetap hijau. Yang salah sabotasenya, bukan testnya. Layak dicatat karena
"test tidak merah" hampir dipercaya sebagai kesimpulan.

#### Penjaga boot mendaftar saat rute dipasang, bukan memindai teks

§13.11 mencatat aturan "hasil pemindaian bukan temuan, wajib dibaca isinya" —
lalu #80 tetap luput karena nama rutenya terbaca seperti utilitas demo.
Memindai teks berkas mengulang kelemahan yang sama: ia melihat apa yang
TERTULIS. `verifyProjectAccess` kini mendaftarkan dirinya saat dipanggil, jadi
yang tercatat adalah penjaga yang **benar-benar terpasang**.

#### Gerbangnya menangkap kekeliruannya sendiri

Versi pertama dipanggil di tengah pemasangan rute, sesudah `discussion-points`.
Hasilnya:

```
[RBAC] 31 penjaga rute terdaftar · 18 ber-["*"] polos · 0 korslet
```

**0 korslet padahal #73 nyata ada.** Sebabnya `file.routes`, `user.routes`, dan
`project.routes` baru dipasang ratusan baris sesudahnya. Gerbang yang menghitung
separuh isi lebih berbahaya daripada tidak ada gerbang — ia memberi rasa aman
yang salah, persis cara gerbang F0 dulu dinyatakan lulus.

Sesudah dipindah ke tempat seluruh rute selesai terpasang:

```
[RBAC] 54 penjaga rute terdaftar · 31 ber-["*"] polos · 1 korslet ("*" + peran lain, #73)
[RBAC] peran warisan masih terpakai: designer, head, member — menunggu pemetaan
```

**54 = 54** terhadap hitungan statis `grep`, dan `designer` yang tadi luput kini
muncul. Angka ini juga memperbarui §19.2: **31 dari 54 penjaga (57%)** berbunyi
`["*"]` polos — badan #66 dan #72 dalam satu angka.

#### Kenapa masih mode LAPOR, belum menolak

Menyalakan penolakan hari ini membuat server **langsung mati**: 7 penjaga
memakai `member`/`designer`, dan `head` dipakai sebagai peran proyek padahal ia
peran sistem. Pemetaan `member` masih menunggu Anda. Menaikkannya cukup mengubah
`MODE` di `daftarPeranRute.ts`, dan ada test yang berjaga supaya kenaikan itu
tidak terjadi tanpa sengaja.

#### Gerbang tahap 2 & 3

| Cek                 | Hasil                                              |
| ------------------- | -------------------------------------------------- |
| `tsc --noEmit`      | 0 error                                            |
| Test                | **315 lulus / 32 suite** — naik +38 test, +2 suite |
| Build               | sukses                                             |
| Browser, tab bersih | layar Sign In tampil normal                        |

⚠️ **Kerusakan yang saya perbuat dan sudah diperbaiki.** Saat membersihkan
worktree pembuktian, perintah penghapusan menembus symlink dan mengosongkan
sebagian `node_modules` repo — `.bin/` dan `@google/*` hilang, dan `tsc` sempat
melaporkan 5 modul tak ditemukan. Dipulihkan dengan `npm install`;
`package.json` dan `package-lock.json` tidak berubah. Pelajarannya: worktree
pembuktian jangan disambungkan ke `node_modules` repo asli.

### 19.17 Keputusan pemilik proyek 16 Agu 2026 — peran warisan

Menjawab tiga pertanyaan yang menahan §19.8 tahap 3 dan 4.

| Peran                       | Keputusan                                                 | Akibatnya                                                                      |
| --------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `designer`                  | **DIBUANG.**                                              | 1 penjaga rute, **nol** baris data. Dicabut saat tahap 4 menulis ulang penjaga |
| `head` sebagai peran PROYEK | **DICABUT.** Ia peran SISTEM, sesuai §19.6 aturan 1       | 15 penjaga rute menyebutnya. Dicabut saat tahap 4                              |
| `member`                    | **BELUM** — pemilik proyek meminta rekomendasi lebih dulu | Lihat §19.18                                                                   |

⚠️ Pencabutan `designer` dan `head` sengaja **TIDAK** dikerjakan sebagai
perubahan lepas, melainkan menunggu tahap 4. Alasannya: mencabut `head` dari 15
penjaga tanpa matriks yang menggantikannya akan mengunci pengguna berperan
`head` (1 baris nyata) keluar dari proyek yang sah ia akses. Urutannya harus
matriks dulu, baru pencabutan — bukan sebaliknya.

Pencabutan `head` juga bersinggungan dengan **#83** (Department Head A/B/C) yang
masih menunggu: keputusan itu menentukan proyek mana yang boleh ia lihat.

### 19.18 Rekomendasi pemetaan `member` — menunggu persetujuan

`member` mengisi **7 dari 10** baris `ProjectMembers.role`. Ia bukan peran
katalog, jadi tahap 4 tidak bisa jalan sebelum ia punya tujuan.

**Rekomendasi: `member` → `developer`.**

Dasarnya bukan selera, melainkan tiga pengukuran:

1. **Kode sudah memperlakukan keduanya identik.** Di **seluruh 6** penjaga rute
   tempat `member` muncul, bentuknya sama persis:
   `verifyProjectAccess(["admin", "manager", "head", "developer", "member"])`.
   Tidak ada satu pun penjaga yang membedakan `member` dari `developer`. Ini
   pengulangan persis masalah yang §19.3 sebut: dua nama, hak akses sama, tidak
   ada yang tahu bedanya.
2. **Memetakan ke `viewer` akan MENCABUT hak 7 dari 10 anggota.** `viewer` di
   §19.5 hanya `R` di seluruh modul, jadi tujuh orang yang hari ini bisa membuat
   dan mengubah task akan kehilangan kemampuan itu. Itu regresi bagi pengguna
   nyata, bukan pengetatan keamanan.
3. **`developer` tetap LEBIH KETAT daripada keadaan sekarang.** Hari ini 31 dari
   54 penjaga berbunyi `["*"]`, artinya anggota berperan apa pun boleh apa saja.
   Sesudah dipetakan ke `developer`, §19.5 memberi `CRU` di `list`, `R + U` di
   `board`, dan `R` di sisanya — **tanpa `D` di mana pun**. Jadi arah
   perubahannya tetap mengetat, bukan melonggar.

Padanan benchmark §19.3: `developer` setara tingkat _Developer_ di GitLab —
kontributor umum, bukan pengelola.

**Yang perlu Anda lakukan:** cukup jawab setuju atau tidak. Bila setuju, tahap 3
(migrasi data 10 baris `ProjectMembers`) dan tahap 4 bisa dikerjakan berurutan
tanpa pertanyaan lain.

### 19.19 Tahap 3 & 4 — migrasi data dan penjaga berbasis matriks

Dikerjakan 16 Agu 2026, sesudah pemilik proyek menyetujui `member` → `developer`.

#### Tahap 3 — SELESAI, sudah dijalankan ke Neon

`npm run db:migrasi-peran` — **bawaannya uji-coba**, tidak menyentuh satu baris
pun tanpa `--tulis`. Idempoten, dibuktikan dengan menjalankannya ulang.

| Tabel                 | Sebelum                            | Sesudah                     |
| --------------------- | ---------------------------------- | --------------------------- |
| `ProjectMembers.role` | 7 member · 2 manager · 1 developer | **8 developer · 2 manager** |
| `Users.role`          | 8 user · 1 admin · 1 head          | tidak berubah — sudah sah   |

**Nol perubahan perilaku.** Di seluruh 6 penjaga tempat `member` muncul, ia
selalu berdampingan dengan `developer`, dan keduanya sama-sama tidak punya baris
di `DEFAULT_PERMISSIONS`. Yang berubah hanya namanya jadi kode katalog.

Catatan pengukuran: §19.2 menulis `Users` 11 baris; yang terbaca hari ini 10.
Selisih 1 belum ditelusuri.

#### Tahap 4 — SEBAGIAN. Penjaganya jadi, pemasangannya belum

`server/middleware/jagaProyek.ts` — `jagaProyek(modul, aksi)` menggantikan
`verifyProjectAccess(daftarPeran)`. Rute tidak lagi punya pendapat tentang
peran; ia menyebut modul + aksi, dan matriks yang menjawab.

18 test perilaku menegakkan urutan §19.6: God Mode hanya Administrator · `head`
BUKAN God Mode · bukan anggota = 403 · `viewer` tidak boleh `D` (#66) ·
`developer` tidak boleh `D` di luar wilayahnya (#72) · `QA` boleh `D` hanya di
modul `qa` · peran tak dikenal ditolak · **galat DB jadi 500, tidak pernah
lolos**.

⚠️ **BELUM DIPASANG DI 54 RUTE.** Itu batas yang harus dinyatakan terang-terangan:
selama pemasangan belum dilakukan, **#66, #68, #70, #71, #72, dan #73 BELUM
tertutup** di jalur permintaan nyata. Yang sudah ada adalah alatnya, teruji dan
siap. Pemasangannya pekerjaan tersendiri karena tiap rute harus dipetakan ke
modul + aksi yang benar, dan salah petakan = pengguna nyata terkunci.

Urutan yang disarankan saat memasangnya: mulai dari rute `DELETE` (#66, paling
berbahaya dan paling sedikit), lalu rute ber-`["*"]` polos (31 rute), terakhir
cabut `head` dan `designer` — sesudah itu `MODE` di `daftarPeranRute.ts` bisa
dinaikkan ke `TOLAK`.

#### Item #88 — God Mode belum tercatat di `AuditLogs`

§19.6 aturan 2 mewajibkan setiap pemakaian God Mode tercatat, sebab tanpa
pencatatan tidak ada cara mengetahui penyalahgunaannya. `catatGodMode()` saat
ini baru menulis ke log server, **belum ke tabel `AuditLogs`**.

Ini utang yang disengaja dan bernomor, bukan kelalaian: menulis ke `AuditLogs`
di dalam penjaga berarti satu `INSERT` pada setiap permintaan admin, dan bentuk
tulisannya perlu disepakati supaya tidak menenggelamkan log yang sudah ada.

#### Kekeliruan yang layak dicatat

Seluruh 18 test sempat merah dengan pesan yang **menyesatkan** — "next tidak
dipanggil" — padahal sebabnya `resetMocks: true` di `jest.config.cjs` menghapus
implementasi `jest.fn` di dalam factory `jest.mock`, sehingga `getConnection()`
mengembalikan `undefined`. Pesan gagalnya menunjuk ke logika otorisasi, bukan ke
koneksi. Sudah dicatat di kepala berkas testnya.

### 19.20 Pemasangan tahap 4 gelombang 1 — seluruh rute DELETE

Dikerjakan 16 Agu 2026. Gelombang pertama sengaja `DELETE`: paling berbahaya,
dan paling sedikit.

**10 rute dialihkan.** Laporan boot turun `54 → 44` penjaga lama — cocok persis
dengan jumlah yang dipindahkan, jadi tidak ada yang tercecer.

| Berkas              | Rute                                    | Penjaga baru                     |
| ------------------- | --------------------------------------- | -------------------------------- |
| `discussion-points` | discussionPoints/:pointId               | `jagaProyek("meetingNotes","D")` |
| `documents`         | documents/:id                           | `jagaProyek("wiki","D")`         |
| `meetings`          | meetings/:id                            | `jagaProyek("meetingNotes","D")` |
| `milestones`        | milestones/:id                          | `jagaProyek("timeline","D")`     |
| `sprints`           | sprints/:id                             | `jagaProyek("sprints","D")`      |
| `qa`                | qa-test-suites/:id · qa-test-cases/:id  | `jagaProyek("qa","D")`           |
| `task`              | tasks/:id · tasks/:taskId/links/:linkId | `jagaProyek("list","D")`         |
| `project`           | **/api/projects/:projectId**            | `jagaHapusProyek()`              |

#### Pengetatan nyata pada penghapusan proyek

Penjaganya dulu `verifyProjectAccess(["admin", "head"])`, sehingga anggota
proyek berperan `admin` — **Project Admin, bukan pemilik** — bisa menghapus
seluruh proyek. §19.5 memberi `D` atas proyek hanya kepada **Project Owner**.
Administrator sistem tetap menembus lewat God Mode.

Ini satu-satunya perubahan di gelombang ini yang bisa dirasakan pengguna. Bila
ada yang melaporkan tidak bisa lagi menghapus proyek, inilah sebabnya, dan itu
disengaja.

#### Tiga kekeliruan saya, semuanya ditangkap testnya sendiri

1. **Pendata rute hanya mengenali `router.delete`.** Dua rute DELETE QA dan satu
   di `sprints` memakai `app.delete` — ketiganya **tidak pernah terhitung**.
   Bukan dilaporkan longgar; hilang sama sekali dari himpunan. Diperlebar ke
   `(?:app|router)`.
2. **Penggantian di `sprints.routes.ts` mendarat di rute POST**, bukan DELETE,
   sehingga pembuatan sprint sempat dijaga sebagai aksi `D`. Dikembalikan.
3. **Pendata menilai teks KOMENTAR sebagai penjaga.** Catatan sejarah yang
   menyebut `["*"]` pada rute yang sudah benar memicu alarm palsu. Komentar kini
   dibuang lebih dulu — alarm palsu menumpulkan test secepat lubang menumpulkannya.

Ketiganya sejenis: **pengukur yang salah lebih berbahaya daripada tidak
mengukur.** Nomor 1 dan 3 keduanya membuat sesuatu yang salah terbaca benar.

`hak-hapus.test.ts` **diperbarui, bukan dihapus** — maksudnya masih berlaku,
yang usang hanya bentuk penjaga yang dikuncinya. Jendela pemindaiannya juga
diperlebar 400 → 900 karakter, sebab komentar yang diperpanjang diam-diam
menjatuhkan dua rute QA dari himpunan.

#### Sisa pekerjaan tahap 4

44 penjaga lama, di antaranya **31 ber-`["*"]` polos** dan **1 korslet (#73)**.
Gelombang berikutnya: rute `["*"]` polos, lalu cabut `head` dan `designer`,
baru `MODE` di `daftarPeranRute.ts` dinaikkan ke `TOLAK`.

⚠️ **#66 masih belum boleh ditutup sepenuhnya.** Rute DELETE-nya sudah aman,
tetapi #72 (16 rute POST/PUT/PATCH ber-`["*"]`) masih terbuka — dan keduanya
lahir dari lubang yang sama.

### 19.21 Gelombang 2 — seluruh rute wildcard dijaga matriks

Dikerjakan 16 Agu 2026. **31 rute** dialihkan dari `verifyProjectAccess(["*"])`
ke `jagaProyek(modul, aksi)`.

| Laporan boot      | Sebelum F7 | Sesudah gelombang 1 | Sesudah gelombang 2 |
| ----------------- | ---------: | ------------------: | ------------------: |
| penjaga lama      |         54 |                  44 |              **13** |
| ber-`["*"]` polos |         31 |                  31 |               **0** |
| korslet (#73)     |          1 |                   1 |                   1 |

**#72 tertutup secara struktural**, bukan per rute. `viewer` kini hanya membaca,
sesuai §19.5 — sebelumnya ia bisa membuat dan mengubah data di hampir seluruh
modul, karena `["*"]` berarti "anggota dengan peran apa pun" sejak #49.

#### Dua rute ambigu DIPERIKSA ISINYA, bukan ditebak dari namanya

Pelajaran #80 — nama rute bukan bukti tentang apa yang dilakukannya:

| Rute                        | Yang ditemukan di isinya                          | Aksi |
| --------------------------- | ------------------------------------------------- | :--: |
| `qa-test-cases/generate-ai` | nol `INSERT`/`UPDATE`, hanya mengembalikan usulan | `R`  |
| `qa-test-cases/sync`        | hanya `UPDATE`, tidak membuat baris baru          | `U`  |

Keduanya `POST`, dan menebak dari metodenya saja akan memberi `C` pada
keduanya — yang berarti tiga peran fungsional kehilangan akses ke fitur yang
sebenarnya tidak menulis apa-apa.

#### Satu pemetaan yang merupakan PERTIMBANGAN saya, bukan ketetapan §19

`POST /api/projects/:projectId/activity` → `list` `U`. Ia menulis `ActivityLogs`
sebagai efek samping tindakan tulis, jadi `viewer` memang tidak seharusnya
menghasilkannya. Dicatat terpisah supaya bisa dibantah, bukan disembunyikan di
tengah 31 rute lain.

#### Item #89 — `dashboard-layout` tidak bisa dinyatakan di matriks

Satu-satunya korslet yang tersisa (#73) adalah:

```ts
PUT /api/projects/:projectId/dashboard-layout
verifyProjectAccess(["admin","manager","head","developer","designer","viewer","*"])
```

Ia **tidak dialihkan**, dan itu disengaja. §19.5 memberi modul `dashboard` hanya
`R` kepada **seluruh** peran — tidak ada satu pun yang boleh menulis. Memetakan
rute ini ke `dashboard` `U` akan menolak semua orang dan mematikan fiturnya.

Ada dua kemungkinan, dan keduanya keputusan pemilik proyek, bukan tebakan saya:

1. Tata letak dashboard adalah **preferensi per-pengguna**, bukan sumber daya
   proyek — maka ia tidak semestinya berada di bawah matriks proyek sama sekali.
2. §19.5 memang perlu memberi `U` pada `dashboard` untuk sebagian peran.

Sampai dijawab, penjaga lamanya dibiarkan apa adanya. Mencabut `"*"` begitu saja
juga bukan perbaikan: daftar perannya tidak memuat `owner`, `system_analyst`,
`business_analyst`, maupun `qa`, sehingga keempatnya justru akan terkunci.

#### Testnya memeriksa lebih dari ketiadaan wildcard

`tanpa-wildcard.test.ts` juga menuntut: aksi masuk akal terhadap metode HTTP-nya,
dan **modul benar-benar ada di matriks**. Modul yang salah eja tidak memicu galat
apa pun — ia hanya menolak semua orang diam-diam, dan itu bentuk kegagalan yang
paling sulit disadari.

### 19.22 Gelombang 3 — tahap 4 hampir tutup

Dikerjakan 16 Agu 2026. **10 rute terakhir yang bisa dipetakan** dialihkan.

| Laporan boot           |               Sebelum F7 | Gel. 1 | Gel. 2 |          **Gel. 3** |
| ---------------------- | -----------------------: | -----: | -----: | ------------------: |
| penjaga lama           |                       54 |     44 |     13 |               **3** |
| ber-`["*"]` polos      |                       31 |     31 |      0 |               **0** |
| peran warisan terpakai | member · designer · head |    sda |    sda | **designer · head** |

**`member` hilang dari penjaga rute.** Ia sudah tidak ada di database (tahap 3)
maupun di kode. Yang tersisa hanya `designer` dan `head`, keduanya **hanya**
dari 3 rute yang belum dipetakan.

#### Pengetatan nyata: `bulk-delete`

`POST /api/projects/:projectId/tasks/bulk-delete` dulu mengizinkan `developer`
dan `member`. Ia **menghapus**, jadi dipetakan ke `list` `D` — yang menurut
§19.5 hanya milik Project Owner, Project Admin, dan Project Manager. Konsisten
dengan #66; sebelumnya penghapusan massal justru lebih longgar daripada
penghapusan satuan.

#### Tiga rute yang SENGAJA tidak dipetakan — perluasan #89

```
PUT  /api/projects/:projectId/dashboard-layout
PUT  /api/projects/:id                            sunting proyek
POST /api/projects/:projectId/methodology         setelan proyek
```

Ketiganya operasi **tingkat proyek**, bukan operasi pada sebuah modul. §19.5
hanya mengatur 11 modul plus `(hapus proyek)`; menyunting proyek, mengubah
metodologi, dan menyimpan tata letak dashboard tidak punya tempat di sana.

Menebak modulnya punya dua akibat, keduanya buruk: memetakan ke `dashboard` `U`
menolak **semua orang** (§19.5 memberi `dashboard` hanya `R`), sementara
memetakan ke modul lain memberi hak yang tidak pernah Anda tetapkan.

Yang dibutuhkan: satu baris tambahan di §19.5 yang menetapkan siapa boleh
menyunting proyek dan mengubah setelannya — atau ketetapan bahwa tata letak
dashboard adalah preferensi per-pengguna sehingga keluar dari matriks proyek.

#### Kekeliruan yang tertangkap

Tiga berkas test rute me-mock `middleware/rbac`. Begitu rutenya pindah ke
`jagaProyek`, penjaga sungguhan ikut jalan dan **seluruh testnya menjawab 403** —
dengan pesan gagal yang menunjuk ke logika rute, bukan ke penjaga yang tidak
dipalsukan. Pola yang sama persis sudah terjadi dua kali sesi ini (§19.19
`resetMocks`, §19.20 pendata komentar): **kegagalan pada perkakas uji menyamar
sebagai kegagalan pada kode yang diuji.**

Aturan metode-vs-aksi di `tanpa-wildcard.test.ts` juga dilonggarkan, tetapi
**tepat sasaran**: `POST` boleh `D` hanya bila jalurnya memang operasi hapus.
Melonggarkannya seluruhnya akan membuat `POST` apa pun lolos sebagai penghapus —
persis cara sebuah penjaga berhenti menjaga.

### 19.23 Penjaga lama dikunci pada 3 pemakai

`verifyProjectAccess` ditandai **JANGAN DIPAKAI UNTUK RUTE BARU**, dan daftar
pemakainya dikunci `server/routes/penjaga-lama.test.ts`.

Yang paling mungkin menghidupkannya kembali bukan keputusan sadar, melainkan
seseorang **menyalin baris rute yang sudah ada** saat menambah rute baru.
Penjaga lama itu izinkan-secara-bawaan; satu salinan mengembalikan lubang yang
baru ditutup, dan tidak akan disadari karena rutenya "bekerja".

Testnya **tidak melarang secara mutlak**. Melarang sesuatu yang masih dipakai
hanya membuat orang mematikan testnya. Ia mengunci daftarnya — pemakai keempat
harus dibicarakan lebih dulu. **Arahnya satu: boleh menyusut, tidak boleh
bertambah.** Bila #89 dijawab dan ketiganya pindah, hapus test itu bersama
`verifyProjectAccess`.

Satu test menjaga agar ketiganya tetap operasi **tingkat proyek**. Bila suatu
saat ada rute ber-modul masuk daftar, itu tanda ia sebenarnya BISA dipetakan
dan hanya terlewat — bukan tertahan #89.

#### Keadaan F7 saat serah terima

| Hal                         | Keadaan                                     |
| --------------------------- | ------------------------------------------- |
| Rute dijaga matriks         | **51 dari 54**                              |
| Penjaga lama tersisa        | **3**, semuanya menunggu #89                |
| Rute ber-`["*"]`            | **0**                                       |
| `member` di kode & database | **hilang**                                  |
| `MODE` penjaga boot         | `LAPOR` — naik ke `TOLAK` sesudah #83 & #89 |

Tahap 4 **belum boleh dinyatakan tutup**: tiga rute masih memakai penjaga lama,
dan `MODE` belum `TOLAK`. Yang sudah bisa dinyatakan: #66 dan #72 tertutup
secara struktural, dan tidak ada lagi rute proyek yang meloloskan anggota
berperan apa pun.

### 19.24 #89, #83, #88 dijawab — tahap 4 TUTUP

Dikerjakan 16 Agu 2026 sesudah pemilik proyek menjawab ketiganya.

| Laporan boot                       | Sebelum F7 |    Sekarang |
| ---------------------------------- | ---------: | ----------: |
| Penjaga lama `verifyProjectAccess` |         54 |       **0** |
| Rute ber-`["*"]`                   |         31 |       **0** |
| Korslet (#73)                      |          1 |       **0** |
| `MODE` penjaga boot                |          — | **`TOLAK`** |

#### #89 — benchmark Jira, dan kenapa hasilnya tidak diterapkan mentah-mentah

Pemilik proyek meminta pembanding ke Jira sebelum memutuskan. Hasilnya:

> Di Jira, sebuah dashboard **dimiliki pembuatnya**. Pemilik dan editor yang
> ditunjuk boleh menyuntingnya — termasuk mengubah tata letak — dan Jira
> Administrator dapat mengelola semua dashboard serta mengambil alih
> kepemilikan.

Kalau dipakai mentah-mentah, kesimpulannya: _setiap pengguna boleh mengatur
tata letaknya sendiri._ **Itu keliru untuk LanPro**, dan yang membuktikannya
bukan pendapat melainkan isi rutenya:

```sql
UPDATE Projects SET dashboard_layout = ?, dashboardLayout = ? WHERE id = ?
```

Satu tata letak per **PROYEK**, dipakai bersama seluruh anggota — bukan artefak
pribadi. Padanan Jira yang benar karena itu bukan "dashboard", melainkan
**konfigurasi board/proyek**, yang di Jira memang dibatasi ke project
administrator.

Jadi ketetapan pemilik proyek ("hanya admin") **sejalan dengan benchmark begitu
padanannya diluruskan**. §19.5 diberi baris `(setelan proyek)` = Project Owner +
Project Admin, dan tiga rute terakhir dijaga `jagaSetelanProyek()`.

Pelajaran yang layak disimpan: **benchmark menjawab pertanyaan tentang aplikasi
yang dibandingkan, bukan tentang aplikasi kita.** Yang menentukan padanannya
tepat atau tidak adalah apa yang benar-benar ditulis kodenya ke database.

#### #83 — `head` dicabut tanpa pencabutan terpisah

`head` dan `designer` lenyap **dengan sendirinya** begitu tiga rute terakhir
pindah. Tidak ada perubahan khusus untuk mencabutnya; keduanya memang hanya
hidup di daftar peran penjaga lama.

#### #88 — God Mode dicatat, tetapi hanya aksi tulis

`catatGodMode` kini menulis ke `AuditLogs` lewat `createAuditLog`, `actionType`
= `GOD_MODE_ACCESS`.

**Hanya `C`, `U`, `D`. Membaca tidak dicatat.** Itu bukan kelonggaran melainkan
syarat agar catatannya BISA DIBACA: Administrator membuka satu layar proyek saja
memicu belasan `GET`, dan mencatat semuanya akan menenggelamkan penghapusan
tunggal yang justru ingin ditemukan. **Log yang tidak bisa ditelusuri sama tidak
bergunanya dengan log yang tidak ada.**

Tulisannya berjalan di `setImmediate`, jadi tidak menahan permintaan dan
kegagalan mencatat tidak pernah menggagalkan permintaan yang sah.

#### `MODE` = `TOLAK`

Server kini **menolak menyala** bila ada rute memakai peran di luar katalog.
Salah ketik nama peran berhenti jadi lubang senyap dan berubah jadi kegagalan
boot yang keras. Diverifikasi: server tetap menyala normal.

#### ⚠️ Item #90 — kelemahan yang lahir dari keberhasilan ini

Laporan boot sekarang berbunyi **`0 penjaga rute terdaftar`**. Itu benar — dan
justru masalahnya.

Penjaga boot mengawasi `verifyProjectAccess`, yang kini **pensiun tanpa satu pun
pemakai**. Artinya ia sekarang **mengukur himpunan kosong**: apa pun yang
terjadi pada 54 rute yang sudah pindah, ia akan tetap melaporkan bersih dan
tetap membiarkan boot lanjut.

Ini persis bentuk kegagalan §13.14 — gerbang yang tidak bisa gagal. Ia tidak
berbahaya hari ini karena penjaga barunya bertipe ketat (`ModulProyek` dan
`Aksi` adalah union, salah ketik ditolak kompilator), tetapi gerbang yang
mengawasi tempat kosong lebih buruk daripada gerbang yang tidak ada: ia
memberi rasa aman.

**Perbaikannya:** `jagaProyek` ikut mendaftarkan `(modul, aksi)`-nya, dan
penjaga boot memvalidasinya terhadap `MATRIKS_PROYEK`. Belum dikerjakan.

### 19.25 #90 — penjaga boot hidup kembali

Laporan boot sesudah tahap 4 tutup berbunyi **`0 penjaga rute terdaftar`**. Itu
benar, dan justru itu masalahnya: penjaga boot hanya mengawasi
`verifyProjectAccess`, yang sudah pensiun tanpa pemakai. Ia **mengukur himpunan
kosong** — akan selalu melapor bersih apa pun yang terjadi pada 54 rute.

Bentuk kegagalan §13.14, dan yang membuatnya layak dicatat: **ia lahir justru
dari keberhasilan.** Memindahkan seluruh rute ke penjaga baru mematikan
gerbangnya sendiri, tanpa satu pun test berubah warna.

`jagaProyek` kini mendaftarkan `(modul, aksi)`-nya. Yang divalidasi saat boot
adalah dua hal yang **tidak bisa ditangkap kompilator maupun test statis**:

| Yang ditangkap                                                   | Kenapa tidak ketahuan dengan cara lain                                                                                                                                            |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Modul asing** — nama modul di luar `MATRIKS_PROYEK`            | Salah ketik menolak semua orang **diam-diam**; tidak ada galat                                                                                                                    |
| **Kombinasi mati** — modul+aksi yang tidak mengizinkan SIAPA PUN | `jagaProyek("dashboard","U")` sah secara tipe, tetapi §19.5 memberi `dashboard` hanya `R`. Rutenya mustahil dipakai, dan baru ketahuan sebagai keluhan pengguna berbulan kemudian |

Keduanya **menjatuhkan boot** dalam `MODE = TOLAK`.

#### Laporan boot sungguhan sekarang

```
[RBAC] 50 penjaga matriks · 0 penjaga lama · 0 ber-["*"] polos · 0 korslet (#73)
```

**50 + 1 `jagaHapusProyek` + 3 `jagaSetelanProyek` = 54.** Dua penjaga terakhir
tidak didaftarkan karena **tidak menerima parameter** — tidak ada nama modul
yang bisa salah ketik di sana, jadi tidak ada yang perlu divalidasi. Angka 50
bukan kebocoran; ia bisa dijelaskan seluruhnya.

### 19.26 #70 dan #69 — dua temuan yang berubah artinya saat diperiksa ulang

#### #70 — rutenya bukan longgar, melainkan MUSTAHIL dijaga

Empat rute `/api/v1/meetings/*` tidak pernah punya penjaga proyek. Mudah
disimpulkan sebagai kelalaian, tetapi sebabnya struktural: **jalurnya tidak
menyebut proyek mana pun.** Penjaga lama memutuskan berdasarkan `:projectId` di
jalur; tanpa itu tidak ada yang bisa diperiksa, jadi ia meloloskan.

Akibatnya sebuah rapat bisa dibaca, dipantau statusnya, **dibatalkan**, dan
**diunggahi rekaman** lintas proyek.

`jagaProyek` kini menerima parameter ketiga — `lewat` — yang memberi tahu cara
**menemukan** proyeknya dari entitas:

```ts
jagaProyek("meetingNotes", "R", "meeting");
```

**Rapat yang tidak ada ditolak `403`, bukan `404`.** Itu disengaja: `404`
membocorkan id rapat mana yang nyata, sehingga id milik proyek lain bisa ditebak
satu per satu. Kebocoran itu kecil dan sering diabaikan, tetapi ia mengubah
tebakan buta menjadi pencarian terarah.

#### #69 — catatan auditnya sendiri yang keliru

§13.11 mencatat rute ini "tanpa cek kepemilikan", sebab `GET` dan `PUT` memakai
`matchesCaller` sedangkan `POST` tidak. Pola itu **terlihat** seperti satu rute
yang terlewat.

Diperiksa ulang sebelum ditambal, dan kesimpulannya berbeda: **kepemilikan bukan
kontrol yang tepat di sini.**

| Rute          | Menyentuh apa                             | Kontrol yang benar |
| ------------- | ----------------------------------------- | ------------------ |
| `GET` / `PUT` | notifikasi **milik** pemanggil            | `matchesCaller` ✅ |
| `POST`        | mengirim notifikasi **kepada orang lain** | bukan kepemilikan  |

Menambahkan `matchesCaller` ke `POST` akan membuat seseorang hanya bisa memberi
notifikasi kepada **dirinya sendiri**, dan mematikan seluruh pemberitahuan
penugasan serta penyebutan. Tambalan itu akan "menutup temuan" sekaligus
merusak fiturnya.

Lubang yang sungguhan ada di tempat lain, dan lebih serius: **`senderId` dibaca
dari `req.body`**, sehingga siapa pun bisa mengaku sebagai orang lain.
Notifikasi palsu atas nama atasan adalah **pemalsuan identitas**, bukan sekadar
data kotor. Pengirim kini diambil dari token; nilai di body diabaikan.

**Pelajaran yang layak disimpan:** temuan audit adalah HIPOTESIS, bukan
instruksi. #69 sudah tercatat sejak gelombang 5 dengan rumusan yang salah, dan
menambalnya sesuai rumusan itu akan menghasilkan kerusakan yang tampak seperti
perbaikan.

### 19.27 #87 dikoreksi, dan #91 yang ditemukan karenanya

#### Koreksi #87 — saya menyimpulkan tanpa menelusuri

§19.15 mencatat `effectiveRole` membawa **dua kosakata peran**, dengan alasan
`ProjectMembers.role` sampai ke `hasPermission`. Waktu itu kompilator menandai
`normRole === 'manager'` sebagai mustahil, dan saya menyimpulkan perbandingan
itu hidup lewat peran proyek.

**Ditelusuri sekarang, dan itu keliru.** Keempat penetapan `setUserRole`
(`AppContainer:489`, `AppContainer:526`, `useAuth:330`, `useAuth:495`) semuanya
berasal dari `Users.role` — peran **sistem**. `effectiveRole` tidak pernah
membawa peran proyek.

Yang benar-benar salah karena itu **berbeda dari yang saya catat**: frontend
sama sekali **tidak mempertimbangkan peran proyek** saat menggerbang antarmuka.
Seorang Project Manager melihat UI yang digerbang oleh peran SISTEM-nya
(`user`), bukan oleh perannya di proyek. Akibatnya UI bisa menyembunyikan yang
sebenarnya diizinkan server, dan menampilkan yang sebenarnya ditolak.

Sesudah tahap 4, ini **bukan lagi lubang keamanan** — server menegakkan sendiri
dan tidak memercayai frontend. Severitasnya diturunkan 🔴 → 🟠 dan penanda
"blokir production" dicabut. Perbaikan sesungguhnya adalah §19.8 **tahap 5b**:
`can(action, modul, projectId)` membaca matriks yang sama dengan server.

**Pelajaran, dan ini kedua kalinya hari ini** (lihat #69 di §19.26): catatan
temuan adalah HIPOTESIS. Yang saya tulis sendiri pun harus ditelusuri sebelum
ditindaklanjuti.

#### #91 — dua pintu belakang yang ditemukan justru dari koreksi itu

Keduanya muncul saat menelusuri klaim yang keliru di atas.

**(a) Kredensial admin ter-hardcode di frontend.**

```ts
if (username === "admin" && (password === "admin" || password === "admin123"))
```

Mendaftarkan akun ber-`role: "admin"` dengan id tetap `admin-fixed-id`.
Kredensialnya tertulis di berkas sumber, artinya **ikut terkirim ke setiap
pengunjung lewat bundel** — siapa pun yang membuka devtools membacanya.

**(b) Peran DIMINTA dari body pada endpoint pendaftaran PUBLIK.**

```ts
const insertRole = role || "user";
```

Endpoint pendaftaran sengaja berada di luar gerbang autentikasi `/api/*` —
kalau tidak, tidak ada yang bisa mendaftar. Artinya siapa pun **tanpa akun**
bisa mendaftar sambil meminta `role: "admin"`.

Statusnya memang dipaksa `PENDING` sehingga ia belum bisa masuk. Tetapi yang
menyetujui melihat **daftar tunggu**, bukan kolom peran — dan satu klik
"approve" menjadikannya Administrator sistem, lengkap dengan **God Mode lintas
proyek** (§19.6).

Endpoint itu tetap dipakai panel admin untuk menambah pengguna berperan, jadi
`role` **tidak dibuang**; ia hanya dihormati bila pemanggilnya terbukti
Administrator. **Peran diberikan, tidak diminta.**

Dicabut juga `usernameLower === "admin"`, yang memberi seluruh antarmuka admin
berdasarkan **nama**, bukan peran. Identitas bukan otorisasi.

#### Kenapa keduanya luput dari audit sebelumnya

Keduanya ada di `useAuth.ts` dan `auth.routes.ts` — dua berkas yang sudah
berkali-kali dibaca sepanjang F5 (SSO). Yang membuatnya luput bukan berkasnya
tak tersentuh, melainkan **tidak ada yang mencarinya**: audit sebelumnya
menelusuri rute dan penjaga, sedangkan keduanya bersembunyi di dalam alur
masuk yang "sudah bekerja".

### 19.28 Sapuan pola #91 ke seluruh kode — hasilnya, dan satu temuan baru

Sesudah #91, pola yang sama disapu ke seluruh `src` dan `server`. **Ini bukan
pemindaian yang hasilnya dilaporkan mentah** — §13.11 sudah menetapkan hasil
pemindaian bukan temuan, dan #80 tetap luput karena aturan itu tidak dijalankan
sampai tuntas. Tiap kecocokan dibaca isinya.

| Yang dicari                               | Kecocokan | Kesimpulan sesudah dibaca                                                                                                                                            |
| ----------------------------------------- | :-------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kredensial literal (`password === "..."`) |     1     | Komentar penjelas #91 itu sendiri. **Bersih.**                                                                                                                       |
| `bypass` / `backdoor` / `skip auth`       |     1     | Teks deskripsi peran di layar admin. **Bersih.**                                                                                                                     |
| Hak istimewa dari `req.body`              |     6     | Lima di antaranya **status entitas** (sprint, milestone, QA), bukan hak akses. Satu `ownerId` pada pembuatan proyek — rutenya sudah `verifyGlobalAdmin`. **Bersih.** |
| Rute pengubah peran pengguna              |     1     | `PUT /api/users/:id` **sudah** melucuti `role` & `system_role` untuk non-admin. **Bersih.**                                                                          |

#### Item #92 — peran dibaca dari TOKEN, bukan dari database

Ditemukan saat memeriksa rute pengubah peran. Dua lapis otorisasi membaca peran
dari **sumber yang berbeda**:

| Tempat                                               | Sumber peran                            |
| ---------------------------------------------------- | --------------------------------------- |
| `jagaProyek`, `jagaHapusProyek`, `jagaSetelanProyek` | **database** — `SELECT role FROM Users` |
| `PUT /api/users/:id` dan 6 tempat lain               | **token** — `req.user?.role`            |

Token berumur **2 jam** (`server/middleware/auth.ts:31`). Artinya seorang
Administrator yang perannya dicabut **tetap memegang hak Administrator sampai
2 jam** — di jalur mana pun yang membaca peran dari token. Pencabutan hak tidak
langsung berlaku.

Ini bukan lubang yang bisa dipakai orang luar; ia memerlukan akun admin yang
sah lebih dulu. Tetapi ia membatalkan asumsi yang biasa dipegang saat menangani
insiden: _"peran sudah saya cabut, jadi dia sudah tidak bisa apa-apa."_

Perbaikannya perlu pertimbangan, bukan tambalan: membaca database di setiap
permintaan menambah satu kueri per permintaan. Jalan tengah yang lazim adalah
daftar-cabut (revocation list) atau memperpendek umur token. **Belum dikerjakan
— butuh keputusan pemilik proyek.**

Catatan sampingan: pemeriksa admin di `PUT /api/users/:id` masih menerima nama
peran hantu `sadm`, `admn`, `system admin`, `super admin` — keempatnya nol baris
data menurut §19.2. Tidak berbahaya, tetapi ia sisa kosakata yang enum peran
(§19.15) dibuat untuk menghabiskan.

### 19.29 Angka F8 diukur ulang — dan kenapa itu mengubah prioritasnya

Diukur 16 Agu 2026, sesudah seluruh pekerjaan F7:

| Item          | Tertulis di §1   | Sebenarnya        | Perintah                                     |
| ------------- | ---------------- | ----------------- | -------------------------------------------- |
| #8 `any`      | 1.313            | **1.290**         | `grep -rn ": any\|<any>\|as any" src server` |
| #9 rasio test | ±1 : 1.000 baris | **1 : 208** baris | 375 test / 77.487 baris                      |

Selisih #9 hampir **lima kali lipat**, dan itu mengubah artinya: F8 dicatat
sebagai "jaring pengaman nyaris tidak ada" — dasar dari peringatan berulang
bahwa merefactor `AppContainer` (F10) adalah judi. Rasio 1:208 masih jauh dari
ideal, tetapi ia bukan lagi angka yang membuat F10 mustahil.

Angka lamanya bukan salah saat ditulis; ia basi karena **kerja sesi ini sendiri
menambah 111 test** (264 → 375). Persis pola §1.5: _kolom yang basi lebih
berbahaya daripada kolom kosong_.

⚠️ **Yang TIDAK boleh disimpulkan dari perbaikan angka ini:** bahwa F8 boleh
dilewati. Rasio mengukur JUMLAH, bukan CAKUPAN. 111 test baru itu hampir
seluruhnya mengenai otorisasi. Klaim awal saya bahwa `AppContainer` "tidak
tersentuh uji" **KELIRU dan sudah dikoreksi** — ia punya 6 test. Angka
sebenarnya ada di §19.30, dan ia tetap mendukung kesimpulan yang sama lewat
jalan yang berbeda.

#### Test server untuk #91b

`useAuth.pintu-belakang.test.ts` mengunci pola berbahaya di berkas frontend.
Itu menjaga **satu jalan masuk**, bukan aturannya — endpoint pendaftaran ini
publik, dan siapa pun bisa memanggilnya dengan `curl` tanpa menyentuh frontend.

Ditambahkan 3 test perilaku sisi server. Salah satunya menegaskan **arah
kegagalan**: token yang tidak sah harus berarti "bukan admin", bukan "lewati
pemeriksaan" — arah yang salah di situ justru membuka pintunya.

Dua di antaranya sempat merah dengan sebab yang **menyesatkan**: keduanya
melapor "INSERT tidak pernah terjadi", yang terbaca seolah penjaganya menolak.
Sebabnya data test saya sendiri melanggar aturan validasi username. Itu ketiga
kalinya hari ini kegagalan pada perkakas uji menyamar sebagai kegagalan pada
kode yang diuji (§19.19, §19.20, §19.22).

### 19.30 Cakupan `AppContainer` — klaim saya dikoreksi, lalu diukur

Saya menulis di §19.29 dan §0.4 bahwa `AppContainer` **"nol tersentuh uji"**.
**Itu keliru.** Ia punya **6 test di 2 berkas** (219 baris):

| Berkas                           | Isi                                                                                       |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| `AppContainer.render.test.tsx`   | ter-mount tanpa melempar · me-render layar login sungguhan · tidak memicu error boundary  |
| `AppContainer.loggedin.test.tsx` | ter-mount pada jalur login · menampilkan kerangka aplikasi · memulihkan sesi dari storage |

Ini **ketiga kalinya** dalam sesi ini saya menuliskan sesuatu tanpa
mengukurnya lebih dulu (#69, #87, dan sekarang ini). Polanya sama setiap kali:
kesimpulan yang terdengar masuk akal, ditulis sebagai fakta.

#### Angka sebenarnya, diukur langsung

```bash
npx jest src/AppContainer.render.test.tsx src/AppContainer.loggedin.test.tsx \
  --coverage --collectCoverageFrom="src/AppContainer.tsx" --coverageReporters=text
```

| Metrik     |      Nilai |
| ---------- | ---------: |
| Pernyataan | **23,74%** |
| **Cabang** |  **8,19%** |
| Fungsi     | **17,31%** |
| Baris      | **24,60%** |

#### Kenapa angka ini justru LEBIH mengkhawatirkan daripada nol

Nol akan jujur — semua orang tahu artinya. Yang ada sekarang lebih licin:
berkasnya **punya test**, namanya muncul di daftar, dan `npm test` hijau.

Bedanya terlihat pada jarak antara dua angka:

- **Pernyataan 23,7%** — cukup untuk membuktikan berkasnya bisa dimuat dan
  dirender.
- **Cabang 8,2%** — lebih dari **91 dari 100 percabangan keputusan** tidak
  pernah dijalankan satu arah pun.

Artinya test yang ada membuktikan `AppContainer` **BISA TAMPIL**, bukan bahwa ia
**BEKERJA BENAR**. Untuk refactor F10, yang dibutuhkan justru yang kedua.

Inilah bentuk konkret dari peringatan §1.5: _"28/28 test lolos tapi
AppContainer crash"_. Test smoke akan tetap hijau sesudah refactor yang
merusak logika, selama komponennya masih ter-mount.

#### Sasaran F8 yang bisa diperiksa

Bukan "tambah test", melainkan **naikkan cakupan CABANG** — itu satu-satunya
angka yang mengukur apakah keputusan di dalam kode benar-benar diuji. Perintah
di atas membuatnya bisa diulang kapan saja, jadi kemajuannya tidak perlu
dipercaya, cukup dijalankan.

### 19.31 F8 langkah pertama — hasilnya kecil, dan itu informasinya

Empat test cabang ditambahkan ke `AppContainer` (`AppContainer.pemulihan-sesi.test.tsx`).
Keduanya divalidasi **di sumbernya** lebih dulu, bukan diduga dari nama fungsi.

| Cabang                                                               | Kenapa belum tersentuh                                                                                              |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `safeSessionStorage.getItem(...) \|\| safeLocalStorage.getItem(...)` | Test yang ada hanya mengisi localStorage, jadi sisi kiri `\|\|` — jalur "jangan ingat saya" — tak pernah dijalankan |
| `catch` pada `JSON.parse(sessionPayload)`                            | Storage rusak mengunci pengguna di layar putih tanpa jalan keluar selain devtools                                   |

#### Hasilnya diukur, bukan diasumsikan

| Metrik     |   Sebelum |   Sesudah |
| ---------- | --------: | --------: |
| Pernyataan |    23,74% |    23,80% |
| **Cabang** | **8,19%** | **8,26%** |

**Empat test menaikkan cakupan cabang 0,07 poin.**

Itu angka yang mengecewakan, dan justru karena itu ia berguna: pada laju ini,
mencapai cabang 50% membutuhkan sekitar **2.400 test render**. Menaikkan cakupan
cabang `AppContainer` lewat render-test **tidak sebanding usahanya** — bukan
karena testnya buruk, melainkan karena 4.581 baris dalam satu komponen membuat
tiap test hanya menyentuh sepetak kecil.

**Implikasi untuk rencana F8**, dan ini membalik urutan yang tertulis di §1.5:
jaring pengaman untuk `AppContainer` **tidak bisa dibangun sebelum** komponennya
dipecah. Selama logikanya terkurung di dalam satu komponen, satu-satunya cara
mengujinya adalah me-render seluruhnya. Yang bisa dilakukan lebih dulu adalah
mengekstrak logika murni keluar — dan logika yang sudah keluar bisa diuji dengan
biaya normal.

Ini **perlu keputusan pemilik proyek**, sebab ia menggeser sebagian F10 ke
depan F8, berlawanan dengan urutan yang sudah ditetapkan.

#### Item #93 — "Remember Me" hanya melupakan profil, bukan kredensial

Ditemukan saat **memvalidasi asumsi test saya sendiri**. Versi pertama test
menaruh token di `sessionStorage`; ia gagal, dan penelusurannya menunjukkan:

| Yang disimpan               | Ke mana                              | Bergantung "Remember Me"?           |
| --------------------------- | ------------------------------------ | ----------------------------------- |
| Profil sesi (`sessionUser`) | localStorage **atau** sessionStorage | **Ya** (`AppContainer.tsx:531-533`) |
| **Token JWT**               | **selalu** localStorage              | **TIDAK** (`src/lib/api.ts:50`)     |

Jadi tidak mencentang "Remember Me" hanya membuat **profilnya** hilang saat tab
ditutup; **kredensialnya tetap tinggal**. Hanya logout eksplisit yang
membersihkannya lewat `clearAuthToken`.

Di komputer bersama, menutup peramban tidak mengakhiri sesi pada tingkat yang
penting. Belum diperbaiki — perbaikannya menyentuh alur masuk, dan sesudah #91
alur itu layak disentuh dengan hati-hati.

### 19.32 #54 dan #53 — dua item murah, satu di antaranya kesalahan saya sendiri

Dikerjakan 16 Agu 2026 mengikuti urutan §1.4 (termurah lebih dulu).

#### #54 — item yang TAMPAK gugur sendiri, ternyata tidak

`rbac.ts` pensiun dengan nol pemakai (§19.23), jadi #54 — "identitas boleh
datang dari `x-user-id`/query/body" — sekilas ikut gugur.

**Ia tidak gugur.** Cadangan identitas itu **sudah tersalin** ke ketiga penjaga
baru saat saya menulisnya, karena saya menyalin pola penjaga lama tanpa
memeriksa apa yang ikut terbawa. Baru ketahuan ketika itemnya dibaca untuk
disusun ke §1.4 — bukan saat penjaganya ditulis, dan bukan oleh test mana pun.

Tidak bisa ditembus hari ini: seluruh rute berlingkup proyek berada di balik
gerbang `/api/*` yang mengisi `req.user`. **Itu justru masalahnya.** Penjaganya
bersandar pada lapisan lain untuk keselamatannya — bentuk asumsi yang sama
persis dengan yang melahirkan #49 dan #68.

> **Aturan yang lahir dari sini:** item yang tampak gugur karena kode lamanya
> pensiun **wajib divalidasi di kode BARU**, bukan dicoret. Yang pensiun
> berkasnya, bukan cacatnya.

#### #53 — logout yang bisa mengakhiri sesi orang lain

`POST /api/auth/logout` mengambil `userId` dari body, pada rute yang berada di
prefix **publik**. Siapa pun tanpa kredensial bisa memanggilnya dengan id orang
lain dan meng-`NULL`-kan `currentSessionToken` korban — memaksanya keluar
berulang kali.

Rutenya **memang harus publik**, dan itu divalidasi lebih dulu: pengguna yang
tokennya sudah kedaluwarsa tetap perlu bisa keluar. Karena itu perbaikannya
bukan menambahkan `authenticateJWT` — itu akan mengunci orang yang paling
membutuhkannya. Identitas diambil dari token bila ada; bila tidak ada, tidak
ada yang perlu dibersihkan di server, dan jawabannya tetap `success`.

Divalidasi juga sesudahnya: `apiRequest` melampirkan `Authorization` selama
token masih ada, dan logout dipanggil **sebelum** token dibersihkan — perilaku
klien tetap utuh.

**Testnya menegaskan SIAPA yang sesinya tersentuh, bukan status jawabannya.**
Rutenya selalu menjawab `success`; test yang memeriksa status akan lulus baik
lubangnya ada maupun tidak.

### 19.33 #55 dan #71 — validasi lebih dulu, baru perbaikan

#### #55 — divalidasi tertutup, bukan dicoret

`rbac.ts:50` berbunyi `if (!targetProjectId) return next()`: rute tanpa proyek
diloloskan. Bahayanya bukan pada rute yang memang tidak berlingkup proyek,
melainkan pada rute yang **seharusnya** berlingkup proyek tetapi nama
parameternya berbeda — penjaganya berubah jadi no-op tanpa satu pun tanda.

Mengikuti aturan yang lahir dari #54 (§19.32), ini **divalidasi di kode baru**:
ketiga penjaga menolak saat `projectId` kosong. Cacatnya **tidak** tersalin.

3 test menguncinya, satu per penjaga. Bukan berlebihan — #54 membuktikan
diamnya test bukan bukti.

#### #71 — dua cara menemukan proyek, dan bedanya dengan #54

`project-modules` POST/PUT/DELETE tidak punya penjaga sama sekali: CRUD modul
lintas proyek. Jalurnya tidak menyebut proyek, jadi:

| Rute                                    | Cara proyeknya ditemukan                      |
| --------------------------------------- | --------------------------------------------- |
| `POST /api/project-modules`             | `projectId` dari **body**                     |
| `PUT`/`DELETE /api/project-modules/:id` | lewat **modulnya** (`lewat: "projectModule"`) |

⚠️ Membaca `projectId` dari body di sini **berbeda dari #54**, dan bedanya
penting:

|                      | #54 (ditutup)                | #71 (diterima)                                                    |
| -------------------- | ---------------------------- | ----------------------------------------------------------------- |
| Yang ditentukan body | **SIAPA** pemanggilnya       | **PROYEK MANA** yang disentuh                                     |
| Bisa dipalsukan?     | Ya — mengaku jadi orang lain | Tidak menguntungkan — keanggotaan pada proyek itu tetap diperiksa |

Diuji secara eksplisit: bukan anggota proyek sasaran tetap **403**, walau ia
sendiri yang menyebut proyeknya.

Modul proyek diperlakukan sebagai **setelan proyek**, konsisten dengan
ketetapan #89 — Project Owner + Project Admin. **Ini pengetatan:** sebelumnya
siapa pun bisa.

#### Catatan yang belum ditindaklanjuti

`GET /api/project-modules` (baris 18) mengembalikan modul **seluruh proyek**
tanpa penyaringan. Item #71 menyebut POST/PUT/DELETE saja, jadi ini di luar
lingkupnya — tetapi ia kebocoran baca lintas proyek yang setara #70. Belum
dicatat sebagai item bernomor; perlu diputuskan apakah ia bagian #71 yang
terlewat atau temuan tersendiri.

### 19.34 #93 — token mengikuti "Remember Me"

`setAuthToken` selalu menulis ke localStorage tanpa cabang `remember` sama
sekali, sementara profil sesi (`sessionUser`) memang mengikutinya. Jadi tidak
mencentang "Remember Me" hanya melupakan **profil**; **kredensialnya** tetap
tinggal melewati penutupan peramban.

#### Dua hal yang mudah terlewat, dan keduanya diuji

**1. Beralih ke sesi sementara WAJIB membuang salinan permanennya.**
`getAuthToken` membaca localStorage lebih dulu. Token permanen yang tertinggal
akan **menutupi** token sementara — mengembalikan persis cacat #93 sambil
terlihat sudah diperbaiki. Ini jenis kegagalan yang paling sulit dilihat:
kodenya berubah, perilakunya tidak.

**2. Tanpa argumen `remember`, lokasi DIPERTAHANKAN.**
Penyegaran token (`SessionExpiryWarning`) dan kembalian SSO (`main.tsx`)
memanggil `setAuthToken` tanpa tahu pilihan pengguna. Bila keduanya memaksa
localStorage, **satu penyegaran** memindahkan sesi sementara ke penyimpanan
permanen dan membatalkan pilihan penggunanya tanpa ada yang menyadari.

Karena itu bawaannya bukan `true`, melainkan "ikuti yang sekarang".

`clearAuthToken` kini membersihkan kedua penyimpanan.

#### Bentuk testnya

Yang diperiksa adalah **di mana** token tersimpan dan **apa yang terjadi pada
salinan lamanya** — bukan sekadar `getAuthToken()` mengembalikan nilai.
Pemeriksaan yang terakhir itu akan lulus baik cacatnya ada maupun tidak, sebab
token yang salah tempat tetap terbaca.

Berkas testnya sempat jatuh ke project Jest `node` yang tanpa `jsdom`
(`localStorage is not defined`); environment-nya ditetapkan eksplisit lewat
pragma `@jest-environment jsdom`.

### 19.35 #56 — dan validasi saya yang hampir menutupnya secara keliru

`user.routes.avatar.test.ts` hanya menguji `sanitizeAvatarValue`, sebuah fungsi
**murni**. Tetapi meng-import-nya dari `user.routes.ts` ikut menarik adaptor DB,
dan adaptor itu membuka koneksi Postgres sungguhan. Koneksinya masih menyambung
saat Jest membongkar environment:

```
ReferenceError: You are trying to `require` a file after the Jest environment
has been torn down. From server/routes/user.routes.avatar.test.ts.
TypeError: Cannot read properties of undefined (reading 'isIP')
```

**Exit code-nya tetap 0**, jadi crash ini tidak pernah menggagalkan apa pun.
Itu justru bahayanya: ia melatih orang mengabaikan galat di akhir test, dan
peringatan sungguhan berikutnya akan ikut terabaikan.

Fungsinya dipindahkan ke `server/helpers/avatarValue.ts` — mengulang
penyelesaian `getJwtSecret` (§0.3), dengan alasan yang sama: **fungsi murni
tidak boleh menyeret koneksi database.**

| Keluaran non-ringkasan `npm test` | Sebelum | Sesudah   |
| --------------------------------- | ------- | --------- |
| Blok peringatan SSL `pg`          | 2       | 1         |
| Crash saat teardown               | ada     | **nihil** |

#### Validasi pertama saya MELESET, dan hampir menutup item ini keliru

Grep atas keluaran `npm test` menghasilkan **nol** kecocokan `isIP`. Kesimpulan
yang menggoda: masalahnya sudah hilang sendiri, coret saja.

Dua berkas keluaran yang saya jadikan pembanding ternyata **sudah tersaring
`grep` sewaktu dibuat** — isinya hanya baris `Tests:`/`Suites:`. Nol-nya tidak
membuktikan apa pun. Diulang dengan menangkap keluaran **penuh tanpa filter**,
crash-nya masih ada.

> **Aturan:** bukti negatif hanya sah bila sumbernya BELUM disaring. Mencari
> sesuatu di dalam keluaran yang sudah difilter akan selalu menemukan nol, dan
> nol itu terbaca persis seperti "bersih".

Ini pasangan dari aturan §19.32 (item yang tampak gugur wajib divalidasi di kode
baru). Keduanya soal yang sama: **ketiadaan bukti bukan bukti ketiadaan.**

### 19.36 #77 — separuhnya ternyata tidak butuh keputusan

Item ini tercatat _"hanya tertutup lewat kenaikan versi mayor"_, sehingga
statusnya `MENUNGGU keputusan`. Diukur ulang sebelum ditindaklanjuti — dan
separuhnya tidak butuh keputusan sama sekali.

| Paket              | Severity | Langsung? | "Perbaikan" yang ditawarkan npm   |
| ------------------ | -------- | --------- | --------------------------------- |
| `react-router-dom` | moderate | ya        | `react-router-dom@7.18.2` (mayor) |
| `react-router`     | moderate | tidak     | ikut di atas                      |
| `exceljs`          | moderate | ya        | `exceljs@3.4.0` (mayor)           |
| `uuid`             | moderate | tidak     | ikut `exceljs`                    |
| `esbuild`          | low      | tidak     | tersedia                          |

#### react-router-dom terpasang, dipakai NOL berkas

Dicari di `src`, `server`, berkas akar, `index.html`, dan `vite.config.ts` —
**tidak ada satu pun import**. Aplikasi ini memakai routing sendiri lewat
`AppRoutes.tsx` dan `currentView` di store.

Mencabutnya menutup **dua** dari empat moderate dengan **nol perubahan
perilaku**: 1.226 → 1.223 dependensi, tsc 0, 400 test hijau, build sukses,
login tampil di tab bersih.

Pelajarannya sama seperti #69 dan #87: **rumusan item adalah hipotesis.** "Hanya
tertutup lewat kenaikan versi mayor" benar untuk exceljs, dan sama sekali tidak
berlaku untuk react-router — yang jalan keluarnya justru menghapus, bukan
menaikkan.

#### Yang tersisa memang butuh keputusan Anda

`exceljs` dan `uuid` berasal dari satu akar. npm menawarkan `exceljs@3.4.0` —
perhatikan bahwa itu **PENURUNAN** versi mayor dari `^4.4.0` yang terpasang,
bukan kenaikan. `exceljs` dipakai di **1 berkas**.

Tiga pilihan, dan ketiganya milik pemilik proyek:

1. **Turunkan** ke `exceljs@3.x` — menutup temuan, berisiko merusak ekspor Excel
   yang dipakai di berkas itu.
2. **Ganti pustakanya** — biaya lebih besar, sekaligus melepas `uuid` bawaannya.
3. **Terima risikonya** dan catat sebagai pengecualian resmi di §18.

Ambang blokir gerbang tetap `high`, jadi `npm run audit:deps` tetap LULUS pada
pilihan mana pun. Yang diputuskan di sini adalah sikap terhadap risiko, bukan
kelulusan gerbang.

### 19.37 #47 — divalidasi ke database hidup, dan hasilnya MENGHENTIKAN perbaikan

Diukur langsung dari Neon, 16 Agu 2026. Item ini menyebut "kolom kembar";
kenyataannya lebih spesifik dan lebih menentukan.

#### Lima pasang, dan KEDUANYA terisi penuh

| Pasangan                       | NOT NULL                 | Terisi (dari 4 baris) |
| ------------------------------ | ------------------------ | --------------------- |
| `pointid` / `point_id`         | camel: ya · snake: tidak | **4 / 4**             |
| `userId` / `user_id`           | keduanya nullable        | **4 / 4**             |
| `username` / `user_name`       | keduanya nullable        | **4 / 4**             |
| `commenttext` / `comment_text` | camel: ya · snake: tidak | **4 / 4**             |
| `createdAt` / `created_at`     | camel: ya · snake: tidak | **4 / 4**             |

Sebabnya terlihat di `discussion-points.routes.ts:236` — `INSERT` menulis
**kesebelas kolom sekaligus**, memasukkan nilai yang sama dua kali:

```sql
INSERT INTO discussion_point_comments
  (id, pointId, point_id, userId, user_id, userName, user_name,
   commentText, comment_text, createdAt, created_at)
```

#### Kenapa ini TIDAK boleh langsung diperbaiki

Kode **membaca campuran keduanya**: `point_id`, `comment_text`, `user_name`,
`created_at` dari sisi snake, dan `createdAt` **7 kali** dari sisi camel.

Menjatuhkan salah satu sisi akan mematahkan pembacaan di sisi lain. Menjatuhkan
sisi camel juga menabrak batasan `NOT NULL` yang justru ada di sisi itu.

Ini bukan pekerjaan "hapus kolom duplikat", melainkan **penyeragaman pembacaan
lebih dulu, baru penghapusan** — dan penghapusan kolom pada data produksi
bersifat merusak dan tidak bisa dibatalkan.

#### Yang dibutuhkan dari pemilik proyek

Satu keputusan: **sisi mana yang menjadi sumber kebenaran.**

| Pilihan        | Pertimbangan                                                                                |
| -------------- | ------------------------------------------------------------------------------------------- |
| **snake_case** | Konvensi PostgreSQL; tetapi `NOT NULL` ada di sisi camel, jadi batasannya harus dipindahkan |
| **camelCase**  | Sudah memegang `NOT NULL` dan dibaca 7 kali; tetapi menyimpang dari tabel lain              |

Sesudah dijawab, urutan kerjanya: seragamkan pembacaan → seragamkan penulisan →
verifikasi 4 baris utuh → baru jatuhkan kolom yang menganggur.

⚠️ **Kaitan dengan #48.** §0.2 mencatat lima pasang TABEL kembar akibat satu
sistem migrasi menulis nama tanpa kutip. Pola #47 serupa tetapi pada tingkat
KOLOM. Keduanya sebaiknya diputuskan bersama supaya konvensinya satu.

### 19.38 Rekomendasi konvensi penamaan kolom — diukur, bukan selera

Pemilik proyek meminta rekomendasi untuk #47. Jawabannya tidak diputuskan dari
preferensi, melainkan dari sebaran yang sudah ada di database yang sama.

| Yang diukur (Neon, 16 Agu 2026)    |                                                                    Jumlah |
| ---------------------------------- | ------------------------------------------------------------------------: |
| Kolom **camelCase**                |                                                                   **183** |
| Kolom snake_case                   |                                                                        34 |
| Kolom satu kata (netral)           |                                                                       149 |
| Tabel yang memuat kolom camelCase  |                                                            **28 dari 30** |
| Tabel yang memuat kolom snake_case |                                                                 8 dari 30 |
| Tabel bernama snake_case           | **3**: `meeting_details`, `discussion_point_comments`, `ai_learning_logs` |

#### Rekomendasi: **camelCase**

Empat alasan, berurutan dari yang paling menentukan:

1. **Ia sudah jadi konvensi rumah, bukan pilihan baru.** 183 lawan 34, dan 28
   dari 30 tabel. Memilih snake_case berarti menamai ulang 183 kolom di 28
   tabel — perubahan besar dan berisiko, dengan nol perolehan fungsional.
2. **`NOT NULL` sudah ada di sisi camel.** Memilih camel berarti tidak ada
   batasan yang perlu dipindahkan; memilih snake berarti memindahkannya pada
   tabel dengan data hidup.
3. **Sisi camel yang lebih banyak dibaca** — `createdAt` saja 7 kali.
4. **Ketiga tabel bernama snake berasal dari satu sumber yang sama**, yaitu
   sistem migrasi `runner.ts` yang sudah dipensiunkan di F0. Jadi snake_case di
   repo ini bukan standar yang pernah dipilih, melainkan **jejak sisa** dari
   sistem yang sudah dibuang.

#### Keberatan yang sah, dan cara menjawabnya

Konvensi PostgreSQL memang snake_case, dan camelCase menuntut identifier
**selalu dikutip**. Itu bukan keberatan teoretis di repo ini — §0.2 mencatat
**#48: lima pasang TABEL kembar** lahir persis karena satu sistem migrasi
menulis nama tanpa kutip, sehingga PostgreSQL melipatnya jadi huruf kecil dan
membuat tabel kedua.

Tetapi bahaya itu berasal dari **kutip yang tidak konsisten**, bukan dari
camelCase-nya. Menamai ulang 183 kolom untuk menghindarinya adalah menukar
risiko kecil yang bisa dijaga dengan risiko besar sekali jalan.

**Penjagaannya** sudah ada sebagian: `npm run db:verify-schema` membandingkan
migrasi dengan produksi kolom per kolom — gerbang itulah yang seharusnya
menangkap tabel/kolom kembar berikutnya.

#### Urutan kerja bila rekomendasi ini disetujui

1. Seragamkan **pembacaan** ke sisi camel (snake yang dibaca: `point_id`,
   `comment_text`, `user_name`, `created_at`).
2. Hentikan **penulisan ganda** di `discussion-points.routes.ts:236`.
3. Verifikasi **4 baris utuh** — hitung ulang, bukan diasumsikan.
4. Baru jatuhkan 5 kolom snake yang menganggur.

Langkah 4 merusak dan tidak bisa dibatalkan; ia dijalankan terpisah, sesudah 1–3
terbukti aman.

⚠️ #48 sebaiknya mengikuti ketetapan yang sama supaya konvensinya tidak jadi dua.

### 19.39 #47 langkah 1–3 dikerjakan — dan tabelnya ternyata punya TIGA gaya

Ketetapan pemilik proyek 16 Agu 2026: **camelCase sumber kebenaran**.

| Langkah | Isi                                                                           | Status                                                      |
| :-----: | ----------------------------------------------------------------------------- | ----------------------------------------------------------- |
|    1    | Baca diseragamkan — `WHERE pointId = ? OR point_id = ?` → `WHERE pointId = ?` | ✅                                                          |
|    2    | Tulis diseragamkan — `INSERT` dari **11 kolom jadi 6**                        | ✅                                                          |
|    3    | Verifikasi 4 baris utuh                                                       | ✅ `{n:4, pointid:4, commenttext:4, createdAt:4, userId:4}` |
|    4    | Jatuhkan 5 kolom snake                                                        | **TIDAK dikerjakan** — lihat di bawah                       |

Divalidasi **sebelum** diubah: kolom snake seluruhnya nullable, dan frontend
membaca camel lebih dulu (`comment.userName || comment.user_name`) — snake hanya
cadangan. Diukur juga bahwa cabang `OR point_id` tidak pernah menambah satu
baris pun, sebab keempat baris punya sisi camel terisi.

#### ⚠️ Temuan: tabel ini punya TIGA gaya penamaan, bukan dua

Ketahuan karena kueri verifikasi saya memakai `"pointId"` dan **ditolak**:

```
GAGAL=column "pointId" does not exist
```

Nama kolom yang sebenarnya:

| Gaya                | Kolom                                                                | Sebabnya                                                  |
| ------------------- | -------------------------------------------------------------------- | --------------------------------------------------------- |
| huruf kecil semua   | `pointid` · `username` · `commenttext`                               | identifier ditulis **tanpa kutip**, PostgreSQL melipatnya |
| camelCase sungguhan | `userId` · `createdAt`                                               | ditulis **dengan kutip** saat dibuat                      |
| snake_case          | `point_id` · `user_id` · `user_name` · `comment_text` · `created_at` | sistem migrasi lain                                       |

**Ini mekanisme #48 pada tingkat KOLOM** — dan ia memperkuat §19.38: yang
berbahaya bukan camelCase-nya, melainkan **kutip yang tidak konsisten**. Satu
tabel yang sama bisa melahirkan tiga gaya sekaligus hanya karena sebagian
pernyataan mengutip dan sebagian tidak.

Catatan untuk §19.38: angka 183 camelCase di sana **tidak terpengaruh** — kolom
yang terlipat seperti `pointid` masuk hitungan "satu kata" (149), bukan
camelCase. Rekomendasinya tetap berdiri.

#### Jalur TULIS TERBUKTI — diukur, bukan disimpulkan

Pemilik proyek memposting satu komentar sungguhan lewat antarmuka. Hitungan
kolom sesudahnya:

| Kolom                                                                        | Sebelum | Sesudah |
| ---------------------------------------------------------------------------- | ------: | ------: |
| **baris total**                                                              |       4 |   **5** |
| `pointid` · `commenttext` · `createdAt` · `userId` · `username` (camel)      |       4 |   **5** |
| `point_id` · `comment_text` · `created_at` · `user_id` · `user_name` (snake) |       4 |   **4** |

Tiga hal terbukti sekaligus dari satu pengukuran:

1. **`INSERT` 6 kolom berhasil** — jalur tulis tidak rusak oleh perubahan.
2. **Penulisan ganda benar-benar berhenti** — baris baru `NULL` di kelima kolom
   snake, sementara baris lama tetap terisi.
3. Keyakinan argumentatif di paragraf sebelumnya **digantikan pengamatan**.

**Langkah 4 kini tidak terhalang secara teknis**, tetapi tetap menunggu
persetujuan eksplisit: menjatuhkan kolom pada data produksi merusak dan tidak
bisa dibatalkan.

### 19.40 Item #94 — 4 rute komentar tanpa penjaga, ditemukan saat memverifikasi #47

Pemilik proyek memposting untuk membuktikan jalur tulis #47. Tabelnya **tidak
bertambah** — tetap 4 baris. Penelusurannya membuka dua hal.

#### Yang terjadi

Log boot mencatat `[RBAC][GOD-MODE] modul=meetingNotes aksi=C`. Jadi permintaan
tulis memang masuk dan lolos penjaga — tetapi itu rute **pembuatan discussion
POINT**, bukan komentar. Jalur tulis #47 karena itu **masih belum terbukti**.

Efek samping yang menyenangkan: baris log itu sekaligus **membuktikan #88
bekerja di produksi** — pencatatan God Mode benar-benar menyala pada permintaan
nyata, bukan hanya di test.

#### Temuan #94

Keempat rute komentar **tidak punya penjaga sama sekali**:

```
GET  /api/discussion-points/:pointId/comments
GET  /api/projects/:projectId/meetings/:meetingId/discussionPoints/:pointId/comments
POST /api/discussion-points/:pointId/comments
POST /api/projects/:projectId/meetings/:meetingId/discussionPoints/:pointId/comments
```

Dua di antaranya bahkan **tidak menyebut proyek** di jalurnya — pola yang sama
persis dengan #70, dan dengan sebab yang sama: tanpa `:projectId`, penjaga lama
tidak punya apa pun untuk diperiksa, jadi rutenya dibiarkan telanjang.

Akibatnya komentar bisa **dibaca dan ditulis lintas proyek** oleh siapa pun yang
punya akun. Komentar memuat pembahasan internal rapat.

#### Kenapa ia luput dari seluruh sapuan sebelumnya

Ini yang layak dicatat. §19.20–§19.22 memindahkan **54 penjaga** ke matriks dan
mengunci hasilnya dengan test himpunan rute. Semua test itu bekerja pada rute
yang **punya penjaga** — mereka memeriksa penjaganya benar, bukan **ada**.

`penjaga-lama.test.ts` mengunci pemakai `verifyProjectAccess` di nol.
`tanpa-wildcard.test.ts` mengunci ketiadaan `["*"]`. **Rute tanpa penjaga sama
sekali tidak muncul di kedua himpunan itu** — ia tak terlihat oleh keduanya.

> Sapuan yang mendata "penjaga yang salah" tidak akan pernah menemukan "penjaga
> yang tidak ada". Keduanya butuh pendataan yang berbeda: satu berangkat dari
> daftar penjaga, satunya dari daftar RUTE.

Perbaikannya karena itu bukan hanya memasang penjaga pada 4 rute ini, melainkan
menambah test yang berangkat dari **himpunan rute berlingkup proyek** dan
menuntut setiap anggotanya punya penjaga.

### 19.41 #94 selesai — dan testnya menemukan tiga lagi saat pertama dijalankan

| Laporan boot    | Sebelum | Sesudah |
| --------------- | ------: | ------: |
| Penjaga matriks |      54 |  **61** |

Tujuh rute yang sebelumnya **telanjang** kini dijaga:

| Rute                                                  | Penjaga                                              |
| ----------------------------------------------------- | ---------------------------------------------------- |
| `GET`/`POST /api/discussion-points/:pointId/comments` | `jagaProyek("meetingNotes", R/C, "discussionPoint")` |
| `GET`/`POST .../discussionPoints/:pointId/comments`   | `jagaProyek("meetingNotes", R/C)`                    |
| `POST /api/v1/meetings/:meetingId/analyze`            | `jagaProyek("meetingNotes","U","meeting")`           |
| `POST .../meetings/:id/analyze-transcript`            | `jagaProyek("meetingNotes","U")`                     |
| `POST .../meetings/:id/upload-recording`              | `jagaProyek("meetingNotes","U")`                     |

**Tiga yang terakhir tidak ada di item #94.** Mereka muncul pada eksekusi
PERTAMA `rute-tanpa-penjaga.test.ts` — bukti bahwa arah pendataannya memang yang
selama ini hilang, bukan sekadar cara lain menuliskan hal yang sama.

#### Dua kekeliruan saya, keduanya ditangkap testnya sendiri

**1. Sumber id entitas salah.** Penemuan proyek membaca
`req.params.id || req.params.meetingId`, sedangkan rute komentar memakai
`:pointId`. Akibatnya penemuan proyek **selalu gagal** dan penjaganya menolak
SEMUA orang — kegagalan yang terlihat seperti "keamanan bekerja". Sumber id kini
bergantung pada jenis entitasnya.

**2. Pengurai rute buta sebagian.** Ia hanya mengenali handler inline
(`async (req, res) => {`), sehingga rute berhandler **bernama**
(`getCommentsHandler);`) tidak terdata sama sekali — dua dari empat rute
komentar tak terlihat oleh testnya sendiri. Diperbaiki di **keempat** berkas
test yang memakai pola itu.

> Pengurai yang buta sebagian lebih berbahaya daripada tidak ada pengurai: yang
> pertama melaporkan "bersih", yang kedua melaporkan "tidak tahu".

Asersi "empat rute komentar" juga sempat merah karena `/comments` dipakai juga
oleh komentar **task** (2 rute). Disaring ke discussion point saja — angka yang
dikunci harus punya arti, bukan sekadar cocok.

### 19.42 Rekomendasi untuk lima item yang menahan jalan — semuanya diukur

Pemilik proyek meminta kelimanya didahulukan. Empat di antaranya pertanyaan;
satu hanya bisa dikerjakan pemilik proyek sendiri. Semuanya diukur 16 Agu 2026
supaya jawabannya tinggal satu kata.

#### #57 — dua endpoint health. **Rekomendasi: buang `/api/health`.**

| Endpoint            | Letak                 | Di balik autentikasi?                                     | Isi jawaban                            |
| ------------------- | --------------------- | --------------------------------------------------------- | -------------------------------------- |
| `/api/health-check` | `server.ts:552`       | **TIDAK** — terdaftar di `publicRoutes` (`server.ts:409`) | status · timestamp · migrasi           |
| `/api/health`       | `health.routes.ts:69` | **YA**                                                    | status · timestamp · service · migrasi |

Keduanya menghitung hal yang sama dari `statusMigrasi()`. Bedanya hanya field
`service` yang bernilai tetap `"LanPro Backend"`.

Yang menentukan: **probe kesehatan tidak punya kredensial.** `/api/health` ada
di balik gerbang `/api/*`, jadi ia tidak bisa dipakai untuk keperluan yang
namanya sendiri janjikan. Ia menduplikasi informasi sambil tidak bisa diakses
oleh yang membutuhkannya.

Buang `/api/health`; `/api/health-check` sudah publik dan sudah memuat status
migrasi. **Menunggu: setuju / tidak.**

#### #81 — `parentAdminId`. **Rekomendasi: buang.**

Diukur: **4 kemunculan, NOL pembacaan.**

| Berkas                           | Peran                           |
| -------------------------------- | ------------------------------- |
| `project.routes.ts:610` · `:615` | **menulis** (UPDATE dan INSERT) |
| `src/lib/db.ts:99`               | daftar kolom camelCase adaptor  |
| `src/lib/pg-migrate.ts:118`      | definisi kolom                  |

Tidak ada satu pun `SELECT` yang membacanya, dan tidak ada satu pun keputusan
yang bergantung padanya. §19.9 K4 sudah merekomendasikan **buang**; pengukuran
ini menguatkannya.

Kolom yang ditulis tetapi tidak pernah dibaca lebih berbahaya daripada kolom
kosong: ia terlihat seperti data yang bermakna, dan orang berikutnya akan
membangun sesuatu di atasnya. **Menunggu: setuju / tidak.**

#### #20 — kode mati DB Explorer. **Rekomendasi: buang.**

`DbExplorerPanel.tsx:38-40` memuat komentar dari sesi sebelumnya yang menyatakan
perbandingan `dbMode === 'mysql'` **tidak pernah benar**, sebab state-nya
bertipe `"pg" | "local"`. Toggle-nya karena itu tidak pernah berpindah mode, dan
`fetchDbStatus` dipanggil tiap mount tanpa ada yang memakai hasilnya.

Sejalan dengan ketetapan "Postgres saja" — tidak ada MySQL di LanPro, jadi
toggle antar mode DB memang tidak punya alasan untuk ada.

**Menunggu konfirmasi:** benar tidak dipakai? Bila ya, seluruh blok itu dibuang.

#### #46 — `SSO_ALLOWED_DOMAINS=gmail.com`. **Butuh nilai dari Anda.**

Ini satu-satunya dari kelima yang **tidak bisa saya rekomendasikan isinya** —
jawabannya bergantung pada siapa yang boleh masuk, dan itu keputusan
organisasi, bukan teknis.

Yang bisa saya sampaikan: nilai sekarang berarti **siapa pun pemilik alamat
Gmail** bisa mendaftar lewat SSO. Ia juga membatalkan asumsi kuota corporate
pada rancangan F11 (§11.1b), sehingga #30 ikut tertahan olehnya.

Bentuk yang diharapkan: daftar domain dipisah koma, misal
`perusahaan.co.id,anakperusahaan.co.id`. **Menunggu: nilainya.**

#### #15 — cabut 2 Google API key. **Hanya Anda yang bisa.**

Di Google Cloud Console, ±5 menit, nol kode. Ia satu-satunya dari kelima yang
**menutup sebuah fase** (F1).

### 19.43 #57, #81, #20 dikerjakan — dan satu test yang hampir saya buang

Ketiganya disetujui pemilik proyek 16 Agu 2026 atas dasar pengukuran §19.42.

#### #57 — endpoint kesehatan disatukan

`/api/health` dibuang. Diverifikasi pada server berjalan:

```
/api/health-check → 200 TANPA kredensial
/api/health       → 401
```

⚠️ 401 itu **bukan** bukti rutenya masih ada — §0.6 mencatat gerbang auth
menjawab sebelum penangan 404, sehingga jalur yang tidak ada pun membalas 401.
Yang membuktikan penghapusannya adalah hilangnya kode, bukan status ini.

**Tiga test sempat merah**, dan reaksi pertama yang menggoda adalah membuangnya
— testnya menguji jalur yang memang sengaja dihapus. Itu akan menghapus satu-
satunya cakupan otomatis untuk endpoint kesehatan.

Sebagai gantinya `/api/health-check` **dipindahkan** dari `server.ts` ke
`health.routes.ts`. Jalurnya tidak berubah, jadi pendaftarannya di
`publicRoutes` tetap berlaku; yang berubah hanya letaknya — endpoint kesehatan
kini berkumpul di berkas yang namanya menjanjikan itu, dan **bisa diuji tanpa
menyalakan seluruh server**.

> Test yang merah karena kodenya sengaja dihapus tetap harus ditanya: apa yang
> hilang kalau ia ikut dibuang? Kadang jawabannya "tidak ada", kadang seperti
> di sini.

#### #81 — `parentAdminId` berhenti ditulis

4 kemunculan, nol pembacaan. Penulisannya dicabut dari `project.routes.ts`.

**Kolomnya belum dijatuhkan dari database.** Itu tindakan merusak, dan
dijalankan terpisah bersama langkah 4 #47 — keduanya penghapusan kolom pada data
produksi, dan lebih aman dilakukan sekali dengan satu uji-coba.

`src/lib/db.ts` **tidak disentuh** (§0.5 aturan 3), meski ia memuat
`parentAdminId` di daftar kolom camelCase.

#### #20 — kode mati DB Explorer

Sesi sebelumnya sudah menandainya mati dan meninggalkan **daftar hapus yang
tepat**; penghapusannya ditunda agar jadi keputusan sadar. Daftar itu diikuti
persis: state `dbMode`/`dbHost`/`switching`, `fetchDbStatus` beserta
pemanggilannya di `useEffect` (menembak API tiap mount tanpa hasilnya pernah
ditampilkan), `handleToggleDbMode`, dan `toggleDbMode` di `explorer.service.ts`.

Rute backend `POST /api/system/db-status` **sengaja tidak disentuh**:
menghapus pemanggil tidak otomatis berarti rutenya tak punya pemakai lain.

### 19.44 #47 langkah 4 & #81 — kolom dijatuhkan, gerbang F0 tetap lulus

Dikerjakan 16 Agu 2026 atas persetujuan pemilik proyek. **Tindakan merusak**,
dijalankan dengan pola `db:migrasi-peran`: uji-coba dulu, rencananya
diperlihatkan, baru ditulis. Perintahnya `npm run db:hapus-kolom-kembar`.

| Tabel                       |           Sebelum |     Sesudah |
| --------------------------- | ----------------: | ----------: |
| `discussion_point_comments` |          11 kolom |       **6** |
| `ProjectMembers`            | + `parentAdminId` | **dibuang** |

| Kolom dijatuhkan                                             | Terisi | Penggantinya                                         |
| ------------------------------------------------------------ | -----: | ---------------------------------------------------- |
| `point_id` `user_id` `user_name` `comment_text` `created_at` |      4 | terisi **9** — tidak ada data yang hilang            |
| `parentAdminId`                                              |      6 | **tidak menggantikan apa pun** — tidak pernah dibaca |

#### Penjaga yang dipasang di dalam skripnya

Skrip menolak menjatuhkan kolom terisi bila **penggantinya belum selengkap**
kolom yang dibuang, dan memeriksanya **per kolom** — bukan sekali di awal.
Pemeriksaan sekali di awal akan lolos selama satu kolom saja aman, dan
menjatuhkan sisanya bersamaan.

Setiap kolom yang dijatuhkan **wajib menyebut penggantinya** di rencana;
`pengganti: null` hanya sah untuk kolom yang tidak pernah dibaca sama sekali.
Itu memaksa alasannya ditulis, bukan diasumsikan.

#### Gerbang F0 diperiksa SESUDAHNYA

Definisi kolomnya lebih dulu dicabut dari `src/lib/pg-migrate.ts`. Tanpa itu,
production akan menyimpang dari migrasi dan `db:verify-schema` akan merah —
gerbang yang justru dibuat karena 13 tabel dan 54 kolom pernah berbeda diam-diam
(§13.14).

```
GERBANG F0 LULUS — schema database bersih IDENTIK dengan production.
```

Data utuh sesudahnya: **9 baris, `commenttext` 9 terisi.**

#### Satu jebakan kecil yang layak dicatat

Komentar SQL yang saya tulis memuat **backtick**, dan komentar itu berada di
dalam **template literal** — berkasnya pecah seketika. `tsc` menangkapnya
sebelum apa pun berjalan. Menulis SQL di dalam template literal berarti backtick
tidak boleh muncul bahkan di dalam komentarnya.

#### #15 TIDAK ditandai selesai

Mencabut Google API key hanya bisa dilakukan pemilik proyek di Google Cloud
Console. Menandainya selesai atas dasar "diminta dikerjakan" adalah persis
kegagalan yang §13.14 catat: gerbang dinyatakan lulus tanpa pernah diuji.

**Ia tetap `MENUNGGU` sampai pemilik proyek menyatakan kedua kunci sudah
dicabut.**

### 19.45 Audit tema gelap — diminta pemilik proyek, hasilnya BELUM bersih

Diukur 16 Agu 2026 di atas 47 berkas yang belum di-commit (pencabutan `dark:`).

#### Ringkasan angka

| Yang diukur                                         |  Jumlah | Sebaran        |
| --------------------------------------------------- | ------: | -------------- |
| Sisa kelas `dark:`                                  |  **13** | hanya 2 berkas |
| Kelas warna KERAS netral (`slate`/`gray`/`white`/…) | **964** | **91 berkas**  |
| Nilai `#hex` di luar token                          | **569** | 27 berkas      |

Pencabutan `dark:` sudah 97,6% selesai, tetapi **itu baru separuh pekerjaan.**
Mencabut varian gelap tanpa mengganti warna kerasnya menjadi token berarti
komponennya **berhenti punya mode gelap sama sekali** — bukan menjadi konsisten.

#### Temuan pokok: Dashboard akan jadi PULAU TERANG

`src/features/dashboard/styles.ts` memuat warna keras **tanpa pasangan gelap**
pada hampir seluruh permukaannya:

| Gaya                                                                                        | Kelas yang bertahan terang                 |
| ------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `healthCard` · `statCard` · `chartCard` · `actionCard` · `statCardRose` · `actionCardSlate` | `bg-white`                                 |
| `headerTitle` · `healthLabelBottom` · `statValue` · `chartTitle`                            | `text-slate-900` / `text-slate-800`        |
| `header` · `healthCard` · `statCard`                                                        | `border-slate-200` / `border-slate-100/80` |

Sisa aplikasi sudah memakai token semantik (`bg-surface`, `text-content`) yang
ikut berubah di `html.dark`. Dashboard tidak. Akibatnya bukan "warna kurang
pas", melainkan **kartu putih menyala di dalam kerangka gelap** — dan teks
`text-slate-900` di atasnya justru tetap terbaca, sehingga cacatnya tidak
terlihat sebagai teks hilang, melainkan sebagai silau.

#### Dua sisa di `issues/styles.ts`

| Gaya       | Masalah                                                                                                                          |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `toolbar`  | `border-slate-200/80` tanpa pasangan gelap, padahal latarnya punya `dark:bg-slate-800/30` — **garis terang di atas latar gelap** |
| `tableRow` | memakai `bg-slate-50/70` dan `dark:hover:bg-slate-800/50`; hover terangnya tidak ditimpa                                         |

#### Kesimpulan jujur

**Tema gelap LanPro belum bersih.** Yang sudah dikerjakan Antigravity nyata dan
besar — 532 → 13 — tetapi pekerjaan yang tersisa **lebih besar dari yang
tercabut**: 964 kelas warna keras di 91 berkas, dan 569 hex di 27 berkas.

Ini memperbesar #13 dan #14, bukan menutupnya. Urutan yang benar:

1. **Ganti warna keras menjadi token** — itu yang membuat gelap bekerja.
2. Baru cabut `dark:` yang jadi berlebihan.

Mencabut lebih dulu meninggalkan komponen yang **terkunci terang**, dan itulah
keadaan Dashboard sekarang.

⚠️ **Belum diverifikasi di layar.** Analisis ini statis terhadap kelas. Yang
membuktikannya hanya menyalakan mode gelap lewat antarmuka dan membuka Dashboard
— dan itu memerlukan sesi login pemilik proyek (§0.5 aturan 5).

### 19.46 Saran menuntaskan tema gelap — berurutan, yang pertama paling menentukan

Diminta pemilik proyek. Keadaan sesudah tiga gelombang: **606 kelas
dikonversi**, sisa **336 di 70 berkas**, dan **569 `#hex`** belum disentuh.

#### 1. ✅ SELESAI — gerbang dipasang lebih dulu

`npm run audit:warna`, garis dasar **336 kelas di 70 berkas**.

Bentuknya **ratchet, bukan ambang**: batas dicatat PER BERKAS. Turun lulus,
naik gagal sekecil apa pun, berkas baru gagal. Gerbang berambang tunggal
("maksimal 336") punya cacat halus — ia mengizinkan satu berkas memburuk selama
berkas lain membaik.

Dibuktikan bisa merah tanpa menyabotase sumber: skrip dan garis dasarnya
disalin ke luar repo, ditambah satu berkas ber-`bg-slate-700`, dan gerbangnya
melaporkan `BARU … 2 kelas` lalu GAGAL.

`--perbarui` disediakan sebagai tindakan **sadar**, dan skripnya sendiri
mencetak peringatan bahwa memakainya untuk membuat gerbang hijau berarti
mematikan gerbangnya.

<details><summary>Alasan langkah ini didahulukan (arsip)</summary>

Ini yang paling menentukan, dan bukan karena rapi.

606 kelas dikonversi **tanpa satu pun pemeriksaan otomatis yang bisa
menggagalkannya.** `tsc`, 404 test, dan `build` semuanya hijau — dan ketiganya
akan tetap hijau seandainya seluruh konversi itu salah, sebab kelas Tailwind
hanyalah string bagi mereka.

Artinya hari ini tidak ada apa pun yang mencegah warna keras kembali masuk
besok. Tanpa gerbang, 606 konversi itu akan tergerus lagi satu demi satu,
persis seperti `dark:` yang dulu tumbuh jadi 532.

Yang perlu dibuat: `npm run audit:warna` — gagal bila muncul kelas warna keras
BARU di luar daftar yang sengaja dikecualikan. Pola dan daftar kecualinya sudah
ada di `scripts/fix/warna-ke-token.cjs`; tinggal dibalik menjadi pemeriksa.

**Token sudah lengkap** — diperiksa: setiap token di `:root` punya nilai di
`html.dark`, nol yang tertinggal.

</details>

#### 2. Tiga token lagi menutup hampir seluruh sisa

Sisa 336 bukan 336 masalah berbeda; ia empat kelompok:

| Sisa                                                        | Jumlah | Yang dibutuhkan                                                          |
| ----------------------------------------------------------- | -----: | ------------------------------------------------------------------------ |
| Lapisan ber-opasitas (`bg-slate-900/60`, `bg-slate-200/60`) |     36 | `--color-overlay` — nilai TETAP di kedua mode, seperti `surface-inverse` |
| `border-white`, `border-black/10`                           |     34 | `--color-border-inverse-subtle`                                          |
| `bg-slate-300`, `text-slate-100/200`, `bg-slate-700`        |    ~46 | perluas `surface-strong` / `content-inverse` ke satu tingkat lagi        |

Polanya sudah terbukti di gelombang 3: **token bernilai tetap membuat warna
keras bisa dicabut tanpa mengubah satu piksel pun.** Yang tersisa hanya
menerapkannya pada tiga kelompok di atas.

#### 3. ⚠️ Temuan yang muncul saat mengukur: 22 kelas yang TIDAK ADA

`text-slate-450` (12×) dan `text-slate-650` (10×) dipakai di
`flowchart/components/CanvasContextMenu.tsx`. **Tailwind tidak punya tingkat
450 maupun 650**, dan `src/index.css` tidak mendefinisikannya — nol kecocokan.

Kelas-kelas itu **tidak menghasilkan apa pun**. Sebagian bahkan berdampingan
dengan token yang benar pada elemen yang sama:

```
className="… text-slate-450 text-content-subtle"
```

Jadi selama ini warnanya datang dari token di sebelahnya, sementara
`text-slate-450` hanya menumpang tanpa efek. Ia tidak berbahaya, tetapi ia
membuat pengukuran warna keras melaporkan angka yang lebih besar dari kenyataan
— dan menyesatkan siapa pun yang membacanya sebagai pekerjaan tersisa.

**Saran: buang keduanya**, jangan dipetakan. Memetakan kelas yang tidak pernah
berlaku berarti mengubah tampilan dengan menyamar sebagai kerapian.

#### 4. `#hex` ditunda, dan alasannya

569 hex di 27 berkas, **315 di antaranya di `flowchart/lib/shapes.tsx`**.
Berdasarkan letaknya, itu kemungkinan besar **warna data diagram** — palet
bentuk, bukan warna tema. Mengonversinya ke token justru akan membuat diagram
kehilangan pembeda antar bentuk.

Yang perlu dilakukan lebih dulu: **pisahkan mana hex yang tema dan mana yang
data.** Sebelum pemisahan itu, angka 569 tidak boleh dibaca sebagai utang tema.

#### 5. Verifikasi layar — sekali, tetapi terarah

Konversi ini menyentuh 76 berkas tanpa satu pun bukti visual. Yang paling
efisien bukan membuka semua layar, melainkan yang **paling banyak berubah**:

1. Dashboard — permukaan kartu terbanyak
2. Modal mana pun — `surface-inverse` dan `content-inverse` paling padat di sana
3. Issue List — tabel, tempat garis dan latar bertumpuk
4. Flowchart — satu-satunya yang memakai hex dalam jumlah besar

Bila keempatnya benar dalam mode gelap DAN mode terang, sisanya kecil
kemungkinannya salah — sebab semuanya memakai token yang sama.

**Urutan yang saya sarankan: 1 → 3 → 2 → 5 → 4.** Gerbang lebih dulu, sebab
tanpa itu setiap langkah berikutnya bisa tergerus tanpa ada yang tahu.

### 19.47 Hasil audit tema gelap di layar — 47 → 7, dan sisanya bukan regresi

Diukur pada **sesi login sungguhan dalam mode gelap**, bukan dari kode. Semua
angka rasio kontras WCAG; ambang AA untuk teks normal adalah **4.5**.

| Tahap                                    | Elemen di bawah 4.5 | Permukaan terang |
| ---------------------------------------- | ------------------: | ---------------: |
| Awal                                     |              **47** |               13 |
| Sesudah `bg-primary` → `primary-surface` |                  45 |                — |
| Sesudah teks sidebar → kosakata inverse  |                  25 |                — |
| Sesudah `<body>` → token                 |               **7** |            **1** |

`bodyBg` terukur **`8,12,21`** — latar utama gelap.

#### Tiga akar yang ditemukan, semuanya bentuk yang sama

Ketiganya bukan "warna yang kurang pas", melainkan **satu token dipaksa memikul
dua peran yang berlawanan**:

| Token               | Diterangkan untuk mode gelap agar terbaca sebagai… | Tetapi juga dipakai sebagai…                     |
| ------------------- | -------------------------------------------------- | ------------------------------------------------ |
| `primary`           | TEKS di atas permukaan gelap                       | LATAR sidebar → biru muda, teks gelap di atasnya |
| `danger`, `success` | TEKS                                               | ISIAN lencana → putih di atas terang             |
| —                   | —                                                  | `<body>` memakai `bg-slate-50` tanpa syarat      |

Yang pertama dan ketiga sudah ditutup. Yang kedua **belum**, dan alasannya di
bawah.

#### ⚠️ Lencana aksen: BUKAN regresi mode gelap

Godaannya besar untuk menambalnya sebagai bagian pekerjaan ini. Diukur lebih
dulu, dan hasilnya membatalkan itu:

| Lencana            | Mode terang | Mode gelap |
| ------------------ | ----------: | ---------: |
| Putih di `danger`  |    **3.15** |       2.45 |
| Putih di `success` |    **2.64** |       1.85 |

**Keduanya sudah di bawah 4.5 SEJAK MODE TERANG.** Mode gelap memperburuknya,
tetapi tidak menciptakannya. Ini cacat kontras yang sudah ada sejak warna merek
dipilih, bukan sesuatu yang lahir dari konversi token.

Memperbaikinya berarti **mengubah warna merek atau warna teks lencana** — dan
itu keputusan desain milik pemilik proyek, bukan kerapian yang boleh saya
putuskan sendiri. Dicatat, tidak ditambal.

#### Sisa 7, dikelompokkan jujur

| Sisa                             |       Rasio | Sifat                                                  |
| -------------------------------- | ----------: | ------------------------------------------------------ |
| Lencana "Hot" / "New"            | 2.45 · 1.85 | cacat lama, ada di kedua mode                          |
| Avatar "Administrator" / "admin" | 2.26 · 2.17 | isian abu-abu dengan teks putih — pola yang sama       |
| `admin` pada kartu gelap         |        4.22 | tipis di bawah ambang                                  |
| "Memuat…"                        |        2.84 | teks pemuatan sementara                                |
| Toast "Selamat datang"           |        4.26 | hijau di atas hijau muda; toast memang berlatar terang |

Tidak satu pun dari tujuh ini adalah permukaan terang yang bocor, dan tidak satu
pun lahir dari konversi token. Yang tersisa adalah **pilihan warna**, bukan
kesalahan tema.

#### Kesimpulan

Tema gelap LanPro **sudah bersih dari tabrakan struktural**: nol permukaan
terang yang bocor, latar utama gelap, sidebar terbaca, 606+ kelas warna keras
diganti token, dan `npm run audit:warna` menjaga agar tidak kembali.

Yang tersisa adalah tujuh keputusan **desain**, dan semuanya sudah terukur
angkanya sehingga bisa diputuskan tanpa menebak.

### 19.48 Keputusan pemilik proyek atas tujuh item — 16 Agu 2026

| #      | Keputusan                                                                  | Status     |
| ------ | -------------------------------------------------------------------------- | ---------- |
| **74** | **Kerjakan.** Penjaga respons basi dipasang                                | jalan      |
| **77** | Turunkan **atau** ganti pustaka — ⚠️ **belum tegas mana**                  | menunggu   |
| **83** | **Department Head = READ pada proyek yang ia ditugaskan**                  | ditetapkan |
| **85** | belum dijawab                                                              | menunggu   |
| **86** | **Setuju** — `ProjectModules` sumber kebenaran, 4 baris MasterData dibuang | jalan      |
| **87** | **Lakukan**                                                                | jalan      |
| **92** | belum dijawab                                                              | menunggu   |

#### #83 — ketetapan yang akhirnya menjawab pertanyaan lama A/B/C

Rumusan pemilik proyek: _"ketika admin assign atau memasukkan head ke dalam
project sebagai head department, maka dia bisa Read saja."_

Ini **bukan** salah satu dari tiga pilihan lama, melainkan yang keempat — dan
lebih sederhana dari ketiganya:

| Pilihan lama  | Isi                                                             | Nasib                                             |
| ------------- | --------------------------------------------------------------- | ------------------------------------------------- |
| A             | hanya proyek yang ia anggotai                                   | mendekati, tetapi tidak menyebut tingkat aksesnya |
| B             | buat `department` fungsional, pakai kolom `Projects.department` | **tidak jadi**                                    |
| C             | semua proyek                                                    | **tidak jadi**                                    |
| **Ketetapan** | **anggota proyek seperti biasa, dengan akses R**                | **dipakai**                                       |

Akibatnya penting dan menyederhanakan: **`Users.department` tidak perlu
difungsikan sama sekali.** Department Head tidak memerlukan konsep departemen
untuk bekerja — ia cukup ditambahkan ke proyek seperti anggota lain, dan
tingkat aksesnya yang membedakan.

Artinya `head` **bukan** peran sistem yang menembus proyek, melainkan **peran
proyek** dengan matriks R di seluruh modul. Itu sejalan dengan §19.6 aturan 1
("di dalam proyek, system role tidak dipakai kecuali Administrator") tanpa
perlu pengecualian apa pun.

⚠️ Yang perlu ditambahkan ke §19.5: baris peran proyek untuk Department Head
dengan `R` di seluruh modul — mirip `Viewer`, tetapi dibedakan namanya karena
maknanya organisasional.

#### ⚠️ #77 belum bisa dikerjakan

Jawabannya menyebut **dua** jalan sekaligus ("turunkan · ganti pustaka"), dan
keduanya berlawanan akibatnya:

| Jalan                         | Akibat                                                                  |
| ----------------------------- | ----------------------------------------------------------------------- |
| **Turunkan** ke `exceljs@3.x` | cepat, tetapi versi mayor MUNDUR — ekspor Excel yang ada berisiko rusak |
| **Ganti pustaka**             | tidak mundur, tetapi menulis ulang satu-satunya berkas yang memakainya  |

Menebak salah satunya berarti mempertaruhkan fitur ekspor atas dasar yang tidak
pernah dinyatakan. Dibiarkan `MENUNGGU` sampai dipilih satu.

### 19.49 Dampak ke mode TERANG — alarm saya SALAH, dan koreksinya

Pemilik proyek bertanya apakah pekerjaan tema gelap merusak tema terang.
Pertanyaannya tepat, dan jawaban pertama saya **keliru**.

#### Yang saya laporkan mula-mula

> "Mode terang 78 elemen di bawah rasio 4.5, gelap hanya 7. Mode terang lebih
> buruk daripada mode gelap."

Angka itu **artefak alat ukur**, bukan keadaan aplikasi.

#### Sebabnya

Fungsi pencari latar saya menelusuri induk sampai menemukan `backgroundColor`
yang bukan `rgba(0,0,0,0)` — tetapi **cadangannya mengembalikan putih**, dan
sebagian induk transparan lolos pemeriksaan alpha. Ratusan elemen karena itu
dinilai "teks terang di atas latar putih" padahal latarnya sama sekali bukan
putih.

Diperbaiki dengan menuntut `alpha > 200` dan melewati `transparent` secara
eksplisit. Hasilnya pada layar yang sama, tema yang sama:

| Pengukuran              | Hasil |
| ----------------------- | ----: |
| Pemindai lama           |    78 |
| **Pemindai diperbaiki** | **2** |

Dua sisanya pun bukan cacat konversi: satu `text-amber-400` pada logo — aksen
merek — dan satu lagi memakai token inverse.

#### Kenapa hasil ini memang yang SEHARUSNYA terjadi

Pemetaan teks yang saya lakukan **byte-identik**, dan itu bisa diperiksa tanpa
menjalankan apa pun:

| Konversi                                    | Nilai lama | Nilai baru | Selisih |
| ------------------------------------------- | ---------- | ---------- | ------- |
| `text-white` → `content-inverse`            | `#ffffff`  | `#ffffff`  | **nol** |
| `text-slate-100` → `content-inverse-strong` | `#f1f5f9`  | `#f1f5f9`  | **nol** |
| `text-slate-200` → `content-inverse-muted`  | `#e2e8f0`  | `#e2e8f0`  | **nol** |
| `bg-primary` → `bg-primary-surface`         | `#405189`  | `#405189`  | **nol** |

Konversi bernilai nol tidak mungkin mengubah kontras. Seandainya saya membaca
tabel ini sebelum mempercayai angka 78, alarmnya tidak akan pernah naik.

#### ⚠️ Pelajaran — ini kesalahan alat ukur KEEMPAT hari ini

| #   | Kesalahan                                 | Akibat bila dipercaya                                         |
| --- | ----------------------------------------- | ------------------------------------------------------------- |
| 1   | `oklch()` tidak terbaca sebagai warna     | 3 tabrakan palsu                                              |
| 2   | Saringan ukuran 80×30 membuang lencana    | belasan permukaan terang terlewat                             |
| 3   | Induk transparan dilaporkan sebagai latar | elemen dinilai salah                                          |
| 4   | Cadangan latar putih                      | **78 tabrakan palsu, hampir memicu penambalan besar-besaran** |

Yang ketiga dan keempat berbahaya dengan cara berlawanan: satu **menyembunyikan**
cacat, satu **mengarang** cacat. Keduanya sama meyakinkannya.

> **Aturan:** sebelum bertindak atas angka dari alat ukur buatan sendiri,
> periksa satu kasusnya dengan tangan. Empat kali hari ini angka itu salah, dan
> tiap kali ia terbaca persis seperti temuan sungguhan.

Yang menyelamatkan bukan kehati-hatian, melainkan **tabel nilai token** — bukti
statis yang tidak bergantung pada alat ukur mana pun.

**Kesimpulan: tema terang TIDAK rusak oleh pekerjaan tema gelap.**

## §20 SERAH TERIMA UNTUK PERKAKAS LAIN — 27 item yang belum selesai

Ditulis 16 Agu 2026 atas permintaan pemilik proyek, yang akan melanjutkan
sebagian pekerjaan lewat **Antigravity**.

**Tujuannya satu: agar perkakas berikutnya tidak mengarang.** Tiap item menyebut
apa yang SUDAH diketahui, apa yang BELUM, dan apa yang akan salah bila ditebak.
Nomor item mengikuti §1 — jangan menomori ulang.

### 20.1 Aturan bagi siapa pun yang melanjutkan

1. **§1 adalah HIPOTESIS, bukan instruksi.** Tiga kali dalam satu sesi rumusan
   item terbukti keliru saat ditelusuri (#69, #87, #77). Ukur dulu.
2. **Gerbang wajib** sebelum menyatakan apa pun selesai:
   `npm run doctor && npm run lint && npm test && npm run build`, lalu
   `npm run audit:papan && npm run audit:warna`, lalu **buka browser di tab
   bersih** — build hijau bukan bukti (§15.3).
3. **`src/lib/db.ts` tidak boleh disentuh** (§0.5 aturan 3).
4. **Jangan memakai kredensial pemilik proyek.** Bila verifikasi butuh login,
   minta pemilik proyek yang login.
5. **`MENUNGGU` berarti menunggu KEPUTUSAN**, bukan menunggu pengerjaan.
   Mengerjakannya tanpa jawaban berarti menebak keputusan orang.

### 20.2 Item TERBUKA — boleh dikerjakan tanpa bertanya

| #         | Fase | Isi                                 | Yang perlu diketahui SEBELUM mulai                                                                                                                                                                                                             |
| --------- | ---- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **87**    | F7   | frontend abai peran proyek          | Rumusan lamanya SUDAH DIKOREKSI (§19.27). Ini BUKAN lubang keamanan — server menegakkan sendiri sejak tahap 4. Perbaikannya §19.8 tahap 5b: `can(action, modul, projectId)` membaca `src/lib/matriksAkses.ts`, matriks yang SAMA dengan server |
| **92**    | F7   | peran dari token vs database        | Token 2 jam, jadi pencabutan hak admin tertunda. Perbaikannya butuh keputusan: daftar-cabut, token lebih pendek, atau baca DB tiap permintaan                                                                                                  |
| **4**     | F7   | ±100 endpoint tanpa validasi skema  | §19.1 melarang menulis skema di atas otorisasi yang belum benar. Itu sudah beres, jadi ini boleh jalan                                                                                                                                         |
| **8**     | F8   | 1.290 `any`                         | Tanpa target terukur, pekerjaan ini tidak berujung                                                                                                                                                                                             |
| **9**     | F8   | cakupan CABANG `AppContainer` 8,26% | §19.31: 4 test menaikkannya 0,07 poin. Pada laju itu 50% butuh ~2.400 test. Kesimpulannya komponennya perlu dipecah dulu — dan itu menggeser sebagian F10 ke depan F8                                                                          |
| **40**    | F8   | `tsconfig` tanpa `strict`           | §0.6: diskriminan BOOLEAN tidak bekerja, pakai STRING                                                                                                                                                                                          |
| **16**    | F2   | logika belum diaudit                | Sebagian besar sudah lewat item turunannya; ukur ulang sisanya                                                                                                                                                                                 |
| **45**    | F6   | form email dekoratif                | `useState` lokal tanpa simpan. Tertahan F6                                                                                                                                                                                                     |
| **5 · 7** | F10  | routing palsu, berkas >500 baris    | JANGAN mulai sebelum F8 — merefactor 4.581 baris dengan cakupan cabang 8% adalah judi                                                                                                                                                          |
| **6**     | F9   | 222 query SQL di lapisan rute       | Butuh F7 dan F8 sebagai pengaman                                                                                                                                                                                                               |
| **14**    | F12  | kontras sidebar, jarak sentuh       | Sebagian sudah tertutup pekerjaan tema gelap — ukur ulang dulu                                                                                                                                                                                 |

### 20.3 Item MENUNGGU — JANGAN dikerjakan sebelum dijawab

| #                  | Yang menahan                                                   | Yang salah bila ditebak                                                                         |
| ------------------ | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **15**             | cabut 2 Google API key                                         | Hanya pemilik proyek yang bisa. Menandainya selesai tanpa pernyataannya adalah kegagalan §13.14 |
| **46**             | nilai `SSO_ALLOWED_DOMAINS`                                    | Menebak domain berarti menentukan siapa boleh masuk. Juga menahan #30                           |
| **30**             | konfirmasi D1b dan D3b (§11.1)                                 | Jalur rilis storage. Salah arah = 6–10 sesi terbuang                                            |
| **77**             | pemilik memilih **SheetJS `xlsx`** — belum dikerjakan          | Status kerentanan SheetJS BELUM diukur. Jalankan `npm audit` dulu                               |
| **83**             | **SELESAI 17 Agu** (§19.48): Head di-assign, akses **R saja**  | Sudah diterapkan di `roles.ts`, `matriksAkses.ts`, `permissions.ts`, seed & test                |
| **86**             | **SELESAI 17 Agu** (§19.48): `ProjectModules` sumber kebenaran | 4 baris `modul_aplikasi` di MasterData dibuang, UI tetap baca `ProjectModules`                  |
| **85**             | `category` dua konsep — pisah atau biarkan                     | Rekomendasi: pisah; `issue_type` sudah jadi rumahnya                                            |
| **17**             | izin objek percobaan + sesi admin                              | Audit UI di balik login                                                                         |
| **18 · 19**        | notebook-lm, penjaga read-only `db-query`                      | Keduanya MENGUBAH PERILAKU; #19 mematikan fitur ubah/hapus di DB Explorer                       |
| **25 26 27 28 44** | seluruh F6 tertahan **#44**                                    | Tanpa domain terverifikasi, email hanya sampai ke pemilik akun dan gagalnya SENYAP              |

### 20.4 Enam kesalahan sesi ini — jangan diulang

| Kesalahan                                     | Akibat                                                                                                                                               | Cara menghindarinya                                              |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Percaya alat ukur buatan sendiri              | **4 kali** salah: `oklch` tak terbaca, saringan ukuran membuang lencana, induk transparan, dan cadangan latar putih yang MENGARANG 78 tabrakan palsu | Periksa SATU kasus dengan tangan sebelum bertindak atas angkanya |
| Konversi menyeluruh lewat regex               | Mengubah yang TIDAK dimaksud secepat yang dimaksud                                                                                                   | Daftar ulang SELURUH hasilnya, jangan baca sampelnya             |
| Item tampak gugur karena kode lamanya pensiun | #54 tampak gugur, cacatnya ternyata sudah TERSALIN ke penjaga baru                                                                                   | Validasi di kode BARU                                            |
| Bukti negatif dari keluaran tersaring         | `grep` atas berkas yang sudah difilter selalu nol                                                                                                    | Tangkap keluaran PENUH dulu                                      |
| Sapuan dari daftar PENJAGA                    | Tidak akan menemukan rute yang TIDAK punya penjaga — 7 rute telanjang luput                                                                          | Sapu dari daftar RUTE                                            |
| Dokumentasi di ujung berkas                   | §0 basi **tiga kali**, pemilik proyek yang menemukannya                                                                                              | Perbarui §0 setiap fase berubah                                  |

### 20.5 Perkakas yang tersedia

    npm run audit:papan            integritas papan §1
    npm run audit:warna            ratchet warna keras, garis dasar per BERKAS
    npm run audit:deps             rantai pasok, ambang blokir high
    npm run db:verify-schema       gerbang F0, migrasi vs production
    npm run db:migrasi-peran       bawaannya uji-coba, --tulis untuk menyimpan
    npm run db:hapus-kolom-kembar  bawaannya uji-coba, MERUSAK
    npm run fix:warna              konversi warna keras ke token

Ketiga gerbang pertama **sudah terbukti bisa merah** — diuji terhadap salinan
rusak di luar repo, bukan dengan menyabotase sumber (§0.5 aturan 4).

### 19.50 Kenapa memperbaiki satu tema merusak tema lain — dan cara menghentikannya

Pemilik proyek melihat teks di mode TERANG samar sampai hampir tak terbaca, lalu
bertanya: bagaimana memperbaikinya tanpa merusak mode gelap?

Pertanyaan itu menunjuk masalah struktur, bukan warna. Diukur pada layar login
pemilik proyek, mode terang: **75 elemen di bawah rasio 4.5**, terburuk **1.0**.

#### Akarnya: satu token, dua peran yang saling meniadakan

| Token     | Nilai terang | Nilai gelap | Dipakai sebagai                     |
| --------- | ------------ | ----------- | ----------------------------------- |
| `warning` | `#f7b84b`    | `#ffca6a`   | **teks** "Medium" DAN isian lencana |
| `success` | `#0ab39c`    | `#2fd5bd`   | **teks** DAN isian                  |
| `danger`  | `#f06548`    | `#ff8071`   | **teks** DAN isian                  |

Warna aksen **diterangkan** di mode gelap supaya terbaca sebagai TEKS di atas
permukaan gelap. Konsekuensinya di mode terang: warna yang sama dipakai sebagai
teks di atas permukaan **putih**, dan amber di atas putih memang rasio ~1.

Menggelapkannya agar terbaca di mode terang akan membuatnya tenggelam di mode
gelap. **Itulah jungkat-jungkitnya** — dan ia tidak bisa diselesaikan dengan
memilih nilai yang "pas", sebab tidak ada satu nilai yang memuaskan keduanya.

#### Ini bukan masalah baru — ia sudah pernah diselesaikan di repo ini

`primary` mengalami hal yang sama persis: diterangkan untuk mode gelap, lalu
dipakai sebagai latar sidebar, sehingga sidebar jadi biru muda dengan teks gelap
di atasnya (§19.47). Penyelesaiannya **bukan** mengubah nilai `primary`,
melainkan **memisahkan perannya**:

    --color-primary          diterangkan di mode gelap   -> untuk TEKS
    --color-primary-surface  tetap #405189 di kedua mode -> untuk ISIAN

Sesudah dipisah, keduanya bisa benar sekaligus. Tidak ada lagi yang saling
meniadakan.

#### Pola yang sama, diterapkan ke seluruh aksen

Yang perlu ditambahkan — tiga token per warna aksen:

| Token             | Sifat                                                    | Untuk                            |
| ----------------- | -------------------------------------------------------- | -------------------------------- |
| `{aksen}`         | seperti sekarang                                         | tetap, agar tidak ada yang rusak |
| `{aksen}-text`    | **berganti per mode** — gelap di terang, terang di gelap | teks di atas permukaan NETRAL    |
| `{aksen}-surface` | **tetap** di kedua mode, cukup gelap untuk teks putih    | isian lencana dan tombol         |

Contoh untuk `warning`:

    :root      --color-warning-text: #92600a;   gelap, terbaca di atas putih
    html.dark  --color-warning-text: #ffca6a;   terang, terbaca di atas gelap
    keduanya   --color-warning-surface: #b45309; isian, dengan teks putih

**Kunci mengapa ini menghentikan jungkat-jungkit:** yang berganti per mode hanya
token yang dipakai di atas permukaan yang JUGA berganti per mode. Token untuk
isian tidak pernah berganti, jadi teks di atasnya tidak pernah perlu ikut
berganti.

#### Urutan pengerjaan yang disarankan

1. Tambahkan `{aksen}-text` dan `{aksen}-surface` untuk `warning`, `success`,
   `danger`, `info` — **tanpa mengubah token lama**, sehingga nol risiko.
2. Alihkan pemakaian TEKS ke `{aksen}-text`, ukur mode terang.
3. Alihkan pemakaian ISIAN ke `{aksen}-surface`, ukur mode gelap.
4. Baru sesudah keduanya bersih, pertimbangkan membuang token lama.

Setiap langkah bisa diukur sendiri, dan **tidak ada langkah yang memperbaiki
satu mode dengan mengorbankan mode lain.** Itu syarat yang diminta pemilik
proyek, dan ia dipenuhi oleh urutannya — bukan oleh kehati-hatian.

#### ⚠️ Catatan jujur tentang angka 75

Alat ukur saya salah **empat kali** dalam sesi ini (§19.49), termasuk sekali
mengarang 78 tabrakan palsu. Angka 75 di atas diukur ulang dengan pemindai yang
sudah diperbaiki, dan **cocok dengan apa yang dilihat pemilik proyek di layar** —
itu yang membuatnya bisa dipercaya, bukan alat ukurnya sendiri.

Sebelum menindaklanjuti per elemen, tetap periksa beberapa kasus dengan mata.

## §21 PEKERJAAN DITAHAN 17 Agu 2026 — keadaan persis saat berhenti

Pemilik proyek menghentikan sesi karena batas anggaran. Bagian ini menulis
keadaan **apa adanya**, supaya siapa pun yang melanjutkan — manusia maupun AI —
tidak perlu menebak apa pun.

**Baca §20 lebih dulu** untuk aturan yang mengikat. Bagian ini melengkapinya
dengan pekerjaan yang berhenti SETENGAH JALAN.

### 21.1 Keadaan repo saat ditahan

| Hal            | Nilai                             | Cara memeriksa                        |
| -------------- | --------------------------------- | ------------------------------------- |
| Branch         | `main`                            | `git branch --show-current`           |
| Working tree   | **bersih**, semua ter-commit      | `git status --porcelain`              |
| Belum di-push  | ya, seluruhnya lokal              | `git log --oneline main ^origin/main` |
| `tsc --noEmit` | 0 error                           | `npm run lint`                        |
| Test           | 404 lulus / 43 suite              | `npm test`                            |
| Build          | sukses                            | `npm run build`                       |
| Papan §1       | 27 BELUM · 65 SELESAI · 2 ditahan | `npm run audit:papan`                 |
| Warna keras    | garis dasar terkunci              | `npm run audit:warna`                 |

**Tidak ada pekerjaan yang tertinggal di working tree.** Bila `git status`
menunjukkan perubahan, itu dari sesi lain — bukan dari sesi ini.

### 21.2 Tema terang/gelap — SETENGAH JALAN

Satu-satunya pekerjaan yang berhenti di tengah. Rencananya **§19.50**.

| Langkah | Isi                                               | Status    |
| :-----: | ------------------------------------------------- | --------- |
|    1    | Tambah token `{aksen}-text` dan `{aksen}-surface` | SELESAI   |
|    2    | Alihkan 71 pemakaian TEKS ke `{aksen}-text`       | SELESAI   |
|    3    | Alihkan 16 pemakaian ISIAN ke `{aksen}-surface`   | SELESAI   |
|    4    | Ukur ulang pada layar yang SUDAH LOGIN            | **BELUM** |
|    5    | Buang token aksen lama bila sudah tidak dipakai   | **BELUM** |

#### Angka terakhir yang diketahui, dan batasnya

| Layar           | Terang |  Gelap | Kapan diukur                             |
| --------------- | -----: | -----: | ---------------------------------------- |
| **Sudah login** | **41** | **29** | sesudah langkah 2, **SEBELUM** langkah 3 |
| Layar login     |      3 |      2 | sesudah langkah 3                        |

**Keduanya TIDAK BISA dibandingkan.** Layar login punya jauh lebih sedikit
elemen. Angka 41/29 belum diukur ulang sesudah langkah 3, jadi **tidak
diketahui** apakah langkah 3 memperbaikinya dan seberapa.

Langkah 4 adalah **satu perintah**, bukan pekerjaan besar: minta pemilik proyek
login, jalankan pemindai §21.3. **Jangan menambal apa pun sebelum angka itu ada.**

#### Kenapa mode gelap tidak mungkin rusak oleh langkah 1–3

Bisa diperiksa dari tabel token tanpa menjalankan apa pun. Nilai `-text` di mode
gelap sama persis dengan nilai token lama di mode gelap:

    warning-text  gelap #ffca6a  = nilai lama warning di gelap
    success-text  gelap #2fd5bd  = nilai lama success di gelap
    danger-text   gelap #ff8071  = nilai lama danger di gelap
    info-text     gelap #5b93f7  = nilai lama info di gelap

Yang berubah **hanya sisi terangnya**. Token lama juga tidak disentuh.

### 21.3 Pemindai kontras — PAKAI INI, jangan menulis ulang

Pemindai ini sudah melewati **empat kali koreksi** (§19.49) ditambah tiga lagi
(#104, #106, #107). Menulis ulang dari nol berarti mengulang ketujuh kesalahan
itu. Tempel di konsol peramban, pada layar yang **sudah login**. Ia dimulai
dengan `await`, jadi tempelkan apa adanya — konsol DevTools mendukung
top-level await:

```js
await (async function () {
  var cv = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  function rgb(c) {
    cv.fillStyle = "#000";
    cv.fillStyle = c;
    cv.clearRect(0, 0, 1, 1);
    cv.fillRect(0, 0, 1, 1);
    var d = cv.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3]];
  }
  function lum(r, g, b) {
    var a = [r, g, b].map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  }
  // #124 — lapisan semi-transparan harus DIKOMPOSISIKAN ke latar di bawahnya,
  // bukan dilewati. Tanpa ini tombol nonaktif (`disabled:opacity-60` di atas
  // kartu putih) terbaca 1,00 padahal nilainya ~2,9: `bgOf` menolak latarnya
  // lalu mendarat di kartu putih, sehingga teks putih diadu dengan putih.
  function komposit(lapis, dasar) {
    var r = dasar[0],
      g = dasar[1],
      b = dasar[2];
    for (var i = lapis.length - 1; i >= 0; i--) {
      var a = lapis[i][3] / 255;
      r = Math.round(lapis[i][0] * a + r * (1 - a));
      g = Math.round(lapis[i][1] * a + g * (1 - a));
      b = Math.round(lapis[i][2] * a + b * (1 - a));
    }
    return [r, g, b, 255];
  }
  function bgOf(el) {
    var lapis = [];
    var e = el;
    while (e) {
      var st = getComputedStyle(e);
      var c = st.backgroundColor;
      if (c && c !== "rgba(0, 0, 0, 0)" && c !== "transparent") {
        var m = rgb(c);
        if (m[3] > 200) return komposit(lapis, m);
        if (m[3] > 0) lapis.push(m);
      }
      // #107 — panel gradasi mengecat lewat `background-image`; `backgroundColor`
      // -nya transparan, jadi tanpa cabang ini ia DILEWATI dan pengukuran
      // mendarat di induk yang jauh. Nilainya rata-rata seluruh perhentian
      // gradasi: sebuah PERKIRAAN, karena warna tepat di bawah satu elemen
      // bergantung posisinya. Perkiraan yang masuk akal jauh lebih baik
      // daripada mendarat di latar yang salah sama sekali.
      var bi = st.backgroundImage;
      if (bi && bi !== "none" && bi.indexOf("gradient(") >= 0) {
        var stop = bi.match(/rgba?\([^)]+\)/g);
        if (stop && stop.length) {
          var r = 0,
            g = 0,
            b = 0,
            n = 0;
          for (var i = 0; i < stop.length; i++) {
            var v = rgb(stop[i]);
            if (v[3] > 200) {
              r += v[0];
              g += v[1];
              b += v[2];
              n++;
            }
          }
          if (n)
            return komposit(lapis, [Math.round(r / n), Math.round(g / n), Math.round(b / n), 255]);
        }
      }
      e = e.parentElement;
    }
    return komposit(lapis, [255, 255, 255, 255]);
  }
  function ukur() {
    var r = [];
    document.querySelectorAll("*").forEach(function (el) {
      var t = (el.textContent || "").trim();
      if (!t || t.length > 32 || el.children.length > 0) return;
      var b = el.getBoundingClientRect();
      if (b.width < 8 || b.height < 6) return;
      var s = getComputedStyle(el);
      if (s.display === "none" || parseFloat(s.opacity) < 0.3) return;
      var fg = rgb(s.color),
        bg = bgOf(el);
      var ra =
        (Math.max(lum(fg[0], fg[1], fg[2]), lum(bg[0], bg[1], bg[2])) + 0.05) /
        (Math.min(lum(fg[0], fg[1], fg[2]), lum(bg[0], bg[1], bg[2])) + 0.05);
      if (ra < 4.5)
        r.push({
          t: t.slice(0, 16),
          r: +ra.toFixed(2),
          cls: (el.className || "").toString().slice(0, 42),
        });
    });
    return r.sort(function (a, b) {
      return a.r - b.r;
    });
  }
  function tunggu(ms) {
    return new Promise(function (r) {
      setTimeout(r, ms);
    });
  }
  var d = document.documentElement;
  var semulaGelap = d.classList.contains("dark");
  d.classList.add("dark");
  await tunggu(400);
  var gelap = ukur();
  d.classList.remove("dark");
  await tunggu(400);
  var terang = ukur();
  if (semulaGelap) d.classList.add("dark");
  await tunggu(400);
  return JSON.stringify(
    {
      masuk: !!(
        localStorage.getItem("lanpro_jwt_token") || sessionStorage.getItem("lanpro_jwt_token")
      ),
      gelap: gelap.length,
      terang: terang.length,
      terburukTerang: terang.slice(0, 6),
      terburukGelap: gelap.slice(0, 6),
    },
    null,
    1
  );
})();
```

**Delapan hal yang WAJIB diperhatikan:**

1. **Periksa `masuk` pada hasilnya.** Bila `false`, itu layar login dan angkanya
   TIDAK sebanding dengan layar yang sudah login. Kesalahan ini terjadi **tiga
   kali** dalam sesi ini. Sejak #106 penandanya adalah ADA/TIDAKNYA
   `lanpro_jwt_token`, bukan lagi mencocokkan kalimat di layar. Versi lama
   mencari `"Sign in to continue"`; #101 menerjemahkan kalimat itu ke bahasa
   Indonesia, jadi pemindai diam-diam melaporkan `masuk: true` **di layar
   login** — tepat kesalahan yang catatan ini larang. Penanda berbasis token
   tidak bisa rusak oleh terjemahan.
2. **Jangan me-reload untuk berganti tema.** Reload mengeluarkan sesi (login
   per-tab, "Remember Me" tidak dicentang). Pemindai di atas berganti tema
   dengan memasang/mencabut kelas `dark` DI TEMPAT — itu sebabnya ia bisa
   mengukur keduanya sekaligus.
3. **Jangan tambahkan saringan ukuran** seperti `width>80 && height>30`. Lencana
   lebih kecil dari itu dan akan hilang dari hitungan (§19.49 kesalahan #2).
4. **`bgOf` HARUS menolak latar transparan.** Cadangan yang mengembalikan putih
   pernah MENGARANG 78 tabrakan palsu (§19.49 kesalahan #4).
5. **`clearRect` di `rgb()` TIDAK BOLEH dihapus** (#104). Tanpa itu `fillRect`
   mengomposisikan warna beralpha di atas piksel panggilan sebelumnya, sehingga
   canvas 1×1 yang dipakai ulang menumpuk. Warna yang sama,
   `rgba(255,255,255,0.1)`, terukur mengembalikan alpha
   26 → 49 → 70 → 88 → 105 → 120 → 133 → 145 pada delapan panggilan berturut-turut.
   Setelah ±15 panggilan ambang `alpha > 200` di `bgOf` terlampaui, dan lapisan
   transparan — pola `bg-white/10` yang §22.5 sebut SENGAJA dipakai di kartu
   gelap — diterima sebagai latar pekat. Teks putih di sidebar navy karena itu
   terbaca 1,00 alih-alih ±17. Hasilnya juga tidak deterministik: elemen ke-500
   dinilai berbeda dari elemen ke-1 walau identik.
6. **Jalankan dengan `await`, dan jangan hapus jedanya** (#106). Versi lama
   memanggil `ukur()` tepat sesudah `classList` diubah, sehingga
   `getComputedStyle` mengembalikan warna yang sedang DIANIMASIKAN, bukan warna
   tujuannya — `body` mentransisikan warna 200ms dan aturan global
   `src/index.css:405` 150ms. Pemindai kini menunggu 400ms sesudah setiap
   pergantian tema. Ia juga MENGEMBALIKAN tema ke keadaan semula; versi lama
   selalu meninggalkan halaman dalam mode gelap.
7. **`bgOf` membaca panel gradasi, dan hasilnya PERKIRAAN** (#107). Panel
   gradasi mengecat lewat `background-image` dengan `backgroundColor`
   transparan, jadi versi lama melewatinya dan mendarat di induk yang jauh —
   tagline hero terbaca 1,18 padahal jelas terbaca. Nilai yang dipakai adalah
   rata-rata seluruh perhentian gradasi. Warna tepat di bawah satu elemen
   bergantung posisinya, jadi angka pada elemen di atas gradasi harus dibaca
   sebagai indikasi, bukan vonis.
8. **Lapisan semi-transparan DIKOMPOSISIKAN, jangan dilewati** (#124). Versi
   lama menolak latar beralpha lalu naik ke induk, sehingga tombol nonaktif
   (`disabled:opacity-60` di atas kartu putih) terbaca **1,00** — teks putih
   diadu dengan putih. `bgOf` kini menumpuk setiap lapisan beralpha ke latar
   pekat di bawahnya: biru 60% di atas putih menghasilkan `rgb(140,151,184)`,
   dan angkanya menjadi **2,90**, persis nilai yang §21.4 catat. Ini juga
   berlaku untuk seluruh pola `bg-{warna}/10` dan `/15` di kartu.

### 21.4 Sisa pekerjaan tema, sejauh yang diketahui

Diukur **sebelum** langkah 3, pada layar yang sudah login. Diukur ulang 21 Agu 2026
dengan pemindai yang sudah diperbaiki (#104) — dua baris pertama terbukti **hantu**.

| Sisa                       |        Rasio | Sifat                                                                                                                                        |
| -------------------------- | -----------: | -------------------------------------------------------------------------------------------------------------------------------------------- |
| ~~Teks sidebar tertentu~~  |     ~~~1.0~~ | **HANTU** (#104) — artefak canvas menumpuk. Teks `Dashboard` putih di atas sidebar `rgb(18,26,42)` terukur ±17,4. Jangan ditambal            |
| ~~Lencana kecil~~          | ~~~1.0–1.2~~ | **HANTU** (#104) — idem; lencana duduk di atas lapisan `bg-{warna}/10` yang ditolak `bgOf`, lalu diterima keliru sesudah canvas menumpuk     |
| Lencana "Hot" / "New"      |  2.45 · 1.85 | **BUKAN regresi** — sudah di bawah 4.5 sejak mode terang (§19.47). Memperbaikinya berarti mengubah warna merek: **keputusan pemilik proyek** |
| Tombol nonaktif            |          2.9 | **BUKAN cacat** — kontrol nonaktif dikecualikan WCAG                                                                                         |
| `text-amber-400` pada logo |         1.65 | aksen merek                                                                                                                                  |

**Jangan menambal daftar ini satu per satu sebelum langkah 4 dijalankan.**
Sebagian mungkin sudah tertutup langkah 3, dan menambal yang sudah benar adalah
cara memasukkan cacat baru.

**Pengukuran ulang 21 Agu 2026** — pemindai #104, transisi dibiarkan mengendap,
layar **sudah login** (`masuk: true`). Ini pengukuran pertama yang angkanya
sebanding antar mode:

| Mode   | Pemindai sebelum #104 | Sesudah #104 | Di bawah 3,0 |
| ------ | --------------------: | -----------: | -----------: |
| Gelap  |                    40 |           33 |           11 |
| Terang |                     — |           44 |       **36** |

Seluruh entri berasio 1,00–1,06 lenyap sesudah perbaikan.

Temuan yang mengejutkan: **mode terang lebih buruk daripada mode gelap**,
kebalikan dari asumsi yang mendasari #98–#100. Akar terbesarnya satu token,
**belum bernomor** dan menunggu keputusan pemilik proyek karena §22.4 poin 1
melarang mengubah nilai token tanpa laporan lebih dulu:
`--color-content-subtle` (`src/index.css:142`) bernilai `#94a3b8`, memberi
**2,56:1** di atas `bg-surface` putih — gagal AA teks (4,5), AA besar (3,0),
dan komponen antarmuka (3,0) sekaligus — sementara sisi gelapnya `#7c8ba1`
sehat di 5,03:1. Token itu dipakai **641 tempat**. `#64748b` (slate-500)
memberi 4,76:1 dan lolos AA, tetapi wajib dibuktikan di banyak layar, bukan
hanya dashboard.

### 21.5 Item lain yang tersentuh sesi ini tetapi belum tuntas

| #      | Sudah dikerjakan                                                  | Yang BELUM                                                                                                                                      |
| ------ | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **74** | 4 pengambil berlingkup proyek dijaga respons basi                 | Ulangan 429 pada `fetchSprints`, `fetchActivityLogs`, `fetchProjects` masih memakai closure basi — **cacat berbeda**, §13.12                    |
| **21** | `authStore` & `uiStore` dibuang                                   | `useProjectState` & `useNotificationState` juga menganggur — **belum bernomor**, perlu item sendiri                                             |
| **13** | 606+ kelas warna keras jadi token; gerbang `audit:warna` dipasang | Langkah 4 & 5 §19.50                                                                                                                            |
| **83** | Peran proyek `head` akses `R` di seluruh modul (§19.48)           | **SELESAI 17 Agu.** Diterapkan di `roles.ts`, `matriksAkses.ts`, `permissions.ts`, seed & test                                                  |
| **86** | Keputusan diambil: `ProjectModules` sumber kebenaran              | **Belum diterapkan.** 4 baris `modul_aplikasi` di MasterData belum dibuang                                                                      |
| **77** | Pemilik memilih SheetJS `xlsx`                                    | **Belum dikerjakan.** Ukur `npm audit` SheetJS lebih dulu — statusnya belum pernah diperiksa, dan rekomendasi tanpa angka tidak boleh dipercaya |

### 21.6 Yang TIDAK boleh disimpulkan dari dokumen ini

Sesi ini menutup banyak item, dan itu bisa terbaca seolah aplikasinya siap
rilis. **Tidak.**

Yang masih menahan rilis production tercatat di §1.1 dan §20.3 — terutama
**#30** (storage drive-per-user) dan **#46** (`SSO_ALLOWED_DOMAINS=gmail.com`).
Keduanya menunggu keputusan pemilik proyek dan **tidak boleh ditebak**.

## §22 ATURAN MENYENTUH TEMA — baca SEBELUM mengubah warna apa pun

Bagian ini ada karena tema repo ini **pernah dirusak** oleh perkakas AI yang
mengerjakannya tanpa mengetahui kosakata tokennya, lalu butuh satu sesi penuh
untuk dipulihkan. Aturannya sekarang tertulis, dan ditegakkan
`npm run audit:tema`.

**Berlaku untuk siapa pun — manusia maupun AI.**

### 22.1 Prinsipnya

Warna di LanPro **tidak ditulis di komponen**. Komponen memakai **token**, dan
token itulah yang punya dua nilai: satu untuk mode terang, satu untuk mode
gelap. Keduanya didefinisikan di `src/index.css`.

Konsekuensinya, dan ini yang paling sering disalahpahami:

> Untuk memperbaiki mode gelap, Anda **tidak** menambahkan aturan gelap.
> Anda memakai token yang benar, dan mode gelapnya mengikuti sendiri.

Mode gelap memakai kelas (`@variant dark (&:where(.dark, .dark *))`), bukan
`prefers-color-scheme`. Kelas `dark` dipasang di elemen akar.

### 22.2 Empat kosakata — TIDAK BOLEH BERSILANGAN

| Kosakata                  | Untuk         | Contoh benar                            |
| ------------------------- | ------------- | --------------------------------------- |
| `surface-*`               | LATAR         | `bg-surface`, `bg-surface-sunken`       |
| `content-*`               | TEKS dan ikon | `text-content`, `text-content-muted`    |
| `border-*`                | GARIS         | `border-border-subtle`                  |
| `primary-*` · `{aksen}-*` | AKSEN         | `text-danger-text`, `bg-danger-surface` |

**Menyilangkannya adalah cacat, bukan gaya penulisan alternatif:**

    SALAH  bg-content-muted      latar memakai kosakata teks
    SALAH  text-surface-sunken   teks memakai kosakata latar
    SALAH  text-border-subtle    teks memakai kosakata garis

Kenapa fatal: nilai `content-*` dan `surface-*` **berkebalikan** antar mode.
`content` bernilai `#0f172a` (nyaris hitam) di terang dan `#f1f5f9` (nyaris
putih) di gelap. Latar yang memakai `content-*` karena itu ikut membalik, dan
teks di atasnya menjadi terang-di-atas-terang alias hilang. Kesalahan ini nyata:
`text-slate-300` sempat menjadi `text-border-subtle` oleh pemetaan otomatis.

Sisa 20 kemunculan bersilangan **tidak seluruhnya cacat** — `bg-border-subtle`
dipakai untuk garis pemisah yang digambar sebagai `div`, dan warnanya memang
warna garis. Karena itu `audit:tema` meratchetnya: yang ada dibiarkan, yang baru
ditolak.

### 22.3 Aksen punya DUA peran — jangan tertukar

Ini pemisahan terbaru (§19.50) dan paling mudah salah:

| Token             | Untuk                             | Terang    | Gelap     |
| ----------------- | --------------------------------- | --------- | --------- |
| `{aksen}-text`    | TEKS berwarna di atas latar biasa | gelap     | terang    |
| `{aksen}-surface` | LATAR berwarna, teksnya putih     | sama saja | sama saja |

    text-danger-text     benar   teks merah di atas kartu putih/gelap
    bg-danger-surface    benar   lencana merah, teksnya putih
    text-danger          lama    ikut mode, kontrasnya buruk di terang
    bg-danger-text       SALAH   latar memakai token teks

`{aksen}` = `warning` · `success` · `danger` · `info`.

**Kenapa `-surface` bernilai sama di kedua mode:** ia latar berwarna pekat yang
selalu bersanding dengan teks putih. Bila ia ikut membalik menjadi terang di
mode gelap, teks putih di atasnya hilang.

Varian opasitas seperti `bg-danger/10` **sengaja dibiarkan** — itu warna semu
(tint), bukan latar pekat, dan perilakunya memang harus mengikuti mode.

### 22.4 Yang TIDAK boleh diubah

**1. Nilai token di `src/index.css`.**
82 token dikunci garis dasar; berubah satu digit hex pun membuat `audit:tema`
merah. Satu token dipakai ratusan tempat — mengubah nilainya untuk memperbaiki
SATU layar akan mengubah seluruh aplikasi, dan kerusakannya muncul di layar yang
bahkan tidak dibuka orang yang mengubahnya.

Bila token memang harus berubah, itu keputusan sadar: laporkan lebih dulu, lalu
`npm run audit:tema -- --perbarui`, lalu **buktikan di peramban**.

**2. Menambah `dark:`.**
Tersisa 21 kemunculan di **satu** berkas (`src/features/issues/styles.ts`),
turun dari puncak **532**. Itu utang yang dikunci, bukan izin menambah yang
ke-22. Bila Anda merasa butuh `dark:`, hampir selalu artinya tokennya yang
salah pilih.

**3. Menambah kelas warna keras.**
`bg-slate-800`, `text-gray-500`, dan sejenisnya diratchet `audit:warna`
(garis dasar 144, dari 942). Bila belum ada token yang cocok, **tambahkan
tokennya lebih dulu** — jangan memperbarui garis dasar.

### 22.5 Yang memang SENGAJA warna keras — jangan "diperbaiki"

Menambal daftar ini akan merusak, bukan memperbaiki:

| Bentuk                                                  | Alasan                                                                                             |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Gradasi `from-` `via-` `to-`                            | keputusan desain, bukan tema; memetakannya meratakan gradasinya                                    |
| `bg-white/10`, `border-white/20`                        | lapisan di atas kartu yang memang gelap di KEDUA mode                                              |
| Palet bentuk flowchart (`nodeTheme.ts`, `constants.ts`) | itu **warna DATA diagram**, bukan tema. Pernah dikonversi keliru dan ditangkap test                |
| Lencana "Hot" / "New", logo amber                       | **warna merek**. Kontrasnya di bawah 4.5 sejak mode terang; mengubahnya = keputusan pemilik proyek |
| Tombol nonaktif                                         | kontrol nonaktif dikecualikan WCAG — **bukan cacat**                                               |

### 22.6 Cara mengerjakan perbaikan tema — urutannya

1. **Ukur dulu.** Pakai pemindai kontras §21.3 apa adanya; jangan menulis ulang
   (ia sudah lewat empat kali koreksi, §19.49). Pastikan `masuk: true`.
2. **Tentukan nomor item** di §1.1. Tanpa nomor, jangan mulai.
3. **Ganti tokennya**, bukan nilainya. Satu berkas selesai, baru berkas
   berikutnya.
4. **Gerbang:** `npm run lint && npm test && npm run build && npm run audit:warna && npm run audit:tema`.
5. **Buka tab peramban BERSIH**, periksa mode terang DAN gelap. Ganti tema
   dengan memasang/mencabut kelas `dark` di tempat — **jangan me-reload**,
   reload mengeluarkan sesi.
6. **Ukur ulang**, dan bandingkan dengan layar yang SAMA. Angka dari layar
   login tidak sebanding dengan angka dari layar yang sudah login.
7. **Perbarui `AUDIT.md`.**

### 22.7 Kesalahan nyata yang sudah pernah terjadi — jangan diulang

| Kesalahan                                               | Akibat                                                                                                                                 |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `bg-slate-900` → `surface-inverse`                      | dikira identik, ternyata `#0f172a` vs `#1e293b`. Tampilan **lebih terang**, ketahuan mata pemilik proyek, 22 tempat harus dikembalikan |
| Regex `\b` sesudah `]` tidak pernah cocok               | melaporkan 40 perubahan sambil melewatkan 89                                                                                           |
| Pemindai kontras memakai putih sebagai cadangan latar   | **mengarang 78 tabrakan palsu**, nyaris memicu penambalan massal kode yang sehat                                                       |
| Saringan ukuran `>80×30` pada pemindai                  | seluruh lencana hilang dari hitungan                                                                                                   |
| `.dark` di `sweetalert.css` hanya mengatur TEKS         | popup tetap putih → teks terang di atas putih                                                                                          |
| Mengukur "sebelum" saat login, "sesudah" di layar login | terjadi **tiga kali**; angkanya tidak sebanding                                                                                        |

Benang merahnya satu: **alat ukur yang salah lebih berbahaya daripada tidak
mengukur**, karena hasilnya terlihat meyakinkan. Bila sebuah angka mengejutkan,
periksa alat ukurnya lebih dulu — bukan kodenya.

## §23 PROMPT AWAL SESI — untuk Antigravity atau perkakas AI lain

Perkakas AI tidak otomatis membaca `AUDIT.md`. Bila sesi dimulai dengan
"perbaiki tema gelap", peta jalannya datang dari tebakannya sendiri — dan itulah
yang terjadi sebelumnya. Salin-tempel teks di bawah **sebagai pesan pertama**,
sebelum meminta pekerjaan apa pun.

### 23.1 Teks untuk disalin

---

Sebelum menyentuh kode apa pun, lakukan ini berurutan dan laporkan hasilnya:

1. Baca `AGENTS.md` di akar repositori seluruhnya. Isinya wajib.
2. Baca `AUDIT.md` bagian **MULAI DARI SINI**, lalu **§20**, lalu **§21**.
   Bila pekerjaannya menyangkut warna atau tema, baca juga **§22** — wajib.
3. Jalankan `npm run audit:papan && npm run audit:warna && npm run audit:tema`
   dan laporkan hasilnya apa adanya. Ketiganya harus hijau SEBELUM Anda mulai;
   bila ada yang merah, itu bukan pekerjaan Anda dan harus dilaporkan dulu.
4. Sebutkan **nomor item** dari `AUDIT.md` §1.1 untuk pekerjaan yang saya minta.
   Bila tidak ada nomornya, katakan begitu dan usulkan nomor baru — **jangan
   mulai mengerjakan**.
5. Laporkan rencana Anda dan **tunggu persetujuan saya** sebelum mengubah kode.

Aturan yang mengikat selama sesi:

- Kerjakan **satu item saja**. Selesai, lapor, tunggu, baru item berikutnya.
- Satu branch per item; merge ke `main` hanya setelah gerbang lulus.
- Item berstatus `MENUNGGU` **tidak boleh dikerjakan** — itu menunggu keputusan
  saya, bukan menunggu pengerjaan.
- **Jangan sentuh `src/lib/db.ts`.**
- **Jangan ubah nilai token di `src/index.css`** dan **jangan tambah `dark:`**.
  Aturannya §22.
- **Jangan pakai kredensial saya.** Bila verifikasi butuh login, minta saya yang
  login.
- **Jangan sabotase kode untuk membuktikan test bisa merah.** Pakai
  `git worktree` di luar repo.
- Jangan hardcode peran/status/prioritas/departemen — semuanya dari MasterData,
  dan yang disimpan ke database adalah `code`, bukan `label`.
- Jangan melewati hook git (`--no-verify`).

Sebelum menyatakan apa pun selesai:

`npm run doctor && npm run lint && npm test && npm run build && npm run audit:papan && npm run audit:warna && npm run audit:tema`

lalu **buka aplikasi di tab peramban yang BERSIH** dan pastikan UI benar-benar
tampil. Build hijau BUKAN bukti — kelas Tailwind hanyalah string bagi
kompilator, seluruh tema bisa rusak sementara semua perintah di atas hijau.

Terakhir: perbarui `AUDIT.md`. Temuan baru menjadi item bernomor, dan jangan
menomori ulang item yang sudah ada. Apa pun yang belum Anda verifikasi, tulis
apa adanya: **"belum terverifikasi"**.

---

### 23.2 Kenapa bentuknya seperti ini

Tiap baris di atas menutup kegagalan yang **sudah pernah terjadi**, bukan
kegagalan yang dibayangkan:

| Baris                              | Menutup                                                                  |
| ---------------------------------- | ------------------------------------------------------------------------ |
| Baca `AGENTS.md` + `AUDIT.md` dulu | perkakas sebelumnya tidak tahu papan kerja ini ada                       |
| Jalankan gerbang SEBELUM mulai     | tanpa titik awal, kerusakan orang lain tercatat sebagai kerusakan Anda   |
| Sebutkan nomor item                | pekerjaan di luar papan adalah cara paling umum repo ini rusak           |
| Satu item, lalu berhenti           | perubahan bertumpuk membuat penyebabnya tidak bisa ditelusuri            |
| Larangan `dark:` dan nilai token   | dua cara tercepat merusak tema sambil semua perkakas tetap hijau         |
| Tab peramban bersih                | konsol menyimpan galat hot-reload lama; build hijau bukan bukti          |
| "belum terverifikasi"              | laporan yang terdengar yakin lebih berbahaya daripada laporan yang jujur |

### 23.3 Bila perkakasnya tetap melenceng

Gerbangnya akan menangkapnya, bukan Anda:

- `pre-commit` menjalankan `audit:papan` + `audit:warna` + `audit:tema`.
  Perubahan yang merusak tema secara struktural **tidak bisa ter-commit**.
- `npm run audit:tema` menyebutkan berkas dan angkanya, jadi kerusakannya bisa
  ditunjuk dengan tepat.
- Pemulihannya: `git log --oneline` cari commit-nya, lalu `git revert <sha>`.

Yang **tidak** ditangkap gerbang mana pun: tema yang jelek secara rasa, dan
halaman yang gagal tampil. Untuk keduanya tidak ada gantinya selain membuka
aplikasinya sendiri.
