import fs from "node:fs";
import path from "node:path";

/**
 * #825 — tabel aman: satu wadah gulir, kepala lengket, tanpa nowrap di sel tetap.
 *
 * Tiga konflik yang dikunci di sini:
 *
 *  1. `table-fixed` dengan lebar kolom `%` tidak boleh memasang
 *     `whitespace-nowrap` pada baris kepala — label 12% tidak bisa membungkus;
 *  2. `ResponsiveTable` yang tetap memakai wadah gulirnya sendiri tidak boleh
 *     berada di dalam wadah `overflow-x-auto` lain, karena sticky mengikuti
 *     wadah terdalam dan kepala tidak akan pernah lengket;
 *  3. `MeetingNotes` tidak boleh mengembalikan `text-justify` pada sel tabel.
 *
 * Yang diuji adalah sumber, bukan hasil render.
 */
const SRC = path.join(__dirname, "..", "..", "src");

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
const baca = (rel: string) => fs.readFileSync(path.join(SRC, rel), "utf8");

describe("#825 keamanan tabel", () => {
  test("table-fixed + lebar % tidak memakai nowrap di kepala", () => {
    const sesi = baca("features/users/UserSessionsPanel.tsx");
    expect(sesi).toContain("table-fixed");
    expect(sesi).toMatch(/w-\[\d+%\]/);
    const kepala = /<thead>[\s\S]*?<\/thead>/.exec(sesi)?.[0] ?? "";
    expect(kepala).not.toContain("whitespace-nowrap");
  });

  test("ResponsiveTable tidak bersarang di wadah gulir lain", () => {
    const pelanggaran = semua.flatMap((jalur) => {
      const isi = fs.readFileSync(jalur, "utf8");
      const memakaiScrollSendiri =
        isi.includes("<ResponsiveTable") && !isi.includes("scroll={false}");
      return memakaiScrollSendiri && isi.includes("overflow-x-auto")
        ? [path.relative(SRC, jalur).replace(/\\/g, "/")]
        : [];
    });
    expect(pelanggaran).toEqual([]);
  });

  test("kepala tabel lengket dan punya latar buram", () => {
    const responsif = fs.readFileSync(path.join(SRC, "components", "ResponsiveTable.tsx"), "utf8");
    expect(responsif).toContain("[&>thead>tr>th]:sticky");
    expect(responsif).toContain("[&>thead>tr>th]:top-0");
    expect(responsif).toContain("[&>thead>tr>th]:bg-surface-sunken");

    const sesi = baca("features/users/UserSessionsPanel.tsx");
    expect(sesi).toContain("[&>th]:sticky");
    expect(sesi).toContain("[&>th]:bg-surface-sunken");
  });

  test("MeetingNotes mempertahankan justify judul dan keterangan (#805)", () => {
    // #825 mengusulkan sel tabel jadi rata kiri. Itu dibatalkan karena #805
    // adalah keputusan pemilik yang lebih dulu: SATU aturan justify untuk
    // semua judul, dan keterangan sudah justify sejak #773/#765d. Menukarnya
    // ke kiri akan menjalankan #805 secara terbalik.
    const isi = baca("features/meeting-notes/MeetingNotes.tsx");
    const badan = /<tbody[\s\S]*?<\/tbody>/.exec(isi)?.[0] ?? "";
    expect(badan).toContain("whitespace-normal break-words text-justify");
    expect(badan).toContain("whitespace-pre-wrap break-words text-justify");
  });

  test("padding sel dipatok px, bukan rem", () => {
    const css = fs.readFileSync(path.join(SRC, "index.css"), "utf8");
    const bersih = css.replace(/\/\*[\s\S]*?\*\//g, "");
    const blok = (sel: string) =>
      new RegExp(sel + "\\s*\\{([\\s\\S]*?)\\}").exec(bersih)?.[1] ?? "";
    expect(blok("th")).toMatch(/padding:\s*8px 12px/);
    expect(blok("td")).toMatch(/padding:\s*8px 12px/);
  });
});
