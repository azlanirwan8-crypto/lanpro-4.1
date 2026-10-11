import type { Task } from "../../../types";

/**
 * #689 butir (d) — akar daftar isu dihitung SATU kali dengan indeks, bukan
 * `some()` per baris.
 *
 * `AppRoutes.tsx:307-309` dulu menyusun prop `roots` dengan ekspresi inline
 * `(tasks || []).filter((t) => !t.parentId || !(tasks || []).some(...))`. Karena
 * ia ditulis di badan render, kerja O(n²) itu terulang pada SETIAP render
 * AppContainer — termasuk setiap kali satu karakter diketik di kotak pencarian.
 * Pada 1.000 task itu ±1.000.000 perbandingan per render.
 *
 * Keluarannya sengaja identik dengan aturan lama: baris tanpa `parentId`, atau
 * dengan `parentId` yang tidak dikenali, tetap dianggap akar (halaman yang
 * terpotong di tengah cabang tidak boleh kehilangan induknya), baris tanpa `id`
 * dibuang, dan id kembar dihitung sekali — sama seperti yang sudah dilakukan
 * `hooks.ts:190-192` sebelum menyaring.
 */
export const akarDaftar = (tasks: Task[]): Task[] => {
  const sumber = Array.isArray(tasks) ? tasks : [];
  const idDiketahui = new Set(sumber.map((t) => t?.id).filter(Boolean));
  const terhitung = new Set<string>();
  const hasil: Task[] = [];
  sumber.forEach((t) => {
    if (!t?.id || terhitung.has(t.id)) return;
    if (t.parentId && idDiketahui.has(t.parentId)) return;
    terhitung.add(t.id);
    hasil.push(t);
  });
  return hasil;
};
