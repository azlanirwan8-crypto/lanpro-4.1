/**
 * Bilah kendali melayang di atas kanvas.
 *
 * #321 — chrome lebih tipis: ekspor icon-only di layar sempit; tanpa teks
 * uppercase padat. #539 — tombol tema dan snap ikut icon-only di semua lebar:
 * namanya dipindah ke aria-label, keadaannya tetap terbaca dari warna ikon dan
 * tooltip, karena tulisan "Free move" memang keadaan bawaan papan.
 *
 * #546/#547 — dua hal dilepas dari bilah ini: kartu nama papan (namanya sudah
 * ada di header editor dan di daftar flowchart) dan tombol tema. Papan kini
 * ikut tema aplikasi, jadi tidak ada lagi dua sakelar yang bisa berdebat.
 */
import { useTranslation } from "react-i18next";
import React from "react";
import { LayoutGrid, Download, Database, Activity, Maximize2, Minimize2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../../lib/utils";

interface CanvasToolbarProps {
  isSnapToGrid: boolean;
  setIsSnapToGrid: (value: boolean) => void;
  handleExportJPG: () => void;
  handleExportJSON: () => void;
  isRightSidebarOpen: boolean;
  setIsRightSidebarOpen: (value: boolean) => void;
  /** Papan sedang tampil layar penuh? Hanya papan, bukan seluruh aplikasi. */
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  isSnapToGrid,
  setIsSnapToGrid,
  handleExportJPG,
  handleExportJSON,
  isRightSidebarOpen,
  setIsRightSidebarOpen,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const { t } = useTranslation();
  return (
    <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none gap-2">
      <div className="flex items-center gap-2 pointer-events-auto min-w-0">
        {/* Snap grid */}
        <div className="flex items-center gap-1 bg-surface/70 hover:bg-surface/85 backdrop-blur-md border border-border-subtle/40 p-1 rounded-lg shadow-[0_6px_18px_rgba(0,0,0,0.05)] transition-all duration-300 shrink-0">
          <button
            type="button"
            onClick={() => {
              const nextSnap = !isSnapToGrid;
              setIsSnapToGrid(nextSnap);
              toast.success(t("toast.snapToGrid", { keadaan: nextSnap ? "AKTIF" : "NON-AKTIF" }));
            }}
            className={cn(
              "min-h-11 min-w-11 p-2 rounded-md transition-all flex items-center justify-center cursor-pointer",
              isSnapToGrid
                ? "bg-primary/10 text-primary hover:bg-primary/15 border border-primary/30"
                : "text-content-subtle hover:bg-surface-muted border border-transparent"
            )}
            title={`Snap to Grid (Saat ini: ${isSnapToGrid ? "Aktif" : "Mati"})`}
            aria-label={isSnapToGrid ? t("flowchart.snapGrid") : t("flowchart.freeMove")}
          >
            <LayoutGrid
              className={cn("w-3.5 h-3.5", isSnapToGrid ? "text-primary" : "text-content-subtle")}
            />
          </button>
        </div>
      </div>

      {/* Export + properties — icon-first; JPG/JSON juga ada di dock */}
      <div className="flex items-center gap-1.5 pointer-events-auto shrink-0">
        <div className="hidden sm:flex bg-surface/70 hover:bg-surface/85 backdrop-blur-md border border-border-subtle/40 p-0.5 rounded-lg shadow-[0_6px_18px_rgba(0,0,0,0.05)] items-center gap-0.5 transition-all duration-300">
          <button
            type="button"
            onClick={handleExportJPG}
            className="flex items-center gap-1 px-2 py-1.5 text-emerald-700 hover:bg-emerald-500/10 rounded-md text-[10px] leading-none font-medium transition-all cursor-pointer"
            title={t("flowchart.export")}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{t("flowchart.export")}</span>
          </button>
          <button
            type="button"
            onClick={onToggleFullscreen}
            aria-pressed={isFullscreen}
            aria-label={t(isFullscreen ? "common.exitFullscreen" : "common.fullscreen")}
            title={t(isFullscreen ? "common.exitFullscreen" : "common.fullscreen")}
            className={cn(
              "p-1.5 rounded-md transition-all cursor-pointer",
              isFullscreen
                ? "bg-primary/15 text-primary border border-primary/30"
                : "text-content-secondary hover:bg-surface-muted hover:text-primary border border-transparent"
            )}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            type="button"
            onClick={handleExportJSON}
            className="flex items-center gap-1 px-2 py-1.5 text-primary hover:bg-primary/10 rounded-md text-[10px] leading-none font-medium transition-all cursor-pointer"
            title={t("flowchart.backup")}
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{t("flowchart.backup")}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
          className={cn(
            "p-2 bg-surface/70 hover:bg-surface/85 backdrop-blur-md border border-border-subtle/40 shadow-[0_6px_18px_rgba(0,0,0,0.05)] rounded-lg transition-all duration-300 cursor-pointer",
            isRightSidebarOpen
              ? "bg-primary-surface text-content-inverse border-primary"
              : "text-content-secondary hover:text-primary"
          )}
          title={t("canvasMenu.toggleConfigPanel")}
        >
          <Activity className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
