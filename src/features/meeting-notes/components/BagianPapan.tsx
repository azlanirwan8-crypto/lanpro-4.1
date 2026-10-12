import React from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Search,
  Sparkles,
} from "lucide-react";
import { ListPerPageSelect } from "../../../components/ui/ListPerPageSelect";
import { cn } from "../../../lib/utils";

/**
 * #703 — kepala (cari + tombol asisten AI) dan kaki (paginasi) papan diskusi,
 * dikeluarkan dari `DiscussionPointsTable.tsx`.
 *
 * Alasannya murni batas §4: induknya masih 858 baris sesudah laci sunting, baris
 * data, baris cepat, dan laci utas keluar. Dua potong tata letak yang tidak
 * punya logika data adalah tempat paling aman untuk memotongnya, dan keduanya
 * memang sudah berbentuk begitu — hanya props yang masuk, tidak ada state.
 *
 * #707 menambahkan `KepalaTabel` ke berkas yang sama, dan itu bukan tempat
 * parkir: kepala tabel adalah potongan ketiga yang tidak punya state, dan
 * induknya sudah 780 baris dari batas 800 §4 sebelum item ini dimulai.
 */

interface KepalaProps {
  tampilAI: boolean;
  onToggleAI: () => void;
  cari: string;
  onCari: (teks: string) => void;
}

export const KepalaPapan: React.FC<KepalaProps> = ({ tampilAI, onToggleAI, cari, onCari }) => {
  const { t } = useTranslation();
  return (
    <div className="px-3 sm:px-5 py-3 border-b border-border-subtle/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface-sunken/40 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xs shrink-0">
          <Search className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-content-strong tracking-tight truncate">
            {t("discussion.heading2")}
          </h3>
          <p className="text-xs font-normal text-content-subtle hidden sm:block">
            {t("discussion.subheading")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto min-w-0">
        {!tampilAI && (
          <div className="relative flex-1 min-w-0 sm:w-64 sm:flex-none">
            <Search className="w-3.5 h-3.5 text-content-subtle absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t("discussion.searchPlaceholder")}
              value={cari}
              onChange={(e) => onCari(e.target.value)}
              className="w-full min-w-0 pl-9 pr-3 py-2 bg-surface border border-border-subtle focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-md text-xs font-normal text-content-strong outline-none shadow-2xs"
            />
          </div>
        )}

        <button
          onClick={onToggleAI}
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-md text-xs font-normal transition-all border shadow-2xs cursor-pointer shrink-0",
            tampilAI
              ? "bg-surface-muted hover:bg-surface-strong text-content-body border-border-subtle"
              : "bg-primary/10 hover:bg-primary/15 text-primary border-primary/20"
          )}
          title={tampilAI ? t("discussion.closeAiAssistant") : t("discussion.aiAssistant")}
        >
          {tampilAI ? (
            <>
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("discussion.closeAiAssistant")}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">{t("discussion.aiAssistant")}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

/**
 * #707 — garis pemisah antar baris. Ia tinggal di sini karena dipakai DUA berkas
 * (`BarisDiskusi` dan `BarisCepat`) dan keduanya harus bergerak bersamaan:
 * tabelnya kini `border-separate` — syarat agar garis bawah kepala tabel ikut
 * melekat — dan pada model terpisah CSS tidak menggambar border pada `<tr>`,
 * sehingga `divide-y` di `<tbody>` diam-diam menghasilkan nol garis.
 */
export const SEL = "px-4 border-b border-border-faint";

/**
 * #707 — kepala tabel desktop. `position: sticky` hanya bekerja terhadap
 * scrollport TERDEKAT, dan selama berkas ini masih dibungkus `ResponsiveTable`
 * (satu `overflow-x-auto` lagi di dalam), scrollport terdekat itu adalah bungkus
 * dalam yang tingginya mengikuti isi — jadi ia tidak pernah bergulir dan kepala
 * tabel tetap ikut lolos ke atas. Yang menahan tampilan itu bukan kelasnya,
 * melainkan jumlah wadahnya; lihat `DiscussionPointsTable.tsx`.
 *
 * Dua turunannya ikut ditangani di sini:
 *  - Latar kepala harus OPAN. `bg-primary-surface/5` (standar #422) tembus
 *    pandang, jadi baris yang lewat di bawahnya terlihat menembus. `surface-sunken`
 *    adalah token latar terdekat yang tidak tembus, baik di mode terang maupun
 *    gelap, dan tidak satu pun override mode gelap ditambahkan (§22).
 *  - Garis bawah pindah dari baris ke sel kepala. Tabel ini kini
 *    `border-separate` (tanpa itu garis bawah kepala ikut hilang bersama model
 *    `border-collapse`), dan pada model terpisah border pada baris tidak digambar.
 *
 * Lebar kolom ditulis di sini dan hanya di sini: dengan `table-fixed` nilai
 * inilah kolomnya, dan baris data tidak perlu menebak lagi.
 */
export const KepalaTabel: React.FC = () => {
  const { t } = useTranslation();
  const th =
    "sticky top-0 z-20 bg-surface-sunken py-3 px-4 border-b border-border-subtle font-normal";
  return (
    <thead>
      <tr className="text-xs text-content-subtle whitespace-nowrap">
        <th scope="col" className={`${th} w-12 text-center`}>
          {t("discussion.thNo")}
        </th>
        <th scope="col" className={`${th} w-[220px]`}>
          {t("discussion.thConcern")}
        </th>
        <th scope="col" className={`${th} w-[280px]`}>
          {t("discussion.thNotes")}
        </th>
        <th scope="col" className={`${th} w-[170px]`}>
          {t("discussion.thContextTags")}
        </th>
        {/* #703 butir 3 — Follow-up selama ini ADA di form dan ADA di
            basis data, tetapi tidak pernah punya kolom. */}
        <th scope="col" className={`${th} w-[240px]`}>
          {t("discussion.followUp")}
        </th>
        <th scope="col" className={`${th} w-[150px]`}>
          {t("discussion.thPic")}
        </th>
        <th scope="col" className={`${th} w-[130px]`}>
          {t("discussion.thTargetDate")}
        </th>
        {/* #704 butir 5 dan 6 — dua kolom baru, keduanya bisa jamak. */}
        <th scope="col" className={`${th} w-[170px]`}>
          {t("discussion.tautan")}
        </th>
        <th scope="col" className={`${th} w-[120px]`}>
          {t("discussion.gambar")}
        </th>
        <th scope="col" className={`${th} w-[90px] text-center`}>
          {t("discussion.thThread")}
        </th>
        <th scope="col" className={`${th} w-[110px] text-center`}>
          {t("discussion.status")}
        </th>
        <th scope="col" className={`${th} w-[90px] text-center`}>
          {t("discussion.action")}
        </th>
      </tr>
    </thead>
  );
};

interface KakiProps {
  tampil: number;
  total: number;
  halaman: number;
  totalPages: number;
  perHalaman: number;
  onPerHalaman: (jumlah: number) => void;
  onHalaman: (halaman: number) => void;
}

export const KakiPapan: React.FC<KakiProps> = ({
  tampil,
  total,
  halaman,
  totalPages,
  perHalaman,
  onPerHalaman,
  onHalaman,
}) => {
  const { t } = useTranslation();
  return (
    <div className="px-5 py-3 bg-surface-sunken/40 border-t border-border-subtle flex items-center justify-between text-[11px] text-content-subtle font-normal shrink-0">
      <div className="flex items-center gap-3">
        <span>{t("discussion.showingPoints", { shown: tampil, filtered: total, total })}</span>
        <ListPerPageSelect value={perHalaman} onChange={onPerHalaman} />
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onHalaman(Math.max(halaman - 1, 1))}
          disabled={halaman === 1}
          className="px-3 py-1.5 bg-surface border border-border-subtle rounded-md text-content-body hover:bg-surface-muted disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs cursor-pointer text-xs font-normal"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> {t("discussion.prev")}
        </button>
        <span className="px-3 py-1 bg-surface border border-border-subtle rounded-md text-primary shadow-2xs text-xs font-normal">
          {halaman} {t("common.of")} {totalPages}
        </span>
        <button
          onClick={() => onHalaman(Math.min(halaman + 1, totalPages))}
          disabled={halaman >= totalPages}
          className="px-3 py-1.5 bg-surface border border-border-subtle rounded-md text-content-body hover:bg-surface-muted disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs cursor-pointer text-xs font-normal"
        >
          {t("discussion.nextPage")} <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
