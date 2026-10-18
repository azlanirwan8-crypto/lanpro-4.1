/**
 * #785 — warna label tidak boleh dirakit dengan menggabung string heksa.
 *
 * Pemilik proyek, 18 Okt: "ini masih kasar dan berat serta seperti memaksakan
 * keadaan". Di layar pohon perencanaan satu heksa master data ditulis sebagai
 * tiga heksa baru di dalam JavaScript — `backgroundColor: ${hexEpic}1A`,
 * `borderColor: ${hexEpic}4D`, `backgroundColor: ${hexPrioritas}0F`. Tujuh
 * kemunculan. Akibatnya angka alpha hidup di mana-mana dan tidak ada satu pun
 * tempat yang bisa menyetelnya, sementara seluruh chip aplikasi sudah mengambil
 * rona dari SATU sumber: properti kustom `--lbr` yang diisi `gayaLabel()`.
 *
 * Yang dikunci di sini:
 *  1. pola `${…hex…}NN` dilarang muncul lagi di seluruh `src`;
 *  2. `.label-wash` / `.label-edge` memang menurunkan warnanya dari `--lbr`,
 *     bukan dari heksa tetap;
 *  3. tiga layar perencanaan memakai kelas itu, bukan string heksa;
 *  4. kartu epik papan dan roda roket sprint tidak lagi memakai palet mentah
 *     Tailwind (`purple-*`, `indigo-*`).
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const AKAR = join(__dirname, "..", "..");
const BERKAS: string[] = [];
const jalan = (d: string) => {
  for (const n of readdirSync(d)) {
    if (["node_modules", "dist", ".git"].includes(n)) continue;
    const p = join(d, n);
    if (statSync(p).isDirectory()) jalan(p);
    else if (/\.tsx?$/.test(n) && !/\.test\./.test(n)) BERKAS.push(p);
  }
};
jalan(AKAR);

/** `${hexEpic}1A`, `${hexPrioritas}0F`, `${hex}4d` — heksa + alpha dirakit manual. */
const HEKSA_STRING = /\$\{[^}]*[hH]ex[^}]*\}[0-9A-Fa-f]{2,3}\b/;

const baca = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");

describe("heksa-string digantikan satu sumber rona (#785)", () => {
  it("tidak ada satu pun `${…hex…}NN` yang tersisa di src", () => {
    const pelanggar: string[] = [];
    for (const f of BERKAS) {
      baca(f)
        .split("\n")
        .forEach((l, i) => {
          if (HEKSA_STRING.test(l)) {
            pelanggar.push(`${f}:${i + 1} ${l.trim().slice(0, 80)}`);
          }
        });
    }
    expect(pelanggar).toEqual([]);
  });

  it("penjaga ini benar-benar menangkap pola yang dilarang (regresi test-diri)", () => {
    expect(HEKSA_STRING.test("backgroundColor: `${hexEpic}1A`")).toBe(true);
    expect(HEKSA_STRING.test("borderColor: `${hexPrioritas}4d`")).toBe(true);
    // bukan cacat: heksa dipakai langsung, alpha tidak dirakit di JavaScript
    expect(HEKSA_STRING.test("style={{ color: hexEpic }}")).toBe(false);
    expect(HEKSA_STRING.test("gayaLabel(hexEpic)")).toBe(false);
  });

  it(".label-wash dan .label-edge menurunkan warna dari --lbr, bukan heksa tetap", () => {
    const css = baca(join(AKAR, "index.css"));
    const cssClean = css.replace(/\/\*[\s\S]*?\*\//g, "");
    for (const nama of ["label-wash", "label-edge"]) {
      const m = cssClean.match(new RegExp(`\\.${nama}\\s*\\{([^}]*)\\}`, "g"));
      expect(m).toBeTruthy();
      const isi = m!.join(" ");
      expect(isi).toContain("--lbr");
      expect(isi).not.toMatch(/#[0-9A-Fa-f]{3,8}\b/);
    }
    expect(cssClean).toMatch(/\.label-wash\s*\{[^}]*background-color/);
    expect(cssClean).toMatch(/\.label-edge\s*\{[^}]*border-left-color/);
  });

  it("pohon perencanaan memakai gayaLabel + kelas, dan kartu isu tidak dicat heksa", () => {
    const pohon = baca(join(AKAR, "features", "planning", "index.tsx"));
    expect(pohon).toContain("gayaLabel(");
    expect(pohon).toContain("label-edge label-wash");
    // kartu tersekat tetap punya gaya sendiri — kelas rona hanya untuk yang tidak tersekat
    expect(pohon).toMatch(/!task\.isBlocked && "label-edge label-wash"/);

    for (const relatif of [
      join("features", "planning", "SprintSection", "index.tsx"),
      join("features", "planning", "BacklogSection", "index.tsx"),
    ]) {
      const isi = baca(join(AKAR, relatif));
      expect(isi).toContain("gayaLabel(");
      expect(isi).toContain("label-chip");
    }
  });

  it("baris epik sprint tidak lagi dicat latarnya — garis kiri penanda hierarkinya", () => {
    const isi = baca(join(AKAR, "features", "planning", "SprintSection", "index.tsx"));
    const baris = isi.split("\n").find((l) => l.includes("label-edge"));
    expect(baris).toBeTruthy();
    expect(baris).toContain("border-l-4");
    expect(baris).toContain("border-border-subtle");
    expect(baris).not.toContain("brightness");
  });

  it("kartu epik papan dan roda roket sprint sudah pindah dari palet mentah ke token", () => {
    const papan = baca(join(AKAR, "features", "kanban", "index.tsx"));
    expect(papan).not.toMatch(/(purple|indigo)-\d{3}/);
    expect(papan).toContain("border-l-primary");
    const sprint = baca(join(AKAR, "features", "planning", "SprintSection", "index.tsx"));
    expect(sprint).not.toMatch(/from-indigo-\d{3}|via-indigo-\d{3}|to-purple-\d{3}/);
    expect(sprint).toContain("rounded-full bg-primary text-content-inverse");
  });
});
