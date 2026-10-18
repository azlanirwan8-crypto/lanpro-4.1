/**
 * #790 — gelembung utas: ukuran yang disukai pemilik proyek, ritme yang tidak.
 *
 * "ini font ny sesuai kok agak kasar ya" (18 Okt). Diukur pada CSS hasil build,
 * yang kasar itu TIGA hal dan bukan ukuran: isi gelembung satu-satunya teks
 * pesan 13 px di aplikasi ini (LiveChat 9,75 px), memakai `leading-relaxed`
 * 1,625 yang paling longgar, dan ditulis dengan `text-content-strong`
 * (#1e293b) — token teks tergelap kedua — sementara prosa di tempat lain
 * memakai `text-content-body` (#334155).
 *
 * Opsi O1 yang dipilih: TAHAN 13 px, turunkan token dan leading. Penjaga ini
 * mengunci ketiganya supaya "perbaikan" berikutnya tidak diam-diam mengecilkan
 * hurufnya lagi atau mengangkat warnanya kembali.
 */
import { readFileSync } from "fs";
import { join } from "path";

const SUMBER = readFileSync(join(__dirname, "LaciUtas.tsx"), "utf8").replace(/\r\n/g, "\n");
const baris = SUMBER.split("\n");

const isiGelembung = (cari: string) => {
  const i = baris.findIndex((l) => l.includes(cari));
  if (i < 0) throw new Error(`tidak menemukan "${cari}" di LaciUtas.tsx`);
  return baris.slice(i, i + 8).join("\n");
};

describe("ritme tipografi gelembung utas (#790)", () => {
  it("isi pesan TETAP 13 px — itu yang dinyatakan sesuai, jangan dikecilkan", () => {
    expect(SUMBER).toMatch(/<p className="text-\[13px\]/);
  });

  it("tinggi baris turun ke normal, dan berat ditulis eksplisit", () => {
    const p = isiGelembung('<p className="text-[13px]');
    expect(p).toContain("leading-normal");
    expect(p).toContain("font-normal");
    expect(p).not.toContain("leading-relaxed");
  });

  it("gelembung orang lain memakai content-body, bukan content-strong", () => {
    const blok = isiGelembung("px-3 py-1.5 rounded-2xl");
    expect(blok).toContain("text-content-body");
    expect(blok).not.toContain("text-content-strong");
  });

  it("gelembung milik sendiri tetap teks terang di atas latar primary-surface", () => {
    const blok = isiGelembung("px-3 py-1.5 rounded-2xl");
    expect(blok).toContain("bg-primary-surface text-content-inverse");
  });

  it("tidak ada varian sm: ganda untuk properti yang sama di berkas ini", () => {
    // #784: cn() hanya merangkai string, jadi dua `sm:` pada elemen yang sama
    // berarti yang kecil mati. Ditulis ulang di sini karena gelembung ini sering
    // menjadi tempat "penyesuaian kecil".
    const ganda: string[] = [];
    for (const literal of SUMBER.matchAll(/"([^"]*sm:[^"]*)"/g)) {
      const per = new Map<string, number>();
      for (const m of literal[1].matchAll(/sm:([a-z-]+)-/g)) {
        per.set(m[1], (per.get(m[1]) || 0) + 1);
      }
      for (const [properti, n] of per) if (n > 1) ganda.push(properti);
    }
    expect(ganda).toEqual([]);
  });
});
