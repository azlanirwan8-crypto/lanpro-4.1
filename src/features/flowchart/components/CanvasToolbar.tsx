/**
 * Bilah kendali melayang di atas kanvas.
 *
 * #839 — bilah ini tinggal satu tombol. Pemilik proyek menunjuk layar: fungsi
 * yang sama muncul dua kali (JPG/JSON/.drawio di atas DAN di dock bawah, lalu
 * pembuka panel properti di sini DAN flap `Edit3` di kanan), dan minta semuanya
 * duduk di satu tempat. Yang pindah ke dock bawah: snap kisi, tiga pola papan,
 * pembuka editor `.drawio`, dan seluruh ekspor/impor. Pembuka panel properti di
 * bilah ini CABUT, bukan pindah: flap `Edit3` di kanan adalah yang dipertahankan
 * pemilik proyek, dan dua sakelar untuk satu panel hanya melahirkan dua keadaan
 * yang bisa berdebat.
 * Yang TETAP di kiri atas hanya layar penuh, karena padanannya di draw.io dan
 * Miro memang menempel di sudut, bukan di bilah aksi.
 *
 * #535 — target sentuh 44 px tetap dikunci test `targetSentuh-535.test.tsx`,
 * dan karena kendali yang pindah itu ikut dibawa ke dock, dock ikut diberi
 * lantai tinggi yang sama (`min-h-11`) supaya kepindahan mereka tidak
 * menurunkan target sentuhnya di bawah angka yang sudah dikunci.
 */
import { useTranslation } from "react-i18next";
import React from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { cn } from "../../../lib/utils";

interface CanvasToolbarProps {
  /** Papan sedang tampil layar penuh? Hanya papan, bukan seluruh aplikasi. */
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  isFullscreen,
  onToggleFullscreen,
}) => {
  const { t } = useTranslation();
  return (
    <div data-testid="bilah-atas-kanvas" className="absolute top-3 left-3 z-30 pointer-events-none">
      <div className="pointer-events-auto flex items-center bg-surface/70 hover:bg-surface/85 backdrop-blur-md border border-border-subtle/40 p-1 rounded-lg shadow-[0_6px_18px_rgba(0,0,0,0.05)] transition-all duration-300">
        <button
          type="button"
          onClick={onToggleFullscreen}
          aria-pressed={isFullscreen}
          aria-label={t(isFullscreen ? "common.exitFullscreen" : "common.fullscreen")}
          title={t(isFullscreen ? "common.exitFullscreen" : "common.fullscreen")}
          className={cn(
            "min-h-11 min-w-11 p-2 rounded-md transition-all cursor-pointer flex items-center justify-center border",
            isFullscreen
              ? "bg-primary/15 text-primary border-primary/30"
              : "text-content-secondary hover:bg-surface-muted hover:text-primary border-transparent"
          )}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
