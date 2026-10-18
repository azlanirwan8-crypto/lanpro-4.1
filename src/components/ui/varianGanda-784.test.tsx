/**
 * #784 — satu elemen tidak boleh membawa DUA varian `sm:` untuk properti yang sama.
 *
 * Pemilik proyek, 18 Okt: "masih tidak clean ... kasar dan berat". Ini keluarga
 * cacat yang sama dengan #776 dan #780 tetapi skalanya seluruh aplikasi: 51
 * elemen menulis misalnya `text-xs sm:text-[11px] sm:text-[9px]`. Karena `cn()`
 * di `src/lib/utils.ts:4` hanya merangkai string (bukan `tailwind-merge`), kedua
 * deklarasi masuk DOM dan pemenangnya URUTAN STYLESHEET — terukur dari
 * `dist/assets/*.css`, di dalam blok `sm:` Tailwind menata nilai arbitrer NAIK
 * (`.sm:text-[8px]` < `[9px]` < `[10px]` < `[11px]`), jadi yang tampil selalu
 * angka BESAR dan nilai kecil yang dimaksud penulis mati.
 *
 * Yang dilakukan #784: buang deklarasi yang tidak pernah tampil. Tampilan tidak
 * berubah satu piksel pun — yang berubah adalah kejujuran source. Penjaga ini
 * memastikan pasangan itu tidak ditulis lagi.
 *
 * Catatan cakupan: nilai yang sama di dua CABANG ternary (`kondisi ? "sm:text-[10px]"
 * : "..."`) bukan cacat, jadi pemeriksaan berjalan per literal, bukan per baris.
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const AKAR = join(__dirname, "..", "..");
const TSX: string[] = [];
const jalan = (d: string) => {
  for (const n of readdirSync(d)) {
    if (["node_modules", "dist", ".git"].includes(n)) continue;
    const p = join(d, n);
    if (statSync(p).isDirectory()) jalan(p);
    else if (/\.tsx?$/.test(n) && !/\.test\./.test(n)) TSX.push(p);
  }
};
jalan(AKAR);

const LITERAL = /(["'`])((?:(?!\1)[^\r\n]|\\.)*?)\1/g;
const NILAI = /sm:([a-z-]+)-\[(\d+(?:\.\d+)?)(px|rem|%)\]/g;

describe("satu varian sm: per properti (#784)", () => {
  it("tidak ada literal className yang memuat dua nilai sm: untuk properti yang sama", () => {
    const pelanggar: string[] = [];
    for (const f of TSX) {
      const isi = readFileSync(f, "utf8").replace(/\r\n/g, "\n");
      for (const petik of isi.matchAll(LITERAL)) {
        const perProperti = new Map<string, string[]>();
        for (const m of petik[2].matchAll(NILAI)) {
          const kunci = m[1] + (m[3] === "px" ? "" : m[3]);
          perProperti.set(kunci, [...(perProperti.get(kunci) || []), m[2]]);
        }
        for (const [properti, nilai] of perProperti) {
          if (nilai.length > 1) {
            pelanggar.push(
              `${f}:${isi.slice(0, petik.index || 0).split("\n").length} ${properti}=[${nilai.join(",")}]`
            );
          }
        }
      }
    }
    expect(pelanggar).toEqual([]);
  });

  it("penjaga ini benar-benar menangkap pasangan ganda (regresi test-diri)", () => {
    const contoh = 'className="text-xs sm:text-[11px] sm:text-[9px] font-normal"';
    const temuan: string[] = [];
    for (const petik of contoh.matchAll(LITERAL)) {
      const nilai = [...petik[2].matchAll(NILAI)].filter((m) => m[1] === "text").map((m) => m[2]);
      if (nilai.length > 1) temuan.push(nilai.join(","));
    }
    expect(temuan).toEqual(["11,9"]);
  });
});
