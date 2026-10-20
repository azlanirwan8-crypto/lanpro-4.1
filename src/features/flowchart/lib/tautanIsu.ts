/**
 * #718 — satu format untuk menyebut satu isu di layar Flowchart.
 *
 * #796 — kodenya DICABUT dari semua permukaan tampil. Pemilik proyek 20 Okt:
 * "linked issue ini kenapa masih ada kode nya, kan saya bilang hanya nama
 * saja tidak pakai issue, cek semua nya di dropdown ny juga ada". Jadi chip
 * tabel, chip kartu HP, dan label opsi dropdown sama-sama menampilkan judul
 * saja; `[WMIR-165]` tidak muncul lagi di mana pun.
 *
 * KENAPA `carianTautanIsu` MASIH ADA DAN KENAPA IA BUKAN SALINAN LABEL.
 * `StyledDropdown` menyaring pada `label` (`CommonComponents.tsx:363`), padahal
 * #727 justru MEMPERTAHANKAN pencarian lewat kunci saat combobox inline
 * dipensiunkan — aturannya tertulis di `src/lib/labelIndukTugas.ts`: "pemilik
 * proyek yang mengetik PRJ-73 harus menemukan tugasnya sama seperti yang
 * mengetik sebagian judulnya". Membuang kunci dari label tanpa memindahkannya
 * ke jalur cari akan mematikan perilaku itu secara diam-diam. Maka kunci
 * pindah menjadi teks cari, bukan teks tampil.
 */
export const carianTautanIsu = (key: string | undefined, judul: string) =>
  `${key ?? ""} ${judul}`.trim();
