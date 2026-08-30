import React from "react";

/**
 * `React.lazy` dengan satu percobaan ulang.
 *
 * KENAPA PERLU RETRY. Impor dinamis mengunduh potongan lewat jaringan saat
 * tampilannya dibuka, bukan saat aplikasi dimuat. Satu kedipan koneksi — atau
 * satu deploy yang mengganti nama berkas potongan sementara tab lama masih
 * terbuka — membuat unduhan itu gagal, dan kegagalannya tampil sebagai
 * tampilan yang tidak pernah muncul. Sekali coba lagi sesudah 400 ms menutup
 * sebagian besar kasus itu tanpa perlu pengguna memuat ulang halaman.
 *
 * KENAPA BERDIRI SENDIRI DI SINI (#293). Dulu helper ini hidup di dalam
 * `AppRoutes.tsx` dan tidak diekspor, sehingga `AppContainer.tsx` — yang juga
 * merender beberapa tampilan besar secara bersyarat — tidak bisa memakainya
 * dan mengimpor tampilan itu SECARA STATIS. Impor statis selalu menang atas
 * impor dinamis: satu saja membuat pemuatan malas di tempat lain berhenti
 * menghasilkan potongan terpisah, tanpa satu pun galat atau peringatan.
 * Menaruhnya di modul sendiri membuat kedua pemanggil memakai jalur yang sama.
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
) {
  return React.lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      console.warn("[Vite/Lazy] Dynamic import failed, retrying...", error);
      await new Promise((resolve) => setTimeout(resolve, 400));
      try {
        return await componentImport();
      } catch (retryError) {
        console.error("[Vite/Lazy] Dynamic import retry failed:", retryError);
        throw retryError;
      }
    }
  });
}
