import fs from "node:fs";
import path from "node:path";

/**
 * #819 — `info` dan `secondary` DITUKAR agar sesuai Velzon 4.3.0.
 *
 * Velzon memakai `$blue #3577f1` untuk secondary dan `$cyan #299cdb` untuk
 * info; repo ini memakai keduanya terbalik. Penjaga ini mengunci tiga hal yang
 * mudah hilang saat nilai token disunting:
 *
 *  1. peran warnanya benar (info = cyan, secondary = blue) di KEDUA mode;
 *  2. turunan `info-soft` dan `info-text` dihitung ulang dari `info` baru,
 *     bukan dibiarkan memakai hex lama yang sewarna `secondary` lama;
 *  3. teks tetap lolos AA. #299cdb hanya 3,06:1 di atas putih, jadi ia sah
 *     untuk ikon tetapi tidak untuk label — label memakai `info-text`.
 *
 * Angka dihitung dari `src/index.css` dan dari berkas pemakai, bukan ditaksir
 * dari tangkapan layar. Batas jujurnya sama dengan #682: yang diuji adalah
 * pasangan token dan kelas yang tertulis, bukan hasil akhir di peramban.
 */
const AKAR = path.join(__dirname, "..", "..");
const css = fs.readFileSync(path.join(AKAR, "src", "index.css"), "utf8");
const baca = (relatif: string) => fs.readFileSync(path.join(AKAR, "src", relatif), "utf8");

function kemunculan(nama: string): string[] {
  const pola = new RegExp("--color-" + nama + ":\\s*([^;]+);", "g");
  return [...css.matchAll(pola)].map((m) =>
    m[1]
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .trim()
      .toLowerCase()
  );
}

/** Kemunculan pertama = blok `@theme` (mode terang). */
function terang(nama: string): string {
  const semua = kemunculan(nama);
  if (semua.length < 1) throw new Error("token tidak ada: --color-" + nama);
  return semua[0];
}

/** Kemunculan kedua = blok `html.dark`. */
function gelap(nama: string): string {
  const semua = kemunculan(nama);
  if (semua.length < 2) throw new Error("token gelap tidak ada: --color-" + nama);
  return semua[1];
}

const keRgb = (warna: string): [number, number, number] => {
  const hex = /^#([0-9a-f]{6})$/i.exec(warna);
  if (!hex) throw new Error("penjaga ini hanya membaca hex 6 digit, dapat: " + warna);
  const h = hex[1];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

const luminansi = (w: [number, number, number]) => {
  const [r, g, b] = w
    .map((v) => v / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const rasio = (a: string, b: string) => {
  const [x, y] = [luminansi(keRgb(a)), luminansi(keRgb(b))].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

describe("#819 peran info dan secondary sesuai Velzon", () => {
  it("mode terang: info = cyan #299cdb, secondary = blue #3577f1", () => {
    expect(terang("info")).toBe("#299cdb");
    expect(terang("secondary")).toBe("#3577f1");
  });

  it("mode gelap ikut ditukar, bukan ditinggal", () => {
    expect(gelap("info")).toBe("#4fb8ef");
    expect(gelap("secondary")).toBe("#5b93f7");
    expect(gelap("info-text")).toBe("#4fb8ef");
  });

  it("turunan info dihitung ulang dari hue baru", () => {
    expect(terang("info-soft")).toBe("#dff0fa");
    expect(terang("info-text")).toBe("#1a6f99");
    expect(terang("info-surface")).toBe("#1a6f99");
  });
});

describe("#819 teks aksen info lolos AA", () => {
  it("info-text di atas putih dan di atas info-soft", () => {
    expect(rasio(terang("info-text"), terang("surface"))).toBeGreaterThanOrEqual(4.5);
    expect(rasio(terang("info-text"), terang("info-soft"))).toBeGreaterThanOrEqual(4.5);
  });

  it("teks putih di atas info-surface", () => {
    expect(rasio(terang("content-inverse"), terang("info-surface"))).toBeGreaterThanOrEqual(4.5);
  });

  it("info dan secondary mode gelap masih terbaca sebagai teks", () => {
    expect(rasio(gelap("info"), gelap("surface"))).toBeGreaterThanOrEqual(4.5);
    expect(rasio(gelap("secondary"), gelap("surface"))).toBeGreaterThanOrEqual(4.5);
  });
});

describe("#819 label memakai info-text, bukan info", () => {
  it("label teks dashboard dan monitor sesi memakai text-info-text", () => {
    const sidebar = baca("features/dashboard/components/SidebarWidgetsStack.tsx");
    expect(sidebar).toContain("text-info-text flex items-center gap-1 font-medium");
    expect(sidebar).toContain("tracking-normal text-info-text flex items-center gap-2");

    const sesi = baca("features/users/UserSessionsPanel.tsx");
    expect(sesi).toContain("text-info-text font-medium");
  });

  it("label Figma tidak memakai text-secondary (hanya 4,15:1)", () => {
    const modal = baca("features/issues/TaskDetailModal.tsx");
    expect(modal).toContain("font-medium text-primary bg-secondary/10");
    expect(modal).not.toContain("font-medium text-secondary bg-secondary/10");
  });
});
