/**
 * #692 — Hanya dua kunci yang pernah dipakai `DashboardView.tsx` (baris 654 dan
 * 689). Sisanya 36 kunci mati peninggalan template lama, termasuk kartu
 * bergradasi `from-slate-950 via-slate-900 to-primary-surface` dan `darkCard`.
 * Itu bukan sekadar sampah: `audit:logika` (#157) hanya memburu export mati, jadi
 * properti objek tak tersentuh, dan siapa pun yang mencari "gaya kartu dashboard"
 * berikutnya akan menemukan gradien itu lalu menabrak plafon Velzon #416-#421
 * serta header flat #424. Kalau memang ada keputusan desain untuk memakainya
 * lagi, kuncinya dibuat ulang bersama keputusannya, bukan digali dari sini.
 */
export const styles = {
  container: "flex-1 overflow-auto bg-surface-sunken custom-scrollbar",
  wrapper: "space-y-8 w-full px-3 md:px-6 pt-3 md:pt-4 pb-20 md:pb-28",
};
