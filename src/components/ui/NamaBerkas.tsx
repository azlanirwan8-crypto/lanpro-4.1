import React from "react";
import { cn } from "../../lib/utils";

/**
 * #771 — nama berkas: SATU baris, dan yang dipotong adalah TENGAHNYA.
 *
 * MENGAPA SATU BARIS. Kolom "Berkas Dokumen" di daftar rapat dan daftar
 * dokumentasi pernah dibiarkan melipat: "Quick_Alignment_12_Oktober_2026.xlsx"
 * pecah jadi tiga baris di tengah kata (pemutusannya `break-all`, jadi
 * "Alignme|nt_12_..." — tidak ada yang bisa dibaca utuh). Pemilik proyek,
 * 17 Okt: "berkas doc ini kan saya bilang pastikan 1 baris saja — kelihatan
 * tidak elegant begini". Ini juga mengoreksi #767, yang membaca kalimat pemilik
 * terbalik dan justru MEMBUAT nama berkas melipat.
 *
 * MENGAPA ELIPSIS TENGAH, BUKAN UJUNG. Untuk berkas, bagian yang membedakan
 * dua baris berdekatan sering justru di ujung: "..._12_Oktober_2026.xlsx" vs
 * "..._19_Oktober_2026.xlsx". Elipsis ujung menyamarkan keduanya menjadi nama
 * yang tampak sama. Dengan memotong tengah, EKSTENSI tetap terbaca (`.xlsx`
 * selalu utuh) dan yang hilang hanya bagian tengah yang paling sedikit
 *informasinya.
 *
 * INI TETAP MEMOTONG TEKS — dan itu disengaja, dengan dua syarat. (1) Nama
 * penuh selalu ada di `title`, jadi tidak ada nilai yang hilang tanpa jalan
 * membacanya; (2) yang dipotong adalah NAMA BERKAS, bukan isi catatan: larangan
 * #645/#647 tetap berlaku penuh untuk paragraf catatan/deskripsi, dan penjaga
 * `dataTampilPenuh-646-647.test.ts` disesuaikan supaya pengecualian ini hanya
 * sah untuk berkas yang membawa `title`.
 *
 * CATATAN GERBANG. Pola R2 `audit:label` mengenali potongan teks sebagai
 * `truncate` yang berpasangan `max-w-[NNpx]` pada baris yang sama. Kelas di
 * bawah memakai `max-w-full` (bukan piksel), jadi ia TIDAK terhitung R2 — itu
 * blind spot gerbang, bukan bukti bahwa tidak ada pemotongan. Karena itu
 * penjaga perilaku yang sebenarnya ada di `NamaBerkas.test.tsx`.
 */

/** Pangkal + ekstensi. Ekstensi diakui bila setelah titik TERAKHIR ada 1-5
 *  karakter alfanumerik DAN setidaknya satu huruf. Syarat huruf itu yang
 *  memisahkan ".xlsx/.docx/.mp4/.gz" dari nomor versi: tanpa itu,
 *  "Rapat v1.2.3" akan terpotong menjadi "Rapat v1.2" + ".3". */
export const bagiNamaBerkas = (nama: string): { pangkal: string; ekstensi: string } => {
  const i = nama.lastIndexOf(".");
  if (i <= 0) return { pangkal: nama, ekstensi: "" };
  const ekor = nama.slice(i + 1);
  if (!/^[A-Za-z0-9]{1,5}$/.test(ekor) || !/[A-Za-z]/.test(ekor)) {
    return { pangkal: nama, ekstensi: "" };
  }
  return { pangkal: nama.slice(0, i), ekstensi: nama.slice(i) };
};

interface NamaBerkasProps {
  nama: string;
  /** Kelas tambahan untuk pemanggil (ukuran/tona teks). */
  className?: string;
}

export const NamaBerkas: React.FC<NamaBerkasProps> = ({ nama, className }) => {
  const { pangkal, ekstensi } = bagiNamaBerkas(nama);
  return (
    <span
      className={cn("inline-flex min-w-0 max-w-full items-center", className)}
      /* `title` wajib: nama penuh harus selalu bisa dibaca, walau layar
         hanya menampilkan pangkal yang dipotong. */
      title={nama}
    >
      <span className="truncate">{pangkal}</span>
      {ekstensi && <span className="shrink-0">{ekstensi}</span>}
    </span>
  );
};

export default NamaBerkas;
