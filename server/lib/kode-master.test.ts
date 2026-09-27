/**
 * Item #143 — aturan penurunan `code` dari label MasterData.
 *
 * Sebelumnya `INSERT INTO MasterData` tidak menyertakan `code` sama sekali,
 * jadi setiap baris yang ditambahkan pengguna lewat panel lahir tanpa kode dan
 * baru tertambal kalau seseorang kebetulan menjalankan `npm run db:seed-master`.
 *
 * Berkas aturannya sengaja dipakai bersama oleh penyemai (node) dan rute
 * (TypeScript). Test ini menjaga perilakunya, sekaligus menjaga bahwa penyemai
 * memang me-require modul yang sama alih-alih menyalin ulang aturannya.
 */
import fs from "fs";
import path from "path";

const { kodeDariLabel, kodeUnik } = require("./kode-master.cjs");

describe("kodeDariLabel (#143)", () => {
  it.each([
    ["Urgent", "urgent"],
    ["On Hold", "on_hold"],
    ["Won't Do", "won_t_do"],
    ["UAT Sign-off Report", "uat_sign_off_report"],
    ["Cannot Reproduce", "cannot_reproduce"],
  ])("%s -> %s", (label, harapan) => {
    expect(kodeDariLabel(label)).toBe(harapan);
  });

  it("merapikan spasi di ujung label tanpa menuntut labelnya diubah", () => {
    // Baris nyata di basis data: jenis_dokumen berlabel "Contract " (berspasi).
    expect(kodeDariLabel("Contract ")).toBe("contract");
  });

  it("tidak meninggalkan garis bawah di ujung", () => {
    expect(kodeDariLabel("  --Halo!!  ")).toBe("halo");
  });

  it("memulangkan string kosong bila label tidak menghasilkan apa pun", () => {
    expect(kodeDariLabel("!!!")).toBe("");
    expect(kodeDariLabel("")).toBe("");
    expect(kodeDariLabel(null)).toBe("");
    expect(kodeDariLabel(undefined)).toBe("");
  });

  it("memotong di 50 karakter karena kolomnya VARCHAR(50)", () => {
    const panjang = kodeDariLabel("a".repeat(80));
    expect(panjang).toHaveLength(50);
  });
});

describe("kodeUnik (#143)", () => {
  it("memakai kode dasar bila belum terpakai", () => {
    expect(kodeUnik("Urgent", ["low", "high"])).toBe("urgent");
  });

  it("memberi akhiran angka saat dua label meluruh ke kode sama", () => {
    // Tabel MasterData tidak punya batasan UNIQUE, jadi tabrakan tidak akan
    // memunculkan galat — hanya dua baris yang tak bisa dibedakan lewat kode.
    expect(kodeUnik("Won't Do", ["won_t_do"])).toBe("won_t_do_2");
    expect(kodeUnik("Won't Do", ["won_t_do", "won_t_do_2"])).toBe("won_t_do_3");
  });

  it("aman terhadap daftar kosong atau tidak diberikan", () => {
    expect(kodeUnik("Urgent", [])).toBe("urgent");
    expect(kodeUnik("Urgent", undefined)).toBe("urgent");
  });

  it("memulangkan kosong bila label tidak menghasilkan kode", () => {
    expect(kodeUnik("###", ["a"])).toBe("");
  });
});

describe("aturan kode dipakai bersama, tidak disalin (#143)", () => {
  const sumberPenyemai = fs.readFileSync(
    path.join(__dirname, "..", "..", "scripts", "db", "seed-master-data.cjs"),
    "utf8"
  );

  it("penyemai me-require modul aturan, bukan menulis versinya sendiri", () => {
    expect(sumberPenyemai).toContain("kode-master.cjs");
    expect(sumberPenyemai).toContain("kodeDariLabel");
  });

  it("penyemai tidak lagi menyimpan salinan regex penurun kode", () => {
    // Kalau salinan itu muncul lagi, keduanya bisa berbeda tanpa ada yang tahu.
    expect(sumberPenyemai).not.toContain('replace(/[^a-z0-9]+/g, "_")');
  });
});
