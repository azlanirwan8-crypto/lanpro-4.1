/**
 * Modal buat/sunting metadata dokumen flowchart (#433 gelombang 1).
 *
 * #583 — form ini dulu menanyakan "External Link" dan "Architecture
 * Description" sementara yang pemilik proyek butuhkan adalah empat blok yang
 * ia tulis di slide: Problem Statement, Pain Point, How, Benefit. Kedua field
 * lama dihapus; empat blok baru disimpan di payload `canvasData` yang sama
 * dengan isi papan (lihat flowchart.service.ts), tanpa kolom database baru.
 */
import { useTranslation } from "react-i18next";
import React from "react";
import { CircleAlert, Layers, Lightbulb, Target, TrendingUp, Workflow, X } from "lucide-react";
import { StyledDropdown } from "../../../components/ui/CommonComponents";
import type { KonteksFlowchart } from "../types";

interface EpicOption {
  id: string;
  key?: string;
  title: string;
}

interface FlowchartDocumentModalProps {
  open: boolean;
  modalMode: "create" | "edit";
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  flowName: string;
  setFlowName: (v: string) => void;
  flowCategory: string;
  setFlowCategory: (v: string) => void;
  opsiKategoriDokumen: { id: string; label: string }[];
  flowEpicId: string;
  setFlowEpicId: (v: string) => void;
  availableEpics: EpicOption[];
  flowKonteks: KonteksFlowchart;
  setFlowKonteks: (v: KonteksFlowchart) => void;
}

const INPUT =
  "w-full text-xs font-normal bg-surface-sunken border border-border-subtle rounded-lg p-2.5 text-content-strong placeholder:text-content-subtle focus:bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all";

const LABEL = "flex items-center gap-1.5 text-[11px] font-medium text-content-body";

export const FlowchartDocumentModal: React.FC<FlowchartDocumentModalProps> = ({
  open,
  modalMode,
  onClose,
  onSubmit,
  flowName,
  setFlowName,
  flowCategory,
  setFlowCategory,
  opsiKategoriDokumen,
  flowEpicId,
  setFlowEpicId,
  availableEpics,
  flowKonteks,
  setFlowKonteks,
}) => {
  const { t } = useTranslation();
  if (!open) return null;

  const blok: {
    isi: keyof KonteksFlowchart;
    judul: string;
    petunjuk: string;
    Ikon: typeof Target;
  }[] = [
    {
      isi: "masalah",
      judul: t("flowchart.blockMasalah"),
      petunjuk: t("flowchart.blockMasalahHint"),
      Ikon: Target,
    },
    {
      isi: "titikNyeri",
      judul: t("flowchart.blockTitikNyeri"),
      petunjuk: t("flowchart.blockTitikNyeriHint"),
      Ikon: CircleAlert,
    },
    {
      isi: "cara",
      judul: t("flowchart.blockCara"),
      petunjuk: t("flowchart.blockCaraHint"),
      Ikon: Lightbulb,
    },
    {
      isi: "manfaat",
      judul: t("flowchart.blockManfaat"),
      petunjuk: t("flowchart.blockManfaatHint"),
      Ikon: TrendingUp,
    },
  ];

  return (
    <div className="fixed inset-0 bg-overlay/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-border-subtle w-full max-w-2xl rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[88vh] text-content-strong">
        <div className="px-5 py-4 bg-surface border-b border-border-subtle flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <h3 className="font-medium text-sm text-content">
                {modalMode === "create"
                  ? t("flowchart.addFlowchartData")
                  : t("flowchart.editDocDetail")}
              </h3>
              <span className="text-[11px] text-content-subtle">
                {t("flowchart.modalSubtitle")}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-surface-muted rounded-lg text-content-subtle hover:text-content-secondary transition-all"
            aria-label={t("flowchart.cancel")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="p-5 space-y-5 overflow-y-auto flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={LABEL}>
                  {t("flowchart.docNameLabel")} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={t("flowchart.docNamePlaceholder")}
                  value={flowName}
                  onChange={(e) => setFlowName(e.target.value)}
                  className={INPUT}
                />
              </div>

              <div className="space-y-1.5">
                <label className={LABEL}>
                  {t("flowchart.docCategoryLabel")} <span className="text-rose-500">*</span>
                </label>
                <StyledDropdown
                  value={flowCategory}
                  onChange={(val: string) => setFlowCategory(val)}
                  options={opsiKategoriDokumen}
                  type="jenis_dokumen"
                  masterData={[]}
                  className="w-full"
                  buttonClassName="w-full text-xs font-normal bg-surface-sunken border border-border-subtle rounded-lg p-2.5 text-content-strong"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className={LABEL}>
                <Workflow className="w-3.5 h-3.5 text-primary" />
                {t("flowchart.linkedEpicLabel")}
              </label>
              <StyledDropdown
                value={flowEpicId}
                onChange={setFlowEpicId}
                options={[
                  { id: "", label: t("flowchart.connectWithEpic") },
                  ...availableEpics.map((epic) => ({
                    id: epic.id,
                    label: `[${epic.key}] ${epic.title}`,
                  })),
                ]}
                buttonClassName="w-full text-xs font-normal bg-surface-sunken border border-border-subtle rounded-lg p-2.5 text-left text-content-strong"
              />
              <p className="text-[10px] text-content-subtle leading-normal">
                {availableEpics.length > 0
                  ? t("flowchart.linkedEpicHint")
                  : t("flowchart.linkedEpicKosong")}
              </p>
            </div>

            <div className="border-t border-border-faint pt-4 space-y-3">
              <h4 className="text-[11px] font-medium uppercase tracking-wide text-content-subtle">
                {t("flowchart.detailDokumen")}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {blok.map(({ isi, judul, petunjuk, Ikon }) => (
                  <div key={isi} className="space-y-1.5">
                    <label className={LABEL}>
                      <Ikon className="w-3.5 h-3.5 text-primary" />
                      {judul}
                    </label>
                    <textarea
                      rows={3}
                      placeholder={petunjuk}
                      value={flowKonteks[isi]}
                      onChange={(e) => setFlowKonteks({ ...flowKonteks, [isi]: e.target.value })}
                      className={`${INPUT} resize-y leading-relaxed`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="px-5 py-4 flex justify-between items-center gap-2 border-t border-border-subtle bg-surface-sunken/50 shrink-0">
            <span className="text-[10px] text-content-subtle">{t("flowchart.requiredNote")}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-surface-muted hover:bg-surface-strong font-medium text-content-body transition-all text-xs"
              >
                {t("flowchart.cancel")}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary-surface hover:bg-primary-surface-hover text-content-inverse font-medium rounded-lg text-xs shadow-xs transition-all"
              >
                {modalMode === "create"
                  ? t("flowchart.createDocument")
                  : t("flowchart.saveChanges")}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
