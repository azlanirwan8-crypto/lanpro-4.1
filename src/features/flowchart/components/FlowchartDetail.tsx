/**
 * Tab "Detail" dokumen flowchart (#583).
 *
 * Empat blok yang pemilik proyek tulis di slide BRD-nya — masalah, titik nyeri,
 * cara, manfaat — dulu tidak punya tempat sama sekali di aplikasi: yang ada
 * hanya satu kotak "Architecture Description". Tampilannya sengaja mengikuti
 * urutan baca slide itu, bukan warna slide: isinya teks panjang, jadi yang
 * dibutuhkan adalah ruang dan label yang jelas.
 */
import { useTranslation } from "react-i18next";
import React from "react";
import { CircleAlert, Lightbulb, Target, TrendingUp, Workflow } from "lucide-react";
import type { KonteksFlowchart } from "../types";
import { adaKonteks } from "../types";

interface FlowchartDetailProps {
  konteks?: KonteksFlowchart;
  kategori?: string;
  judulEpic?: string;
  onEdit: () => void;
}

export const FlowchartDetail: React.FC<FlowchartDetailProps> = ({
  konteks,
  kategori,
  judulEpic,
  onEdit,
}) => {
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
        {kategori && (
          <span className="px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/30 font-medium uppercase">
            {kategori}
          </span>
        )}
        {judulEpic && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-sunken border border-border-subtle text-content-body font-medium">
            <Workflow className="w-3 h-3 text-primary" />
            {judulEpic}
          </span>
        )}
        <button
          type="button"
          onClick={onEdit}
          className="ml-auto px-3 py-1.5 rounded-lg bg-surface-muted hover:bg-surface-strong text-content-body text-[11px] font-medium transition-colors"
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
              className="bg-surface border border-border-subtle rounded-xl p-4 shadow-soft flex flex-col gap-2"
            >
              <h4 className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-content-subtle">
                <Ikon className="w-3.5 h-3.5 text-primary" />
                {judul}
              </h4>
              {teks ? (
                <p className="text-xs leading-relaxed text-content-body whitespace-pre-line">
                  {teks}
                </p>
              ) : (
                <p className="text-xs text-content-subtle">{t("flowchart.blokKosong")}</p>
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
