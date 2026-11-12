import { useTranslation } from "react-i18next";
import React, { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Edit3, Spline, Trash2 } from "lucide-react";
import { KELAS_MENU_KONTEKS } from "./NodeContextMenu";

interface EdgeContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onEditLabel: () => void;
  onStraighten: () => void;
  onDelete: () => void;
}

/**
 * #852 — menu klik-kanan untuk GARIS.
 *
 * Sebelum ini klik-kanan pada garis membuka menu kanvas berisi daftar bentuk:
 * handler kanvas hanya mengecualikan tombol/input/pembungkus bentuk, sehingga
 * jalur SVG garis lolos ke menu "tambah bentuk". Di draw.io klik-kanan garis
 * adalah tempat tindakan garis itu sendiri. Tiga aksi di sini yang paling
 * sering dipakai; gaya garis sudah punya bilahnya sendiri saat garis diklik.
 *
 * Posisi, penutupan (klik luar, Escape), dan animasinya sengaja mengikuti
 * `NodeContextMenu` supaya dua menu konteks papan terasa sama.
 */
export const EdgeContextMenu: React.FC<EdgeContextMenuProps> = ({
  x,
  y,
  onClose,
  onEditLabel,
  onStraighten,
  onDelete,
}) => {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);

  const adjustedX = Math.min(x, window.innerWidth - 210);
  const adjustedY = Math.min(y, window.innerHeight - 200);

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

  return (
    <motion.div
      ref={menuRef}
      data-testid="menu-garis"
      role="menu"
      aria-label={t("edgeMenu.title")}
      initial={{ opacity: 0, scale: 0.95, y: -5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -5 }}
      transition={{ duration: 0.12, ease: "easeOut" }}
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
      className={KELAS_MENU_KONTEKS}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="px-3 py-1.5 text-[11px] font-normal uppercase tracking-normal text-content-subtle border-b border-border-faint mb-1">
        <span>{t("edgeMenu.title")}</span>
      </div>

      <button
        role="menuitem"
        onClick={() => {
          onEditLabel();
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl text-content-body hover:text-primary hover:bg-primary/10 transition-colors text-left"
      >
        <Edit3 className="w-3.5 h-3.5 text-content-subtle" />
        <span>{t("edgeMenu.editLabel")}</span>
      </button>

      <button
        role="menuitem"
        onClick={() => {
          onStraighten();
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl text-content-body hover:text-primary hover:bg-primary/10 transition-colors text-left"
      >
        <Spline className="w-3.5 h-3.5 text-content-subtle" />
        <span>{t("edgeMenu.straighten")}</span>
      </button>

      <button
        role="menuitem"
        onClick={() => {
          onDelete();
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl text-danger-text hover:bg-danger/10 transition-colors text-left"
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span>{t("edgeMenu.delete")}</span>
      </button>
    </motion.div>
  );
};
