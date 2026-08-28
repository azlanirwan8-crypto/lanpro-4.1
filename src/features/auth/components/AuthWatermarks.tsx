/**
 * #229/#230/#231 — Motif watermark layar auth, dipisah dari `AuthLayout.tsx`
 * supaya bisa dipakai bersama oleh `AuthHeroPanel.tsx` (varian split) tanpa
 * membentuk circular import antara kedua berkas.
 */

/**
 * Watermark bertema alat manajemen proyek (papan kanban + linimasa) sebagai
 * tekstur latar, bukan hiasan.
 *
 * #231 — motif sebelumnya adalah batik kawung (floral/paisley). Pemilik
 * proyek melihat langsung hasilnya dan menilai itu terlalu ramai/tidak
 * relevan untuk produk manajemen proyek, dan minta motif yang mencerminkan
 * alat sehari-hari aplikasi ini: papan kanban (kolom + kartu) dan linimasa
 * (garis + titik milestone). Diganti ke garis tipis SAJA (tanpa `fill`
 * padat) supaya tetap terbaca sebagai tekstur — mata berhenti
 * menghitungnya setelah sedetik — bukan ikon yang bersaing dengan isi
 * kartu form. Opacity diturunkan dari 0.09 ke 0.045: motif batik yang lama
 * masih terlihat jelas pada 0.09, garis tipis kanban/linimasa ini sudah
 * cukup terbaca sebagai tekstur pada separuh opacity itu.
 *
 * Warnanya `var(--color-primary)` supaya senada dengan aksen aplikasi.
 *
 * Mask yang MELUNTURKANNYA KE ATAS dipertahankan dari desain sebelumnya:
 * motif paling terbaca di bagian bawah halaman yang memang kosong, dan
 * sudah habis sebelum mencapai kartu — bidang di belakang formulir tetap
 * bersih.
 */
export const CorakBatikKawung = () => (
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-0 z-0 opacity-[0.045] [mask-image:linear-gradient(to_bottom,transparent_0%,transparent_16%,black_36%)]"
  >
    <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="motif-manajemen-proyek" width="240" height="240" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round">
            {/* Papan kanban: bingkai 3 kolom, tiap kolom punya 1-2 "kartu". */}
            <rect x="20" y="20" width="90" height="70" rx="4" />
            <line x1="50" y1="20" x2="50" y2="90" />
            <line x1="80" y1="20" x2="80" y2="90" />
            <rect x="26" y="30" width="18" height="12" rx="2" />
            <rect x="26" y="48" width="18" height="12" rx="2" />
            <rect x="56" y="30" width="18" height="12" rx="2" />
            <rect x="86" y="30" width="18" height="12" rx="2" />
            <rect x="86" y="48" width="18" height="12" rx="2" />

            {/* Linimasa: garis horizontal dengan titik milestone. */}
            <line x1="20" y1="150" x2="220" y2="150" />
            <circle cx="45" cy="150" r="4" />
            <circle cx="100" cy="150" r="4" />
            <circle cx="155" cy="150" r="4" />
            <circle cx="205" cy="150" r="4" />
            <line x1="45" y1="150" x2="45" y2="135" />
            <line x1="155" y1="150" x2="155" y2="165" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#motif-manajemen-proyek)" />
    </svg>
  </div>
);

/**
 * #229/#231 — Sama seperti `CorakBatikKawung`, tapi dicetak putih transparan
 * khusus untuk dipasang di atas latar gelap (banner cover, panel hero
 * split). `CorakBatikKawung` memakai `var(--color-primary)` yang senada
 * dengan latar-latar itu sehingga di sana motifnya nyaris tak terlihat —
 * bukan bug, sengaja lemah di area yang latarnya sudah warna primary.
 *
 * Opacity diturunkan dari 0.12 ke 0.07 mengikuti keputusan #231 (motif
 * kanban/linimasa garis tipis sudah cukup terbaca pada opacity lebih rendah
 * dibanding motif batik sebelumnya).
 */
export const CorakBatikKawungBanner = () => (
  <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[5] opacity-[0.07]">
    <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern
          id="motif-manajemen-proyek-banner"
          width="240"
          height="240"
          patternUnits="userSpaceOnUse"
        >
          <g fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round">
            <rect x="20" y="20" width="90" height="70" rx="4" />
            <line x1="50" y1="20" x2="50" y2="90" />
            <line x1="80" y1="20" x2="80" y2="90" />
            <rect x="26" y="30" width="18" height="12" rx="2" />
            <rect x="26" y="48" width="18" height="12" rx="2" />
            <rect x="56" y="30" width="18" height="12" rx="2" />
            <rect x="86" y="30" width="18" height="12" rx="2" />
            <rect x="86" y="48" width="18" height="12" rx="2" />

            <line x1="20" y1="150" x2="220" y2="150" />
            <circle cx="45" cy="150" r="4" />
            <circle cx="100" cy="150" r="4" />
            <circle cx="155" cy="150" r="4" />
            <circle cx="205" cy="150" r="4" />
            <line x1="45" y1="150" x2="45" y2="135" />
            <line x1="155" y1="150" x2="155" y2="165" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#motif-manajemen-proyek-banner)" />
    </svg>
  </div>
);

/**
 * #231 — "Watermark" sisi terang (form) varian `split`.
 *
 * Bukan motif berulang (`CorakBatikKawung`/`CorakBatikKawungBanner` di atas)
 * — itu ditolak pemilik proyek untuk sisi ini. Ini murni dua elemen dekoratif
 * dari gambar acuan pemilik proyek: kartu placeholder garis putus-putus di
 * pojok kiri atas, dan satu garis lengkung tipis bertitik yang menyeberang
 * dari kanan bawah. Keduanya `stroke`-only, warna token
 * `var(--color-border-subtle)`/`var(--color-content-subtle)` (ikut mode
 * gelap otomatis), dan diam di `z-0` di belakang kartu form — tekstur, bukan
 * elemen yang menarik perhatian.
 */
export const WatermarkSisiTerang = () => (
  <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
    {/* Kartu placeholder, pojok kiri atas — 3 kartu bertumpuk-geser. */}
    <svg
      className="absolute -top-6 -left-10 w-[320px] h-[220px] opacity-[0.5]"
      viewBox="0 0 320 220"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill="none" stroke="var(--color-border-subtle)" strokeWidth="1.5" strokeDasharray="4,4">
        <rect x="0" y="10" width="90" height="130" rx="10" />
        <rect x="110" y="0" width="90" height="150" rx="10" />
        <rect x="220" y="20" width="90" height="130" rx="10" />
      </g>
      <g fill="var(--color-surface)" stroke="var(--color-border-subtle)" strokeWidth="1">
        <rect x="16" y="26" width="58" height="42" rx="6" />
        <rect x="126" y="18" width="58" height="42" rx="6" />
        <rect x="236" y="36" width="58" height="42" rx="6" />
      </g>
    </svg>

    {/* Garis lengkung bertitik, menyeberang dari kanan bawah. */}
    <svg
      className="absolute bottom-8 right-0 w-[420px] h-[240px] opacity-[0.5]"
      viewBox="0 0 420 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M 20 220 C 140 190, 200 120, 260 90 C 320 60, 360 40, 410 15"
        stroke="var(--color-content-subtle)"
        strokeWidth="1.5"
        strokeDasharray="3,6"
      />
      <circle cx="20" cy="220" r="4" fill="var(--color-content-subtle)" />
      <circle cx="260" cy="90" r="4" fill="var(--color-content-subtle)" />
      <circle
        cx="410"
        cy="15"
        r="5"
        fill="none"
        stroke="var(--color-content-subtle)"
        strokeWidth="1.5"
      />
    </svg>
  </div>
);
