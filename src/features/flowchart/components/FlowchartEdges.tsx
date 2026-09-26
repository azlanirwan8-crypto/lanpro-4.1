/**
 * Lapisan SVG kanvas: definisi penanda panah, gradien bentuk, seluruh garis
 * penghubung antar node, dan garis putus-putus yang mengikuti kursor saat
 * pengguna sedang menarik sambungan baru.
 *
 * Sebelumnya berupa satu elemen <svg> di dalam FlowchartContainer. Dipindah
 * verbatim; yang berubah hanya cara ia memperoleh data — dari closure atas
 * state induk menjadi props eksplisit.
 *
 * Berada di bawah node dalam urutan tumpuk (z-10 berbanding z-20) dan
 * `pointer-events-none` di tingkat svg, sehingga garis tidak menghalangi
 * interaksi dengan bentuk; hanya jalur tak terlihat yang lebar di tiap garis
 * yang menerima klik.
 */
import React, { useRef } from "react";
import { motion } from "framer-motion";
import { findSmartRoute } from "../lib/routing";
import { colorPaletteHex } from "../constants";
import { EdgeStyleBar } from "./EdgeStyleBar";
import type { FlowNode, FlowEdge, Point } from "../types";

type SimpananRute = { sig: string; points: Point[] };

/**
 * Gaya goresan tiap garis. "dotted" memakai ujung bulat agar jaraknya berubah
 * menjadi titik-titik, bukan garis-garis pendek.
 */
const DASH: Record<NonNullable<FlowEdge["strokeStyle"]>, string | undefined> = {
  solid: undefined,
  dashed: "9, 6",
  dotted: "0.5, 6",
};

/**
 * Item #521 — rute garis dihitung ulang HANYA bila geometri yang mempengaruhinya
 * berubah.
 *
 * Dulu setiap render memanggil `findSmartRoute` untuk SETIAP garis. Terukur:
 * satu lintasan penuh pada 25 bentuk / 35 garis butuh 105 ms, enam kali anggaran
 * satu frame (16,7 ms), padahal menggeser satu node hanya mengubah garis yang
 * benar-benar menempel padanya.
 *
 * Aturan sapuannya: selama sebuah node diseret (`draggingNodeId` terisi), tanda
 * tangan sebuah garis hanya memuat kedua ujungnya — jadi garis lain memakai hasil
 * tadi dan tidak ikut dihitung. Saat seretan berakhir, tanda tangan ditambah
 * geometri SEMUA node, sehingga seluruh garis dihitung sekali untuk mengoreksi
 * rute yang ternyata perlu mengitari node yang baru dipindah. Hasilnya: satu
 * perhitungan penuh per gerakan mouse, bukan per frame.
 */
function ruteDenganCache(
  kunci: string,
  tandaTangan: string,
  hitung: () => Point[],
  simpanan: Map<string, SimpananRute>
): Point[] {
  const lama = simpanan.get(kunci);
  if (lama && lama.sig === tandaTangan) return lama.points;
  const points = hitung();
  // Garis yang dihapus tidak pernah dibersihkan; bila simpanan membesar jauh
  // melebihi jumlah garis, buang seluruhnya daripada menahan rute basi.
  if (simpanan.size > 400) simpanan.clear();
  simpanan.set(kunci, { sig: tandaTangan, points });
  return points;
}

interface FlowchartEdgesProps {
  edges: FlowEdge[];
  nodes: FlowNode[];
  canvasTheme: "miro" | "blueprint";
  selectedEdgeId: string | null;
  setSelectedEdgeId: (id: string | null) => void;
  hoveredEdgeId: string | null;
  setHoveredEdgeId: (id: string | null) => void;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  hoveredNodeId: string | null;
  /** Node asal saat mode sambung aktif; null berarti tidak sedang menyambung. */
  connectSourceId: string | null;
  setConnectSourceId: (id: string | null) => void;
  /** Posisi kursor di ruang kanvas, dipakai ujung garis bantu. */
  hoverCoords: { x: number; y: number };
  /** Bentuk garis penghubung bawaan papan; dipakai garis yang belum punya pilihan. */
  connectorType: "bezier" | "straight" | "orthogonal";
  /** Skala papan saat ini — bilah gaya dibalik skalanya agar tetap terbaca. */
  zoomLevel: number;
  /** Simpan bentuk/goresan satu garis (popup mini saat garis diklik). */
  onEdgePatch: (id: string, patch: Partial<FlowEdge>) => void;
  /** Putuskan sambungan garis terpilih. Kosong = tombol putuskan tak dipakai. */
  onDeleteEdge?: () => void;
  /** Papan boleh diubah; bilah gaya tidak muncul untuk pembaca saja. */
  isEditable: boolean;
  /** Titik tengah sebuah node; tinggal di container karena membaca state nodes. */
  getNodeCenter: (nodeId: string) => { x: number; y: number };
  /** Node yang SEDANG diseret; null bila tidak ada. Paku sapuan cache rute #521. */
  draggingNodeId: string | null;
  /** Bentuk yang SEDANG diperbesar; null bila tidak ada. Paku yang sama (#542). */
  resizingNodeId: string | null;
}

export const FlowchartEdges: React.FC<FlowchartEdgesProps> = ({
  edges,
  nodes,
  canvasTheme,
  selectedEdgeId,
  setSelectedEdgeId,
  hoveredEdgeId,
  setHoveredEdgeId,
  selectedNodeId,
  setSelectedNodeId,
  hoveredNodeId,
  connectSourceId,
  setConnectSourceId,
  hoverCoords,
  connectorType,
  zoomLevel,
  onEdgePatch,
  onDeleteEdge,
  isEditable,
  getNodeCenter,
  draggingNodeId,
  resizingNodeId,
}) => {
  const simpananRute = useRef(new Map<string, SimpananRute>()).current;

  // Tanda tangan global (geometri SEMUA node, sumber rintangan rute) dibekukan
  // selama sebuah node diseret ATAU diperbesar. Bila tidak dibekukan, tanda
  // tangan tiap garis berubah bentuk antara render terakhir dan render pertama
  // seretan, sehingga semua garis dianggap basi dan sapuan cache rute (#521)
  // tidak berlaku sama sekali. Nilainya baru diperbarui pada render pertama
  // setelah interaksi usai — saat itulah seluruh garis memang perlu dikoreksi
  // sekali penuh.
  //
  // Item #542 — dulu hanya seretan yang dibekukan. Memperbesar bentuk juga
  // menulis ulang geometry ke state `nodes` (FlowchartContainer: setNodes pada
  // setiap frame resize) tanpa menyentuh `draggingNodeId`, jadi setiap frame
  // resize menghitung ulang SELURUH garis di kanvas. Terukur pada papan berisi
  // 50 bentuk/96 garis: 17,6 ms per frame (di atas anggaran 16,7 ms), dan
  // 489,8 ms per frame pada 200 bentuk/396 garis — board yang membuat papan
  // terasa patah-patah.
  const versiGlobal = useRef("");
  if (!draggingNodeId && !resizingNodeId) {
    versiGlobal.current = nodes
      .map((n) => `${n.id}:${n.x},${n.y},${n.width || 130},${n.height || 70}`)
      .join(";");
  }
  const tandaTanganGlobal = versiGlobal.current;

  // Titik tengah garis yang sedang dipilih. Diisi di dalam peta di bawah — hanya
  // di sana port yang sudah "tertarik magnet" ke tepi bentuk diketahui — dan
  // dipakai untuk menaruh bilah gaya garis.
  let titikBilah: { x: number; y: number } | null = null;

  const garisTerpilih = selectedEdgeId ? edges.find((e) => e.id === selectedEdgeId) : null;

  return (
    <>
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
        <defs>
          {/*
          Kepala panah (#522, butir e). Dulu `refX="14"` pada panah yang ujungnya ada di x=6,
          dengan satuan `strokeWidth` — artinya ujung panah duduk 8 × tebal-garis
          SEBELUM akhir garis (16 px pada garis biasa, 24 px saat terpilih), jadi
          garis selalu tampak bolong di ujungnya. `refX` kini tepat di ujung
          panah dan satuannya piksel papan, sehingga kepala panah menempel di
          tepi bentuk dan tidak ikut membesar saat garis ditebalkan.
        */}
          <marker
            id="canvas-arrow-head"
            viewBox="0 0 10 8"
            markerWidth="10"
            markerHeight="8"
            refX="9.5"
            refY="4"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path
              d="M0.8,0.8 L9.5,4 L0.8,7.2 Z"
              fill={canvasTheme === "miro" ? "#475569" : "#60a5fa"}
            />
          </marker>
          <marker
            id="canvas-arrow-head-selected"
            viewBox="0 0 10 8"
            markerWidth="10"
            markerHeight="8"
            refX="9.5"
            refY="4"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path d="M0.8,0.8 L9.5,4 L0.8,7.2 Z" fill="#8b5cf6" />
          </marker>

          {/* Dynamic gradients for beautiful, smooth custom shapes */}
          {Object.entries(colorPaletteHex).map(([colorName, colors]) => (
            <linearGradient
              key={colorName}
              id={`grad-${colorName}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor={colors.bg} />
              <stop offset="100%" stopColor={colors.bgGrad || colors.bg} />
            </linearGradient>
          ))}
        </defs>

        {/* Draw connecting Edge arrows */}
        {edges.map((edge) => {
          const source = nodes.find((n) => n.id === edge.fromNodeId);
          const target = nodes.find((n) => n.id === edge.toNodeId);

          const startCenter = getNodeCenter(edge.fromNodeId);
          const endCenter = getNodeCenter(edge.toNodeId);
          const isSelected = selectedEdgeId === edge.id;
          const isHovered = hoveredEdgeId === edge.id;

          const isSourceSelected = selectedNodeId === edge.fromNodeId;
          const isTargetSelected = selectedNodeId === edge.toNodeId;
          const isSourceHovered = hoveredNodeId === edge.fromNodeId;
          const isTargetHovered = hoveredNodeId === edge.toNodeId;
          const isNodeConnectedActive =
            isSourceSelected || isTargetSelected || isSourceHovered || isTargetHovered;

          if (startCenter.x === 0 || endCenter.x === 0) return null;

          // Magnetic Snapping and Dynamic Port Connection Locator
          const getClosestPortsPoint = (srcNode: FlowNode, tgtNode: FlowNode) => {
            const sW = srcNode.width || 130;
            const sH = srcNode.height || 70;
            const tW = tgtNode.width || 130;
            const tH = tgtNode.height || 70;

            const sourcePorts = [
              { name: "top", x: srcNode.x + sW / 2, y: srcNode.y, dir: { x: 0, y: -1 } },
              { name: "right", x: srcNode.x + sW, y: srcNode.y + sH / 2, dir: { x: 1, y: 0 } },
              { name: "bottom", x: srcNode.x + sW / 2, y: srcNode.y + sH, dir: { x: 0, y: 1 } },
              { name: "left", x: srcNode.x, y: srcNode.y + sH / 2, dir: { x: -1, y: 0 } },
            ];

            const targetPorts = [
              { name: "top", x: tgtNode.x + tW / 2, y: tgtNode.y, dir: { x: 0, y: -1 } },
              { name: "right", x: tgtNode.x + tW, y: tgtNode.y + tH / 2, dir: { x: 1, y: 0 } },
              { name: "bottom", x: tgtNode.x + tW / 2, y: tgtNode.y + tH, dir: { x: 0, y: 1 } },
              { name: "left", x: tgtNode.x, y: tgtNode.y + tH / 2, dir: { x: -1, y: 0 } },
            ];

            let minDistance = Infinity;
            let bestSource = sourcePorts[2]; // bottom fallback
            let bestTarget = targetPorts[0]; // top fallback

            for (const sP of sourcePorts) {
              for (const tP of targetPorts) {
                const dx = tP.x - sP.x;
                const dy = tP.y - sP.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < minDistance) {
                  minDistance = dist;
                  bestSource = sP;
                  bestTarget = tP;
                }
              }
            }

            return { source: bestSource, target: bestTarget };
          };

          const { source: startPort, target: endPort } =
            source && target
              ? getClosestPortsPoint(source, target)
              : {
                  source: { x: startCenter.x, y: startCenter.y, dir: { x: 0, y: 1 } },
                  target: { x: endCenter.x, y: endCenter.y, dir: { x: 0, y: -1 } },
                };

          const start = startPort;
          const end = endPort;

          // Find smart route path avoiding intermediate node obstacles. Item #521:
          // hasilnya disimpan per garis dan hanya dihitung ulang bila ujungnya
          // benar-benar bergerak (lihat ruteDenganCache di atas berkas).
          const tandaTangan =
            `${start.x},${start.y},${start.dir?.x},${start.dir?.y}|` +
            `${end.x},${end.y},${end.dir?.x},${end.dir?.y}#${tandaTanganGlobal}`;
          const pathPoints = ruteDenganCache(
            `${edge.fromNodeId}>${edge.toNodeId}`,
            tandaTangan,
            () => findSmartRoute(start, end, edge.fromNodeId, edge.toNodeId, nodes),
            simpananRute
          );

          // Bentuk jalur per garis: pilihan garis sendiri menang, selain itu ikut
          // bawaan papan.
          const bentuk = edge.connector ?? connectorType;

          // Compute custom router path based on active routing types (bezier, straight, orthogonal right-angles)
          let pathD = "";
          if (bentuk === "straight") {
            pathD = "M " + pathPoints.map((p) => `${p.x} ${p.y}`).join(" L ");
          } else if (bentuk === "orthogonal") {
            // Connect each consecutive point and align orthogonally beautiful
            let current = pathPoints[0];
            const parts = [`M ${current.x} ${current.y}`];
            for (let i = 1; i < pathPoints.length; i++) {
              const next = pathPoints[i];
              if (current.x !== next.x && current.y !== next.y) {
                if (i === 1) {
                  const dir = start.dir || { x: 0, y: 1 };
                  if (dir.x !== 0) {
                    parts.push(`L ${next.x} ${current.y}`);
                  } else {
                    parts.push(`L ${current.x} ${next.y}`);
                  }
                } else {
                  parts.push(`L ${next.x} ${current.y}`);
                }
              }
              parts.push(`L ${next.x} ${next.y}`);
              current = next;
            }
            pathD = parts.join(" ");
          } else {
            // Curved / Bezier
            if (pathPoints.length <= 2) {
              const dist = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
              const k = Math.min(100, Math.max(30, dist * 0.45));
              const cp1 = {
                x: start.x + (start.dir?.x || 0) * k,
                y: start.y + (start.dir?.y || 0) * k,
              };
              const cp2 = { x: end.x + (end.dir?.x || 0) * k, y: end.y + (end.dir?.y || 0) * k };
              pathD = `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`;
            } else {
              let d = `M ${pathPoints[0].x} ${pathPoints[0].y}`;
              for (let i = 1; i < pathPoints.length; i++) {
                const p = pathPoints[i];
                if (i === 1) {
                  const dist = Math.sqrt((p.x - start.x) ** 2 + (p.y - start.y) ** 2);
                  const k = Math.min(50, dist * 0.3);
                  const cp = {
                    x: start.x + (start.dir?.x || 0) * k,
                    y: start.y + (start.dir?.y || 0) * k,
                  };
                  d += ` Q ${cp.x} ${cp.y}, ${p.x} ${p.y}`;
                } else if (i === pathPoints.length - 1) {
                  const prev = pathPoints[i - 1];
                  const dist = Math.sqrt((end.x - prev.x) ** 2 + (end.y - prev.y) ** 2);
                  const k = Math.min(50, dist * 0.3);
                  const cp = { x: end.x + (end.dir?.x || 0) * k, y: end.y + (end.dir?.y || 0) * k };
                  d += ` Q ${cp.x} ${cp.y}, ${end.x} ${end.y}`;
                } else {
                  const prev = pathPoints[i - 1];
                  const midX = (prev.x + p.x) / 2;
                  const midY = (prev.y + p.y) / 2;
                  d += ` S ${midX} ${midY}, ${p.x} ${p.y}`;
                }
              }
              pathD = d;
            }
          }

          if (isSelected) titikBilah = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };

          return (
            <g
              key={edge.id}
              className="pointer-events-auto cursor-pointer"
              onMouseEnter={() => setHoveredEdgeId(edge.id)}
              onMouseLeave={() => setHoveredEdgeId(null)}
            >
              {/* Interaction trigger line (Invisible & wide) */}
              <path
                d={pathD}
                fill="none"
                stroke={isSelected ? "#c084fc" : "transparent"}
                strokeWidth="16"
                className="opacity-45 transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedEdgeId(edge.id);
                  setSelectedNodeId(null);
                  setConnectSourceId(null);
                }}
              />

              {/* Suble hover or selected pulse under-glow path */}
              {(isHovered || isSelected) && (
                <motion.path
                  d={pathD}
                  fill="none"
                  stroke={isSelected ? "#c084fc" : "#93c5fd"}
                  strokeWidth={isSelected ? "8" : "6"}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.2, 0.5, 0.2] }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.4,
                    ease: "easeInOut",
                  }}
                />
              )}

              {/* Flow Tracer Animation (When connected node is hovered or selected) */}
              {isNodeConnectedActive && (
                <motion.path
                  d={pathD}
                  fill="none"
                  stroke={isSourceSelected || isSourceHovered ? "#10b981" : "#3b82f6"} // Green/Emerald for outflow, Blue/Indigo for inflow
                  strokeWidth={isSelected ? "4" : "3"}
                  strokeLinecap="round"
                  strokeDasharray="12, 60"
                  animate={{ strokeDashoffset: [0, -72] }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.2,
                    ease: "linear",
                  }}
                  className="pointer-events-none opacity-90 drop-shadow-[0_0_2px_rgba(59,130,246,0.5)]"
                />
              )}

              {/*
              Jalur visual. Dulu sebuah motion.path yang menganimasikan pathLength
              dan, saat garis dipilih/disentuh, strokeDasharray '6, 4' / '4, 4'.
              Dua-duanya menghalangi permintaan pengguna: putus-putus dipakai sebagai
              STATUS, bukan sebagai gaya, dan framer-motion menghitung sendiri
              dasharray-nya dari pathLength sehingga gaya garis pilihan pengguna tidak
              akan pernah bisa terlihat. Animasi juga berarti satu loop rAF per garis
              yang disentuh. Status terpilih kini ditandai warna dan cahaya di bawah
              garis, sedangkan gaya goresan diambil dari garis itu sendiri.
            */}
              <path
                d={pathD}
                fill="none"
                stroke={
                  isSelected
                    ? "#8b5cf6"
                    : isHovered
                      ? "#3b82f6"
                      : canvasTheme === "miro"
                        ? "#475569"
                        : "#60a5fa"
                }
                strokeWidth={isSelected ? "3" : isHovered ? "2.5" : "2"}
                strokeLinecap={edge.strokeStyle === "dotted" ? "round" : "butt"}
                strokeDasharray={DASH[edge.strokeStyle ?? "solid"]}
                markerEnd={
                  isSelected ? "url(#canvas-arrow-head-selected)" : "url(#canvas-arrow-head)"
                }
                className="transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedEdgeId(edge.id);
                  setSelectedNodeId(null);
                  setConnectSourceId(null);
                }}
              />

              {/* Optional inline description on arrows */}
              {edge.label && (
                <foreignObject
                  x={(start.x + end.x) / 2 - 45}
                  y={(start.y + end.y) / 2 - 12}
                  width="90"
                  height="26"
                >
                  <div className="bg-surface border border-border-subtle text-xs sm:text-[11px] text-content-strong font-medium px-1.5 py-0.5 rounded shadow-soft text-center truncate">
                    {edge.label}
                  </div>
                </foreignObject>
              )}
            </g>
          );
        })}

        {/* Real-time interactive dotted helper path while creating connection lines */}
        {connectSourceId &&
          (() => {
            const srcNode = nodes.find((n) => n.id === connectSourceId);
            if (!srcNode) return null;
            const sW = srcNode.width || 130;
            const sH = srcNode.height || 70;
            const startX = srcNode.x + sW / 2;
            const startY = srcNode.y + sH / 2;
            const endX = hoverCoords.x;
            const endY = hoverCoords.y;

            const dx = endX - startX;
            const dy = endY - startY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const k = Math.min(100, Math.max(30, dist * 0.45));
            const pathD = `M ${startX} ${startY} C ${startX + k} ${startY}, ${endX - k} ${endY}, ${endX} ${endY}`;

            return (
              <motion.g
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
              >
                <motion.path
                  d={pathD}
                  fill="none"
                  stroke="#a78bfa"
                  strokeWidth="3"
                  strokeDasharray="6,4"
                  animate={{
                    strokeDashoffset: [-20, 0],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 0.8,
                    ease: "linear",
                  }}
                />
                <circle cx={endX} cy={endY} r="5" fill="#8b5cf6" className="animate-ping" />
                <circle cx={endX} cy={endY} r="4" fill="#8b5cf6" />
              </motion.g>
            );
          })()}
      </svg>

      {/* Bilah gaya garis: muncul saat sebuah garis diklik, meniru toolbar konteks
       Miro. Di luar svg supaya tetap HTML biasa (tombol dan tooltip asli), dan
       hanya untuk papan yang boleh diubah — pembaca saja tidak punya apa pun
       untuk diubah. */}
      {isEditable && garisTerpilih && titikBilah && (
        <EdgeStyleBar
          edge={garisTerpilih}
          bentukBawaan={connectorType}
          zoom={zoomLevel}
          titik={titikBilah}
          onPatch={(patch) => onEdgePatch(garisTerpilih.id, patch)}
          onDelete={onDeleteEdge}
        />
      )}
    </>
  );
};
