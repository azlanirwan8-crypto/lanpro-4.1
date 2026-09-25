/**
 * Item #529 — bilah gaya garis: melayang di tengah garis yang sedang dipilih, meniru
 * konteks toolbar Miro: satu keping pendek berisi bentuk jalur, gaya goresan,
 * dan hapus sambungan.
 *
 * Dulu satu-satunya cara mengubah garis adalah panel properti di kanan (hanya
 * label), dan gaya garis tidak bisa disimpan sama sekali karena `FlowEdge` tidak
 * punya field bentuk/goresan.
 *
 * Bilah ini dirender DI DALAM div kanvas yang diskalakan, jadi posisinya ikut
 * berpindah saat papan digeser atau di-zoom; skala pembalik pada pembungkusnya
 * membuat ukurannya tetap terbaca di zoom berapa pun.
 */
import React from "react";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { cn } from "../../../lib/utils";
import type { FlowEdge } from "../types";

type Bentuk = NonNullable<FlowEdge["connector"]>;
type Goresan = NonNullable<FlowEdge["strokeStyle"]>;

const BENTUK: { id: Bentuk; kunci: string; d: string }[] = [
  { id: "bezier", kunci: "flowchart.lineCurve", d: "M1 13 C 7 13, 8 3, 15 3" },
  { id: "orthogonal", kunci: "flowchart.lineElbow", d: "M1 13 L9 13 L9 3 L15 3" },
  { id: "straight", kunci: "flowchart.lineStraight", d: "M1 13 L15 3" },
];

const GORESAN: { id: Goresan; kunci: string; dash?: string }[] = [
  { id: "solid", kunci: "flowchart.lineSolid" },
  { id: "dashed", kunci: "flowchart.lineDashed", dash: "4 3" },
  { id: "dotted", kunci: "flowchart.lineDotted", dash: "0.6 3.6" },
];

interface EdgeStyleBarProps {
  edge: FlowEdge;
  /** Bentuk yang berlaku bila garis ini belum punya pilihan sendiri. */
  bentukBawaan: Bentuk;
  zoom: number;
  /** Titik papan (ruang kanvas) tempat bilah disangkurkan: tengah garis. */
  titik: { x: number; y: number };
  onPatch: (patch: Partial<FlowEdge>) => void;
  /** Putuskan sambungan. Kosong bila papan sedang baca-saja: tombolnya hilang. */
  onDelete?: () => void;
}

const Tombol: React.FC<{
  aktif: boolean;
  judul: string;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ aktif, judul, onClick, children }) => (
  <button
    type="button"
    title={judul}
    aria-label={judul}
    aria-pressed={aktif}
    onMouseDown={(e) => e.stopPropagation()}
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className={cn(
      "h-7 w-7 flex items-center justify-center rounded-md transition-all cursor-pointer",
      aktif
        ? "bg-primary/15 text-primary border border-primary/40"
        : "text-content-secondary hover:bg-surface-muted border border-transparent"
    )}
  >
    {children}
  </button>
);

export const EdgeStyleBar: React.FC<EdgeStyleBarProps> = ({
  edge,
  bentukBawaan,
  zoom,
  titik,
  onPatch,
  onDelete,
}) => {
  const { t } = useTranslation();
  const bentuk = edge.connector ?? bentukBawaan;
  const goresan = edge.strokeStyle ?? "solid";

  return (
    <div
      className="absolute z-30 pointer-events-none"
      style={{
        left: titik.x,
        top: titik.y,
        transform: `scale(${1 / (zoom || 1)})`,
        transformOrigin: "top left",
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="pointer-events-auto absolute flex items-center gap-0.5 -translate-x-1/2 -translate-y-1/2 bg-surface/85 backdrop-blur-md border border-border-subtle/60 rounded-lg p-1 shadow-soft-lg select-none">
        {BENTUK.map((opsi) => (
          <Tombol
            key={opsi.id}
            aktif={bentuk === opsi.id}
            judul={t(opsi.kunci)}
            onClick={() => onPatch({ connector: opsi.id })}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d={opsi.d}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </Tombol>
        ))}

        <div className="w-px h-4 bg-surface-strong mx-0.5" />

        {GORESAN.map((opsi) => (
          <Tombol
            key={opsi.id}
            aktif={goresan === opsi.id}
            judul={t(opsi.kunci)}
            onClick={() => onPatch({ strokeStyle: opsi.id })}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M1 8 L15 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap={opsi.id === "dotted" ? "round" : "butt"}
                strokeDasharray={opsi.dash}
              />
            </svg>
          </Tombol>
        ))}

        {onDelete && (
          <>
            <div className="w-px h-4 bg-surface-strong mx-0.5" />

            <Tombol aktif={false} judul={t("flowchart.disconnectFlow")} onClick={onDelete}>
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            </Tombol>
          </>
        )}
      </div>
    </div>
  );
};
