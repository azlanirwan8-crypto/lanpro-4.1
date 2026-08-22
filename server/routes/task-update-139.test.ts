/**
 * Item #139 — lapis kedua: allowlist `checkUpdate` di rute update tugas.
 *
 * Lapis skema (task-fields-139.test.ts) hanya menjamin field lolos validasi.
 * Test ini menjaga bahwa rutenya benar-benar meneruskannya ke SQL — dulu
 * kelimanya lolos validasi pun tetap berhenti di sini tanpa pesan galat.
 *
 * Dibaca dari sumber alih-alih menjalankan Express, karena yang dijaga adalah
 * KELENGKAPAN DAFTAR, bukan perilaku runtime-nya; menjalankan rute penuh
 * menuntut basis data dan JWT yang tidak tersedia di test node.
 */
import fs from "fs";
import path from "path";

const sumber = fs.readFileSync(path.join(__dirname, "task.routes.ts"), "utf8");

const LIMA_FIELD = ["resolution", "release", "category", "environment", "projectRisk"];

/** Potongan destructuring req.body milik rute PUT tugas. */
const blokDestructuring = (() => {
  const awal = sumber.indexOf('"/api/projects/:projectId/tasks/:id"');
  const blok = sumber.slice(awal);
  return blok.slice(0, blok.indexOf("} = req.body;"));
})();

describe("rute update tugas — allowlist checkUpdate (#139)", () => {
  it("menemukan blok destructuring yang benar", () => {
    // Penjaga: bila slicing meleset, semua assertion di bawah jadi tak berarti.
    expect(blokDestructuring).toContain("validasiBody(updateTaskSchema)");
    expect(blokDestructuring).toContain("acceptanceCriteria,");
  });

  it.each(LIMA_FIELD)("men-destructure %s dari req.body", (field) => {
    // Tanpa di-destructure, checkUpdate menerima undefined dan diam saja.
    expect(blokDestructuring).toContain(field + ",");
  });

  it.each(LIMA_FIELD)("meneruskan %s lewat checkUpdate", (field) => {
    expect(sumber).toContain('checkUpdate("' + field + '", ' + field + ");");
  });
});
