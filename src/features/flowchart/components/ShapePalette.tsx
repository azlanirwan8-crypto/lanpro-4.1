/**
 * Koleksi bentuk diagram: tombol pemicu di toolbar dan panel yang muncul.
 *
 * #321 — chrome Miro-like: trigger icon-only; desktop panel lebih sempit;
 * mobile = lembar full-width (bukan left-14 w-80).
 */
import { useTranslation } from "react-i18next";
import React from "react";
import { Layers, ChevronDown, X, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../../lib/utils";
import { DIAGRAM_SHAPE_GROUPS } from "../constants";
import { renderMiniPreviewIcon } from "../lib/shapes";
import type { FlowNode } from "../types";

interface ShapePaletteProps {
  isShapeDropdownOpen: boolean;
  setIsShapeDropdownOpen: (value: boolean) => void;
  /** Warna yang dipakai untuk setiap bentuk baru yang ditambahkan. */
  selectedAddColor: string;
  setSelectedAddColor: (value: string) => void;
  /** Kata kunci penyaring bentuk. Saat terisi, semua grup dipaksa terbuka. */
  shapeSearchQuery: string;
  setShapeSearchQuery: (value: string) => void;
  expandedGroups: Record<string, boolean>;
  toggleGroupExpanded: (title: string) => void;
  handleAddNewNode: (type: FlowNode["type"], customColor?: string) => void;
  /** Dipanggil saat membuka palet (mis. tutup panel properti di HP). */
  onOpenPalette?: () => void;
}

export const ShapePalette: React.FC<ShapePaletteProps> = ({
  isShapeDropdownOpen,
  setIsShapeDropdownOpen,
  selectedAddColor,
  setSelectedAddColor,
  shapeSearchQuery,
  setShapeSearchQuery,
  expandedGroups,
  toggleGroupExpanded,
  handleAddNewNode,
  onOpenPalette,
}) => {
  const { t } = useTranslation();

  const closePalette = () => setIsShapeDropdownOpen(false);

  const panelBody = (
    <>
      {/* Panel Header */}
      <div className="p-3 border-b border-border-faint flex items-center justify-between shrink-0 bg-surface-sunken/50">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1 px-1.5 bg-primary/15 rounded text-primary shrink-0">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-medium text-content-strong tracking-tight truncate">
            {t("shapePalette.diagrammingShapes")}
          </span>
        </div>
        <button
          type="button"
          onClick={closePalette}
          className="p-1.5 text-content-subtle hover:text-content-body hover:bg-surface-muted rounded-lg shrink-0"
          aria-label={t("shapePalette.clear")}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Preset Colors Bar */}
      <div className="px-3 py-2 border-b border-border-faint bg-surface-sunken/20 flex items-center justify-between shrink-0 gap-2">
        <span className="text-[11px] font-medium text-content-subtle">
          {t("shapePalette.defaultColor")}
        </span>
        <div className="flex items-center gap-1">
          {["yellow", "blue", "green", "purple", "rose", "sky", "slate"].map((colName) => {
            const colorClassMap: Record<string, string> = {
              yellow: "bg-amber-300 border-amber-400",
              blue: "bg-blue-300 border-blue-400",
              green: "bg-emerald-300 border-emerald-400",
              purple: "bg-purple-300 border-purple-400",
              rose: "bg-rose-300 border-rose-400",
              sky: "bg-sky-300 border-sky-400",
              slate: "bg-surface-marker border-border-subtle",
            };
            return (
              <button
                key={colName}
                type="button"
                onClick={() => {
                  setSelectedAddColor(colName);
                  toast.info(t("toast.defaultColorSet", { warna: colName.toUpperCase() }));
                }}
                className={cn(
                  "w-3.5 h-3.5 rounded-full border transition-all active:scale-75",
                  colorClassMap[colName] || "bg-indigo-300",
                  selectedAddColor === colName
                    ? "ring-2 ring-primary ring-offset-1 scale-110 "
                    : "border-border-faint"
                )}
                title={t("flowchart.mulaiDenganWarna", { warna: colName })}
              />
            );
          })}
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-2.5 border-b border-border-faint shrink-0">
        <div className="relative font-sans">
          <Search className="w-3 h-3 text-content-subtle absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder={t("shapePalette.searchShape")}
            value={shapeSearchQuery}
            onChange={(e) => setShapeSearchQuery(e.target.value)}
            className="w-full text-xs sm:text-[11px] bg-surface-sunken border border-border-subtle rounded-lg p-1.5 pl-7 text-content placeholder-content-subtle focus:outline-none focus:ring-1 focus:ring-primary focus:bg-surface transition-all"
          />
          {shapeSearchQuery && (
            <button
              type="button"
              onClick={() => setShapeSearchQuery("")}
              className="absolute right-2.5 top-2.5 text-[10px] text-content-subtle"
            >
              {t("shapePalette.clear")}
            </button>
          )}
        </div>
      </div>

      {/* Categorized Scrollable Shapes */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2 custom-scrollbar min-h-0">
        {DIAGRAM_SHAPE_GROUPS.map((group, groupIdx) => {
          const filteredItems = group.items.filter(
            (item) =>
              item.name.toLowerCase().includes(shapeSearchQuery.toLowerCase()) ||
              (item.desc && item.desc.toLowerCase().includes(shapeSearchQuery.toLowerCase()))
          );

          if (filteredItems.length === 0) return null;

          const isExpanded = shapeSearchQuery.trim() !== "" ? true : !!expandedGroups[group.title];

          return (
            <div
              key={groupIdx}
              className="border-b border-border-faint/65 pb-2 last:border-b-0 space-y-1"
            >
              <button
                type="button"
                onClick={() => toggleGroupExpanded(group.title)}
                disabled={shapeSearchQuery.trim() !== ""}
                className="w-full flex items-center justify-between text-left py-1 hover:bg-surface-sunken/70 p-1 rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[11px] font-medium text-content-strong tracking-tight truncate">
                    {group.title}
                  </span>
                  {(group.title === "AWS" ||
                    group.title === "UML" ||
                    group.title === "My Shapes") && (
                    <span className="text-[9px] leading-none bg-primary/10 text-primary font-medium px-1 py-[1px] rounded border border-primary/30">
                      FREE
                    </span>
                  )}
                </div>

                {shapeSearchQuery.trim() === "" && (
                  <div className="p-0.5 rounded text-content-subtle group-hover:text-content-secondary shrink-0">
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <svg
                        className="w-3.5 h-3.5 transform -rotate-90 transition-transform duration-150"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth="2.5"
                      >
                        <path d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </div>
                )}
              </button>

              {isExpanded && (
                <div className="grid grid-cols-2 gap-1 mt-1 px-0.5">
                  {filteredItems.map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => {
                        handleAddNewNode(item.type as FlowNode["type"], selectedAddColor);
                        // Di HP tutup setelah pilih agar kanvas kembali fokus
                        if (
                          typeof window !== "undefined" &&
                          window.matchMedia("(max-width: 767px)").matches
                        ) {
                          closePalette();
                        }
                      }}
                      className="flex items-center gap-1.5 p-1.5 bg-surface hover:bg-primary/10 border border-border-faint hover:border-primary/30 text-left rounded-lg transition-all group pointer-events-auto w-full min-w-0"
                      title={t("flowchart.tambahKeKanvas", { bentuk: item.name })}
                    >
                      <div className="w-7 h-7 flex items-center justify-center shrink-0 border border-border-faint rounded-md bg-surface-sunken/30 group-hover:bg-primary/10 group-hover:border-primary/30 transition-all">
                        {renderMiniPreviewIcon(item.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium text-content-body leading-tight truncate group-hover:text-primary transition-colors">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-content-subtle leading-none truncate mt-0.5">
                          {item.desc}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {DIAGRAM_SHAPE_GROUPS.every(
          (group) =>
            group.items.filter(
              (item) =>
                item.name.toLowerCase().includes(shapeSearchQuery.toLowerCase()) ||
                (item.desc && item.desc.toLowerCase().includes(shapeSearchQuery.toLowerCase()))
            ).length === 0
        ) && (
          <div className="text-center py-8 text-content-subtle text-xs sm:text-[11px]">
            {t("shapePalette.noShapeFound")}
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="relative font-sans">
      <button
        type="button"
        onClick={() => {
          const next = !isShapeDropdownOpen;
          setIsShapeDropdownOpen(next);
          if (next) onOpenPalette?.();
        }}
        className={cn(
          "p-2 rounded-lg transition-all flex items-center justify-center w-9 h-9 border border-border-faint",
          isShapeDropdownOpen
            ? "bg-primary/10 border-primary/30 text-primary"
            : "hover:bg-surface-muted text-content-body"
        )}
        title={t("shapePalette.openCollection")}
      >
        <Layers className="w-4 h-4" />
      </button>

      {isShapeDropdownOpen && (
        <>
          {/* Mobile: backdrop + bottom sheet */}
          <div
            className="md:hidden fixed inset-0 z-40 bg-overlay/40"
            onClick={closePalette}
            aria-hidden
          />
          <div
            className={cn(
              "z-50 flex flex-col overflow-hidden select-none bg-surface/95 backdrop-blur-lg border border-border-subtle/40 shadow-[0_12px_40px_rgba(0,0,0,0.12)]",
              // Mobile sheet
              "max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:top-auto max-md:w-full max-md:max-h-[70vh] max-md:rounded-t-2xl max-md:border-b-0 safe-area-pb",
              // Desktop flyout
              "md:absolute md:left-11 md:top-0 md:w-64 md:h-[min(520px,calc(100vh-160px))] md:max-h-[560px] md:rounded-xl"
            )}
          >
            <div className="md:hidden flex justify-center pt-2 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-surface-strong" />
            </div>
            {panelBody}
          </div>
        </>
      )}
    </div>
  );
};
