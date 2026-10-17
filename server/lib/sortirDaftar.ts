/**
 * #772 — penyortir umum untuk daftar yang DI-PAGE DI SERVER.
 *
 * MENGAPA VERSI UMUM, BUKAN MENIRU `sortirDiskusi.ts` UNTUK KEDUA KALINYA.
 * Papan Poin Diskusi (#765) punya kosakata kolomnya sendiri dan test-nya sendiri.
 * Meetings dan Documents memakai kosakata yang sama-sama mentah (`createdAt`,
 * `title`, ...), jadi yang diulang adalah MEKANISMENYA — bukan daftarnya.
 *
 * DUA ATURAN YANG TIDAK BISA DITAWAR.
 *
 * (1) `ORDER BY` tidak bisa memakai bind parameter. Satu-satunya pertahanan
 *     terhadap injeksi adalah bahwa nilai yang datang dari klien tidak pernah
 *     masuk ke SQL sebagai teks: ia dipakai HANYA sebagai kunci ke peta
 *     allow-list, dan kunci yang tidak ada di peta jatuh ke bawaan. Arah juga
 *     diambil dari dua konstanta, bukan dari string klien.
 *
 * (2) Identifier di sini ditulis seperti aslinya di repository-nya: TANPA kutip.
 *     `server/lib/db.ts` melipat `createdAt` menjadi `createdat`, dan kolom itu
 *     memang tersimpan lowercase — jadi `ORDER BY createdAt` hari ini benar,
 *     sedangkan `ORDER BY "createdAt"` akan MELEMPAR "column does not exist".
 *     Mengutip "supaya rapi" adalah cara tercepat menjatuhkan kedua daftar.
 *
 * (3) `NULLS LAST` di kedua arah: Postgres menempatkan NULL PALING AKHIR pada
 *     ASC tapi paling awal pada DESC, jadi tanpa itu kolom yang kosong berpindah
 *     sisi hanya karena pengguna menukar arah.
 *
 * (4) Tiebreaker `id ASC` WAJIB bila kolom urut bukan kolom bawaan. Tanpa
 *     pemutus yang stabil, baris bernilai sama boleh bertukar urutan antar
 *     halaman, dan pengguna melihat baris yang sama dua kali — atau kehilangan
 *     satu — begitu menggulir halaman.
 */

export interface UrutanDaftar {
  sortir?: string;
  arah?: string;
}

export type JuruSortir = (urutan?: UrutanDaftar) => string;

/**
 * Buat penyortir untuk satu tabel.
 *
 * @param peta        kunci klien -> ekspresi SQL yang BOLEH dipakai
 * @param bawaan      kunci yang dipakai bila klien tidak mengirim / mengirim kunci asing
 * @param arahBawaan  arah saat klien tidak memilih kolom — `desc` untuk kedua
 *                    daftar ini karena "terbaru lebih dulu" adalah perilaku
 *                    sebelum #772; mengubahnya diam-diam menjadi `asc` adalah
 *                    cara cepat membuat pemilik proyek melihat rapat tertahunya
 *                    di halaman satu.
 */
export const buatJuruSortir =
  (peta: Record<string, string>, bawaan: string, arahBawaan: "asc" | "desc" = "asc"): JuruSortir =>
  (urutan?: UrutanDaftar): string => {
    const sah = urutan?.sortir && Object.prototype.hasOwnProperty.call(peta, urutan.sortir);
    const kunci = sah ? (urutan!.sortir as string) : bawaan;
    const arah = sah ? (urutan?.arah === "desc" ? "DESC" : "ASC") : arahBawaan.toUpperCase();
    const utama = `${peta[kunci]} ${arah} NULLS LAST`;
    const sisa = kunci === bawaan ? "" : `, ${peta[bawaan]} ${arahBawaan.toUpperCase()}`;
    return `ORDER BY ${utama}${sisa}, id ASC`;
  };

/** Kolom Meetings yang bisa diurut dari layar daftar rapat. */
export const PETA_MEETING: Record<string, string> = {
  createdAt: "createdAt",
  title: "title",
  description: "description",
  authorId: "authorId",
  fileName: "fileName",
};

/** Kolom Documents yang bisa diurut dari layar dokumentasi. */
export const PETA_DOCUMENT: Record<string, string> = {
  createdAt: "createdAt",
  title: "title",
  type: "type",
  createdBy: "createdBy",
  fileName: "fileName",
};

export const sortirMeeting = buatJuruSortir(PETA_MEETING, "createdAt", "desc");
export const sortirDocument = buatJuruSortir(PETA_DOCUMENT, "createdAt", "desc");
