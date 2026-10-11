/**
 * #693 — keadaan layar Dashboard, fungsi murni tanpa DOM.
 *
 * Polanya dipinjam dari `src/features/issues/lib/keadaanKosong.ts` (#689 butir
 * (d)): tiap sebab layar harus punya NAMA, bukan satu pesan untuk semuanya.
 * Sebelum ini `DashboardView` membaca `props.tasks` apa adanya selama enam
 * keadaannya:
 *
 *  - selama fetch global masih berjalan, angka respons lama tampil seolah
 *    semuanya sudah tiba;
 *  - ketika fetch gagal — `src/AppContainer.tsx:1205` dan `:1224` sudah
 *    menyetel penandanya — layar berkata "0 tugas" tanpa satu pun kabar, dan
 *    itu terbaca sebagai "proyek ini kosong", bukan "datanya tidak turun".
 *
 * Penanda yang dibaca DIAMBIL dari yang sudah ditulis `AppContainer` untuk
 * seluruh modul (`projectStore.ts:39`), bukan dari state baru: jalan masuknya
 * `fetchTasks` yang sama yang mengisi `props.tasks` Dashboard, jadi tidak ada
 * `AppContainer` (5.293 baris, utang #7) yang perlu disentuh di sini.
 */

/** Sama seperti `KeadaanMuatDaftarIsu` di store, ditulis ulang supaya berkas
 *  murni ini tidak ikut menarik graph impor store ke dalam test node. */
export type KeadaanMuat = "diam" | "memuat" | "galat";

export type KeadaanDashboard =
  | "memuat-pertama"
  | "memperbarui"
  | "galat-kosong"
  | "galat-basi"
  | "ada-data";

export function keadaanDashboard(args: {
  muat: KeadaanMuat;
  totalTugas: number;
}): KeadaanDashboard {
  const belumAdaApaPun = args.totalTugas === 0;
  if (args.muat === "galat") return belumAdaApaPun ? "galat-kosong" : "galat-basi";
  if (belumAdaApaPun) return args.muat === "memuat" ? "memuat-pertama" : "ada-data";
  return args.muat === "memuat" ? "memperbarui" : "ada-data";
}
