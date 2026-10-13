/**
 * #726 — layar DOCUMENTATION diukur terhadap Velzon, bukan dirasa.
 *
 * KENAPA TEST INI ADA. Pemilik proyek menanyakan "menu documentation cek dan
 * review ui nya sudah menggunakan styling velzon ya" dan mengirim empat
 * tangkapan layar. Yang ketemu bukan selera: layar ini adalah satu-satunya
 * tabel list yang BELUM tersapu keputusan #645/#647/#649 — judul dokumen
 * dikunci `line-clamp-1`, nama berkas dan penulis dikunci `truncate`, dan
 * `<tr>` datanya masih memaksa satu baris dengan `h-12`. Penjaga ratchet di
 * `dataTampilPenuh-646-647.test.ts` sudah MENULIS nama berkas ini sebagai
 * "satu situs warisan yang belum dikerjakan"; baris itu kini kosong, dan test
 * di bawah yang menjaga agar tidak kembali terisi.
 *
 * Dua hal lain ikut dikunci karena keduanya TIDAK dilihat gerbang mana pun:
 * `audit:warna` hanya menghitung white|black|slate|gray|zinc|neutral|stone,
 * jadi `bg-emerald-500/10` dan `text-amber-800` lolos senyap; dan dua varian
 * `sm:` pada properti yang sama (`sm:text-[11px] sm:text-[9px]`) keduanya
 * terkirim — yang menang urutan stylesheet, jadi teks 9px muncul di layar
 * padahal yang ditulis manusia adalah 11px.
 *
 * Test ini MEMBACA SUMBER. jsdom tidak menghitung layout, jadi yang dikunci
 * adalah kelasnya, bukan tampilannya.
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const AKAR = __dirname;

/** Semua `.tsx` fitur wiki, plus berkas yang pernah jadi rujukan sapuan. */
const berkasWiki = (): string[] => {
  const keluar: string[] = [];
  for (const e of readdirSync(AKAR, { withFileTypes: true })) {
    const p = join(AKAR, e.name);
    if (e.isDirectory() && !/node_modules|dist/.test(e.name)) {
      for (const f of readdirSync(p)) if (/\.tsx$/.test(f)) keluar.push(join(p, f));
    } else if (/\.tsx$/.test(e.name) && !/\.test\.tsx$/.test(e.name)) keluar.push(p);
  }
  return keluar;
};

const isi = (relatif: string): string =>
  readFileSync(join(AKAR, relatif), "utf8").replace(/\r\n/g, "\n");

const DAFTAR = "WikiView.tsx";
const KARTU = "components/WikiMobileCardView.tsx";

describe("palet warna layar DOCUMENTATION (#726)", () => {
  it("nol kelas kromatik berdigit — warna diambil dari token", () => {
    const pola = /\b(?:bg|text|border|from|via|to|ring|divide)-[a-z]+-\d{2,3}\b/g;
    const temuan: string[] = [];
    for (const f of berkasWiki()) {
      const nama = f.slice(AKAR.length + 1).replace(/\\/g, "/");
      for (const m of readFileSync(f, "utf8").matchAll(pola)) temuan.push(`${nama}:${m[0]}`);
    }
    expect([...new Set(temuan)].sort()).toEqual([]);
  });

  it("chip berkas, lencana pinned, dan bar info PDF memakai token semantik", () => {
    const s = isi(DAFTAR);
    expect(s).toContain("bg-success/10 hover:bg-success/15 text-success-text");
    expect(s).toContain("bg-warning/10 border-b border-warning/30");
    expect(s).toContain("bg-danger/10 text-danger-text border border-danger/30");
  });
});

describe("data tampil penuh di tabel DOCUMENTATION (#645 -> #726)", () => {
  it("tidak ada satu pun pemotong teks di daftar dan kartu mobile", () => {
    for (const f of [DAFTAR, KARTU]) {
      const s = isi(f);
      expect([...s.matchAll(/\b(?:line-clamp-\d|text-ellipsis)\b|\btruncate\b/g)]).toEqual([]);
    }
  });

  it("baris DATA tidak lagi memaksa satu baris dan tidak dikunci tingginya", () => {
    const baris = isi(DAFTAR).split("\n");
    const tr = baris.filter((l) => /className="[^"]*(whitespace-nowrap|h-12)/.test(l));
    // Yang tersisa hanyalah <td> nomor dan sel pendek yang memang boleh sebaris;
    // tidak ada lagi <tr> yang membawa keduanya.
    const pembawaKedua = baris.filter((l) => /whitespace-nowrap/.test(l) && /h-12/.test(l));
    expect(pembawaKedua).toEqual([]);
    expect(tr.some((l) => /<tr\b/.test(l))).toBe(false);
  });

  it("sel yang melebar menyatakan sendiri izin berganti barisnya (#649)", () => {
    const s = isi(DAFTAR);
    expect(s).toMatch(/max-w-\[320px\] whitespace-normal break-words/);
    expect(s).toMatch(/<span className="max-w-\[220px\] whitespace-normal break-words">/);
  });

  it("kartu mobile ikut tidak memotong", () => {
    const s = isi(KARTU);
    expect(s).toMatch(/text-content-strong leading-snug whitespace-normal break-words/);
    expect(s).toMatch(/font-medium text-content whitespace-normal break-words/);
  });
});

describe("ritme dan chrome (#726)", () => {
  it("kepala tabel memakai ritme Velzon yang sama dengan sel datanya", () => {
    const s = isi(DAFTAR);
    const th = [...s.matchAll(/<th className="([^"]*)"/g)].map((m) => m[1]);
    expect(th.length).toBeGreaterThanOrEqual(7);
    for (const k of th) {
      expect(k).toContain("py-2.5");
      expect(k).not.toContain("py-3 ");
    }
    expect(s).toContain('<tbody className="divide-y divide-border-subtle');
  });

  it("satu tinggi untuk semua kontrol satu-baris: tidak ada nilai arbitrer", () => {
    const s = isi(DAFTAR);
    expect(s).not.toMatch(/h-\[38px\]/);
    expect(s).toMatch(/buttonClassName="h-9 bg-surface rounded-md/);
    expect(s).toMatch(/w-full h-9 bg-surface border border-border-subtle/);
  });

  it("tidak ada properti yang ditulis dua kali dengan varian sm: berbeda", () => {
    // `cn()` di repo ini hanya merangkai string, jadi dua varian untuk satu
    // properti sama-sama terkirim dan pemenangnya urutan stylesheet.
    for (const f of berkasWiki()) {
      const s = readFileSync(f, "utf8");
      expect([...s.matchAll(/sm:text-\[\d+px\] sm:text-/g)]).toEqual([]);
    }
  });

  it("chrome modal ikut pola rumah: rounded-xl dan pemisah subtle", () => {
    const s = isi(DAFTAR);
    expect(s).toContain("bg-surface rounded-xl shadow-xl border border-border-subtle max-w-2xl");
    expect(s).not.toContain("border-b border-border-faint flex justify-between items-center");
    expect(s).not.toContain("border-t border-border-faint flex items-center justify-end");
  });

  it("lantai tipografi 10px dijaga", () => {
    for (const f of berkasWiki()) {
      const s = readFileSync(f, "utf8");
      const di = [...s.matchAll(/text-\[(\d+)px\]/g)].filter((m) => +m[1] < 10);
      expect(di.map((m) => m[0])).toEqual([]);
    }
  });
});
