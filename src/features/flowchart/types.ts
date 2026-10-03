/**
 * Tipe data domain Flowchart.
 *
 * Diekstrak dari FlowchartContainer.tsx (Fase 3 — Anti-God-Object).
 * Berisi tipe murni: tanpa React, tanpa efek samping, tanpa dependensi runtime.
 */

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
  | "bpmnEventEnd";

/** Tema kanvas yang tersedia. */
export type CanvasTheme = "miro" | "blueprint";

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
  /**
   * #567 — kolom kanvasnya ADA tetapi tidak bisa dibaca. Ini BUKAN papan kosong:
   * bedanya menentukan jalur tulis boleh jalan atau tidak.
   */
  muatGagal?: boolean;
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
