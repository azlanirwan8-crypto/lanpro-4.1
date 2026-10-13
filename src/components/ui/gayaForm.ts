import { cn } from "../../lib/utils";

/**
 * #721 — SATU kit kontrol untuk layar rincian Isu.
 *
 * Angka-angkanya BUKAN selera. `src/index.css:607-615` sudah menstandarkan
 * isian Velzon pada tinggi `2.25rem` dan teks `0.75rem`; `CoreUI.tsx:94` memakai
 * `h-9` untuk varian `md`. Sebelum berkas ini, satu layar yang sama memegang
 * 14 kelas isian berbeda, 3 kelas pemicu dropdown, 27 kelas tombol, dan LIMA
 * perlakuan fokus (`ring-2/10`, `ring-1/20`, `ring-1` penuh, paksa-nol, dan tanpa
 * fokus sama sekali) — itulah yang dibaca pengguna sebagai "putih semua dan
 * tidak rapi", karena tidak ada dua kotak yang tingginya sama.
 *
 * `ISIAN` sengaja TIDAK memuat `w-full`. `cn()` di `lib/utils.ts` hanya
 * merantai string (bukan tailwind-merge), jadi bila `w-full` ikut di dalam kit,
 * isian sempit seperti kotak jam (`w-16`) akan berperang kelas dengan kit-nya
 * sendiri dan pemenangnya ditentukan urutan stylesheet, bukan penulisnya.
 */

/**
 * Dasar semua kotak isian. TINGGINYA sengaja tidak ada di sini: `h-9` dan
 * `h-auto` tidak bisa berdampingan, karena `cn()` merantai tanpa membuang dan
 * dua kelas properti sama diselesaikan oleh urutan stylesheet.
 */
const ISIAN_DASAR =
  "bg-surface border border-border-subtle rounded-md px-2.5 text-xs font-normal text-content-body placeholder:text-content-subtle outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 shadow-2xs";

/** Kotak isian satu baris: teks, angka, dan pencarian. Setinggi baseline Velzon. */
export const ISIAN = cn(ISIAN_DASAR, "h-9");

/** Isian yang memenuhi kolomnya sendiri — bentuk paling umum di panel atribut. */
export const ISIAN_PENUH = cn(ISIAN, "w-full");

/** Kotak teks multi-baris: ritme yang sama, tingginya mengikuti isi. */
export const TEXTAREA_ISIAN = cn(ISIAN_DASAR, "w-full py-2 leading-relaxed resize-none");

/**
 * Isian TANPA Bingkai — untuk kotak teks yang duduk di dalam bingkai lain
 * (editor komentar di bawah talinya, editor deskripsi yang sedang dibuka).
 *
 * Ini bukan `ISIAN` yang dilucuti lewat `className`: `cn()` merantai tanpa
 * membuang, jadi menulis `border-none` di atas `border border-border-subtle`
 * berarti dua kelas properti sama bersaing dan pemenangnya urutan stylesheet.
 * Karena itu varian tanpa bingkai ditulis sebagai konstanta sendiri, satu-satunya
 * tempat `focus:ring-0` boleh muncul di layar ini.
 */
const DASAR_KACA =
  "bg-surface rounded-md px-4 py-2 text-xs font-normal text-content-body placeholder:text-content-subtle outline-none focus:ring-0";

export const ISIAN_KACA = cn(DASAR_KACA, "h-9");
export const TEXTAREA_KACA = cn(DASAR_KACA, "w-full py-3 leading-relaxed resize-none");

/**
 * Editor besar yang menempati seluruh kartu (deskripsi yang sedang dibuka).
 * Sekali lagi: ditulis utuh, BUKAN `TEXTAREA_KACA` plus `p-6 text-sm resize-y`,
 * karena tiga-tiganya akan berperang dengan dasar kit dan `cn()` tidak
 * memutuskan siapa yang menang.
 */
export const EDITOR_DESKRIPSI =
  "w-full bg-surface px-6 py-5 text-sm font-medium text-content-body placeholder:text-content-subtle outline-none focus:ring-0 leading-relaxed resize-y";

/** Pemicu dropdown dan pemilih tanggal: kotak isian yang bisa diklik. */
export const PEMICU = cn(
  ISIAN,
  "w-full flex items-center justify-between gap-1.5 text-left cursor-pointer"
);

/** Label di atas satu medan: 10px, kapital, senada dengan `th` Velzon. */
export const LABEL =
  "flex items-center gap-1.5 text-[10px] font-normal uppercase tracking-normal text-content-subtle";

/** Judul satu blok di kolom kiri. Sama ritmenya dengan LABEL, satu tingkat lebih tebal. */
export const JUDUL_SECTION =
  "flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.05em] text-content-subtle";

/** Tombol ikon kecil (salin, hapus, tutup) — satu ukuran di seluruh layar. */
export const TOMBOL_IKON =
  "p-1.5 rounded-md text-content-muted hover:text-content-body hover:bg-surface-muted transition-colors cursor-pointer";

/** Tautan aksi teks-murni ("+ Link", "AI") — bukan tombol, jadi tidak boleh bergaya kotak. */
export const TOMBOL_TEKS =
  "text-[10px] font-medium text-primary hover:text-primary-hover transition-colors cursor-pointer inline-flex items-center gap-1";

/** Kartu satu blok: latar putih di atas kolom yang sudah ditint, garis subtle, bayangan lembut. */
export const KARTU_SECTION = "bg-surface border border-border-subtle rounded-xl shadow-soft";

/** Tombol bahaya penuh-baris (Delete Issue). `danger` token, bukan `red-500`. */
export const TOMBOL_BAHAYA =
  "h-9 w-full text-xs font-medium rounded-md border border-danger/30 text-danger-text bg-danger/10 hover:bg-danger/15 flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50 disabled:pointer-events-none";

/**
 * Tombol isi-padat satu baris (Tambah jam, Simpan). Ditulis sebagai string
 * utuh, BUKAN turunan `TOMBOL_BAHAYA`: `cn()` merantai tanpa membuang, jadi
 * menurunkan tombol bahaya lalu menimpa `bg-*`-nya berarti dua kelas latar
 * bersaing dan pemenangnya urutan stylesheet.
 */
export const TOMBOL_KECIL =
  "h-9 px-3 text-xs font-medium rounded-md bg-primary text-content-inverse hover:bg-primary-hover active:bg-primary-active shrink-0 cursor-pointer disabled:opacity-50 disabled:pointer-events-none shadow-2xs";
