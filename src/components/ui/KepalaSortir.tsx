import React from "react";
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUpDown, ArrowUp } from "lucide-react";
import { cn } from "../../lib/utils";
import type { SetelanSortir } from "../../hooks/useSetelanSortir";

/**
 * #772 — satu sel kepala tabel yang bisa ditekan untuk mengurut.
 *
 * KENAPA PRIMITIF. Papan Poin Diskusi (#765) menulis kepala sortirnya sendiri di
 * `BagianPapan.tsx`, dan tiga daftar lain (rapat, dokumentasi, diagram alur)
 * tidak punya penanda urutan sama sekali — pemilik proyek, 17 Okt: "belum ada
 * filter desc, asc di header table". Menyalin markup papan ke tiga tempat akan
 * mengulang persis cacat yang baru diperbaiki di putaran 3 #765: kelas baris
 * flex dipasang di SATU kepala dan empat lainnya tertinggal, sehingga panah
 * jatuh ke baris kedua. Di sini bentuk itu tinggal satu kali.
 *
 * Yang dikunci komponen ini, dan masing-masing punya alasan yang pernah terlihat
 * di layar pemilik proyek:
 * - `aria-sort` di SEL, bukan di tombol — kolom mana yang jadi acuan adalah
 *   sifat kolom, dan pembaca layar membacanya dari sana;
 * - panah SELALU tampil (versi pertama papan menyembunyikannya sampai hover,
 *   dan di layar itu sama dengan tidak ada);
 * - tombolnya baris-flex ber-`uppercase` — preflight Tailwind memberi
 *   `button { text-transform: none }` sehingga tanpa `uppercase` kepala sortir
 *   tercetak beda kapital dengan kepala di sebelahnya.
 *
 * `label` diterima sebagai string yang SUDAH diterjemahkan: pemanggilnya yang
 * tahu kunci kamusnya, dan `paritas-kamus.test.ts` tetap membaca kunci di
 * tempat aslinya.
 */
interface ThSortirProps {
  /** Kunci kolom — harus sama dengan kunci allow-list di server. */
  kolom: string;
  label: string;
  sortir: SetelanSortir;
  onSortir: (kolom: string) => void;
  /** Kelas sel kepala dari layar masing-masing (lebar, padding, ritme). */
  className?: string;
  /** Untuk kolom yang isinya rata tengah/kanan, misalnya "No." dan "Aksi". */
  rata?: "kiri" | "tengah" | "kanan";
}

const ariaSortir = (kolom: string, setelan: SetelanSortir) =>
  setelan.kolom !== kolom ? "none" : setelan.arah === "asc" ? "ascending" : "descending";

export const ThSortir: React.FC<ThSortirProps> = ({
  kolom,
  label,
  sortir,
  onSortir,
  className,
  rata = "kiri",
}) => {
  const { t } = useTranslation();
  const aktif = sortir.kolom === kolom;
  return (
    <th scope="col" aria-sort={ariaSortir(kolom, sortir)} className={className}>
      <button
        type="button"
        onClick={() => onSortir(kolom)}
        title={t("common.urutkan")}
        className={cn(
          "group flex w-full items-center gap-1 uppercase cursor-pointer text-content-subtle hover:text-content-body transition-colors",
          rata === "tengah" && "justify-center",
          rata === "kanan" && "justify-end"
        )}
      >
        {label}
        {aktif ? (
          sortir.arah === "asc" ? (
            <ArrowUp className="w-3 h-3 shrink-0 text-primary" aria-hidden="true" />
          ) : (
            <ArrowDown className="w-3 h-3 shrink-0 text-primary" aria-hidden="true" />
          )
        ) : (
          <ArrowUpDown
            className="w-3 h-3 shrink-0 opacity-45 text-content-subtle"
            aria-hidden="true"
          />
        )}
      </button>
    </th>
  );
};

export default ThSortir;
