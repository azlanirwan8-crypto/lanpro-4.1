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
import React from "react";
import { AlignLeft, AlignCenter, AlignRight, Square, Copy, ArrowRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../../lib/utils";
import type { FlowNode } from "../types";

interface NodePropertiesOverlayProps {
  /** Node yang sedang dipilih; seluruh kendali di sini bekerja padanya. */
  node: FlowNode;
  isSelected: boolean;
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
  handleUpdateActiveNode,
  handleDuplicateNode,
  setActiveTool,
  setConnectSourceId,
  handleDeleteSelected,
}) => {
  const { t } = useTranslation();
  if (!isSelected) return null;

  return (
    <div
      className="absolute -top-16 left-1/2 -translate-x-1/2 bg-surface/95 backdrop-blur-md p-2 px-3 rounded-xl border border-border-subtle/90 shadow-[0_10px_35px_rgba(0,0,0,0.12)] flex items-center gap-2 z-40 select-none pointer-events-auto transition-all"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Shape Converter Selector */}
      <select
        value={node.type}
        onChange={(e) => {
          handleUpdateActiveNode({ type: e.target.value as FlowNode["type"] });
          toast.success(`Bentuk bentuk diubah ke ${e.target.value.toUpperCase()}!`);
        }}
        className="bg-surface-sunken border border-border-subtle text-xs sm:text-[10px] font-medium text-content-body outline-none p-1 rounded-lg cursor-pointer hover:bg-surface-muted max-w-[120px]"
        title={t("shapes.changeShapeType")}
      >
        <option value="rect">{t("shapes.rectangle")}</option>
        <option value="oval">{t("flowNode.shapeOval")}</option>
        <option value="diamond">{t("flowNode.shapeDecision")}</option>
        <option value="triangle">{t("shapes.triangle")}</option>
        <option value="pentagon">{t("shapes.pentagon")}</option>
        <option value="hexagon">{t("shapes.hexagon")}</option>
        <option value="octagon">{t("shapes.octagon")}</option>
        <option value="star">{t("shapes.star")}</option>
        <option value="arrowRight">{t("shapes.arrowRight")}</option>
        <option value="arrowLeft">{t("shapes.arrowLeft")}</option>
        <option value="arrowLeftRight">{t("shapes.arrowLeftRight")}</option>
        <option value="trapezoid">{t("shapes.trapezoid")}</option>
        <option value="cross">{t("shapes.crossPlus")}</option>
        <option value="chevron">{t("shapes.chevron")}</option>
        <option value="delay">{t("flowNode.shapeDelay")}</option>
        <option value="callout">{t("shapes.calloutBubble")}</option>
        <option value="cylinder">{t("shapes.databaseServer")}</option>
        <option value="sticky">{t("shapes.stickyNote")}</option>
        <option value="cloud">{t("shapes.cloudApi")}</option>
        <option value="circle">{t("shapes.circle")}</option>
        <option value="card">{t("shapes.cardItem")}</option>
        <option value="document">{t("shapes.docPage")}</option>
        <option value="subprocess">{t("shapes.subprocess")}</option>
        <option value="actor">{t("shapes.actorIcon")}</option>
        <option value="folder">{t("shapes.folderBlock")}</option>
        <option value="curlyLeft">{`Curly Left {`}</option>
        <option value="curlyRight">{`Curly Right }`}</option>
      </select>

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
              title={`Ubah warna ke: ${colName}`}
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
          toast.success(`Jenis garis diubah ke: ${(nextStyle || "solid").toUpperCase()}`);
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
          toast.info(`Sambungkan alur dari "${node.label}" ke shape berikutnya.`);
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
