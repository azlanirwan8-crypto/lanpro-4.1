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

## §1 PAPAN PRIORITAS — mulai dari sini

| #   | Temuan                                            |  Fase  | Sev | Biaya  | Blokir modul baru? | Status                | Detail |
| --- | ------------------------------------------------- | :----: | :-: | ------ | :----------------: | --------------------- | ------ |
| 1   | Tiga sistem migrasi DB hidup berdampingan         | **F0** | 🔴  | Rendah |         Ya         | `TERBUKA`             | §4     |
| 12  | ARCHITECTURE.md drift di beberapa angka           | **F0** | 🟡  | Rendah |  Ya (menyesatkan)  | `TERBUKA`             | §8     |
| 10  | Schema DB tidak terdokumentasi                    | **F0** | 🟠  | Sedang |         Ya         | `TERBUKA`             | §4     |
| 2   | Driver `s3` belum pernah dieksekusi               | **F1** | 🔴  | Rendah | Blokir production  | `MENUNGGU` kredensial | §6     |
| 15  | Dua Google API key lama belum dicabut             | **F1** | 🔴  | Rendah |       Tidak        | `MENUNGGU` pemilik    | §6     |
| 3   | Nol code splitting — 898 KB gzip satu chunk       | **F2** | 🔴  | Rendah |         Ya         | `TERBUKA`             | §5     |
| 4   | ±100 endpoint tanpa validasi skema                | **F3** | 🔴  | Sedang |   Ya (keamanan)    | `TERBUKA`             | §3     |
| 9   | Rasio test ±1 : 1.000 baris                       | **F4** | 🟠  | Tinggi |         Ya         | `TERBUKA`             | §7     |
| 8   | 1.313 `any` melemahkan seluruh jaring tipe        | **F4** | 🟠  | Sedang |         Ya         | `TERBUKA`             | §7     |
| 11  | `auth` 762 baris tanpa lapisan apa pun            | **F5** | 🟠  | Rendah |       Tidak        | `TERBUKA`             | §2     |
| 6   | 222 query SQL di lapisan rute, repository tak ada | **F5** | 🟠  | Tinggi |         Ya         | `TERBUKA`             | §3     |
| 5   | Routing palsu + 47 props di satu persimpangan     | **F6** | 🔴  | Tinggi |         Ya         | `TERBUKA`             | §5     |
| 7   | 59% baris kode di 37 berkas > 500 baris           | **F6** | 🟠  | Tinggi |         Ya         | `TERBUKA`             | §2     |
| 13  | 28 berkas `dark:` + 48 hex di luar token          | **F7** | 🟡  | Sedang |       Tidak        | `TERBUKA`             | §8     |
| 14  | Kontras sidebar & jarak target sentuh             | **F7** | 🟡  | Sedang |       Tidak        | `TERBUKA`             | §8     |

---

## §1.5 PETA FASE — urutan pengerjaan

Fase disusun berdasarkan **ketergantungan**, bukan sekadar severity. Prinsipnya:

> Bereskan **kejelasan** dulu (F0), lalu yang **memblokir production** (F1),
> lalu **kemenangan murah** (F2–F3), lalu **tebalkan jaring pengaman** (F4),
> **baru** bongkar arsitektur (F5–F6).

Membongkar arsitektur sebelum F4 berarti melakukan refactor besar dengan 84 test
dan 1.313 `any` sebagai satu-satunya pengaman. Itu persis resep untuk mengulang
insiden "28/28 test lolos tapi AppContainer crash".

### Ringkasan fase

|  Fase  | Nama                        | Item         | Sesi (perkiraan) | Risiko regresi    | Status             |
| :----: | --------------------------- | ------------ | ---------------- | ----------------- | ------------------ |
| **F0** | Kejelasan & fondasi dokumen | #1, #12, #10 | 1–2              | Sangat rendah     | `TERBUKA`          |
| **F1** | Buka jalan ke production    | #2, #15      | 1–2              | Rendah            | `MENUNGGU` pemilik |
| **F2** | Performa muat               | #3           | 1                | Rendah–sedang     | `TERBUKA`          |
| **F3** | Kontrak & validasi          | #4           | 3–5              | Sedang            | `TERBUKA`          |
| **F4** | Jaring pengaman             | #9, #8       | 4–6              | Rendah            | `TERBUKA`          |
| **F5** | Lapisan backend             | #11, #6      | 6–10             | Tinggi            | `TERBUKA`          |
| **F6** | Arsitektur frontend         | #5, #7       | 8–15             | **Sangat tinggi** | `TERBUKA`          |
| **F7** | Konsolidasi desain          | #13, #14     | 2–3              | Rendah            | `TERBUKA`          |

> Perkiraan sesi bersifat kasar dan **belum terverifikasi** — ia ada untuk
> membandingkan bobot antar fase, bukan untuk dijadikan janji jadwal. Perbarui
> dengan angka nyata setelah fase pertama selesai.

### Gerbang antar fase

Sebuah fase **tidak boleh dibuka** sebelum gerbang fase sebelumnya lulus.
Gerbang dasar yang berlaku di SEMUA fase:

```bash
npm run doctor && npm run lint && npm test && npm run build
# lalu WAJIB: npm run dev -> buka browser -> pastikan UI benar-benar tampil
```

Build hijau bukan bukti aplikasi jalan (§12 aturan 1). Gerbang tidak lulus bila
langkah browser dilewati.

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
Ditempatkan sesudah F0 hanya karena F0 sangat murah — kalau kredensial bucket
sudah siap, F1 boleh dikerjakan lebih dulu.

| Item | Pekerjaan                      | Definisi selesai                                                    |
| ---- | ------------------------------ | ------------------------------------------------------------------- |
| #2   | Jalankan driver `s3` sungguhan | Lihat urutan wajib di §6.1: **(f) dulu → (d)(e) → baru uji bucket** |
| #15  | Cabut 2 Google API key lama    | Dikonfirmasi tercabut di Google Cloud Console                       |

**Syarat masuk:** pemilik proyek mengisi 6 variabel `STORAGE_*` di `.env`, DAN
menjawab pertanyaan otorisasi di §6.1 (dokumen QA & rekaman: lewat penjaga auth
server, atau langsung dari bucket).

**Gerbang keluar:** unggah 1 avatar + 1 rekaman → **muncul di bucket** DAN
**tampil di browser** → objek uji dihapus. `npm run doctor` HIJAU.

⚠️ **Doctor hijau bukan bukti jalur s3 jalan** (§6.1). Gerbang ini hanya lulus
lewat unggahan nyata yang terlihat di bucket dan di browser.

---

### F2 · Performa muat

**Kenapa di sini.** Biaya paling rendah dengan dampak paling terasa bagi
pengguna, dan **tidak bergantung pada fase mana pun**. Menundanya sampai setelah
F5/F6 berarti setiap modul baru memperburuk bundel lebih dulu.

| Item | Pekerjaan                                                              | Definisi selesai                                                    |
| ---- | ---------------------------------------------------------------------- | ------------------------------------------------------------------- |
| #3   | 19 import statis di `AppRoutes.tsx` → `React.lazy` + satu `<Suspense>` | Bundle utama turun signifikan; tiap fitur besar jadi chunk terpisah |

**Target terukur:** bundle utama gzip **898 KB → di bawah 400 KB**.

**Gerbang keluar:** gerbang dasar + ukur ulang dengan perintah bundle di §9
(**setelah `npm run build`, bukan `npm run dev`**) + buka minimal 5 view berbeda
di browser dan pastikan tidak ada layar kosong saat chunk dimuat.

---

### F3 · Kontrak & validasi

**Kenapa sebelum F5.** Menulis skema zod memaksa bentuk data tiap endpoint
menjadi eksplisit. Bentuk itulah bahan mentah untuk repository di F5 — mengerjakan
F5 lebih dulu berarti merancang repository di atas tipe yang masih `any`.

| Item | Pekerjaan                     | Definisi selesai                                          |
| ---- | ----------------------------- | --------------------------------------------------------- |
| #4   | Skema zod untuk ±100 endpoint | Tiap endpoint memvalidasi body/param sebelum menyentuh DB |

**Kerjakan per domain**, bukan sapuan sekali jadi. Urutan yang disarankan
mengikuti bobot query di §3.1: `auth` → `task` → `qa` → `project` → sisanya.

**Gerbang keluar per domain:** gerbang dasar + himpunan rute sebelum/sesudah
identik.

⚠️ **Jangan verifikasi rute lewat status 401** — middleware auth berjalan sebelum
handler 404, jadi rute palsu pun menjawab 401 (§12).

---

### F4 · Jaring pengaman

**Kenapa wajib sebelum F5–F6.** Ini fase yang menentukan apakah dua fase terakhir
aman dikerjakan. Refactor besar dengan 84 test dan 1.313 `any` adalah judi.

| Item | Pekerjaan                                              | Definisi selesai                                                       |
| ---- | ------------------------------------------------------ | ---------------------------------------------------------------------- |
| #9   | Tambah test, prioritaskan **test render** jalur kritis | Tiap fitur besar punya minimal 1 test render                           |
| #8   | Kurangi `any` **di jalur yang akan disentuh F5–F6**    | `AppContainer`, `AppRoutes`, rute ber-query terbanyak tidak lagi `any` |

**Target terukur:** rasio test 1:1.000 → **1:400 atau lebih baik**; `any` 1.313 →
**di bawah 900**.

⚠️ **Jangan mengejar angka `any` secara global.** Yang bernilai hanya `any` di
jalur yang akan di-refactor. Menghapus `any` di berkas yang tidak tersentuh hanya
menghabiskan sesi.

⚠️ Setelah menambah test, **periksa jumlahnya benar-benar bertambah** — pernah
penyisipan gagal diam-diam karena Prettier (§12).

**Gerbang keluar:** gerbang dasar + jumlah test naik terverifikasi + test render
sengaja dibuat merah **di salinan luar repo** untuk membuktikan ia benar-benar
menangkap crash.

---

### F5 · Lapisan backend

| Item | Pekerjaan                             | Definisi selesai                                                                |
| ---- | ------------------------------------- | ------------------------------------------------------------------------------- |
| #11  | Pecah `auth` (762 baris, nol lapisan) | Mengikuti pola acuan; dikerjakan **pertama** karena kecil dan jadi latihan pola |
| #6   | Bangun lapisan repository             | Query di `server/routes/` **222 → 0**                                           |

**Syarat masuk:** F4 lulus.

**Urutan per berkas** mengikuti bobot di §3.1: `task` (46) → `qa` (33) →
`project` (30) → `meetings` (19) → sisanya.

⚠️ **Cek DOMAIN NYASAR lebih dulu.** Pelajaran dari dua langkah L4 sebelumnya:
kalau di berkas itu ada domain yang nyasar, **pecah domainnya dulu** — jauh lebih
murah dan aman daripada langsung membangun repository di atas berkas campur.

**Gerbang keluar:** gerbang dasar + perbandingan himpunan rute + `diff` keluaran
`tsc` baris-per-baris (bukan hitung total — ini sudah 4x menangkap simbol
terlewat).

---

### F6 · Arsitektur frontend

**Fase paling berisiko di seluruh peta.** Jangan dimulai di sesi yang ruang
konteksnya sudah sempit.

| Item | Pekerjaan                                                    | Definisi selesai                                                                                            |
| ---- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| #5   | Routing sungguhan (react-router sudah terpasang, menganggur) | URL berubah saat pindah view; deep-link & tombol back berfungsi; `AppRoutesProps` 47 props menyusut drastis |
| #7   | Pecah 37 berkas > 500 baris                                  | Konsentrasi baris **59% → di bawah 35%**                                                                    |

**Syarat masuk:** F4 lulus **dan** F5 lulus. Memindahkan routing sementara state
masih terikat `AppContainer` 4.481 baris akan menghasilkan dua sumber kebenaran.

**Urutan aman memecah berkas** (ARCHITECTURE.md §2, risiko menaik):
tipe → fungsi murni → konstanta → panggilan API → **baru** komponennya.

⚠️ Setelah **tiap langkah**, `diff` keluaran `tsc` baris-per-baris.

**Gerbang keluar:** gerbang dasar + klik seluruh menu sidebar di browser +
refresh di tiap view memuat view yang sama (bukti routing sungguhan).

---

### F7 · Konsolidasi desain

Dipisah ke akhir bukan karena tidak penting, melainkan karena **tidak memblokir
apa pun** dan akan tersentuh ulang bila F6 memindahkan komponen.

| Item | Pekerjaan                                                        | Definisi selesai                       |
| ---- | ---------------------------------------------------------------- | -------------------------------------- |
| #14  | Perbaiki **palet sidebar**, bukan menambal per-node              | 20/20 node lulus WCAG AA di kedua mode |
| #13  | 28 berkas `dark:` → token; 48 hex di `className`/`style` → token | Keduanya nol                           |

⚠️ Kontras sidebar gagal dengan angka hampir sama di mode terang **maupun** gelap
(§8) — itu bukti masalahnya di palet, bukan di penanganan mode gelap. Menambal
per-node akan menghabiskan waktu tanpa menyelesaikan sebabnya.

⚠️ Angka #14 **diwarisi dari audit lama dan belum diukur ulang** (§11). Ukur ulang
dulu sebelum mengerjakannya.

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

| Tanggal     | Fase | Item            | Branch / Commit       | Sebelum | Sesudah | Terverifikasi dengan |
| ----------- | :--: | --------------- | --------------------- | ------- | ------- | -------------------- |
| 15 Agu 2026 |  —   | Baseline audit  | `docs/audit-baseline` | —       | —       | seluruh perintah §9  |
| 15 Agu 2026 |  —   | Pemfasean F0–F7 | `docs/audit-fase`     | —       | —       | —                    |

### Gerbang fase yang sudah lulus

| Fase | Tanggal lulus | Dibuktikan dengan |
| :--: | ------------- | ----------------- |
|  F0  | belum         | —                 |
|  F1  | belum         | —                 |
|  F2  | belum         | —                 |
|  F3  | belum         | —                 |
|  F4  | belum         | —                 |
|  F5  | belum         | —                 |
|  F6  | belum         | —                 |
|  F7  | belum         | —                 |

---

## §11 Batas audit ini — yang BELUM terverifikasi

Ditulis eksplisit supaya tidak ada yang salah menganggapnya sudah dicek.

| Hal                                       | Alasan                                                                                                                                                                   |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **UI & flow di balik login**              | Sesi login habis. Audit UI terbatas pada halaman Sign In (ter-render benar, console bersih) + analisa statis. Verifikasi lanjutan butuh pemilik proyek login lebih dulu. |
| **Loading time production**               | Hanya diukur di dev server localhost, yang tidak representatif. Yang sah: 898 KB gzip.                                                                                   |
| **Layar > 1024px**                        | Panel pengujian terbatas 679px.                                                                                                                                          |
| **Kontras sidebar & jarak target sentuh** | Angka diwarisi dari audit sebelumnya, **tidak diukur ulang** dalam audit ini.                                                                                            |
| **Fungsi 104 endpoint**                   | Tidak diuji satu per satu.                                                                                                                                               |
| **Kelengkapan daftar 10 tabel**           | Hasil pemindaian teks, bukan pembacaan schema hidup dari Neon.                                                                                                           |

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
