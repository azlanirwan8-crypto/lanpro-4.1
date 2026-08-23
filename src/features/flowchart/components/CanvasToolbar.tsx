/**
 * Bilah kendali melayang di atas kanvas.
 *
 * Kiri: nama diagram aktif, pengalih tema kanvas, dan pengalih snap-to-grid.
 * Kanan: tombol ekspor JPG, backup JSON, dan pengalih panel konfigurasi.
 *
 * Sebelumnya berupa blok JSX di dalam FlowchartContainer. Dipindah verbatim;
 * yang berubah hanya cara ia memperoleh data — dari closure atas state induk
 * menjadi props eksplisit. Tanpa state sendiri.
 */
import { useTranslation } from "react-i18next";
import React from "react";
import { Workflow, Sun, Moon, LayoutGrid, Download, Database, Activity } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../../lib/utils";
import type { FlowchartData } from "../types";

interface CanvasToolbarProps {
  /** Flowchart yang sedang dibuka; hanya namanya yang ditampilkan. */
  currentFlowMetadata: FlowchartData | undefined;
  canvasTheme: "miro" | "blueprint";
  setCanvasTheme: (value: "miro" | "blueprint") => void;
  isSnapToGrid: boolean;
  setIsSnapToGrid: (value: boolean) => void;
  handleExportJPG: () => void;
  handleExportJSON: () => void;
  isRightSidebarOpen: boolean;
  setIsRightSidebarOpen: (value: boolean) => void;
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  currentFlowMetadata,
  canvasTheme,
  setCanvasTheme,
  isSnapToGrid,
  setIsSnapToGrid,
  handleExportJPG,
  handleExportJSON,
  isRightSidebarOpen,
  setIsRightSidebarOpen,
}) => {
  const { t } = useTranslation();
  return (
    <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-none">
      <div className="flex items-center gap-3 pointer-events-auto">
        {/* Active Diagram Name Indicator */}
        <div className="flex items-center gap-2 bg-surface/70 hover:bg-surface/85 backdrop-blur-md border border-border-subtle/40 px-4 py-1.5 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.06)] pointer-events-auto transition-all duration-300">
          <div className="p-1.5 bg-violet-500/10 rounded-lg text-violet-700">
            <Workflow className="w-3.5 h-3.5 text-violet-600" />
          </div>
          <div className="text-left font-sans">
            <p className="text-xs sm:text-[10px] sm:text-[8px] font-medium text-content-subtle uppercase tracking-widest leading-none mb-0.5">
              {t("jsx.j49")}
            </p>
            <span className="text-xs sm:text-[11px] font-medium text-content-strong truncate max-w-[150px] block leading-tight">
              {currentFlowMetadata?.name || "Untitled Workspace"}
            </span>
          </div>
        </div>

        {/* INTEGRATIVE CANVAS SETTINGS CONTROLS (THEME & SNAPPING) */}
        <div className="flex items-center gap-2 bg-surface/70 hover:bg-surface/85 backdrop-blur-md border border-border-subtle/40 p-1.5 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all duration-300">
          {/* Canvas Theme Toggle */}
          <button
            onClick={() => {
              const nextTheme = canvasTheme === "miro" ? "blueprint" : "miro";
              setCanvasTheme(nextTheme);
              toast.success(
                `Tema Kanvas diubah ke: ${nextTheme === "miro" ? "Miro (Terang)" : "Blueprint (Gelap)"}`
              );
            }}
            className={cn(
              "p-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
              canvasTheme === "miro"
                ? "bg-surface-muted hover:bg-surface-strong text-content-body"
                : "bg-blue-950/40 hover:bg-blue-900/40 text-blue-400"
            )}
            title={`Ubah Tema Kanvas (Saat ini: ${canvasTheme === "miro" ? t("ui2.miroLight") : t("ui2.blueprintDark")})`}
          >
            {canvasTheme === "miro" ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500 fill-amber-200 animate-spin-slow" />
                <span className="text-xs sm:text-[11px] sm:text-[9px] font-medium uppercase tracking-wider hidden sm:inline px-0.5">
                  {t("jsx.j50")}
                </span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-blue-400 fill-blue-950" />
                <span className="text-xs sm:text-[11px] sm:text-[9px] font-medium uppercase tracking-wider hidden sm:inline px-0.5">
                  {t("jsx.j51")}
                </span>
              </>
            )}
          </button>

          <div className="w-px h-4 bg-surface-strong/60" />

          {/* Snap To Grid Toggle */}
          <button
            onClick={() => {
              const nextSnap = !isSnapToGrid;
              setIsSnapToGrid(nextSnap);
              toast.success(t("toast.snapToGrid", { keadaan: nextSnap ? "AKTIF" : "NON-AKTIF" }));
            }}
            className={cn(
              "p-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
              isSnapToGrid
                ? "bg-violet-500/10 text-violet-700 hover:bg-violet-500/15 border border-violet-500/30"
                : "text-content-subtle hover:bg-surface-muted"
            )}
            title={`Snap to Grid (Saat ini: ${isSnapToGrid ? "Aktif" : "Mati"})`}
          >
            <LayoutGrid
              className={cn(
                "w-3.5 h-3.5",
                isSnapToGrid ? "text-violet-600" : "text-content-subtle"
              )}
            />
            <span className="text-xs sm:text-[11px] sm:text-[9px] font-medium uppercase tracking-wider hidden sm:inline px-0.5">
              {isSnapToGrid ? t("ui2.snapGrid") : t("ui2.freeMove")}
            </span>
          </button>
        </div>
      </div>

      {/* RIGHT SIDE EXPORT & SIDEBAR TOGGLE BUTTONS */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <div className="bg-surface/70 hover:bg-surface/85 backdrop-blur-md border border-border-subtle/40 p-1 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.06)] flex items-center gap-1.5 transition-all duration-300">
          <button
            onClick={handleExportJPG}
            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 border border-emerald-500/30 rounded-lg text-[10px] leading-none font-medium transition-all cursor-pointer"
          >
            <Download className="w-3 h-3" /> {t("jsx.j52")}
          </button>
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1 px-2.5 py-1 bg-indigo-500/10 text-indigo-700 hover:bg-indigo-500/15 border border-indigo-500/30 rounded-lg text-[10px] leading-none font-medium transition-all cursor-pointer"
          >
            <Database className="w-3 h-3" /> {t("jsx.j53")}
          </button>
        </div>

        <button
          onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
          className={cn(
            "p-2 bg-surface/70 hover:bg-surface/85 backdrop-blur-md border border-border-subtle/40 shadow-[0_8px_24px_rgba(0,0,0,0.06)] rounded-xl transition-all duration-300 cursor-pointer",
            isRightSidebarOpen
              ? "bg-violet-600 text-content-inverse border-violet-600"
              : "text-content-secondary hover:text-violet-600"
          )}
          title={t("canvasMenu.toggleConfigPanel")}
        >
          <Activity className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
