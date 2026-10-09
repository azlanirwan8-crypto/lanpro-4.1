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
import { motion } from "motion/react";
import { findSmartRoute, memotongInteriorKotak } from "../lib/routing";
import { colorPaletteHex, ukuranBentukEfektif } from "../constants";
import { EdgeStyleBar } from "./EdgeStyleBar";
import { warnaTeksAman } from "../lib/gayaImpor";
import type { FlowNode, FlowEdge, Point } from "../types";

type SimpananRute = { sig: string; points: Point[] };
type Kotak = { x1: number; y1: number; x2: number; y2: number };

/**
 * Margin sebuah bentuk dianggap "menghalangi" garis. SAMA dengan `padding` di
 * `lib/routing.ts` — kalau dua angka ini berbeda, uji sentuh di bawah tidak lagi
 * menjawab pertanyaan yang sama dengan peruteannya.
 */
const MARGIN_RUTE = 26;

const kotakBentuk = (n: FlowNode): Kotak => ({
  x1: n.x - MARGIN_RUTE,
  y1: n.y - MARGIN_RUTE,
  x2: n.x + ukuranBentukEfektif(n).width + MARGIN_RUTE,
  y2: n.y + ukuranBentukEfektif(n).height + MARGIN_RUTE,
});

/**
 * Titik di TENGAH SEPANJANG jalur (#653) — bukan rata-rata koordinat ujung.
 *
 * Rata-rata ujung jatuh di ruang kosong begitu garis mengitari bentuk, jadi
 * pemegang "tambah tekukan" harus duduk di separuh panjang garisnya sendiri, di
 * atas segmen yang benar-benar ada. `titikBilah` lama memakai rata-rata itu dan
 * tetap begitu untuk bilah gaya; yang baru hanya untuk pemegang tekukan.
 */
export const titikTengahJalur = (points: Point[]): Point => {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return points[0];
  let jumlah = 0;
  for (let i = 1; i < points.length; i++)
    jumlah += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  const sasaran = jumlah / 2;
  let berjalan = 0;
  for (let i = 1; i < points.length; i++) {
    const panjang = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    if (berjalan + panjang >= sasaran) {
      const t = panjang === 0 ? 0 : (sasaran - berjalan) / panjang;
      return {
        x: Math.round(points[i - 1].x + (points[i].x - points[i - 1].x) * t),
        y: Math.round(points[i - 1].y + (points[i].y - points[i - 1].y) * t),
      };
    }
    berjalan += panjang;
  }
  return points[points.length - 1];
};

/**
 * Apakah salah satu patahan jalur MEMOTONG INTERIOR kotak ini?
 *
 * #544: sejak perutean boleh menyentuh sudut rintangan, rute yang sah memang
 * berjalan di sepanjang tepi kotak pelebaran ini. Dengan predikat lama
 * (`isSegmentIntersectingRect`, yang menghitung sentuhan sebagai halangan)
 * setiap rute memutar akan dianggap "terganggu", `kotakBerubah` tidak pernah
 * kosong lagi, dan rute dihitung ulang di SETIAP render — cache #521 tadi
 * persis yang dibuang. Pertanyaan yang mau dijawab pemanggil ini adalah
 * "apakah garisnya sekarang salah lewat?", dan itu sama dengan memotong, bukan
 * dengan menyenggol.
 */
function jalurMemotongKotak(path: Point[], k: Kotak): boolean {
  for (let i = 1; i < path.length; i++) {
    if (memotongInteriorKotak(path[i - 1], path[i], k)) return true;
  }
  return false;
}

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
 * #669 - arah garis keluar dari sebuah titik port, yaitu sumbu yang paling jauh
 * dari tengah bentuk. draw.io menyimpan SATU titik, bukan arahnya; arahnya
 * diturunkan dari sisi mana titik itu duduk, karena mata panah dan belokan
 * pertama rute dibangun dari arah ini.
 *
 * Titik tepat di tengah (0.5, 0.5) tidak punya sisi. Ia diambil sebagai tumpu
 * `kanan`, bukan karena benar, tetapi karena harus mengembalikan sesuatu; berkas
 * draw.io yang sungguh-sungguh menulis tengah berarti garis menempel di dalam
 * bentuk, dan itu belum punya jalan di papan ini.
 */
export const arahPort = (p: Point): { x: number; y: number } => {
  const dx = p.x - 0.5;
  const dy = p.y - 0.5;
  if (Math.abs(dx) >= Math.abs(dy)) return { x: dx >= 0 ? 1 : -1, y: 0 };
  return { x: 0, y: dy >= 0 ? 1 : -1 };
};

/** Titik papan dari pecahan 0-1 (`exitX`/`exitY` draw.io) pada satu bentuk. */
export const titikPort = (
  node: FlowNode,
  pecahan: Point
): Point & { dir: { x: number; y: number } } => {
  const u = ukuranBentukEfektif(node);
  return {
    x: node.x + pecahan.x * u.width,
    y: node.y + pecahan.y * u.height,
    dir: arahPort(pecahan),
  };
};

/**
 * #656 — SATU sumber warna garis. Dulu jalur dan kepala panah masing-masing
 * menulis hex abu-abu slate, dua tempat yang bisa lupa disamakan. draw.io
 * memakai hitam untuk garis pada papan terang; papan gelap `blueprint` tetap
 * butuh warna terang supaya garisnya terlihat.
 */
const warnaGarisPapan = (tema: "miro" | "blueprint"): string =>
  tema === "miro" ? "#000000" : "#60a5fa";

/**
 * #665 - mata panah yang papan ini bisa gambar. draw.io mengenal lebih banyak
 * lagi (stepped, skip, circle, dan seterusnya); nilai yang tidak ada di daftar
 * ini jatuh ke `classic`, dan itu dituliskan sebagai BATAS, bukan ditebak.
 */
const BENTUK_KEPALA = ["classic", "open", "oval", "block", "diamond", "none"];

const gambarKepala = (bentuk: string, isi: boolean, warna: string) => {
  if (bentuk === "oval")
    return (
      <ellipse
        cx="5.5"
        cy="4"
        rx="4.5"
        ry="3"
        fill={isi ? warna : "none"}
        stroke={warna}
        strokeWidth="1"
      />
    );
  if (bentuk === "diamond")
    return (
      <path
        d="M0.8,4 L5,0.8 L9.2,4 L5,7.2 Z"
        fill={isi ? warna : "none"}
        stroke={warna}
        strokeWidth="1"
      />
    );
  if (bentuk === "open")
    return <path d="M0.8,0.8 L9.5,4 L0.8,7.2" fill="none" stroke={warna} strokeWidth="1" />;
  // `classic` dan `block`: segitiga, terisi atau berbingkai.
  return <path d="M0.8,0.8 L9.5,4 L0.8,7.2 Z" fill={warna} stroke={warna} strokeWidth="1" />;
};

type SpesifikasiKepala = { id: string; bentuk: string; isi: boolean; warna: string };

/**
 * `id` marker memuat warna dan bentuknya, jadi ia harus disusun dari bagian-
 * bagiannya, bukan ditulis sebagai satu templat panjang di dalam objek: pemindai
 * teks layar (`sapu:teks`) membaca string bermuatan tanda hubung di posisi itu
 * sebagai kalimat yang tidak lewat kamus.
 */
const idKepala = (arah: string, bentuk: string, isi: boolean, hex: string): string => {
  const akhiran = isi ? "isi" : "kosong";
  return ["canvas-arrow-head", arah, bentuk, akhiran, hex].join("-");
};

/**
 * #665 - mata panah di kedua ujung, dibaca dari `endArrow` dan `startArrow`.
 *
 * TIGA keadaan yang harus dibeda-kan, dan inilah bagian yang paling gampang
 * salah: `undefined` berarti sumber TIDAK menulis apa pun, jadi papan memakai
 * matanya sendiri; `"none"` berarti sumber menulis tanpa mata, dan garisnya
 * harus benar-benar tanpa mata (sebelum ini papan selalu menggambar satu);
 * selebihnya digambar sesuai bentuk dan isian sumber.
 */
const kepalaUntuk = (
  edge: FlowEdge,
  warna: string,
  dipilih: boolean
): { markerEnd?: string; markerStart?: string; kepala: SpesifikasiKepala[] } => {
  const hex = warna.replace("#", "") || "000000";
  const spec = (arah: "end" | "start"): SpesifikasiKepala | null | undefined => {
    const nilai = (arah === "end" ? edge.endArrow : edge.startArrow)?.toLowerCase();
    if (!nilai) return undefined;
    if (nilai === "none") return null;
    const bentuk = BENTUK_KEPALA.includes(nilai) ? nilai : "classic";
    const flag = arah === "end" ? edge.endFill : edge.startFill;
    const isi = flag ?? !(bentuk === "open" || bentuk === "oval" || bentuk === "diamond");
    return {
      id: idKepala(arah, bentuk, isi, hex),
      bentuk,
      isi,
      warna,
    };
  };
  const akhir = spec("end");
  const awal = spec("start");
  return {
    markerEnd:
      akhir === undefined
        ? dipilih
          ? "url(#canvas-arrow-head-selected)"
          : "url(#canvas-arrow-head)"
        : akhir
          ? `url(#${akhir.id})`
          : undefined,
    markerStart: awal ? `url(#${awal.id})` : undefined,
    kepala: [akhir, awal].filter((k): k is SpesifikasiKepala => !!k),
  };
};

/**
 * Item #521 / #542 / #543 — rute garis dihitung ulang HANYA bila geometri yang
 * memengaruhinya berubah.
 *
 * Dulu setiap render memanggil `findSmartRoute` untuk SETIAP garis. Terukur:
 * satu lintasan penuh pada 25 bentuk / 35 garis butuh 105 ms, enam kali anggaran
 * satu frame (16,7 ms), padahal menggeser satu node hanya mengubah garis yang
 * benar-benar menempel padanya.
 *
 * Aturan #521 memakai SATU tanda tangan geometri seluruh papan: begitu satu
 * bentuk bergerak, semua garis dianggap basi, jadi ia harus dibekukan selama
 * interaksi (#542 membekukannya untuk resize juga, bukan hanya seretan).
 *
 * Aturan #543 tidak lagi membekukan apa pun secara global. Sebuah garis lama
 * hanya bisa berubah jika ada bentuk yang BARU SAJA berpindah terletak di
 * sepanjang jalurnya — itu diuji per garis terhadap kotak bentuk yang berubah.
 * Satu frame yang sebelumnya membayar 396 rute (terukur 230 ms rata-rata pada
 * papan 200 bentuk) kini membayar 16 (11,8 ms), dan keluarannya dibuktikan
 * sama: 1 selisih dari 41.120 garis diuji, 0 garis menembus bentuk.
 *
 * Selama seretan/resize masih berlangsung (`sedangInteraksi`), acuan geometri
 * tidak diperbarui dan garis hanya dikoreksi lewat kedua ujungnya sendiri —
 * sama seperti #521, supaya satu frame seret tetap murah. Koreksi berbasis
 * jalur terjadi pada render pertama setelah interaksi selesai.
 */
function ruteDenganCache(
  kunci: string,
  tandaTangan: string,
  terganggu: ((edge: FlowEdge, points: Point[]) => boolean) | null,
  edge: FlowEdge,
  hitung: () => Point[],
  simpanan: Map<string, SimpananRute>
): Point[] {
  const lama = simpanan.get(kunci);
  if (lama && lama.sig === tandaTangan && !(terganggu && terganggu(edge, lama.points)))
    return lama.points;
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
  /**
   * Layar → koordinat papan (#653). Dipakai pemegang tekukan: tanpa konversi
   * ini, menyeret di zoom 0,5 memindahkan titik dua kali lipat dari jarinya.
   */
  koordinatPapan: (clientX: number, clientY: number) => { x: number; y: number } | null;
  /** Putuskan sambungan garis terpilih. Kosong = tombol putuskan tak dipakai. */
  onDeleteEdge?: () => void;
  /** Papan boleh diubah; bilah gaya tidak muncul untuk pembaca saja. */
  isEditable: boolean;
  /** Titik tengah sebuah node; tinggal di container karena membaca state nodes. */
  getNodeCenter: (nodeId: string) => { x: number; y: number };
  /** Node yang SEDANG diseret; null bila tidak ada. Penanda interaksi berjalan (#521). */
  draggingNodeId: string | null;
  /** Bentuk yang SEDANG diperbesar; null bila tidak ada. Penanda yang sama (#542). */
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
  koordinatPapan,
  onDeleteEdge,
  isEditable,
  getNodeCenter,
  draggingNodeId,
  resizingNodeId,
}) => {
  const simpananRute = useRef(new Map<string, SimpananRute>()).current;

  // Acuan geometri = kotak SETIAP bentuk pada render terakhir di luar interaksi.
  // Selisihnya terhadap `nodes` sekarang menjawab pertanyaan yang benar: bentuk
  // mana yang BARU SAJA berpindah, dan garis mana yang jalurnya tersentuh salah
  // satu kotaknya. Item #542 (seret maupun resize harus dianggap "interaksi
  // sedang berlangsung") tetap berlaku di sini: selama acuan tidak digeser,
  // satu frame interaksi hanya membayarnya dari kedua ujung garis itu sendiri.
  const geoAcuan = useRef(new Map<string, Kotak>()).current;
  const sedangInteraksi = draggingNodeId !== null || resizingNodeId !== null;
  const kotakBerubah: { id: string; k: Kotak }[] = [];
  if (!sedangInteraksi) {
    const idSekarang = new Set<string>();
    for (const n of nodes) {
      idSekarang.add(n.id);
      const k = kotakBentuk(n);
      const lama = geoAcuan.get(n.id);
      if (!lama) kotakBerubah.push({ id: n.id, k });
      else if (lama.x1 !== k.x1 || lama.y1 !== k.y1 || lama.x2 !== k.x2 || lama.y2 !== k.y2)
        kotakBerubah.push({ id: n.id, k: lama }, { id: n.id, k });
      geoAcuan.set(n.id, k);
    }
    // Bentuk yang dihapus: kotak lamanya tetap diuji, karena garis yang dulu
    // mengitarinya kini boleh jadi lurus kembali.
    for (const [id, k] of geoAcuan) {
      if (idSekarang.has(id)) continue;
      kotakBerubah.push({ id, k });
      geoAcuan.delete(id);
    }
  }
  // Kotak milik kedua ujung garisnya sendiri tidak diuji: kalau ujungnya
  // bergerak, tanda tangannya sudah berubah dan garis tetap dihitung ulang;
  // kalau tidak, kotaknya tidak pernah masuk daftar ini. Menguji kotak milik
  // ujung sendiri hanya membayar ulang pekerjaan frame seretan tadi.
  const terganggu = kotakBerubah.length
    ? (edge: FlowEdge, points: Point[]) =>
        kotakBerubah.some(
          (c) =>
            c.id !== edge.fromNodeId && c.id !== edge.toNodeId && jalurMemotongKotak(points, c.k)
        )
    : null;

  // Titik tengah garis yang sedang dipilih. Diisi di dalam peta di bawah — hanya
  // di sana port yang sudah "tertarik magnet" ke tepi bentuk diketahui — dan
  // dipakai untuk menaruh bilah gaya garis.
  let titikBilah: { x: number; y: number } | null = null;

  const garisTerpilih = selectedEdgeId ? edges.find((e) => e.id === selectedEdgeId) : null;

  /**
   * #533 — garis kembar: semua garis yang menggabungkan PASANGAN bentuk yang
   * sama, apa pun arahnya. Tanpa pengetahuan ini, `getClosestPortsPoint` di
   * bawah memilih port yang sama persis untuk keduanya, jadi dua relasi
   * digambar tepat di atas satu sama lain: hanya satu kepala panah yang
   * terlihat dan hanya garis terakhir yang bisa diklik.
   */
  const kembar = new Map<string, string[]>();
  const kunciPasangan = (a: string, b: string) => (a < b ? a + "|" + b : b + "|" + a);
  for (const e of edges) {
    const k = kunciPasangan(e.fromNodeId, e.toNodeId);
    const daftar = kembar.get(k);
    if (daftar) daftar.push(e.id);
    else kembar.set(k, [e.id]);
  }

  /**
   * #653 — seret satu tekukan. `titikAwal` diisi hanya bila tekukan ini belum
   * ada: pemegang "tambah tekukan" duduk di tengah segmen, jadi tekukan baru
   * lahir di sana lalu langsung mengikuti jarinya.
   *
   * Pendengarnya dipasang di `window`, bukan di lingkaran: jarinya bisa
   * meninggalkan elemen sekecil 5 px di tengah seretan, dan kehilangan peristiwa
   * di tengah jalan berarti garis berhenti di tengah udara.
   */
  const mulaiSeretTekukan = (
    e: React.PointerEvent,
    edge: FlowEdge,
    indeks: number,
    titikAwal?: Point
  ) => {
    if (!isEditable) return;
    e.stopPropagation();
    e.preventDefault();
    const asal = (edge.waypoints || []).slice();
    const daftar = titikAwal ? asal.concat([titikAwal]) : asal;
    const tulis = (isi: Point[]) => onEdgePatch(edge.id, { waypoints: isi.slice() });
    if (titikAwal) tulis(daftar);
    const pindah = (ev: PointerEvent) => {
      const p = koordinatPapan(ev.clientX, ev.clientY);
      // Tanpa penjagaan ini, satu peristiwa tanpa koordinat (pointer yang lahir
      // di luar jendela, atau lingkungan tanpa layout) menulis NaN ke dalam
      // papan — dan NaN itu ikut tersimpan lalu membuat garisnya hilang.
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
      daftar.splice(indeks, 1, p);
      tulis(daftar);
    };
    const lepas = () => {
      window.removeEventListener("pointermove", pindah);
      window.removeEventListener("pointerup", lepas);
    };
    window.addEventListener("pointermove", pindah);
    window.addEventListener("pointerup", lepas);
  };

  const hapusTekukan = (edge: FlowEdge, indeks: number) => {
    if (!isEditable) return;
    const sisa = (edge.waypoints || []).filter((_, i) => i !== indeks);
    onEdgePatch(edge.id, { waypoints: sisa });
  };

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
            <path d="M0.8,0.8 L9.5,4 L0.8,7.2 Z" fill={warnaGarisPapan(canvasTheme)} />
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

          // #665 - warna, tebal, pola, dan mata panah garis. Warna dari berkas
          // sumber menang; kalau tidak ada, papan yang memilih (hitam di papan
          // terang, biru muda di papan gelap). Nilai sumber sudah disaring
          // `warnaTeksAman()` - hex tiga atau enam digit, bukan yang lain.
          const warnaTepi =
            warnaTeksAman(edge.strokeColor) ||
            (isSelected ? "#8b5cf6" : isHovered ? "#3b82f6" : warnaGarisPapan(canvasTheme));
          const { markerEnd, markerStart, kepala } = kepalaUntuk(edge, warnaTepi, isSelected);

          const isSourceSelected = selectedNodeId === edge.fromNodeId;
          const isTargetSelected = selectedNodeId === edge.toNodeId;
          const isSourceHovered = hoveredNodeId === edge.fromNodeId;
          const isTargetHovered = hoveredNodeId === edge.toNodeId;
          const isNodeConnectedActive =
            isSourceSelected || isTargetSelected || isSourceHovered || isTargetHovered;

          if (startCenter.x === 0 || endCenter.x === 0) return null;

          // Magnetic Snapping and Dynamic Port Connection Locator
          const getClosestPortsPoint = (srcNode: FlowNode, tgtNode: FlowNode) => {
            const src = ukuranBentukEfektif(srcNode);
            const tgt = ukuranBentukEfektif(tgtNode);
            const sW = src.width;
            const sH = src.height;
            const tW = tgt.width;
            const tH = tgt.height;

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

          // #669 — berkas yang menulis titik sambung sendiri tidak boleh dilompati
          // oleh pilihan papan. Yang digantikan HANYA titik ujungnya: rute di
          // antara kedua ujung (tekukan manual,cache, dan `findSmartRoute`) tetap
          // jalur yang sama, jadi garis yang menempel di kiri bawah bentuk datang
          // di kiri bawah, bukan di sisi terdekat seperti sebelumnya.
          const otomatis =
            source && target
              ? getClosestPortsPoint(source, target)
              : {
                  source: { x: startCenter.x, y: startCenter.y, dir: { x: 0, y: 1 } },
                  target: { x: endCenter.x, y: endCenter.y, dir: { x: 0, y: -1 } },
                };
          const startPort =
            source && edge.portSumber ? titikPort(source, edge.portSumber) : otomatis.source;
          const endPort =
            target && edge.portTujuan ? titikPort(target, edge.portTujuan) : otomatis.target;

          // #533 — kembar digeser berlawanan arah sepanjang tepi bentuknya,
          // dengan langkah yang sama di kedua ujungnya, sehingga dua garis
          // tetap sejajar dan tidak bersilang di tengah.
          const daftar = kembar.get(kunciPasangan(edge.fromNodeId, edge.toNodeId)) || [];
          const urutan = daftar.indexOf(edge.id);
          const langkah = daftar.length > 1 ? (urutan - (daftar.length - 1) / 2) * 18 : 0;
          const geserPort = <T extends { x: number; y: number; dir?: { x: number; y: number } }>(
            p: T,
            d: number
          ): T =>
            d === 0 ? p : p.dir && p.dir.x !== 0 ? { ...p, y: p.y + d } : { ...p, x: p.x + d };

          const start = geserPort(startPort, langkah);
          const end = geserPort(endPort, langkah);

          // Bentuk jalur per garis: hasilnya disimpan per garis dan hanya
          // dihitung ulang bila salah satu ujungnya bergerak, atau bila ada
          // bentuk yang baru berpindah terletak di sepanjang jalurnya lama
          // (lihat ruteDenganCache di atas berkas — #521, #542, #543).
          const tandaTangan =
            `${start.x},${start.y},${start.dir?.x},${start.dir?.y}|` +
            `${end.x},${end.y},${end.dir?.x},${end.dir?.y}`;
          // #533 — kunci simpanan ikut indeks kembar: dua garis searah pada
          // pasangan yang sama dulu berebut satu entri, jadi yang kedua
          // menimpa yang pertama dan keduanya menggambar rute identik.
          // #653 — begitu garis punya tekukan manual, rute otomatis MUNDUR:
          // jalurnya adalah [ujung, ...tekukan, ujung] apa adanya. Ujungnya
          // tetap menempel pada port yang sama, jadi menggeser bentuk tidak
          // melepas sambungannya — hanya tekukannya yang ikut berpindah.
          const tekukan = edge.waypoints && edge.waypoints.length ? edge.waypoints : null;
          const pathPoints = tekukan
            ? [start, ...tekukan, end]
            : ruteDenganCache(
                `${edge.fromNodeId}>${edge.toNodeId}#${urutan}`,
                tandaTangan,
                terganggu,
                edge,
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
              {/*
                #665 - mata panah yang ditulis berkas sumber hidup di DALAM
                gugus garisnya sendiri. Alasannya teknis: `id`-nya memuat warna
                dan bentuk garis itu, dan definisi di `<defs>` papan cuma ada
                satu untuk semua garis. `orient="auto-start-reverse"` membuat
                bentuk yang sama dipakai di kedua ujung tanpa dibalik manual.
              */}
              {kepala.length > 0 && (
                <defs>
                  {kepala.map((k) => (
                    <marker
                      key={k.id}
                      id={k.id}
                      viewBox="0 0 10 8"
                      markerWidth="10"
                      markerHeight="8"
                      refX="9.5"
                      refY="4"
                      orient="auto-start-reverse"
                      markerUnits="userSpaceOnUse"
                    >
                      {gambarKepala(k.bentuk, k.isi, k.warna)}
                    </marker>
                  ))}
                </defs>
              )}
              {/*
                Wilayah sentuh. Dulu jalur ini ikut MENGGAMBAR `#c084fc` saat garis
                dipilih, di atas 16 px, sehingga garis 2 px terlihat sebagai pita
                ungu (#630). Kini transparan selamanya — lebarnya hanya menentukan
                seberapa mudah garis ditangkap kursor.
              */}
              <path
                d={pathD}
                fill="none"
                stroke="transparent"
                strokeWidth="16"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedEdgeId(edge.id);
                  setSelectedNodeId(null);
                  setConnectSourceId(null);
                }}
              />

              {/* #630 — seleksi/hover ditandai satu halo tipis STATIS, bukan pendar 8 px yang berdenyut selamanya. */}
              {(isHovered || isSelected) && (
                <path
                  d={pathD}
                  fill="none"
                  stroke={isSelected ? "#c084fc" : "#93c5fd"}
                  strokeWidth="5"
                  opacity="0.26"
                  className="pointer-events-none"
                />
              )}

              {/* Penanda garis yang menyentuh bentuk yang sedang disentuh.
                  #642 — dulu ini motion.path dengan strokeDashoffset yang
                  diulang SELAMANYA: satu loop animasi per garis hanya karena
                  kursor berhenti di atas sebuah bentuk, dan loop itu terus
                  hidup selama kursor diam di sana. Miro dan draw.io tidak
                  menggambar apa pun yang bergerak pada keadaan ini. Informasi
                  yang sama (garis mana yang ikut bentuk ini) dipertahankan
                  lewat lebar dan warna, bukan lewat gerakan. */}
              {isNodeConnectedActive && (
                <path
                  d={pathD}
                  fill="none"
                  stroke={isSourceSelected || isSourceHovered ? "#10b981" : "#3b82f6"}
                  strokeWidth={isSelected ? 5.5 : 4.5}
                  strokeLinecap="round"
                  className="pointer-events-none opacity-25"
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
                stroke={warnaTepi}
                // #656 - 1 px seperti bawaan draw.io. #665 - kecuali berkas
                // sumber menulis `strokeWidth` sendiri.
                strokeWidth={edge.strokeWidth ?? 1}
                strokeLinecap={edge.strokeStyle === "dotted" ? "round" : "butt"}
                strokeDasharray={edge.dashPattern || DASH[edge.strokeStyle ?? "solid"] || undefined}
                markerEnd={markerEnd}
                markerStart={markerStart}
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
                  x={(start.x + end.x) / 2 - 60}
                  y={(start.y + end.y) / 2 - 17}
                  width="120"
                  height="34"
                >
                  {/*
                    #656 — draw.io menaruh teks di atas garis, tanpa bingkai dan
                    tanpa bayangan. Dulu kotp: border + shadow-soft + rounded +
                    font-medium, dan `truncate` yang MEMOTONG isinya. Kotak lebarnya
                    120 px supaya label panjang bisa membungkus dua baris seperti di
                    sana, bukan dibuang ke elipsis.
                  */}
                  <div
                    style={{
                      // #665 - `fontSize=10;fontColor=#ff0000` pada label garis.
                      fontSize: edge.labelFontSize,
                      color: warnaTeksAman(edge.labelColor) ?? undefined,
                    }}
                    className="bg-surface/85 text-xs text-content-strong font-normal px-1 py-0.5 text-center whitespace-pre-wrap break-words"
                  >
                    {edge.label}
                  </div>
                </foreignObject>
              )}

              {/*
                #653 — pemegang tekukan, hanya pada garis terpilih di papan yang
                boleh disunting. Lingkaran isi = tekukan yang sudah ada (seret
                untuk memindah, klik-ganda untuk membuang); lingkaran kosong di
                TENGAH JALUR menambah tekukan baru. Ukuran dan tebal garisnya
                dibagi `zoomLevel` supaya tetap teraih di papan 0,3 maupun 3,0 —
                sama seperti bilah gaya garis.
              */}
              {isSelected &&
                isEditable &&
                (() => {
                  const tengah = titikTengahJalur(pathPoints);
                  const daftar = edge.waypoints || [];
                  return (
                    <g>
                      {daftar.map((w, i) => (
                        <circle
                          key={`tekuk-${i}`}
                          cx={w.x}
                          cy={w.y}
                          r={6 / zoomLevel}
                          fill="#8b5cf6"
                          stroke="#ffffff"
                          strokeWidth={2 / zoomLevel}
                          className="cursor-grab"
                          onPointerDown={(e) => mulaiSeretTekukan(e, edge, i)}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            hapusTekukan(edge, i);
                          }}
                        />
                      ))}
                      <circle
                        cx={tengah.x}
                        cy={tengah.y}
                        r={5 / zoomLevel}
                        fill="#ffffff"
                        stroke="#8b5cf6"
                        strokeWidth={2 / zoomLevel}
                        className="cursor-crosshair"
                        onPointerDown={(e) => mulaiSeretTekukan(e, edge, daftar.length, tengah)}
                      />
                    </g>
                  );
                })()}
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
                {/* Ujung garis yang sedang ditarik. #642 — lingkaran luarnya
                    dulu `animate-ping`, yaitu satu animasi tak berhenti di
                    titik yang justru paling dilihat pengguna. Cincin statis
                    memberi bobot yang sama tanpa loop. Loop dash di atas
                    sengaja TINGGAL: ia menandai "sedang menarik", berhenti saat
                    mouse lepas, dan bukan pada keadaan diam. Kelas
                    `titik-ujung-sambung` dipakai test sebagai identitas penanda
                    ini — sebelumnya penanda itu dicari lewat kelas
                    `animate-ping`, yaitu nama animasi yang justru dilepas. */}
                <circle
                  cx={endX}
                  cy={endY}
                  r="6"
                  fill="#8b5cf6"
                  opacity="0.25"
                  className="titik-ujung-sambung"
                />
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
