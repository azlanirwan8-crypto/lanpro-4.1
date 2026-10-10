import fs from "node:fs";

/**
 * #682 — penjaga kontras WCAG untuk TOKEN MODE GELAP.
 *
 * KENAPA ADA. `npm run audit:tema` mengunci 100 nilai token dan menjaga orang
 * tidak menambah `dark:` atau menyilangkan kosakata, tetapi ia sendiri menulis
 * bahwa ia "tidak bisa menilai tema yang jelek secara rasa, tidak mengukur
 * kontras". Axe di `a181-458.test.tsx` juga menonaktifkan `color-contrast`
 * karena computed style Tailwind tidak andal di jsdom. Jadi seluruh nilai token
 * bisa lolos gerbang sambil tetap tidak terbaca — dan itu persis yang terjadi:
 * #679 dan #678 ditemukan oleh pengukuran tangan atas `src/index.css`, bukan
 * oleh salah satu gerbang yang ada.
 *
 * POLA YANG DIULANG. #524 sudah menyelesaikan masalah yang sama untuk sidebar
 * dengan test yang membaca index.css dan menghitung rasio luminansi. Penjaga ini
 * versi menyeluruhnya: kosakata teks dan permukaan untuk seluruh aplikasi,
 * ditambah dua pemeriksaan yang tidak pernah tertulis di mana pun:
 *
 *  1. batas kontrol (input, select, textarea) memakai garis kontrol, dan pemakai
 *     sungguhan bisa dilihat di `SelectField.tsx:70`, `TextAreaField.tsx:30`,
 *     `LanproDatePicker.tsx:232`, `LanproTimePicker.tsx:143`,
 *     `ListPerPageSelect.tsx:34`. WCAG 1.4.11 menuntut 3:1 untuk batas yang
 *     memberi tahu di mana kontrol berada. Sebelum #678 nilainya 1,03-1,47:1 —
 *     artinya di mode gelap tidak ada satu pun kolom isian yang tepinya bisa
 *     dilihat.
 *  2. garis pemisah dan permukaan elevasi pernah bernilai SAMA (#2a2f34), jadi
 *     garis di atas permukaan itu bukan samar, melainkan tidak ada (1,00:1).
 *     Larangan tabrakan nilai sekarang tertulis sebagai test, bukan harapan.
 *
 * BATAS JUJUR. Yang diuji adalah pasangan TOKEN, bukan kelas Tailwind yang
 * dipakai sebuah komponen. Sebuah tombol masih bisa menulis warna keras di atas
 * latar token dan penjaga ini tidak melihatnya — itu tugas `audit:warna`. Angka
 * di sini juga tidak memcomposite lapisan alpha, jadi pemisah berbasis aksen
 * tidak dijamin oleh test ini; #678 memindahkannya ke token justru supaya tidak
 * perlu dijamin di sini.
 *
 * CATATAN PENULISAN. Nama token selalu ditulis dalam bentuk properti kustom
 * lengkap (`--color-...`), bukan potongan nama kelas. Alasannya teknis, bukan
 * gaya: `npm run audit:kelas-token` memindai TEKS mentah dan akan menghitung
 * potongan itu sebagai kelas sungguhan yang tidak menghasilkan CSS apa pun.
 */
const css = fs.readFileSync(__dirname + "/../index.css", "utf8");

/** Isi blok `{...}` yang memuat penanda, untuk memisahkan dasar dan `html.dark`. */
function blokYangMemuat(penanda: string): string {
  const i = css.indexOf(penanda);
  if (i < 0) throw new Error("penanda tidak ditemukan di index.css: " + penanda);
  return css.slice(css.lastIndexOf("{", i) + 1, css.indexOf("}", i));
}

const MODE_GELAP = blokYangMemuat("--color-surface: #212529");

function tokenDi(blok: string, nama: string): string {
  const m = new RegExp(nama + ":\\s*([^;]+);").exec(blok);
  if (!m) throw new Error("token tidak ada: " + nama);
  return m[1].replace(/\/\*[\s\S]*?\*\//g, "").trim();
}

/** Nilai pertama yang muncul di berkas = definisi dasar (mode terang). */
function nilaiDasar(nama: string): string {
  const m = new RegExp(nama + ":\\s*([^;]+);").exec(css);
  if (!m) throw new Error("token tidak ada: " + nama);
  return m[1]
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .trim()
    .toLowerCase();
}

function keRgb(warna: string): [number, number, number] {
  const hex = /^#([0-9a-f]{6})$/i.exec(warna);
  if (hex) {
    const h = hex[1];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  throw new Error("penjaga ini hanya membaca hex 6 digit, dapat: " + warna);
}

function luminansi(w: [number, number, number]): number {
  const [r, g, b] = w
    .map((v) => v / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function rasio(a: string, b: string): number {
  const [terang, redup] = [luminansi(keRgb(a)), luminansi(keRgb(b))].sort((m, n) => n - m);
  return (terang + 0.05) / (redup + 0.05);
}

/**
 * LATAR yang benar-benar ada di aplikasi: permukaan yang ikut tema. Kaca
 * (`--color-surface-glass` dan `--color-border-glass` — putih bening, SENGAJA
 * bernilai sama di kedua mode, lihat komentar `index.css:84-92`) dan permukaan
 * inversi (`--color-surface-inverse*` — kartu gelap di kedua mode) TIDAK ikut
 * daftar ini karena pasangan teksnya lain.
 */
const LATAR = [
  "--color-surface-sunken",
  "--color-surface-muted",
  "--color-surface",
  "--color-surface-raised",
  "--color-surface-strong",
];

/** Teks yang duduk di atas latar itu, dari judul sampai placeholder. */
const TEKS = [
  "--color-content-strong",
  "--color-content",
  "--color-content-body",
  "--color-content-secondary",
  "--color-content-muted",
  "--color-content-subtle",
];

const GARIS_KONTROL = "--color-border-subtle";
const GARIS_PISAH = "--color-border-faint";

describe("#682 token mode gelap lolos WCAG AA untuk teks", () => {
  const angka: string[] = [];
  afterAll(() => console.log("\n#682 kontras token gelap\n" + angka.join("\n")));

  for (const t of TEKS) {
    const nilaiT = tokenDi(MODE_GELAP, t);
    for (const l of LATAR) {
      const nilaiL = tokenDi(MODE_GELAP, l);
      const r = rasio(nilaiT, nilaiL);
      angka.push(`  ${t} ${nilaiT} di ${l} ${nilaiL} = ${r.toFixed(2)}:1`);
      it(`${t} di atas ${l} >= 4,5:1 (dapat ${r.toFixed(2)}:1)`, () => {
        expect(r).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  it("tangga teks tetap monoton: judul > utama > isi > sekunder > redup > samar", () => {
    for (let i = 1; i < TEKS.length; i++) {
      expect(luminansi(keRgb(tokenDi(MODE_GELAP, TEKS[i - 1])))).toBeGreaterThan(
        luminansi(keRgb(tokenDi(MODE_GELAP, TEKS[i])))
      );
    }
  });

  it("elevasi tetap monoton: sunken < muted < surface < raised < strong", () => {
    for (let i = 1; i < LATAR.length; i++) {
      expect(luminansi(keRgb(tokenDi(MODE_GELAP, LATAR[i])))).toBeGreaterThan(
        luminansi(keRgb(tokenDi(MODE_GELAP, LATAR[i - 1])))
      );
    }
  });
});

describe("#682 garis mode gelap", () => {
  const angka: string[] = [];
  afterAll(() => console.log("\n#682 kontras garis gelap\n" + angka.join("\n")));

  // Batas kontrol (1.4.11): yang memberitahu user di mana kolom isian berada.
  const kontrol = tokenDi(MODE_GELAP, GARIS_KONTROL);
  for (const l of LATAR) {
    const r = rasio(kontrol, tokenDi(MODE_GELAP, l));
    angka.push(`  ${GARIS_KONTROL} ${kontrol} di ${l} = ${r.toFixed(2)}:1`);
    it(`${GARIS_KONTROL} sebagai batas kontrol >= 3:1 di ${l} (dapat ${r.toFixed(2)}:1)`, () => {
      expect(r).toBeGreaterThanOrEqual(3);
    });
  }

  // Pemisah hiasan: tidak dituntut 3:1, tapi tidak boleh lenyap dan tidak
  // boleh bernilai sama dengan latar yang ia pisahkan.
  const pisah = tokenDi(MODE_GELAP, GARIS_PISAH);
  for (const l of LATAR) {
    const nilaiL = tokenDi(MODE_GELAP, l);
    it(`${GARIS_PISAH} ${pisah} tidak boleh sama nilainya dengan ${l} ${nilaiL}`, () => {
      expect(pisah.toLowerCase()).not.toBe(nilaiL.toLowerCase());
    });
    const r = rasio(pisah, nilaiL);
    angka.push(`  ${GARIS_PISAH} ${pisah} di ${l} = ${r.toFixed(2)}:1`);
    it(`${GARIS_PISAH} masih terlihat di ${l} >= 1,3:1 (dapat ${r.toFixed(2)}:1)`, () => {
      expect(r).toBeGreaterThanOrEqual(1.3);
    });
  }

  it("garis kontrol lebih terang dari garis pemisah (kuat != halus)", () => {
    expect(luminansi(keRgb(kontrol))).toBeGreaterThan(luminansi(keRgb(pisah)));
  });

  it("garis sidebar ikut dinaikkan karena komentarnya menulis sama dengan garis", () => {
    expect(tokenDi(MODE_GELAP, "--color-sidebar-border")).toBe(kontrol);
  });
});

describe("#682 mode terang tidak bergeser oleh pekerjaan ini", () => {
  // #679 dan #678 mengubah blok `html.dark` saja. Penjaga ini mengunci bahwa
  // tidak ada satu pun nilai dasar yang ikut tersentuh, supaya klaim
  // "mode terang tidak berubah" bukan sekadar kata-kata. Kemunculan PERTAMA tiap
  // token adalah definisi dasarnya, sebab blok gelap baru dibuka kemudian.
  const BAWAAN_TERANG: Record<string, string> = {
    "--color-surface": "#ffffff",
    "--color-surface-muted": "#f4f7f9",
    "--color-surface-sunken": "#f8fafc",
    "--color-surface-raised": "#ffffff",
    "--color-surface-strong": "#e2e8f0",
    "--color-content": "#0f172a",
    "--color-content-strong": "#1e293b",
    "--color-content-body": "#334155",
    "--color-content-secondary": "#475569",
    "--color-content-muted": "#64748b",
    "--color-content-subtle": "#64748b",
    [GARIS_KONTROL]: "#e2e8f0",
    [GARIS_PISAH]: "#f1f5f9",
  };

  for (const [nama, nilai] of Object.entries(BAWAAN_TERANG)) {
    it(`${nama} mode terang tetap ${nilai}`, () => {
      expect(nilaiDasar(nama)).toBe(nilai);
    });
  }
});
