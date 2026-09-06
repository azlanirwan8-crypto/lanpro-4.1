/**
 * #447 — kunci sumber: Vite tidak pre-bundle @ffmpeg (worker.js hilang di .vite/deps).
 */
import fs from "fs";
import path from "path";

describe("vite ffmpeg #447", () => {
  it("optimizeDeps.exclude memuat @ffmpeg/ffmpeg dan @ffmpeg/util", () => {
    const isi = fs.readFileSync(path.join(__dirname, "../../../vite.config.ts"), "utf8");
    expect(isi).toMatch(/optimizeDeps:\s*\{[\s\S]*exclude:\s*\[[\s\S]*@ffmpeg\/ffmpeg/);
    expect(isi).toContain("@ffmpeg/util");
  });
});
