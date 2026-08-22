import { useTranslation } from "react-i18next";
import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, XCircle, Upload, Download } from "lucide-react";
import { QATestSuite } from "../../features/qa/types";
import { StyledDropdown } from "../ui/CommonComponents";

interface AddCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSuite: QATestSuite | null;
  activeTab: "single" | "bulk";
  onTabChange: (tab: "single" | "bulk") => void;

  // Single input state
  caseTitle: string;
  onTitleChange: (title: string) => void;
  casePriority: "High" | "Medium" | "Low" | "Critical";
  onPriorityChange: (priority: "High" | "Medium" | "Low" | "Critical") => void;
  caseAssignedTo: string;
  onAssignedToChange: (assignedTo: string) => void;
  caseSteps: string;
  onStepsChange: (steps: string) => void;
  caseExpected: string;
  onExpectedChange: (expected: string) => void;
  onSubmitSingle: (e: React.FormEvent) => void;

  // Bulk upload state
  uploadFile: File | null;
  onFileChange: (file: File | null) => void;
  onSubmitBulk: (e: React.FormEvent) => void;
  onDownloadTemplate: () => void;
}

export const AddCaseModal: React.FC<AddCaseModalProps> = ({
  isOpen,
  onClose,
  activeSuite,
  activeTab,
  onTabChange,
  caseTitle,
  onTitleChange,
  casePriority,
  onPriorityChange,
  caseSteps,
  onStepsChange,
  caseExpected,
  onExpectedChange,
  onSubmitSingle,
  uploadFile,
  onFileChange,
  onSubmitBulk,
  onDownloadTemplate,
}) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay/60 backdrop-blur-xs">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-surface border border-border-subtle/80 rounded-md p-6 max-w-3xl w-full shadow-2xl space-y-4"
        >
          <div className="flex justify-between items-center pb-3 border-b border-border-faint">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-md bg-primary-surface/10 text-primary flex items-center justify-center font-medium">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-content-strong uppercase tracking-wider">
                  {t("testCase.addTitle")}
                </h3>
                <p className="text-xs sm:text-[11px] text-content-subtle font-medium">
                  {t("testCase.addHint")}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-surface-muted text-content-subtle hover:text-content-secondary transition-colors cursor-pointer"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="flex gap-2 p-1 bg-surface-muted rounded-md">
            <button
              type="button"
              onClick={() => onTabChange("single")}
              className={`flex-1 py-2 text-xs font-medium uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                activeTab === "single"
                  ? "bg-surface text-primary shadow-xs border border-border-subtle/80"
                  : "text-content-muted hover:text-content-body"
              }`}
            >
              Single Input (Manual)
            </button>
            <button
              type="button"
              onClick={() => onTabChange("bulk")}
              className={`flex-1 py-2 text-xs font-medium uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                activeTab === "bulk"
                  ? "bg-surface text-primary shadow-xs border border-border-subtle/80"
                  : "text-content-muted hover:text-content-body"
              }`}
            >
              Bulk Upload (Excel)
            </button>
          </div>

          {/* Target Suite Banner */}
          <div className="bg-primary-surface/5 border border-primary/10 px-4 py-2.5 rounded-md flex items-center justify-between text-xs">
            <span className="font-medium text-primary">
              Modul Target:{" "}
              <strong>{activeSuite ? activeSuite.name : "Belum ada modul terpilih"}</strong>
            </span>
            <span className="px-2.5 py-0.5 bg-primary-surface text-content-inverse font-medium rounded-full text-xs sm:text-[10px]">
              {activeSuite ? activeSuite.phase : "SIT"}
            </span>
          </div>

          {/* Single Input Tab */}
          {activeTab === "single" ? (
            <form onSubmit={onSubmitSingle} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[calc(100vh-320px)] overflow-y-auto pr-1 custom-scrollbar">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-[10px] text-content-muted font-medium uppercase tracking-wider block">
                      {t("testCase.caseTitle")} *
                    </label>
                    <input
                      type="text"
                      required
                      value={caseTitle}
                      onChange={(e) => onTitleChange(e.target.value)}
                      placeholder={t("testCase.caseTitlePlaceholder")}
                      className="w-full text-xs p-2.5 bg-surface-sunken border border-border-subtle rounded-md focus:border-primary focus:outline-none font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-[10px] text-content-muted font-medium uppercase tracking-wider block">
                      {t("testCase.priorityLevel")} *
                    </label>
                    <StyledDropdown
                      value={casePriority}
                      onChange={(val) => onPriorityChange(val as any)}
                      options={[
                        {
                          id: "Critical",
                          label: "Critical Priority",
                          icon: "Flame",
                          color: "#EF4444",
                        },
                        { id: "High", label: "High Priority", icon: "ChevronUp", color: "#F97316" },
                        {
                          id: "Medium",
                          label: "Medium Priority",
                          icon: "Circle",
                          color: "#F59E0B",
                        },
                        { id: "Low", label: "Low Priority", icon: "ChevronDown", color: "#10B981" },
                      ]}
                      masterData={[]}
                      className="w-full"
                      buttonClassName="h-10 bg-surface-sunken rounded-md border border-border-subtle hover:border-border-subtle px-3 text-xs font-medium text-content-body"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-[10px] text-content-muted font-medium uppercase tracking-wider block">
                      {t("testCase.testSteps")} *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={caseSteps}
                      onChange={(e) => onStepsChange(e.target.value)}
                      placeholder={t("testCase.testStepsPlaceholder")}
                      className="w-full text-xs p-2.5 bg-surface-sunken border border-border-subtle rounded-md focus:border-primary focus:outline-none font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-[10px] text-content-muted font-medium uppercase tracking-wider block">
                      {t("testCase.expectedResult")} *
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={caseExpected}
                      onChange={(e) => onExpectedChange(e.target.value)}
                      placeholder={t("testCase.expectedPlaceholder")}
                      className="w-full text-xs p-2.5 bg-surface-sunken border border-border-subtle rounded-md focus:border-primary focus:outline-none font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-border-faint">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-surface-muted hover:bg-surface-strong text-content-body text-xs font-medium uppercase tracking-wider rounded-md cursor-pointer"
                >
                  {t("testCase.cancel")}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary-surface hover:bg-primary-surface-hover text-content-inverse text-xs font-medium uppercase tracking-wider rounded-md shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" /> Simpan Test Case
                </button>
              </div>
            </form>
          ) : (
            // Bulk Upload Tab
            <form onSubmit={onSubmitBulk} className="space-y-4">
              {/* Download Template Banner */}
              <div className="flex items-center justify-between bg-indigo-500/10 border border-indigo-500/30 p-3 rounded-md">
                <div>
                  <h4 className="text-xs font-medium text-primary">{t("testCase.needTemplate")}</h4>
                  <p className="text-xs sm:text-[10px] text-content-muted font-medium">
                    {t("testCase.downloadStructure")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onDownloadTemplate}
                  className="px-3.5 py-1.5 bg-primary-surface hover:bg-primary-surface-hover text-content-inverse text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t("testCase.downloadTemplate")}</span>
                </button>
              </div>

              <div className="border-2 border-dashed border-border-subtle hover:border-primary rounded-md p-8 text-center space-y-3 transition-colors bg-surface-sunken/50">
                <Upload className="w-10 h-10 text-primary mx-auto" />
                <div>
                  <p className="text-xs font-medium text-content-body">
                    Unggah berkas Excel (.xlsx / .csv)
                  </p>
                  <p className="text-xs sm:text-[10px] text-content-subtle mt-1">
                    {t("testCase.columnFormat")}
                  </p>
                </div>
                <input
                  type="file"
                  accept=".xlsx, .csv"
                  onChange={(e) => onFileChange(e.target.files?.[0] || null)}
                  className="hidden"
                  id="bulk_upload_input"
                />
                <label
                  htmlFor="bulk_upload_input"
                  className="inline-block px-4 py-2 bg-primary-surface/10 hover:bg-primary-surface/20 text-primary text-xs font-medium rounded-md cursor-pointer transition-colors"
                >
                  {uploadFile ? uploadFile.name : "Pilih Berkas Excel"}
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-border-faint">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-surface-muted hover:bg-surface-strong text-content-body text-xs font-medium uppercase tracking-wider rounded-md cursor-pointer"
                >
                  {t("testCase.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={!uploadFile}
                  className="px-5 py-2 bg-primary-surface hover:bg-primary-surface-hover text-content-inverse text-xs font-medium uppercase tracking-wider rounded-md shadow-xs disabled:opacity-50 cursor-pointer active:scale-95"
                >
                  {t("testCase.processBulk")}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
