import React from "react";
import { useTranslation } from "react-i18next";
import { Workflow, Calendar, Edit3, Trash2, ArrowRight } from "lucide-react";
import type { FlowchartData } from "../types";
import type { Task } from "../../../types";
import { tampilanNamaPembuat } from "../lib/authorIdentity";
import { LabelChip } from "../../../components/ui/CommonComponents";

interface FlowchartMobileCardViewProps {
  flowcharts: FlowchartData[];
  tasks: Task[];
  onSelectFlowchart: (id: string) => void;
  onEditFlowchart: (flow: FlowchartData, e: React.MouseEvent) => void;
  onDeleteFlowchart: (id: string, e: React.MouseEvent) => void;
  canModifyFlowchart: (flow: FlowchartData) => boolean;
  getResolvedAuthor: () => string;
  onOpenCreate: () => void;
  /** #797 — sama seperti di tabel: kartu HP adalah permukaan yang sama. */
  bukaRincianIsu: (task: Task) => void;
}

export const FlowchartMobileCardView: React.FC<FlowchartMobileCardViewProps> = ({
  flowcharts,
  tasks,
  onSelectFlowchart,
  onEditFlowchart,
  onDeleteFlowchart,
  canModifyFlowchart,
  getResolvedAuthor,
  onOpenCreate,
  bukaRincianIsu,
}) => {
  const { t } = useTranslation();

  /**
   * Isu yang tertaut, BUKAN string labelnya (#797). Yang dulu dikembalikan
   * hanyalah teks, jadi kartu ini secara fisik tidak bisa membuka rincian isu
   * walau pintunya sudah ada di tabel desktop.
   */
  const isuTertaut = (idIsu?: string) => (idIsu ? tasks.find((t) => t.id === idIsu) : undefined);

  const formatDate = (date: any) => {
    if (!date) return "-";
    try {
      return new Date(date).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  };

  if (flowcharts.length === 0) {
    return (
      <div className="p-8 text-center bg-surface border border-border-subtle/80 rounded-lg shadow-2xs">
        <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-3 text-primary shadow-2xs">
          <Workflow className="w-6 h-6" />
        </div>
        <p className="font-medium text-content-strong text-sm">{t("flowchart.emptyTitle")}</p>
        <p className="text-xs text-content-subtle mt-1 mb-3">{t("flowchart.emptyHint")}</p>
        <button
          type="button"
          onClick={onOpenCreate}
          className="btn-animation waves-effect waves-light btn-primary h-8 px-3 rounded-md text-xs font-medium cursor-pointer"
        >
          {t("flowchart.addFlowchart")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {flowcharts.map((flow, index) => {
        const canModify = canModifyFlowchart(flow);
        const isu = isuTertaut(flow.epicTaskId);
        const author = tampilanNamaPembuat(flow, getResolvedAuthor());

        return (
          <div
            key={flow.id || index}
            onClick={() => onSelectFlowchart(flow.id)}
            className="p-4 bg-surface rounded-lg border border-border-subtle/80 shadow-2xs hover:border-primary/40 hover:shadow-xs transition-all cursor-pointer flex flex-col gap-3"
          >
            {/* Header: Title & Action buttons */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {/* #647 — nama dan deskripsi dipecah dua baris dengan elipsis, jadi
                    sisa judul/keterangan tidak pernah tampil dan tidak ada cara
                    membukanya di kartu ini. Kartu boleh memanjang. */}
                <h4 className="text-sm font-semibold text-content-strong whitespace-normal break-words leading-snug">
                  {flow.name || "Untitled Diagram"}
                </h4>
                {flow.description && (
                  <p className="text-xs text-content-muted whitespace-pre-wrap break-words mt-1 leading-relaxed text-justify">
                    {flow.description}
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div
                className="flex items-center gap-1 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                {canModify && (
                  <button
                    type="button"
                    onClick={(e) => onEditFlowchart(flow, e)}
                    aria-label={t("flowchart.editDiagram") || "Edit Diagram"}
                    className="p-1.5 rounded-md hover:bg-surface-sunken text-content-subtle hover:text-warning-text transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}

                {canModify && (
                  <button
                    type="button"
                    onClick={(e) => onDeleteFlowchart(flow.id, e)}
                    aria-label={t("flowchart.deleteDiagram") || "Delete Diagram"}
                    className="p-1.5 rounded-md hover:bg-surface-sunken text-content-subtle hover:text-danger-text transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Category badge & linked issue */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {flow.category && <LabelChip kelompok="jenis_dokumen" nilai={flow.category} />}

              {/* #797 — `<button>` + `stopPropagation`, sama seperti di tabel:
                  tanpa yang kedua, klik chip ikut naik ke kartu dan membuka
                  kanvas. Efek yang harus dibaca: tautan YATIM (epicTaskId masih
                  diisi tapi isunya sudah dihapus) dulu menampilkan uuid mentah
                  di sini; sekarang tidak menampilkan apa pun — seisi dengan sel
                  tabel yang sudah lama membuang "-". Menampilkan uuid bukan
                  informasi, itu kebocoran kunci internal ke layar. */}
              {isu && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    bukaRincianIsu(isu);
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-sunken border border-border-subtle text-content-muted text-[11px] font-medium whitespace-normal break-words max-w-full cursor-pointer transition-colors hover:bg-surface-muted"
                  title={t("flowchart.bukaRincianIsu", { judul: isu.title })}
                >
                  <Workflow className="w-3 h-3 text-primary shrink-0" />
                  <span>{isu.title}</span>
                </button>
              )}
            </div>

            {/* Footer: Author, Updated date & Open Canvas button */}
            <div className="pt-2 border-t border-border-faint flex items-center justify-between gap-2 text-xs text-content-subtle">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[11px]">{t("meetings.thAuthor")}:</span>
                <span className="font-medium text-content whitespace-nowrap">{author}</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1 text-[11px]">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(flow.lastEditedAt || flow.createdAt)}</span>
                </div>

                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  <span>Buka</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
