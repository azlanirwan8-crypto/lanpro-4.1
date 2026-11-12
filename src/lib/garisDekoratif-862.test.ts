import fs from "node:fs";
import path from "node:path";

/**
 * #862 — garis PEMISAH tidak boleh memakai token batas KONTROL.
 *
 * KENAPA ADA. `--color-border-subtle` adalah token kontrol: di mode gelap ia
 * #8b9299 supaya tepi kolom isian lolos WCAG 1.4.11 (3:1). Token itu juga
 * dipakai 141 pasangan satu-sisi (`border-b border-border-subtle` dan
 * sejenisnya) serta 12 `divide-border-subtle` untuk garis dekoratif — kepala
 * tabel, footer panel, tepi anak panel. Hasilnya baris tabel 4,90:1 di atas
 * kartu: sekokoh tepi input, dan lebih bergaris daripada Velzon (#32383e =
 * 1,30:1). Tema gelap yang "ambil dari Velzon" jadi tidak sama rasanya.
 *
 * Yang dikunci test ini bukan NILAI token — itu urusan
 * `kontrasTemaGelap-682.test.ts` — melainkan PEMAKAIANNYA: tidak boleh ada
 * lagi garis satu-sisi atau `divide` yang memakai token kontrol.
 *
 * BATAS JUJUR. Pemindaian ini berbasis teks per baris, sama seperti gerbang
 * `audit:kelas`. Kelas yang disusun di runtime (template string lintas baris)
 * tidak terbaca; karena itu angka pemakaian token pemisah juga diperiksa
 * minimal, supaya test ini tidak lulus hanya karena pemindaiannya kosong.
 */
const AKAR = path.join(__dirname, "..");
const CSS = path.join(AKAR, "index.css");

const SISI = "(?:sm:|md:|lg:|xl:)?border-(?:b|t|l|r)(?:-[0-9])?";
const SUBTLE = "border-border-subtle(?:/[0-9]+)?";
/** `border-b border-border-subtle` — bentuk paling umum. */
const MENURUT = new RegExp(`\\b${SISI}\\s+${SUBTLE}(?![\\w-])`, "g");
/** `border-border-subtle/80 border-l-4` — bentuk terbalik. */
const TERBALIK = new RegExp(`\\b${SUBTLE}\\s+${SISI}(?![\\w-])`, "g");
/** `border border-border-subtle` = batas penuh (kontrol/kartu) — BUKAN sasaran. */
const BORDER_PENUH = /(?:^|[\s"'`])border(?![\w-])/;

function berkasSumber(dir: string, keluar: string[] = []): string[] {
  for (const entri of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entri.name);
    if (entri.isDirectory()) {
      if (entri.name !== "node_modules") berkasSumber(p, keluar);
    } else if (/\.(ts|tsx)$/.test(entri.name) && !/\.test\.tsx?$/.test(entri.name)) {
      keluar.push(p);
    }
  }
  return keluar;
}

const berkas = berkasSumber(AKAR);
const temuan: string[] = [];
const pakaiPemisah: string[] = [];
const pakaiKontrol: string[] = [];

for (const b of berkas) {
  const relatif = path.relative(AKAR, b).split(path.sep).join("/");
  fs.readFileSync(b, "utf8")
    .split("\n")
    .forEach((baris, i) => {
      if (baris.includes("divide-border-subtle")) {
        temuan.push(`${relatif}:${i + 1} divide- memakai token kontrol`);
      }
      // `border border-l-4 border-border-subtle` adalah KARTU bertepi aksen —
      // batas penuh yang sah memakai token kontrol. `border-t-primary` juga
      // bukan kelas sisi (`(?![\w-])` menolaknya). Jadi baris yang punya batas
      // penuh dilewati; hanya garis yang HANYA satu sisi yang jadi sasaran.
      if (!BORDER_PENUH.test(baris) && MENURUT.test(baris)) {
        temuan.push(`${relatif}:${i + 1} garis satu-sisi memakai token kontrol`);
      }
      MENURUT.lastIndex = 0;
      if (!BORDER_PENUH.test(baris) && TERBALIK.test(baris)) {
        temuan.push(`${relatif}:${i + 1} garis satu-sisi (urutan terbalik) memakai token kontrol`);
      }
      TERBALIK.lastIndex = 0;
      if (baris.includes("border-border-divider")) pakaiPemisah.push(relatif);
      if (baris.includes("border-border-subtle")) pakaiKontrol.push(relatif);
    });
}

const css = fs.readFileSync(CSS, "utf8");

describe("#862 token garis dekoratif", () => {
  it("token pemisah ada dan bukan token kontrol di mode gelap", () => {
    expect(css).toContain("--color-border-divider:");
    const semua = [...css.matchAll(/--color-border-divider:\s*([^;]+);/g)].map((m) => m[1].trim());
    expect(semua).toHaveLength(2);
    // Terang = tampilan `--color-border-subtle` sekarang (#ced4da) agar tidak bergeser.
    expect(semua[0]).toBe("#ced4da");
    // Gelap = nilai pemisah (#4b5259), bukan nilai kontrol (#8b9299).
    expect(semua[1]).toBe("#4b5259");
  });

  it("tidak ada lagi garis dekoratif yang memakai token kontrol", () => {
    expect(temuan).toEqual([]);
  });

  it("pemindahan benar-benar terjadi — bukan pemindaian kosong", () => {
    expect(berkas.length).toBeGreaterThan(100);
    expect(pakaiPemisah.length).toBeGreaterThanOrEqual(140);
    expect(pakaiKontrol.length).toBeGreaterThanOrEqual(500);
  });
});
