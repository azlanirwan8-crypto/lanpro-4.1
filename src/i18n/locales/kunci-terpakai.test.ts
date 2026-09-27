/**
 * Gerbang kunci i18n — item #135.
 *
 * Kegagalan yang test kamus lain TIDAK tangkap: kode memanggil `t("a.b")`
 * untuk kunci yang tidak pernah ditambahkan ke kamus. i18next lalu menampilkan
 * NAMA KUNCI mentah di layar ("planning.backlogTasks"), tanpa satu pun galat di
 * konsol, tanpa tsc merah, tanpa test merah.
 *
 * Ini benar-benar terjadi: skrip pembantu melewati blok kamus yang sudah ada,
 * sehingga kunci baru untuk `kanban` tidak pernah masuk sementara komponennya
 * sudah memakainya. Pemilik proyek yang menemukannya dari layar.
 *
 * Test ini memindai seluruh src/ untuk pemanggilan t() literal dan memastikan
 * setiap kuncinya ada di KEDUA kamus.
 */
import fs from "fs";
import path from "path";

const bacaKamus = (berkas: string): Set<string> => {
  const baris = fs.readFileSync(berkas, "utf8").split("\n");
  const kunci = new Set<string>();
  let area: string | null = null;
  for (const l of baris) {
    const buka = l.match(/^\s{2}(\w+):\s*\{/);
    if (buka) {
      area = buka[1];
      continue;
    }
    if (/^\s{2}\},?\s*$/.test(l)) {
      area = null;
      continue;
    }
    const kv = l.match(/^\s{4}(\w+):/);
    if (kv && area) kunci.add(`${area}.${kv[1]}`);
  }
  return kunci;
};

const kumpulkanTerpakai = (dir: string, keluar = new Map<string, string>()) => {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) {
      if (f.name !== "node_modules") kumpulkanTerpakai(p, keluar);
      continue;
    }
    if (!/\.tsx?$/.test(f.name) || /\.test\./.test(f.name)) continue;
    const isi = fs.readFileSync(p, "utf8");
    for (const m of isi.matchAll(/\bt\(\s*["'`]([\w.]+)["'`]/g)) {
      if (!keluar.has(m[1])) keluar.set(m[1], p);
    }
  }
  return keluar;
};

const akar = path.resolve(__dirname, "../..");
const id = bacaKamus(path.join(akar, "i18n/locales/id.ts"));
const en = bacaKamus(path.join(akar, "i18n/locales/en.ts"));
const terpakai = kumpulkanTerpakai(akar);

describe("#135 gerbang kunci i18n", () => {
  it("menemukan pemanggilan t() di seluruh src", () => {
    // Jaring pengaman untuk test ini sendiri: kalau pemindaiannya rusak dan
    // memulangkan nol kunci, dua test di bawah akan hijau secara palsu.
    expect(terpakai.size).toBeGreaterThan(500);
  });

  it("setiap kunci yang dipakai kode ada di kamus Indonesia", () => {
    const hilang = [...terpakai.entries()]
      .filter(([k]) => !id.has(k))
      .map(([k, berkas]) => `${k} (dipakai di ${path.relative(akar, berkas)})`);
    expect(hilang).toEqual([]);
  });

  it("setiap kunci yang dipakai kode ada di kamus Inggris", () => {
    const hilang = [...terpakai.keys()].filter((k) => !en.has(k));
    expect(hilang).toEqual([]);
  });
});
