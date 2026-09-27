/**
 * Rel alat kiri kanvas flowchart (#433 gelombang 1).
 * Dipindah verbatim dari FlowchartContainer — handler tetap props.
 */
import { useTranslation } from "react-i18next";
import React from "react";
import { ArrowRight, Hand, HelpCircle, MousePointer, StickyNote, Type } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../../lib/utils";
import { ShapePalette } from "./ShapePalette";
import type { FlowNode } from "../types";

interface CanvasToolRailProps {
  activeTool: "select" | "hand" | "connect";
  setActiveTool: (tool: "select" | "hand" | "connect") => void;
  setConnectSourceId: (id: string | null) => void;
  handleAddNewNode: (type: FlowNode["type"], color?: string) => void;
  isShapeDropdownOpen: boolean;
  setIsShapeDropdownOpen: (v: boolean) => void;
  selectedAddColor: string;
  setSelectedAddColor: (v: string) => void;
  shapeSearchQuery: string;
  setShapeSearchQuery: (v: string) => void;
  expandedGroups: Record<string, boolean>;
  toggleGroupExpanded: (id: string) => void;
  setIsRightSidebarOpen: (v: boolean) => void;
}

export const CanvasToolRail: React.FC<CanvasToolRailProps> = ({
  activeTool,
  setActiveTool,
  setConnectSourceId,
  handleAddNewNode,
  isShapeDropdownOpen,
  setIsShapeDropdownOpen,
  selectedAddColor,
  setSelectedAddColor,
  shapeSearchQuery,
  setShapeSearchQuery,
  expandedGroups,
  toggleGroupExpanded,
  setIsRightSidebarOpen,
}) => {
  const { t } = useTranslation();

  return (
    <div className="absolute top-24 md:top-20 z-20 flex flex-col gap-1.5 bg-surface/70 hover:bg-surface/85 backdrop-blur-md border border-border-subtle/40 p-1.5 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] shrink-0 select-none items-center transition-all duration-300 left-3">
      <button
        type="button"
        onClick={() => {
          setActiveTool("select");
          setConnectSourceId(null);
        }}
        className={cn(
          "p-2 rounded-lg transition-all w-9 h-9 flex items-center justify-center",
          activeTool === "select"
            ? "bg-primary-surface text-content-inverse shadow-md"
            : "hover:bg-surface-muted text-content-body"
        )}
        title={t("flowchart.toolPointer")}
      >
        <MousePointer className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => {
          setActiveTool("hand");
          setConnectSourceId(null);
        }}
        className={cn(
          "p-2 rounded-lg transition-all w-9 h-9 flex items-center justify-center",
          activeTool === "hand"
            ? "bg-primary-surface text-content-inverse shadow-md"
            : "hover:bg-surface-muted text-content-body"
        )}
        title={t("flowchart.toolHand")}
      >
        <Hand className="w-4 h-4" />
      </button>

      <div className="w-5 h-px bg-surface-strong" />

      <button
        type="button"
        onClick={() => handleAddNewNode("sticky", "yellow")}
        className="p-2 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/30 text-amber-700 rounded-lg transition-all flex items-center justify-center shrink-0 w-9 h-9"
        title={t("flowchart.toolSticky")}
      >
        <StickyNote className="w-4 h-4 text-amber-500 fill-amber-300" />
      </button>

      <ShapePalette
        isShapeDropdownOpen={isShapeDropdownOpen}
        setIsShapeDropdownOpen={setIsShapeDropdownOpen}
        selectedAddColor={selectedAddColor}
        setSelectedAddColor={setSelectedAddColor}
        shapeSearchQuery={shapeSearchQuery}
        setShapeSearchQuery={setShapeSearchQuery}
        expandedGroups={expandedGroups}
        toggleGroupExpanded={toggleGroupExpanded}
        handleAddNewNode={handleAddNewNode}
        onOpenPalette={() => setIsRightSidebarOpen(false)}
      />

      <button
        type="button"
        onClick={() => {
          setActiveTool("connect");
          setConnectSourceId(null);
          toast.info(
            "Mode Anak Panah Aktif. Klik bentuk asal di Canvas, lalu klik bentuk penerima."
          );
        }}
        className={cn(
          "p-2 rounded-lg transition-all flex items-center justify-center w-9 h-9 border border-border-faint",
          activeTool === "connect"
            ? "bg-amber-400 text-content border-amber-400"
            : "hover:bg-surface-muted text-content-body"
        )}
        title={t("flowchart.toolArrow")}
      >
        <ArrowRight className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => handleAddNewNode("text")}
        className="p-2 hover:bg-surface-muted rounded-lg transition-all flex items-center justify-center w-9 h-9 text-content-body"
        title={t("flowchart.toolText")}
      >
        <Type className="w-4 h-4" />
      </button>

      <div className="w-5 h-px bg-surface-strong" />

      <button
        type="button"
        className="p-2 text-content-subtle hover:text-primary transition-colors rounded-lg w-9 h-9 flex items-center justify-center"
        title={t("flowchart.helpNav")}
        onClick={() =>
          toast.info(
            "Gunakan menu ini untuk menambahkan komponen ke visual whiteboard. Anda dapat mengubah isi teks dengan mengetik langsung diatas bentuk."
          )
        }
      >
        <HelpCircle className="w-4 h-4" />
      </button>
    </div>
  );
};
