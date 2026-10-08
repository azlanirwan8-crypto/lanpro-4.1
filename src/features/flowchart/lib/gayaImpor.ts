/**
 * Gaya asli diagram sumber dibawa ke papan LanPro (#650).
 *
 * MENGAPA ADA. Parser impor kita selama ini hanya memindahkan **isi** bentuk
 * dan hubungannya; setiap gaya dari sumber dibuang dan diganti nilai
 * bawaan kita: `fontSize: 13`, `align: "center"`, `borderStyle: "solid"`,
 * `strokeWidth: 2` ditulis apa adanya di keempat jalur impor, dan warna bentuk
 * Miro ditebak dari NAMA bentuknya. Hasilnya papan yang "isinya sama tapi
 * mukanya beda" — dilaporkan pemilik proyek 08 Okt setelah mengimpor papan
 * Miro-nya: catatan bergaris putus-putus jadi kotak polos, label garis
 * (YA / TIDAK / EDC / QRIS) hilang, garis siku jadi melengkung, dan teks
 * banyak baris menempel jadi satu ("RingkasanData Merchant").
 *
 * YANG TIDAK DIJANGKAU. Tebal huruf dan warna huruf. `FlowNode`
 * (`types.ts:101-118`) tidak punya medan `fontWeight` maupun `fontColor`, jadi
 * keduanya bukan kerja parser — butuh perubahan model + renderer dan dikunci
 * sebagai item terpisah. Batas lain yang jujur: bentuk yang digambar SVG
 * (`customSvgTypes`) dan catatan `sticky` tidak memakai border div, jadi garis
 * putus-putus sumber hanya tampil pada bentuk div (persegi panjang, diamond).
 *
 * KUNCI BACA. Miro punya dua generasi API yang namanya berbeda untuk hal yang
 * sama (`strokeColor` di WebSDK, `borderColor` di REST; gaya bisa jadi
 * saudara `data` atau berada `di dalam data`). Berkas ekspor pemilik proyek
 * belum di tangan, jadi setiap medan dibaca dari SEMUA lokasi yang
 * terdokumentasi, pertama yang ada yang menang — bukan satu tebakan.
 */
import type { FlowEdge, FlowNode } from "../types";

/** Batas baris. draw.io dan Miro menulis SATU BARIS teks di dalam `<div>` atau
 *  `<p>` masing-masing; tag-nya dibuang tanpa jejak membuat baris menempel. */
export const potongTeks = (mentah: string): string =>
  mentah
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/\s*(?:p|div|li|h[1-6])\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^[\s\uFEFF]+|[\s\uFEFF]+$/g, "");

export interface GayaBentuk {
  /** Hex isian apa adanya; `warnaPaletTerdekat()` yang mengubahnya jadi nama palet. */
  fillHex: string;
  strokeHex: string;
  fontSize?: number;
  align?: FlowNode["align"];
  dashed?: boolean;
  strokeWidth?: number;
  /** Rangkaian nama bentuk dari kunci mana pun yang dipakai sumber. */
  bentukHint: string;
}

const KOSONG: GayaBentuk = {
  fillHex: "",
  strokeHex: "",
  bentukHint: "",
};

/** Wadah gaya yang mungkin dipakai sumber, urut dari yang paling umum. */
const wadahGaya = (item: any): any[] =>
  [item?.style, item?.data?.style, item?.itemStyle, item?.data].filter(
    (w) => w && typeof w === "object"
  );

const ambil = (item: any, kunci: string[]): string => {
  for (const w of wadahGaya(item)) {
    for (const k of kunci) {
      const nilai = w?.[k];
      if (typeof nilai === "string" && nilai.trim()) return nilai.trim();
      if (typeof nilai === "number") return String(nilai);
    }
  }
  return "";
};

const RATA: Record<string, FlowNode["align"]> = {
  left: "left",
  start: "left",
  flexstart: "left",
  center: "center",
  middle: "center",
  right: "right",
  end: "right",
  flexend: "right",
};

export const gayaDariItem = (item: any): GayaBentuk => {
  if (!item || typeof item !== "object") return KOSONG;

  const angka = (kunci: string[]) => {
    const mentah = ambil(item, kunci);
    const n = Number.parseFloat(mentah);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };

  const garis = ambil(item, [
    "borderStyle",
    "strokeStyle",
    "lineStyle",
    "dashPattern",
  ]).toLowerCase();
  const rata = RATA[ambil(item, ["textAlign", "align", "horizontalAlign", "hAlign"]).toLowerCase()];

  return {
    fillHex: ambil(item, ["fillColor", "fill", "backgroundColor", "background"]),
    strokeHex: ambil(item, ["strokeColor", "borderColor", "lineColor", "border"]),
    fontSize: angka(["fontSize", "fontsize", "textSize"]),
    align: rata,
    dashed: garis === "dashed" || garis === "dash" || garis === "dotted",
    strokeWidth: angka(["borderWidth", "strokeWidth", "lineWidth"]),
    // Nama bentuk bisa duduk di empat tempat tergantung generasi API (dan ekspor
    // lama menaruhnya di puncak item), jadi semuanya dikumpulkan — bukan dipilih
    // satu. `type` ikut karena sebagian sumber hanya menulis bentuk di sana.
    bentukHint: [
      typeof item.type === "string" ? item.type : "",
      typeof item.shape === "string" ? item.shape : "",
      typeof item.shapeType === "string" ? item.shapeType : "",
      ambil(item, ["shapeType", "shape"]),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  };
};

export interface GayaGaris {
  label: string;
  connector?: FlowEdge["connector"];
  strokeStyle?: FlowEdge["strokeStyle"];
}

/** Teks pada garis. WebSDK menyimpannya di `captions[]`, REST di `data.captions[]`,
 *  dan sebagian ekspor meletakkannya di `caption`/`content` biasa. */
const labelGaris = (item: any): string => {
  const kandidat: any[] = [item?.captions, item?.data?.captions, item?.style?.captions];
  for (const daftar of kandidat) {
    if (Array.isArray(daftar)) {
      const teks = daftar
        .map((c: any) => (typeof c === "string" ? c : c?.text || c?.content || ""))
        .find((t: string) => t.trim());
      if (teks) return teks;
    }
  }
  const tunggal = [item?.caption, item?.data?.caption, item?.label, item?.title].find(
    (t: any) => typeof t === "string" && t.trim()
  );
  return typeof tunggal === "string" ? tunggal : "";
};

export const gayaGarisDariItem = (item: any): GayaGaris => {
  const bentuk = ambil(item, ["shape", "connectorStyle", "lineShape", "routing"]).toLowerCase();
  const gores = ambil(item, ["strokeStyle", "lineStyle", "borderStyle"]).toLowerCase();
  const gaya: GayaGaris = { label: labelGaris(item) };

  if (/elbow|orthogonal|right_?angle|rectilinear/.test(bentuk)) gaya.connector = "orthogonal";
  else if (/curve|bezier|multiway/.test(bentuk)) gaya.connector = "bezier";
  else if (/straight|direct|line/.test(bentuk)) gaya.connector = "straight";

  if (gores === "dashed" || gores === "dash") gaya.strokeStyle = "dashed";
  else if (gores === "dotted") gaya.strokeStyle = "dotted";

  return gaya;
};

/** Gaya garis pada berkas draw.io: `edgeStyle=...`, `dashed=1`, `curved=1`. */
export const gayaGarisDrawIo = (style: string): GayaGaris => {
  const s = style.toLowerCase();
  const gaya: GayaGaris = { label: "" };
  if (
    /edgestyle=(?:edgeconnectorstyle|orthogonaledgeconnectorstyle)/.test(s) ||
    /orthogonal/.test(s)
  )
    gaya.connector = "orthogonal";
  else if (/curved=1/.test(s)) gaya.connector = "bezier";
  else if (/edgestyle=entityrelationedgestyle/.test(s) || /straight/.test(s))
    gaya.connector = "straight";
  if (/dashed=1/.test(s)) gaya.strokeStyle = "dashed";
  else if (/dashpattern=1;2|dotted=1/.test(s)) gaya.strokeStyle = "dotted";
  return gaya;
};

/** Gaya bentuk pada string `style=` draw.io. */
export const gayaDrawIo = (
  style: string
): { dashed?: boolean; fontSize?: number; align?: FlowNode["align"]; strokeWidth?: number } => {
  const out: {
    dashed?: boolean;
    fontSize?: number;
    align?: FlowNode["align"];
    strokeWidth?: number;
  } = {};
  const angka = (kunci: string) => {
    const m = new RegExp(`${kunci}=([0-9.]+)`, "i").exec(style);
    const n = m ? Number.parseFloat(m[1]) : NaN;
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  if (/dashed=1/i.test(style)) out.dashed = true;
  const fs = angka("fontsize");
  if (fs) out.fontSize = Math.round(fs);
  const sw = angka("strokeWidth");
  if (sw) out.strokeWidth = Math.round(sw);
  const align = /align=(left|center|right)/i.exec(style)?.[1]?.toLowerCase();
  if (align === "left" || align === "center" || align === "right") out.align = align;
  return out;
};
