/**
 * #350 — forgot/reset password punya limiter khusus di server.ts.
 * Klaim lama #262 `authActionLimiter` tidak dipakai; penjaga ini mengunci
 * nama limiter + jalur app.use yang benar.
 */
import fs from "node:fs";
import path from "node:path";

describe("#350 rate limit forgot/reset password", () => {
  const isi = fs.readFileSync(path.resolve(__dirname, "../server.ts"), "utf8");

  it("memasang forgotPasswordLimiter pada /api/auth/forgot-password", () => {
    expect(isi).toMatch(/const forgotPasswordLimiter\s*=\s*rateLimit\(/);
    expect(isi).toMatch(
      /app\.use\(\s*["']\/api\/auth\/forgot-password["']\s*,\s*forgotPasswordLimiter\s*\)/
    );
  });

  it("memasang resetPasswordLimiter pada /api/auth/reset-password", () => {
    expect(isi).toMatch(/const resetPasswordLimiter\s*=\s*rateLimit\(/);
    expect(isi).toMatch(
      /app\.use\(\s*["']\/api\/auth\/reset-password["']\s*,\s*resetPasswordLimiter\s*\)/
    );
  });

  it("forgot menghitung semua permintaan (tanpa skipSuccessfulRequests)", () => {
    const blok = isi.slice(
      isi.indexOf("const forgotPasswordLimiter"),
      isi.indexOf('app.use("/api/auth/forgot-password"')
    );
    expect(blok).not.toMatch(/skipSuccessfulRequests:\s*true/);
    expect(blok).toMatch(/max:\s*5/);
  });
});
