// Regression: ISSUE-275 — status migrasi mengukur hal yang salah
// Found by /qa on 2026-08-30
// Report: AUDIT.md §1.1 item #275
//
// TABEL_WAJIB ditulis eksplisit, bukan diturunkan dari SQL saat runtime.
// Test ini yang menjaganya tetap sinkron: menambah CREATE TABLE tanpa
// memperbarui daftar akan MERAH di sini, bukan lolos diam-diam ke production.

import fs from "fs";
import path from "path";
import { TABEL_WAJIB } from "./pg-migrate";

describe("TABEL_WAJIB (regresi #275)", () => {
  const sumber = fs.readFileSync(path.join(__dirname, "pg-migrate.ts"), "utf8");

  const dariDdl = [
    ...new Set(
      [...sumber.matchAll(/CREATE TABLE IF NOT EXISTS "?([A-Za-z_]+)"?/g)].map((m) => m[1])
    ),
  ].sort();

  it("memuat setiap tabel yang dibuat DDL", () => {
    const belumTerdaftar = dariDdl.filter((t) => !TABEL_WAJIB.includes(t));
    expect(belumTerdaftar).toEqual([]);
  });

  it("tidak memuat tabel yang tidak pernah dibuat DDL", () => {
    const hantu = TABEL_WAJIB.filter((t) => !dariDdl.includes(t));
    expect(hantu).toEqual([]);
  });

  it("tidak memuat duplikat", () => {
    expect(TABEL_WAJIB.length).toBe(new Set(TABEL_WAJIB).size);
  });

  it("memuat tabel yang pernah hilang pada insiden #273", () => {
    expect(TABEL_WAJIB).toContain("IntegrationSettings");
  });
});
