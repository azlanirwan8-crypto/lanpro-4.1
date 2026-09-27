import { useTranslation } from "react-i18next";
import React from "react";
import { Plus, Upload, Download } from "lucide-react";
import { QATestSuite } from "../../features/qa/types";
import { StyledDropdown } from "../ui/CommonComponents";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/CoreUI";

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
  caseAssignedTo,
  onAssignedToChange,
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("testCase.addTitle")}
      maxWidth="max-w-3xl"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("testCase.cancel")}
          </Button>
          {activeTab === "single" ? (
            <Button type="submit" form="add-case-single-form" className="gap-1.5">
              <Plus className="w-4 h-4" /> {t("qa.saveTestCase")}
            </Button>
          ) : (
            <Button type="submit" form="add-case-bulk-form" disabled={!uploadFile}>
              {t("testCase.processBulk")}
            </Button>
          )}
        </>
      }
    >
      <p className="text-xs text-content-subtle font-normal -mt-1 mb-4">{t("testCase.addHint")}</p>

      {/* Tab Switcher */}
      <div className="flex gap-2 p-1 bg-surface-muted rounded-md mb-4">
        <button
          type="button"
          onClick={() => onTabChange("single")}
          className={`flex-1 py-1.5 text-xs font-normal rounded-md transition-all cursor-pointer ${
            activeTab === "single"
              ? "bg-surface text-primary shadow-xs border border-border-subtle/80 font-medium"
              : "text-content-muted hover:text-content-body"
          }`}
        >
          {t("qa.singleInputManual")}
        </button>
        <button
          type="button"
          onClick={() => onTabChange("bulk")}
          className={`flex-1 py-1.5 text-xs font-normal rounded-md transition-all cursor-pointer ${
            activeTab === "bulk"
              ? "bg-surface text-primary shadow-xs border border-border-subtle/80 font-medium"
              : "text-content-muted hover:text-content-body"
          }`}
        >
          {t("qa.bulkUploadExcel")}
        </button>
      </div>

      {/* Target Suite Banner */}
      <div className="bg-primary-surface/5 border border-primary/10 px-4 py-2.5 rounded-md flex items-center justify-between text-xs mb-4">
        <span className="font-normal text-primary">
          {t("qa.targetModule")}{" "}
          <strong>{activeSuite ? activeSuite.name : t("qa.noModuleSelected")}</strong>
        </span>
        <span className="px-2.5 py-0.5 bg-primary-surface text-content-inverse font-normal rounded-full text-xs">
          {activeSuite ? activeSuite.phase : "SIT"}
        </span>
      </div>

      {activeTab === "single" ? (
        <form id="add-case-single-form" onSubmit={onSubmitSingle} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[calc(100vh-320px)] overflow-y-auto pr-1 custom-scrollbar">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs text-content-body font-normal block">
                  {t("testCase.caseTitle")} *
                </label>
                <input
                  type="text"
                  required
                  value={caseTitle}
                  onChange={(e) => onTitleChange(e.target.value)}
                  placeholder={t("testCase.caseTitlePlaceholder")}
                  className="w-full text-xs p-2.5 bg-surface-sunken border border-border-subtle rounded-md focus:border-primary focus:outline-none font-normal text-content-body"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-content-body font-normal block">
                  {t("testCase.priorityLevel")} *
                </label>
                <StyledDropdown
                  value={casePriority}
                  onChange={(val) =>
                    onPriorityChange(val as "High" | "Medium" | "Low" | "Critical")
                  }
                  options={[
                    { id: "Critical", label: "Critical Priority", color: "#DC2626" },
                    { id: "High", label: "High Priority", color: "#EF4444" },
                    { id: "Medium", label: "Medium Priority", color: "#F59E0B" },
                    { id: "Low", label: "Low Priority", color: "#10B981" },
                  ]}
                  type="priority"
                  masterData={[]}
                  className="w-full"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-content-body font-normal block">
                  {t("qa.assignPicTask")}
                </label>
                <input
                  type="text"
                  value={caseAssignedTo}
                  onChange={(e) => onAssignedToChange(e.target.value)}
                  placeholder="Contoh: dev@company.com"
                  className="w-full text-xs p-2.5 bg-surface-sunken border border-border-subtle rounded-md focus:border-primary focus:outline-none font-normal text-content-body"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs text-content-body font-normal block">
                  {t("qa.testSteps")} *
                </label>
                <textarea
                  required
                  rows={3}
                  value={caseSteps}
                  onChange={(e) => onStepsChange(e.target.value)}
                  placeholder={t("testCase.testStepsPlaceholder")}
                  className="w-full text-xs p-2.5 bg-surface-sunken border border-border-subtle rounded-md focus:border-primary focus:outline-none resize-none font-normal text-content-body"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-content-body font-normal block">
                  {t("qa.expectedResult")} *
                </label>
                <textarea
                  required
                  rows={3}
                  value={caseExpected}
                  onChange={(e) => onExpectedChange(e.target.value)}
                  placeholder={t("testCase.expectedPlaceholder")}
                  className="w-full text-xs p-2.5 bg-surface-sunken border border-border-subtle rounded-md focus:border-primary focus:outline-none font-normal text-content-body"
                />
              </div>
            </div>
          </div>
        </form>
      ) : (
        <form id="add-case-bulk-form" onSubmit={onSubmitBulk} className="space-y-4">
          <div className="flex items-center justify-between bg-primary/10 border border-primary/30 p-3 rounded-md">
            <div>
              <h4 className="text-xs font-normal text-primary">{t("testCase.needTemplate")}</h4>
              <p className="text-xs sm:text-[10px] text-content-muted font-normal">
                {t("testCase.downloadStructure")}
              </p>
            </div>
            <button
              type="button"
              onClick={onDownloadTemplate}
              className="px-3.5 py-1.5 bg-primary-surface hover:bg-primary-surface-hover text-content-inverse text-xs font-normal rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t("testCase.downloadTemplate")}</span>
            </button>
          </div>

          <div className="border-2 border-dashed border-border-subtle hover:border-primary rounded-md p-8 text-center space-y-3 transition-colors bg-surface-sunken/50">
            <Upload className="w-10 h-10 text-primary mx-auto" />
            <div>
              <p className="text-xs font-normal text-content-body">
                {t("qa.uploadAnExcelFileXlsx")}
              </p>
              <p className="text-xs sm:text-[10px] text-content-subtle mt-1 font-normal">
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
              className="inline-block px-4 py-2 bg-primary-surface/10 hover:bg-primary-surface/20 text-primary text-xs font-normal rounded-md cursor-pointer transition-colors"
            >
              {uploadFile ? uploadFile.name : t("qa.chooseExcel")}
            </label>
          </div>
        </form>
      )}
    </Modal>
  );
};
