/**
 * #689 butir (d) — layar Isu harus bisa menyebut kenapa daftar terlihat kosong.
 *
 * Yang ada sebelumnya cuma satu pembeda: `lingkup === "mine" && tasks.length === 0`
 * (`IssueListView.tsx:473`). Padahal ada empat sebab berbeda yang semuanya
 * menghasilkan layar kosong, dan mencampurinya membuat pengguna menyalahkan
 * filternya sendiri — atau menyangka pekerjaannya hilang:
 *
 *   1. proyek ini memang belum punya isu (atau pencariannya tidak cocok);
 *   2. mode "My Tasks": yang ada memang bukan milik pengguna ini;
 *   3. baris dikirim server, tapi saringan klien membuangnya semua;
 *   4. halaman yang dibuka lewat dari akhir daftar.
 *
 * Tiga angka dibutuhkan karena tiga lapis penyaring bekerja berurutan:
 * `total` (server), `sebelumSaring` (baris halaman ini), `hasilSaring` (setelah
 * empat belas filter klien), lalu `tampil` (setelah pengirian halaman). Menghapus
 * salah satunya membuat dua sebab pertama tampak identik dengan sebab ketiga.
 *
 * Fungsi ini murni dan diekspos terpisah karena keputusan inilah yang sering
 * salah; render `IssueListView` menuntut belasan props dan tidak menambah bukti.
 */

export type KeadaanDaftar = "kosong" | "halamanLewat" | "tidakCocok" | "bukanMilikSaya" | "adaIsi";

export const keadaanDaftar = (args: {
  /** Baris yang benar-benar dirender untuk halaman ini. */
  tampil: number;
  /** Akar yang tersedia untuk halaman/kueri ini, sebelum saringan klien. */
  sebelumSaring: number;
  /** Akar yang masih bertahan setelah saringan klien. */
  hasilSaring: number;
  /** Total akar di proyek menurut server (sudah ikut `mine` dan pencarian server). */
  total: number;
  /** Ada kata pencarian yang ikut dikirim ke server; tanpa ini "kosong" menuduh data. */
  adaQueryServer: boolean;
  /** Mode "My Tasks" aktif. */
  mine: boolean;
  /** Identitas pengguna sudah tersedia; tanpa ini "mine" tidak bisa disalahkan. */
  punyaIdentitas: boolean;
}): KeadaanDaftar => {
  const { tampil, sebelumSaring, hasilSaring, total, adaQueryServer, mine, punyaIdentitas } = args;
  if (tampil > 0) return "adaIsi";
  if (total === 0) {
    if (mine && punyaIdentitas) return "bukanMilikSaya";
    if (adaQueryServer) return "tidakCocok";
    return "kosong";
  }
  // Server bilang ada, tapi halaman ini tidak mengirim apa pun.
  if (sebelumSaring === 0) return "halamanLewat";
  if (hasilSaring === 0) return "tidakCocok";
  // Baris tersaring masih ada, jadi yang kosong hanyalah irisan halamannya.
  return "halamanLewat";
};

/** Kunci kamus per keadaan — dipisah supaya layarnya tinggal memakai satu nama. */
export const kunciPesanKosong = (keadaan: KeadaanDaftar): { judul: string; petunjuk: string } => {
  switch (keadaan) {
    case "kosong":
      return { judul: "issues.emptyTitle", petunjuk: "issues.emptyHint" };
    case "bukanMilikSaya":
      return { judul: "issues.emptyMineTitle", petunjuk: "issues.emptyMineHint" };
    case "tidakCocok":
      return { judul: "issues.emptyFilterTitle", petunjuk: "issues.emptyFilterHint" };
    case "halamanLewat":
      return { judul: "issues.emptyPageTitle", petunjuk: "issues.emptyPageHint" };
    case "adaIsi":
      return { judul: "issues.emptyTitle", petunjuk: "issues.emptyHint" };
  }
};
