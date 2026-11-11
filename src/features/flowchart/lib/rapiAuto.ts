/**
 * #840 — penataan otomatis setara "Tidy up" draw.io.
 *
 * SEBAB MODUL INI ADA. `handleAutoAlignNodes` lama menata papan dengan BFS dari
 * simpul ber-jangkar-masuk-nol, lalu menaruh setiap simpul di kolom
 * `level × 260` dan baris `indeksDalamKolom × 150`. Tiga hal salah dan semuanya
 * terukur dari kode, bukan dari selera:
 *
 *  1. `if (visited.has(id)) continue` di muka antrian mengunci level sebuah
 *     simpul pada jalur PERTAMA yang menemukannya, bukan jalur TERPANJANG.
 *     Simpul yang dicapai lewat dua jalan (A→B→D dan A→D) duduk di kolom jalan
 *     pendek, dan jalan panjangnya masuk ke kolom yang sama.
 *  2. Urutan dalam kolom = urutan array `nodes`. Tidak ada satu pun baris yang
 *     mencoba mengurangi persilangan, jadi papan yang kolomnya sudah benar tetap
 *     terbaca seperti sarang benang.
 *  3. `gapX` 260 dan `gapY` 150 buta ukuran: diukur dari TITIK KIRI-ATAS, bentuk
 *     200 lebar hanya menyisakan 60 px dan bentuk 300 lebar saling menindih.
 *     Simpul yang tidak terhubung ke apa pun ikut dilempar ke level 0,
 *     bertumpuk di kolom simpul awal.
 *
 * Modul ini murni: tanpa React, tanpa DOM, tanpa toast. Yang dijanjikan hanya
 * hal yang bisa dihitung — level jalur-terpanjang, urutan minim-silang yang
 * MENYIMPAN susunan tangan pengguna bila jumlah silangnya tidak turun (#850),
 * jarak sadar ukuran, dan nol tumpang-tindih.
 */
import { ukuranBentukEfektif } from "../constants";

export interface SimpulLetak {
  id: string;
  width?: number;
  height?: number;
  /**
   * #850 — tinggi bentuk di papan SAAT INI, dibaca hanya untuk urutan di dalam
   * kolom. Penghuni papan sudah menaruh bentuknya di atas-bawah dengan tangannya
   * sendiri; menata ulang tanpa membacanya membuat "Rapikan Otomatis" terasa
   * seperti merusak pekerjaan. Kosong pada papan yang diimpor tanpa koordinat,
   * dan kalau kosong urutannya kembali ke id seperti #840.
   */
  y?: number;
}

export interface GarisLetak {
  fromNodeId: string;
  toNodeId: string;
}

export interface HasilLetak {
  x: number;
  y: number;
}

/**
 * Jarak antar kolom dan antar baris, dalam SATUAN PAPAN, diukur dari TEPI
 * bentuk — bukan dari titik kiri atas seperti angka lama (260 dan 150).
 */
export const JARAK_KOLOM = 120;
export const JARAK_BARIS = 64;

/** Jarak antara dua komponen yang tidak saling terhubung (disusun ke bawah). */
export const JARAK_KOMPONEN = 160;
export const MARGIN = 120;

type Peta = Map<string, string[]>;

const tambah = (peta: Peta, kunci: string, nilai: string) => {
  const daftar = peta.get(kunci) || [];
  if (!daftar.includes(nilai)) daftar.push(nilai);
  peta.set(kunci, daftar);
};

/**
 * Level = panjang jalur TERPANJANG dari simpul awal.
 *
 * Siklus lebih dulu dipotong dengan menghapus TEPI BALIK hasil DFS (sama seperti
 * draw.io membuang back edge sebelum layering); tanpanya sebuah loop kecil
 * membuat level naik tanpa batas. Setelah grafnya tak-ber-putaran, level
 * dihitung sekali jalan lewat penyortiran topologis (Kahn).
 */
function hitungLevel(gugus: string[], keluarAsli: Peta): Map<string, number> {
  const warna = new Map<string, 0 | 1 | 2>();
  const keluarDAG: Peta = new Map();

  const masuk: Peta = new Map();
  for (const id of gugus) for (const t of keluarAsli.get(id) || []) tambah(masuk, t, id);

  const kunjungi = (asal: string) => {
    warna.set(asal, 1);
    for (const tujuan of keluarAsli.get(asal) || []) {
      const w = warna.get(tujuan) || 0;
      if (w === 1) continue; // tepi balik: dibuang, bukan diikuti
      tambah(keluarDAG, asal, tujuan);
      if (w === 0) kunjungi(tujuan);
    }
    warna.set(asal, 2);
  };

  // Benih DFS: simpul ber-masuk-nol dulu supaya pohonnya sesuai arah baca,
  // sisanya menyusul. `gugus` sudah tersortir id di pemanggil, jadi urutan
  // benih — dan seluruh hasilnya — tidak bergantung urutan array `nodes`.
  const tanpaMasuk: string[] = [];
  const berMasuk: string[] = [];
  for (const id of gugus) {
    if ((masuk.get(id) || []).length === 0) tanpaMasuk.push(id);
    else berMasuk.push(id);
  }
  for (const id of [...tanpaMasuk, ...berMasuk]) if (!warna.get(id)) kunjungi(id);

  const derajatMasuk: Map<string, number> = new Map();
  for (const id of gugus) derajatMasuk.set(id, 0);
  for (const id of gugus)
    for (const t of keluarDAG.get(id) || []) derajatMasuk.set(t, (derajatMasuk.get(t) || 0) + 1);

  const level = new Map<string, number>();
  gugus.forEach((id) => level.set(id, 0));
  const antre = gugus.filter((id) => (derajatMasuk.get(id) || 0) === 0);
  while (antre.length) {
    const id = antre.shift()!;
    for (const t of keluarDAG.get(id) || []) {
      level.set(t, Math.max(level.get(t) || 0, (level.get(id) || 0) + 1));
      derajatMasuk.set(t, (derajatMasuk.get(t) || 0) - 1);
      if (derajatMasuk.get(t) === 0) antre.push(t);
    }
  }
  return level;
}

/**
 * Urutan dalam kolom: median-heuristic dua arah (Sugiyama tanpa simpul palsu).
 * Yang dituju mengurangi persilangan, bukan meniadakannya — nol silang tidak
 * selalu mungkin pada graf yang punya pertemuan.
 */
function urutkanKolom(kolom: string[][], keluar: Peta, masuk: Peta): string[][] {
  const hasil = kolom.map((k) => [...k]);
  const posisi = (daftar: string[]) => {
    const m = new Map<string, number>();
    daftar.forEach((id, i) => m.set(id, i));
    return m;
  };

  for (let lintasan = 0; lintasan < 4; lintasan++) {
    const turun = lintasan % 2 === 0;
    const rentang = turun
      ? hasil.map((_, i) => i).slice(1)
      : hasil
          .map((_, i) => i)
          .slice(0, -1)
          .reverse();

    for (const i of rentang) {
      const tetangga = turun ? masuk : keluar;
      const acuan = posisi(hasil[turun ? i - 1 : i + 1]);
      const median = new Map<string, number>();
      for (const id of hasil[i]) {
        const daftar = (tetangga.get(id) || [])
          .map((t) => acuan.get(t))
          .filter((p): p is number => p !== undefined)
          .sort((a, b) => a - b);
        median.set(
          id,
          daftar.length === 0
            ? acuan.size / 2
            : daftar.length % 2 === 1
              ? daftar[(daftar.length - 1) / 2]
              : (daftar[daftar.length / 2 - 1] + daftar[daftar.length / 2]) / 2
        );
      }
      hasil[i].sort((a, b) => {
        const selisih = (median.get(a) ?? 0) - (median.get(b) ?? 0);
        // Id sebagai pemecah dasi: hasil tidak boleh bergantung urutan array
        // `nodes`, kalau tidak satu papan ditata dua kali menghasilkan dua
        // layar yang berbeda.
        return selisih !== 0 ? selisih : a.localeCompare(b);
      });
    }
  }
  return hasil;
}

/**
 * Perkiraan jumlah persilangan antar kolom bertetangga (untuk memilih hasil).
 *
 * #850 — sepasang tepi yang BERSUMBER sama tidak dihitung lagi. Fungsi ini dulu menghitung
 * `ik_a < ik_b` lawan `jk_a < jk_b` tanpa memeriksa apakah kedua tepi itu
 * keluar dari simpul yang SAMA: kipas satu keputusan ke dua cabangnya sendiri
 * maka tercatat sebagai "satu silang" kalau cabangnya disusun sesuai urutan
 * array `edges`, dan nol kalau disusun kebalikannya. Angka itu bukan ukuran
 * apa pun, dan persis itulah yang membuat heuristik median boleh membabat
 * susunan tangan pengguna pada papan yang jumlah silangnya sebenarnya imbang.
 */
function hitungSilang(kolom: string[][], keluar: Peta): number {
  let silang = 0;
  for (let i = 0; i < kolom.length - 1; i++) {
    const indeks = new Map(kolom[i + 1].map((id, idx) => [id, idx]));
    const tepi: [number, number][] = [];
    kolom[i].forEach((id, ik) => {
      for (const t of keluar.get(id) || []) {
        const jk = indeks.get(t);
        if (jk !== undefined) tepi.push([ik, jk]);
      }
    });
    for (let a = 0; a < tepi.length; a++)
      for (let b = a + 1; b < tepi.length; b++) {
        if (tepi[a][1] === tepi[b][1]) continue;
        if (tepi[a][0] === tepi[b][0]) continue; // kipas satu simpul: tidak bersilang
        if (tepi[a][0] < tepi[b][0] !== tepi[a][1] < tepi[b][1]) silang++;
      }
  }
  return silang;
}

/**
 * Tata seluruh papan dan kembalikan posisi kiri-atas tiap simpul.
 *
 * Komponen terkoneksi lemah ditata satu per satu dan disusun ke bawah: alur
 * yang tidak berhubungan tidak boleh menyelinap ke kolom simpul awal (penyakit
 * `nodeLevels.set(id, 0)` yang lama).
 */
export function tataLetakBertingkat(
  nodes: SimpulLetak[],
  edges: GarisLetak[]
): Map<string, HasilLetak> {
  const hasil = new Map<string, HasilLetak>();
  if (nodes.length === 0) return hasil;

  const ids = nodes.map((n) => n.id);
  const setIds = new Set(ids);
  const keluar: Peta = new Map();
  const masuk: Peta = new Map();
  for (const e of edges) {
    if (e.fromNodeId === e.toNodeId) continue;
    if (!setIds.has(e.fromNodeId) || !setIds.has(e.toNodeId)) continue;
    tambah(keluar, e.fromNodeId, e.toNodeId);
    tambah(masuk, e.toNodeId, e.fromNodeId);
  }

  const belum = new Set(ids);
  const komponen: string[][] = [];
  for (const mulai of ids) {
    if (!belum.has(mulai)) continue;
    const gugus: string[] = [];
    const antre = [mulai];
    belum.delete(mulai);
    while (antre.length) {
      const id = antre.shift()!;
      gugus.push(id);
      for (const t of [...(keluar.get(id) || []), ...(masuk.get(id) || [])])
        if (belum.delete(t)) antre.push(t);
    }
    gugus.sort((a, b) => a.localeCompare(b));
    komponen.push(gugus);
  }
  komponen.sort((a, b) => b.length - a.length || a[0].localeCompare(b[0]));

  const ukuran = new Map(nodes.map((n) => [n.id, ukuranBentukEfektif(n)]));

  /**
   * #850 — benih urutan dalam kolom: posisi vertikal PENGGUNA dulu, id hanya
   * pemecah dasi. Bentuk yang tidak punya y (impordan tanpa koordinat) didaftar
   * belakang atas nama id, jadi papan lama yang testnya #840 kunci tetap
   * menghasilkan susunan yang sama persis.
   */
  const letak = new Map(nodes.map((n) => [n.id, n.y]));
  const benihkan = (a: string, b: string): number => {
    const ay = letak.get(a);
    const by = letak.get(b);
    const aYa = Number.isFinite(ay);
    const bYa = Number.isFinite(by);
    if (aYa !== bYa) return aYa ? -1 : 1;
    if (aYa && bYa && ay !== by) return ay! - by!;
    return a.localeCompare(b);
  };

  let barisY = MARGIN;

  for (const gugus of komponen) {
    const level = hitungLevel(gugus, keluar);
    const maxLevel = Math.max(...gugus.map((id) => level.get(id) || 0));
    const kolomRaw: string[][] = Array.from({ length: maxLevel + 1 }, () => []);
    for (const id of gugus) kolomRaw[level.get(id) || 0].push(id);
    kolomRaw.forEach((k) => k.sort(benihkan));

    const tersortir = urutkanKolom(kolomRaw, keluar, masuk);
    // #840 — heuristik median boleh kalah bila persilangannya justru lebih
    // banyak; papan tidak pernah boleh jadi lebih ruwet setelah dirapikan.
    // #850 — "boleh kalah" kini berarti "hanya menang kalau jumlah silangnya
    // benar-benar turun": pada susunan yang imbang, urutan tangan pemilik papan
    // yang dipakai, bukan urutan median yang kebetulan sama bagusnya.
    const pakai =
      hitungSilang(tersortir, keluar) < hitungSilang(kolomRaw, keluar) ? tersortir : kolomRaw;

    const tinggiKolom = pakai.map(
      (k) =>
        k.reduce((t, id) => t + ukuran.get(id)!.height, 0) + Math.max(0, k.length - 1) * JARAK_BARIS
    );
    const tertinggi = Math.max(...tinggiKolom);

    let x = MARGIN;
    pakai.forEach((daftar, i) => {
      // Kolom yang lebih pendek ditengahkan terhadap kolom tertinggi, supaya
      // alur yang bercabang lalu menyatu tidak melompat vertikal.
      let y = barisY + (tertinggi - tinggiKolom[i]) / 2;
      let lebarKolom = 0;
      for (const id of daftar) {
        // Dibulatkan: selisih tinggi kolom bisa ganjil, dan posisi pecahan
        // membuat label bentuk bergetar di layar — bukan lebih rapi.
        hasil.set(id, { x: Math.round(x), y: Math.round(y) });
        const u = ukuran.get(id)!;
        y += u.height + JARAK_BARIS;
        lebarKolom = Math.max(lebarKolom, u.width);
      }
      x += lebarKolom + JARAK_KOLOM;
    });

    barisY += tertinggi + JARAK_KOMPONEN;
  }

  return hasil;
}
