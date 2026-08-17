# Aturan Eksekusi Agen AI — LanPro

Berkas ini dibaca lebih dulu oleh perkakas AI (Claude Code, Antigravity, Cursor,
dan sejenisnya). Isinya **wajib**, bukan saran.

---

## 0. PETA JALAN ANDA ADALAH `AUDIT.md` — BUKAN TEBAKAN ANDA

`AUDIT.md` di akar repositori adalah papan kerja resmi proyek ini. Seluruh
pekerjaan berasal dari sana.

**Sebelum menyentuh kode apa pun:**

1. Baca `AUDIT.md` bagian **MULAI DARI SINI**, lalu **§20**, lalu **§21**.
2. Temukan **nomor item** untuk pekerjaan yang diminta di **§1.1**.
3. **Sebutkan nomor itu kepada pemilik proyek sebelum mulai.**

**Bila permintaan tidak punya nomor item, Anda BELUM boleh mengerjakannya.**
Laporkan bahwa item itu belum ada di papan, usulkan nomor barunya, dan tunggu
jawaban. Menambahkan pekerjaan di luar papan adalah cara paling umum sebuah
perkakas AI merusak repo ini — sudah terjadi, dan biayanya satu sesi penuh
untuk memperbaikinya.

**Yang tidak boleh dikerjakan tanpa jawaban pemilik proyek:**

- Item berstatus **`MENUNGGU`** di §1.1. `MENUNGGU` berarti menunggu KEPUTUSAN
  orang, bukan menunggu pengerjaan. Daftar lengkapnya §20.3.
- Apa pun yang tidak Anda minta izinnya lebih dulu.

**§1 adalah HIPOTESIS, bukan instruksi.** Rumusan item pernah terbukti keliru
tiga kali dalam satu sesi (#69, #87, #77). Ukur dulu, baru tambal. Menambal
sesuai rumusan yang salah menghasilkan kerusakan yang tampak seperti perbaikan.

**Setelah setiap item selesai, `AUDIT.md` WAJIB diperbarui.** Temuan baru
menjadi item bernomor. Jangan menomori ulang item yang sudah ada.

---

## 1. GERBANG WAJIB — sebelum menyatakan apa pun selesai

```bash
npm run doctor && npm run lint && npm test && npm run build && npm run audit:papan && npm run audit:warna && npm run audit:tema
```

Lalu — dan ini **tidak bisa digantikan skrip mana pun**:

**Buka aplikasi di tab peramban yang BERSIH dan pastikan UI benar-benar tampil.**

`npm run build` hijau **BUKAN** bukti aplikasi benar. Kelas Tailwind hanyalah
string bagi kompilator; seluruh tema bisa rusak total sementara keenam perintah
di atas tetap hijau. Konsol peramban juga menyimpan galat hot-reload lama —
karena itu harus **tab bersih**, bukan tab yang sudah lama terbuka. Rinciannya
`AUDIT.md` §15.3 dan §16.

Bila sesuatu tidak terverifikasi, tulis apa adanya: **"belum terverifikasi"**.
Jangan menyatakan selesai atas dasar dugaan.

---

## 2. TEMA & WARNA — baca `AUDIT.md` §22 SEBELUM menyentuhnya

Tema terang/gelap repo ini pernah dirusak oleh perkakas AI yang mengerjakannya
tanpa mengetahui kosakata tokennya. Aturan lengkapnya ada di **`AUDIT.md` §22**.
Ringkasnya:

- Warna diambil dari **token** di `src/index.css`, bukan kelas warna keras
  (`bg-slate-800`, `text-gray-500`, dan sejenisnya).
- Kosakata **tidak boleh bersilangan**: latar memakai `surface-*`, teks memakai
  `content-*`, garis memakai `border-*`. `bg-content-muted` dan
  `text-surface-sunken` adalah kesalahan, bukan gaya penulisan alternatif.
- **Jangan menambah `dark:`.** Mode gelap ditangani token, bukan override.
  Sisa 21 kemunculan di satu berkas dikunci gerbang dan tidak boleh bertambah.
- **Jangan mengubah nilai token** di `src/index.css` untuk memperbaiki satu
  layar. Nilainya dikunci garis dasar; mengubah satu token mengubah seluruh
  aplikasi sekaligus.

`npm run audit:tema` menegakkan keempatnya.

---

## 3. LARANGAN KERAS

- **`src/lib/db.ts` tidak boleh disentuh.** Berkas ini adalah adapter database;
  perubahan di sana berdampak ke seluruh aplikasi.
- **Jangan memakai kredensial pemilik proyek.** Bila verifikasi butuh login,
  **minta pemilik proyek yang login** — jangan mengetikkan kata sandi siapa pun.
- **Jangan menyabotase kode sumber untuk membuktikan sebuah test bisa merah.**
  Pakai `git worktree` DI LUAR repo. Sabotase pernah dilakukan dan menghasilkan
  kerusakan nyata di kode yang sehat.
- **Jangan hardcode daftar peran, status, prioritas, atau departemen.**
  Semuanya berasal dari MasterData, dan yang disimpan ke database adalah
  **`code`**, bukan `label`.
- **Jangan menyisipkan token rahasia, kata sandi, atau URL database** ke dalam
  `.ts`/`.tsx`. Gunakan `process.env`.
- **Jangan mem-bypass Global Error Handler.**

---

## 4. STRUKTUR DIREKTORI

### FRONTEND (`/src`)

- **`src/features/`** — satu folder per domain fitur. Komponen khusus fitur
  masuk ke foldernya sendiri; dilarang mencampur fitur.
- **`src/components/`** — HANYA komponen UI primitif yang stateless dan dipakai
  ulang lintas fitur.
- **`src/hooks/`** — seluruh custom hook lintas fitur.
- **`src/lib/`** — infrastruktur: api, db, permissions, storage.
- **`src/types/roles.ts`** — satu-satunya sumber nama peran. Ada **DUA** enum
  (`SYSTEM_ROLES` dan `PROJECT_ROLES`) karena kode `admin` dan `viewer`
  bertabrakan antar lingkup, dan `admin` sistem memicu God Mode. Jangan
  menyatukannya.
- **`src/lib/matriksAkses.ts`** — matriks otorisasi. Isinya terikat pada tabel
  `AUDIT.md` §19.4/§19.5 lewat 26 test yang MEMBACA `AUDIT.md`. Mengubah salah
  satunya tanpa yang lain akan membuat test merah — itu memang tujuannya.

Komponen raksasa dilarang. Berkas yang melewati 800 baris harus dipecah.
`AppContainer.tsx` masih di atas batas itu — itu **utang yang sudah tercatat**
(item #7, fase F10), bukan izin untuk menambahnya.

### BACKEND (`/server`)

- **`server/routes/`** — HANYA pendaftaran URL endpoint. Tanpa logika bisnis.
- **`server/controllers/`** — seluruh logika bisnis dan eksekusi.
- **`server/middleware/`** — error handler global, JWT, dan RBAC.

Otorisasi proyek memakai **`jagaProyek(modul, aksi)`** dari
`server/middleware/jagaProyek.ts`. `verifyProjectAccess(daftarPeran)` sudah
**PENSIUN** dan tidak boleh dipakai lagi. Penjaga baru didaftarkan saat boot dan
divalidasi `server/middleware/daftarPeranRute.ts` dengan `MODE = "TOLAK"` —
penjaga yang tidak sah membuat server menolak jalan, bukan diam-diam lolos.

---

## 5. DATABASE — POSTGRESQL / NEON

Proyek ini **hanya memakai PostgreSQL**. Tidak ada MySQL di mana pun.

- Dilarang sintaks khas MySQL seperti `ON DUPLICATE KEY UPDATE`. Pakai pola
  SELECT check → UPDATE/INSERT.
- **PostgreSQL melipat identifier tanpa kutip menjadi huruf kecil.** `pointId`
  menjadi `pointid`. Ini penyebab kolom kembar yang sempat ada di repo ini —
  bila Anda butuh camelCase, kutip dua: `"pointId"`.
- `DATABASE_URL` memakai endpoint **`-pooler`**; `SET search_path` tidak dapat
  diandalkan di sana.
- Migrasi ditulis di `src/lib/pg-migrate.ts`. Kolom yang dijatuhkan dari
  database wajib dicabut juga dari sana, agar `npm run db:verify-schema` tidak
  melaporkan production menyimpang.

---

## 6. GIT

- **Satu branch per item.** Merge ke `main` setelah gerbang §1 lulus, lalu
  laporkan sebelum melanjutkan item berikutnya.
- Commit hanya pekerjaan yang sudah diverifikasi.
- Jangan melewati hook (`--no-verify`). Hook `pre-commit` menjalankan gerbang
  papan, warna, dan tema; bila ia merah, perbaiki sebabnya — jangan lewati.

---

## 7. PELAPORAN

Pemilik proyek memakai alur **review-first**: analisa dan laporkan lebih dulu
dengan format A–F, lalu **tunggu persetujuan** sebelum mengubah kode. Laporan
harus jujur, termasuk saat hasilnya buruk atau saat Anda keliru.

Pekerjaan yang melanggar berkas ini ditolak.
