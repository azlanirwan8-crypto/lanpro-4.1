# Analisa Teknis: Fidelitas Draw.io (#685)

Tanggal: 10 Oktober 2026  
Status: analisa dan spesifikasi handoff — diperbarui 11 Oktober 2026: **penerimaan A selesai, penerimaan C sebagian selesai, penerimaan B BELUM (blocker, lihat §10)**  
Keputusan pemilik proyek: **Opsi A, tampilan memakai renderer draw.io yang sama**

## 1. Keputusan dan jawaban singkat

Flowchart LanPro **belum sama persis dengan draw.io**. Keputusan Opsi A menetapkan arah kerja, bukan bukti bahwa implementasinya sudah ada. Item #685 masih berstatus `BELUM` di `AUDIT.md`.

Target yang dipilih adalah mempertahankan dokumen `.drawio` sebagai sumber asli dan merendernya melalui build renderer draw.io yang versinya dipatok. Konversi ke bentuk native LanPro tetap merupakan alur terpisah untuk penyuntingan yang didukung; konversi itu tidak boleh mengklaim kompatibilitas universal atau membuang atribut yang tidak didukung tanpa laporan.

Klaim “10000% sama” tidak mempunyai definisi teknis. Klaim yang dapat diuji harus menyatakan versi renderer, browser/engine, font, ukuran viewport, zoom, tema, sumber diagram, dan apakah yang dibandingkan adalah gambar, data, atau pengalaman editor. Parity piksel hanya dapat dijanjikan untuk lingkungan uji yang dikunci, bukan untuk setiap browser, sistem operasi, font, dan semua file yang mungkin dibuat di draw.io.

## 2. Ruang lingkup

Termasuk:

- File `.drawio`/XML yang diunggah atau dibuka di LanPro.
- Penyimpanan sumber yang dapat dibuka kembali tanpa kehilangan XML.
- Mode tampilan dengan renderer draw.io yang dipatok versinya.
- Alur konversi native LanPro yang eksplisit, dengan laporan batas/kehilangan.
- Pengujian data, visual, penyimpanan, keamanan, dan browser.

Tidak termasuk:

- Miro JSON/CSV atau parity Miro; itu wilayah #611 dan keputusan terpisah.
- Menjanjikan parity universal untuk konversi objek native LanPro.
- Mengubah semua flowchart LanPro lama menjadi format draw.io.
- Mengganti renderer atau menyimpan XML ke database sebelum batas ukuran, keamanan, dan dampak operasional diukur.

## 3. Kondisi teknis yang terukur

### 3.1 Jalur impor native sekarang bersifat konversi

`parseUniversalDiagram()` mengenali `.drawio` dan meneruskannya ke `parseDrawIoXML()`. Hasil abstraksinya adalah `ParsedDiagram` yang berisi `nodes` dan `edges`, bukan dokumen XML sumber. `parseDrawIoXML()` mengubah sel dan atribut gaya menjadi `FlowNode`/`FlowEdge`, lalu menormalkan koordinat melalui `autoCenterAndNormalizeDiagram()`.

Konsekuensi: alur ini berguna untuk membuat objek LanPro yang dapat diedit, tetapi tidak mempertahankan keseluruhan representasi draw.io. Posisi juga dapat digeser saat normalisasi. Pada checkout root yang dianalisis, vertex tanpa koordinat memakai `Math.random()` sebagai posisi cadangan; hasil impor yang sama karena itu tidak deterministik untuk kasus tersebut.

### 3.2 Renderer native dan skema LanPro tidak sama dengan draw.io

Model `FlowNode`/`FlowEdge` hanya memiliki medan yang dipilih LanPro. Parser dan exporter menangani banyak gaya penting, tetapi proyek sudah mencatat batas: beberapa bentuk draw.io tidak mempunyai padanan native; label dengan gaya campuran tidak dapat direpresentasikan oleh satu `textarea`; dash pattern bebas tidak terlihat sama pada jalur bentuk div; dan rute otomatis dihitung ulang oleh algoritma LanPro.

`eksporDrawio()` membangun `.drawio` baru dari node/edge LanPro. Itu bukan pengembalian byte XML asli. Walaupun round-trip properti yang didukung lulus, atribut yang tidak masuk ke model tidak dapat dijamin ikut kembali.

### 3.3 Persistensi papan saat ini

`flowchart.service.ts` menyimpan payload papan sebagai JSON `nodes`/`edges` di kolom `Documents.canvasData`. Bentuk payload ini tidak dengan sendirinya menyediakan tempat bagi XML sumber yang utuh. Skema dokumen juga membatasi ukuran `canvasData` (item #584 mencatat batas 8 MB). Menaruh XML besar dalam JSON/base64 dapat menambah ukuran dan menabrak batas; keputusan persistensi harus mengukur payload nyata, autosave, API, serta batas database terlebih dahulu.

### 3.4 Tes yang sudah ada bukan bukti parity universal

- `eksporDrawio-659.test.tsx` membuktikan sebagian properti model bertahan pada import → export → import. Test mengecualikan id dan koordinat absolut karena normalisasi.
- `tabelKesetiaan-660.test.tsx` mengunci subset properti pada model dan DOM; catatannya sendiri membedakan batas DOM test dari cascade CSS/browser.
- Test #654–#670 mengatasi sejumlah kehilangan yang ditemukan. Keberhasilan test tersebut membuktikan kasus yang diuji, bukan seluruh format `.drawio` atau kesamaan visual semua file.

## 4. Definisi penerimaan parity

Pisahkan tiga klaim berikut; jangan menggantikan satu dengan yang lain.

### A. Kesetiaan sumber

- Byte/isi XML sumber tetap tersedia sesudah unggah, simpan, muat ulang, dan ekspor sumber.
- Hash SHA-256 sumber sebelum dan sesudah siklus simpan/muat sama, kecuali format secara eksplisit dinormalisasi oleh draw.io dan hasil tersebut disetujui sebagai aturan.
- Multi-page, metadata, tema/diagram config, atribut tak dikenal, dan kompresi tidak boleh dibuang senyap.

### B. Kesetiaan visual

- Render LanPro menggunakan renderer draw.io yang sama dan versi yang dipatok; bukan hasil konversi ke bentuk native.
- Bandingkan area diagram saja, bukan toolbar/editor chrome.
- Fixture dirender pada browser engine, ukuran viewport, zoom, font, device scale factor, dan warna/latar yang sama.
- Untuk konfigurasi deterministik yang sama, screenshot acuan dan hasil LanPro harus pixel-identical (0 piksel berbeda). Jika renderer menghasilkan variasi lingkungan, definisikan toleransi dan alasan sebelum menyatakan lulus; jangan mengubah toleransi setelah melihat kegagalan.
- Uji manual tab bersih memastikan file nyata terlihat dan kontrol zoom/halaman tidak mengubah isi diagram.

### C. Kesetiaan konversi native

- Bukan bagian dari jaminan universal Opsi A.
- Untuk setiap konversi native, tampilkan hasil konversi dan daftar properti/bentuk yang tidak dapat dipertahankan sebelum pengguna mengganti sumber.
- Tidak boleh menyimpan hasil konversi native menimpa sumber `.drawio` tanpa tindakan pengguna yang jelas.
- Round-trip native tetap diuji terhadap subset yang didukung, termasuk regressi #659/#660.

## 5. Rancangan arsitektur yang direkomendasikan

### 5.1 Pisahkan sumber, tampilan, dan model edit

Sumber `.drawio` adalah artefak kanonik untuk mode parity. Renderer draw.io yang dipatok membaca sumber itu langsung di permukaan tampilan LanPro. Model native `nodes`/`edges` tetap digunakan untuk papan native dan konversi edit yang didukung.

Jangan menganggap `nodes`/`edges` dapat merekonstruksi XML lengkap. Jangan menjalankan native parser saat hanya ingin menampilkan diagram sumber.

### 5.2 Tentukan tingkat parity editor

Ada dua tingkat yang tidak boleh dicampur:

1. **Parity tampilan.** Pengguna melihat diagram dengan renderer draw.io, tetapi LanPro tidak menyediakan edit node/edge native pada mode itu. Ini hanya memenuhi “terlihat sama”.
2. **Parity editor.** Pengguna mengedit diagram di LanPro dengan perilaku draw.io. Ini membutuhkan editor draw.io penuh yang ditanam/di-host di dalam pengalaman LanPro, mempertahankan XML sebagai sumber, serta menghubungkan alur load/save/undo/redo/halaman lewat API editor yang didukung. Menampilkan SVG atau gambar hasil render tidak memenuhi syarat ini.

Jika mandat “sama persis” mencakup tindakan editing dan interaksi, target implementasi harus tingkat 2. Jangan mengklaimnya dari proof-of-concept viewer. Uji alat penuh juga harus memastikan shortcut tidak berbenturan dengan shortcut aplikasi LanPro, dialog editor tidak lolos dari batas origin, dan penyimpanan hasil edit mengembalikan XML yang masih dapat dibuka draw.io. Jika integrasi editor penuh tidak dapat memenuhi keamanan/offline/kebijakan deployment, laporkan sebagai blocker untuk keputusan pemilik; jangan diam-diam mengganti target menjadi viewer.

### 5.3 Persistensi sumber

Sebelum memilih penyimpanan, ukur tiga kemungkinan:

1. Tambah objek versi di payload `canvasData` yang saat ini berisi `nodes`/`edges`, misalnya metadata format dan sumber mentah.
2. Simpan sumber di penyimpanan berkas yang sudah didukung proyek dan simpan referensi/hash di payload.
3. Tambah kolom/entitas khusus hanya bila batas payload dan pola penyimpanan saat ini tidak memadai.

Opsi pertama hanya layak bila ukuran maksimum, autosave, validasi request, pembacaan legacy, backup, dan pemulihan sudah diuji. Opsi berkas perlu kebijakan akses, retensi, batas ukuran, dan lifecycle yang sama dengan dokumen lain. Opsi skema membutuhkan persetujuan/migrasi sesuai aturan proyek. Jangan memutuskan hanya demi menghindari migrasi.

Payload lama `{nodes, edges, ...}` harus tetap bisa dimuat. Tambahkan discriminator versi yang eksplisit untuk format baru; jangan menebak format berdasarkan isi secara longgar dan jangan mengubah payload lama saat pembacaan.

### 5.4 Pilihan hosting renderer/editor

Tiket memilih renderer draw.io yang sama, tetapi belum memilih model deployment. AI pelaksana harus membandingkan dan melaporkan opsi untuk renderer **dan, bila parity editor diminta, editor penuh**:

- Self-hosted build draw.io yang dipatok: kendali versi, privasi, dan kemungkinan offline lebih baik; ada biaya hosting, pembaruan keamanan, ukuran aset, dan pemeliharaan.
- Hosted renderer resmi: integrasi awal mungkin lebih sederhana, tetapi memerlukan jaringan eksternal, menghadirkan risiko ketersediaan/data keluar, serta harus cocok dengan CSP dan kebijakan proyek.

Rekomendasi awal: evaluasi self-hosted pada origin terpisah terlebih dahulu. Jangan memasang CDN atau dependensi runtime tanpa persetujuan dampak bundle, keamanan, CSP, privasi, dan kebutuhan offline. Catat versi/commit renderer dan sumber build agar hasil dapat direproduksi.

### 5.5 Batas keamanan integrasi

- File XML adalah input tidak tepercaya. Ukur batas bytes sebelum parse; tangani XML cacat, kedalaman/ukuran ekstrem, kompresi bomb, URI eksternal, dan resource eksternal.
- Render dalam konteks terisolasi dari origin aplikasi bila menggunakan iframe; gunakan sandbox dan izin minimum yang kompatibel dengan editor/viewer terpilih.
- Validasi `postMessage` berdasarkan `origin`, `source`, skema pesan, dan ukuran payload. Jangan menerima pesan dari frame lain.
- Jangan menyisipkan XML/label file ke `innerHTML` aplikasi atau mengeksekusi skrip di origin yang memiliki sesi LanPro.
- Kunci versi renderer, CSP `frame-src`/resource terkait, allowlist origin, dan perilaku gagal saat renderer tidak tersedia.
- Jangan mengirim diagram ke layanan pihak ketiga tanpa keputusan eksplisit dan pemberitahuan kepada pengguna.

## 6. Matriks fixture minimum

Pemilik proyek perlu menyediakan satu atau lebih file asli yang mewakili isi yang benar-benar digunakan. Jangan membuat semua fixture sendiri dari XML tulisan tangan.

| Keluarga kasus | Isi yang harus diuji                                                                 | Bukti                                                                     |
| -------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Dokumen dasar  | bentuk, teks, konektor, panah                                                        | count dan screenshot referensi                                            |
| Gaya           | warna solid/none, gradien, opacity, shadow, garis putus/titik                        | screenshot dan nilai sumber tetap utuh                                    |
| Tipografi      | font tersedia/tidak tersedia, ukuran, alignment, label multi-baris dan mixed styling | screenshot dengan font environment tercatat                               |
| Geometri       | waypoint manual, routing otomatis, port/ujung konektor                               | perbandingan visual; routing otomatis harus berasal dari renderer draw.io |
| Shape kompleks | shape library khusus, teks polos, swimlane/container/group bertingkat                | screenshot dan struktur XML dipertahankan                                 |
| Struktur file  | banyak halaman, metadata, format terkompresi, vertex tanpa posisi                    | daftar halaman/sel dan hash sumber                                        |
| Kegagalan      | XML rusak, file besar, kompresi tak valid, renderer offline                          | pesan jelas; tidak membuat/mengosongkan papan diam-diam                   |

Simpan sumber acuan dengan persetujuan pemilik, tanpa data rahasia. Catat nama fixture, hash, versi draw.io asal bila diketahui, dan siapa yang menyetujui penggunaannya.

## 7. Acceptance criteria untuk penutupan #685

1. Keputusan deployment renderer dan persistensi sumber ditulis beserta trade-off; tidak ada CDN/dependensi eksternal yang dipasang tanpa pengukuran dan persetujuan yang diwajibkan.
2. Rekonsiliasi #610 vs #668 berdasarkan kode aktual selesai dan status papan dikoreksi terpisah bila diperlukan. Perubahan #612 pada `.worktrees/fix-drawio-612` dibandingkan dengan checkout root; tidak disalin tanpa review.
3. Satu file `.drawio` asli pemilik digunakan sebagai fixture berizin; fixture dan hash-nya tercatat.
4. Upload → simpan → muat ulang → tampil → ekspor sumber mempertahankan XML sumber dan hash, termasuk halaman/metadata yang didukung.
5. Renderer LanPro memakai build draw.io yang versinya dipatok. Screenshot pada konfigurasi browser/viewport/font yang ditetapkan mempunyai diff 0 piksel, atau toleransi yang disetujui lebih dahulu dan dijustifikasi. Bila mandat mencakup interaksi edit, pengujian harus memakai editor draw.io penuh; viewer saja tidak lulus.
6. Uji dilakukan untuk file terkompresi, multipage, bentuk/label kompleks, routing dan waypoint, serta kegagalan parser/renderer. Test harus memakai bytes file nyata, bukan hanya XML fixture buatan tangan.
7. Mode konversi native terpisah, memperlihatkan daftar batas, tidak mengubah sumber kanonik secara diam-diam, dan test native #659/#660 tetap hijau.
8. Keamanan iframe/postMessage, batas ukuran, CSP, offline/failure state, dan dampak bundle/storage diukur.
9. Seluruh gerbang wajib repo lulus dan aplikasi diperiksa pada tab browser bersih. Kegagalan atau gate yang tidak bisa dijalankan dilaporkan apa adanya.
10. Setelah verifikasi, AUDIT.md diperbarui sesuai status; tidak ada klaim “100% semua draw.io” di luar konfigurasi dan fixture yang dibuktikan.

## 8. Langkah kerja untuk AI pelaksana

1. Baca AGENTS.md serta bagian AUDIT.md yang diwajibkan. Kerjakan hanya #685; ini tiket analisa/implementasi yang disetujui pemilik.
2. Periksa status kerja dan file terbaru. Rekonsiliasi #610/#668 dan audit perubahan #612 pada worktree terpisah.
3. Minta file `.drawio` asli kepada pemilik. Jangan memakai kredensial pemilik atau mengakses layanan eksternal dengan akun pemilik.
4. Buat baseline renderer acuan lebih dahulu: catat versi, browser, font, viewport, zoom, tema, halaman, hash, dan screenshot.
5. Buat proof-of-concept renderer terisolasi; bila editing termasuk mandat, PoC harus memakai editor penuh. Ukur hosting, security, CSP, storage, bundle, offline, shortcut, dan alur save/open sebelum memutuskan integrasi produk.
6. Implementasi hanya sesudah bukti PoC menunjukkan renderer terpilih dapat memenuhi acceptance criteria; jika tidak, laporkan kendala dan minta keputusan baru, jangan menurunkan target diam-diam.
7. Jalankan acceptance criteria, gerbang repo, dan tab browser bersih; laporkan setiap bagian yang belum terverifikasi.

## 9. Prompt ringkas untuk AI lain

> Kerjakan tiket #685 saja. Tujuan yang disetujui adalah Opsi A: pertahankan sumber `.drawio` dan gunakan renderer draw.io berversi tetap. Pastikan mandat “sama persis” berarti tampilan saja atau juga interaksi edit; jika termasuk edit, PoC wajib memakai editor draw.io penuh, bukan viewer/SVG. Baca AGENTS.md dan AUDIT.md sesuai aturan repo. Mulai dengan rekonsiliasi #610/#668, periksa #612 di worktree terpisah terhadap kode root, dan minta fixture `.drawio` asli pemilik. Buat analisa PoC renderer/editor, penyimpanan, dan keamanan terlebih dahulu; jangan memilih hosted/CDN, mengubah skema, atau menimpa sumber tanpa mengukur dan memperoleh keputusan yang diperlukan. Buktikan hash sumber tetap utuh dan screenshot pixel-identical pada lingkungan yang dipatok. Konversi native harus tetap jalur terpisah dengan daftar kehilangan yang terlihat. Jangan mengubah kode sebelum kesimpulan PoC dan risiko dilaporkan; setelah implementasi, jalankan gerbang repo dan verifikasi tab browser bersih. Laporkan secara jujur bila target belum tercapai.

## 10. Status implementasi (11 Oktober 2026)

Dipetakan ke 10 acceptance criteria di §7. Yang lulus hanya yang punya bukti test; sisanya ditulis apa adanya.

- **Kriteria 1 — LULUS.** Keputusan tertulis di dokumen ini. Tidak ada dependensi baru: `package.json` tidak berubah, dan dekompresi memakai `DecompressionStream("deflate-raw")` milik platform, bukan `pako`/`fflate` yang hanya dependensi transitif.
- **Kriteria 2 — LULUS untuk analisisnya.** #610 terbukti sudah diselesaikan kode #668 (`importers.ts` mengakumulasi offset induk-anak; `lib/koordinatAnak-668.test.tsx` menjaganya). Baris #610 belum dipindah ke §1.2 karena `AUDIT.md` sedang disunting sesi lain. Perubahan #612 di `.worktrees/fix-drawio-612` dibandingkan, tidak disalin: dua kebutuhannya dikerjakan ulang di root (dekompresi deflate-raw dan koordinat cadangan deterministik).
- **Kriteria 3 — BELUM.** Fixture `.drawio` asli pemilik belum diterima. Semua test memakai berkas bentuk nyata (base64 + deflate-raw, multi-page, CDATA, XML rusak, lewat batas) yang ditulis menurut keluaran draw.io, tetapi itu bukan pengganti fixture berizin, sehingga parity tidak boleh dinyatakan selesai.
- **Kriteria 4 — LULUS di tingkat data, BELUM di tingkat browser.** `lib/sumberDrawio.ts` menyimpan byte asli tanpa normalisasi dengan discriminator `drawio-xml-v1`; test membuktikan muat ulang dan ekspor ulang identik, dan `services/flowchart.service.ts` menyimpan sumber hanya bila muat — bila tidak muat, papan tetap disimpan dan sumber dibuang **dengan kabar**, bukan diam-diam.
- **Kriteria 5 — BELUM, dan tidak bisa diselesaikan dari mesin kerja ini.** Lihat blocker di bawah. Membungkus SVG/gambar hasil render tidak memenuhi kriteria ini.
- **Kriteria 6 — SEBAGIAN.** Terkompresi, multi-page, dan parser gagal sudah teruji; label kompleks, routing/waypoint, dan bentuk asing baru sebatas laporan batas, dan belum diuji pada bytes file nyata milik pemilik.
- **Kriteria 7 — LULUS.** Konversi native tetap jalur terpisah; laporan batas (halaman gabungan, `shape=` asing, kunci gaya tak dipertahankan, label kaya, routing otomatis) tampil di modal **sebelum** konversi; GABUNG tidak mengadopsi berkas impor sebagai sumber; test #659/#660 tetap hijau.
- **Kriteria 8 — SEBAGIAN.** Batas ukuran sumber (`BATAS_BYTE_SUMBER` 2 MB) dan anggaran payload diukur; tambahan kode produksi 17 KB dan tidak ada chunk baru. Analisis iframe/postMessage/CSP berhenti sebagai dokumen batasan karena renderernya belum ada.
- **Kriteria 9 — SEBAGIAN.** tsc, validate-permissions, delapan audit, build, dan suite penuh (330 berkas / 2212 test) lulus. `audit:papan` merah oleh sisipan sesi lain di §1.1, bukan oleh baris #685. `npm run doctor` merah karena `DATABASE_URL` placeholder, jadi tab browser bersih **belum terverifikasi**.
- **Kriteria 10 — LULUS.** Status #685 di `AUDIT.md` ditulis `BELUM` dengan rincian penerimaan mana yang selesai; tidak ada klaim "100% semua draw.io".

### Blocker penerimaan B (butuh keputusan pemilik, bukan pekerjaan tambahan)

1. Editor draw.io versi patok butuh artefak build yang harus diunduh; mesin kerja ini tidak punya npm maupun jaringan, dan `node_modules` serta npm-cache (917 MB) berisi nol artefak draw.io.
2. Hosting aset puluhan MB di `public/` tidak punya preseden di repo ini — direktori itu 2 KB, dan satu-satunya vendor besar (ffmpeg) justru diambil dari CDN saat jalan.
3. CSP harus diubah lebih dulu: `vercel.json` tidak punya `frame-src` sehingga jatuh ke `default-src 'self'`, sementara `frame-ancestors 'none'` dan `X-Frame-Options: DENY` sudah terpasang.
4. Validasi `postMessage` belum punya preseden sama sekali di `src/`, padahal editor penuh saling kirim pesan dengan aplikasi.

Yang dibutuhkan untuk melanjutkan: keputusan pemilik soal jalur hosting (vendor self-hosted versi patok, atau iframe ke instans draw.io yang dioperasikan sendiri), artefak build draw.io atau akses jaringan, fixture `.drawio` berizin, dan kredensial `DATABASE_URL` untuk verifikasi tab bersih.
