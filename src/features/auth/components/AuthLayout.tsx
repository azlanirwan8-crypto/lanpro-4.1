import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { LanguageSwitcher } from "../../../i18n/LanguageSwitcher";
import { VelzonFloatingParticles } from "../../../components/ui/CoreUI";
import { AuthHeroPanel } from "./AuthHeroPanel";

/**
 * #154 — Pembungkus tata letak layar auth.
 *
 * KENAPA ADA. Sebelumnya pembungkus ini tinggal di `AppContainer.tsx` sebagai
 * JSX lepas. Akibatnya tata letak keempat layar auth (login, register,
 * complete-registration, dan modal lupa/reset kata sandi) terikat pada berkas
 * 3.500 baris yang tidak ada hubungannya dengan auth — dan mengubah tata letak
 * berarti mengedit AppContainer, bukan fitur auth.
 *
 * DUA VARIAN, SENGAJA.
 *
 * `split`  — hero setengah layar di kiri, form di kanan. Bentuk lama, disimpan
 *            utuh supaya perpindahan ke `cover` bisa dibatalkan tanpa menggali
 *            riwayat git.
 * `cover`  — banner atas, gelombang, kartu mengambang, footer. Bentuk yang
 *            diminta pemilik proyek.
 *
 * LATAR BANNER TIDAK MEMAKAI FOTO, dan itu keputusan sadar. Acuan aslinya pakai
 * foto orang, tetapi yang membuat bentuk ini terbaca sebagai bentuk tersebut
 * adalah gelombang + kartu mengambang + brand terpusat — bukan fotonya. Foto
 * eksternal menambah titik gagal saat offline dan membengkakkan LCP tanpa
 * menyumbang apa pun ke kesan itu. Jadi banner memakai gradient + partikel yang
 * sudah ada.
 */
export type AuthLayoutVariant = "split" | "cover";

interface AuthLayoutProps {
  /** Layar auth yang sedang aktif. */
  children: ReactNode;
  /**
   * Elemen berposisi `fixed`/portal (toaster, indikator, modal global). Dipisah
   * dari `children` supaya tidak ikut terbungkus kolom form yang di-scroll.
   */
  overlays?: ReactNode;
  variant?: AuthLayoutVariant;
}

/**
 * #135 — pemilih bahasa HARUS tersedia sebelum login. Tanpa ini pengguna
 * terkunci pada bahasa tersimpan dan tidak punya cara menggantinya dari layar
 * masuk. Dipakai kedua varian, karena itu diangkat jadi komponen sendiri.
 */
const PemilihBahasaAuth = ({ className }: { className: string }) => (
  <div className={className}>
    <LanguageSwitcher />
  </div>
);

const AuthLayoutSplit = ({ children, overlays }: Omit<AuthLayoutProps, "variant">) => (
  <div className="min-h-screen flex flex-col md:flex-row font-sans bg-surface-sunken overflow-x-hidden">
    {/* Sisi visual (desktop) — tetap diam saat login/register bertukar. */}
    <AuthHeroPanel />

    {/* Sisi form. */}
    <div className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-10 lg:p-12 bg-surface-muted relative overflow-y-auto min-h-screen">
      <PemilihBahasaAuth className="absolute top-4 right-4 z-20" />

      {children}

      {/* Logo mikro untuk layar sempit (<1024px). */}
      <div className="absolute top-6 left-6 lg:hidden flex items-center gap-2">
        <div className="w-7 h-7 bg-primary-surface rounded-lg flex items-center justify-center shadow-md shadow-primary/20">
          <ShieldCheck className="text-content-inverse w-4 h-4" />
        </div>
        <span className="text-sm font-medium text-content tracking-tight">LANPRO</span>
      </div>
    </div>

    {overlays}
  </div>
);

/**
 * Corak batik kawung sebagai tekstur latar, bukan hiasan.
 *
 * KENAPA MOTIF, BUKAN IKON. Pilihan lainnya adalah menabur ikon perkakas
 * manajemen proyek. Ditolak: ikon aplikasi yang bertebaran terbaca seperti
 * wallpaper clip art, bersaing dengan ikon di dalam kartu, dan cepat basi
 * begitu perkakasnya berganti. Motif geometris terbaca sebagai TEKSTUR — mata
 * berhenti menghitungnya setelah sedetik.
 *
 * Kawung dibentuk dari lingkaran beririsan pada kisi, sehingga ubinnya
 * menyambung tanpa jahitan asal jari-jarinya tepat setengah diagonal ubin.
 *
 * Warnanya `var(--color-content-subtle)` — bukan kelas Tailwind — supaya ikut
 * berganti sendiri di mode gelap: garis gelap tipis di atas latar terang,
 * garis terang tipis di atas latar gelap, tanpa satu pun override tema.
 *
 * Ada dua peredam supaya ini tetap tekstur dan tidak pernah jadi kebisingan:
 * opasitas 6%, dan mask yang MELUNTURKANNYA KE ATAS. Corak paling terbaca di
 * bagian bawah halaman yang memang kosong, dan sudah habis sebelum mencapai
 * kartu — bidang di belakang formulir tetap bersih.
 */
const CorakBatikKawung = () => (
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-0 z-0 opacity-[0.06] [mask-image:linear-gradient(to_bottom,transparent_0%,transparent_45%,black_100%)]"
  >
    <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="batik-kawung" width="72" height="72" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="var(--color-content-subtle)" strokeWidth="1.25">
            <circle cx="0" cy="0" r="25.5" />
            <circle cx="72" cy="0" r="25.5" />
            <circle cx="0" cy="72" r="25.5" />
            <circle cx="72" cy="72" r="25.5" />
            <circle cx="36" cy="36" r="25.5" />
          </g>
          <g fill="var(--color-content-subtle)">
            <circle cx="36" cy="0" r="1.75" />
            <circle cx="0" cy="36" r="1.75" />
            <circle cx="72" cy="36" r="1.75" />
            <circle cx="36" cy="72" r="1.75" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#batik-kawung)" />
    </svg>
  </div>
);

const AuthLayoutCover = ({ children, overlays }: Omit<AuthLayoutProps, "variant">) => {
  return (
    <div className="relative min-h-screen flex flex-col font-sans bg-surface-sunken overflow-x-hidden">
      <CorakBatikKawung />

      {/*
        BANNER. Sejak logo dan tagline dihapus isinya tinggal bidang warna,
        jadi ia TIDAK LAGI IKUT ALUR: posisinya absolut di puncak halaman
        dengan tinggi tetap. Kalau ia tetap di alur, tingginya akan ikut
        menentukan posisi kartu — dan kartu tidak akan pernah bisa benar-benar
        terpusat karena selalu terdorong turun sebesar banner.
      */}
      <div className="absolute inset-x-0 top-0 z-10 h-[300px] sm:h-[360px] select-none overflow-hidden bg-primary-surface">
        <VelzonFloatingParticles />

        {/*
          Wash ambien. SENGAJA sangat lemah dan TANPA animasi. Versi sebelumnya
          memakai tiga blob /20-/30 dengan `animate-pulse`, dan hasilnya banner
          terbaca berat sebelah serta gelisah — acuannya justru hampir satu
          warna rata. Yang tersisa di sini cuma pelembut supaya bidangnya tidak
          terasa datar seperti cat tembok, bukan elemen yang terlihat.
        */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-60%] left-[20%] w-[60%] h-[200%] bg-indigo-400/10 rounded-full blur-[150px]" />
          <div className="absolute bottom-[-80%] right-[10%] w-[50%] h-[200%] bg-cyan-300/10 rounded-full blur-[150px]" />
        </div>

        <PemilihBahasaAuth className="absolute top-4 right-4 z-30" />

        {/*
          Gelombang. Warnanya WAJIB sama persis dengan latar halaman, sebab yang
          diisi adalah bagian di BAWAH batas — kalau meleset sedikit saja akan
          terlihat sebagai garis pucat memanjang. `var(--color-surface-sunken)`
          dipakai langsung, bukan kelas Tailwind, supaya nilainya ikut berganti
          di mode gelap tanpa override tema tambahan.

          BENTUKNYA BUSUR SERAGAM. Ini revisi ketiga, dan tiga percobaan
          sebelumnya masing-masing salah dengan cara berbeda: (1) bezier dengan
          titik kendali jauh di luar — paling curam di tepi lalu mendatar di
          tengah, terbaca sebagai patahan; (2) dua bezier bersinggungan mendatar
          — masih terbaca melengkung-lengkung; (3) dua garis lurus bertemu di
          satu titik — sudutnya patah tajam di tengah, dan justru inilah yang
          paling keras.

          Yang dipakai acuan bukan garis lurus dan bukan gelombang, melainkan
          satu busur lingkaran yang melandai MERATA. Titik kendali diletakkan
          tepat di sepertiga (480 dan 960) dengan y=146,7 — kombinasi yang
          menghampiri busur lingkaran sejati: kemiringan di ujung keluar 0,306
          sementara busur lingkaran dengan tali 1440 dan panjang panah 110
          memberi 0,311. Selisihnya 1,6%, tidak terlihat mata.

          Jangan menggeser titik kendali dari sepertiga. Menariknya keluar
          membuat tepi curam dan tengah datar (kesalahan 1); menariknya masuk
          membuat tengah runcing mendekati kesalahan 3.

        */}
        <svg
          className="absolute bottom-0 left-0 w-full h-[70px] sm:h-[100px] pointer-events-none z-20"
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 0 C 480 146.7, 960 146.7, 1440 0 L1440 120 L0 120 Z"
            fill="var(--color-surface-sunken)"
          />
        </svg>
      </div>

      {/*
        Kartu dipusatkan TEGAK LURUS di ruang yang tersisa, bukan digantung
        pada tinggi banner lewat tarikan margin negatif seperti sebelumnya.
        `flex-1` mengambil seluruh sisa tinggi di atas footer dan `items-center`
        memusatkan di dalamnya, sehingga titik pusatnya tidak ikut bergeser tiap
        kali tinggi banner atau isi kartu berubah.

        `py-16` bukan hiasan: tanpa itu, pada layar pendek kartu akan menempel
        di tepi dan sebagian terpotong, sebab pemusatan tidak menyisakan ruang
        napas dengan sendirinya.
      */}
      <div className="relative z-30 flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
        {children}
      </div>

      <footer className="relative z-10 mt-auto pt-10 pb-6 text-center text-xs font-medium text-content-muted">
        &copy; {new Date().getFullYear()} LANPRO
      </footer>

      {overlays}
    </div>
  );
};

export const AuthLayout = ({ children, overlays, variant = "split" }: AuthLayoutProps) => {
  const Varian = variant === "cover" ? AuthLayoutCover : AuthLayoutSplit;
  return <Varian overlays={overlays}>{children}</Varian>;
};
