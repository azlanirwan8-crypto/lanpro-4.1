/**
 * #729 — anggaran stacking krom aplikasi dikunci di satu tempat.
 *
 * AKAR MASALAHNYA bersarang, bukan salah angka: bar header adalah flex item
 * ber-z-index, jadi ia membentuk stacking context sendiri dan SEMUA menu di
 * dalamnya (panel profil z-50 sekalipun) berlangit-langitkan z bar itu. Kepala
 * tabel Daftar Isu `sticky z-30` (#606) hidup di context akar, sehingga sebelum
 * tambalan ini kepala tabel menang atas menu profil yang terbuka. jsdom tidak
 * melakukan layout, jadi yang dikunci di sini adalah KELAS dan urutannya:
 * scrim laci mobile > bar header > kepala tabel sticky, dan kepala tabel
 * TIDAK boleh turun dari z-30 karena keputusan #606 berdiri di angka itu.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { styles } from "./features/issues/styles";

const sumberApp = readFileSync(join(__dirname, "AppContainer.tsx"), "utf8");

const nilaiZ = (kelas: string): number => {
  const kotak = kelas.match(/z-\[(\d+)\]/);
  if (kotak) return +kotak[1];
  const polos = kelas.match(/z-(\d+)\b/);
  return polos ? +polos[1] : NaN;
};

const header = sumberApp.match(/<header className="([^"]+)"/);
const scrim = sumberApp.match(/bg-overlay\/50 fixed inset-0 (z-\[\d+\]|z-\d+)/);
const kepalaTabel = nilaiZ(styles.tableHeader);

describe("anggaran stacking krom (#729)", () => {
  it("bar header dan scrim mobile ditemukan di sumber", () => {
    expect(header).not.toBeNull();
    expect(scrim).not.toBeNull();
  });

  it("bar header di atas setiap sticky konten (z-40 > z-30 kepala tabel)", () => {
    expect(nilaiZ(header![1])).toBe(40);
    expect(kepalaTabel).toBe(30);
  });

  it("scrim laci mobile di atas bar header, jadi bar ikut redup saat laci terbuka", () => {
    expect(nilaiZ(scrim![1])).toBeGreaterThan(nilaiZ(header![1]));
  });

  it("kepala tabel tidak diturunkan dari keputusan #606", () => {
    const kelas = styles.tableHeader.split(/\s+/);
    expect(kelas).toContain("sticky");
    expect(kelas).toContain("top-0");
    expect(kepalaTabel).toBeGreaterThanOrEqual(30);
  });
});
