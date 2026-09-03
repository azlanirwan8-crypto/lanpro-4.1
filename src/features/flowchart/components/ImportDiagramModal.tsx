/**
 * Dialog impor diagram: Draw.io (XML), Miro (JSON/CSV), dan format cadangan
 * bawaan aplikasi.
 *
 * Sebelumnya berupa blok JSX di dalam FlowchartContainer. Dipindah verbatim;
 * yang berubah hanya cara ia memperoleh data — dari closure atas state induk
 * menjadi props eksplisit.
 *
 * Pasangannya di lapisan lain: parser yang mengubah isi berkas menjadi node dan
 * edge ada di `lib/importers.ts`, sedangkan komponen ini hanya mengurus
 * tampilan dan interaksi. Berkasnya sendiri dibaca oleh `handleProcessImportFile`
 * di container, karena ia perlu menulis ke state hasil parse.
 */
import { useTranslation } from "react-i18next";
import React from "react";
import { Upload } from "lucide-react";
import { cn } from "../../../lib/utils";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/CoreUI";

/** Bentuk hasil parse yang ditampilkan sebagai ringkasan sebelum diterapkan. */
type ParsedImportData = { nodes: any[]; edges: any[] } | null;

interface ImportDiagramModalProps {
  isImportModalOpen: boolean;
  setIsImportModalOpen: (value: boolean) => void;
  /** Format asal yang sedang dipilih; menentukan petunjuk dan ekstensi yang diterima. */
  importType: "native" | "drawio" | "miro";
  setImportType: (value: "native" | "drawio" | "miro") => void;
  parsedImportData: ParsedImportData;
  setParsedImportData: (value: ParsedImportData) => void;
  parsedFilename: string;
  setParsedFilename: (value: string) => void;
  dragOverImport: boolean;
  setDragOverImport: (value: boolean) => void;
  /** Membaca berkas lalu mengisi parsedImportData. Tinggal di container. */
  handleProcessImportFile: (file: File) => void;
  /** Menambahkan hasil impor ke kanvas yang sudah ada. */
  handleApplyImportMerge: () => void;
  /** Mengganti seluruh isi kanvas dengan hasil impor. */
  handleApplyImportReplace: () => void;
}

export const ImportDiagramModal: React.FC<ImportDiagramModalProps> = ({
  isImportModalOpen,
  setIsImportModalOpen,
  importType,
  setImportType,
  parsedImportData,
  setParsedImportData,
  parsedFilename,
  setParsedFilename,
  dragOverImport,
  setDragOverImport,
  handleProcessImportFile,
  handleApplyImportMerge,
  handleApplyImportReplace,
}) => {
  const { t } = useTranslation();
  const closeImport = () => {
    setIsImportModalOpen(false);
    setParsedImportData(null);
  };

  return (
    <Modal
      isOpen={isImportModalOpen}
      onClose={closeImport}
      title={t("importDiagram.title")}
      maxWidth="max-w-xl"
      className="select-none"
      bodyClassName="space-y-4 text-xs"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={closeImport}>
            {t("importDiagram.close")}
          </Button>
          {parsedImportData ? (
            <>
              <Button type="button" variant="soft" onClick={handleApplyImportMerge}>
                {t("importDiagram.mergeCanvas")}
              </Button>
              <Button type="button" onClick={handleApplyImportReplace}>
                {t("importDiagram.replaceCanvas")}
              </Button>
            </>
          ) : (
            <span className="text-xs sm:text-[10px] text-content-subtle italic font-medium mr-auto">
              {t("importDiagram.pickAbove")}
            </span>
          )}
        </>
      }
    >
      {/* Platforms Option Slider */}
      <div className="grid grid-cols-3 gap-2 shrink-0">
        <button
          type="button"
          onClick={() => {
            setImportType("drawio");
            setParsedImportData(null);
            setParsedFilename("");
          }}
          className={cn(
            "p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5",
            importType === "drawio"
              ? "bg-orange-500/10 border-orange-500/30 text-orange-800 ring-2 ring-orange-500/20 font-medium"
              : "border-border-subtle hover:bg-surface-sunken  hover:border-border-subtle font-medium"
          )}
        >
          <span className="text-xl">📊</span>
          <div className="text-xs sm:text-[10px] font-normal uppercase tracking-wider">
            Draw.io / XML
          </div>
          <div className="text-xs sm:text-[11px] text-content-muted font-medium">
            {t("importDiagram.drawioFile")}
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setImportType("miro");
            setParsedImportData(null);
            setParsedFilename("");
          }}
          className={cn(
            "p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5",
            importType === "miro"
              ? "bg-amber-500/10 border-amber-500/30 text-amber-800 ring-2 ring-amber-500/20 font-medium"
              : "border-border-subtle hover:bg-surface-sunken  hover:border-border-subtle font-medium"
          )}
        >
          <span className="text-xl">🟡</span>
          <div className="text-xs sm:text-[10px] font-normal uppercase tracking-wider">
            {t("importDiagram.miroBoard")}
          </div>
          <div className="text-xs sm:text-[11px] text-content-muted font-medium">
            {t("importDiagram.miroFile")}
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setImportType("native");
            setParsedImportData(null);
            setParsedFilename("");
          }}
          className={cn(
            "p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5",
            importType === "native"
              ? "bg-primary/10 border-primary/30 text-primary ring-2 ring-primary/20 font-medium"
              : "border-border-subtle hover:bg-surface-sunken  hover:border-border-subtle font-medium"
          )}
        >
          <span className="text-xl">🔮</span>
          <div className="text-xs sm:text-[10px] font-normal uppercase tracking-wider">
            {t("importDiagram.backupFormat")}
          </div>
          <div className="text-xs sm:text-[11px] text-content-muted font-medium">
            {t("importDiagram.defaultJson")}
          </div>
        </button>
      </div>

      {/* Guidelines helper text */}
      <div className="bg-surface-sunken p-3 rounded-xl border border-border-subtle text-xs sm:text-[11px] leading-relaxed">
        {importType === "drawio" && (
          <p>
            💡 <strong>{t("importDiagram.drawioHint")}</strong>
            {t("importDiagram.youCanExportADraw")} <strong>{t("importDiagram.xmlHint")}</strong>
            {t("importDiagram.ourSystemAutomaticallyConvertsBasic")}
          </p>
        )}
        {importType === "miro" && (
          <p>
            💡 <strong>{t("importDiagram.miroHint")}</strong>
            {t("importDiagram.exportYourMiroBoardIn")} <strong>JSON</strong> {t("importDiagram.or")}{" "}
            <strong>{t("importDiagram.csvMetadata")}</strong>
            {t("importDiagram.geometryCoordinatesTextAndConnectors")}
          </p>
        )}
        {importType === "native" && (
          <p>
            💡 <strong>{t("importDiagram.backupHint")}</strong>
            {t("importDiagram.uploadAWorkspaceBackupFile")} <strong>JSON</strong>{" "}
            {t("importDiagram.downloadedFromThisAppTo")}
          </p>
        )}
      </div>

      {/* Drag and Drop Box */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOverImport(true);
        }}
        onDragLeave={() => setDragOverImport(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOverImport(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleProcessImportFile(file);
        }}
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          if (importType === "drawio") {
            input.accept = ".xml, .drawio";
          } else if (importType === "miro") {
            input.accept = ".json, .csv";
          } else {
            input.accept = ".json";
          }
          input.onchange = (ev) => {
            const file = (ev.target as HTMLInputElement).files?.[0];
            if (file) handleProcessImportFile(file);
          };
          input.click();
        }}
        className={cn(
          "border-2 border-dashed rounded-xl p-6 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 min-h-[140px]",
          dragOverImport
            ? "border-primary bg-primary/10 text-primary"
            : parsedImportData
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 animate-pulse"
              : "border-border-subtle hover:border-primary/40 hover:bg-surface-sunken text-content-muted font-medium"
        )}
      >
        {parsedImportData ? (
          <span className="text-3xl animate-bounce">📦</span>
        ) : (
          <Upload className="w-8 h-8 text-content-subtle" />
        )}

        <div className="text-center font-medium font-sans">
          {parsedImportData ? (
            <span className="text-emerald-700 text-xs sm:text-[11px] uppercase tracking-wider font-normal block mb-1">
              {t("importDiagram.loaded")}
            </span>
          ) : (
            <span>{t("importDiagram.dragDrop")}</span>
          )}
          {parsedFilename && (
            <span className="text-xs sm:text-[10px] text-content-secondary font-mono block mt-2 bg-surface-muted p-1 px-2.5 rounded-lg border border-border-subtle inline-block">
              📎 {parsedFilename}
            </span>
          )}
        </div>

        {!parsedImportData && (
          <p className="text-xs sm:text-[11px] text-content-subtle font-medium">
            {t("rakit.supportsExt")}{" "}
            {importType === "drawio"
              ? ".xml, .drawio"
              : importType === "miro"
                ? ".json, .csv"
                : ".json"}
          </p>
        )}
      </div>

      {/* Analytical preview result of parser */}
      {parsedImportData && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 space-y-2 text-[10px] leading-none text-emerald-900 leading-relaxed font-sans font-medium">
          <span className="font-normal uppercase tracking-widest text-xs sm:text-[11px] text-emerald-800 flex items-center gap-1.5 shadow-soft bg-surface p-1 px-2.5 w-fit rounded-full border border-emerald-500/30">
            {t("importDiagram.diagramReadinessReview")}
          </span>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-surface p-2.5 rounded-xl border border-emerald-500/30 flex items-center gap-2 shadow-inner">
              <span className="text-xl">🛠️</span>
              <div>
                <div className="font-medium text-content text-xs">
                  {parsedImportData.nodes.length}
                </div>
                <div className="text-xs sm:text-[11px] text-content-muted font-normal uppercase tracking-wider">
                  {t("importDiagram.shapesOrnamentsNodes")}
                </div>
              </div>
            </div>

            <div className="bg-surface p-2.5 rounded-xl border border-emerald-500/30 flex items-center gap-2 shadow-inner">
              <span className="text-xl">🖧</span>
              <div>
                <div className="font-medium text-content text-xs">
                  {parsedImportData.edges.length}
                </div>
                <div className="text-xs sm:text-[11px] text-content-muted font-normal uppercase tracking-wider">
                  {t("importDiagram.connectingArrowsEdges")}
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs sm:text-[10px] text-emerald-700 italic pt-1 font-medium leading-relaxed">
            {t("importDiagram.fullyReadyEveryComponentMapped")}
          </p>
        </div>
      )}
    </Modal>
  );
};
