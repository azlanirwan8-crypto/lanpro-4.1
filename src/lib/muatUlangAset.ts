/**
 * #815 — kegagalan memuat potongan JS sesudah deploy.
 *
 * Vite memancarkan `vite:preloadError` di `window` ketika `import()` dinamis
 * gagal karena berkas ber-hash lama sudah tidak ada di server — keadaan yang
 * lazim sesudah deploy sementara tab masih memegang HTML lama. Tidak ada jumlah
 * klik yang menyembuhkan itu; hanya HTML baru yang bisa, jadi jawabannya muat
 * ulang SEKALI.
 *
 * Sekali per tab, bukan berulang: penanda di sessionStorage mencegah lingkaran
 * muat ulang bila berkasnya memang tetap tidak ada. Bila dibiarkan, Vite
 * meneruskan galatnya ke konsol dan ke ErrorBoundary, sehingga pengguna melihat
 * layar rusak padahal satu muat ulang cukup.
 */
const KUNCI_PRELOAD = "aset-muat-ulang";

export const pasangMuatUlangAset = (
  /* jsdom menjadikan `location.reload` hanya-baca, jadi test menyuntikkan
     pengganti. Produksi selalu memakai bawaan ini. */
  muatUlang: () => void = () => window.location.reload()
): (() => void) => {
  const padaPreloadError = (event: Event) => {
    event.preventDefault();
    let sudahDicoba = false;
    try {
      sudahDicoba = Boolean(window.sessionStorage.getItem(KUNCI_PRELOAD));
      if (!sudahDicoba) window.sessionStorage.setItem(KUNCI_PRELOAD, "1");
    } catch {
      /* sessionStorage bisa diblokir; muat ulang tetap lebih baik daripada diam. */
    }
    if (sudahDicoba) return;
    muatUlang();
  };

  window.addEventListener("vite:preloadError", padaPreloadError);
  return () => window.removeEventListener("vite:preloadError", padaPreloadError);
};
