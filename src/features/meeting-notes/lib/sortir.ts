import { useCallback, useState } from "react";

/**
 * #765 — keadaan pengurutan papan titik diskusi.
 *
 * MENGAPA DI SINI. `DiscussionPointsTable.tsx` berdiri di 788 baris dari batas
 * 800 §4; dua state dan satu comparator tidak boleh tinggal di induknya hanya
 * supaya implementasinya pendek. Polanya sama dengan `lib/lampiran.ts` (#704/#709).
 *
 * MENGAPA URUTANNYA DI SERVER, BUKAN DI ARRAY YANG SEDANG DITAMPILKAN. Papan ini
 * di-page server (`fetchPoints` mengirim `page`/`limit`, dan `total` datang dari
 * `COUNT(*)`), jadi satu halaman hanya berisi `itemsPerPage` titik diskusi.
 * Mengurutkan array itu berarti mengurutkan SEBAGIAN data dan menampilkannya
 * seolah-olah seluruhnya: halaman dua tetap datang dengan urutan lama, dan angka
 * di kaki papan tidak lagi menjelaskan apa pun. Kolom "terlama/terbaru" juga
 * berarti `createdAt`, yang justru TIDAK ada di halaman klien sama sekali kalau
 * urutannya hanya client-side.
 *
 * MENGAPA `kolom: null`. Null berarti "tidak ada permintaan urut" dan papan jatuh
 * ke urutan bawaan server (`createdAt ASC`) — persis perilaku sebelum #765. Jadi
 * membuka rapat lama tidak mengubah apa pun sampai pengguna sendiri menekan kepala
 * kolom.
 */

/** Kunci yang boleh dikirim ke server — harus sama dengan `server/lib/sortirDiskusi.ts`. */
export type KolomSortir =
  "createdAt" | "concern" | "keterangan" | "tindakanLanjut" | "targetDate" | "status";

export type ArahSortir = "asc" | "desc";

export interface SetelanSortir {
  kolom: KolomSortir | null;
  arah: ArahSortir;
}

export const SORTIR_AWAL: SetelanSortir = { kolom: null, arah: "asc" };

/** Nilai yang dikirim ke URL; `null` berarti jangan mengirim apa pun. */
export const paramSortir = (setelan: SetelanSortir): { sort?: string; dir?: string } =>
  setelan.kolom ? { sort: setelan.kolom, dir: setelan.arah } : {};

export function useSortirPapan() {
  const [setelan, setSetelan] = useState<SetelanSortir>(SORTIR_AWAL);

  /**
   * Kolom yang sama ditekan lagi = berganti arah. Kolom lain selalu mulai dari
   * naik — termasuk tanggal, karena "naik" atas tanggal berarti tertua dulu, sama
   * seperti yang sudah ditampilkan papan ini sebelum ada tombolnya.
   */
  const ganti = useCallback((kolom: KolomSortir) => {
    setSetelan((lama) =>
      lama.kolom === kolom
        ? { kolom, arah: lama.arah === "asc" ? "desc" : "asc" }
        : { kolom, arah: "asc" }
    );
  }, []);

  return { setelan, ganti };
}
