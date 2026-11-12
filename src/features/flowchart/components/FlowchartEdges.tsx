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
import React, { useRef, useState } from "react";
import { findSmartRoute, memotongInteriorKotak } from "../lib/routing";
import {
  indeksSegmenTerdekat,
  jarakTitikKeSegmen,
  ortogonalDariTitik,
  pathDOrtogonal,
  rapikanWaypoints,
  ruteLingkarSendiri,
  ruteOrtogonal,
  sisipTekukan,
  tekukanEfektif,
  waypointsSetelahGeserSegmen,
} from "../lib/ruteOrtogonal";
import { geserPort, pilihPort, sebarPort, titikTepiTerdekat } from "../lib/portCabang";
import { cn } from "../../../lib/utils";
import { colorPaletteHex, ukuranBentukEfektif, KELAS_HURUF } from "../constants";
import { EdgeStyleBar } from "./EdgeStyleBar";
import { BENTUK_KEPALA, gambarKepala, kepalaKosongBawaan, skalaKepala } from "./kepalaPanah";
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
 * Titik-titik yang SUNGGUH tergambar pada sebuah `pathD`.
 *
 * #766 — dan ini sebabnya gagang tekukan dulu terasa tidak bisa dipakai.
 * `pathPoints` adalah titik MODEL (ujung + tekukan + simpul rute). Bentuk siku
 * yang dipakai draw.io di sini dulu disintesis belakangan, langsung ke `pathD`.
 * Sejak #833 router ortogonal memulangkan titik siku itu sebagai model, jadi
 * jalur bezier satu-satunya yang masih perlu dibaca dari `d` (titik kontrolnya
 * hanya hidup di sana).
 *
 * Yang dibaca: `M`/`L` (absolut, satu pasangan per perintah) dan `C`
 * (kontrolnya dibuang, titik akhirnya diambil). Cukup untuk ketiga mode papan
 * ini dan tidak mengarang titik yang tidak digambar.
 */
const POLA_PERINTAH = /([MLC])([^MLC]+)/gi;
const simpulTergambar = (pathD: string, cadangan: Point[]): Point[] => {
  const keluar: Point[] = [];
  for (const cocok of pathD.matchAll(POLA_PERINTAH)) {
    const angka = (cocok[2].match(/-?\d*\.?\d+/g) || []).map(Number);
    const pasangan: Point[] = [];
    for (let i = 0; i + 1 < angka.length; i += 2) pasangan.push({ x: angka[i], y: angka[i + 1] });
    if (pasangan.length === 0) continue;
    // `C` menyisipkan dua titik kontrol sebelum titik akhirnya; `M` dan `L`
    // hanya punya satu pasangan.
    keluar.push(cocok[1] === "C" ? pasangan[pasangan.length - 1] : pasangan[0]);
  }
  return keluar.length >= 2 ? keluar : cadangan;
};

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
 * #762 — kebalikan dari `titikPort`: titik papan → pecahan 0..1 pada bentuknya.
 *
 * Inilah yang membuat sebuah ujung panah bisa DIPIN. draw.io menyimpan
 * `exitX/exitY` dan `entryX/entryY` sebagai pecahan, bukan sebagai koordinat
 * absolut, jadi pin tetap di tempatnya ketika bentuknya dipindahkan atau
 * diubah ukurannya. Papan ini sudah MEMBACA pecahan itu saat mengimpor
 * (`gayaImpor.ts:318-320`) dan sudah menghormatinya saat menggambar
 * (`FlowchartEdges.tsx:566-568`) — yang tidak pernah ada adalah cara
 * menuliskannya dari layar, jadi garis yang dibuat pengguna selalu menempel di
 * port yang dipapankan, bukan di titik yang Bapak sentuh.
 *
 * Dibatasi 0..1: di luar itu artinya "di luar bentuk", dan menyimpan angka di
 * luar rentang akan membuat garis menempel di tempat yang tidak terlihat.
 */
export const pecahanPort = (node: FlowNode, titik: Point): Point => {
  const u = ukuranBentukEfektif(node);
  const jepit = (v: number) => Math.min(1, Math.max(0, v));
  return {
    x: jepit((titik.x - node.x) / u.width),
    y: jepit((titik.y - node.y) / u.height),
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
 * #665 / #753 - mata panah di kedua ujung, dibaca dari `endArrow` dan `startArrow`.
 *
 * TIGA keadaan yang harus dibeda-kan, dan inilah bagian yang paling gampang
 * salah: `undefined` berarti sumber TIDAK menulis apa pun, jadi papan memakai
 * matanya sendiri; `"none"` berarti sumber menulis tanpa mata, dan garisnya
 * harus benar-benar tanpa mata (sebelum ini papan selalu menggambar satu);
 * selebihnya digambar sesuai bentuk dan isian sumber.
 *
 * Nilai yang tidak ada di `BENTUK_KEPALA` jatuh ke `classic` — dinyatakan
 * sebagai batas, bukan ditebak.
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
    const bentuk = (BENTUK_KEPALA as readonly string[]).includes(nilai) ? nilai : "classic";
    const flag = arah === "end" ? edge.endFill : edge.startFill;
    const isi = flag ?? !kepalaKosongBawaan(bentuk);
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
  /**
   * #858 — titik paku yang DIGENGGAM saat sambungan dimulai. Pratinjau
   * berangkat dari sini, bukan dari pusat bentuk; kosong berarti sambungan
   * dimulai lewat tool (tidak ada paku), dan pangkalnya dihitung dari tepi
   * terdekat ke kursor.
   */
  connectFrom?: Point | null;
  /** Bentuk garis penghubung bawaan papan; dipakai garis yang belum punya pilihan. */
  connectorType: "bezier" | "straight" | "orthogonal";
  /** Skala papan saat ini — bilah gaya dibalik skalanya agar tetap terbaca. */
  zoomLevel: number;
  /** Simpan bentuk/goresan satu garis (popup mini saat garis diklik). */
  onEdgePatch: (id: string, patch: Partial<FlowEdge>, opsi?: { sementara?: boolean }) => void;
  /**
   * #851 — seret garis SELESAI. Selama jari bergerak, `onEdgePatch` dipanggil
   * dengan `{ sementara: true }`: papan tetap ikut bergerak, tetapi tiap
   * peristiwa tidak dicatat sebagai langkah riwayat. Satu snapshot dicatat di
   * sini, saat jari diangkat — sama seperti seret bentuk.
   */
  onSeretSelesai?: (id: string, patch: Partial<FlowEdge>) => void;
  /**
   * #853 — label garis yang SEDANG disunting di tempat, plus dua panggilan
   * pembukanya. Perubahan per huruf dikirim lewat `onEdgePatch` dengan
   * `sementara: true`; riwayat dicatat sekali saat suntingan ditutup.
   */
  suntingLabelGarisId?: string | null;
  mulaiSuntingLabelGaris?: (id: string) => void;
  akhiriSuntingLabelGaris?: () => void;
  /**
   * Layar → koordinat papan (#653). Dipakai pemegang tekukan: tanpa konversi
   * ini, menyeret di zoom 0,5 memindahkan titik dua kali lipat dari jarinya.
   */
  koordinatPapan: (clientX: number, clientY: number) => { x: number; y: number } | null;
  /** Putuskan sambungan garis terpilih. Kosong = tombol putuskan tak dipakai. */
  onDeleteEdge?: () => void;
  /**
   * #759 — memulai genggaman pada salah satu ujung garis supaya bisa dipindah
   * ke bentuk lain, seperti draw.io. Dipanggil dengan koordinat klien supaya
   * garis bantu langsung lahir di bawah jari, bukan di pusat bentuk sasaran.
   */
  mulaiUbahUjung?: (
    edgeId: string,
    ujung: "awal" | "akhir",
    e?: { clientX: number; clientY: number }
  ) => void;
  /** Papan boleh diubah; bilah gaya tidak muncul untuk pembaca saja. */
  isEditable: boolean;
  /** Titik tengah sebuah node; tinggal di container karena membaca state nodes. */
  getNodeCenter: (nodeId: string) => { x: number; y: number };
  /** Node yang SEDANG diseret; null bila tidak ada. Penanda interaksi berjalan (#521). */
  draggingNodeId: string | null;
  /** Bentuk yang SEDANG diperbesar; null bila tidak ada. Penanda yang sama (#542). */
  resizingNodeId: string | null;
  /**
   * #841 — keadaan perjalanan simulasi. `tepiId` = garis yang SEDANG dilalui
   * token, `dilewati` = garis yang sudah selesai (jejaknya dibiarkan kelihatan),
   * `jeda` membekukan token di tengah garis, `durasiMs` untuk satu garis.
   * Kosong = tidak ada simulasi berjalan dan tidak ada satu piksel pun yang
   * bergerak.
   */
  alur?: PerjalananAlur | null;
  /** Dipanggil peramban saat token tiba di ujung garisnya. Tanpa setTimeout. */
  onAlurSelesai?: () => void;
}

/** Bentuk satu perjalanan token simulasi — lihat `alur` di props. */
export interface PerjalananAlur {
  tepiId: string | null;
  dilewati: string[];
  durasiMs: number;
  jeda: boolean;
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
  connectFrom,
  connectorType,
  zoomLevel,
  onEdgePatch,
  onSeretSelesai,
  suntingLabelGarisId,
  mulaiSuntingLabelGaris,
  akhiriSuntingLabelGaris,
  koordinatPapan,
  onDeleteEdge,
  mulaiUbahUjung,
  isEditable,
  getNodeCenter,
  draggingNodeId,
  resizingNodeId,
  alur,
  onAlurSelesai,
}) => {
  const simpananRute = useRef(new Map<string, SimpananRute>()).current;

  // #834 — segmen yang sedang disorot kursor. Hanya segmen ini yang menampilkan
  // gagang "tambah tekukan"; sebelumnya satu gagang dipasang di SETIAP segmen
  // rute otomatis, sehingga garis berbelok tampak penuh lingkaran.
  const [segmenSorot, setSegmenSorot] = useState<{ edgeId: string; i: number } | null>(null);

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
   * #849 — geseran saudara sekolompok pada SATU sisi bentuk. `kembar` di atas
   * hanya mengenal pasangan yang sama (`a|b`), jadi dua cabang sebuah keputusan
   * yang sama-sama keluar dari sisi `right` tidak pernah digeser dan menggambar
   * satu garis di atas garis yang lain sepanjang koridor awal. Angka ini ditambahkan
   * di atas `langkah` #533, bukan menggantikannya.
   */
  const sebaran = sebarPort(edges, nodes);

  /**
   * #653 — seret satu tekukan. `titikAwal` diisi hanya bila tekukan ini belum
   * ada: pemegang "tambah tekukan" duduk di tengah segmen, jadi tekukan baru
   * lahir di sana lalu langsung mengikuti jarinya.
   *
   * #766 — menyisip tidak boleh melompatkan garis yang sudah terbentuk.
   *
   * #834 — yang disimpan HANYA titik yang disentuh, bukan seluruh jalur.
   * `sisipTekukan` menaruhnya di urutan yang benar berdasarkan posisinya di
   * sepanjang jalur yang terlihat, jadi tekukan lama tetap berurutan tanpa
   * ikut menyeret semua simpul router ke dalam model.
   *
   * #835 — `dasar` adalah waypoint yang MASIH berlaku (salinan rute otomatis
   * sudah disaring). Tanpa itu, satu seretan pada garis lama akan menulis
   * kembali titik-titik salinan yang baru saja diabaikan.
   *
   * Pendengarnya dipasang di `window`, bukan di lingkaran: jarinya bisa
   * meninggalkan elemen sekecil 5 px di tengah seretan, dan kehilangan peristiwa
   * di tengah jalan berarti garis berhenti di tengah udara.
   */
  const mulaiSeretTekukan = (
    e: React.PointerEvent,
    edge: FlowEdge,
    indeks: number,
    titikAwal?: Point,
    jalur?: Point[],
    dasar?: Point[]
  ) => {
    if (!isEditable) return;
    e.stopPropagation();
    e.preventDefault();
    const asal = (dasar ?? edge.waypoints ?? []).slice();
    let daftar: Point[];
    let posisi: number;
    if (titikAwal) {
      daftar = sisipTekukan(asal, titikAwal, jalur ?? [titikAwal]);
      posisi = daftar.findIndex((p) => {
        const dx = p.x - titikAwal.x;
        const dy = p.y - titikAwal.y;
        return dx * dx + dy * dy <= 25;
      });
      if (posisi < 0) posisi = Math.min(indeks, Math.max(0, daftar.length - 1));
    } else {
      daftar = asal;
      posisi = indeks;
    }
    // #851 — satu seretan puluhan langkah dulu menulis puluhan snapshot dan
    // menggeser riwayat 50 langkah keluar jendela; sekarang hanya saat lepas.
    let berubah = false;
    // Tanpa `onSeretSelesai` (pemakai lama, mis. test komponen) tidak ada
    // yang mencatat riwayat; patch per gerakan sudah cukup dan TIDAK diulang.
    const akhirkan = (patch: Partial<FlowEdge>) => onSeretSelesai?.(edge.id, patch);
    const tulis = (isi: Point[]) => {
      berubah = true;
      onEdgePatch(
        edge.id,
        { waypoints: rapikanWaypoints(isi) },
        onSeretSelesai ? { sementara: true } : undefined
      );
    };
    if (titikAwal) tulis(daftar);
    const pindah = (ev: PointerEvent) => {
      const p = koordinatPapan(ev.clientX, ev.clientY);
      // Tanpa penjagaan ini, satu peristiwa tanpa koordinat (pointer yang lahir
      // di luar jendela, atau lingkungan tanpa layout) menulis NaN ke dalam
      // papan — dan NaN itu ikut tersimpan lalu membuat garisnya hilang.
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
      daftar.splice(posisi, 1, p);
      tulis(daftar);
    };
    const lepas = () => {
      window.removeEventListener("pointermove", pindah);
      window.removeEventListener("pointerup", lepas);
      if (berubah) akhirkan({ waypoints: rapikanWaypoints(daftar) });
    };
    window.addEventListener("pointermove", pindah);
    window.addEventListener("pointerup", lepas);
  };

  const hapusTekukan = (edge: FlowEdge, indeks: number, dasar?: Point[]) => {
    if (!isEditable) return;
    const sisa = (dasar ?? edge.waypoints ?? []).filter((_, i) => i !== indeks);
    onEdgePatch(edge.id, { waypoints: sisa });
  };

  /**
   * #833 — seret SELURUH segmen, seperti draw.io.
   *
   * Sebelum ini satu-satunya yang bisa digenggam adalah titik tengah segmen
   * (gagang tekukan): garis jadi punya sudut baru, tetapi segmennya sendiri
   * tidak bisa dipindah utuh. Di sini segmen yang disentuh digeser beserta
   * kedua ujungnya, lalu HANYA ujung ruas itu yang disimpan (#834); sisa jalur
   * dirutekan ulang, seperti draw.io. Model lama menyimpan seluruh simpul rute,
   * sehingga satu seretan memunculkan lingkaran di setiap belokan.
   *
   * Ambang 3 px memisahkan klik-pilih dari seret: menyentuh garis untuk memilih
   * tidak boleh menggesernya.
   */
  const mulaiSeretSegmen = (
    e: React.PointerEvent,
    edge: FlowEdge,
    jalur: Point[],
    dasar?: Point[]
  ) => {
    if (!isEditable || jalur.length < 2) return;
    const awalPapan = koordinatPapan(e.clientX, e.clientY);
    if (!awalPapan) return;
    let indeks = -1;
    let terdekat = Infinity;
    for (let i = 0; i < jalur.length - 1; i++) {
      const d = jarakTitikKeSegmen(awalPapan, jalur[i], jalur[i + 1]);
      if (d < terdekat) {
        terdekat = d;
        indeks = i;
      }
    }
    if (indeks < 0 || terdekat > 14 / zoomLevel) return;

    let bergerak = false;
    let wpTerakhir: Point[] | null = null;
    const akhirkan = (patch: Partial<FlowEdge>) => onSeretSelesai?.(edge.id, patch);
    const pindah = (ev: PointerEvent) => {
      const p = koordinatPapan(ev.clientX, ev.clientY);
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
      const dx = p.x - awalPapan.x;
      const dy = p.y - awalPapan.y;
      if (!bergerak && Math.hypot(dx, dy) <= 3 / zoomLevel) return;
      bergerak = true;
      const wp = waypointsSetelahGeserSegmen(jalur, indeks, dx, dy, dasar ?? edge.waypoints ?? []);
      if (wp) {
        wpTerakhir = wp;
        onEdgePatch(edge.id, { waypoints: wp }, onSeretSelesai ? { sementara: true } : undefined);
      }
    };
    const lepas = () => {
      window.removeEventListener("pointermove", pindah);
      window.removeEventListener("pointerup", lepas);
      if (wpTerakhir) akhirkan({ waypoints: wpTerakhir });
    };
    window.addEventListener("pointermove", pindah);
    window.addEventListener("pointerup", lepas);
  };

  /**
   * #853 — seret LABEL garis. draw.io membiarkan label dipindah supaya tidak
   * menutupi bentuk pada garis pendek; geserannya disimpan sebagai
   * `labelOffset` dalam koordinat papan, jadi ikut benar saat zoom berubah.
   * Ambang 3 px memisahkan klik-ganda (menyunting) dari seret.
   */
  const mulaiSeretLabel = (e: React.PointerEvent, edge: FlowEdge) => {
    if (!isEditable) return;
    e.stopPropagation();
    e.preventDefault();
    const awal = koordinatPapan(e.clientX, e.clientY);
    if (!awal) return;
    const dasar = edge.labelOffset ?? { x: 0, y: 0 };
    let bergerak = false;
    let akhir: Point | null = null;
    const tulis = (isi: Point) => {
      akhir = isi;
      onEdgePatch(edge.id, { labelOffset: isi }, onSeretSelesai ? { sementara: true } : undefined);
    };
    const pindah = (ev: PointerEvent) => {
      const p = koordinatPapan(ev.clientX, ev.clientY);
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
      const dx = p.x - awal.x;
      const dy = p.y - awal.y;
      if (!bergerak && Math.hypot(dx, dy) <= 3 / zoomLevel) return;
      bergerak = true;
      tulis({ x: Math.round(dasar.x + dx), y: Math.round(dasar.y + dy) });
    };
    const lepas = () => {
      window.removeEventListener("pointermove", pindah);
      window.removeEventListener("pointerup", lepas);
      if (akhir) onSeretSelesai?.(edge.id, { labelOffset: akhir });
    };
    window.addEventListener("pointermove", pindah);
    window.addEventListener("pointerup", lepas);
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
          // #849 — aturannya pindah utuh ke `lib/portCabang.ts` supaya
          // pengelompokan saudara (`sebarPort`) memilih sisi yang SAMA dengan
          // yang nanti digambar; dua salinan aturan akan cepat berbeda.
          // #855 — garis ke diri sendiri punya rute sendiri. `pilihPort` pada
          // bentuk yang sama memilih satu port untuk kedua ujung, jadi titik
          // awalnya bertumpuk dan rutenya nol panjang. Ujung putarannya tetap:
          // keluar dari kanan, masuk dari atas, dan port simpanan diabaikan.
          const sendiri = !!source && edge.fromNodeId === edge.toNodeId;
          const lingkaran = sendiri && source ? ruteLingkarSendiri(source) : null;
          const ujungLingkar = lingkaran
            ? {
                source: { ...lingkaran[0], dir: { x: 1, y: 0 } },
                target: { ...lingkaran[lingkaran.length - 1], dir: { x: 0, y: -1 } },
              }
            : null;
          const otomatis = ujungLingkar
            ? ujungLingkar
            : source && target
              ? pilihPort(source, target)
              : {
                  source: { x: startCenter.x, y: startCenter.y, dir: { x: 0, y: 1 } },
                  target: { x: endCenter.x, y: endCenter.y, dir: { x: 0, y: -1 } },
                };
          // #669 — berkas yang menulis titik sambung sendiri tidak boleh dilompati
          // oleh pilihan papan. Yang digantikan HANYA titik ujungnya: rute di
          // antara kedua ujung (tekukan manual,cache, dan `findSmartRoute`) tetap
          // jalur yang sama, jadi garis yang menempel di kiri bawah bentuk datang
          // di kiri bawah, bukan di sisi terdekat seperti sebelumnya.
          const startPort = ujungLingkar
            ? ujungLingkar.source
            : source && edge.portSumber
              ? titikPort(source, edge.portSumber)
              : otomatis.source;
          const endPort = ujungLingkar
            ? ujungLingkar.target
            : target && edge.portTujuan
              ? titikPort(target, edge.portTujuan)
              : otomatis.target;

          // #533 — kembar digeser berlawanan arah sepanjang tepi bentuknya,
          // dengan langkah yang sama di kedua ujungnya, sehingga dua garis
          // tetap sejajar dan tidak bersilang di tengah.
          const daftar = kembar.get(kunciPasangan(edge.fromNodeId, edge.toNodeId)) || [];
          const urutan = daftar.indexOf(edge.id);
          // #855 — putaran sendiri tidak ikut digeser: menggeser ujungnya
          // sepanjang tepi akan memutus sambungan ke rute putarannya.
          const langkah =
            !lingkaran && daftar.length > 1 ? (urutan - (daftar.length - 1) / 2) * 18 : 0;

          // #849 — di atas itu, geseran saudara SESISI. Port yang dipaku
          // pengguna sudah sengaja tidak diberi angka oleh `sebarPort`.
          const sebar = lingkaran
            ? { keluar: 0, masuk: 0 }
            : sebaran.get(edge.id) || { keluar: 0, masuk: 0 };
          const start = geserPort(startPort, langkah + sebar.keluar);
          const end = geserPort(endPort, langkah + sebar.masuk);

          // Bentuk jalur per garis: pilihan garis sendiri menang, selain itu ikut
          // bawaan papan.
          const bentuk = edge.connector ?? connectorType;

          // #533 — kunci simpanan ikut indeks kembar: dua garis searah pada
          // pasangan yang sama dulu berebut satu entri, jadi yang kedua
          // menimpa yang pertama dan keduanya menggambar rute identik.
          // Tanda tangan geometri: rute hanya dihitung ulang bila salah satu
          // ujungnya bergerak (#521, #542, #543).
          const tandaTangan =
            `${start.x},${start.y},${start.dir?.x},${start.dir?.y}|` +
            `${end.x},${end.y},${end.dir?.x},${end.dir?.y}`;
          // #653 — begitu garis punya tekukan manual, rute otomatis MUNDUR:
          // jalurnya adalah [ujung, ...tekukan, ujung] apa adanya. Ujungnya
          // tetap menempel pada port yang sama, jadi menggeser bentuk tidak
          // melepas sambungannya — hanya tekukannya yang ikut berpindah.
          // #833 — mode ortogonal memakai router ortogonal: jalurnya siku sejak
          // awal, bukan hasil `findSmartRoute` yang diluruskan saat menggambar.
          // Tekukan manual tetap disimpan apa adanya (rapikan=false) supaya
          // setiap titik yang dipegang pengguna tetap punya gagangnya sendiri.
          const waypointMentah = edge.waypoints || [];
          // #835 — rute otomatis juga dihitung saat garis ortogonal punya
          // waypoint, sebab salinan rute (#833) harus dikenali. Mode lain tidak
          // dibersihkan: pada bezier, titik manual yang kebetulan segaris ikut
          // menentukan lengkung, jadi membuangnya mengubah bentuk.
          let ruteOtomatis: Point[] = [];
          if (waypointMentah.length === 0 || bentuk === "orthogonal") {
            ruteOtomatis = ruteDenganCache(
              `${edge.fromNodeId}>${edge.toNodeId}#${urutan}#${bentuk}`,
              tandaTangan,
              terganggu,
              edge,
              () =>
                lingkaran ??
                (bentuk === "orthogonal"
                  ? ruteOrtogonal(start, end, edge.fromNodeId, edge.toNodeId, nodes)
                  : findSmartRoute(start, end, edge.fromNodeId, edge.toNodeId, nodes)),
              simpananRute
            );
          }
          // Titik yang duduk di rute otomatis tidak mengubah bentuk apa pun,
          // jadi disaring sebelum menggambar dan sebelum disimpan lagi; selama
          // salinan itu ada, router tidak pernah dipakai dan garis tidak bisa
          // diluruskan.
          // #838 — toleransi panggil 4 px, bukan bawaan 2 px: sisa snap kisi 5 px
          // menyimpang sampai ±3,5 px dan selama ini lolos sebagai "tekukan"
          // palsu. 4 px sengaja di bawah ambang seretan segmen nyata (#790).
          const tekukan =
            bentuk === "orthogonal"
              ? tekukanEfektif(waypointMentah, ruteOtomatis, 4)
              : waypointMentah;
          const pathPoints = tekukan.length
            ? bentuk === "orthogonal"
              ? ortogonalDariTitik([start, ...tekukan, end], start.dir, end.dir, false)
              : [start, ...tekukan, end]
            : ruteOtomatis;

          // Compute custom router path based on active routing types (bezier, straight, orthogonal right-angles)
          let pathD = "";
          if (bentuk === "straight") {
            pathD = "M " + pathPoints.map((p) => `${p.x} ${p.y}`).join(" L ");
          } else if (bentuk === "orthogonal") {
            // #833 — sudut membulat seperti `rounded=1` draw.io. Radius 10 px
            // papan, dipangkas otomatis pada segmen pendek oleh pathDOrtogonal.
            pathD = pathDOrtogonal(pathPoints, 10);
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

          // #833 — simpul yang SUNGGUH digambar. Untuk straight/orthogonal
          // jalurnya sudah persis `pathPoints` (router ortogonal menghasilkan
          // titik siku), jadi gagang tekukan duduk di segmen yang terlihat.
          // Bezier tetap dibaca dari `d` karena titik kontrolnya hanya ada di sana.
          const tergambar = bentuk === "bezier" ? simpulTergambar(pathD, pathPoints) : pathPoints;

          if (isSelected) titikBilah = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };

          return (
            <g
              key={edge.id}
              data-edge-id={edge.id}
              className="pointer-events-auto cursor-pointer"
              onMouseEnter={() => setHoveredEdgeId(edge.id)}
              onMouseLeave={() => setHoveredEdgeId(null)}
              // #837 — fokus segmen dibaca di SELURUH gugus garis, bukan hanya
              // di jalur sentuh 16 px. Kursor yang pindah dari jalur ke gagang
              // (anak lain di gugus yang sama) tidak lagi mengosongkan fokus,
              // jadi gagang tidak melompat ke tengah jalur dan berkedip.
              onPointerMove={(e) => {
                if (!isEditable || tergambar.length < 2) return;
                const p = koordinatPapan(e.clientX, e.clientY);
                if (!p) return;
                const i = indeksSegmenTerdekat(p, tergambar, 14 / zoomLevel);
                const baru = i >= 0 ? { edgeId: edge.id, i } : null;
                setSegmenSorot((lama) =>
                  lama?.edgeId === baru?.edgeId && lama?.i === baru?.i ? lama : baru
                );
              }}
              onPointerLeave={() => {
                setSegmenSorot((lama) => (lama?.edgeId === edge.id ? null : lama));
              }}
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
                      markerWidth={10 * skalaKepala(k.bentuk)}
                      markerHeight={8 * skalaKepala(k.bentuk)}
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
                #766 — lebarnya dibagi `zoomLevel` seperti gagang tekukan: 16 piksel
                papan di zoom 0,4 hanya tinggal 6 piksel di layar, dan di HP enam
                piksel tidak bisa disentuh. Ini jalur masuk ke SEMUA keluwesan garis
                (pilih dulu, baru bentuk), jadi kalau ia terlewat, tidak ada yang
                bisa diatur.
              */}
              <path
                d={pathD}
                fill="none"
                stroke="transparent"
                strokeWidth={16 / zoomLevel}
                onPointerDown={(e) => {
                  // #833 — garis terpilih bisa digeser per SEGMEN. Garis yang
                  // belum dipilih tetap hanya terpilih saat diklik, supaya
                  // menepuk garis di HP tidak diam-diam memindahkannya.
                  if (isSelected && bentuk === "orthogonal") {
                    mulaiSeretSegmen(e, edge, tergambar, tekukan);
                  }
                }}
                // #837 — peramban tetap mengirim `mousedown` sesudah
                // `pointerdown`, dan `stopPropagation()` pada pointerdown tidak
                // menghentikannya. Tanpa baris ini mousedown sampai ke kanvas,
                // mengosongkan seleksi, dan memulai kotak seleksi di tengah
                // seretan.
                onMouseDown={(e) => e.stopPropagation()}
                // #853 — klik-ganda membuka sunting label di tempat. Tanpa
                // `stopPropagation`, peristiwa yang sama sampai ke kanvas dan
                // memunculkan catatan tempel baru di atas garis.
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (!isEditable) return;
                  setSelectedEdgeId(edge.id);
                  setSelectedNodeId(null);
                  mulaiSuntingLabelGaris?.(edge.id);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedEdgeId(edge.id);
                  setSelectedNodeId(null);
                  setConnectSourceId(null);
                }}
              />

              {/* #759 — gagang ujung garis. draw.io memperlakukan ujung panah
                  sebagai benda yang bisa digenggam dan dipindahkan ke bentuk
                  lain; sebelum ini satu-satunya jalan adalah menghapus garis lalu
                  menyambung ulang, yang membuang tekukan dan gaya yang sudah
                  diatur. Dua persegi kecil ini hanya muncul untuk garis terpilih,
                  supaya kanvas tidak berubah jadi hutan gagang. */}
              {isSelected && mulaiUbahUjung && (
                <>
                  {(
                    [
                      ["awal", start],
                      ["akhir", end],
                    ] as const
                  ).map(([ujung, titik]) => (
                    <g
                      key={ujung}
                      data-ujung-garis={ujung}
                      className="cursor-move"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        mulaiUbahUjung(edge.id, ujung, { clientX: e.clientX, clientY: e.clientY });
                      }}
                    >
                      <rect
                        x={titik.x - 7}
                        y={titik.y - 7}
                        width="14"
                        height="14"
                        fill="var(--color-surface, #fff)"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="text-violet-600"
                      />
                    </g>
                  ))}
                </>
              )}

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
                data-testid={`garis-${edge.id}`}
                d={pathD}
                fill="none"
                stroke={warnaTepi}
                // #656 - 1 px seperti bawaan draw.io. #665 - kecuali berkas
                // sumber menulis `strokeWidth` sendiri.
                strokeWidth={edge.strokeWidth ?? 1}
                strokeLinecap={edge.strokeStyle === "dotted" ? "round" : "butt"}
                strokeLinejoin={bentuk === "orthogonal" ? "round" : undefined}
                strokeDasharray={edge.dashPattern || DASH[edge.strokeStyle ?? "solid"] || undefined}
                markerEnd={markerEnd}
                markerStart={markerStart}
                className="transition-all"
                // #853 — garisnya sendiri juga menerima klik-ganda; pada garis
                // tebal jalur visual inilah yang paling mungkin kena.
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (!isEditable) return;
                  setSelectedEdgeId(edge.id);
                  setSelectedNodeId(null);
                  mulaiSuntingLabelGaris?.(edge.id);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedEdgeId(edge.id);
                  setSelectedNodeId(null);
                  setConnectSourceId(null);
                }}
              />

              {/*
                #841 — JALUR YANG SUDAH DILALUI token. Tebal dan warna saja, tanpa
                apa pun yang bergerak: jejak harus tetap terbaca setelah simulasi
                berhenti, dan itu hanya bisa dijamin kalau ia tidak bergantung pada
                animasi.
              */}
              {alur?.dilewati.includes(edge.id) && (
                <path
                  data-testid={`jejak-alur-${edge.id}`}
                  d={pathD}
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth={3}
                  strokeLinecap="round"
                  opacity={0.32}
                  className="pointer-events-none"
                />
              )}

              {/*
                #841 — TOKEN yang merambat sepanjang garis. Satu-satunya yang
                bergerak adalah `stroke-dashoffset` (keyframes `alur-merambat` di
                index.css) pada jalur dengan `pathLength=1`: dash pendek yang
                digeser dari pangkal ke ujung tampak seperti titik yang berjalan di
                dalam garis, termasuk di setiap tekukan rute ortogonal, karena yang
                dilalui adalah jalur yang SUNGGUH tergambar. Animasinya `forwards`
                dan sekali jalan; `onAnimationEnd`-nya yang menggerakkan mesin
                langkah. Tidak ada timer di sini — itu sebabnya jeda bisa membekukan
                token di tengah garis, hal yang mustahil pada simulasi lama.
              */}
              {alur?.tepiId === edge.id && (
                <path
                  data-testid={`token-alur-${edge.id}`}
                  d={pathD}
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth={3.5}
                  strokeLinecap="round"
                  pathLength={1}
                  strokeDasharray="0.13 1"
                  className="alur-merambat pointer-events-none"
                  style={
                    {
                      "--alur-durasi": `${alur.durasiMs}ms`,
                      animationPlayState: alur.jeda ? "paused" : "running",
                    } as React.CSSProperties
                  }
                  onAnimationEnd={onAlurSelesai}
                />
              )}

              {/* Optional inline description on arrows */}
              {(() => {
                // #853 — klik-ganda membuka kotak sunting DI ATAS garis,
                // seperti draw.io. Label kosong pun bisa disunting, jadi
                // syaratnya bukan "ada label" saja.
                const sedangSunting = suntingLabelGarisId === edge.id;
                if (!edge.label && !sedangSunting) return null;
                // #833 / #522(d) — label duduk di TENGAH SEPANJANG jalur,
                // bukan di tengah tali lurus antara kedua ujung. Pada garis
                // yang memutar, rata-rata ujung jatuh di ruang kosong.
                // #853 — `labelOffset` menggesernya dari titik itu; kosong
                // berarti posisi lama, jadi papan lama tidak bergeser.
                const tengah = titikTengahJalur(tergambar);
                const geser = edge.labelOffset ?? { x: 0, y: 0 };
                const pusat = { x: tengah.x + geser.x, y: tengah.y + geser.y };
                // #656 — draw.io menaruh teks di atas garis, tanpa bingkai dan
                // tanpa bayangan. Kotak lebarnya 120 px supaya label panjang
                // membungkus dua baris, bukan dipotong elipsis.
                return (
                  <foreignObject
                    data-testid={`label-garis-${edge.id}`}
                    x={pusat.x - 60}
                    y={pusat.y - 17}
                    width="120"
                    height="34"
                  >
                    {sedangSunting ? (
                      <input
                        data-testid={`sunting-label-garis-${edge.id}`}
                        autoFocus
                        value={edge.label ?? ""}
                        onFocus={(e) => e.currentTarget.select()}
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          onEdgePatch(
                            edge.id,
                            { label: e.target.value },
                            onSeretSelesai ? { sementara: true } : undefined
                          )
                        }
                        onBlur={() => akhiriSuntingLabelGaris?.()}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            e.stopPropagation();
                            e.preventDefault();
                            e.currentTarget.blur();
                            return;
                          }
                          if (e.key === "Enter") {
                            e.preventDefault();
                            e.currentTarget.blur();
                          }
                          e.stopPropagation();
                        }}
                        style={{ fontSize: edge.labelFontSize }}
                        className={cn(
                          "w-full bg-surface text-xs text-content-strong font-normal px-1 py-0.5 text-center border border-primary rounded outline-none focus:ring-1 focus:ring-primary",
                          KELAS_HURUF.sans
                        )}
                      />
                    ) : (
                      <div
                        onPointerDown={(e) => mulaiSeretLabel(e, edge)}
                        // #853 — `mousedown` tetap dikirim peramban sesudah
                        // `pointerdown`; tanpa baris ini kanvas mengosongkan
                        // seleksi dan memulai kotak seleksi di tengah seretan.
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEdgeId(edge.id);
                          setSelectedNodeId(null);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          mulaiSuntingLabelGaris?.(edge.id);
                        }}
                        style={{
                          // #665 - `fontSize=10;fontColor=#ff0000` pada label garis.
                          fontSize: edge.labelFontSize,
                          color: warnaTeksAman(edge.labelColor) ?? undefined,
                        }}
                        className={cn(
                          "bg-surface/85 text-xs text-content-strong font-normal px-1 py-0.5 text-center whitespace-pre-wrap break-words cursor-move select-none",
                          // #761 — draw.io memakai Helvetica untuk label GARIS juga,
                          // bukan hanya label bentuk. Kelas yang sama dipakai kedua
                          // jalur lewat constants.ts, jadi ia tidak bisa lagi
                          // tertinggal di satu sisi saja.
                          KELAS_HURUF.sans
                        )}
                      >
                        {edge.label}
                      </div>
                    )}
                  </foreignObject>
                );
              })()}

              {/*
                #653 — pemegang tekukan, pada papan yang boleh disunting.
                #766 — satu hal diganti dan satu hal ditambah, dan keduanya
                karena keluhan pemilik proyek yang digambar dengan tangannya
                sendiri: "garis tidak bisa digeser, di atur, di bentuk".

                DULU: hanya muncul pada garis TERPILIH, dan hanya ada SATU
                lingkaran kosong di tengah seluruh jalur. Pada garis diagonal
                sepanjang dua layar itu berarti satu sasaran 5 px di titik yang
                tidak bisa dipilih — dan di HP, memilih garis saja sudah sulit,
                jadi jalur membentuk garis praktis tidak ada.

                SEKARANG, meniru draw.io:
                - SATU gagang, di TENGAH SEGMEN YANG SEDANG DISOROT kursor;
                  bila tidak ada yang disorot, di tengah seluruh jalur (#834 —
                  menggambar satu gagang per segmen membuat rute lima titik
                  menampilkan empat sasaran sekaligus, dan itu keluhan "banyak
                  titik");
                - gagang ikut muncul saat garis hanya DIARAHKAN kursor, supaya
                  ada untuk ditemukan sebelum dipilih;
                - sasaran sentuhnya 13 px ruang papan (lingkaran transparan),
                  lingkaran ungunya hanya hiasan 4,5 px — jari tidak menarget
                  hiasan;
                - menarik gagang menyisipkan SATU waypoint (`sisipTekukan`),
                  bukan menyalin seluruh rute router; sisa jalur dihitung ulang
                  seperti draw.io, jadi garis TIDAK melompat saat dibentuk dan
                  tidak meninggalkan ekor titik.

                Lingkaran UNGU penuh = tekukan yang sudah ada: seret untuk
                memindah, klik-ganda untuk membuang.
              */}
              {(isSelected || hoveredEdgeId === edge.id) &&
                isEditable &&
                (() => {
                  // #835 — yang digambar hanya tekukan yang masih berlaku;
                  // salinan rute lama tidak boleh muncul sebagai titik ungu.
                  const daftar = tekukan;
                  // #834 — padanan yang lebih kecil: titik tengah yang dipakai
                  // untuk menyisip tekukan hanya SATU, bukan satu per segmen.
                  // Bila kursor sedang di atas salah satu segmen, gagangnya
                  // duduk di segmen itu; selain itu di tengah seluruh jalur.
                  const indeksSorot =
                    segmenSorot && segmenSorot.edgeId === edge.id ? segmenSorot.i : -1;
                  let gagang: { x: number; y: number; i: number } | null = null;
                  if (indeksSorot >= 0 && tergambar[indeksSorot] && tergambar[indeksSorot + 1]) {
                    gagang = {
                      ...titikTengahJalur([tergambar[indeksSorot], tergambar[indeksSorot + 1]]),
                      i: indeksSorot,
                    };
                  } else {
                    const tengah = titikTengahJalur(tergambar);
                    const i = indeksSegmenTerdekat(tengah, tergambar);
                    if (i >= 0) gagang = { ...tengah, i };
                  }
                  return (
                    <g>
                      {daftar.map((w, i) => (
                        <g key={`tekuk-${i}`}>
                          <circle
                            data-testid={`tekukan-${i}`}
                            cx={w.x}
                            cy={w.y}
                            r={13 / zoomLevel}
                            fill="transparent"
                            className="cursor-grab"
                            onPointerDown={(e) =>
                              mulaiSeretTekukan(e, edge, i, undefined, undefined, tekukan)
                            }
                            // #837 — hentikan juga mousedown-nya; lihat jalur sentuh.
                            onMouseDown={(e) => e.stopPropagation()}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              hapusTekukan(edge, i, tekukan);
                            }}
                          />
                          <circle
                            cx={w.x}
                            cy={w.y}
                            r={6 / zoomLevel}
                            fill="#8b5cf6"
                            stroke="#ffffff"
                            strokeWidth={2 / zoomLevel}
                            pointerEvents="none"
                          />
                        </g>
                      ))}
                      {gagang && (
                        <g key={`seg-${gagang.i}`}>
                          <circle
                            data-testid={`gagang-tekuk-${gagang.i}`}
                            cx={gagang.x}
                            cy={gagang.y}
                            r={13 / zoomLevel}
                            fill="transparent"
                            className="cursor-crosshair"
                            onPointerDown={(e) =>
                              mulaiSeretTekukan(
                                e,
                                edge,
                                gagang!.i,
                                { x: gagang!.x, y: gagang!.y },
                                tergambar,
                                tekukan
                              )
                            }
                            // #837 — hentikan juga mousedown-nya; lihat jalur sentuh.
                            onMouseDown={(e) => e.stopPropagation()}
                          />
                          <circle
                            cx={gagang.x}
                            cy={gagang.y}
                            r={4.5 / zoomLevel}
                            fill="#ffffff"
                            stroke="#8b5cf6"
                            strokeWidth={1.5 / zoomLevel}
                            pointerEvents="none"
                          />
                        </g>
                      )}
                    </g>
                  );
                })()}
            </g>
          );
        })}

        {/*
          #858 — pratinjau garis dibuat JUJUR: ia berangkat dari paku yang
          digenggam (atau tepi terdekat bila sambungan dimulai lewat tool),
          memakai BENTUK JALUR yang akan lahir (ortogonal/straight/bezier),
          dan berwarna token primary. Sebelumnya pangkalnya pusat bentuk,
          bentuknya kurva ungu keras, dan kontras dengan garis ortogonal hitam
          yang langsung menggantikannya saat jari diangkat — persis keluhan
          "tidak bersih" dibandingkan draw.io.
        */}
        {connectSourceId &&
          (() => {
            const srcNode = nodes.find((n) => n.id === connectSourceId);
            if (!srcNode) return null;
            const awal = connectFrom ?? titikTepiTerdekat(srcNode, hoverCoords);
            const endX = hoverCoords.x;
            const endY = hoverCoords.y;
            const jarak = Math.hypot(endX - awal.x, endY - awal.y);
            // Titik awal dan kursor yang sama belum membentuk garis; menahan
            // diri lebih bersih daripada menggambar titik yang berkedip.
            if (jarak < 6) return null;

            let pathD: string;
            if (connectorType === "straight") {
              pathD = `M ${awal.x} ${awal.y} L ${endX} ${endY}`;
            } else if (connectorType === "orthogonal") {
              // Siku dengan satu belokan di tengah, mengikuti sumbu gerak yang
              // dominan — bentuk yang sama dengan rute ortogonal hasilnya.
              if (Math.abs(endY - awal.y) >= Math.abs(endX - awal.x)) {
                const tengahY = (awal.y + endY) / 2;
                pathD = `M ${awal.x} ${awal.y} L ${awal.x} ${tengahY} L ${endX} ${tengahY} L ${endX} ${endY}`;
              } else {
                const tengahX = (awal.x + endX) / 2;
                pathD = `M ${awal.x} ${awal.y} L ${tengahX} ${awal.y} L ${tengahX} ${endY} L ${endX} ${endY}`;
              }
            } else {
              const dx = endX - awal.x;
              pathD = `M ${awal.x} ${awal.y} C ${awal.x + dx * 0.5} ${awal.y}, ${endX - dx * 0.5} ${endY}, ${endX} ${endY}`;
            }

            return (
              <g data-testid="pratinjau-sambung">
                <path
                  d={pathD}
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth={1.5 / zoomLevel}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Ujung garis yang sedang ditarik. #642 — lingkaran ini
                    statis; `animate-ping` dan loop dash tidak boleh kembali. */}
                <circle
                  cx={endX}
                  cy={endY}
                  r={5 / zoomLevel}
                  fill="var(--color-primary)"
                  opacity="0.2"
                  className="titik-ujung-sambung"
                />
                <circle cx={endX} cy={endY} r={2.5 / zoomLevel} fill="var(--color-primary)" />
              </g>
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
