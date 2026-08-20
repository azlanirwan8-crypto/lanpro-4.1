/**
 * Test penjaga dan rute konfigurasi email sistem (Item #45).
 */

import fs from "fs";
import path from "path";

const SUMBER = fs.readFileSync(path.join(__dirname, "system.routes.ts"), "utf8");

describe("System Settings Routes - Email Configuration (Item #45)", () => {
  it("memastikan endpoint GET /api/settings/email ada dan dijaga verifyGlobalAdmin", () => {
    const adaRute = /router\.get\(\s*["']\/api\/settings\/email["']\s*,\s*verifyGlobalAdmin/g.test(
      SUMBER
    );
    expect(adaRute).toBe(true);
  });

  it("memastikan endpoint POST /api/settings/email/test ada dan dijaga verifyGlobalAdmin", () => {
    const adaRute = /router\.post\(\s*["']\/api\/settings\/email\/test["']\s*,\s*verifyGlobalAdmin/g.test(
      SUMBER
    );
    expect(adaRute).toBe(true);
  });

  it("memastikan endpoint uji coba memvalidasi format email tujuan", () => {
    expect(SUMBER).toContain("validasiFormatEmail(targetEmail)");
    expect(SUMBER).toContain("kirimEmail({");
  });
});
