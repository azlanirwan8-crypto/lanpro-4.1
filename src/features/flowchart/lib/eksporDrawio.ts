/**
 * #659 — papan LanPro ditulis MENJADI berkas `.drawio` yang bisa dibuka draw.io.
 *
 * MENGAPA ITEM INI ADA. Selama impornya searah, satu-satunya cara membuktikan
 * "papan ini sama dengan draw.io" adalah mata manusia yang membandingkan dua
 * layar. Berkas hasil ekspor memutus kebuntuan itu: ia bisa dibuka orang di
 * draw.io, dan ia bisa diimpor kembali ke sini lalu dibandingkan properti demi
 * properti oleh test (lihat `eksporDrawio-659.test.tsx`).
 *
 * CARA KERJANYA: BALIK DARI PETA IMPOR, BUKAN PETA BARU. Setiap kunci yang
 * ditulis di sini adalah kebalikan dari yang dibaca `importers.ts`
 * (`gayaDrawIo` / `gayaGarisDrawIo` dan urutan pengenalannya di #667). Kalau
 * suatu hari peta impor bertambah, peta ini harus bertambah bersama - itu
 * sebabnya berkas ini menyebut nomor item pembacanya, bukan sekadar
 * menduplikasi string.
 *
 * SATU HAL YANG SENGAJA TIDAK DILAKUKAN: tidak ada satu pun angka gaya yang
 * dikarang di sini. Bentuk yang tidak punya padanan draw.io yang dikenal
 * penjeraf TIDAK diberi bentuk karangan; ia keluar sebagai persegi panjang dan
 * test round-trip akan melaporkan selisihnya, karena menyembunyikan selisih
 * sama dengan membuat klaim palsu.
 */
import type { FlowEdge, FlowNode } from "../types";
import { colorPaletteHex, ukuranBentukEfektif } from "../constants";

/** Nilai atribut XML: lima karakter yang wajib, dan tidak ada yang lain. */
const kutip = (nilai: string): string =>
  nilai
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

/**
 * Label. draw.io menyimpan teks multi-baris sebagai markup di dalam `value`
 * (dengan `html=1`), sedangkan papan ini menyimpannya sebagai teks biasa dengan
 * `\n`. `potongTeks()` saat impor sudah mengubah `<br>` dan penutup baris
 * menjadi `\n`, jadi jalur baliknya: `\n` -> `<br>` -> di-escape.
 */
const nilaiLabel = (teks: string): string => kutip((teks || "").replace(/\n/g, "<br>"));

/** Bentuk papan -> awalan `style=` draw.io, sesuai urutan pengenal impor. */
const gayaBentukDrawIo = (node: FlowNode): string => {
  switch (node.type) {
    case "oval":
    case "circle":
      return "ellipse;";
    case "diamond":
    case "decision":
      return "rhombus;";
    case "cloud":
      return "ellipse;shape=cloud;";
    case "subprocess":
    case "predefined":
      return "shape=process;";
    case "parallelogram":
      return "shape=parallelogram;";
    case "document":
    case "multiDocument":
      return "shape=document;";
    case "cylinder":
    case "database":
      return "shape=cylinder3;";
    case "sticky":
      return "shape=note;";
    case "hexagon":
      return "shape=hexagon;";
    default:
      // Persegi panjang: memang bawaan draw.io, jadi tidak perlu awalan.
      return "";
  }
};

/** Isian dan tepi. Palet papan INI ADALAH heks draw.io, jadi ia bisa ditulis balik. */
const gayaWarna = (node: FlowNode): string[] => {
  const palet = colorPaletteHex[node.color] || colorPaletteHex.indigo;
  const out: string[] = [];
  if (node.fillNone) out.push("fillColor=none");
  else out.push(`fillColor=${node.fillHex || palet.bg}`);
  if (node.gradientHex) out.push(`gradientColor=${node.gradientHex}`);
  if (node.borderStyle === "none") out.push("strokeColor=none");
  else out.push(`strokeColor=${node.strokeHex || palet.stroke}`);
  return out;
};

/**
 * Huruf. Bitmask `fontStyle` draw.io disusun ulang dari tiga kolom terpisah -
 * 1 tebal, 2 miring, 4 garis bawah - persis kebalikan dari `tebalDariBitmask`,
 * `miringDariBitmask`, dan `garisBawahDariBitmask`.
 */
const gayaHuruf = (node: FlowNode): string[] => {
  const out: string[] = [];
  const bit =
    (node.fontWeight === "bold" ? 1 : 0) | (node.italic ? 2 : 0) | (node.underline ? 4 : 0);
  if (bit) out.push(`fontStyle=${bit}`);
  out.push(`fontSize=${node.fontSize || 12}`);
  if (node.fontColor) out.push(`fontColor=${node.fontColor}`);
  if (node.fontFamily) out.push(`fontFamily=${node.fontFamily}`);
  if (node.align) out.push(`align=${node.align}`);
  if (node.verticalAlign) out.push(`verticalAlign=${node.verticalAlign}`);
  return out;
};

const gayaTepi = (node: FlowNode): string[] => {
  const out: string[] = [];
  if (node.rounded) out.push("rounded=1");
  if (node.borderStyle === "dashed") {
    out.push("dashed=1");
    if (node.dashPattern) out.push(`dashPattern=${node.dashPattern.replace(/,/g, " ")}`);
  }
  out.push(`strokeWidth=${node.strokeWidth ?? 1}`);
  if (typeof node.rotation === "number") out.push(`rotation=${node.rotation}`);
  if (typeof node.opacity === "number") out.push(`opacity=${node.opacity}`);
  if (node.shadow) out.push("shadow=1");
  return out;
};

/** Satu bentuk -> satu `mxCell` vertex. */
const selBentuk = (node: FlowNode): string => {
  const { width, height } = ukuranBentukEfektif(node);
  const gaya = [
    gayaBentukDrawIo(node),
    "whiteSpace=wrap",
    "html=1",
    ...gayaWarna(node),
    ...gayaTepi(node),
    ...gayaHuruf(node),
  ]
    .filter(Boolean)
    .join(";");
  return (
    `<mxCell id="${kutip(node.id)}" value="${nilaiLabel(node.label)}" ` +
    `style="${kutip(gaya)}" vertex="1" parent="1">` +
    `<mxGeometry x="${node.x}" y="${node.y}" width="${width}" height="${height}" as="geometry"/>` +
    `</mxCell>`
  );
};

const gayaGaris = (edge: FlowEdge): string[] => {
  const out: string[] = [];
  if (edge.connector === "orthogonal") out.push("edgeStyle=orthogonalEdgeStyle");
  else if (edge.connector === "bezier") out.push("curved=1");
  else if (edge.connector === "straight") out.push("edgeStyle=none");
  if (edge.strokeStyle === "dashed" || edge.strokeStyle === "dotted") out.push("dashed=1");
  if (edge.dashPattern) out.push(`dashPattern=${edge.dashPattern.replace(/,/g, " ")}`);
  if (edge.strokeColor) out.push(`strokeColor=${edge.strokeColor}`);
  out.push(`strokeWidth=${edge.strokeWidth ?? 1}`);
  if (edge.endArrow) out.push(`endArrow=${edge.endArrow}`);
  if (edge.startArrow) out.push(`startArrow=${edge.startArrow}`);
  if (edge.endFill !== undefined) out.push(`endFill=${edge.endFill ? 1 : 0}`);
  if (edge.startFill !== undefined) out.push(`startFill=${edge.startFill ? 1 : 0}`);
  if (edge.labelFontSize) out.push(`fontSize=${edge.labelFontSize}`);
  if (edge.labelColor) out.push(`fontColor=${edge.labelColor}`);
  // #669 - titik sambung ditulis sebagai pasangan, hanya bila keduanya ada.
  if (edge.portSumber) out.push(`exitX=${edge.portSumber.x}`, `exitY=${edge.portSumber.y}`);
  if (edge.portTujuan) out.push(`entryX=${edge.portTujuan.x}`, `entryY=${edge.portTujuan.y}`);
  return out;
};

/** Satu garis -> satu `mxCell` edge, dengan tekukan manual sebagai `Array`. */
const selGaris = (edge: FlowEdge): string => {
  const gaya = ["html=1", ...gayaGaris(edge)].filter(Boolean).join(";");
  const tekukan =
    edge.waypoints && edge.waypoints.length
      ? `<Array as="points">${edge.waypoints
          .map((p) => `<mxPoint x="${p.x}" y="${p.y}"/>`)
          .join("")}</Array>`
      : "";
  return (
    `<mxCell id="${kutip(edge.id)}" value="${nilaiLabel(edge.label || "")}" ` +
    `style="${kutip(gaya)}" edge="1" parent="1" ` +
    `source="${kutip(edge.fromNodeId)}" target="${kutip(edge.toNodeId)}">` +
    `<mxGeometry relative="1" as="geometry">${tekukan}</mxGeometry>` +
    `</mxCell>`
  );
};

/**
 * Seluruh papan menjadi satu berkas mxfile.
 *
 * Bentuk dan garis yang menggantung (ujungnya menunjuk id yang tidak ada) TETAP
 * ditulis: draw.io akan menampilkannya menggantung, sama seperti papan ini, dan
 * menyaringnya diam-diam akan membuat round-trip terlihat lebih baik daripada
 * kenyataannya.
 */
export const eksporDrawIo = (nodes: FlowNode[], edges: FlowEdge[], nama = "LanPro"): string =>
  `<mxfile host="LanPro" version="1.0">` +
  `<diagram id="lanpro-1" name="${kutip(nama)}">` +
  `<mxGraphModel dx="0" dy="0" grid="0" gridSize="10" guides="1" tooltips="1" ` +
  `connect="1" arrows="1" fold="1" page="0" pageScale="1" pageWidth="850" ` +
  `pageHeight="1100" math="0" shadow="0"><root>` +
  `<mxCell id="0"/><mxCell id="1" parent="0"/>` +
  nodes.map(selBentuk).join("") +
  edges.map(selGaris).join("") +
  `</root></mxGraphModel></diagram></mxfile>`;
