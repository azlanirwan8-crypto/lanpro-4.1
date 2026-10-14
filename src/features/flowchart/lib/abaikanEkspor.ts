/**
 * #537 — penyaring chrome untuk ekspor gambar papan.
 *
 * `handleExportJPG` menyerahkan elemen kanvas apa adanya ke `toJpeg`, jadi
 * SEMUA yang dirender di dalam subtree itu ikut terpotret. Sebagian chrome
 * sudah aman karena duduk di luarnya (minimap, dock Undo/Redo/Simulasi/
 * Ekspor/Impor/Simpan, flap Editor Properti), tetapi `EdgeStyleBar` dirender
 * oleh `FlowchartEdges` di dalam kanvas: klik satu garis lalu tekan Ekspor JPG
 * dan berkasnya berisi bilah gaya yang melayang di tengah diagram.
 *
 * Komponen yang harus dibuang menandai dirinya sendiri dengan atribut
 * `data-abai-ekspor`, dan fungsi inilah satu-satunya pembaca penanda itu.
 *
 * MENGAPA INI FUNGSI TERPISAH, bukan arrow inline di `toJpeg(...)`: kegagalan
 * di sini tidak terlihat oleh perkakas apa pun. Filter yang terlalu agresif
 * menolak akar yang dipotret dan menghasilkan JPG KOSONG — `npm test`, build,
 * dan kesepuluh gerbang audit semuanya tetap hijau, dan satu-satunya cara tahu
 * adalah membuka berkasnya. Fungsi bernama bisa diuji terhadap DOM tiruan.
 */

/** Nama atribut yang dipakai komponen untuk menarik diri dari ekspor gambar. */
export const PENANDA_ABAI_EKSPOR = "data-abai-ekspor";

/**
 * Layak dipakai sebagai `filter` milik `html-to-image`.
 *
 * Dua sifat yang harus tetap benar dan keduanya diuji:
 * - akar yang dipotret TIDAK pernah ditolak, selama ia sendiri tidak berpenanda;
 *   menolak akar berarti gambar kosong, bukan gambar bersih.
 * - simpul non-HTML (elemen SVG, teks) selalu lolos. Papan ini menggambar garis
 *   dan kepala panah sebagai SVG; menyaringnya akan menghapus diagramnya.
 */
export const abaikanChromeEkspor = (node: unknown): boolean => {
  if (typeof HTMLElement === "undefined" || !(node instanceof HTMLElement)) return true;
  return !node.hasAttribute(PENANDA_ABAI_EKSPOR);
};
