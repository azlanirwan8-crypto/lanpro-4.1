import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
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

const AuthLayoutCover = ({ children, overlays }: Omit<AuthLayoutProps, "variant">) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col font-sans bg-surface-sunken overflow-x-hidden">
      {/* BANNER — brand terpusat di atas gelombang. */}
      <div className="relative select-none overflow-hidden bg-primary-surface pt-16 pb-44 sm:pt-20 sm:pb-52">
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center px-6"
        >
          <h1 className="text-5xl sm:text-6xl font-medium text-content-inverse leading-[0.9] tracking-tighter drop-shadow-md">
            LAN <span className="text-amber-400">PRO</span>
          </h1>
          <p className="text-xs font-medium text-content-inverse-muted mt-3 tracking-widest uppercase">
            {t("ui.platformTagline")}
          </p>
        </motion.div>

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
        Kartu ditarik naik sampai MELEWATI puncak gelombang, bukan berhenti di
        garisnya. Kalau tariknya hanya sedalam gelombang, kartu tampak duduk di
        atas lekukan dan efek mengambangnya hilang — sisi kiri-kanan gelombang
        harus tetap terlihat di kedua sisi kartu. Padding bawah banner disetel
        seiring nilai ini supaya jarak tagline ke kartu tidak ikut menyempit.
      */}
      <div className="relative z-30 -mt-32 sm:-mt-40 px-4 sm:px-6 flex justify-center">
        {children}
      </div>

      <footer className="mt-auto pt-10 pb-6 text-center text-xs font-medium text-content-muted">
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
