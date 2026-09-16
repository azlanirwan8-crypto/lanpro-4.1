/**
 * Dialog impor diagram multi-format: Draw.io (XML/.drawio), Miro (JSON/CSV),
 * Mermaid (.mmd/.mermaid/.txt), dan format cadangan bawaan LanPro (JSON).
 *
 * Versi ini mendukung 4 kategori format:
 * 1. draw.io   — .drawio, .xml
 * 2. Miro      — .json, .csv
 * 3. Mermaid   — .mmd, .mermaid, .txt
 * 4. LanPro    — .json (backup bawaan)
 *
 * UI mengikuti bahasa desain Miro: clean, ringan, font sans modern.
 */
import { useTranslation } from "react-i18next";
import React from "react";
import { Upload, FileText } from "lucide-react";
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

/** Daftar format yang didukung, lengkap dengan label, warna, dan ekstensi. */
const FORMAT_OPTIONS = [
  {
    key: "drawio" as "drawio" | "miro" | "native",
    emoji: "📊",
    label: "Draw.io",
    subLabel: ".drawio  ·  .xml",
    accept: ".xml,.drawio",
    hint: "Export dari draw.io: File → Export As → XML (.drawio). Node, edge, dan label dikonversi otomatis.",
    activeClass: "bg-orange-500/10 border-orange-400/50 text-orange-800 ring-2 ring-orange-400/20",
    dotClass: "bg-orange-400",
  },
  {
    key: "miro" as "drawio" | "miro" | "native",
    emoji: "🟡",
    label: "Miro",
    subLabel: ".json  ·  .csv",
    accept: ".json,.csv",
    hint: "Export dari Miro: Board → Export → JSON atau CSV Metadata. Koordinat, teks, dan konektor terbaca otomatis.",
    activeClass: "bg-amber-500/10 border-amber-400/50 text-amber-800 ring-2 ring-amber-400/20",
    dotClass: "bg-amber-400",
  },
  {
    key: "native" as "drawio" | "miro" | "native",
    emoji: "✏️",
    label: "Mermaid",
    subLabel: ".mmd  ·  .txt",
    accept: ".mmd,.mermaid,.txt",
    hint: "Simpan kode Mermaid (flowchart TD, graph LR, dll) ke file .mmd atau .txt. Node, diamond, oval, dan edge dipetakan otomatis.",
    activeClass: "bg-violet-500/10 border-violet-400/50 text-violet-800 ring-2 ring-violet-400/20",
    dotClass: "bg-violet-400",
  },
  {
    key: "native" as "drawio" | "miro" | "native",
    emoji: "🔮",
    label: "LanPro",
    subLabel: ".json",
    accept: ".json",
    hint: "Upload file backup JSON yang diunduh dari tombol Backup di aplikasi ini untuk memulihkan diagram.",
    activeClass: "bg-primary/10 border-primary/30 text-primary ring-2 ring-primary/20",
    dotClass: "bg-primary",
  },
];

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

  // Track which specific format tab the user clicked (to show correct hint & accept)
  const [activeFormatIdx, setActiveFormatIdx] = React.useState(0);

  const activeFormat = FORMAT_OPTIONS[activeFormatIdx];

  const closeImport = () => {
    setIsImportModalOpen(false);
    setParsedImportData(null);
  };

  const handleSelectFormat = (idx: number) => {
    setActiveFormatIdx(idx);
    setImportType(FORMAT_OPTIONS[idx].key);
    setParsedImportData(null);
    setParsedFilename("");
  };

  const triggerFileInput = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = activeFormat.accept;
    input.onchange = (ev) => {
      const file = (ev.target as HTMLInputElement).files?.[0];
      if (file) handleProcessImportFile(file);
    };
    input.click();
  };

  return (
    <Modal
      isOpen={isImportModalOpen}
      onClose={closeImport}
      title={t("importDiagram.title")}
      maxWidth="max-w-lg"
      className="select-none"
      bodyClassName="space-y-4"
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
            <span className="text-xs text-content-subtle italic font-medium mr-auto">
              {t("importDiagram.pickAbove")}
            </span>
          )}
        </>
      }
    >
      {/* Format selector — 4-column pill grid */}
      <div className="grid grid-cols-4 gap-1.5">
        {FORMAT_OPTIONS.map((fmt, idx) => {
          const isActive = activeFormatIdx === idx;
          return (
            <button
              key={`${fmt.label}-${idx}`}
              type="button"
              onClick={() => handleSelectFormat(idx)}
              className={cn(
                "p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 relative",
                isActive
                  ? fmt.activeClass
                  : "border-border-subtle hover:bg-surface-sunken hover:border-border-subtle"
              )}
            >
              {isActive && (
                <span
                  className={cn(
                    "absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full",
                    fmt.dotClass
                  )}
                />
              )}
              <span className="text-lg leading-none">{fmt.emoji}</span>
              <div className="text-[10px] font-semibold uppercase tracking-wide leading-none mt-0.5">
                {fmt.label}
              </div>
              <div className="text-[9px] text-content-muted font-medium leading-tight">
                {fmt.subLabel}
              </div>
            </button>
          );
        })}
      </div>

      {/* Hint box */}
      <div className="bg-surface-sunken border border-border-subtle rounded-xl px-3.5 py-2.5 text-[11px] leading-relaxed text-content-body">
        💡 {activeFormat.hint}
      </div>

      {/* Drag and Drop / Click to upload zone */}
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
        onClick={triggerFileInput}
        className={cn(
          "border-2 border-dashed rounded-xl p-7 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 min-h-[148px]",
          dragOverImport
            ? "border-primary bg-primary/5 text-primary scale-[1.01]"
            : parsedImportData
              ? "border-emerald-400/50 bg-emerald-500/5 text-emerald-700"
              : "border-border-subtle hover:border-primary/40 hover:bg-surface-sunken text-content-muted"
        )}
      >
        {parsedImportData ? (
          <span className="text-3xl animate-bounce">📦</span>
        ) : dragOverImport ? (
          <span className="text-3xl">📂</span>
        ) : (
          <div className="p-3 rounded-full bg-surface-muted border border-border-subtle">
            <Upload className="w-5 h-5 text-content-subtle" />
          </div>
        )}

        <div className="text-center space-y-1">
          {parsedImportData ? (
            <p className="text-sm font-semibold text-emerald-700">File berhasil dibaca!</p>
          ) : dragOverImport ? (
            <p className="text-sm font-semibold text-primary">Lepaskan file di sini…</p>
          ) : (
            <>
              <p className="text-sm font-semibold text-content-strong">
                Klik atau seret file ke sini
              </p>
              <p className="text-[11px] text-content-muted">
                {activeFormat.accept.replace(/\./g, "").replace(/,/g, "  ·  ").toUpperCase()}
              </p>
            </>
          )}

          {parsedFilename && (
            <span className="inline-flex items-center gap-1 text-[10px] text-content-secondary font-mono mt-1.5 bg-surface-muted px-2.5 py-1 rounded-lg border border-border-subtle">
              <FileText className="w-3 h-3 shrink-0" />
              {parsedFilename}
            </span>
          )}
        </div>
      </div>

      {/* Preview result after parsing */}
      {parsedImportData && (
        <div className="bg-emerald-500/5 border border-emerald-400/40 rounded-xl p-4 space-y-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-400/30 inline-block">
            ✅ Siap Diterapkan
          </span>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-surface rounded-lg border border-emerald-400/30 px-3 py-2.5 flex items-center gap-2.5 shadow-inner">
              <span className="text-lg">🔷</span>
              <div>
                <div className="text-sm font-bold text-content-strong">
                  {parsedImportData.nodes.length}
                </div>
                <div className="text-[10px] text-content-muted font-medium uppercase tracking-wide">
                  Node / Bentuk
                </div>
              </div>
            </div>
            <div className="bg-surface rounded-lg border border-emerald-400/30 px-3 py-2.5 flex items-center gap-2.5 shadow-inner">
              <span className="text-lg">↗️</span>
              <div>
                <div className="text-sm font-bold text-content-strong">
                  {parsedImportData.edges.length}
                </div>
                <div className="text-[10px] text-content-muted font-medium uppercase tracking-wide">
                  Panah / Edge
                </div>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-emerald-700 italic leading-relaxed">
            Pilih <strong>Gabung ke Kanvas</strong> untuk menambahkan ke diagram yang ada, atau{" "}
            <strong>Ganti Kanvas</strong> untuk memulai baru.
          </p>
        </div>
      )}
    </Modal>
  );
};
