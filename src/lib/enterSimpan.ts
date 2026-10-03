import type { KeyboardEvent } from "react";

/**
 * Enter = simpan, untuk semua peramban dan semua papan kunci (#592).
 *
 * `isComposing` penjaga yang tidak boleh dilewat: saat mengetik dengan IME
 * (Jepang/Korea/Cina) tombol Enter menutup daftar kandidat, bukan mengirim
 * formulir — tanpa penjaga ini task dibuat di tengah kata yang belum selesai.
 * `preventDefault` dipasang karena begitu field ini dibungkus `<form>`, Enter
 * bawaannya adalah submit halaman, dan di peramban tertentu itu berarti muat
 * ulang sebelum task-nya sempat tersimpan.
 */
export const enterUntukSimpan = (jalan: () => void) => (e: KeyboardEvent<Element>) => {
  if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
  e.preventDefault();
  jalan();
};
