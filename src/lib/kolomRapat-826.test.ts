import fs from "node:fs";
import path from "node:path";

/**
 * #826 — lebar kolom tabel Catatan Rapat: Judul dan Deskripsi dilebarkan,
 * kolom waktu/tautan/pembuat dipersempit (Opsi A, disetujui pemilik 09 Nov 2026).
 *
 * Kunci yang dijaga:
 *
 *  1. Kolom Judul dan Deskripsi memakai `min-w-[220px] max-w-[320px]` agar
 *     judul lebih sering muat satu baris dan keterangan tidak lagi membentang
 *     lima baris yang ikut membesarkan tinggi seluruh baris;
 *  2. Kolom Waktu Rapat `w-32`, Tautan `w-28`, Pembuat `w-32` — nilainya
 *     selalu pendek sehingga sempitnya tidak mengorbankan isi;
 *  3. Keputusan yang sudah ada tidak berbalik diam-diam: `text-justify` (#805),
 *     bobot judul 500 (#823), dan larangan memotong teks (#647).
 *
 * Yang diuji adalah sumber, bukan hasil render.
 */
const SRC = path.join(__dirname, "..", "..", "src");
const baca = (rel: string) => fs.readFileSync(path.join(SRC, rel), "utf8");

describe("#826 lebar kolom tabel Catatan Rapat", () => {
  const isi = baca("features/meeting-notes/MeetingNotes.tsx");
  const kepala = /<thead>[\s\S]*?<\/thead>/.exec(isi)?.[0] ?? "";

  const kelasKolom = (kunci: string) =>
    new RegExp(kunci + '[\\s\\S]*?className="([^"]+)"').exec(kepala)?.[1] ?? "";

  test("kolom Judul dan Deskripsi dilebarkan ke min 220px max 320px", () => {
    expect(kelasKolom('kolom="title"')).toContain("min-w-[220px]");
    expect(kelasKolom('kolom="title"')).toContain("max-w-[320px]");
    expect(kelasKolom('kolom="description"')).toContain("min-w-[220px]");
    expect(kelasKolom('kolom="description"')).toContain("max-w-[320px]");
  });

  test("kolom Waktu, Tautan, dan Pembuat dipersempit", () => {
    expect(kelasKolom('kolom="createdAt"')).toContain("w-32");
    const thTautan =
      /<th className="([^"]+)">\s*\{t\("meetings\.thLink"\)\}/.exec(kepala)?.[1] ?? "";
    expect(thTautan).toContain("w-28");
    expect(kelasKolom('kolom="authorId"')).toContain("w-32");
  });

  test("lebar lama tidak kembali di kepala tabel", () => {
    expect(kepala).not.toContain("max-w-[260px]");
    expect(kepala).not.toContain("w-44");
    expect(kepala).not.toContain("w-36");
  });

  test("justify judul dan keterangan tetap terkunci (#805)", () => {
    const badan = /<tbody[\s\S]*?<\/tbody>/.exec(isi)?.[0] ?? "";
    expect(badan).toContain("whitespace-normal break-words text-justify");
    expect(badan).toContain("whitespace-pre-wrap break-words text-justify");
  });

  test("bobot judul 500 dan tanpa pemotongan teks (#823, #647)", () => {
    const selJudul =
      /<td className="([^"]*font-medium[^"]*)">[\s\S]*?<div className="([^"]+)">/.exec(isi);
    expect(selJudul?.[1] ?? "").toContain("font-medium");
    // #647: nilai judul tidak dipotong. `truncate` yang ada di badan tabel
    // hanya milik chip dokumen (max-w 150px), bukan sel judul/keterangan.
    expect(selJudul?.[2] ?? "").toContain("whitespace-normal break-words text-justify");
    expect(selJudul?.[2] ?? "").not.toContain("truncate");
    expect(selJudul?.[2] ?? "").not.toMatch(/line-clamp-/);
  });
});
