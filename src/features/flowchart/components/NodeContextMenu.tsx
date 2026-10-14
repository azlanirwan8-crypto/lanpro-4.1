import { useTranslation } from "react-i18next";
import React, { useEffect, useRef } from "react";
import { motion } from "motion/react";
import {
  Trash2,
  Edit3,
  Palette,
  Copy,
  Check,
  ClipboardCopy,
  BringToFront,
  SendToBack,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { colorPaletteHex, colorPalettes } from "../constants";

/** Arah tata lapisan (#615). `naik`/`turun` satu tingkat, `depan`/`belakang` ke ujung. */
export type ArahLayers = "depan" | "naik" | "turun" | "belakang";

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
  onCopy: (nodeId: string) => void;
  onZOrder: (nodeId: string, arah: ArahLayers) => void;
}

const IKON_LAYERS = "w-3.5 h-3.5";

/** Urutan tampil = urutan aksi di strip #615. */
const ITEM_TATA_LAYERS: { arah: ArahLayers; kunci: string; ikon: React.ReactElement }[] = [
  { arah: "depan", kunci: "nodeMenu.zDepan", ikon: <BringToFront className={IKON_LAYERS} /> },
  { arah: "naik", kunci: "nodeMenu.zNaik", ikon: <ChevronUp className={IKON_LAYERS} /> },
  { arah: "turun", kunci: "nodeMenu.zTurun", ikon: <ChevronDown className={IKON_LAYERS} /> },
  { arah: "belakang", kunci: "nodeMenu.zBelakang", ikon: <SendToBack className={IKON_LAYERS} /> },
];

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
  onCopy,
  onZOrder,
}) => {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);

  /* #663 — menu ini dulu menyimpan daftar warnanya sendiri: 11 entri berkelas
   * Tailwind keras sementara `colorPaletteHex` (dikunci #638) punya 12, jadi
   * `amber` tidak bisa dipilih dari sini dan petak yang tampil tidak sama
   * dengan warna bentuknya. Satu sumber, dibaca apa adanya. */
  const colorsList = Object.keys(colorPaletteHex);

  // Adjust coordinates so it doesn't overflow screen boundaries
  const adjustedX = Math.min(x, window.innerWidth - 210);
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
      <div className="px-3 py-1.5 text-xs sm:text-[11px] font-normal uppercase tracking-normal text-content-subtle border-b border-border-faint mb-1">
        <span>{t("nodeMenu.title")}</span>
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

      {/* Copy Button (#582 — dulu menu ini hanya punya Duplikat, tidak ada Salin) */}
      <button
        onClick={() => {
          onCopy(nodeId);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl text-content-body hover:text-primary hover:bg-primary/10 transition-colors text-left"
      >
        <ClipboardCopy className="w-3.5 h-3.5 text-content-subtle" />
        <span>{t("nodeMenu.copy")}</span>
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

      {/*
        #615 — tata lapisan. Bentuk digambar dalam urutan array, jadi sebelum
        item ini tidak ada cara menata dua bentuk yang bertumpuk selain hapus
        lalu gambar ulang. Strip ikon, bukan empat baris teks: aksinya satu
        kelompok dan namanya terlalu mirip untuk dibedakan lewat bacaan.
      */}
      <div className="flex items-center gap-1 px-3 pb-1">
        <span className="text-xs sm:text-[11px] uppercase tracking-normal text-content-subtle mr-1 shrink-0">
          {t("nodeMenu.tataLayers")}
        </span>
        {ITEM_TATA_LAYERS.map((item) => (
          <button
            key={item.arah}
            type="button"
            onClick={() => {
              onZOrder(nodeId, item.arah);
              onClose();
            }}
            aria-label={t(item.kunci)}
            title={t(item.kunci)}
            className="min-h-9 min-w-9 p-1.5 rounded-lg text-content-secondary hover:text-primary hover:bg-primary/10 border border-border-faint/70 transition-colors flex items-center justify-center cursor-pointer"
          >
            {item.ikon}
          </button>
        ))}
      </div>

      {/* Change Color Palette Title */}
      <div className="px-3 py-1 flex items-center gap-1.5 text-xs sm:text-[11px] font-normal uppercase tracking-normal text-content-subtle">
        <Palette className="w-3 h-3 text-content-subtle" />
        <span>{t("nodeMenu.changeColor")}</span>
      </div>

      {/* Color Circle Grid Picker */}
      <div className="grid grid-cols-4 gap-1.5 p-2 bg-surface-sunken/50 rounded-xl border border-border-faint/80 my-1">
        {colorsList.map((nama) => {
          const isSelected = nodeColor === nama;
          return (
            <button
              key={nama}
              onClick={() => {
                onChangeColor(nodeId, nama);
                onClose();
              }}
              style={{
                backgroundColor: colorPaletteHex[nama]?.bg,
                borderColor: colorPaletteHex[nama]?.stroke,
              }}
              className={cn(
                "w-7 h-7 rounded-lg transition-transform hover:scale-110 active:scale-95 flex items-center justify-center relative shadow-soft cursor-pointer border",
                isSelected && "ring-2 ring-primary scale-105"
              )}
              title={t("flowchart.changeColorTo", { warna: nama })}
            >
              {isSelected && (
                /* Centangnya memakai warna TEKS palet yang sama (#677): isian
                 * pastel membuat `text-content-inverse` nyaris tak terlihat. */
                <Check className={cn("w-3.5 h-3.5 stroke-[3.5px]", colorPalettes[nama]?.text)} />
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
        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl text-danger-text hover:bg-danger/10 transition-colors text-left"
      >
        <Trash2 className="w-3.5 h-3.5 text-danger" />
        <span>{t("nodeMenu.delete")}</span>
      </button>
    </motion.div>
  );
};
