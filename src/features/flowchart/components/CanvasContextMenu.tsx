import { useTranslation } from "react-i18next";
import React, { useEffect, useRef } from "react";
import { motion } from "motion/react";
import {
  Plus,
  Square,
  Diamond,
  Circle,
  StickyNote,
  CreditCard,
  FileText,
  Database,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Undo,
  Redo,
  Trash2,
  MapPin,
} from "lucide-react";
import { cn } from "../../../lib/utils";

interface CanvasContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onAddNode: (type: string, label: string, color: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const CanvasContextMenu: React.FC<CanvasContextMenuProps> = ({
  x,
  y,
  onClose,
  onAddNode,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onUndo,
  onRedo,
  onClear,
  canUndo,
  canRedo,
}) => {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);

  // Keep menu on screen bounds
  const adjustedX = Math.min(x, window.innerWidth - 240);
  const adjustedY = Math.min(y, window.innerHeight - 440);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const shapeCategories = [
    {
      type: "oval",
      label: t("canvasMenu.shapeStartEnd"),
      icon: Circle,
      color: "emerald",
      text: t("canvasMenu.shapeStartEnd"),
    },
    {
      type: "rect",
      label: t("canvasMenu.shapeProcessStep"),
      icon: Square,
      color: "indigo",
      text: t("canvasMenu.nodeProcess"),
    },
    {
      type: "diamond",
      label: t("canvasMenu.shapeDecisionFlow"),
      icon: Diamond,
      color: "amber",
      text: t("canvasMenu.nodeDecision"),
    },
    {
      type: "sticky",
      label: t("canvasMenu.shapeStickyNote"),
      icon: StickyNote,
      color: "yellow",
      text: t("canvasMenu.shapeMemo"),
    },
    {
      type: "card",
      label: t("canvasMenu.shapeInfoCard"),
      icon: CreditCard,
      color: "slate",
      text: t("canvasMenu.nodeCard"),
    },
    {
      type: "document",
      label: t("canvasMenu.shapePrintDoc"),
      icon: FileText,
      color: "sky",
      text: t("canvasMenu.nodeDocument"),
    },
    {
      type: "database",
      label: t("canvasMenu.shapeDatabase"),
      icon: Database,
      color: "violet",
      text: t("canvasMenu.nodeDatabase"),
    },
  ];

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.95, y: -5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -5 }}
      transition={{ duration: 0.12, ease: "easeOut" }}
      style={{
        left: `${adjustedX}px`,
        top: `${adjustedY}px`,
      }}
      className="fixed z-50 w-56 bg-surface/95 backdrop-blur-md border border-border-subtle/55 rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.15)] p-1.5 select-none text-content-strong"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Title */}
      <div className="px-3 py-1.5 text-xs sm:text-[11px] font-normal uppercase tracking-wider text-content-subtle border-b border-border-faint mb-1 flex items-center justify-between">
        <span>{t("canvasMenu.title")}</span>
        <span className="text-primary font-mono text-xs sm:text-[10px] flex items-center gap-0.5">
          <MapPin className="w-2 h-2 text-primary" />
          {t("canvasMenu.activeCanvas")}
        </span>
      </div>

      {/* Shapes Subheader */}
      <div className="px-3 py-1 flex items-center gap-1.5 text-xs sm:text-[11px] font-normal uppercase tracking-wider text-content-subtle">
        <Plus className="w-3 h-3 text-content-subtle" />
        <span>{t("canvasMenu.addComponent")}</span>
      </div>

      {/* Shapes List */}
      <div className="space-y-0.5 max-h-[180px] overflow-y-auto custom-scrollbar my-1 p-0.5 bg-surface-sunken/50 rounded-xl border border-border-faint">
        {shapeCategories.map((shape) => {
          const Icon = shape.icon;
          return (
            <button
              key={shape.type}
              onClick={() => {
                onAddNode(shape.type, shape.label, shape.color);
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium rounded-lg hover:text-primary hover:bg-surface hover:shadow-soft transition-all text-left border border-transparent"
            >
              <Icon className={cn("w-3.5 h-3.5 text-content-subtle", `text-${shape.color}-500`)} />
              <div className="flex flex-col">
                <span className="font-medium text-content-body hover:text-primary">
                  {shape.text}
                </span>
                <span className="text-xs sm:text-[11px] text-content-subtle font-normal">
                  {shape.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="h-px my-1" />

      {/* Canvas Zoom Section */}
      <div className="grid grid-cols-3 gap-1 px-1.5 my-1">
        <button
          onClick={() => {
            onZoomIn();
            onClose();
          }}
          className="flex flex-col items-center gap-1 p-1.5 rounded-lg text-xs sm:text-[11px] font-medium text-content-secondary hover:text-primary hover:bg-surface-sunken border border-transparent hover:border-border-faint transition-all"
          title={t("canvasMenu.zoomInTip")}
        >
          <ZoomIn className="w-3.5 h-3.5 text-content-muted" />
          <span>{t("canvasMenu.zoomIn")}</span>
        </button>
        <button
          onClick={() => {
            onZoomOut();
            onClose();
          }}
          className="flex flex-col items-center gap-1 p-1.5 rounded-lg text-xs sm:text-[11px] font-medium text-content-secondary hover:text-primary hover:bg-surface-sunken border border-transparent hover:border-border-faint transition-all"
          title={t("canvasMenu.zoomOutTip")}
        >
          <ZoomOut className="w-3.5 h-3.5 text-content-muted" />
          <span>{t("canvasMenu.zoomOut")}</span>
        </button>
        <button
          onClick={() => {
            onResetZoom();
            onClose();
          }}
          className="flex flex-col items-center gap-1 p-1.5 rounded-lg text-xs sm:text-[11px] font-medium text-content-secondary hover:text-primary hover:bg-surface-sunken border border-transparent hover:border-border-faint transition-all"
          title={t("canvasMenu.resetTip")}
        >
          <RotateCcw className="w-3.5 h-3.5 text-content-muted" />
          <span>{t("canvasMenu.reset")}</span>
        </button>
      </div>

      <div className="h-px my-1" />

      {/* Undo / Redo Row */}
      <div className="flex gap-1 px-1 my-1">
        <button
          onClick={() => {
            onUndo();
            onClose();
          }}
          disabled={!canUndo}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs sm:text-[10px] font-medium border transition-all",
            canUndo
              ? " hover:bg-surface-sunken hover:text-primary border-border-faint/80 cursor-pointer"
              : "text-content-subtle border-transparent cursor-not-allowed"
          )}
        >
          <Undo className="w-3 h-3" />
          <span>{t("canvasMenu.undo")}</span>
        </button>

        <button
          onClick={() => {
            onRedo();
            onClose();
          }}
          disabled={!canRedo}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs sm:text-[10px] font-medium border transition-all",
            canRedo
              ? " hover:bg-surface-sunken hover:text-primary border-border-faint/80 cursor-pointer"
              : "text-content-subtle border-transparent cursor-not-allowed"
          )}
        >
          <Redo className="w-3 h-3" />
          <span>{t("canvasMenu.redo")}</span>
        </button>
      </div>

      <div className="h-px my-1" />

      {/* Clear Workspace button */}
      <button
        onClick={() => {
          onClear();
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl text-rose-600 hover:bg-rose-500/10 transition-colors text-left"
      >
        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
        <span>{t("canvasMenu.clearCanvas")}</span>
      </button>
    </motion.div>
  );
};
