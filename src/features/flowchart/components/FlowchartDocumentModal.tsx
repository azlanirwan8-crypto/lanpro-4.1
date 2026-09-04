/**
 * Modal buat/sunting metadata dokumen flowchart (#433 gelombang 1).
 * JSX dipindah verbatim dari FlowchartContainer — logika submit tetap di induk.
 */
import { useTranslation } from "react-i18next";
import React from "react";
import { Layers, Workflow, X } from "lucide-react";
import { StyledDropdown } from "../../../components/ui/CommonComponents";

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
  flowExternalUrl: string;
  setFlowExternalUrl: (v: string) => void;
  flowEpicId: string;
  setFlowEpicId: (v: string) => void;
  availableEpics: EpicOption[];
  flowDescription: string;
  setFlowDescription: (v: string) => void;
}

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
  flowExternalUrl,
  setFlowExternalUrl,
  flowEpicId,
  setFlowEpicId,
  availableEpics,
  flowDescription,
  setFlowDescription,
}) => {
  const { t } = useTranslation();
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-overlay/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-border-subtle w-full max-w-md rounded-xl shadow-xl overflow-hidden text-content-strong">
        <div className="px-5 py-4 bg-surface border-b border-border-subtle flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-surface/10 text-primary flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="font-medium text-sm text-content">
              {modalMode === "create"
                ? t("flowchart.addFlowchartData")
                : t("flowchart.editDocDetail")}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-surface-muted rounded-lg text-content-subtle hover:text-content-secondary transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-5 space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-xs sm:text-[11px] font-medium text-content-body">
              {t("flowchart.docNameLabel")} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder={t("flowchart.docNamePlaceholder")}
              value={flowName}
              onChange={(e) => setFlowName(e.target.value)}
              className="w-full text-xs font-normal bg-surface-sunken border border-border-subtle rounded-lg p-2.5 text-content-strong placeholder:text-content-subtle focus:bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs sm:text-[11px] font-medium text-content-body">
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

          <div className="space-y-1.5">
            <label className="text-xs sm:text-[11px] font-medium text-content-body">
              {t("flowchart.externalLink")}
            </label>
            <input
              type="url"
              placeholder={t("flowchart.docLinkPlaceholder")}
              value={flowExternalUrl}
              onChange={(e) => setFlowExternalUrl(e.target.value)}
              className="w-full text-xs font-normal bg-surface-sunken border border-border-subtle rounded-lg p-2.5 text-content-strong placeholder:text-content-subtle focus:bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
            />
            <p className="text-xs sm:text-[10px] text-content-subtle leading-normal">
              {t("flowchart.externalLinkHint")}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs sm:text-[11px] font-medium text-content-body flex items-center gap-1.5">
              <Workflow className="w-3.5 h-3.5 text-primary" /> {t("flowchart.linkedEpicLabel")}
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
            <p className="text-xs sm:text-[10px] text-content-subtle leading-relaxed">
              {t("flowchart.linkedEpicHint")}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs sm:text-[11px] font-medium text-content-body">
              {t("flowchart.architectureDesc")}
            </label>
            <textarea
              placeholder={t("flowchart.architecturePlaceholder")}
              value={flowDescription}
              onChange={(e) => setFlowDescription(e.target.value)}
              className="w-full h-24 text-xs font-normal bg-surface-sunken border border-border-subtle rounded-lg p-2.5 text-content-strong placeholder:text-content-subtle focus:bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </div>

          <div className="pt-3 flex justify-end items-center gap-2 border-t border-border-faint">
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
              {modalMode === "create" ? t("flowchart.createDocument") : t("flowchart.saveChanges")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
