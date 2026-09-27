import fs from "node:fs";

/**
 * #524 — kontras teks sidebar harus benar-benar lolos WCAG AA.
 *
 * `audit:tema` mengunci nilai token tetapi ditulis sendiri oleh repo ini bahwa
 * ia "tidak bisa menilai tema yang jelek secara rasa, tidak mengukur kontras".
 * axe di `a181-458.test.tsx` juga menonaktifkan aturan `color-contrast` karena
 * computed style Tailwind tidak andal di jsdom. Jadi sebelum test ini ada,
 * tidak ada satu pun perkakas yang bisa menangkap teks 3,53:1 — dan angkanya
 * memang pernah di bawah itu selama berbulan-bulan tanpa ada yang melapor,
 * sebab gejalanya cuma " kok menunya kurang kebaca".
 *
 * Yang dibaca: nilai token di `src/index.css` dan pasangan kelas yang SUNGGUH
 * dipakai `styles.ts`/`index.tsx`. Latar baris hover/aktif adalah rgba putih di
 * atas permukaan, jadi di-composite lebih dulu — sama seperti yang dilakukan
 * peramban sebelum mata kita melihatnya.
 */
const css = fs.readFileSync(__dirname + "/../../index.css", "utf8");

function blokYangMemuat(penanda: string): string {
  const i = css.indexOf(penanda);
  if (i < 0) throw new Error("penanda tidak ditemukan di index.css: " + penanda);
  return css.slice(css.lastIndexOf("{", i) + 1, css.indexOf("}", i));
}

const MODES = {
  terang: blokYangMemuat("--color-sidebar-surface: #405189"),
  gelap: blokYangMemuat("--color-sidebar-surface: #212529"),
};

function token(blok: string, nama: string): string {
  const m = new RegExp("--color-" + nama + ":\\s*([^;]+);").exec(blok);
  if (!m) throw new Error("token tidak ada: --color-" + nama);
  // Jangan memotong di spasi: `rgba(255, 255, 255, 0.08)` justru memakai spasi.
  return m[1].replace(/\/\*[\s\S]*?\*\//g, "").trim();
}

type RGB = [number, number, number, number];

function keRgb(warna: string): RGB {
  const hex = /^#([0-9a-f]{6})$/i.exec(warna);
  if (hex) {
    const h = hex[1];
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
      1,
    ];
  }
  const rgb = /^rgba?\(([^)]+)\)$/i.exec(warna);
  if (rgb) {
    const p = rgb[1].split(",").map((x) => parseFloat(x));
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  }
  throw new Error("format warna tidak dikenali: " + warna);
}

/** Putih transparan di atas permukaan: persis yang dihitung peramban. */
function composite(src: RGB, dasar: RGB): RGB {
  const a = src[3];
  return [
    src[0] * a + dasar[0] * (1 - a),
    src[1] * a + dasar[1] * (1 - a),
    src[2] * a + dasar[2] * (1 - a),
    1,
  ];
}

function luminansi(w: RGB): number {
  const [r, g, b] = [w[0], w[1], w[2]]
    .map((v) => v / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function rasio(teks: RGB, latar: RGB): number {
  const [terang, redup] = [luminansi(teks), luminansi(latar)].sort((m, n) => n - m);
  return (terang + 0.05) / (redup + 0.05);
}

/**
 * Pasangan yang benar-benar bertemu di satu elemen:
 *  - `aside`, item menu biasa, tombol collapse  -> text di atas surface
 *  - `demoButton`, pill "baru"                  -> text di atas item-hover
 *  - `sectionLabel`, tanggal, tanda "—"          -> title di atas surface
 *  - logo "LANPRO", baris terpilih, baris hover -> text-active di atas
 *    surface / item-active / item-hover
 * `text-sidebar-text` TIDAK pernah duduk di atas `item-active`: baris terpilih
 * dan baris hover menukar teksnya ke `text-active` lebih dulu (styles.ts:26,30).
 */
const pasangan: Array<[string, string, string[]]> = [
  ["teks menu", "sidebar-text", ["sidebar-surface", "sidebar-item-hover"]],
  ["label seksi", "sidebar-title", ["sidebar-surface"]],
  [
    "teks terpilih",
    "sidebar-text-active",
    ["sidebar-surface", "sidebar-item-active", "sidebar-item-hover"],
  ],
];

describe("#524 kontras teks sidebar lolos WCAG AA", () => {
  const hasil: string[] = [];

  afterAll(() => {
    // Sekadar agar angka yang menegangkan ini tetap terbaca di log test.

    console.log("\n#524 kontras sidebar\n" + hasil.join("\n"));
  });

  for (const [namaMode, blok] of Object.entries(MODES)) {
    const permukaan = keRgb(token(blok, "sidebar-surface"));
    for (const [peran, tokenTeks, latarTokens] of pasangan) {
      const teks = keRgb(token(blok, tokenTeks));
      for (const lt of latarTokens) {
        const mentah = keRgb(token(blok, lt));
        const latar = mentah[3] < 1 ? composite(mentah, permukaan) : mentah;
        const r = rasio(teks, latar);
        hasil.push(`  ${namaMode}  ${peran} di ${lt} = ${r.toFixed(2)}:1`);
        it(`${namaMode}: ${peran} di atas ${lt} >= 4.5:1 (dapat ${r.toFixed(2)}:1)`, () => {
          expect(r).toBeGreaterThanOrEqual(4.5);
        });
      }
    }
  }

  it("hierarki tetap ada: teks terpilih lebih terang dari teks menu, teks menu lebih terang dari label", () => {
    // Nilai ini bukan selera: kalau ketiganya sama, tidak ada lagi yang
    // membedakan item biasa, label seksi, dan baris aktif.
    for (const blok of Object.values(MODES)) {
      const t = (n: string) => luminansi(keRgb(token(blok, n)));
      expect(t("sidebar-text-active")).toBeGreaterThan(t("sidebar-text"));
      expect(t("sidebar-text")).toBeGreaterThan(t("sidebar-title"));
    }
  });
});
