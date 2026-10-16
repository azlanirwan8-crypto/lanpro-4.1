import { useEffect, useRef } from "react";
import io from "socket.io-client";
import { shouldSuppressDiscussionPointsRefresh } from "../../../lib/taskRefreshControl";

/**
 * #765 — papan titik diskusi dibuatnya TULI terhadap perubahannya sendiri.
 *
 * APA YANG SALAH. Server mengirim `data_changed` ke RUANGAN proyek
 * (`io.to(projectId).emit(...)` di `server.ts:549-578`) setiap kali POST/PUT/DELETE
 * pada `/api/*` berhasil dan `projectId` bisa dibaca dari URL — dan SETIAP jalur
 * titik diskusi membawanya. Socket papan ini dibuat sendiri dengan `io()`, koneksi
 * KEDUA setelah punya `AppContainer`, dan tidak pernah masuk ruangan itu. Yang
 * pernah sampai ke pendengarnya hanyalah varian global tanpa `projectId`.
 * Akibatnya persis yang dilaporkan pemilik proyek 16 Okt: "data di table harus
 * realtime tanpa harus load jika ada perubahan data" — hari ini perubahan orang
 * lain baru terlihat sesudah halaman dimuat ulang.
 *
 * KENAPA `join_project`, BUKAN ruangan baru. Handler-nya (`server.ts:823`)
 * menggabungkan socket ke ruangan TERLEBIH DAHULU dan baru mencatat kehadiran bila
 * identitasnya ada di socket. Socket papan dikirim TANPA `user`, jadi ia tidak bisa
 * menambah maupun menghapus siapa pun dari daftar kehadiran — dan karena itu tidak
 * perlu `leave_project` saat lepas: keanggotaan ruangan ikut putus bersama
 * koneksinya. (Kalau `leave_project` ikut dikirim, justru itu yang berbahaya:
 * socket utama pengguna masih di ruangan yang sama.)
 *
 * KENAPA REFETCH, BUKAN TAMBAL BARIS. Isu ini sudah ditelusuri sebelum memutuskan:
 * payload peristiwa hanya `{ path, method, projectId }` — tidak ada id baris dan
 * tidak ada nilai yang berubah. Mendekorasi baris yang berubah berarti menambah
 * isi peristiwa di rute server, dan itu jalur data baru yang belum diperlukan:
 * `fetchPoints()` di papan ini TIDAK memasang spinner apa pun, jadi layar
 * mengganti isinya di tempat. Perubahan milik pengguna sendiri juga tidak menunggu
 * jaringan sama sekali — `useSelesaiCatatan`, `handleLiveQuickAdd`, dan `saveEdit`
 * menulis state lebih dulu lalu membekukan segarkan socket 8 detik
 * (`suppressDiscussionPointsRefresh`) supaya gema peristiwa ini tidak menimpanya.
 */
export function useRealtimePapan(param: { projectId: string; muatUlang: () => void }) {
  const { projectId, muatUlang } = param;
  /* `muatUlang` disimpan di ref, bukan di daftar dependensi: pemanggilnya
   * mengirim fungsi baru setiap render, dan kalau ia ikut jadi dependensi efek
   * ini socketnya putus-sambung setiap kali papan me-render ulang — persis kelas
   * cacat yang baru ditutup #711 untuk `projectMembers`. */
  const rujukMuat = useRef(muatUlang);
  rujukMuat.current = muatUlang;

  useEffect(() => {
    let socket: any;
    try {
      socket = io();
      socket.on("error", (err: any) => {
        console.warn("[SOCKET ERROR]", err);
      });
    } catch (err) {
      console.error("[SOCKET FATAL]", err);
    }

    if (socket) {
      socket.emit("join_project", { projectId });
      socket.on("data_changed", (event: any) => {
        if (shouldSuppressDiscussionPointsRefresh()) return;
        // #322 — abaikan event proyek lain
        if (event?.projectId && projectId && event.projectId !== projectId) return;
        if (event.path?.includes("/discussionPoints") || event.path?.includes("/meetings")) {
          rujukMuat.current();
        }
      });
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [projectId]);
}
