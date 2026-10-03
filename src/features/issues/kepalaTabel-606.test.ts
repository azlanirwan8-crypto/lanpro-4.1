/**
 * #606 — kepala tabel Daftar Isu tidak boleh tembus pandang.
 *
 * Kepalanya `sticky top-0`, jadi selama latarnya transparan setiap baris yang
 * digulir melewatnya ikut terlihat: teks kepala dan teks data menumpuk di satu
 * pita 32 px. Terukur di Chrome terhadap CSS hasil build repo ini:
 * `bg-primary-surface/5` memulangkan `oklab(0.448 -0.0007 -0.094 / 0.05)`
 * sementara kepala bertahan di top:13 walaupun wadahnya digulir 120 px — jadi ia
 * memang menempel DAN memang 95% tembus.
 *
 * jsdom tidak melakukan layout, jadi yang dikunci di sini kelasnya: latar
 * tertutup (tanpa modifier opasitas) dan z-index di atas sel baris.
 */
import { styles } from "./styles";

const kelas = styles.tableHeader.split(/\s+/);
const latar = kelas.filter((k) => k.startsWith("bg-"));

describe("kepala tabel sticky (#606)", () => {
  it("menempel di atas wadahnya", () => {
    expect(kelas).toContain("sticky");
    expect(kelas).toContain("top-0");
  });

  it("latarnya satu token tertutup, bukan hasil campur opasitas", () => {
    expect(latar).toEqual(["bg-surface-sunken"]);
    // "bg-surface-sunken/90" masih akan menumpukkan teks kepala dengan data.
    expect(latar[0]).not.toMatch(/\/\d+$/);
  });

  it("naik di atas sel baris tambah (z-20), jadi tidak ada sel yang menggambar di atasnya", () => {
    const z = kelas.join(" ").match(/\bz-(\d+)\b/);
    expect(z).not.toBeNull();
    expect(+z![1]).toBeGreaterThan(20);
  });
});
