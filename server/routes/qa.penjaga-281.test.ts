/**
 * Regresi Item #281: Tiga rute QA (/api/v1/qa/*) wajib dilindungi jagaProyek("qa", "C")
 *
 * 1. POST /api/v1/qa/ai-feedback
 * 2. POST /api/v1/qa/test-case/bulk-upload
 * 3. POST /api/v1/projects/:projectId/qa/generate-test-cases-ai
 */

import fs from "fs";
import path from "path";

const AKAR = path.resolve(__dirname, "..", "..");
const sumber = fs.readFileSync(path.join(AKAR, "server", "routes", "qa.routes.ts"), "utf8");
const kode = sumber.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const POLA_RUTE =
  /(?:app|router)\.(get|post|put|patch|delete)\(\s*["']([^"']+)["']([\s\S]{0,900}?)(?:async\s*\(|\(req|\w+\s*\)\s*;)/g;

const ruteTerdata = () =>
  [...kode.matchAll(POLA_RUTE)].map((m) => ({
    metode: m[1].toUpperCase(),
    jalur: m[2],
    penjaga: m[3],
  }));

describe("#281 Proteksi penjaga rute QA terhadap akses lintas proyek", () => {
  it("seluruh 3 rute QA AI & bulk upload memiliki penjaga jagaProyek('qa', ...)", () => {
    const terdata = ruteTerdata();

    const ruteFeedback = terdata.find((r) => r.jalur === "/api/v1/qa/ai-feedback");
    expect(ruteFeedback).toBeDefined();
    expect(ruteFeedback?.penjaga).toContain('jagaProyek("qa", "C")');

    const ruteBulkUpload = terdata.find((r) => r.jalur === "/api/v1/qa/test-case/bulk-upload");
    expect(ruteBulkUpload).toBeDefined();
    expect(ruteBulkUpload?.penjaga).toContain('jagaProyek("qa", "C")');

    const ruteGenerateAi = terdata.find(
      (r) => r.jalur === "/api/v1/projects/:projectId/qa/generate-test-cases-ai"
    );
    expect(ruteGenerateAi).toBeDefined();
    expect(ruteGenerateAi?.penjaga).toContain('jagaProyek("qa", "C")');
  });
});
