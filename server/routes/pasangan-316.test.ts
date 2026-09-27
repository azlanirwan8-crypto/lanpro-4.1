/**
 * Item #316 pasangan #314 — penjaga audit sudah di audit.routes.test.ts;
 * berkas ini mengunci daftar pasangan wajib agar tidak hilang diam-diam.
 */
import fs from "fs";
import path from "path";

describe("Pasangan tes #316 — indeks wajib", () => {
  it("ada tes audit 403 lintas-proyek (#314)", () => {
    const p = path.join(__dirname, "audit.routes.test.ts");
    expect(fs.existsSync(p)).toBe(true);
    const s = fs.readFileSync(p, "utf8");
    expect(s).toMatch(/projectId=B|project-B|lintas|403/);
    expect(s).toMatch(/jagaAuditLogBaca/);
  });

  it("ada tes waterfall sprint create (#311)", () => {
    const p = path.join(__dirname, "sprints.waterfall-316.test.ts");
    expect(fs.existsSync(p)).toBe(true);
  });

  it("ada tes statusSelesai (#313)", () => {
    const p = path.join(__dirname, "../lib/statusSelesai.test.ts");
    expect(fs.existsSync(p)).toBe(true);
  });

  it("ada tes SQL quoted repository (#316)", () => {
    const p = path.join(__dirname, "../repositories/sql-quoted-316.test.ts");
    expect(fs.existsSync(p)).toBe(true);
  });
});
