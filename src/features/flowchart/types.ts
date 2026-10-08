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
  align?: "left" | "center" | "right";
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
