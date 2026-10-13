/**
 * #722 — tanggal layar rincian Isu wajib mengikuti bahasa aplikasi.
 *
 * Sebelum tambalan ini `formatDistanceToNow` dan `safeFormat` dipanggil TANPA
 * argumen locale, jadi layar berbahasa Indonesia menampilkan "Updated about 23
 * hours ago" dan "Oct 12, 2026 09:58". Yang dikunci di sini BENTUK panggilannya
 * (jsdom tidak merender tanggal): kedua pemanggil yang dibaca manusia wajib
 * membawa `locale:` dari `localeTanggal`, sementara nilai mesin `yyyy-MM-dd`
 * untuk input picker tanggal SENGAJA dibiarkan tanpa locale — format ISO adalah
 * kontrak mesin, bukan teks yang dibaca orang.
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const AKAR = join(__dirname, "..", "..", "..");
const sumber = readFileSync(join(AKAR, "src", "features", "issues", "TaskDetailModal.tsx"), "utf8");

describe("#722 locale date-fns di layar rincian Isu", () => {
  it("helper locale bersama ada di src/lib", () => {
    expect(existsSync(join(AKAR, "src", "lib", "localeTanggal.ts"))).toBe(true);
  });

  it("safeFormat meneruskan locale, bukan format polos", () => {
    expect(sumber).not.toMatch(/format\(ensureDate\(date\), formatStr\)/);
    expect(sumber).toMatch(/format\(ensureDate\(date\), formatStr, \{ locale: localeTanggal\(/);
  });

  it("formatDistanceToNow meneruskan locale", () => {
    expect(sumber).not.toMatch(
      /formatDistanceToNow\(ensureDate\(task\.updatedAt\), \{ addSuffix: true \}/
    );
    expect(sumber).toMatch(/addSuffix: true,\s*locale: localeTanggal\(/);
  });

  it("nilai mesin picker tanggal tetap ISO tanpa locale", () => {
    expect(sumber).toMatch(/format\(ensureDate\(parentEpic\.startDate\), "yyyy-MM-dd"\)/);
  });
});
