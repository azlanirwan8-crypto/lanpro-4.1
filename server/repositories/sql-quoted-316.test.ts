/**
 * Item #316 — repository SQL quoted: pastikan identifier camelCase/PascalCase
 * yang dipakai modul sensitif (milestone / MasterData) aman lewat convertToPostgres.
 *
 * Tidak menyabotase sumber; menguji transform string yang dipakai adapter DB.
 */
jest.mock("pg", () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: jest.fn().mockResolvedValue({ rows: [] }),
    on: jest.fn(),
    end: jest.fn().mockResolvedValue(undefined),
    connect: jest.fn(),
  })),
}));

import fs from "fs";
import path from "path";
import { convertToPostgres } from "../../src/lib/db";

describe("SQL quoted identifiers (#316)", () => {
  it("auto-quotes Milestones + milestoneId + projectId", () => {
    const { text } = convertToPostgres("SELECT * FROM Milestones WHERE projectId = ? AND id = ?", [
      "p1",
      "m1",
    ]);
    expect(text).toContain('"Milestones"');
    expect(text).toContain('"projectId"');
    // Setelah quote, nama mentah tanpa tanda kutip tidak boleh tersisa sebagai identifier.
    expect(text.replace(/"Milestones"/g, "")).not.toMatch(/\bMilestones\b/);
  });

  it("auto-quotes MilestoneSprints.milestoneId", () => {
    const { text } = convertToPostgres(
      "SELECT milestoneId, sprintId FROM MilestoneSprints WHERE milestoneId = ?",
      ["m1"]
    );
    expect(text).toContain('"MilestoneSprints"');
    expect(text).toContain('"milestoneId"');
    expect(text).toContain('"sprintId"');
  });

  it('mempertahankan "isTerminal" yang sudah dikutip (#313)', () => {
    const { text } = convertToPostgres('UPDATE MasterData SET "isTerminal" = ? WHERE id = ?', [
      true,
      "x",
    ]);
    expect(text).toContain('"isTerminal"');
    expect(text).toContain('"MasterData"');
  });

  it("milestone.repository memakai tabel PascalCase yang ikut di-quote adapter", () => {
    const sumber = fs.readFileSync(path.join(__dirname, "milestone.repository.ts"), "utf8");
    expect(sumber).toMatch(/FROM Milestones/);
    expect(sumber).toMatch(/MilestoneSprints/);
    expect(sumber).toMatch(/"isTerminal"|muatKunciTerminal/);
  });
});
