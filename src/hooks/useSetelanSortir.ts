import { useCallback, useState } from "react";

/**
 * #772 — setelan pengurutan kepala tabel untuk daftar-daftar yang memakai
 * kit `ThSortir` (rapat, dokumentasi, diagram alur).
 *
 * SATU ATURAN YANG DIAMBIL DARI PAPAN POIN DISKUSI (#765): menekan kolom yang
 * sedang aktif membalik arahnya; menekan kolom lain MEMULAI kolom itu naik.
 * Tanpa aturan kedua itu, berpindah kolom terasa seperti "panahnya nyasar".
 *
 * `kolom: null` berarti "pengguna belum memilih apa pun" — dan itu BERBEDA dari
 * "memilih kolom bawaan". Perbedaannya nyata di jalur server: selama null,
 * tidak ada `sort`/`dir` yang dikirim, jadi daftar tampil persis seperti
 * sebelum item ini ada. Menormalisasi null ke nama kolom akan mengubah urutan
 * bawaan diam-diam di layar orang.
 */
export interface SetelanSortir {
  kolom: string | null;
  arah: "asc" | "desc";
}

export const SORTIR_AWAL: SetelanSortir = { kolom: null, arah: "asc" };

export function useSetelanSortir() {
  const [sortir, setSortir] = useState<SetelanSortir>(SORTIR_AWAL);

  const tukar = useCallback((kolom: string) => {
    setSortir((sebelum) =>
      sebelum.kolom === kolom
        ? { kolom, arah: sebelum.arah === "asc" ? "desc" : "asc" }
        : { kolom, arah: "asc" }
    );
  }, []);

  return { sortir, tukar, setSortir };
}

/**
 * Parameter query untuk daftar yang di-page SERVER. Kolom yang belum dipilih
 * sengaja TIDAK dikirim (lihat catatan di atas).
 */
export const paramSortir = (sortir: SetelanSortir): Record<string, string> =>
  sortir.kolom ? { sort: sortir.kolom, dir: sortir.arah } : {};
