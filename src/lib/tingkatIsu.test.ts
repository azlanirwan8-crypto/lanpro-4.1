/**
 * #724 — kosakata level jenis isu.
 *
 * Yang diuji di sini adalah sisi TULIS-nya. Sisi baca (`tipeBoleDitawarkan`)
 * diuji di `features/issues/hierarkiTipe.test.ts`; keduanya harus tetap setuju,
 * karena layar Master Data yang menulis dan Daftar Isu yang mematuhinya.
 *
 * Kenapa sisi tulis butuh test sendiri: `description` adalah kolom catatan
 * BEBAS milik pengguna. Baris "Bug" proyek ini berisi "Cacat pada fungsi yang
 * sudah berjalan." — menimpa teks itu demi menaruh sebuah marker adalah
 * kehilangan data, bukan perbaikan.
 */
import { tuliskanTingkat, tingkatDariDeskripsi, tingkatTipe, petaTingkat } from "./tingkatIsu";

describe("tuliskanTingkat (#724)", () => {
  it("menempel di belakang catatan manusia, bukan menimpanya", () => {
    const hasil = tuliskanTingkat("Cacat pada fungsi yang sudah berjalan.", "Subtask");
    expect(hasil).toBe("Cacat pada fungsi yang sudah berjalan. Hierarchy: Subtask");
    expect(hasil.startsWith("Cacat pada fungsi yang sudah berjalan.")).toBe(true);
  });

  it("mengganti marker lama di tempatnya, jadi tidak menumpuk dua level", () => {
    expect(tuliskanTingkat("Catatan. Hierarchy: Standard", "Subtask")).toBe(
      "Catatan. Hierarchy: Subtask"
    );
    expect(
      tuliskanTingkat("Catatan. Hierarchy: Standard", "Subtask").match(/Hierarchy/g)
    ).toHaveLength(1);
  });

  it("ejaan lama yang diketik manusia ikut diganti, bukan ditambah", () => {
    expect(tuliskanTingkat("Hierarhy: Epic", "Standard")).toBe("Hierarchy: Standard");
  });

  it("baris tanpa catatan tetap dapat marker", () => {
    expect(tuliskanTingkat("", "Epic")).toBe("Hierarchy: Epic");
    expect(tuliskanTingkat(null, "Standard")).toBe("Hierarchy: Standard");
    expect(tuliskanTingkat(undefined, "Subtask")).toBe("Hierarchy: Subtask");
  });

  it("bolak-balik: apa yang ditulis persis yang terbaca kembali", () => {
    for (const tingkat of ["Epic", "Standard", "Subtask"] as const) {
      const catatan = "Jenis buatan pemilik proyek.";
      expect(tingkatDariDeskripsi(tuliskanTingkat(catatan, tingkat))).toBe(tingkat);
      expect(tingkatDariDeskripsi(tuliskanTingkat("", tingkat))).toBe(tingkat);
    }
  });
});

describe("tingkatTipe dan petaTingkat (#724)", () => {
  it("level pilihan pengguna menang atas nama jenisnya", () => {
    // "Task" adalah nama bawaan berlevel Standard; pemiliknya memilih Epic.
    expect(tingkatTipe("Task", "Hierarchy: Epic")).toBe("Epic");
    expect(tingkatTipe("Task", null)).toBe("Standard");
  });

  it("jenis buatan pengguna tanpa marker tidak dikarang jadi Standard", () => {
    expect(tingkatTipe("Sub Bug", null)).toBeNull();
    expect(tingkatTipe("Sub Bug", "Untuk bug turunan.")).toBeNull();
  });

  it("peta hanya berisi baris yang levelnya terbaca, dikunci oleh label", () => {
    const peta = petaTingkat([
      { label: "Bug", description: "Cacat pada fungsi yang sudah berjalan." },
      { label: "Sub Bug", description: "Hierarchy: Subtask" },
      { label: "Misteri" },
    ]);
    expect(peta.get("bug")).toBe("Standard");
    expect(peta.get("subbug")).toBe("Subtask");
    expect(peta.has("misteri")).toBe(false);
    expect(peta.size).toBe(2);
  });

  it("daftar kosong atau hilang tidak melempar", () => {
    expect(petaTingkat([]).size).toBe(0);
    expect(petaTingkat(undefined as never).size).toBe(0);
  });
});
