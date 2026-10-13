/**
 * TINGKAT (HIERARCHY LEVEL) SEBUAH JENIS ISU — satu kosakata, satu cara baca,
 * satu cara tulis.
 *
 * KENAPA DI `src/lib`. Ini kosakata bersama dua fitur: layar Master Data
 * (yang MEMILIH level) dan Daftar Isu (yang MEMATUHINYA lewat
 * `features/issues/hierarkiTipe.ts`). Menaruhnya di salah satu fitur berarti
 * fitur yang lain mengimpor melintasi batas folder — §4 melarang itu, dan
 * `warnaLabel.ts` adalah preseden yang sama: satu standar, banyak pemakai.
 *
 * KENAPA ITEM INI ADA (#724). Pemilik proyek membuat jenis "Sub Bug", memilih
 * *Hierarchy level: Subtask* di layar Master Data, lalu bertanya kenapa jenis
 * itu tidak pernah muncul di baris tambah anak ("apakah kendala sistem atau
 * gmana"). Jawabannya: pilihan beliau ditulis ke kolom `description` sebagai
 * teks `Hierarchy: Subtask` dan TIDAK ADA KODE yang membacanya kembali —
 * penyaringnya memakai tabel nama jenis yang di-hardcode. Kontrol itu hiasan.
 *
 * BATAS YANG DIPAHAMI SADAR. `description` adalah kolom catatan BEBAS: baris
 * "Bug" proyek ini berisi "Cacat pada fungsi yang sudah berjalan.". Karena itu
 * `tingkatDariDeskripsi` hanya mempercayai tiga NILAI yang dituliskan aplikasi
 * ini sendiri, dan `tuliskanTingkat` menempel di belakang teks yang ada alih-alih
 * menimpanya. Menebak level dari kalimat manusia adalah persis kesalahan yang
 * baru dicabut ini — hanya dengan arah yang berlawanan.
 */

/** Tiga nilai yang sama dengan dropdown layar Master Data. */
export type Tingkat = "Epic" | "Standard" | "Subtask";

/** Makin besar angkanya, makin dalam kedudukannya di pohon. */
export const ANGKA_TINGKAT: Record<Tingkat, number> = { Epic: 0, Standard: 1, Subtask: 2 };

/**
 * Kunci kanonik sebuah label jenis: huruf kecil, tanpa spasi/garis hubung/
 * garis bawah. "Sub-task", "Sub Task" dan "subtask" jadi satu kunci (#590);
 * yang DIPULANGKAN ke layar tetap label asli Master Data.
 */
export const kunciTipe = (label?: string | null): string =>
  (label || "").toLowerCase().replace(/[\s_-]+/g, "");

/**
 * `Hierarchy: Subtask` seperti yang DITULIS APLIKASI INI SENDIRI
 * (`MasterDataPanel.tsx:441-442`). `c?` ada karena pemilik proyek pernah
 * mengetik ulang barisnya dan yang terbaca di layar beliau adalah
 * "Hierarhy: Subtask" — yang terbaca mesin dan yang ditulis manusia harus
 * tetap satu arti.
 */
export const tingkatDariDeskripsi = (deskripsi?: string | null): Tingkat | null => {
  const cocok = (deskripsi || "").match(/hierar(?:c)?hy\s*:\s*([a-z]+)/i);
  if (!cocok) return null;
  const nilai = cocok[1].toLowerCase();
  if (nilai === "epic") return "Epic";
  if (nilai === "subtask") return "Subtask";
  if (nilai === "standard") return "Standard";
  return null;
};

/**
 * Cuplikan untuk baris yang tidak menyatakan levelnya — termasuk SELURUH baris
 * lama proyek ini, yang dibuat sebelum dropdown itu ada. Ini bukan terkaan
 * bebas: isinya persis lima nama jenis yang aturan lama kenali, dan jenis
 * buatan pengguna sengaja TIDAK diberi nilai agar tidak tertukar dengan
 * "pengguna memilih Standard".
 */
export const tingkatDariKunci = (kunci: string): Tingkat | null => {
  if (kunci === "epic") return "Epic";
  if (kunci === "subtask") return "Subtask";
  if (kunci === "story" || kunci === "task" || kunci === "bug") return "Standard";
  return null;
};

/**
 * Tingkat sebuah jenis: apa yang pemilik proyek PILIH di Master Data, lalu
 * nama jenisnya sebagai cuplikan. `null` berarti dua-duanya tidak bicara —
 * dan itu sengaja dipisah dari "Standard", karena induk yang levelnya tidak
 * terbaca harus tetap longgar (lihat `tipeBoleDitawarkan`).
 */
export const tingkatTipe = (label?: string | null, deskripsi?: string | null): Tingkat | null =>
  tingkatDariDeskripsi(deskripsi) ?? tingkatDariKunci(kunciTipe(label));

/** Level per label, dibangun dari baris Master Data kelompok `issue_type`. */
export const petaTingkat = (
  baris: { label: string; description?: string }[]
): Map<string, Tingkat> => {
  const peta = new Map<string, Tingkat>();
  for (const b of baris || []) {
    const tingkat = tingkatTipe(b.label, b.description);
    if (tingkat) peta.set(kunciTipe(b.label), tingkat);
  }
  return peta;
};

/**
 * Sisi tulis dari `tingkatDariDeskripsi`: menaruh level pada catatan sebuah
 * jenis TANPA membuang teks yang sudah ada. Marker lama diganti di tempatnya;
 * bila belum ada, marker baru ditempelkan di belakang.
 */
export const tuliskanTingkat = (deskripsi: string | null | undefined, tingkat: Tingkat): string => {
  const teks = (deskripsi || "").trim();
  const POLA = /hierar(?:c)?hy\s*:\s*[a-z]+/i;
  const marker = `Hierarchy: ${tingkat}`;
  if (POLA.test(teks)) return teks.replace(POLA, marker);
  return teks ? `${teks} ${marker}` : marker;
};
