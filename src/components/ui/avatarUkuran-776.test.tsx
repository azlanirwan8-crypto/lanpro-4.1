/**
 * #776 — inisial avatar tidak boleh lebih besar dari lingkarannya.
 *
 * Pemilik proyek, 17 Okt: "kan ada initial namanya, bentrok nih kebesaran
 * kayaknya, mungkin bisa disesuaikan lagi agak kecil dikit". Geometrinya
 * diukur di peramban (`scratch/harness-avatar.html`, CSS hasil build): akar
 * 13 px membuat `w-6` = 19,5 px sementara `text-xs` = 9,75 px, dan dua huruf
 * kapital Inter 600 selebar 1,51×fs ("MP") sampai 1,89×fs ("MW") — jadi
 * inisial memakan 86–95 % diameter dan `overflow-hidden` memotongnya.
 *
 * Penjaga ini mengunci TIGA hal yang membuat perbaikan itu tidak bisa diam-diam
 * rusak lagi: (a) setiap anak tangga memenuhi rasio aman terhadap DIAMETER
 * TERBURUK ("MW"), (b) `UserAvatar` yang memegang ukuran — kelas teks caller
 * dibuang, bukan dilawan dengan kelas lain, (c) tidak ada lingkaran avatar
 * liar yang menggambar inisialnya sendiri di luar komponen ini.
 */
import React from "react";
import { render } from "@testing-library/react";
import { readFileSync } from "fs";
import { join } from "path";
import UserAvatar from "./UserAvatar";

const SUMBER = join(__dirname, "UserAvatar.tsx");
const isi = () => readFileSync(SUMBER, "utf8").replace(/\r\n/g, "\n");

/** 1rem = 13 px — `html { font-size: 81.25% }`, src/index.css:546. */
const AKAR_PX = 13;
/** Lebar terburuk dua huruf kapital Inter 600, diukur: "WW" = 1,94×fs. */
const FAKTOR_DUA = 1.94;
/** Satu huruf terburuk ("W") = 0,89×fs. */
const FAKTOR_SATU = 0.89;
const RASIO_MAKS = 0.85;

const BARIS_TANGGA = () =>
  [
    ...isi().matchAll(
      /"([\d.]+)": \{ lingkaran: "([^"]+)", fs: "text-\[(\d+)px\]", huruf: (\d) \}/g
    ),
  ].map((b) => [b[1], b[2], b[3], b[4]]);

const kelasYangDirender = (props: any) => {
  const { container } = render(
    <UserAvatar
      uid="u1"
      members={[{ uid: "u1", displayName: "Mohamad Rifky Pramadanianto" }] as any}
      {...props}
    />
  );
  return container.firstElementChild as HTMLElement;
};

describe("tangga ukuran avatar (#776)", () => {
  it("tabelnya terbaca dan berisi anak tangga yang dipakai call site", () => {
    const baris = BARIS_TANGGA();
    expect(baris.length).toBeGreaterThanOrEqual(9);
    const anakTangga = baris.map(([n]) => n);
    for (const n of ["3.5", "4", "5", "6", "7", "8", "9", "10", "12", "16", "20"]) {
      expect(anakTangga).toContain(n);
    }
  });

  it.each(BARIS_TANGGA())(
    "anak tangga w-%s: inisial muat di lingkarannya",
    (n, lingkaran, fs, huruf) => {
      const diameter = Number(n) * 0.25 * AKAR_PX;
      const lebarInisial = Number(fs) * (Number(huruf) === 2 ? FAKTOR_DUA : FAKTOR_SATU);
      expect(lebarInisial / diameter).toBeLessThanOrEqual(RASIO_MAKS);
      // Kelas lingkaran harus benar-benar w-N h-N, bukan sekadar angka di tabel.
      expect(lingkaran).toBe(`w-${n} h-${n}`);
    }
  );

  it("di bawah 18 px hanya satu huruf yang ditampilkan — dua huruf tidak pernah terbaca", () => {
    const kecil = BARIS_TANGGA().filter(([n]) => Number(n) * 0.25 * AKAR_PX < 18);
    expect(kecil.length).toBeGreaterThan(0);
    for (const [, , , huruf] of kecil) expect(Number(huruf)).toBe(1);
    const teks = kelasYangDirender({ className: "w-4 h-4" }).textContent;
    expect(teks).toBe("M");
  });

  it("default tanpa prop size: w-6 dengan 8 px, dan teks caller tidak ikut dirender", () => {
    const el = kelasYangDirender({});
    expect(el.className).toContain("w-6 h-6");
    expect(el.className).toContain("text-[8px]");
    expect(el.className).not.toMatch(/\btext-xs\b/);
    expect(el.textContent).toBe("MP");
  });

  it("diameter caller dihormati — `w-4 h-4` tidak lagi dimenangkan `w-6` bawaan", () => {
    const el = kelasYangDirender({ className: "w-4 h-4 shrink-0" });
    expect(el.className).toContain("w-4 h-4");
    expect(el.className).not.toContain("w-6");
  });

  it("kelas ukuran teks caller dibuang, termasuk varian responsif", () => {
    const KASUS: [string, string][] = [
      ["w-9 h-9 text-sm", "text-[11px]"],
      ["w-6 h-6 text-xs sm:text-[11px] sm:text-[9px]", "text-[8px]"],
      ["w-12 h-12 text-[10px]", "text-[14px]"],
      ["w-8 h-8 text-2xs", "text-[10px]"],
    ];
    for (const [kelas, fs] of KASUS) {
      const el = kelasYangDirender({ className: kelas });
      expect(el.className).toContain(fs);
      for (const bekas of kelas.split(" ").filter((k) => k.includes("text-"))) {
        expect(el.className).not.toContain(bekas);
      }
    }
  });

  it("kelas WARNA teks caller tetap utuh — yang dibuang hanya ukuran", () => {
    const el = kelasYangDirender({ className: "w-7 h-7 text-content-muted" });
    expect(el.className).toContain("text-content-muted");
    expect(el.className).toContain("text-[9px]");
  });

  it("prop size lama tetap memetakan ke lingkaran yang sama seperti sebelumnya", () => {
    expect(kelasYangDirender({ size: "sm" }).className).toContain("w-6 h-6");
    expect(kelasYangDirender({ size: "md" }).className).toContain("w-8 h-8");
    expect(kelasYangDirender({ size: "lg" }).className).toContain("w-10 h-10");
  });

  it("tidak ada className yang memuat dua kelas ukuran teks di jalur papan", () => {
    const UKURAN = /(?:^|[a-z0-9_-]+:)text-(?:\d*xs|\d*sm|md|lg|xl|\[)/;
    const berkas = [
      "../../features/meeting-notes/UserBadge.tsx",
      "../../features/meeting-notes/components/LaciUtas.tsx",
    ];
    let diperiksa = 0;
    for (const p of berkas) {
      const sumber = readFileSync(join(__dirname, p), "utf8");
      for (const m of sumber.matchAll(/className="([^"]*)"/g)) {
        // Hanya lingkaran avatar (yang membawa w-N) — label teks bukan ranah #776.
        if (!/(?:^|\s)w-\d/.test(m[1])) continue;
        diperiksa++;
        const ukuran = m[1].split(/\s+/).filter((k) => UKURAN.test(k));
        expect(ukuran.length).toBeLessThanOrEqual(1);
      }
    }
    expect(diperiksa).toBeGreaterThan(0);
  });

  it("tidak ada kelas lebar tak sah (w-5.5) dan tidak ada lingkaran avatar liar", () => {
    const src = readFileSync(
      join(__dirname, "..", "..", "features", "qa", "components", "QATestCaseTable.tsx"),
      "utf8"
    );
    expect(src).not.toMatch(/\bw-5\.5\b/);
    const dash = readFileSync(
      join(__dirname, "..", "..", "features", "dashboard", "DashboardView.tsx"),
      "utf8"
    );
    expect(dash).not.toMatch(/\.slice\(0, ?2\)\.toUpperCase\(\)/);
  });
});
