import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { LanguageSwitcher } from "../../../i18n/LanguageSwitcher";
import { VelzonFloatingParticles } from "../../../components/ui/CoreUI";
import { AuthHeroPanel } from "./AuthHeroPanel";
import { CorakBatikKawung, CorakBatikKawungBanner, WatermarkSisiTerang } from "./AuthWatermarks";

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
  /*
    #231 — latar root memakai `bg-surface-muted`, SAMA dengan sisi form di
    bawah, dan itu bukan kebetulan. `AuthHeroPanel` kini melengkungkan tepi
    kanannya dengan `clip-path`, sehingga sudut kanan-atas dan kanan-bawah
    panel kiri terpotong dan yang tampak di situ adalah latar root ini. Kalau
    root tetap `bg-surface-sunken` (beda dari sisi form), potongan itu
    terbaca sebagai bidang warna ketiga di sebelah sisi form — jahitan yang
    justru ingin dihilangkan lengkungannya.
  */
  <div className="min-h-screen flex flex-col md:flex-row font-sans bg-surface-muted overflow-x-hidden">
    {/* Sisi visual (desktop) — tetap diam saat login/register bertukar. */}
    <AuthHeroPanel />

    {/*
      Sisi form. #309 — form sempat terbaca menempel di tepi kanan panel gelap
      karena setengah-kanan viewport tanpa pembatas lebar yang jelas. Kartu
      dibatasi max-w-md dan dipusatkan di kolom terang; padding kiri md+
      memberi napas dari lengkung clip-path hero.
    */}
    <div className="w-full md:w-1/2 flex items-center justify-center px-6 pt-24 pb-10 sm:px-10 md:pl-14 md:pr-10 lg:pl-20 lg:pr-14 md:pt-10 bg-surface-muted relative overflow-y-auto min-h-screen">
      {/*
        #231 — "watermark" sisi terang, sesuai gambar acuan pemilik proyek:
        BUKAN motif batik/kanban (itu ditolak), melainkan kartu placeholder
        garis putus-putus + garis lengkung bertitik, sangat samar, murni
        tekstur latar di belakang kartu form. Panel kiri gelap (`AuthHeroPanel`)
        sengaja TIDAK punya watermark apa pun — tetap polos seperti acuan asli.
      */}
      <WatermarkSisiTerang />

      <PemilihBahasaAuth className="absolute top-4 right-4 z-20" />

      <div className="relative z-10 w-full max-w-md mx-auto">{children}</div>

      {/* Logo brand-first untuk layar sempit — #374 */}
      <div className="absolute top-5 left-5 lg:hidden flex items-center gap-2.5 z-20">
        <div className="w-10 h-10 bg-primary-surface rounded-xl flex items-center justify-center shadow-md shadow-primary/25">
          <ShieldCheck className="text-content-inverse w-5 h-5" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-base font-semibold text-content tracking-tight">LANPRO</span>
          <span className="text-[10px] font-medium text-content-muted tracking-wide uppercase">
            Project Hub
          </span>
        </div>
      </div>
    </div>

    {overlays}
  </div>
);

const AuthLayoutCover = ({ children, overlays }: Omit<AuthLayoutProps, "variant">) => {
  return (
    <div className="relative min-h-screen flex flex-col font-sans bg-surface-sunken overflow-x-hidden">
      <CorakBatikKawung />

      {/*
        Pemilih bahasa duduk di LUAR banner, bukan di dalamnya, dan itu bukan
        selera. Banner ada di z-10 sementara kolom pemusat kartu ada di z-30
        dan membentang menutupi seluruh viewport — termasuk pojok kanan atas.
        Selama pemilih bahasa berada di dalam banner, z-index setinggi apa pun
        yang diberikan padanya terkurung di konteks tumpukan banner, sehingga
        kolom kartu selalu menang dan menelan kliknya. Persis itu yang terjadi
        dan dilaporkan pemilik proyek. Sebagai saudara kandung di z-40 ia
        berada di atas segalanya dan bisa diklik lagi.
      */}
      <PemilihBahasaAuth className="absolute top-4 right-4 z-40" />

      {/*
        BANNER. Sejak logo dan tagline dihapus isinya tinggal bidang warna,
        jadi ia TIDAK LAGI IKUT ALUR: posisinya absolut di puncak halaman
        dengan tinggi tetap. Kalau ia tetap di alur, tingginya akan ikut
        menentukan posisi kartu — dan kartu tidak akan pernah bisa benar-benar
        terpusat karena selalu terdorong turun sebesar banner.
      */}
      <div className="absolute inset-x-0 top-0 z-10 h-[300px] sm:h-[360px] select-none overflow-hidden bg-primary-surface">
        <VelzonFloatingParticles />

        {/* #229 — motif watermark putih transparan, khusus area banner. */}
        <CorakBatikKawungBanner />

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

        {/*
          Gelombang Dua Lapis (Double-Layer Wave).
          Lapis 1: Pita gelombang aksen biru terang murni (translucent blue ribbon strip).
          Lapis 2: Bidang utama latar bawah halaman (var(--color-surface-sunken)).

          #229 — tinggi & kurva diperbesar (dari 80/110px ke 140/190px) supaya
          lengkungannya landai dan lebar seperti gambar referensi pemilik
          proyek, bukan ombak kecil-kecil seperti sebelumnya.
        */}
        <svg
          className="absolute bottom-0 left-0 w-full h-[140px] sm:h-[190px] pointer-events-none z-20"
          viewBox="0 0 1440 200"
          preserveAspectRatio="none"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Lapis 1: Pita Aksen Biru Translusen */}
          <path
            d="M0 -20 C 480 200, 960 200, 1440 -20 L1440 200 L0 200 Z"
            fill="var(--color-primary)"
            opacity="0.3"
          />
          {/* Lapis 2: Bidang Utama Latar Bawah Halaman */}
          <path
            d="M0 15 C 480 220, 960 220, 1440 15 L1440 200 L0 200 Z"
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
      <div className="relative z-30 flex flex-1 items-center justify-center px-4 py-4 sm:py-6 overflow-y-auto max-h-screen my-auto">
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
