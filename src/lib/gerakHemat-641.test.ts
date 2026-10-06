/**
 * #641 — satu saklar gerakan untuk seluruh aplikasi.
 *
 * MENGAPA TEST INI MEMBACA SUMBER. Dua hal yang harus dijamin tidak bisa
 * dibuktikan dari render jsdom: (a) apakah `MotionConfig` benar-benar duduk di
 * akar sehingga MENCAKUP semua komponen `motion/react` yang sekarang ada di 42
 * berkas dan yang akan datang, dan (b) apakah aturan `prefers-reduced-motion`
 * di `index.css` masih MENGALAH atau masih MENANG terhadap utilitas. Point (b)
 * justru yang paling rapuh: kalau `!important` dilepas, aturannya tetap ada di
 * berkas, tetap lolos pencarian, dan tetap tidak berlaku satu pun — kegagalan
 * yang bentuknya "sudah kami dukung" padahal belum.
 *
 * Yang TIDAK dikunci di sini: perilaku peramban sungguhan saat preferensi OS
 * dinyalakan. Itu hanya bisa dilihat di tab bersih.
 */
import { readFileSync } from "fs";
import { join } from "path";

const AKAR = join(__dirname, "..", "..");
const baca = (relatif: string) => readFileSync(join(AKAR, relatif), "utf8").replace(/\r\n/g, "\n");

describe("saklar reduced-motion (#641)", () => {
  it("akar memasang MotionConfig dengan reducedMotion=user di luar App", () => {
    const main = baca("src/main.tsx");
    expect(main).toContain('import { MotionConfig } from "motion/react"');
    expect(main).toContain('reducedMotion="user"');

    // Saklar harus MEMBUNGKUS App, bukan duduk di sebelahnya — kalau tidak,
    // seluruh pohon komponen di dalam App tidak ikut warisan.
    const bungkus =
      /<MotionConfig[^>]*reducedMotion="user"[^>]*>\s*<App\s*\/>\s*<\/MotionConfig>/.test(main);
    expect(bungkus).toBe(true);
  });

  it("tidak ada yang boleh mematikan saklar itu di dalam pohon", () => {
    // `reducedMotion="never"` di komponen anak menimpa keputusan akar secara
    // diam-diam dan persis itulah yang membuat dukungan ini tampak ada padahal
    // tidak.
    const sumber = ["src/main.tsx", "src/App.tsx", "src/AppContainer.tsx"]
      .map((f) => baca(f))
      .join("\n");
    expect(sumber).not.toContain('reducedMotion="never"');
  });

  it("sapuan CSS untuk reduced-motion menang atas utilitas, bukan kalah", () => {
    const css = baca("src/index.css");
    const blok = css.split("@media (prefers-reduced-motion: reduce)");
    // Dua blok: satu untuk kartu (khusus kelas), satu sapuan universal.
    expect(blok.length - 1).toBe(2);

    const sapuan = blok[blok.length - 1];
    expect(sapuan).toMatch(/\*,\s*\*::before,\s*\*::after\s*\{/);
    // Ini inti penjaga: tanpa !important aturan di bawah kalah spesifik dari
    // kelas `transition-all` / `animate-*` dan jadi hiasan belaka.
    expect(sapuan).toContain("transition-duration: 0.01ms !important");
    expect(sapuan).toContain("animation-iteration-count: 1 !important");
    expect(sapuan).toContain("animation-duration: 0.01ms !important");
    expect(sapuan).toContain("scroll-behavior: auto !important");
  });

  it("sapuan memakai 0,01 ms, bukan nol, supaya peristiwa akhir animasi tetap ada", () => {
    // Banyak komponen menunggu `transitionend`/`animationend`; durasi 0
    // membuat peristiwa itu tidak pernah dikirim dan layar menggantung.
    const css = baca("src/index.css");
    expect(css).not.toMatch(/transition-duration:\s*0ms\s*!important/);
    expect(css).not.toMatch(/animation-duration:\s*0s?\s*!important/);
  });
});
