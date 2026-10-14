/**
 * #737 — SAMBUNGAN konfigurasi "jenis anak bawaan", dari kolom database ke chip
 * tipe di baris tambah anak.
 *
 * KENAPA TEST INI ADA. Rumusnya sudah dikunci `hierarkiTipe.test.ts`. Yang
 * tidak terlihat dari sana adalah apakah ada kode yang benar-benar MEMBACA
 * kolom itu dan menyerahkannya ke pemilih jenis — persis lubang yang membuat
 * #724 rusak walau rumusnya hijau sepanjang waktu. Jadi test ini membaca
 * sumber dan mengunci setiap mata rantainya.
 */
import { readFileSync } from "fs";
import { join } from "path";

const isi = (relatif: string) => readFileSync(join(__dirname, relatif), "utf8");

describe("rantai defaultChildCode (#737)", () => {
  it("kolomnya lahir di migrasi, bukan diasumsikan ada", () => {
    const s = isi("../../lib/pg-migrate.ts");
    expect(s).toMatch(/ADD COLUMN IF NOT EXISTS "defaultChildCode"/);
  });

  it("server menerima dan menyimpannya di create maupun update", () => {
    expect(isi("../../../server/schemas/master-data.schema.ts")).toMatch(/defaultChildCode/);
    const repo = isi("../../../server/repositories/master-data.repository.ts");
    expect(repo).toMatch(/"defaultChildCode"=\?/);
    expect(isi("../../../server/routes/master-data.routes.ts")).toMatch(/defaultChildCode/);
  });

  it("baris tambah anak membangun peta dari baris Master Data dan menyerahkannya", () => {
    const s = isi("components/list/IssueTableInlineAddRow.tsx");
    expect(s).toMatch(/petaAnakBawaan\(barisTipe\)/);
    expect(s).toMatch(/tipeBoleDitawarkan\(\s*tipeInduk,\s*labelTipe,\s*tingkat,\s*anakBawaan/);
  });

  it("layar Master Data memakai satu kontrol yang sama untuk tambah dan sunting", () => {
    const panel = isi("../master/MasterDataPanel.tsx");
    const pakai = panel.match(/<DefaultChildTypeField/g) || [];
    expect(pakai.length).toBe(2);
    // Modal sunting membuang baris itu sendiri: jenis tidak boleh jadi anaknya.
    expect(panel).toMatch(/kecualiId=\{editingMaster\.id\}/);
    // Nilainya CODE, bukan label (AGENTS.md §3).
    expect(isi("../master/DefaultChildTypeField.tsx")).toMatch(/id: d\.code \|\| d\.label/);
  });
});
