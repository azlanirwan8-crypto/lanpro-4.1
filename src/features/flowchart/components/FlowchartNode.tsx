/**
 * Render satu node di kanvas: rangka bentuk, teks, port sambungan, pegangan
 * ukur, tombol auto-connect, dan bilah properti saat terpilih.
 *
 * Sebelumnya berupa badan `nodes.map()` di dalam FlowchartContainer — blok JSX
 * terbesar di berkas itu. Dipindah verbatim; yang berubah hanya cara ia
 * memperoleh data: dari closure atas state induk menjadi props eksplisit.
 *
 * Props-nya banyak dan itu memang konsekuensi yang disengaja. Node
 * bersinggungan dengan hampir seluruh state kanvas — seleksi, hover, drag,
 * mode sambung, tema, simulasi. Sejak #621 state itu datang sebagai BOOLEAN PER
 * BENTUK (`isSelected`, `isHovered`, `isDragging`, ...), bukan sebagai id
 * global: `selectedNodeId` yang dikirim apa adanya membuat SERATUS bentuk
 * ikut dirender ulang hanya karena satu bentuk dipilih, sehingga `React.memo`
 * di hilir tidak pernah lolos. Daftar props yang panjang justru membuat
 * ketergantungan itu terlihat, bukan menyembunyikannya di balik closure.
 */
import { useTranslation } from "react-i18next";
import React from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Plus, User, ExternalLink } from "lucide-react";
import { cn } from "../../../lib/utils";
import { gayaLabel, warnaLabel } from "../../../lib/warnaLabel";
import { customSvgTypes, renderCustomSvgShape } from "../lib/shapes";
import { getShapeThemeClasses, bentukLatarTerang } from "../lib/nodeTheme";
import { colorPaletteHex, ukuranBentukEfektif } from "../constants";
import { cincinBentuk, gayaBentuk, idGradienSumber, warnaSumberBentuk } from "../lib/gayaBentuk";
import { warnaTeksAman } from "../lib/gayaImpor";
import { NodePropertiesOverlay } from "./NodePropertiesOverlay";
import type { FlowNode, FlowEdge } from "../types";
import type { Task } from "../../../types";

interface FlowchartNodeProps {
  /** Node yang dirender oleh instance ini. */
  node: FlowNode;
  /** Bentuk ini bagian dari seleksi — termasuk kelompok hasil tempel. */
  isSelected: boolean;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedEdgeId: (id: string | null) => void;
  /** Bentuk ini ujung awal sambungan yang sedang ditarik. */
  isSourceOfConnect: boolean;
  /** Ada bentuk lain yang menjadi sumber sambungan (menentukan gaya hover). */
  adaSumberSambung: boolean;
  setConnectSourceId: (id: string | null) => void;
  isHovered: boolean;
  setHoveredNodeId: (id: string | null) => void;
  isDragging: boolean;
  isActiveSim: boolean;
  canvasTheme: "miro" | "blueprint";
  /** Menentukan boleh-tidaknya menu konteks dan sunting muncul. */
  isWorkspaceEditable: boolean;
  setActiveTool: (tool: "select" | "hand" | "connect") => void;
  setNodes: React.Dispatch<React.SetStateAction<FlowNode[]>>;
  setEdges: React.Dispatch<React.SetStateAction<FlowEdge[]>>;
  setNodeContextMenu: (menu: { x: number; y: number; nodeId: string } | null) => void;
  handleNodeMouseDown: (e: React.MouseEvent, node: FlowNode) => void;
  handleResizeMouseDown: (e: React.MouseEvent, nodeId: string, direction: "se" | "e" | "s") => void;
  /** `e` dipakai untuk memulai seretan sambungan (#548); tanpa event, jalur klik lama tetap jalan. */
  handleConnectPortClick: (
    nodeId: string,
    portName: string,
    e?: { clientX: number; clientY: number }
  ) => void;
  handleUpdateActiveNode: (props: Partial<FlowNode>) => void;
  /** #644 — label ditulis ke bentuknya SENDIRI, bukan ke "yang terpilih". */
  handleUpdateNode: (id: string, props: Partial<FlowNode>) => void;
  handleDuplicateNode: (node: FlowNode) => void;
  handleDeleteSelected: () => void;
  /** Task yang tertaut pada node, bila ada. */
  getLinkedTaskDetails: (taskId?: string) => Task | undefined;
  setSelectedTaskForDetail: (task: Task) => void;
  setIsTaskDetailModalOpen: (isOpen: boolean) => void;
  /** #321 — sembunyikan overlay node bila panel properti terbuka. */
  suppressNodeOverlay?: boolean;
}

/**
 * #654 — keluarga huruf label, dituliskan lewat tabel kecil supaya tepat satu
 * kemungkinan yang terpasang pada sebuah bentuk. Ketiganya diberi `!important`
 * di blok gaya papan (`FlowchartContainer.tsx`), tempatnya aturan
 * `font-family: Inter !important` untuk `textarea` di `src/index.css` bisa
 * dikalahkan tanpa menyentuh berkas itu.
 */
const KELAS_HURUF: Record<NonNullable<FlowNode["fontStyle"]>, string> = {
  sans: "huruf-sans",
  serif: "huruf-serif",
  mono: "huruf-mono",
};

/**
 * #670 - keluarga huruf dari berkas sumber dipetakan ke SALAH SATU kelas papan,
 * tidak pernah dipakai sebagai nilai CSS apa adanya. Nama yang tidak dikenal
 * jatuh ke sans - itu pilihan, bukan tebakan: papan ini hanya bisa menampilkan
 * tiga keluarga, dan menyuntik string asing ke `font-family` adalah jalan
 * masuknya gaya dari berkas unggahan orang ke layar.
 */
const KELUARGA_KE_KELAS: Record<string, string> = {
  courier: KELAS_HURUF.mono,
  "courier new": KELAS_HURUF.mono,
  monospace: KELAS_HURUF.mono,
  georgia: KELAS_HURUF.serif,
  times: KELAS_HURUF.serif,
  "times new roman": KELAS_HURUF.serif,
  serif: KELAS_HURUF.serif,
  helvetica: KELAS_HURUF.sans,
  arial: KELAS_HURUF.sans,
  verdana: KELAS_HURUF.sans,
  tahoma: KELAS_HURUF.sans,
  "sans-serif": KELAS_HURUF.sans,
};

const kelasKeluargaHuruf = (node: FlowNode): string => {
  if (node.fontStyle && node.fontStyle !== "sans") return KELAS_HURUF[node.fontStyle];
  const dariSumber = KELUARGA_KE_KELAS[(node.fontFamily || "").trim().toLowerCase()];
  return dariSumber || KELAS_HURUF.sans;
};

const FlowchartNodeBati: React.FC<FlowchartNodeProps> = ({
  node,
  isSelected,
  setSelectedNodeId,
  setSelectedEdgeId,
  isSourceOfConnect,
  adaSumberSambung,
  setConnectSourceId,
  isHovered,
  setHoveredNodeId,
  isDragging,
  isActiveSim,
  canvasTheme,
  isWorkspaceEditable,
  setActiveTool,
  setNodes,
  setEdges,
  setNodeContextMenu,
  handleNodeMouseDown,
  handleResizeMouseDown,
  handleConnectPortClick,
  handleUpdateActiveNode,
  handleUpdateNode,
  handleDuplicateNode,
  handleDeleteSelected,
  getLinkedTaskDetails,
  setSelectedTaskForDetail,
  setIsTaskDetailModalOpen,
  suppressNodeOverlay = false,
}) => {
  const { t } = useTranslation();
  const linkedTask = getLinkedTaskDetails(node.taskId);

  const nodeWidth = ukuranBentukEfektif(node).width;
  const nodeHeight = ukuranBentukEfektif(node).height;

  const isDiamond = node.type === "diamond" || node.type === "decision";
  const isBlueprint = canvasTheme === "blueprint";
  /**
   * #677 — hanya bentuk yang memuat LATAR TERANGNYA SENDIRI yang tidak boleh
   * diberi huruf putih. `card` mengurat latar putih bening 95 % di kedua mode
   * (kanvas mewakili dokumen, §22.5), sehingga `text-content-inverse` di atasnya
   * adalah putih-di-atas-putih. Daftarnya tinggal satu dan hidup di berkas yang
   * memasang kelas itu, `lib/nodeTheme.ts`, supaya tidak bisa lupa disamakan.
   */
  const mengguratLatarTerang = bentukLatarTerang.includes(node.type);
  const isSvgShape =
    customSvgTypes.includes(node.type as any) ||
    node.type === "parallelogram" ||
    node.type === "diamond" ||
    node.type === "decision";

  /**
   * #638 — satu sumber warna untuk SEMUA bentuk: latar RATA dan garis tepi
   * sewarna keluarga yang lunak, sama seperti draw.io. Dulu latar diambil dari
   * sini tetapi dari `colorPalettes` yang berbeda kelasnya, dan isian masih
   * bergradien 135 derajat - dua tone dalam satu bentuk itulah yang dilaporkan
   * sebagai "warnanya pecah".
   */
  const warnaBentuk = colorPaletteHex[node.color] || colorPaletteHex.indigo;
  /** #657 — hex dari berkas sumber, atau `undefined` bila bentuknya buatan papan. */
  const warnaSumber = warnaSumberBentuk(node);

  /**
   * #669 — tiga gaya yang berlaku untuk SEMUA cara menggambar bentuk (div, SVG,
   * maupun papan blueprint), jadi keduanya dihitung di sini dan digabung ke gaya
   * bingkai di bawah, BUKAN ke blok isian yang hanya untuk div.
   *
   * `opacity` sengaja tidak memakai penjaga "harus lebih besar dari nol":
   * `opacity=0` adalah nilai yang ada di berkas orang dan artinya berbeda dari
   * "tidak ada opasitas". Nol harus tetap menipis, bukan dianggap tidak ada.
   */
  const putar =
    typeof node.rotation === "number" && Number.isFinite(node.rotation) ? node.rotation : undefined;
  const opak =
    typeof node.opacity === "number" && Number.isFinite(node.opacity)
      ? Math.min(1, Math.max(0, node.opacity / 100))
      : undefined;
  /**
   * Bayangan dari berkas. Ini BUKAN memanggil kembali bayangan diam yang dicabut
   * #627 - yang dicabut saat itu adalah bayangan yang dipasang pada SEMUA bentuk
   * walau tidak ada yang memintanya. Di sini bentuknya sendiri yang meminta.
   */
  const hexGradien = node.gradientHex ? warnaTeksAman(node.gradientHex) : null;
  const idGradien = idGradienSumber(node.id);
  /**
   * Syaratnya HARUS SAMA dengan yang dipakai `lib/shapes.tsx` untuk memilih
   * `url(#..)`: kalau salah satu pihak menambahkan syarat, bentuk SVG bisa
   * menunjuk id yang tidak pernah dirender, dan kanvas menggambar bentuk tanpa
   * isian tanpa pesan apa pun. Tidak ada isian = tidak ada gradasi (#667), dan
   * papan gelap punya bahasa warnanya sendiri.
   */
  const adaGradien = !!hexGradien && !node.fillNone && !isBlueprint;
  const gayaSumber: React.CSSProperties = {
    ...(putar !== undefined ? { transform: `rotate(${putar}deg)` } : null),
    ...(opak !== undefined ? { opacity: opak } : null),
    ...(node.shadow && !isBlueprint
      ? { filter: "drop-shadow(2px 2px 1px rgba(0, 0, 0, 0.25))" }
      : null),
  };

  const cincin = cincinBentuk({
    isDragging,
    isSelected,
    isHovered,
    isSourceOfConnect,
    adaSumberSambung,
    isSvgShape,
  });

  return (
    <motion.div
      key={node.id}
      style={{
        left: `${node.x}px`,
        top: `${node.y}px`,
        width: `${nodeWidth}px`,
        height: `${nodeHeight}px`,
        willChange: "transform",
      }}
      onMouseDown={(e) => handleNodeMouseDown(e, node)}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedNodeId(node.id);
        setSelectedEdgeId(null);
        if (isWorkspaceEditable) {
          setNodeContextMenu({
            x: e.clientX,
            y: e.clientY,
            nodeId: node.id,
          });
        }
      }}
      onMouseEnter={() => setHoveredNodeId(node.id)}
      onMouseLeave={() => setHoveredNodeId(null)}
      className={cn(
        "absolute z-20 cursor-pointer rounded-[inherit]",
        isActiveSim && "ring-4 ring-emerald-500 shadow-2xl "
      )}
      animate={gayaBentuk({
        isDragging,
        isSelected,
        isHovered,
        isSourceOfConnect,
        adaSumberSambung,
        isSvgShape,
      })}
      // #642 — di bawah blok ini pernah ada `rotate` berkondisi yang minta
      // keyframes diulang selamanya selama bentuk menjadi sumber sambungan.
      // `gayaBentuk` mengunci PUTAR_BENTUK = 0 (#629: getaran bukan informasi),
      // jadi tidak ada nilai yang pernah berubah: konfigurasinya mati dan yang
      // tertinggal hanya biaya perawatannya. Satu pegas untuk semuanya.
      transition={{ type: "spring", stiffness: 450, damping: 22, mass: 0.5 }}
      id={`val-node-${node.id}`}
    >
      {/* Floating connection ports on hover/select */}
      {(isHovered || isSelected) && (
        <div className="absolute inset-0 pointer-events-none z-30">
          {/* TOP PORT */}
          <div
            className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-surface border-2 border-violet-500 shadow-md flex items-center justify-center hover:scale-130 hover:bg-violet-500/10 transition-all active:scale-95 cursor-crosshair pointer-events-auto"
            onMouseDown={(e) => {
              e.stopPropagation();
              handleConnectPortClick(node.id, "top", e);
            }}
            title={t("flowNode.dragTop")}
          >
            <Plus className="w-2 md:w-2.5 h-2 md:h-2.5 text-violet-600 font-medium" />
          </div>

          {/* RIGHT PORT */}
          <div
            className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-surface border-2 border-violet-500 shadow-md flex items-center justify-center hover:scale-130 hover:bg-violet-500/10 transition-all active:scale-95 cursor-crosshair pointer-events-auto"
            onMouseDown={(e) => {
              e.stopPropagation();
              handleConnectPortClick(node.id, "right", e);
            }}
            title={t("flowNode.dragRight")}
          >
            <Plus className="w-2 md:w-2.5 h-2 md:h-2.5 text-violet-600 font-medium" />
          </div>

          {/* BOTTOM PORT */}
          <div
            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-surface border-2 border-violet-500 shadow-md flex items-center justify-center hover:scale-130 hover:bg-violet-500/10 transition-all active:scale-95 cursor-crosshair pointer-events-auto"
            onMouseDown={(e) => {
              e.stopPropagation();
              handleConnectPortClick(node.id, "bottom", e);
            }}
            title={t("flowNode.dragBottom")}
          >
            <Plus className="w-2 md:w-2.5 h-2 md:h-2.5 text-violet-600 font-medium" />
          </div>

          {/* LEFT PORT */}
          <div
            className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-surface border-2 border-violet-500 shadow-md flex items-center justify-center hover:scale-130 hover:bg-violet-500/10 transition-all active:scale-95 cursor-crosshair pointer-events-auto"
            onMouseDown={(e) => {
              e.stopPropagation();
              handleConnectPortClick(node.id, "left", e);
            }}
            title={t("flowNode.dragLeft")}
          >
            <Plus className="w-2 md:w-2.5 h-2 md:h-2.5 text-violet-600 font-medium" />
          </div>
        </div>
      )}

      {/* Floating mini shapes attributes modification overlay */}
      <NodePropertiesOverlay
        node={node}
        isSelected={isSelected}
        suppressOverlay={suppressNodeOverlay}
        handleUpdateActiveNode={handleUpdateActiveNode}
        handleDuplicateNode={handleDuplicateNode}
        setActiveTool={setActiveTool}
        setConnectSourceId={setConnectSourceId}
        handleDeleteSelected={handleDeleteSelected}
      />

      {/* Shape Component Frame Body */}
      <div
        className={cn(getShapeThemeClasses(node, isSelected), "w-full h-full relative")}
        style={{
          ...(isBlueprint || isSvgShape
            ? null // blueprint punya gaya sendiri; bentuk SVG digambar `lib/shapes.tsx`
            : {
                // #657 — bentuk div memakai hex sumber bila ada; palet tetap
                // pemegang terakhir supaya papan yang dibuat dari nol tidak
                // berubah sedikit pun.
                backgroundColor: node.fillNone
                  ? "transparent"
                  : (warnaSumber.isi ?? warnaBentuk.bg),
                // #669 — `gradientColor=` pada bentuk div: gradasi vertical dari
                // isian asal ke warna gradiennya, seperti draw.io tanpa arah
                // eksplisit. Arah gradien (`gradientDirection`) belum didukung
                // dan itu tercatat sebagai batas, bukan dijanjikan.
                backgroundImage:
                  adaGradien && hexGradien
                    ? `linear-gradient(180deg, ${
                        (node.fillHex ? warnaSumber.isi : warnaBentuk.bg) ?? warnaBentuk.bg
                      } 0%, ${hexGradien} 100%)`
                    : undefined,
                borderColor: warnaSumber.tepi ?? warnaBentuk.stroke,
                // #655 — tebal tepi bentuk div dibaca dari bentuknya, tidak lagi
                // dipatok 1 px oleh kelas `border`. Angka, bukan string: React
                // yang menambahkan px. Catatan tempel dikecualikan karena tepinya
                // memang satu garis bawah (#652), dan bentuk tanpa tepi jangan
                // mendapat garis lagi.
                borderWidth:
                  node.type === "sticky" || node.borderStyle === "none"
                    ? undefined
                    : node.strokeWidth || 1,
              }),
          // #669 — putar, opasitas, dan bayangan berlaku untuk semua cara menggambar.
          ...gayaSumber,
        }}
      >
        {/* #669 — `<defs>` untuk bentuk SVG. Rujukan url(#..) berlaku sekalian
            dokumen, jadi isian yang dihitung `lib/shapes.tsx` menemukan gradien
            yang nama id-nya dihasilkan helper yang sama. */}
        {adaGradien && isSvgShape && hexGradien ? (
          <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
            <defs>
              <linearGradient id={idGradien} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={warnaSumber.isi ?? warnaBentuk.bg} />
                <stop offset="100%" stopColor={hexGradien} />
              </linearGradient>
            </defs>
          </svg>
        ) : null}

        {renderCustomSvgShape(
          node,
          canvasTheme,
          isSelected,
          isHovered,
          isDragging,
          isSourceOfConnect
        )}

        {/* #629 — satu cincin per keadaan, tidak berdenyut selamanya. */}
        {cincin.seleksi && (
          <div className="absolute -inset-1 rounded-[inherit] border-2 border-violet-500/60 pointer-events-none z-10" />
        )}

        {cincin.sumberSambung && (
          <div className="absolute -inset-1.5 rounded-[inherit] border-2 border-dashed border-rose-500/80 pointer-events-none z-10" />
        )}

        {node.type === "card" && (
          <div className="absolute top-0 inset-x-0 h-1 rounded-t-lg bg-indigo-500" />
        )}

        {isDiamond && node.type !== "decision" && node.type !== "diamond" && (
          <div className="absolute inset-1.5 border border-current/15 rotate-45 pointer-events-none rounded bg-inherit" />
        )}

        {node.type === "parallelogram" && (
          <div
            className={cn(
              "absolute inset-0 transform -skew-x-12 border border-current/15 rounded-md bg-inherit pointer-events-none",
              node.borderStyle === "dashed"
                ? "border-dashed border-2"
                : node.borderStyle === "none"
                  ? "border-0 shadow-none"
                  : "border-2"
            )}
          />
        )}

        {node.type === "document" && (
          <div className="absolute top-0 right-0 w-3 h-3 bg-current/15 rounded-bl border-b border-l border-current/15 pointer-events-none" />
        )}

        {(node.type === "subprocess" || node.type === "predefined") && (
          <>
            <div className="absolute left-1.5 inset-y-0 w-0.5 bg-current/15 pointer-events-none border-l border-current/20" />
            <div className="absolute right-1.5 inset-y-0 w-0.5 bg-current/15 pointer-events-none border-r border-current/20" />
          </>
        )}

        {(node.type === "cylinder" || node.type === "database") && (
          <>
            {/* Cylinder Top Lip overlay */}
            <div className="absolute top-0 inset-x-0 h-3 rounded-t-[18px] border-b border-current/20 bg-inherit pointer-events-none opacity-80" />
            {/* Cylinder Bottom curved base overlay */}
            <div className="absolute bottom-0 inset-x-0 h-3 rounded-b-[18px] border-t border-current/20 pointer-events-none opacity-40 bg-current/5" />
          </>
        )}

        {node.type === "actor" && (
          <User className="w-3.5 h-3.5 text-current/50 absolute top-2 left-1/2 -translate-x-1/2 pointer-events-none" />
        )}

        {node.type === "folder" && (
          <div className="absolute -top-1.5 left-2 w-7 h-1.5 rounded-t bg-inherit border-t border-x border-current/20 pointer-events-none" />
        )}

        {/* Display Text content box */}
        <div
          className={cn(
            "flex-1 w-full flex flex-col min-w-0 h-full relative z-10",
            // #666 — `verticalAlign` draw.io: label duduk di atas, tengah, atau
            // bawah bentuknya. Tengah memang bawaan, jadi hanya permintaan
            // sumber yang berpindah.
            node.verticalAlign === "top"
              ? "justify-start"
              : node.verticalAlign === "bottom"
                ? "justify-end"
                : "justify-center",
            node.type === "actor" && "pt-3.5"
          )}
          style={{ padding: isDiamond ? "15%" : undefined }}
        >
          <textarea
            disabled={!isWorkspaceEditable}
            value={node.label}
            // #644 — dulu memanggil `handleUpdateActiveNode`, yang menulis ke
            // bentuk TERPILIH dan mengembalikan tanpa arti kalau tidak ada yang
            // terpilih (keadaan biasa setelah menempel kelompok). Mengetik di
            // sini sekarang mengubah bentuk ini, dan fokusnya sekaligus memilih
            // bentuk itu supaya panel sifat tidak menunjuk bentuk lain.
            onChange={(e) => handleUpdateNode(node.id, { label: e.target.value })}
            onFocus={() => setSelectedNodeId(node.id)}
            className={cn(
              // #654 — berat dan keluarga huruf mengikuti bawaan draw.io: normal
              // (400) dan Helvetica. `tracking-tight` dilepas karena draw.io tidak
              // merapatkan huruf. Kelas huruf di bawah ditulis dengan `!important`
              // di blok gaya papan; tanpa penanda itu ia kalah oleh `index.css:493`
              // yang mengunci `font-family` semua `textarea`, sehingga tombol
              // serif/mono di panel sifat mengubah DATA tanpa mengubah TAMPILAN.
              "w-full bg-transparent border-0 resize-none text-current focus:outline-none focus:ring-1 focus:ring-violet-300 rounded leading-tight text-center custom-scrollbar",
              node.fontWeight === "bold" ? "font-bold" : "font-normal",
              canvasTheme === "blueprint" &&
                !mengguratLatarTerang &&
                "text-content-inverse select-text",
              kelasKeluargaHuruf(node),
              // #670 - dua gaya lagi dari bitmask `fontStyle` draw.io.
              node.italic && "italic",
              node.underline && "underline",
              node.align === "left" && "text-left",
              node.align === "right" && "text-right"
            )}
            style={{
              // #651 — warna huruf dari berkas impor. Nilainya sudah disaring
              // `warnaTeksAman()` (hanya hex 3/6 digit), jadi yang masuk ke sini
              // tidak pernah bisa berupa potongan CSS atau skrip.
              color: warnaTeksAman(node.fontColor) ?? undefined,
              // #654 — draw.io memakai SATU ukuran bawaan untuk semua bentuk, 12 px,
              // termasuk catatan tempel. Tangga 9/10/11/13 berdasarkan panjang teks
              // adalah kebiasaan papan Miro dan sudah tidak berlaku di sini.
              fontSize: `${node.fontSize || 12}px`,
            }}
            placeholder="..."
          />

          {/* Show Linked Jira / Backlog Scrum tasks indicators */}
          {linkedTask && (
            <div className="mt-1 flex flex-col items-center gap-0.5 w-full">
              <div
                style={gayaLabel(warnaLabel({ kelompok: "status", label: linkedTask.status }))}
                className="label-chip flex items-center gap-1 text-xs sm:text-[10px] font-normal uppercase tracking-normal px-1.5 py-0.5 rounded border shadow-soft cursor-pointer whitespace-nowrap"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTaskForDetail(linkedTask);
                  setIsTaskDetailModalOpen(true);
                }}
                title={t("flowNode.backlogDetail")}
              >
                <span>{linkedTask.key}</span>
                <span className="w-1 h-3 bg-current/40 mx-0.5" />
                <span className="truncate max-w-[65px]">{linkedTask.status}</span>
                <ExternalLink className="w-2 h-2 opacity-55" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Sizing Handles & Quick Auto-Connect Widget */}
      {isSelected && isWorkspaceEditable && (
        <>
          {/* Right East sizing circle handle */}
          <div
            onMouseDown={(e) => handleResizeMouseDown(e, node.id, "e")}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2.5 h-2.5 bg-violet-600 rounded-full border border-surface cursor-ew-resize z-30 hover:scale-125 transition-transform shadow-md"
            title={t("flowNode.resizeWidth")}
          />
          {/* Bottom South sizing circle handle */}
          <div
            onMouseDown={(e) => handleResizeMouseDown(e, node.id, "s")}
            className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2.5 h-2.5 bg-violet-600 rounded-full border border-surface cursor-ns-resize z-30 hover:scale-125 transition-transform shadow-md"
            title={t("flowNode.resizeHeight")}
          />
          {/* Corners SE sizing square handle */}
          <div
            onMouseDown={(e) => handleResizeMouseDown(e, node.id, "se")}
            className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-3.5 h-3.5 bg-violet-600 rounded border border-surface cursor-nwse-resize z-30 hover:scale-125 transition-transform shadow-md"
            title={t("flowNode.freeSizing")}
          />

          {/* Auto-Connector plus direction link helper */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              const nextNodeId = "node_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
              const nextX = node.x + nodeWidth + 120;
              const nextY = node.y;
              const newNode: FlowNode = {
                ...node,
                id: nextNodeId,
                x: nextX,
                y: nextY,
                label: "Langkah Alur Baru",
              };
              const newRelation: FlowEdge = {
                id: "edge_" + Date.now(),
                fromNodeId: node.id,
                toNodeId: nextNodeId,
              };
              setNodes((prev) => [...prev, newNode]);
              setEdges((prev) => [...prev, newRelation]);
              setSelectedNodeId(nextNodeId);
              toast.success(t("toast.autoConnectStep"));
            }}
            className="absolute -right-11 top-1/2 -translate-y-1/2 w-7 h-7 bg-surface hover:bg-violet-600 border shadow-soft-lg text-violet-600 hover:text-content-inverse rounded-full flex items-center justify-center font-medium text-base transition-all scale-90 hover:scale-110 z-30"
            title={t("flowNode.instantConnector")}
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Downward Auto-Connector plus direction link helper */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              const nextNodeId = "node_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
              const nextX = node.x;
              const nextY = node.y + nodeHeight + 100;
              const newNode: FlowNode = {
                ...node,
                id: nextNodeId,
                x: nextX,
                y: nextY,
                label: "Langkah Alur Baru",
              };
              const newRelation: FlowEdge = {
                id: "edge_" + Date.now(),
                fromNodeId: node.id,
                toNodeId: nextNodeId,
              };
              setNodes((prev) => [...prev, newNode]);
              setEdges((prev) => [...prev, newRelation]);
              setSelectedNodeId(nextNodeId);
              toast.success(t("toast.autoConnectDown"));
            }}
            className="absolute -bottom-11 left-1/2 -translate-x-1/2 w-7 h-7 bg-surface hover:bg-indigo-600 border shadow-soft-lg text-indigo-600 hover:text-content-inverse rounded-full flex items-center justify-center font-medium text-base transition-all scale-90 hover:scale-110 z-30"
            title={t("flowNode.instantDownConnector")}
          >
            <Plus className="w-4 h-4" />
          </button>
        </>
      )}
    </motion.div>
  );
};

/** #621 — menyeret satu bentuk tidak boleh membangunkan seluruh papan. */
export const FlowchartNode = React.memo(FlowchartNodeBati);
