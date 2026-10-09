/**
 * Tipe data domain Flowchart.
 *
 * Diekstrak dari FlowchartContainer.tsx (Fase 3 — Anti-God-Object).
 * Berisi tipe murni: tanpa React, tanpa efek samping, tanpa dependensi runtime.
 */
import type { TipeBentukEkstra } from "./lib/tipeBentukEkstra";

export type FlowNodeType =
  | "oval"
  | "rect"
  | "diamond"
  | "cylinder"
  | "text"
  | "sticky"
  | "cloud"
  | "circle"
  | "card"
  | "parallelogram"
  | "document"
  | "subprocess"
  | "actor"
  | "folder"
  | "decision"
  | "predefined"
  | "database"
  | "triangle"
  | "pentagon"
  | "hexagon"
  | "octagon"
  | "star"
  | "arrowRight"
  | "arrowLeft"
  | "arrowLeftRight"
  | "trapezoid"
  | "cross"
  | "curlyLeft"
  | "curlyRight"
  | "chevron"
  | "delay"
  | "callout"
  | "awsLambda"
  | "awsEc2"
  | "awsS3"
  | "awsVpc"
  | "awsRds"
  | "awsCloudwatch"
  | "awsDynamo"
  | "umlClass"
  | "umlInterface"
  | "umlUseCase"
  | "umlBoundary"
  | "umlControl"
  | "umlEntity"
  | "umlNote"
  | "multiDocument"
  | "manualInput"
  | "manualOperation"
  | "preparation"
  | "display"
  | "summingJunction"
  | "collate"
  | "connectorOr"
  | "sort"
  | "merge"
  | "azureUser"
  | "azureSql"
  | "azureFunctions"
  | "azureKeyVault"
  | "azureCosmos"
  | "azurePowerBi"
  | "azureVm"
  | "azureStorage"
  | "bpmnActivity"
  | "bpmnEvent"
  | "bpmnGateway"
  | "bpmnDataStore"
  | "bpmnDataObject"
  | "bpmnEventEnd"
  /**
   * #620 — 147 bentuk tambahan (AWS/Swimlane/gerbang logika/BPMN/ER/P&ID dan
   * seluruh turunan geometri). Dulu tidak ada di union ini sama sekali: palet
   * memasukkan mereka lewat `as FlowNode["type"]`, jadi sistem tipe kebal
   * terhadap bentuk yang tidak punya gambar.
   */
  | TipeBentukEkstra;

/** Tema kanvas yang tersedia. */
export type CanvasTheme = "miro" | "blueprint";

/**
 * Pola latar papan — pilihan pengguna, TERPISAH dari warna. Warna papan ikut
 * tema aplikasi (#547); pola ini yang decides whether the board is blank,
 * bertitik (bawaan ala Miro), atau berkisi.
 */
export type PolaPapan = "polos" | "titik" | "kisi";

export const POLA_PAPAN: PolaPapan[] = ["polos", "titik", "kisi"];
export const POLA_BAWAAN: PolaPapan = "titik";

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  x: number;
  y: number;
  label: string;
  /** "yellow", "orange", "pink", "blue", "green", "purple", "slate", "indigo", "emerald", "sky", "amber", "rose", "violet" */
  color: string;
  /** ID task Workspace yang tertaut. */
  taskId?: string;
  width?: number;
  height?: number;
  fontSize?: number;
  fontStyle?: "sans" | "serif" | "mono";
  /** Tebal huruf. Kosong = biasa. #651 — dulu gaya ini tidak punya tempat di
   *  model sama sekali, jadi papan Miro yang hurufnya tebal datang sebagai
   *  huruf biasa dan tidak bisa diperbaiki dari mana pun. */
  fontWeight?: "normal" | "bold";
  /** Warna huruf, hex `#rgb`/`#rrggbb` dari berkas impor. Kosong = ikut palet
   *  bentuk. Nilainya TIDAK pernah dipercaya apa adanya: yang masuk ke DOM
   *  hanya yang lolos `warnaTeksAman()`. */
  fontColor?: string;
  /**
   * #657 - isian dan tepi APA ADANYA dari berkas sumber. `color` tetap ada dan
   * tetap nama palet (ia dipakai pemilih warna, kepala garis, dan gradioen
   * `url(#grad-..)`), tetapi bila kolom ini terisi maka yang digambar adalah
   * hex-nya, bukan paletnya. Alasannya terukur: `warnaPaletTerdekat()` memaksa
   * setiap hex ke dua belas nama palet dan melepaskan saturasi di bawah 0,12,
   * jadi kotak PUTIH draw.io jatuh ke tebakan nama bentuk dan datang sebagai
   * `indigo` ungu.
   *
   * Nilainya tidak pernah dipercaya: yang masuk ke DOM hanya yang lolos
   * `warnaTeksAman()`.
   */
  fillHex?: string;
  strokeHex?: string;
  align?: "left" | "center" | "right";
  /**
   * #666 — `rounded=1` dari berkas draw.io. Kosong = bawaan papan, dan bawaan
   * itu sejak #655 adalah `rounded=0` seperti draw.io. Tanpa kolom ini, bentuk
   * yang di sumbernya membulat justru datang bersudut tajam: #655 memperbaiki
   * bawaan tapi merusak yang disetel.
   */
  rounded?: boolean;
  /**
   * #666 — `dashPattern=4 4` apa adanya, disimpan dengan koma ala SVG (`4,4`).
   * Kosong berarti gaya putus-putus memakai pola bawaan draw.io, `3,3`.
   */
  dashPattern?: string;
  /** #666 — `verticalAlign=top|middle|bottom`; kosong = tengah seperti draw.io. */
  verticalAlign?: "top" | "middle" | "bottom";
  borderStyle?: "solid" | "dashed" | "none";
  strokeWidth?: number;
}

export interface FlowEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  label?: string;
  /** Bentuk jalur garis satuannya. Kosong = ikut bentuk bawaan papan. */
  connector?: "bezier" | "straight" | "orthogonal";
  /** Gaya goresan. Kosong = garis utuh. */
  strokeStyle?: "solid" | "dashed" | "dotted";
  /**
   * Titik tekuk manual dalam koordinat papan (#653). Selama kosong atau tidak
   * ada, jalurnya dihitung otomatis oleh `findSmartRoute` dan dihitung ulang
   * setiap kali ujung atau rintangan berubah. Begitu pengguna menggeser garis,
   * tekukan inilah yang menjadi jalurnya — rute otomatis mundur, persis seperti
   * Miro menyimpan waypoint per penghubung.
   */
  waypoints?: Point[];
  /**
   * #665 - gaya yang ditulis berkas draw.io pada tepi. Sebelum ini `FlowEdge`
   * tidak punya kolom gaya selain `connector` dan `strokeStyle`, jadi garis
   * `strokeColor=#b85450;strokeWidth=4` datang sebagai garis tema setebal 1 px:
   * warnanya hilang, tebalnya hilang, dan mata panahnya tetap digambar walau
   * sumber menulis `endArrow=none`.
   *
   * `strokeColor` dan `labelColor` TIDAK pernah dipercaya apa adanya: yang masuk
   * ke DOM hanya yang lolos `warnaTeksAman()`.
   */
  strokeColor?: string;
  strokeWidth?: number;
  /** `dashPattern=8 8` draw.io, disimpan sebagai notasi SVG: `8,8`. */
  dashPattern?: string;
  /** Bentuk ujung garis, nilai `endArrow` dan `startArrow` draw.io apa adanya. */
  endArrow?: string;
  startArrow?: string;
  /** `endFill=0` berarti mata terbuka. `undefined` ikut bentuknya. */
  endFill?: boolean;
  startFill?: boolean;
  labelFontSize?: number;
  labelColor?: string;
}

/**
 * Empat blok detail dokumen flowchart (#583), diambil dari struktur slide BRD
 * yang dipakai pemilik proyek: masalah -> titik nyeri -> cara -> manfaat.
 */
export interface KonteksFlowchart {
  masalah: string;
  titikNyeri: string;
  cara: string;
  manfaat: string;
}

export const KONTEKS_KOSONG: KonteksFlowchart = {
  masalah: "",
  titikNyeri: "",
  cara: "",
  manfaat: "",
};

export const adaKonteks = (k?: KonteksFlowchart) =>
  !!k && Boolean(k.masalah || k.titikNyeri || k.cara || k.manfaat);

export interface FlowchartDocument {
  id: string;
  name: string;
  /** Tautan dokumen (#583) — jalur baru menggantikan unggah berkas. */
  link?: string;
  /** Berkas base64 dari jalur lama; tetap dibaca supaya lampiran lama tidak hilang. */
  fileData?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  createdAt: string;
  createdBy: string;
}

export interface FlowchartData {
  id: string;
  name: string;
  category?: string;
  externalUrl?: string;
  documents?: FlowchartDocument[];
  epicTaskId?: string;
  description: string;
  /** Disimpan di payload `canvasData`, bukan kolom baru (#583). */
  konteks?: KonteksFlowchart;
  nodes: FlowNode[];
  edges: FlowEdge[];
  theme: CanvasTheme;
  /** Disimpan di payload `canvasData` seperti `theme` (#613). */
  polaPapan?: PolaPapan;
  /**
   * #567 — kolom kanvasnya ADA tetapi tidak bisa dibaca. Ini BUKAN papan kosong:
   * bedanya menentukan jalur tulis boleh jalan atau tidak.
   */
  muatGagal?: boolean;
  /**
   * #568 — stempel `updatedAt` baris ini saat papan terakhir dibaca. Kalau
   * basis data sudah bergeser, kiriman berikutnya ditolak 409 dan pengguna
   * diminta memuat ulang, bukan menimpa kerja tab lain.
   */
  versiMuat?: string;
  createdAt: string;
  /** Id pembuat — menentukan siapa yang boleh mengedit (Item #268). */
  createdBy?: string;
  /** Nama tampilan pembuat — untuk ditampilkan saja (Item #268). */
  createdByName?: string | null;
  lastEditedAt?: string;
}

// --- Tipe pendukung auto-routing ---

export interface Point {
  x: number;
  y: number;
}
