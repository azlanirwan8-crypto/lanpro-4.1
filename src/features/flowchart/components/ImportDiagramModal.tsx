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
import { Upload, X } from "lucide-react";
import { cn } from "../../../lib/utils";

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
  if (!isImportModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-overlay/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none">
      <div className="bg-surface border border-border-subtle w-full max-w-xl rounded-xl shadow-xl overflow-hidden flex flex-col text-content-strong animate-in fade-in zoom-in-95 duration-150 max-h-[90vh]">
        {/* Modal Head */}
        <div className="px-5 py-4 bg-surface border-b border-border-subtle flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-surface/10 text-primary flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <h3 className="font-medium text-sm text-content">{t("importDiagram.title")}</h3>
          </div>
          <button
            onClick={() => {
              setIsImportModalOpen(false);
              setParsedImportData(null);
            }}
            className="p-1 hover:bg-surface-strong rounded-lg text-content-subtle hover:text-content-secondary transition-all active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
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
              <div className="text-xs sm:text-[10px] font-medium uppercase tracking-wider">
                Draw.io / XML
              </div>
              <div className="text-xs sm:text-[11px] sm:text-[9px] text-content-muted font-medium">
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
              <div className="text-xs sm:text-[10px] font-medium uppercase tracking-wider">
                {t("importDiagram.miroBoard")}
              </div>
              <div className="text-xs sm:text-[11px] sm:text-[9px] text-content-muted font-medium">
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
                  ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-800 ring-2 ring-indigo-500/20 font-medium"
                  : "border-border-subtle hover:bg-surface-sunken  hover:border-border-subtle font-medium"
              )}
            >
              <span className="text-xl">🔮</span>
              <div className="text-xs sm:text-[10px] font-medium uppercase tracking-wider">
                {t("importDiagram.backupFormat")}
              </div>
              <div className="text-xs sm:text-[11px] sm:text-[9px] text-content-muted font-medium">
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
                {t("importDiagram.exportYourMiroBoardIn")} <strong>JSON</strong>{" "}
                {t("importDiagram.or")} <strong>{t("importDiagram.csvMetadata")}</strong>
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
                ? "border-violet-500 bg-violet-500/10 text-violet-700"
                : parsedImportData
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 animate-pulse"
                  : "border-border-subtle hover:border-indigo-400 hover:bg-surface-sunken text-content-muted font-medium"
            )}
          >
            {parsedImportData ? (
              <span className="text-3xl animate-bounce">📦</span>
            ) : (
              <Upload className="w-8 h-8 text-content-subtle" />
            )}

            <div className="text-center font-medium font-sans">
              {parsedImportData ? (
                <span className="text-emerald-700 text-xs sm:text-[11px] uppercase tracking-wider font-medium block mb-1">
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
              <p className="text-xs sm:text-[11px] sm:text-[9px] text-content-subtle font-medium">
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
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 space-y-2 text-[10px] leading-none animate-fade-in text-emerald-900 leading-relaxed font-sans font-medium">
              <span className="font-medium uppercase tracking-widest text-xs sm:text-[11px] sm:text-[9.5px] text-emerald-800 flex items-center gap-1.5 shadow-soft bg-surface p-1 px-2.5 w-fit rounded-full border border-emerald-500/30">
                {t("importDiagram.diagramReadinessReview")}
              </span>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-surface p-2.5 rounded-xl border border-emerald-500/30 flex items-center gap-2 shadow-inner">
                  <span className="text-xl">🛠️</span>
                  <div>
                    <div className="font-medium text-content text-xs">
                      {parsedImportData.nodes.length}
                    </div>
                    <div className="text-xs sm:text-[11px] sm:text-[9px] text-content-muted font-medium uppercase tracking-wider">
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
                    <div className="text-xs sm:text-[11px] sm:text-[9px] text-content-muted font-medium uppercase tracking-wider">
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
        </div>

        {/* Modal Actions */}
        <div className="p-4 px-5 bg-surface-sunken border-t border-border-subtle flex justify-between items-center shrink-0">
          <button
            type="button"
            onClick={() => {
              setIsImportModalOpen(false);
              setParsedImportData(null);
            }}
            className="p-2 px-4 rounded-xl bg-surface-strong/80 hover:bg-surface-marker font-medium border border-border-subtle text-content-secondary hover:text-content-strong transition-all text-xs sm:text-[11px] active:scale-95"
          >
            {t("importDiagram.close")}
          </button>

          {parsedImportData ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleApplyImportMerge}
                className="p-2 px-3 bg-surface hover:bg-indigo-500/10 border border-indigo-500/30 hover:border-indigo-500/30 text-indigo-700 hover:text-indigo-900 font-medium rounded-xl transition-all text-[10px] leading-none shadow-soft flex items-center gap-1 active:scale-95"
              >
                <span>{t("importDiagram.mergeCanvas")}</span>
              </button>
              <button
                type="button"
                onClick={handleApplyImportReplace}
                className="p-2 px-4 bg-gradient-to-tr from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-content-inverse font-medium rounded-xl transition-all text-xs sm:text-[11px] shadow-soft flex items-center gap-1 active:scale-95"
              >
                <span>{t("importDiagram.replaceCanvas")}</span>
              </button>
            </div>
          ) : (
            <div className="text-xs sm:text-[10px] text-content-subtle italic font-medium">
              {t("importDiagram.pickAbove")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
