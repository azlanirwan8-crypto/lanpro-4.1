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
import { ArrowRightLeft, Palette, Spline, Trash2 } from "lucide-react";
import { cn } from "../../../lib/utils";
import type { FlowEdge } from "../types";
import { warnaTeksAman } from "../lib/gayaImpor";
import { BENTUK_KEPALA, gambarKepala } from "./kepalaPanah";

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

/**
 * #854 — pilihan warna diambil dari token tema, bukan daftar hex bebas. Hex-nya
 * dibaca dari `src/index.css` saat tombol diklik, sehingga warna garis tetap
 * ikut aturan token (dan `audit:warna`) tanpa menyimpan nama token di
 * `strokeColor`: atribut SVG `stroke` tidak mengenal `var(...)`.
 */
const WARNA: { id: string; token: string; kunci: string }[] = [
  { id: "primary", token: "--color-primary", kunci: "flowchart.lineColorPrimary" },
  { id: "success", token: "--color-success", kunci: "flowchart.lineColorSuccess" },
  { id: "warning", token: "--color-warning", kunci: "flowchart.lineColorWarning" },
  { id: "danger", token: "--color-danger", kunci: "flowchart.lineColorDanger" },
  { id: "info", token: "--color-info", kunci: "flowchart.lineColorInfo" },
  { id: "strong", token: "--color-content-strong", kunci: "flowchart.lineColorStrong" },
];

const TEBAL: { id: number; kunci: string }[] = [
  { id: 1, kunci: "flowchart.lineWidthThin" },
  { id: 2, kunci: "flowchart.lineWidthMedium" },
  { id: 4, kunci: "flowchart.lineWidthThick" },
];

const bacaToken = (nama: string): string | null => {
  if (typeof window === "undefined") return null;
  const nilai = getComputedStyle(document.documentElement).getPropertyValue(nama).trim();
  return warnaTeksAman(nilai);
};

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
  /** Test-id lokal-netral: judulnya ikut bahasa, penanda test tidak boleh. */
  penanda?: string;
  children: React.ReactNode;
}> = ({ aktif, judul, onClick, penanda, children }) => (
  <button
    type="button"
    title={judul}
    data-testid={penanda}
    aria-label={judul}
    aria-pressed={aktif}
    onMouseDown={(e) => e.stopPropagation()}
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className={cn(
      // #856 — di layar sentuh tidak ada hover, jadi sasaran ketuknya dinaikkan
      // ke ruang minimum; di layar lebar kembali ke ukuran bilah semula.
      "h-7 w-7 min-h-11 min-w-11 md:min-h-0 md:min-w-0 flex items-center justify-center rounded-md transition-all cursor-pointer",
      aktif
        ? "bg-primary/15 text-primary border border-primary/40"
        : "text-content-secondary hover:bg-surface-muted border border-transparent"
    )}
  >
    {children}
  </button>
);

const TombolKepala: React.FC<{
  aktif: boolean;
  judul: string;
  onClick: () => void;
  /** Ujung panah di kanan (akhir) atau di kiri (awal). */
  balik: boolean;
  bentuk: string;
}> = ({ aktif, judul, onClick, balik, bentuk }) => (
  <button
    type="button"
    title={judul}
    aria-label={judul}
    aria-pressed={aktif}
    data-testid={`mata-panah-${balik ? "awal" : "akhir"}-${bentuk}`}
    onMouseDown={(e) => e.stopPropagation()}
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className={cn(
      "h-6 w-8 min-h-11 min-w-11 md:min-h-0 md:min-w-0 flex items-center justify-center rounded transition-all cursor-pointer",
      aktif
        ? "bg-primary/15 border border-primary/40"
        : "border border-transparent hover:bg-surface-muted"
    )}
  >
    <svg
      width="18"
      height="12"
      viewBox="0 0 10 8"
      aria-hidden="true"
      className="text-content-secondary"
    >
      <line x1="0" y1="4" x2="10" y2="4" stroke="currentColor" strokeWidth="0.7" />
      <g transform={balik ? "translate(10,0) scale(-1,1)" : undefined}>
        {gambarKepala(bentuk, true, "currentColor")}
      </g>
    </svg>
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
  /**
   * #759 — pemilih mata panah. Sejak #753 semua 21 kepala panah draw.io bisa
   * DIGAMBAR, tapi tidak ada satu pun antarmuka yang bisa MEMILIHNYA, jadi
   * kekayaan itu tidak bisa dipakai: diagram ER/UML tetap harus diedit di
   * draw.io lalu diimpor kembali. Bilah gaya garis adalah tempatnya — di
   * draw.io kepala panah memang bagian dari gaya garis, bukan properti bentuk.
   */
  const [bukaKepala, setBukaKepala] = React.useState(false);
  /** #854 — dua pemilih berbagi satu tempat di bawah bilah; jangan menumpuk. */
  const [bukaWarna, setBukaWarna] = React.useState(false);
  const toggleKepala = () => {
    setBukaWarna(false);
    setBukaKepala((v) => !v);
  };
  const toggleWarna = () => {
    setBukaKepala(false);
    setBukaWarna((v) => !v);
  };

  return (
    <div
      /* #537 — penanda untuk `handleExportJPG`. Bilah ini dirender DI DALAM
       * subtree kanvas yang dipotret `toJpeg`, jadi tanpa penanda ia ikut
       * terekam: klik satu garis lalu tekan Ekspor JPG menghasilkan berkas
       * dengan bilah melayang di tengah diagram. Chrome lain (minimap, dock,
       * flap Editor Properti) sudah berada di luar subtree itu dan tidak
       * butuh penanda. */
      data-abai-ekspor=""
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

        {/* #835 — setara "Reset Waypoints" draw.io: satu klik mengembalikan
            garis ke rute otomatis. #838 — tombol SELALU ada: bila waypoint
            sudah kosong namun rute otomatis sendiri masih berundak (dua
            jangkar tidak sama y persis, #833), klik mengubah garis ini jadi
            satu segmen lurus — satu-satunya cara geometris menghilangkan
            undakan itu. Bilah ini melayang di garis terpilih, jadi aksinya
            ada di tempat yang sedang dilihat. */}
        <Tombol
          aktif={false}
          penanda="tombol-luruskan-garis"
          judul={t("flowchart.straightenLine")}
          onClick={() =>
            onPatch(edge.waypoints?.length ? { waypoints: [] } : { connector: "straight" })
          }
        >
          <Spline className="w-3.5 h-3.5" />
        </Tombol>

        {/* #855 — balik arah: tukar kedua ujung BESERTA portnya lewat satu
            patch. Menghapus lalu menggambar ulang akan melenyapkan label,
            gaya, dan tekukan, dan mencatat dua keadaan riwayat. */}
        <Tombol
          aktif={false}
          penanda="tombol-balik-arah"
          judul={t("flowchart.reverseEdge")}
          onClick={() =>
            onPatch({
              fromNodeId: edge.toNodeId,
              toNodeId: edge.fromNodeId,
              portSumber: edge.portTujuan,
              portTujuan: edge.portSumber,
            })
          }
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
        </Tombol>

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

        <div className="w-px h-4 bg-surface-strong mx-0.5" />

        {/* #854 — tebal garis: tiga angka yang sama dengan yang dipakai
            draw.io (1/2/4). Garis yang digambar sudah membaca `strokeWidth`
            sejak #665; yang kurang hanya kontrolnya. */}
        {TEBAL.map((opsi) => (
          <Tombol
            key={opsi.id}
            aktif={(edge.strokeWidth ?? 1) === opsi.id}
            penanda={`tebal-garis-${opsi.id}`}
            judul={t(opsi.kunci)}
            onClick={() => onPatch({ strokeWidth: opsi.id })}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M1 8 L15 8"
                fill="none"
                stroke="currentColor"
                strokeWidth={Math.max(1, opsi.id * 1.2)}
                strokeLinecap="round"
              />
            </svg>
          </Tombol>
        ))}

        <Tombol
          aktif={bukaWarna}
          penanda="tombol-warna-garis"
          judul={t("flowchart.lineColor")}
          onClick={toggleWarna}
        >
          <Palette className="w-3.5 h-3.5" />
        </Tombol>

        <div className="w-px h-4 bg-surface-strong mx-0.5" />

        <Tombol
          aktif={bukaKepala}
          penanda="tombol-mata-panah"
          judul={t("flowchart.arrowHead")}
          onClick={toggleKepala}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M1 8 L11 8" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M11 4 L15 8 L11 12 Z" fill="currentColor" />
          </svg>
        </Tombol>

        {onDelete && (
          <>
            <div className="w-px h-4 bg-surface-strong mx-0.5" />

            <Tombol aktif={false} judul={t("flowchart.disconnectFlow")} onClick={onDelete}>
              <Trash2 className="w-3.5 h-3.5 text-danger" />
            </Tombol>
          </>
        )}
      </div>

      {/* #854 — pemilih warna garis. Nilainya dibaca dari token tema saat
          diklik, jadi tidak ada daftar hex yang bisa menyimpang dari palet. */}
      {bukaWarna && (
        <div
          data-testid="pemilih-warna-garis"
          className="pointer-events-auto absolute left-1/2 top-5 -translate-x-1/2 w-[204px] max-w-[86vw] bg-surface/95 backdrop-blur-md border border-border-subtle/60 rounded-lg p-2 shadow-soft-lg select-none"
        >
          <div className="text-[10px] text-content-muted mb-1">{t("flowchart.lineColor")}</div>
          <div className="flex flex-wrap gap-1.5">
            {WARNA.map((warna) => {
              const hex = bacaToken(warna.token);
              const aktif = hex !== null && edge.strokeColor === hex;
              return (
                <button
                  key={warna.id}
                  type="button"
                  title={t(warna.kunci)}
                  aria-label={t(warna.kunci)}
                  aria-pressed={aktif}
                  data-testid={`warna-garis-${warna.id}`}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hex) onPatch({ strokeColor: hex });
                  }}
                  className={cn(
                    "h-6 w-6 rounded-full transition-all cursor-pointer",
                    aktif
                      ? "border-2 border-primary"
                      : "border border-border-subtle hover:border-primary/60"
                  )}
                  style={{ backgroundColor: `var(${warna.token})` }}
                />
              );
            })}
          </div>
          <button
            type="button"
            data-testid="warna-garis-tema"
            aria-pressed={!edge.strokeColor}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onPatch({ strokeColor: undefined });
            }}
            className={cn(
              "mt-2 w-full h-7 rounded-md text-[11px] transition-all cursor-pointer",
              !edge.strokeColor
                ? "bg-primary/15 text-primary border border-primary/40"
                : "text-content-secondary hover:bg-surface-muted border border-transparent"
            )}
          >
            {t("flowchart.lineColorTheme")}
          </button>
        </div>
      )}

      {bukaKepala && (
        <div
          data-testid="pemilih-mata-panah"
          className="pointer-events-auto absolute left-1/2 top-5 -translate-x-1/2 w-[340px] max-w-[86vw] bg-surface/95 backdrop-blur-md border border-border-subtle/60 rounded-lg p-2 shadow-soft-lg select-none"
        >
          {(
            [
              ["akhir", "endArrow"],
              ["awal", "startArrow"],
            ] as const
          ).map(([label, medan]) => (
            <div key={medan} className="mb-1.5 last:mb-0">
              <div className="text-[10px] text-content-muted mb-1">
                {t(`flowchart.arrow${label === "akhir" ? "End" : "Start"}`)}
              </div>
              <div className="flex flex-wrap gap-0.5">
                {BENTUK_KEPALA.map((kepala) => (
                  <TombolKepala
                    key={kepala}
                    bentuk={kepala}
                    balik={label === "awal"}
                    aktif={(edge[medan] ?? "classic") === kepala}
                    judul={kepala}
                    onClick={() => onPatch({ [medan]: kepala })}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
