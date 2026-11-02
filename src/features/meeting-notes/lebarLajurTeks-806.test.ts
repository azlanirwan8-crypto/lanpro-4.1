/**
 * #806 — TOPIK, CATATAN, dan TINDAK LANJUT dibayar dengan lebar, bukan dengan
 * plafon tinggi.
 *
 * Permintaan pemilik proyek 02 Nov 2026: "untuk kolom tersebut agar dilebarkan
 * lagi agar tampil semuanya bukan setengah, rapikan". Yang diukur lebih dulu:
 * "setengah" itu dua sebab yang berbeda. Lebar kolom (TOPIK 220, CATATAN 190,
 * TINDAK LANJUT 220 px) DAN plafon tinggi sel `max-h-16` = 64 px ≈ tiga baris
 * yang dipasang #765 butir (f) justru supaya EMPAT baris papan muat di layar.
 * Pemilik memilih menaikkan lebarnya saja dan MEMBIARKAN plafonnya, jadi
 * paragraf panjang masih menggulir di dalam sel — itu keputusan, bukan sisa
 * pekerjaan.
 *
 * Angka ditulis di dua tempat yang harus selalu sama, dan itu sudah dijaga
 * `kepalaSelSejajar-715.test.ts` (sebelas lebar kepala = `min-w` wadah). Test
 * ini tidak mengulang aritmetika itu; yang dikunci di sini adalah NILAI
 * keputusannya, supaya "merapikan kolom" tidak bisa diam-diam diputar kembali
 * oleh perkakas berikutnya.
 */
import { readFileSync } from "fs";
import { join } from "path";

const AKAR = join(__dirname, "..", "..", "..");
const baca = (relatif: string) => readFileSync(join(AKAR, relatif), "utf8").replace(/\r\n/g, "\n");

const KEPALA = "src/features/meeting-notes/components/BagianPapan.tsx";
const TABEL = "src/features/meeting-notes/DiscussionPointsTable.tsx";

const LAJUR: [string, string][] = [
  ['aria-sort={aria("concern")}', "w-[300px]"],
  ['aria-sort={aria("keterangan")}', "w-[260px]"],
  ['aria-sort={aria("tindakanLanjut")}', "w-[300px]"],
];

describe("#806 — lebar tiga lajur teks papan", () => {
  const isi = baca(KEPALA);

  it.each(LAJUR)("kepala %s melebar ke %s", (kunci, lebar) => {
    const i = isi.indexOf(kunci);
    if (i < 0) throw new Error(`${kunci} hilang dari kepala — kolomnya jangan dibuang`);
    expect(isi.slice(i, i + 200)).toContain(lebar);
  });

  it("wadah ikut naik ke 2.038 px, bukan ditinggal di 1.808 px", () => {
    // Selisihnya +230 px (80 + 70 + 80). `table-fixed` membaca lebar dari
    // kepala, jadi wadah yang tertinggal hanya akan memotong ulang lajur yang
    // baru saja dilebarkan — gejalanya persis yang dikeluhkan pemilik.
    expect(baca(TABEL)).toContain("min-w-[2038px]");
    expect(baca(TABEL)).toContain("table-fixed");
  });

  it("plafon tinggi sel TETAP 64px: keputusan #765f tidak dibalik diam-diam", () => {
    // Pemilik memilih "biarkan 64px" supaya papan tetap menampilkan sekitar
    // empat baris. Kalau nanti plafon ini naik, itu putaran baru dengan angka
    // baru — bukan efek samping dari melebarkan kolom.
    const baris = baca("src/features/meeting-notes/components/BarisDiskusi.tsx");
    expect(baris.match(/max-h-16 overflow-y-auto/g)?.length).toBeGreaterThanOrEqual(3);
  });
});
