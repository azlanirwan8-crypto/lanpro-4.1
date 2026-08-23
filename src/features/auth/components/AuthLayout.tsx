import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { LanguageSwitcher } from "../../../i18n/LanguageSwitcher";
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
 * `variant` sengaja ada sejak langkah pertama meski baru satu nilai yang
 * terpakai. Ekstraksi ini WAJIB nol perubahan visual supaya bisa diverifikasi
 * terpisah dari perubahan desainnya; varian `cover` menyusul di langkah kedua.
 */
export type AuthLayoutVariant = "split";

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

export const AuthLayout = ({ children, overlays, variant = "split" }: AuthLayoutProps) => {
  void variant;

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans bg-surface-sunken overflow-x-hidden">
      {/* Sisi visual (desktop) — tetap diam saat login/register bertukar. */}
      <AuthHeroPanel />

      {/* Sisi form. */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-10 lg:p-12 bg-surface-muted relative overflow-y-auto min-h-screen">
        {/* #135 — pemilih bahasa HARUS tersedia sebelum login. Tanpa ini
            pengguna terkunci pada bahasa tersimpan dan tidak punya cara
            menggantinya dari layar masuk. */}
        <div className="absolute top-4 right-4 z-20">
          <LanguageSwitcher />
        </div>

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
};
