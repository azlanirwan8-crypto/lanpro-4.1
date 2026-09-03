import { useTranslation } from "react-i18next";
import React, { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Trash2, Edit3, Palette, Copy, Check } from "lucide-react";
import { cn } from "../../../lib/utils";

interface NodeContextMenuProps {
  x: number;
  y: number;
  nodeId: string;
  nodeColor: string;
  onClose: () => void;
  onDelete: (nodeId: string) => void;
  onEditProperties: (nodeId: string) => void;
  onChangeColor: (nodeId: string, color: string) => void;
  onDuplicate: (nodeId: string) => void;
}

export const NodeContextMenu: React.FC<NodeContextMenuProps> = ({
  x,
  y,
  nodeId,
  nodeColor,
  onClose,
  onDelete,
  onEditProperties,
  onChangeColor,
  onDuplicate,
}) => {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);

  const colorsList = [
    { name: "indigo", bg: "bg-indigo-500" },
    { name: "blue", bg: "bg-blue-500" },
    { name: "sky", bg: "bg-sky-500" },
    { name: "green", bg: "bg-emerald-500" },
    { name: "yellow", bg: "bg-amber-400" },
    { name: "orange", bg: "bg-orange-500" },
    { name: "pink", bg: "bg-pink-500" },
    { name: "rose", bg: "bg-rose-500" },
    { name: "violet", bg: "bg-violet-500" },
    { name: "purple", bg: "bg-purple-500" },
    { name: "slate", bg: "bg-surface-strong" },
  ];

  // Adjust coordinates so it doesn't overflow screen boundaries
  const adjustedX = Math.min(x, window.innerWidth - 210);
  const adjustedY = Math.min(y, window.innerHeight - 340);

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

    // Use capturing phase to prevent triggering actions on the same click
    document.addEventListener("mousedown", handleOutsideClick, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

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
      className="fixed z-50 w-48 bg-surface/90 backdrop-blur-md border border-border-subtle/50 rounded-xl shadow-[0_12px_36px_rgba(0,0,0,0.14)] p-1.5 select-none text-content-strong"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Node Info Header */}
      <div className="px-3 py-1.5 text-xs sm:text-[11px] font-normal uppercase tracking-wider text-content-subtle border-b border-border-faint mb-1 flex items-center justify-between">
        <span>{t("nodeMenu.title")}</span>
        <span className="text-primary font-mono text-xs sm:text-[10px]">
          ID: {nodeId.split("_")[1] || "Active"}
        </span>
      </div>

      {/* Edit Properties Button */}
      <button
        onClick={() => {
          onEditProperties(nodeId);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl text-content-body hover:text-primary hover:bg-primary/10 transition-colors text-left"
      >
        <Edit3 className="w-3.5 h-3.5 text-content-subtle group-hover:text-primary" />
        <span>{t("nodeMenu.editProperties")}</span>
      </button>

      {/* Duplicate Button */}
      <button
        onClick={() => {
          onDuplicate(nodeId);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl text-content-body hover:text-primary hover:bg-primary/10 transition-colors text-left"
      >
        <Copy className="w-3.5 h-3.5 text-content-subtle" />
        <span>{t("nodeMenu.duplicate")}</span>
      </button>

      <div className="h-px bg-surface-muted my-1" />

      {/* Change Color Palette Title */}
      <div className="px-3 py-1 flex items-center gap-1.5 text-xs sm:text-[11px] font-normal uppercase tracking-wider text-content-subtle">
        <Palette className="w-3 h-3 text-content-subtle" />
        <span>{t("nodeMenu.changeColor")}</span>
      </div>

      {/* Color Circle Grid Picker */}
      <div className="grid grid-cols-4 gap-1.5 p-2 bg-surface-sunken/50 rounded-xl border border-border-faint/80 my-1">
        {colorsList.map((c) => {
          const isSelected = nodeColor === c.name;
          return (
            <button
              key={c.name}
              onClick={() => {
                onChangeColor(nodeId, c.name);
                onClose();
              }}
              className={cn(
                "w-7 h-7 rounded-lg transition-transform hover:scale-110 active:scale-95 flex items-center justify-center relative shadow-soft cursor-pointer border",
                c.bg,
                isSelected ? "ring-2 ring-primary border-surface scale-105" : "border-transparent"
              )}
              title={c.name.toUpperCase()}
            >
              {isSelected && (
                <Check className="w-3.5 h-3.5 text-content-inverse stroke-[3.5px] drop-shadow-sm" />
              )}
            </button>
          );
        })}
      </div>

      <div className="h-px bg-surface-muted my-1" />

      {/* Delete Node Button */}
      <button
        onClick={() => {
          onDelete(nodeId);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl text-rose-600 hover:bg-rose-500/10 transition-colors text-left"
      >
        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
        <span>{t("nodeMenu.delete")}</span>
      </button>
    </motion.div>
  );
};
