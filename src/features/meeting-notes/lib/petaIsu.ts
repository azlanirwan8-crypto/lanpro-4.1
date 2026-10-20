import { useCallback, useMemo } from "react";
import type { Task } from "../../../types";

/**
 * #799 — dua potong kecil yang membuat chip tag Poin Diskusi bisa membuka
 * rincian isunya.
 *
 * KENAPA DI `lib/`, BUKAN DI INDUKNYA. `DiscussionPointsTable.tsx` berdiri di
 * 775 baris dari batas 800 §4, dan alasan berkas ini ada sudah pernah ditulis
 * untuk tetangganya `lib/warnaTag.ts`: "dua `useMemo` plus komentarnya tidak
 * boleh tinggal di induknya". Menaruh dua memo di sini menjaga induknya di
 * bawah batas TANPA memecah berkas yang belum minta dipecah.
 *
 * KENAPA PETA, BUKAN `tasks` GLOBAL. Store memang menyimpan `tasks`
 * (`src/store/useAppStore.ts:62`), tetapi irisan itu disaring dan dipaginasi
 * oleh layar Daftar Isu (`AppContainer.tsx:1195-1221`) — memakai peta itu untuk
 * mencari id dari sebuah catatan rapat akan membuat sebagian chip mati tanpa
 * sebab. Yang dipakai di sini adalah daftar yang SUDAH dimuat modul ini sendiri
 * lewat `fetchTasks(projectId, …)`, secope proyek, tanpa permintaan jaringan
 * baru.
 */
export function usePetaIsu(daftarIsu: Task[]): Record<string, Task> {
  return useMemo(() => {
    const peta: Record<string, Task> = {};
    for (const t of daftarIsu) if (t?.id) peta[String(t.id)] = t;
    return peta;
  }, [daftarIsu]);
}

/**
 * Kenapa SATU callback, bukan dua setter yang diwariskan apa adanya: sama
 * seperti #797, `setIsTaskDetailModalOpen(true)` adalah satu-satunya yang
 * menyimpan `previousView`. Dipisah dari `setSelectedTaskForDetail` dan tombol
 * kembali berhenti membawa pengguna ke papan yang ia baca barusan.
 */
export function useBukaRincianIsu(
  setSelectedTaskForDetail: (task: Task) => void,
  setIsTaskDetailModalOpen: (isOpen: boolean) => void
) {
  return useCallback(
    (task: Task) => {
      setSelectedTaskForDetail(task);
      setIsTaskDetailModalOpen(true);
    },
    [setSelectedTaskForDetail, setIsTaskDetailModalOpen]
  );
}
