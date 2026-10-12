/**
 * #711 — papan Discussion Points membayar dua kali untuk hal yang sama.
 *
 * Butir "cek lagi ui nya jangan ada tidak smooth" dari pemilik proyek 12 Okt.
 * Yang terukur di kode, bukan dugaan dari jumlah baris:
 *
 *  1. `fetchPoints()` memanggil endpoint komentar untuk SETIAP baris yang
 *     tampil, hanya untuk mencetak satu angka di kolom Utas. Sepuluh baris =
 *     sepuluh permintaan, dan masing-masing memanggil `setCommentsMap` sendiri
 *     — sepuluh render berturut-turut sesudah satu muat.
 *  2. `searchQuery` ikut menentukan kapan papan dimuat, jadi "payment gateway"
 *     mengirim belasan permintaan dan yang terakhir menang.
 *  3. `projectMembers` — array dari induk — duduk di dependensi yang sama,
 *     sehingga setiap render induk yang menyodorkan array baru me-refetch
 *     seluruh papan padahal tidak ada isinya yang berubah.
 *
 * Perbaikan (1) punya preseden di repo ini sendiri: `task.repository.ts:157-174`
 * (#494) menempelkan `commentsCount` dengan satu kueri untuk seluruh halaman.
 *
 * Test ini MEMBACA SUMBER. Yang dikunci adalah JUMLAH permintaan dan urutan
 * state, dan keduanya tidak melempar galat bila mundur: layar tetap tampil,
 * hanya lebih lambat dan lebih berkedip.
 */
import { readFileSync } from "fs";
import { join } from "path";

const AKAR = join(__dirname, "..", "..", "..");
const baca = (relatif: string) => readFileSync(join(AKAR, relatif), "utf8").replace(/\r\n/g, "\n");

const TABEL = "src/features/meeting-notes/DiscussionPointsTable.tsx";
const BARIS = "src/features/meeting-notes/components/BarisDiskusi.tsx";
const KARTU = "src/features/meeting-notes/components/DiscussionPointMobileCardView.tsx";
const REPO = "server/repositories/discussion-points.repository.ts";

describe("#711 — satu kueri untuk seluruh halaman", () => {
  it("repository menempel komentar bersama penerima dan berkas", () => {
    const isi = baca(REPO);
    expect(isi).toContain("FROM discussion_point_comments");
    // `IN (?)` dan BUKAN `IN (?,?,…)`: `convertToPostgres()` melipatnya menjadi
    // `= ANY(?)` yang mensyaratkan array — pelajaran #329 yang sudah menumbangkan
    // #701 di repository yang sama.
    expect(isi).toContain("WHERE pointid IN (?)");
    expect(isi).not.toMatch(/pointid IN \(\?,\?/);
    expect(isi).toContain("commentsCount: daftarKomentar.length");
  });

  it("frontend tidak lagi meminta komentar per baris", () => {
    const isi = baca(TABEL);
    expect(isi).not.toContain("setCommentsMap");
    expect(isi).toContain("jumlahKomentar={p.commentsCount ?? 0}");
    // Laci utas tetap memuat daftar isinya sendiri — itu permintaan yang
    // dikehendaki, satu per klik, bukan sepuluh per muat.
    expect(isi).toContain("getDiscussionPointComments(pointId");
  });

  it("kartu HP membaca balasan yang menempel, bukan peta terpisah", () => {
    const isi = baca(KARTU);
    expect(isi).toContain("p.comments || []");
    expect(isi).not.toContain("commentsMap");
  });
});

describe("#711 — ketikan dan render induk tidak lagi memuat papan", () => {
  it("pencarian berjenget 350 ms, dan yang dikirim bukan yang diketik", () => {
    const isi = baca(TABEL);
    expect(isi).toContain("setTimeout(() => setKueriTertunda(searchQuery.trim()), 350)");
    expect(isi).toContain("search: kueriTertunda");
    // Kotak cari tetap instan: ia membaca `searchQuery`, bukan yang tertunda.
    expect(isi).toContain("cari={searchQuery}");
  });

  it("array anggota proyek bukan lagi penentu kapan papan dimuat", () => {
    const isi = baca(TABEL);
    const muat = isi.slice(
      isi.indexOf("fetchPoints();"),
      isi.indexOf("/* #711 — `projectMembers`")
    );
    expect(muat).toContain("kueriTertunda");
    expect(muat).not.toContain("projectMembers");
  });

  it("miniatur gambar tidak menggeser tata letak saat tiba", () => {
    const isi = baca(BARIS);
    expect(isi).toContain('loading="lazy"');
    expect(isi).toContain('decoding="async"');
  });
});
