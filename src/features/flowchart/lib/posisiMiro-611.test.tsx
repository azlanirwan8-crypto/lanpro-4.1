/**
 * #611(a) — posisi cadangan pembaca Miro harus berjenjang, bukan satu titik.
 *
 * Cacat yang diuji di sini terukur 04 Okt 2026: Miro CSV dua baris tanpa kolom
 * x/y mendaratkan KEDUA node di titik yang sama, sehingga papan menampilkan
 * satu kotak padahal isinya dua. Akarnya
 * `parseFloat(row.x || row.left || "150") || idx * 60 + 100` — teks cadangan
 * "150" membuat `parseFloat` selalu berhasil, jadi cabang berjenjang di
 * belakang `||` tidak pernah dijalankan.
 *
 * Semua assertion di sini memakai SELISIH antar node, bukan koordinat mutlak:
 * `parseMiroContent` menutup hasilnya dengan `autoCenterAndNormalizeDiagram`,
 * yang menggeser seluruh papan supaya titik terkecilnya duduk di 180/140.
 * Geseran itu murni translasi, jadi selisihnya utuh — dan justru selisih itulah
 * yang menentukan apakah dua bentuk terbaca sebagai dua bentuk atau satu
 * tumpukan. Mengassert koordinat mutlak akan menguji normalisasinya, bukan
 * cacat ini.
 *
 * Berekstensi .tsx supaya masuk proyek Jest "jsdom": parser memakai DOMParser.
 *
 * Yang SENGAJA tidak diuji di sini: pencocokan kunci sambungan Miro
 * (`connection`, `startItem.id`, `endItem.id`) dan kunci ukuran
 * (`position.width/height`). Itu #611(b) dan butuh SATU berkas ekspor Miro asli
 * dari pemilik proyek — menebak nama kuncinya sudah terbukti salah satu kali.
 */
import { parseMiroContent } from "./importers";

/** Selisih tiap node terhadap node pertama, sebagai pasangan angka. */
const selisih = (nodes: { x: number; y: number }[]) =>
  nodes.map((n) => [n.x - nodes[0].x, n.y - nodes[0].y]);

const titikUnik = (nodes: { x: number; y: number }[]) =>
  new Set(nodes.map((n) => `${n.x},${n.y}`)).size;

describe("#611(a) Miro CSV tanpa kolom posisi", () => {
  const csv = ["id,text", "a,Mulai", "b,Selesai", "c,Tinjau"].join("\n");
  const { nodes } = parseMiroContent(csv, true);

  it("tiga baris menjadi tiga titik yang berbeda, bukan satu tumpukan", () => {
    expect(nodes).toHaveLength(3);
    expect(titikUnik(nodes)).toBe(3);
  });

  it("jenjangnya mengikuti indeks baris: 60 px kanan dan 40 px bawah per baris", () => {
    expect(selisih(nodes)).toEqual([
      [0, 0],
      [60, 40],
      [120, 80],
    ]);
  });

  it("dua baris pun sudah cukup untuk tidak bertumpuk — kasus yang terukur 04 Okt", () => {
    const dua = parseMiroContent(["id,text", "a,Mulai", "b,Selesai"].join("\n"), true);

    expect(dua.nodes).toHaveLength(2);
    expect(dua.nodes[0].x).not.toBe(dua.nodes[1].x);
    expect(dua.nodes[0].y).not.toBe(dua.nodes[1].y);
  });
});

describe("#611(a) Miro CSV yang punya kolom posisi", () => {
  it("memakai koordinat dari berkas, bukan jenjangnya", () => {
    const csv = ["id,text,x,y", "a,Mulai,40,50", "b,Selesai,600,70"].join("\n");
    const { nodes } = parseMiroContent(csv, true);

    // Jarak asli 560/20; jenjang cadangan akan menghasilkan 60/40.
    expect(selisih(nodes)).toEqual([
      [0, 0],
      [560, 20],
    ]);
  });

  it("koordinat nol dihormati dan tidak dibaca sebagai tidak ada", () => {
    const csv = ["id,text,x,y", "a,Di pojok,0,0", "b,Tetangga,100,100"].join("\n");
    const { nodes } = parseMiroContent(csv, true);

    // Bila 0 dianggap kosong, node pertama jatuh ke jenjang 100/120 dan
    // selisihnya menjadi 40/20, bukan 100/100.
    expect(selisih(nodes)).toEqual([
      [0, 0],
      [100, 100],
    ]);
  });

  it("kolom hanya-x tetap berjenjang pada sumbu y", () => {
    const csv = ["id,text,x", "a,Satu,500", "b,Dua,500"].join("\n");
    const { nodes } = parseMiroContent(csv, true);

    expect(selisih(nodes)).toEqual([
      [0, 0],
      [0, 40],
    ]);
  });
});

describe("#611(a) Miro JSON tanpa kunci position", () => {
  const json = JSON.stringify([
    { id: "s1", type: "shape", text: "Ambil Data" },
    { id: "s2", type: "shape", text: "Hitung" },
    { id: "s3", type: "shape", text: "Simpan" },
  ]);
  const { nodes } = parseMiroContent(json, false);

  it("tiga item tampil sebagai tiga titik, bukan satu kotak bertumpuk", () => {
    expect(nodes).toHaveLength(3);
    expect(titikUnik(nodes)).toBe(3);
    expect(selisih(nodes)).toEqual([
      [0, 0],
      [60, 40],
      [120, 80],
    ]);
  });

  it("position yang ada tetap menang atas jenjangnya", () => {
    const denganPosisi = JSON.stringify([
      { id: "s1", type: "shape", text: "Ambil Data", position: { x: 30, y: 40 } },
      { id: "s2", type: "shape", text: "Simpan", position: { x: 430, y: 40 } },
    ]);
    const { nodes: n2 } = parseMiroContent(denganPosisi, false);

    expect(selisih(n2)).toEqual([
      [0, 0],
      [400, 0],
    ]);
  });

  it("x/y telanjang di item juga dibaca, bukan hanya position.x", () => {
    const telanjang = JSON.stringify([
      { id: "s1", type: "shape", text: "Satu", x: 12, y: 34 },
      { id: "s2", type: "shape", text: "Dua", x: 112, y: 134 },
    ]);

    expect(selisih(parseMiroContent(telanjang, false).nodes)).toEqual([
      [0, 0],
      [100, 100],
    ]);
  });

  it("position yang hanya punya x tetap memberi jenjang pada sumbu y", () => {
    const setengah = JSON.stringify([
      { id: "s1", type: "shape", text: "Satu", position: { x: 900 } },
      { id: "s2", type: "shape", text: "Dua", position: { x: 900 } },
    ]);

    expect(selisih(parseMiroContent(setengah, false).nodes)).toEqual([
      [0, 0],
      [0, 40],
    ]);
  });
});
