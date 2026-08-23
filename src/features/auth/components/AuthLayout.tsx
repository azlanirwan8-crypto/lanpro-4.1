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
      <div className="relative select-none overflow-hidden bg-gradient-to-b from-primary-surface-active via-primary-surface-hover to-primary-surface pt-16 pb-44 sm:pt-20 sm:pb-52">
        <VelzonFloatingParticles />

        {/* Mesh gradient ambien — sama dengan panel hero varian split. */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-40%] right-[-10%] w-[60%] h-[160%] bg-indigo-500/30 rounded-full blur-[140px] animate-pulse" />
          <div className="absolute bottom-[-60%] left-[-10%] w-[60%] h-[160%] bg-cyan-400/20 rounded-full blur-[140px]" />
          <div className="absolute top-[-20%] left-[25%] w-[45%] h-[140%] bg-blue-600/20 rounded-full blur-[130px]" />
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

          BENTUKNYA: RATA DI TEPI, MELENGKUNG DI TENGAH. Versi pertama memakai
          satu kurva dengan titik kendali jauh di luar (`C 400 120, 1040 120`),
          dan hasilnya terbalik dari yang dimaksud: paling curam justru di tepi
          kiri-kanan (turun 36px hanya dalam 240px pertama) lalu mendatar di
          tengah. Terbaca sebagai patahan, bukan gelombang. Sekarang dipakai DUA
          kurva simetris yang garis singgungnya mendatar di ketiga titik ujung
          (0, 720, 1440), sehingga peralihannya mulus dan tepinya menyatu rata
          dengan sisi banner.
        */}
        <svg
          className="absolute bottom-0 left-0 w-full h-[70px] sm:h-[100px] pointer-events-none z-20"
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 0 C 300 0, 420 95, 720 95 C 1020 95, 1140 0, 1440 0 L1440 120 L0 120 Z"
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
