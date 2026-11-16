import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

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
const fragmenKelas = (node: ts.Node): string | null =>
  ts.isStringLiteral(node) ||
  ts.isNoSubstitutionTemplateLiteral(node) ||
  ts.isTemplateHead(node) ||
  ts.isTemplateMiddle(node) ||
  ts.isTemplateTail(node)
    ? node.text
    : null;

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
    expect(isi).toContain('<tbody className="divide-y divide-border-divider">');
    const bersih = css.replace(/\/\*[\s\S]*?\*\//g, "");
    const sel = /td\s*\{([\s\S]*?)\}/.exec(bersih)?.[1] ?? "";
    expect(sel).toMatch(/font-size:\s*12px/);
    expect(sel).toMatch(/padding:\s*8px 12px/);
  });
});

describe("#865 standar sel lintas fitur", () => {
  test("penjaga membaca awal, tengah, dan akhir template kelas", () => {
    const sumber = ts.createSourceFile(
      "fixture.tsx",
      "const f = <td className={`px-8 ${flag} py-3 ${other} text-[10px]`} />;",
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    );
    const fragmen: string[] = [];
    const kunjungi = (node: ts.Node) => {
      const teks = fragmenKelas(node);
      if (teks !== null) fragmen.push(teks);
      ts.forEachChild(node, kunjungi);
    };
    kunjungi(sumber);
    expect(fragmen).toEqual(["px-8 ", " py-3 ", " text-[10px]"]);
  });

  test("nilai persentase Progress mengikuti ukuran badan tabel", () => {
    const isi = fs.readFileSync(
      path.join(SRC, "features/issues/components/list/IssueTableRow.tsx"),
      "utf8"
    );
    const persen = isi.lastIndexOf("{progressValue}%");
    expect(persen).toBeGreaterThan(0);
    const nilai = isi.slice(isi.lastIndexOf("<span", persen), persen);
    expect(nilai).toContain("font-normal font-mono w-8 text-right shrink-0");
    expect(nilai).not.toMatch(/text-(?:xs\b|sm\b|\[\d+px\])/);
  });

  test("padding kepala dan data tetap 8px 12px", () => {
    const bersih = css.replace(/\/\*[\s\S]*?\*\//g, "");
    for (const nama of ["th", "td"]) {
      const blok = new RegExp(`\\b${nama}\\s*\\{([\\s\\S]*?)\\}`).exec(bersih)?.[1] ?? "";
      expect(blok).toMatch(/padding:\s*8px 12px/);
    }
  });

  test("sel produksi tidak menimpa padding atau skala huruf global", () => {
    const pelanggaran: string[] = [];
    let jumlahSel = 0;
    let jumlahCompact = 0;
    let jumlahPegangan = 0;
    for (const jalur of semua.filter((f) => f.endsWith(".tsx"))) {
      const relatif = path.relative(SRC, jalur).replace(/\\/g, "/");
      const sumber = ts.createSourceFile(
        jalur,
        fs.readFileSync(jalur, "utf8"),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX
      );
      const kunjungi = (node: ts.Node) => {
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
          const nama = node.tagName.getText(sumber);
          if (["th", "td", "ThSortir"].includes(nama)) {
            jumlahSel++;
            const atribut = node.attributes.properties.filter(ts.isJsxAttribute);
            const kosong = atribut.some((a) => a.name.getText(sumber) === "colSpan");
            const kelas = atribut.find((a) => a.name.getText(sumber) === "className")?.initializer;
            const bacaKelas = (nilai: ts.Node) => {
              if (
                relatif.startsWith("features/issues/") &&
                ts.isBinaryExpression(nilai) &&
                nilai.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken &&
                nilai.left.getText(sumber) === "isCompact"
              ) {
                expect(nilai.right.getText(sumber)).toBe(nama === "th" ? '"py-1"' : '"py-0.5"');
                jumlahCompact++;
                return;
              }
              const fragmen = fragmenKelas(nilai);
              if (fragmen !== null) {
                let teks = fragmen;
                if (relatif.startsWith("features/issues/") && /\bw-8 px-1\b/.test(teks)) {
                  teks = teks.replace(/\bpx-1\b/, "");
                  jumlahPegangan++;
                }
                const kosongExplorer =
                  relatif === "features/explorer/DbExplorerPanel.tsx" &&
                  teks === "p-8 text-center text-content-subtle";
                const menimpaSel =
                  /\b(?:p|px|py|pt|pb|pl|pr)-[\d.[-]|\btext-(?:xs\b|sm\b|base\b|2xs\b|3xs\b|\[\d+px\])/.test(
                    teks
                  );
                const menimpaKepala =
                  nama !== "td" && /\bfont-(?:normal|medium|semibold|bold)\b/.test(teks);
                if (!kosong && !kosongExplorer && (menimpaSel || menimpaKepala)) {
                  const baris =
                    sumber.getLineAndCharacterOfPosition(node.getStart(sumber)).line + 1;
                  pelanggaran.push(`${relatif}:${baris} ${teks}`);
                }
              }
              ts.forEachChild(nilai, bacaKelas);
            };
            if (kelas) bacaKelas(kelas);
          }
        }
        ts.forEachChild(node, kunjungi);
      };
      kunjungi(sumber);
    }
    expect(jumlahSel).toBeGreaterThan(150);
    expect(jumlahCompact).toBe(7);
    expect(jumlahPegangan).toBe(2);
    expect(pelanggaran).toEqual([]);
  });

  test("kit kepala Daftar Isu tidak membawa ukuran atau padding lokal", () => {
    const isi = fs.readFileSync(path.join(SRC, "features/issues/styles.ts"), "utf8");
    const kepala = /tableHeaderCell:\s*"([^"]+)"/.exec(isi)?.[1] ?? "";
    expect(kepala).toContain("sticky top-0 bg-surface-sunken");
    expect(kepala).not.toMatch(/\b(?:p|px|py)-[\d.]|\btext-(?:xs|sm|\[\d+px\])|\bfont-/);
    expect(isi).toContain('inlineAddBorderedCell: "p-0 border-r border-border-faint relative"');
  });
});
