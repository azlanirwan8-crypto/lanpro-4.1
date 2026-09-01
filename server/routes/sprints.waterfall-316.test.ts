/**
 * Item #316 pasangan #311 — POST sprint ditolak untuk kedua casing waterfall.
 */
import fs from "fs";
import path from "path";
import { adalahWaterfall } from "../lib/methodology";

const SUMBER = fs.readFileSync(path.join(__dirname, "sprints.routes.ts"), "utf8");

describe("POST /sprints — blok waterfall (#311 / #316)", () => {
  it("rute memakai adalahWaterfall(category), bukan string keras", () => {
    expect(SUMBER).toMatch(/adalahWaterfall\s*\(\s*category\s*\)/);
    expect(SUMBER).toMatch(/jagaProyek\("sprints", "C"\)/);
    expect(SUMBER).not.toMatch(/category\s*===\s*["']WATERFALL["']/);
    expect(SUMBER).not.toMatch(/category\s*===\s*["']Waterfall["']/);
  });

  it.each(["Waterfall", "WATERFALL", "waterfall", " waterFall "])(
    "adalahWaterfall(%j) true — create sprint harus ditolak",
    (nilai) => {
      expect(adalahWaterfall(nilai)).toBe(true);
    }
  );

  it.each(["Agile", "AGILE", "Scrum", ""])(
    "adalahWaterfall(%j) false — sprint boleh dibuat",
    (nilai) => {
      expect(adalahWaterfall(nilai)).toBe(false);
    }
  );

  it("respons memakai kode srv.metodologi_waterfall_tidak_mendukung", () => {
    expect(SUMBER).toContain("srv.metodologi_waterfall_tidak_mendukung");
  });
});
