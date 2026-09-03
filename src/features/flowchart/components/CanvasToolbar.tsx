/**
 * Bilah kendali melayang di atas kanvas.
 *
 * #321 — chrome lebih tipis: label tema/snap hanya md+, ekspor icon-only
 * di layar sempit; tanpa teks uppercase padat.
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
    <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none gap-2">
      <div className="flex items-center gap-2 pointer-events-auto min-w-0">
        {/* Active Diagram Name Indicator */}
        <div className="flex items-center gap-2 bg-surface/70 hover:bg-surface/85 backdrop-blur-md border border-border-subtle/40 px-2.5 py-1 rounded-lg shadow-[0_6px_18px_rgba(0,0,0,0.05)] pointer-events-auto transition-all duration-300 min-w-0">
          <div className="p-1 bg-violet-500/10 rounded-md text-violet-700 shrink-0">
            <Workflow className="w-3.5 h-3.5 text-violet-600" />
          </div>
          <div className="text-left font-sans min-w-0">
            <p className="text-[10px] font-medium text-content-subtle leading-none mb-0.5 hidden sm:block">
              {t("flowchart.flowchart")}
            </p>
            <span className="text-xs font-medium text-content-strong truncate max-w-[100px] sm:max-w-[180px] block leading-tight">
              {currentFlowMetadata?.name || "Untitled Workspace"}
            </span>
          </div>
        </div>

        {/* Canvas theme & snap */}
        <div className="flex items-center gap-1 bg-surface/70 hover:bg-surface/85 backdrop-blur-md border border-border-subtle/40 p-1 rounded-lg shadow-[0_6px_18px_rgba(0,0,0,0.05)] transition-all duration-300 shrink-0">
          <button
            type="button"
            onClick={() => {
              const nextTheme = canvasTheme === "miro" ? "blueprint" : "miro";
              setCanvasTheme(nextTheme);
              toast.success(
                `Tema Kanvas diubah ke: ${nextTheme === "miro" ? "Miro (Terang)" : "Blueprint (Gelap)"}`
              );
            }}
            className={cn(
              "min-h-11 min-w-11 p-2 rounded-md transition-all flex items-center gap-1 cursor-pointer",
              canvasTheme === "miro"
                ? "bg-surface-muted hover:bg-surface-strong text-content-body"
                : "bg-blue-950/40 hover:bg-blue-900/40 text-blue-400"
            )}
            title={`Ubah Tema Kanvas (Saat ini: ${canvasTheme === "miro" ? t("flowchart.miroLight") : t("flowchart.blueprintDark")})`}
          >
            {canvasTheme === "miro" ? (
              <Sun className="w-3.5 h-3.5 text-amber-500 fill-amber-200" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-blue-400 fill-blue-950" />
            )}
            <span className="text-[10px] font-medium hidden lg:inline px-0.5">
              {canvasTheme === "miro" ? t("flowchart.miroTheme") : t("flowchart.blueprintTheme")}
            </span>
          </button>

          <div className="w-px h-3.5 bg-surface-strong/60" />

          <button
            type="button"
            onClick={() => {
              const nextSnap = !isSnapToGrid;
              setIsSnapToGrid(nextSnap);
              toast.success(t("toast.snapToGrid", { keadaan: nextSnap ? "AKTIF" : "NON-AKTIF" }));
            }}
            className={cn(
              "min-h-11 min-w-11 p-2 rounded-md transition-all flex items-center gap-1 cursor-pointer",
              isSnapToGrid
                ? "bg-violet-500/10 text-violet-700 hover:bg-violet-500/15 border border-violet-500/30"
                : "text-content-subtle hover:bg-surface-muted border border-transparent"
            )}
            title={`Snap to Grid (Saat ini: ${isSnapToGrid ? "Aktif" : "Mati"})`}
          >
            <LayoutGrid
              className={cn(
                "w-3.5 h-3.5",
                isSnapToGrid ? "text-violet-600" : "text-content-subtle"
              )}
            />
            <span className="text-[10px] font-medium hidden lg:inline px-0.5">
              {isSnapToGrid ? t("flowchart.snapGrid") : t("flowchart.freeMove")}
            </span>
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
            onClick={handleExportJSON}
            className="flex items-center gap-1 px-2 py-1.5 text-indigo-700 hover:bg-indigo-500/10 rounded-md text-[10px] leading-none font-medium transition-all cursor-pointer"
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
