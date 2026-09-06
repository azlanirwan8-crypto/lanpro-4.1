/**
 * #451 — UPDATE Users hanya menulis passwordHash (kolom password tidak ada di skema).
 */
import fs from "fs";
import path from "path";

describe("auth.repository password column #451", () => {
  it("setTemporaryPassword dan updateUserPassword tidak menulis kolom password", () => {
    const isi = fs.readFileSync(path.join(__dirname, "auth.repository.ts"), "utf8");
    expect(isi).not.toMatch(/SET\s+"passwordHash"\s*=\s*\?\s*,\s*password\s*=/);
    expect(isi).toMatch(/SET\s+"passwordHash"\s*=\s*\?/);
  });
});
