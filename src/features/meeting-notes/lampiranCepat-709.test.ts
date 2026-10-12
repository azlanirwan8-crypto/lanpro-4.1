/**
 * #709 — tautan dan gambar akhirnya bisa diisi dari baris cepat.
 *
 * Pemilik proyek 12 Okt: "gambar, link nya kok belum ada untuk upload".
 * Yang benar-benar berubah bukan kemungkinan teknisnya — baris
 * `discussion_point_files` masih menunjuk `point_id`, jadi berkas tetap tidak
 * bisa menempel pada titik diskusi yang belum ada. Yang berubah adalah
 * JALURNYA: sebelumnya pengguna harus tahu bahwa satu-satunya tempat unggah
 * duduk di dalam laci sunting, dan satu-satunya petunjuknya adalah sebuah
 * tanda `-` dengan `title=`.
 *
 * Bentuknya ANTRE LALU TEMPEL. Tautan ikut dalam payload pembuatan karena
 * `createDiscussionPointSchema` sudah menerima `links`; berkas diunggah setelah
 * `createDiscussionPoint` memulangkan id sungguhan.
 *
 * Test ini MEMBACA SUMBER seperti dua test lain di folder yang sama: yang
 * dikunci adalah urutan dua permintaan itu, dan urutan tidak gagal secara
 * dramatis — ia hanya menghasilkan gambar yang hilang tanpa pesan.
 */
import { readFileSync } from "fs";
import { join } from "path";

const AKAR = join(__dirname, "..", "..", "..");
const baca = (relatif: string) => readFileSync(join(AKAR, relatif), "utf8").replace(/\r\n/g, "\n");

const TABEL = "src/features/meeting-notes/DiscussionPointsTable.tsx";
const CEPAT = "src/features/meeting-notes/components/BarisCepat.tsx";
const LAMPIRAN = "src/features/meeting-notes/lib/lampiran.ts";
const LAYANAN = "src/services/meetingService.ts";

describe("#709 — satu sumber isian, desktop dan HP", () => {
  it("baris cepat menampung tautan dan mengantre berkas", () => {
    const isi = baca(CEPAT);
    expect(isi).toContain("links: TautanDiskusi[]");
    expect(isi).toContain("berkas: File[]");
    // Masing-masing dipakai DUA kali: baris desktop dan blok HP (#645).
    expect(isi.match(/<PenyuntingTautan/g)).toHaveLength(2);
    expect(isi.match(/<AntreanBerkas/g)).toHaveLength(2);
  });

  it("sel yang dulu menjelaskan alasan lewat title sudah tidak ada", () => {
    for (const berkas of [CEPAT, TABEL, "src/i18n/locales/id.ts", "src/i18n/locales/en.ts"]) {
      expect(baca(berkas)).not.toContain("tautanButuhTersimpan");
      expect(baca(berkas)).not.toContain("gambarButuhTersimpan");
    }
  });
});

describe("#709 — antre lalu tempel", () => {
  it("tautan yang kosong tidak ikut dikirim, dan yang dikirim http/https saja", () => {
    const isi = baca(TABEL);
    expect(isi).toContain("const tautan: TautanDiskusi[]");
    expect(isi).toContain("links: tautan,");
    // Server menolak bukan http(s) (`tautanMasuk`); menyaring di sini berarti
    // satu alamat salah tidak menggagalkan titik diskusi yang baru dibuat.
    expect(isi).toMatch(/\^https\?:/);
  });

  it("berkas naik SETELAH id sungguhan pulang, satu per satu", () => {
    const isi = baca(TABEL);
    const i = isi.indexOf("const realId = await createDiscussionPoint");
    if (i < 0) throw new Error("pembuatan titik diskusi tidak ditemukan");
    const sesudah = isi.slice(i, i + 1400);
    expect(sesudah).toContain("await lampirkanKePoin(realId, berkas)");
    expect(sesudah).toContain("for (const berkas of berkasTunda)");
    expect(sesudah).toContain("await fetchPoints()");
  });

  it("antrean dibaca sebelum isian dikosongkan", () => {
    const isi = baca(TABEL);
    expect(isi.indexOf("const berkasTunda = nilaiCepat.berkas;")).toBeLessThan(
      isi.indexOf("setNilaiCepat({")
    );
  });

  it("jalur unggah memakai endpoint yang memvalidasi magic byte", () => {
    const layanan = baca(LAYANAN);
    expect(layanan).toContain('"/api/v1/upload-document"');
    expect(baca(LAMPIRAN)).toContain("uploadDiscussionPointFile(");
    expect(baca(LAMPIRAN)).toContain("attachDiscussionPointFile(");
  });

  it("satu berkas yang gagal tidak menghapus yang sudah naik", () => {
    const isi = baca(LAMPIRAN);
    // Galat ditelan di dalam jalur unggah dan dilaporkan per berkas.
    expect(isi).toMatch(/catch[\s\S]{0,200}return null/);
  });
});
