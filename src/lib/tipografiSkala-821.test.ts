import fs from "node:fs";
import path from "node:path";

/**
 * #821 — skala huruf inti dipatok px, akar 13 px dipertahankan (Opsi A).
 *
 * `html { font-size: 81.25% }` membuat 1rem = 13 px. Token teks Tailwind
 * masih rem, jadi menyusut: text-xs 9,75 px, text-sm 11,375 px. Opsi B
 * (menaikkan akar ke 16 px) ditolak pemilik karena menggeser seluruh padding,
 * gap, dan radius berbasis rem; jadi HANYA ukuran huruf yang dipatok.
 *
 * Penjaga ini mengunci nilai yang disepakati — bukan preferensi — agar satu
 * suntingan tidak diam-diam mengembalikan skala ke rem atau mengubah akar.
 * Yang diuji adalah sumber CSS; hasil render tetap perlu diperiksa di peramban.
 */
const AKAR = path.join(__dirname, "..", "..");
const css = fs.readFileSync(path.join(AKAR, "src", "index.css"), "utf8");

/** Isi blok `{...}` dengan pencocokan kurung, sesudah komentar dibuang. */
function blokPembuka(pembuka: string): string {
  const bersih = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const awal = bersih.indexOf(pembuka);
  if (awal < 0) throw new Error("blok tidak ditemukan: " + pembuka);
  let dalam = 0;
  for (let i = awal + pembuka.length - 1; i < bersih.length; i++) {
    if (bersih[i] === "{") dalam++;
    else if (bersih[i] === "}") {
      dalam--;
      if (dalam === 0) return bersih.slice(awal + pembuka.length, i);
    }
  }
  throw new Error("blok tidak ditutup: " + pembuka);
}

const TEMA = blokPembuka("@theme {");

function nilaiToken(nama: string): string {
  const cocok = new RegExp("--" + nama + ":\\s*([^;]+);").exec(TEMA);
  if (!cocok) throw new Error("token tidak ada: --" + nama);
  return cocok[1].trim();
}

/** Isi blok CSS untuk pasangan selektor `hN, .hN`. */
function blokHeading(tingkat: 1 | 2 | 3): string {
  const bersih = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const pola = new RegExp("h" + tingkat + "\\s*,\\s*\\.h" + tingkat + "\\s*\\{([\\s\\S]*?)\\}");
  const cocok = pola.exec(bersih);
  if (!cocok) throw new Error("blok h" + tingkat + " tidak ditemukan");
  return cocok[1];
}

function properti(blok: string, nama: string): string {
  const cocok = new RegExp(nama + ":\\s*([^;]+);").exec(blok);
  if (!cocok) throw new Error("properti tidak ada: " + nama);
  return cocok[1].trim();
}

const SKALA: Record<string, [string, string]> = {
  xs: ["12px", "16px"],
  sm: ["13px", "18px"],
  base: ["13px", "18px"],
  lg: ["15px", "22px"],
  xl: ["16px", "22px"],
  "2xl": ["20px", "28px"],
  "4xl": ["28px", "34px"],
};

describe("#821 akar tetap 13 px (Opsi A)", () => {
  it("html tetap 81,25%, bukan 100%", () => {
    const cocok = /html\s*\{\s*font-size:\s*([^;]+);/.exec(css);
    if (!cocok) throw new Error("aturan html font-size tidak ditemukan");
    expect(cocok[1].trim()).toBe("81.25%");
  });
});

describe("#821 token teks inti memakai px, bukan rem", () => {
  for (const [nama, [ukuran, tinggi]] of Object.entries(SKALA)) {
    it("text-" + nama + " = " + ukuran + " / " + tinggi, () => {
      expect(nilaiToken("text-" + nama)).toBe(ukuran);
      expect(nilaiToken("text-" + nama + "--line-height")).toBe(tinggi);
    });
  }
});

describe("#821 judul dan kontrol memakai px sesuai niat komentar", () => {
  it("h1 18px, h2 16px, h3 14px", () => {
    expect(properti(blokHeading(1), "font-size")).toBe("18px");
    expect(properti(blokHeading(2), "font-size")).toBe("16px");
    expect(properti(blokHeading(3), "font-size")).toBe("14px");
  });

  it("input dan select 12px", () => {
    const bersih = css.replace(/\/\*[\s\S]*?\*\//g, "");
    const aturan = /input\[type="text"\][\s\S]*?\{([^}]*)\}/.exec(bersih);
    if (!aturan) throw new Error("aturan input[type=text] tidak ditemukan");
    expect(properti(aturan[1], "font-size")).toBe("12px");
  });
});
