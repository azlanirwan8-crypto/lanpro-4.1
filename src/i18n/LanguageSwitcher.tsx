/**
 * Tombol ganti bahasa 1-klik (item #134).
 *
 * Bentuknya mengikuti tombol tema di sebelahnya (§ item #99): satu klik
 * langsung menukar, bukan dropdown dua langkah. Yang ditampilkan adalah
 * bendera bahasa YANG AKAN DITUJU, bukan yang sedang aktif — sama seperti
 * tombol tema yang menampilkan matahari ketika mode gelap sedang menyala.
 *
 * Benderanya SVG inline, bukan emoji: emoji bendera tidak dirender di Windows
 * dan akan tampil sebagai dua huruf ("ID"/"GB") di mesin pemilik proyek.
 */
import { useTranslation } from "react-i18next";
import { simpanBahasa, type Bahasa } from "./index";

const BenderaIndonesia = () => (
  <svg viewBox="0 0 20 14" className="w-5 h-[14px] rounded-[2px] shadow-2xs" aria-hidden="true">
    <rect width="20" height="7" fill="#e70011" />
    <rect y="7" width="20" height="7" fill="#fff" />
  </svg>
);

const BenderaInggris = () => (
  <svg viewBox="0 0 20 14" className="w-5 h-[14px] rounded-[2px] shadow-2xs" aria-hidden="true">
    <rect width="20" height="14" fill="#012169" />
    <path d="M0 0l20 14M20 0L0 14" stroke="#fff" strokeWidth="2.8" />
    <path d="M0 0l20 14M20 0L0 14" stroke="#c8102e" strokeWidth="1.6" />
    <path d="M10 0v14M0 7h20" stroke="#fff" strokeWidth="4.6" />
    <path d="M10 0v14M0 7h20" stroke="#c8102e" strokeWidth="2.8" />
  </svg>
);

export const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();
  const aktif = (i18n.resolvedLanguage === "en" ? "en" : "id") as Bahasa;
  const tujuan: Bahasa = aktif === "id" ? "en" : "id";

  const ganti = () => {
    i18n.changeLanguage(tujuan);
    simpanBahasa(tujuan);
  };

  const judul =
    tujuan === "en" ? "Switch to English / Ganti ke Bahasa Inggris" : "Ganti ke Bahasa Indonesia";

  return (
    <button
      onClick={ganti}
      className="p-2.5 min-w-11 min-h-11 flex items-center justify-center text-content-subtle hover:text-content-strong hover:bg-surface-sunken rounded-full transition-all cursor-pointer relative"
      title={judul}
      aria-label={judul}
      data-testid="language-switcher"
    >
      {tujuan === "en" ? <BenderaInggris /> : <BenderaIndonesia />}
      <span className="sr-only">{t("language.switchTo")}</span>
    </button>
  );
};
