/**
 * #730 — penjaga: kartu TASK BREAKDOWN BY TYPE tidak boleh kembali ke ember
 * nama harfiah.
 *
 * KENAPA BACA SUMBER. Gerbang warna/label (#719) buta terhadap cacat semacam
 * ini: lima kunci `{epic, story, task, bug, subtask}` dan perbandingan string
 * mentah lolos semua gerbang sementara jenis buatan pemilik proyek dilipat
 * diam-diam ke "Task". Test render tidak menangkapnya tanpa data master yang
 * aneh-aneh, jadi yang diikat di sini adalah BENTUK kode: pencocok wajib lewat
 * `kunciJenisIsu`, baris wajib lahir dari baris `issue_type` MasterData, dan
 * pencocok itu wajib tinggal di `src/lib` (dipakai dua fitur: Daftar Isu dan
 * dashboard — §4 melarang impor lintas folder fitur).
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const AKAR = join(__dirname, "..", "..", "..");
const baca = (...segmen: string[]) => readFileSync(join(AKAR, ...segmen), "utf8");

describe("#730 taskTypeBreakdown lahir dari MasterData", () => {
  const sumber = baca("src", "features", "dashboard", "DashboardView.tsx");

  it("tidak ada ember lima nama harfiah", () => {
    expect(sumber).not.toMatch(/epic:\s*0,\s*story:\s*0/);
    expect(sumber).not.toMatch(/counts\[\s*"task"\s*\]/);
  });

  it("tidak ada baris keluaran bernama jenis yang dipaku", () => {
    expect(sumber).not.toMatch(/name:\s*"Epic"/);
    expect(sumber).not.toMatch(/name:\s*"Story"/);
    expect(sumber).not.toMatch(/name:\s*"Subtask"/);
  });

  it("menghitung lewat kunciJenisIsu dan mewarnai lewat master", () => {
    expect(sumber).toMatch(/kunciJenisIsu\(/);
    expect(sumber).toMatch(/"issue_type"/);
    expect(sumber).toMatch(/warnaDariMaster\(/);
  });

  it("jenis tak-dikenal master tetap mendapat baris (tidak ke-skip)", () => {
    expect(sumber).toMatch(/namaMentah/);
    expect(sumber).toMatch(/kunciMaster\.has\(kunci\)/);
  });

  it("pencocok jenis tinggal di src/lib, bukan di dalam satu fitur", () => {
    expect(existsSync(join(AKAR, "src", "lib", "jenisIsu.ts"))).toBe(true);
    expect(existsSync(join(AKAR, "src", "features", "issues", "lib", "jenisIsu.ts"))).toBe(false);
  });
});
