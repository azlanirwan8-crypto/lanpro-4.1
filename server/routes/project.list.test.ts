/**
 * Penjaga rute GET /api/projects — memastikan authenticateJWT terpasang.
 *
 * Tanpa `authenticateJWT`, `req.user` akan undefined dan query ke database
 * akan gagal mengidentifikasi peran pengguna (admin vs user), menyebabkan
 * daftar proyek kosong.
 */
import fs from "fs";
import path from "path";

const SUMBER = fs.readFileSync(path.join(__dirname, "project.routes.ts"), "utf8");

describe("GET /api/projects authentication guard", () => {
  it("router.get('/api/projects') memiliki middleware authenticateJWT", () => {
    const match = SUMBER.match(/router\.get\(\s*["']\/api\/projects["']\s*,\s*([^,]+)/);
    expect(match).not.toBeNull();
    expect(match![1].trim()).toBe("authenticateJWT");
  });
});
