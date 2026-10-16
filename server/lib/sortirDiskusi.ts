/**
 * #765 — pengurutan papan titik diskusi.
 *
 * KENAPA DI SINI, BUKAN di repository atau di skema. Dua pemanggil butuh daftar
 * kolom yang BOLEH diurutkan dan mereka tidak boleh punya dua salinan: skema Zod
 * (`server/schemas/discussion-points.schema.ts`) yang menolak nilai asing di URL,
 * dan repository yang menulis `ORDER BY`-nya. Kalau salah satu bertambah dan yang
 * lain tidak, hasilnya bukan galat — hasilnya permintaan ditolak 400 sementara
 * layarnya bilang sudah diurut, atau kolom yang tidak pernah dimaksud muncul.
 *
 * KENAPA PETA, BUKAN NAMA KOLON LANGSUNG. `ORDER BY` tidak bisa memakai
 * placeholder `$1`; nilainya harus ditempel ke teks SQL. Itu berarti string yang
 * datang dari pengguna TIDAK PERNAH boleh masuk ke klausa itu apa adanya. Yang
 * masuk ke SQL hanyalah nilai peta di bawah — dan kunci yang tidak ada di peta
 * jatuh ke urutan bawaan, bukan ke kolom yang diminta.
 *
 * KENAPA EXPRESSION-NYA SEBAGIAN BERCUTIK. Kolom `DiscussionPoints` dibuat dengan
 * kutip dua di `src/lib/pg-migrate.ts:530-548`, jadi Postgres menyimpan ejaan
 * camelCase apa adanya. `src/lib/db.ts` menyisipkan kutip hanya untuk sebagian
 * nama (`camelCaseCols:122`) dan TIDAK untuk `tindakanLanjut`/`targetDate` —
 * itulah sebabnya `updatePoint` di repository sudah mengutip keduanya manual
 * (#476). Ditulis di sini supaya sekali saja.
 */

export type KolomSortirDiskusi =
  "createdAt" | "concern" | "keterangan" | "tindakanLanjut" | "targetDate" | "status";

/**
 * Tuple, bukan `string[]`: skema Zod memakainya sebagai penolakan nilai asing,
 * dan `z.enum` menuntut daftar yang tidak boleh kosong.
 */
export const DAFTAR_KOLOM_SORTIR: [KolomSortirDiskusi, ...KolomSortirDiskusi[]] = [
  "createdAt",
  "concern",
  "keterangan",
  "tindakanLanjut",
  "targetDate",
  "status",
];

/**
 * Kunci URL → ekspresi SQL. Satu-satunya sumber nama kolom yang boleh diurut.
 *
 * `targetDate` disimpan `VARCHAR` tetapi formatnya `YYYY-MM-DD`
 * (`LanproDatePicker.tsx:188` dan `:337`), jadi urutan leksikografinya SAMA
 * dengan urutan kronologis — tidak perlu `CAST` dan tidak ada jebakan "13/10" vs
 * "10/13".
 *
 * `status` bukan nama kolom: ia `CASE`. Secara alfabetis `completed` mendahului
 * `pending`, jadi urutan naik atas kolom mentahnya akan menampilkan papan yang
 * SUDAH selesai lebih dulu dan itu bukan yang dicari orang yang menindaklanjuti
 * rapat. Peta ini yang memutuskan maknanya, bukan kebetulan urutan huruf.
 */
export const KOLOM_SORTIR_DISKUSI: Record<KolomSortirDiskusi, string> = {
  createdAt: '"createdAt"',
  concern: "concern",
  keterangan: "keterangan",
  tindakanLanjut: '"tindakanLanjut"',
  targetDate: '"targetDate"',
  status: "CASE status WHEN 'pending' THEN 0 WHEN 'completed' THEN 1 ELSE 2 END",
};

export type ArahSortirDiskusi = "asc" | "desc";

export interface UrutanDiskusi {
  sortir?: string;
  arah?: string;
}

/** Urutan ketika tidak ada yang diminta — identik dengan papan sebelum #765. */
const BAWAAN = 'ORDER BY "createdAt" ASC';

/**
 * Bangun klausa `ORDER BY` dari permintaan yang sudah divalidasi.
 *
 * `NULLS LAST` di KEDUA arah, bukan hanya saat turun. Postgres memperlakukan NULL
 * sebagai nilai TERBESAR: tanpa klausa ini, `keterangan DESC` menaruh semua baris
 * tanpa catatan di PALING ATAS papan yang tinggi kolom teksnya sudah dibatasi
 * gulir (#708) — layar pertama justru berisi kolom kosong.
 *
 * Pengikat `("createdAt", id)` ditempel di belakang setiap urutan lain karena
 * papan ini di-page server dengan `LIMIT/OFFSET`: mengurutkan kolom yang nilainya
 * boleh berulang (`status`, `keterangan`) tanpa pengikat stabil membuat satu baris
 * muncul di dua halaman sekaligus, atau tidak muncul sama sekali.
 */
export function susunUrutanDiskusi(urutan?: UrutanDiskusi): string {
  const kunci = urutan?.sortir as KolomSortirDiskusi | undefined;
  if (!kunci || !DAFTAR_KOLOM_SORTIR.includes(kunci)) return BAWAAN;
  const arah = urutan?.arah === "desc" ? "DESC" : "ASC";
  const bagian = [`${KOLOM_SORTIR_DISKUSI[kunci]} ${arah} NULLS LAST`];
  if (kunci !== "createdAt") bagian.push('"createdAt" ASC');
  bagian.push("id ASC");
  return `ORDER BY ${bagian.join(", ")}`;
}
