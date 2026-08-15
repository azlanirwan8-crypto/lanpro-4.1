import { useEffect, useState } from "react";
import { ambilProviderSso, urlMulaiSso, type ProviderSso } from "../services/sso.service";

/**
 * Tombol "Login/Daftar dengan Google & Microsoft".
 *
 * Tidak menampilkan apa pun bila tak ada provider yang dikonfigurasi. Itu
 * disengaja: tombol yang pasti gagal saat diklik lebih buruk daripada tidak
 * ada tombol sama sekali.
 *
 * Perhatikan `mode`. Kedua tombol terlihat mirip tetapi perilakunya berbeda
 * secara mendasar (ketetapan F5.1 #3):
 *   login  -> email yang belum terdaftar DITOLAK, tidak membuat akun
 *   daftar -> email yang belum terdaftar diarahkan memilih username
 */
interface SsoButtonsProps {
  mode: "login" | "daftar";
}

/**
 * Logo merek memakai warna resmi masing-masing, bukan token warna LanPro.
 * Ini pengecualian yang disengaja: mengubah warna logo Google atau Microsoft
 * melanggar panduan merek mereka, dan warnanya harus tetap sama di mode terang
 * maupun gelap agar tetap dikenali.
 */
const LogoGoogle = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
    />
    <path
      fill="#34A853"
      d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
    />
    <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
    <path
      fill="#EA4335"
      d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
    />
  </svg>
);

const LogoMicrosoft = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <rect x="0" y="0" width="8.5" height="8.5" fill="#F25022" />
    <rect x="9.5" y="0" width="8.5" height="8.5" fill="#7FBA00" />
    <rect x="0" y="9.5" width="8.5" height="8.5" fill="#00A4EF" />
    <rect x="9.5" y="9.5" width="8.5" height="8.5" fill="#FFB900" />
  </svg>
);

const NAMA: Record<ProviderSso, string> = {
  google: "Google",
  microsoft: "Microsoft",
};

export const SsoButtons = ({ mode }: SsoButtonsProps) => {
  const [providers, setProviders] = useState<ProviderSso[]>([]);
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    let dibatalkan = false;
    ambilProviderSso().then((hasil) => {
      if (!dibatalkan) {
        setProviders(hasil);
        setMemuat(false);
      }
    });
    return () => {
      dibatalkan = true;
    };
  }, []);

  if (memuat || providers.length === 0) return null;

  const kataKerja = mode === "login" ? "Masuk" : "Daftar";

  return (
    <div className="mt-5">
      {/* Pemisah dengan label, supaya jelas ini alternatif dari form di atasnya */}
      <div className="flex items-center gap-3 mb-4">
        <span className="h-px flex-1 bg-border-subtle" />
        <span className="text-xs text-content-muted">atau</span>
        <span className="h-px flex-1 bg-border-subtle" />
      </div>

      <div className="flex flex-col gap-2.5">
        {providers.map((p) => (
          <a
            key={p}
            href={urlMulaiSso(p, mode)}
            className="inline-flex items-center justify-center gap-2.5 min-h-11 w-full rounded-lg
                       border border-border-subtle bg-surface px-4
                       text-sm font-medium text-content-body
                       transition-colors duration-150
                       hover:bg-surface-muted focus:outline-none
                       focus:ring-2 focus:ring-primary/40"
          >
            {p === "google" ? <LogoGoogle /> : <LogoMicrosoft />}
            <span>
              {kataKerja} dengan {NAMA[p]}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
};
