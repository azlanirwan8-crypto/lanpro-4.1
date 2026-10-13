/**
 * Tab "Detail" dokumen flowchart (#583), aksen per blok (#717).
 *
 * Empat blok yang pemilik proyek tulis di slide BRD-nya — masalah, titik nyeri,
 * cara, manfaat — dulu tidak punya tempat sama sekali di aplikasi: yang ada
 * hanya satu kotak "Architecture Description". Tampilannya mengikuti urutan baca
 * slide itu.
 *
 * #717 — permintaannya spesifik: "berwarna card card yang ada di detail itu".
 * Warna datang dari TOKEN yang sudah ada di `src/index.css` (`danger`,
 * `warning`, `primary`, `success` beserta varian `-text`), bukan dari palet
 * Tailwind: palet tidak punya padanan mode gelap (§22). Aksen dipasang sebagai
 * PITA di tepi kiri kartu, bukan sebagai `border-l-<warna>`, karena `cn()` di
 * `lib/utils.ts` hanya merantai string — warna semua-sisi dan warna satu sisi
 * akan bersaing dan pemenangnya urutan stylesheet, bukan maksud penulisnya.
 *
 * `judulTautan` sengaja tidak diterima komponen ini lagi: kepala halaman
 * (`FlowchartContainer.tsx:3889`) sudah menampilkan isu yang ditautkan, dan
 * memunculkannya sekali lagi di baris chip membuat baris itu terbaca sebagai
 * daftar tag, bukan sebagai kepala kartu.
 */
import { useTranslation } from "react-i18next";
import React from "react";
import { CircleAlert, Lightbulb, Target, TrendingUp } from "lucide-react";
import { LabelChip } from "../../../components/ui/CommonComponents";
import { cn } from "../../../lib/utils";
import { KARTU_SECTION } from "../../../components/ui/gayaForm";
import type { KonteksFlowchart } from "../types";
import { adaKonteks } from "../types";

interface FlowchartDetailProps {
  konteks?: KonteksFlowchart;
  kategori?: string;
  onEdit: () => void;
}

/** Satu aksen per blok: teks, tile ikon, dan garis tile-nya. */
const AKSEN = {
  masalah: "text-danger-text bg-danger/10 border-danger/30",
  titikNyeri: "text-warning-text bg-warning/10 border-warning/30",
  cara: "text-primary bg-primary/10 border-primary/30",
  manfaat: "text-success-text bg-success/10 border-success/30",
} as const;

/** Pita kiri memakai warna penuh, bukan `-text`: ia garis, bukan teks. */
const PITA = {
  masalah: "bg-danger",
  titikNyeri: "bg-warning",
  cara: "bg-primary",
  manfaat: "bg-success",
} as const;

export const FlowchartDetail: React.FC<FlowchartDetailProps> = ({ konteks, kategori, onEdit }) => {
  const { t } = useTranslation();

  const blok = [
    { isi: "masalah", judul: t("flowchart.blockMasalah"), Ikon: Target },
    { isi: "titikNyeri", judul: t("flowchart.blockTitikNyeri"), Ikon: CircleAlert },
    { isi: "cara", judul: t("flowchart.blockCara"), Ikon: Lightbulb },
    { isi: "manfaat", judul: t("flowchart.blockManfaat"), Ikon: TrendingUp },
  ] as const;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        {kategori && <LabelChip kelompok="jenis_dokumen" nilai={kategori} />}
        <button
          type="button"
          onClick={onEdit}
          className="ml-auto px-3 py-1.5 rounded-lg bg-surface-muted hover:bg-surface-strong text-content-body text-[11px] font-medium transition-colors cursor-pointer"
        >
          {t("flowchart.editDetail")}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {blok.map(({ isi, judul, Ikon }) => {
          const teks = (konteks?.[isi] || "").trim();
          return (
            <section
              key={isi}
              className={cn(KARTU_SECTION, "relative overflow-hidden p-4 pl-5 flex flex-col gap-2")}
            >
              <span aria-hidden className={cn("absolute left-0 top-0 bottom-0 w-1", PITA[isi])} />
              <h4 className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.05em] text-content-subtle">
                <span
                  className={cn(
                    "w-6 h-6 rounded-md border inline-flex items-center justify-center shrink-0",
                    AKSEN[isi]
                  )}
                >
                  <Ikon className="w-3.5 h-3.5" />
                </span>
                {judul}
              </h4>
              {teks ? (
                <p className="text-xs leading-relaxed text-content-body whitespace-pre-line pl-8">
                  {teks}
                </p>
              ) : (
                <p className="text-xs italic text-content-subtle pl-8">
                  {t("flowchart.blokKosong")}
                </p>
              )}
            </section>
          );
        })}
      </div>

      {!adaKonteks(konteks) && (
        <p className="text-[11px] text-content-subtle">{t("flowchart.detailKosongHint")}</p>
      )}
    </div>
  );
};
