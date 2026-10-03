/**
 * Tombol ganti bahasa 1-klik (item #134).
 *
 * Bentuknya mengikuti tombol tema di sebelahnya (§ item #99): satu klik
 * langsung menukar, bukan dropdown dua langkah.
 *
 * Yang ditampilkan adalah bendera bahasa YANG SEDANG AKTIF, bukan tujuannya.
 * Ini SENGAJA berbeda dari tombol tema di sebelahnya (yang menampilkan
 * matahari saat mode gelap menyala). Alasannya: bendera negara dibaca orang
 * sebagai pernyataan "aplikasi ini berbahasa X", bukan sebagai tombol aksi.
 * Konvensi tujuan sempat dipakai dan terbukti salah dibaca oleh pemilik
 * proyek sendiri — ia melaporkan halaman "tidak ikut berganti" padahal
 * halaman itu memang sedang benar berbahasa Inggris.
 *
 * Tujuan kliknya tetap dijelaskan lewat tooltip dan teks sr-only.
 *
 * Benderanya SVG inline, bukan emoji: emoji bendera tidak dirender di Windows
 * dan akan tampil sebagai dua huruf ("ID"/"GB") di mesin pemilik proyek.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { praMuatKamus, simpanBahasa, tukarBahasa, type Bahasa } from "./index";

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
  /** Menjaga agar klik berkala tidak menumpuk permintaan yang sama. */
  const [sedangBertukar, setSedangBertukar] = useState(false);

  /**
   * #603 — hasil tukar diverifikasi, dan kegagalannya DIUCAPKAN. Sebelum ini
   * `changeLanguage` dibiarkan tanpa tanggapan: kalau berkas kamus tidak datang
   * (build lama di peramban, jaringan hotspot putus), bahasa berpindah di atas
   * kertas sementara layar tetap Inggris — dan tombolnya terlihat mati untuk
   * kedua kalinya, persis keluhan yang dilaporkan lagi hari ini.
   */
  const ganti = async () => {
    if (sedangBertukar) return;
    setSedangBertukar(true);
    try {
      const berhasil = await tukarBahasa(tujuan);
      // Pilihan hanya disimpan kalau benar-benar terpakai; menyimpan bahasa yang
      // kamusnya tidak ada berarti muat berikutnya ikut rusak.
      if (berhasil) simpanBahasa(tujuan);
      else toast.error(t("language.gagalMuat"));
    } finally {
      setSedangBertukar(false);
    }
  };

  const judul =
    tujuan === "en" ? "Switch to English / Ganti ke Bahasa Inggris" : "Ganti ke Bahasa Indonesia";

  return (
    <button
      onClick={ganti}
      // #559 — kamus tujuan sudah harus mendarat SEBELUM jari angkat. Kamus
      // Indonesia tidak ikut potongan awal (#515), dan kalau berkasnya gagal
      // datang, klik hanya akan berpindah bahasa di atas kertas: yang tampil
      // tetap kalimat Inggris, dan tombolnya terlihat mati.
      onPointerEnter={() => praMuatKamus(tujuan)}
      onFocus={() => praMuatKamus(tujuan)}
      className="p-2.5 min-w-11 min-h-11 flex items-center justify-center text-content-subtle hover:text-content-strong hover:bg-surface-sunken rounded-full transition-all cursor-pointer relative"
      title={judul}
      aria-label={judul}
      data-testid="language-switcher"
    >
      {aktif === "id" ? <BenderaIndonesia /> : <BenderaInggris />}
      <span className="sr-only">{t("language.switchTo")}</span>
    </button>
  );
};
