# AUDIT LanPro — Papan Rekap Kendala & Perbaikan

**Dokumen ini adalah SATU-SATUNYA pedoman perbaikan.** Tujuannya menghapus
kebutuhan mengevaluasi ulang dari nol setiap kali memulai sesi kerja.

- Baseline diukur: **15 Agustus 2026**, commit `9053d8f`
- Semua angka di sini hasil **pengukuran perintah nyata**, bukan perkiraan.
- Perintah pengukurannya ikut ditulis (§9) supaya angka bisa diperbarui siapa pun
  dan hasilnya bisa dibandingkan secara adil.

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
4. Sebuah fase baru boleh ditutup bila **seluruh itemnya `SELESAI`** DAN
   **gerbang keluarnya lulus**. Gerbang tidak boleh dilewati karena "sudah
   terlihat jalan".
5. **Jangan menghapus baris temuan yang sudah selesai.** Ubah statusnya menjadi
   `SELESAI` beserta tanggalnya. Riwayat itu yang membuat dokumen ini berguna.
6. Bila sebuah angka memburuk, itu bukan kegagalan dokumen — itu justru fungsinya.
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

## §1 PAPAN PRIORITAS — 30 item, semuanya berfase

Tidak ada item yang berada di luar fase. Bila muncul temuan baru, ia **wajib**
diberi nomor dan dimasukkan ke salah satu fase — bukan ditulis sebagai catatan
lepas. Catatan lepas selalu terlupakan.

| #   | Temuan                                                                     |  Fase   | Sev | Biaya         | Blokir modul baru? | Status                | Detail |
| --- | -------------------------------------------------------------------------- | :-----: | :-: | ------------- | :----------------: | --------------------- | ------ |
| 1   | Tiga sistem migrasi DB hidup berdampingan                                  | **F0**  | 🔴  | Rendah        |         Ya         | `TERBUKA`             | §4     |
| 12  | ARCHITECTURE.md drift di beberapa angka                                    | **F0**  | 🟡  | Rendah        |  Ya (menyesatkan)  | `TERBUKA`             | §8     |
| 10  | Schema DB tidak terdokumentasi                                             | **F0**  | 🟠  | Sedang        |         Ya         | `TERBUKA`             | §4     |
| 2   | Driver `s3` belum pernah dieksekusi                                        | **F1**  | 🔴  | Rendah        | Blokir production  | `MENUNGGU` kredensial | §6     |
| 15  | Dua Google API key lama belum dicabut                                      | **F1**  | 🔴  | Rendah        |       Tidak        | `MENUNGGU` pemilik    | §6     |
| 16  | **Logika aplikasi belum pernah diaudit**                                   | **F2**  | 🔴  | Sedang        |         Ya         | `TERBUKA`             | §13    |
| 18  | notebook-lm rusak di dua sisi                                              | **F2**  | 🟠  | Rendah        |       Tidak        | `MENUNGGU` keputusan  | §6.3   |
| 19  | `POST /api/db-query` tanpa penjaga read-only                               | **F2**  | 🔴  | Rendah        |       Tidak        | `MENUNGGU` keputusan  | §6.3   |
| 20  | Kode mati DB Explorer                                                      | **F2**  | 🟡  | Rendah        |       Tidak        | `MENUNGGU` keputusan  | §6.3   |
| 17  | **UI belum pernah diaudit di balik login**                                 | **F3**  | 🔴  | Sedang        |         Ya         | `MENUNGGU` login      | §14    |
| 3   | Nol code splitting — 898 KB gzip satu chunk                                | **F4**  | 🔴  | Rendah        |         Ya         | `TERBUKA`             | §5     |
| 29  | **SSO Google/Microsoft** (poin 1)                                          | **F5**  | 🟢  | Tinggi        |       Tidak        | `TERBUKA`             | §1.5   |
| 22  | `initWhatsAppScheduler` tak pernah dipanggil — digest belum pernah menyala | **F6**  | 🔴  | Sangat rendah |       Tidak        | `TERBUKA`             | §1.5   |
| 23  | Fallback token WhatsApp ter-hardcode (langgar §3.2)                        | **F6**  | 🔴  | Sangat rendah |       Tidak        | `TERBUKA`             | §1.5   |
| 24  | `EmailConfigForm` 172 baris, nol panggilan API                             | **F6**  | 🟡  | Rendah        |       Tidak        | `TERBUKA`             | §1.5   |
| 25  | Fondasi `email.service.ts`                                                 | **F6**  | 🟢  | Sedang        |       Tidak        | `TERBUKA`             | §1.5   |
| 26  | **Email selamat datang** (poin 2)                                          | **F6**  | 🟢  | Rendah        |       Tidak        | `TERBUKA`             | §1.5   |
| 27  | **Lupa password → password random** (poin 3)                               | **F6**  | 🟢  | Sedang        |       Tidak        | `TERBUKA`             | §1.5   |
| 28  | **Digest task pending + jumlah** (poin 4)                                  | **F6**  | 🟢  | Rendah        |       Tidak        | `TERBUKA`             | §1.5   |
| 30  | Drive-per-user (opsional, dinilai ulang setelah F5)                        | **F11** | 🟡  | Tinggi        |       Tidak        | `DITUNDA`             | §1.5   |
| 4   | ±100 endpoint tanpa validasi skema                                         | **F7**  | 🔴  | Sedang        |   Ya (keamanan)    | `TERBUKA`             | §3     |
| 9   | Rasio test ±1 : 1.000 baris                                                | **F8**  | 🟠  | Tinggi        |         Ya         | `TERBUKA`             | §7     |
| 8   | 1.313 `any` melemahkan seluruh jaring tipe                                 | **F8**  | 🟠  | Sedang        |         Ya         | `TERBUKA`             | §7     |
| 11  | `auth` 762 baris tanpa lapisan apa pun                                     | **F5**  | 🟠  | Rendah        |       Tidak        | `TERBUKA`             | §2     |
| 6   | 222 query SQL di lapisan rute, repository tak ada                          | **F9**  | 🟠  | Tinggi        |         Ya         | `TERBUKA`             | §3     |
| 5   | Routing palsu + 47 props di satu persimpangan                              | **F10** | 🔴  | Tinggi        |         Ya         | `TERBUKA`             | §5     |
| 7   | 59% baris kode di 37 berkas > 500 baris                                    | **F10** | 🟠  | Tinggi        |         Ya         | `TERBUKA`             | §2     |
| 21  | `authStore` & `uiStore` menganggur                                         | **F10** | 🟡  | Rendah        |       Tidak        | `DITUNDA` (disengaja) | §5.3   |
| 14  | Kontras sidebar & jarak target sentuh                                      | **F12** | 🟠  | Sedang        |       Tidak        | `TERBUKA`             | §8     |
| 13  | 28 berkas `dark:` + 48 hex di luar token                                   | **F12** | 🟡  | Sedang        |       Tidak        | `TERBUKA`             | §8     |

---

## §1.5 PETA FASE — panggil pekerjaan lewat nomor fase

Cukup sebut **"kerjakan F2"** dan seluruh cakupannya sudah terdefinisi di sini:
item apa saja, syarat masuk, definisi selesai, target terukur, dan gerbang keluar.

### Indeks cepat

|  Fase   | Nama                               | Item                                 | Sesi | Risiko            | Perlu pemilik?                    | Status     |
| :-----: | ---------------------------------- | ------------------------------------ | ---- | ----------------- | --------------------------------- | ---------- |
| **F0**  | Kejelasan & fondasi dokumen        | #1, #12, #10                         | 1–2  | Sangat rendah     | —                                 | `TERBUKA`  |
| **F1**  | Storage minimal — buka jalan rilis | #2, #15                              | 1–2  | Rendah            | **Ya** — kredensial & 1 keputusan | `MENUNGGU` |
| **F2**  | Audit & perbaikan LOGIKA           | #16, #18, #19, #20                   | 3–5  | Rendah            | **Ya** — 3 keputusan              | `TERBUKA`  |
| **F3**  | Audit UI menyeluruh                | #17                                  | 2–4  | Sangat rendah     | **Ya** — login                    | `MENUNGGU` |
| **F4**  | Performa muat                      | #3                                   | 1    | Rendah–sedang     | —                                 | `TERBUKA`  |
| **F5**  | **SSO Google/Microsoft** (poin 1)  | #11 → #29                            | 4–6  | Tinggi            | **Ya** — 5 keputusan + login uji  | `TERBUKA`  |
| **F6**  | **Email: 3 fungsi** (poin 2, 3, 4) | #22, #23, #24 → #25 → #26, #27 → #28 | 3–4  | Rendah–sedang     | **Ya** — 2 keputusan              | `TERBUKA`  |
| **F7**  | Kontrak & validasi                 | #4                                   | 3–5  | Sedang            | —                                 | `TERBUKA`  |
| **F8**  | Jaring pengaman                    | #9, #8                               | 4–6  | Rendah            | —                                 | `TERBUKA`  |
| **F9**  | Lapisan backend                    | #6                                   | 6–10 | Tinggi            | —                                 | `TERBUKA`  |
| **F10** | Arsitektur frontend                | #5, #7, #21                          | 8–15 | **Sangat tinggi** | —                                 | `TERBUKA`  |
| **F11** | Drive-per-user (OPSIONAL)          | #30                                  | 6–10 | Tinggi            | **Ya** — keputusan ulang          | `DITUNDA`  |
| **F12** | Konsolidasi desain                 | #14, #13                             | 2–3  | Rendah            | —                                 | `TERBUKA`  |

\*Perkiraan kasar dan **belum terverifikasi** — untuk membandingkan bobot antar
fase, bukan janji jadwal. Perbarui dengan angka nyata setelah fase pertama tutup.

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

#### F5.1 · Keputusan & desain (tanpa kode)

Lima keputusan yang **tidak bisa diubah murah** setelah ada user memakainya.

| #   | Keputusan        | Rekomendasi                                                                                | Kalau salah pilih                               |
| --- | ---------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| 1   | Provider         | **Keduanya** — Google & Microsoft sama-sama OIDC, satu adaptor generik melayani dua-duanya | Pilih satu lalu menambah nanti = rombak adaptor |
| 2   | Penautan akun    | Tautkan otomatis **HANYA bila `email_verified=true`**                                      | Tanpa syarat itu → **pengambilalihan akun**     |
| 3   | Batas domain     | Daftar domain diizinkan, dari env                                                          | Tanpa batas, siapa pun bisa mendaftar           |
| 4   | Status user baru | Tetap `pending` menunggu admin                                                             | `active` langsung = pintu masuk tanpa penjaga   |
| 5   | Password lama    | Tetap hidup berdampingan                                                                   | Mematikannya mengunci user tanpa akun provider  |

**Definisi selesai:** kelima keputusan tertulis di dokumen ini sebagai keputusan
resmi.

⚠️ Keputusan #2 adalah **satu-satunya lubang keamanan serius** di rencana ini.
Tanpa memeriksa `email_verified`, seseorang bisa membuat akun provider memakai
alamat email orang lain lalu tertaut ke akun LanPro milik korban.

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

#### F5.3 · Fondasi OIDC generik

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

| Aturan                        | Perilaku                                  |
| ----------------------------- | ----------------------------------------- |
| `email_verified=false`        | **Tolak**, jangan tautkan                 |
| Email cocok user yang ada     | Tautkan — simpan `provider` + `sub`       |
| Email belum ada               | Buat user baru, `status='pending'`        |
| Domain di luar daftar         | Tolak dengan pesan jelas                  |
| `sub` sudah tertaut user lain | Tolak — jangan pindahkan tautan diam-diam |

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

| Uji                                 | Harus                                  |
| ----------------------------------- | -------------------------------------- |
| Login Google akun terdaftar         | Masuk, JWT terbit                      |
| Login Microsoft akun terdaftar      | Masuk                                  |
| Email di luar domain                | Ditolak, pesan jelas                   |
| `email_verified=false`              | Ditolak                                |
| Akun baru                           | `pending`, belum bisa masuk            |
| `id_token` palsu/kedaluwarsa        | Ditolak — **uji di salinan luar repo** |
| **Login password lama masih jalan** | ✅ wajib                               |
| Force-logout                        | Sesi SSO ikut mati                     |

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

### F11 · Drive-per-user (OPSIONAL)

Ditunda dengan sengaja. Setelah F5 selesai, fondasi OAuth sudah ada sehingga
biayanya turun drastis — **tapi risikonya tidak berubah**: kolaborasi lintas
anggota, kontinuitas saat karyawan keluar, pemrosesan AI yang butuh isi berkas,
dan kuota Drive pribadi. Karena itu fase ini **dinilai ulang**, bukan otomatis
dikerjakan.

| Item | Pekerjaan              | Definisi selesai                                                      |
| ---- | ---------------------- | --------------------------------------------------------------------- |
| #30  | Adaptor Drive per user | Hanya bila pemilik proyek memutuskan tetap menginginkannya setelah F5 |

**Syarat masuk:** F5 lulus + keputusan ulang pemilik proyek.

⚠️ `storage.service` sekarang tidak punya konsep pemilik —
`simpanBerkas(nama, isi, tipe)` tidak tahu berkas itu milik siapa. Fase ini
**mengubah kontrak lapisan**, bukan sekadar menambah driver ketiga.

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

| Fitur            | Berkas |  Baris | types | lib | services | components | barrel | Skor   |
| ---------------- | -----: | -----: | :---: | :-: | :------: | :--------: | :----: | ------ |
| flowchart        |     22 | 10.136 |  ✅   | ✅  |    ✅    |     ✅     |   ❌   | 4/5    |
| dashboard        |     15 |  3.638 |  ✅   | ❌  |    ✅    |     ✅     |   ✅   | 4/5    |
| wiki             |      5 |  1.943 |  ✅   | ❌  |    ✅    |     ✅     |   ✅   | 4/5    |
| qa               |      9 |  2.885 |  ✅   | ❌  |    ✅    |     ✅     |   ❌   | 3/5    |
| users            |      9 |  3.654 |  ✅   | ❌  |    ✅    |     ❌     |   ✅   | 3/5    |
| kanban           |      8 |  1.240 |  ✅   | ❌  |    ✅    |     ✅     |   ❌   | 3/5    |
| issues           |      8 |  4.328 |  ✅   | ❌  |    ✅    |     ❌     |   ✅   | 3/5    |
| meeting-notes    |      7 |  4.183 |  ✅   | ✅  |    ✅    |     ❌     |   ❌   | 3/5    |
| settings         |      7 |  1.064 |  ❌   | ❌  |    ✅    |     ✅     |   ❌   | 2/5    |
| notebook-lm      |      3 |  1.355 |  ❌   | ❌  |    ✅    |     ❌     |   ✅   | 2/5    |
| planning         |      5 |    702 |  ✅   | ❌  |    ➖    |     ❌     |   ❌   | 1/4    |
| sidebar          |      5 |    611 |  ✅   | ❌  |    ➖    |     ❌     |   ❌   | 1/4    |
| timeline         |      3 |  2.300 |  ❌   | ❌  |    ➖    |     ❌     |   ✅   | 1/4    |
| master           |      2 |  1.699 |  ❌   | ❌  |    ✅    |     ❌     |   ❌   | 1/5    |
| backup           |      2 |    419 |  ❌   | ❌  |    ✅    |     ❌     |   ❌   | 1/5    |
| connect          |      2 |    296 |  ❌   | ❌  |    ✅    |     ❌     |   ❌   | 1/5    |
| enterprise-audit |      3 |    714 |  ❌   | ❌  |    ✅    |     ❌     |   ❌   | 1/5    |
| explorer         |      2 |    646 |  ❌   | ❌  |    ✅    |     ❌     |   ❌   | 1/5    |
| team             |      2 |    688 |  ❌   | ❌  |    ✅    |     ❌     |   ❌   | 1/5    |
| activity         |      1 |    192 |  ❌   | ❌  |    ➖    |     ❌     |   ❌   | 0/4    |
| auth             |      1 |    762 |  ❌   | ❌  |    ➖    |     ❌     |   ❌   | 0/4 🔴 |

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

| Tanggal     | Fase | Item                                          | Branch / Commit           | Sebelum | Sesudah | Terverifikasi dengan |
| ----------- | :--: | --------------------------------------------- | ------------------------- | ------- | ------- | -------------------- |
| 15 Agu 2026 |  —   | Baseline audit                                | `docs/audit-baseline`     | —       | —       | seluruh perintah §9  |
| 15 Agu 2026 |  —   | Pemfasean F0–F7                               | `docs/audit-fase`         | —       | —       | —                    |
| 15 Agu 2026 |  —   | Audit logika & UI masuk fase (F0–F9, 21 item) | `docs/audit-fase-lengkap` | —       | —       | —                    |

### Gerbang fase yang sudah lulus

| Fase | Nama                               | Tanggal lulus | Dibuktikan dengan |
| :--: | ---------------------------------- | ------------- | ----------------- |
|  F0  | Kejelasan & fondasi dokumen        | belum         | —                 |
|  F1  | Storage minimal — buka jalan rilis | belum         | —                 |
|  F2  | Audit & perbaikan LOGIKA           | belum         | —                 |
|  F3  | Audit UI menyeluruh                | belum         | —                 |
|  F4  | Performa muat                      | belum         | —                 |
|  F5  | SSO Google/Microsoft               | belum         | —                 |
|  F6  | Email: 3 fungsi                    | belum         | —                 |
|  F7  | Kontrak & validasi                 | belum         | —                 |
|  F8  | Jaring pengaman                    | belum         | —                 |
|  F9  | Lapisan backend                    | belum         | —                 |
| F10  | Arsitektur frontend                | belum         | —                 |
| F11  | Drive-per-user (OPSIONAL)          | belum         | —                 |
| F12  | Konsolidasi desain                 | belum         | —                 |

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

| Area                                          | Kenapa berisiko                                                                                            | Status    |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------- |
| RBAC / permission per peran                   | `hasPermission` dioper sebagai prop ke seluruh view; satu kekeliruan membocorkan fitur ke peran yang salah | `TERBUKA` |
| 104 endpoint                                  | Tak satu pun diuji perilakunya                                                                             | `TERBUKA` |
| Perhitungan (progress, sprint, KPI, timeline) | Salah hitung tidak melempar error — ia hanya menampilkan angka keliru                                      | `TERBUKA` |
| Alur state antar view                         | 21 `useState` + 21 `useEffect` di `AppContainer`, dioper 47 props                                          | `TERBUKA` |
| Socket.IO realtime                            | Pemancaran event sebagian di `runAIPipeline()` yang jalan **setelah** response terkirim                    | `TERBUKA` |
| Race condition / concurrency                  | Ada 1 test, belum ditelaah cakupannya                                                                      | `TERBUKA` |
| Alur unggah–simpan–tampil berkas              | Baru dibaca kodenya (§6.1), belum dijalankan                                                               | `TERBUKA` |
| Penanganan error & rollback transaksi         | Belum ditelaah                                                                                             | `TERBUKA` |
| Kedaluwarsa & refresh JWT                     | Belum ditelaah                                                                                             | `TERBUKA` |

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
