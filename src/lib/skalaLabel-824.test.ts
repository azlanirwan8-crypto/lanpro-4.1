import fs from "node:fs";
import path from "node:path";

/**
 * #824 — satu skala label, satu skala sel.
 *
 * Label dan kepala tabel sebelumnya memakai tiga skala (9, 10, 11, 12 px)
 * plus pasangan responsif `sm:` yang membesar di layar kecil lalu mengecil di
 * layar besar. Penjaga ini memaku hasil penyeragaman:
 *
 *  1. `th` dasar 11 px/600/uppercase/0,05em di `src/index.css`;
 *  2. `LIST_THEAD_ROW_CLASS` tidak menimpa ukuran atau bobot `th` lagi;
 *  3. tidak ada pasangan `text-xs sm:text-[10px]` atau `[11px]` di sumber;
 *  4. tidak ada `text-[9px]` di luar `UserAvatar.tsx`, yang ukurannya memang
 *     dipilih per diameter avatar (#776).
 *
 * Yang diuji adalah sumber, bukan hasil render.
 */
const AKAR = path.join(__dirname, "..", "..");
const SRC = path.join(AKAR, "src");

function berkasSumber(direktori: string): string[] {
  const hasil: string[] = [];
  for (const entri of fs.readdirSync(direktori, { withFileTypes: true })) {
    const jalur = path.join(direktori, entri.name);
    if (entri.isDirectory()) hasil.push(...berkasSumber(jalur));
    else if (/\.tsx?$/.test(entri.name) && !/\.test\.tsx?$/.test(entri.name)) hasil.push(jalur);
  }
  return hasil;
}

const semua = berkasSumber(SRC);
const css = fs.readFileSync(path.join(SRC, "index.css"), "utf8");
const shell = fs.readFileSync(path.join(SRC, "components", "ui", "ListPageShell.tsx"), "utf8");

describe("#824 skala label dan kepala tabel", () => {
  test("th dasar 11 px, 600, uppercase, letter-spacing 0,05em", () => {
    const bersih = css.replace(/\/\*[\s\S]*?\*\//g, "");
    const blok = /th\s*\{([\s\S]*?)\}/.exec(bersih)?.[1] ?? "";
    expect(blok).toMatch(/font-size:\s*11px/);
    expect(blok).toMatch(/font-weight:\s*600/);
    expect(blok).toMatch(/text-transform:\s*uppercase/);
    expect(blok).toMatch(/letter-spacing:\s*0\.05em/);
  });

  test("LIST_THEAD_ROW_CLASS tidak menimpa ukuran atau bobot th", () => {
    const kelas = /LIST_THEAD_ROW_CLASS\s*=\s*\n?\s*"([^"]+)"/.exec(shell)?.[1] ?? "";
    expect(kelas).not.toMatch(/\btext-(xs|sm|base|lg)\b/);
    expect(kelas).not.toMatch(/\bfont-(normal|medium|semibold|bold)\b/);
  });

  test("tidak ada pasangan responsif label yang mengecil di layar besar", () => {
    const pelanggaran = semua.flatMap((jalur) => {
      const isi = fs.readFileSync(jalur, "utf8");
      const pola = /text-xs sm:text-\[(?:9|10|11)px\]/;
      return pola.test(isi) ? [path.relative(SRC, jalur)] : [];
    });
    expect(pelanggaran).toEqual([]);
  });

  test("tidak ada text-[9px] di luar UserAvatar", () => {
    const pelanggaran = semua.flatMap((jalur) => {
      if (jalur.endsWith("UserAvatar.tsx")) return [];
      const isi = fs.readFileSync(jalur, "utf8");
      return isi.includes("text-[9px]") ? [path.relative(SRC, jalur)] : [];
    });
    expect(pelanggaran).toEqual([]);
  });

  test("sel tabel UserSessions memakai skala sel 12 px", () => {
    const isi = fs.readFileSync(
      path.join(SRC, "features", "users", "UserSessionsPanel.tsx"),
      "utf8"
    );
    expect(isi).toContain('<tbody className="divide-y divide-border-subtle text-xs">');
  });
});
