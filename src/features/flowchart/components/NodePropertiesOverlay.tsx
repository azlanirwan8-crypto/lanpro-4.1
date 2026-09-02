/**
 * Bilah properti melayang di atas node yang sedang dipilih.
 *
 * Isinya: pengubah jenis bentuk, palet warna cepat, jenis huruf, perataan teks,
 * ukuran font, gaya garis tepi, duplikat, mulai sambungan, dan hapus.
 *
 * Sebelumnya berupa blok JSX di dalam FlowchartContainer, di dalam perulangan
 * render node. Dipindah verbatim; yang berubah hanya cara ia memperoleh data —
 * dari closure atas state induk menjadi props eksplisit.
 *
 * Penjaga `isSelected` yang dulu ada di sisi pemanggil kini menjadi early
 * return di sini, sehingga kondisi tampil-tidaknya menjadi urusan komponen ini.
 */
import { useTranslation } from "react-i18next";
import { StyledDropdown } from "../../../components/ui/CommonComponents";
import React from "react";
import { AlignLeft, AlignCenter, AlignRight, Square, Copy, ArrowRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../../lib/utils";
import type { FlowNode } from "../types";

interface NodePropertiesOverlayProps {
  /** Node yang sedang dipilih; seluruh kendali di sini bekerja padanya. */
  node: FlowNode;
  isSelected: boolean;
  /** #321 — sembunyikan bila panel/sheet properti sudah terbuka (hindari chrome ganda). */
  suppressOverlay?: boolean;
  /** Menerapkan perubahan sebagian pada node yang aktif. */
  handleUpdateActiveNode: (props: Partial<FlowNode>) => void;
  handleDuplicateNode: (node: FlowNode) => void;
  setActiveTool: (tool: "select" | "hand" | "connect") => void;
  setConnectSourceId: (id: string | null) => void;
  handleDeleteSelected: () => void;
}

export const NodePropertiesOverlay: React.FC<NodePropertiesOverlayProps> = ({
  node,
  isSelected,
  suppressOverlay = false,
  handleUpdateActiveNode,
  handleDuplicateNode,
  setActiveTool,
  setConnectSourceId,
  handleDeleteSelected,
}) => {
  const { t } = useTranslation();
  if (!isSelected || suppressOverlay) return null;

  return (
    <div
      className="absolute -top-16 left-1/2 -translate-x-1/2 bg-surface/95 backdrop-blur-md p-2 px-3 rounded-xl border border-border-subtle/90 shadow-[0_10px_35px_rgba(0,0,0,0.12)] items-center gap-2 z-40 select-none pointer-events-auto transition-all hidden md:flex"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Shape Converter Selector */}
      <span title={t("shapes.changeShapeType")} className="contents">
        <StyledDropdown
          value={node.type}
          onChange={(val) => {
            handleUpdateActiveNode({ type: val as FlowNode["type"] });
            toast.success(t("toast.shapeChanged", { bentuk: val.toUpperCase() }));
          }}
          options={[
            { id: "rect", label: t("shapes.rectangle") },
            { id: "oval", label: t("flowNode.shapeOval") },
            { id: "diamond", label: t("flowNode.shapeDecision") },
            { id: "triangle", label: t("shapes.triangle") },
            { id: "pentagon", label: t("shapes.pentagon") },
            { id: "hexagon", label: t("shapes.hexagon") },
            { id: "octagon", label: t("shapes.octagon") },
            { id: "star", label: t("shapes.star") },
            { id: "arrowRight", label: t("shapes.arrowRight") },
            { id: "arrowLeft", label: t("shapes.arrowLeft") },
            { id: "arrowLeftRight", label: t("shapes.arrowLeftRight") },
            { id: "trapezoid", label: t("shapes.trapezoid") },
            { id: "cross", label: t("shapes.crossPlus") },
            { id: "chevron", label: t("shapes.chevron") },
            { id: "delay", label: t("flowNode.shapeDelay") },
            { id: "callout", label: t("shapes.calloutBubble") },
            { id: "cylinder", label: t("shapes.databaseServer") },
            { id: "sticky", label: t("shapes.stickyNote") },
            { id: "cloud", label: t("shapes.cloudApi") },
            { id: "circle", label: t("shapes.circle") },
            { id: "card", label: t("shapes.cardItem") },
            { id: "document", label: t("shapes.docPage") },
            { id: "subprocess", label: t("shapes.subprocess") },
            { id: "actor", label: t("shapes.actorIcon") },
            { id: "folder", label: t("shapes.folderBlock") },
            { id: "curlyLeft", label: `Curly Left {` },
            { id: "curlyRight", label: `Curly Right }` },
          ]}
          buttonClassName="bg-surface-sunken border border-border-subtle text-xs sm:text-[10px] text-left font-medium text-content-body p-1 rounded-lg hover:bg-surface-muted max-w-[120px]"
        />
      </span>

      <div className="h-4 w-px bg-surface-strong" />

      {/* Quick Pastel Selection circle dots */}
      <div className="flex items-center gap-1">
        {["yellow", "blue", "green", "purple", "rose", "slate"].map((colName) => {
          const colorClassMap: Record<string, string> = {
            yellow: "bg-amber-500/15 hover:bg-amber-200",
            blue: " hover:bg-blue-200",
            green: "bg-emerald-500/15 hover:bg-emerald-200",
            purple: "bg-purple-500/15 hover:bg-purple-200",
            rose: "bg-rose-500/15 hover:bg-rose-200",
            slate: "bg-surface-muted hover:bg-surface-strong",
          };
          return (
            <button
              key={colName}
              onClick={() => {
                handleUpdateActiveNode({ color: colName });
              }}
              className={cn(
                "w-3.5 h-3.5 rounded-full border border-black/10 transition-transform hover:scale-125 focus:outline-none",
                colorClassMap[colName],
                node.color === colName && "ring-2 ring-violet-500 scale-110"
              )}
              title={t("flowchart.changeColorTo", { warna: colName })}
            />
          );
        })}
      </div>

      <div className="h-4 w-px bg-surface-strong" />

      {/* Font Family switch */}
      <button
        onClick={() => {
          const nextStyle: FlowNode["fontStyle"] =
            node.fontStyle === "sans" ? "serif" : node.fontStyle === "serif" ? "mono" : "sans";
          handleUpdateActiveNode({ fontStyle: nextStyle });
        }}
        className="p-1 px-1.5 hover:bg-surface-muted text-xs sm:text-[10px] rounded font-medium uppercase"
        title={t("shapes.fontFamily")}
      >
        {node.fontStyle || "sans"}
      </button>

      {/* Toggle Align text */}
      <button
        onClick={() => {
          const nextAlign: FlowNode["align"] =
            node.align === "left" ? "center" : node.align === "center" ? "right" : "left";
          handleUpdateActiveNode({ align: nextAlign });
        }}
        className="p-1 hover:bg-surface-muted rounded text-content-secondary pointer-events-auto"
        title={t("shapes.textAlign")}
      >
        {node.align === "left" ? (
          <AlignLeft className="w-3.5 h-3.5" />
        ) : node.align === "right" ? (
          <AlignRight className="w-3.5 h-3.5" />
        ) : (
          <AlignCenter className="w-3.5 h-3.5" />
        )}
      </button>

      <div className="h-4 w-px bg-surface-strong" />

      {/* Font sizing buttons */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={() =>
            handleUpdateActiveNode({ fontSize: Math.max(9, (node.fontSize || 12) - 1) })
          }
          className="p-1 hover:bg-surface-muted text-xs rounded font-medium"
          title={t("shapes.fontSmaller")}
        >
          -
        </button>
        <span className="text-xs sm:text-[10px] font-mono font-medium px-0.5 whitespace-nowrap">
          {node.fontSize || 12}px
        </span>
        <button
          onClick={() =>
            handleUpdateActiveNode({ fontSize: Math.min(22, (node.fontSize || 12) + 1) })
          }
          className="p-1 hover:bg-surface-muted text-xs rounded font-medium"
          title={t("shapes.fontLarger")}
        >
          +
        </button>
      </div>

      <div className="h-4 w-px bg-surface-strong" />

      {/* Border style loop selector */}
      <button
        onClick={() => {
          const nextStyle =
            node.borderStyle === "dashed"
              ? "none"
              : node.borderStyle === "none"
                ? "solid"
                : "dashed";
          handleUpdateActiveNode({ borderStyle: nextStyle as FlowNode["borderStyle"] });
          toast.success(
            t("toast.lineStyleChanged", { gaya: (nextStyle || "solid").toUpperCase() })
          );
        }}
        className="p-1 hover:bg-surface-muted rounded text-content-secondary"
        title={t("shapes.borderStyleTip")}
      >
        <Square
          className={cn(
            "w-3.5 h-3.5",
            node.borderStyle === "dashed" && "border-dashed border-2",
            node.borderStyle === "none" && "opacity-30"
          )}
        />
      </button>

      {/* Duplicate */}
      <button
        onClick={() => handleDuplicateNode(node)}
        className="p-1 text-content-muted hover:text-indigo-600 rounded hover:bg-indigo-500/10"
        title={t("shapes.duplicateShape")}
      >
        <Copy className="w-3.5 h-3.5" />
      </button>

      {/* Connection Drawer mode toggle */}
      <button
        onClick={() => {
          setActiveTool("connect");
          setConnectSourceId(node.id);
          toast.info(t("toast.connectFromShape", { nama: node.label }));
        }}
        className="p-1 text-content-muted hover:text-amber-500 rounded hover:bg-amber-500/10"
        title={t("shapes.startConnector")}
      >
        <ArrowRight className="w-3.5 h-3.5" />
      </button>

      <div className="h-4 w-px bg-surface-strong" />

      {/* Delete shape */}
      <button
        onClick={handleDeleteSelected}
        className="p-1 hover:text-rose-600 rounded hover:bg-rose-500/10"
        title={t("shapes.deleteShape")}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
