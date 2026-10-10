/**
 * Pemetaan node → kelas Tailwind.
 *
 * Data masuk, string kelas keluar. Tidak ada state, ref, maupun DOM — karena
 * itu tempatnya di lib/ menurut aturan lapisan ARCHITECTURE.md §2, bukan di
 * dalam komponen tempatnya semula tinggal.
 *
 * Pelengkap `lib/shapes.tsx`: berkas itu menggambar bentuk yang butuh SVG
 * presisi, berkas ini memberi gaya bentuk yang cukup diwakili sebuah div.
 *
 * #638 — kelas di sini tidak lagi mewarnai bentuk. Latar dan garis tepi dibaca
 * dari `colorPaletteHex` dan dipasang inline oleh `FlowchartNode`, supaya
 * bentuk div, bentuk SVG, dan petak pemilih warna tidak bisa berbeda warna;
 * tebal tepi div ikut diturunkan ke 1 px seperti garis tepi draw.io.
 *
 * Kelas keras yang tersisa di berkas ini (tepi bawah sticky note dan kertas
 * card) SENGAJA tidak dipindah ke token: kanvas mewakili dokumen, bukan
 * antarmuka — alasan yang sama dengan entri `slate` di `../constants`.
 */
import type { FlowNode } from "../types";
import { colorPalettes } from "../constants";
import { customSvgTypes } from "./shapes";

/**
 * Bentuk yang menggurat LATARNYA SENDIRI yang terang, apa pun temanya.
 *
 * `card` memakai latar putih bening 95 % sebagai kelas keras, dan itu SENGAJA:
 * kanvas mewakili dokumen, bukan antarmuka (§22.5, alasan yang sama dengan entri
 * `slate` di `../constants`). Konsekuensinya harus ikut diumumkan di sini,
 * karena `FlowchartNode` tidak boleh menebaknya dari jauh — di papan gelap
 * label dipaksa `text-content-inverse` (#ffffff), dan putih di atas kartu putih
 * adalah 1,00:1 (#677). Daftarnya tinggal satu; bentuk lain di berkas ini memakai
 * `bg-transparent` atau isian inline yang sudah ditekan di blueprint.
 */
export const bentukLatarTerang: string[] = ["card"];

/**
 * Menghasilkan kelas Tailwind untuk sebuah node sesuai tipe, warna, gaya
 * garis, dan status terpilihnya.
 *
 * Bentuk yang digambar sebagai SVG (lihat `customSvgTypes`) sengaja dibuat
 * transparan tanpa border: rangkanya digambar SVG di belakangnya, sehingga
 * border div akan tampak sebagai kotak ganda.
 */
export const getShapeThemeClasses = (node: FlowNode, isSelected: boolean): string => {
  const palette = colorPalettes[node.color] || colorPalettes.indigo;
  const ringClass = isSelected ? "ring-4 ring-offset-2 ring-violet-500 z-30" : "";

  const base =
    "transition-all duration-300 flex flex-col justify-center items-center text-center p-3 select-none";
  let borderStyleClass = "border";
  if (node.borderStyle === "dashed") borderStyleClass = "border border-dashed";
  if (node.borderStyle === "none") borderStyleClass = "border-0 shadow-none";

  if (
    customSvgTypes.includes(node.type as any) ||
    node.type === "parallelogram" ||
    node.type === "diamond" ||
    node.type === "decision"
  ) {
    const customIsSelectedRing = isSelected ? "z-30" : "";
    return `transition-all duration-300 flex flex-col justify-center items-center text-center p-3 select-none ${palette.text} ${customIsSelectedRing} relative bg-transparent border-0`;
  }

  if (node.type === "sticky") {
    // #652 — cabang ini satu-satunya jalur gambar yang tidak pernah memasang
    // kelas border: bentuk div lain memakai `borderStyleClass`, bentuk SVG
    // membawa `strokeDasharray`. Catatan Miro yang aslinya putus-putus jadi
    // kotak polos padahal nilainya sudah dibacakan parser sejak #650.
    // Untuk sticky solid kelasnya TIDAK berubah sama sekali — tampilan lama
    // papan tidak boleh ikut bergeser.
    const tepi =
      node.borderStyle === "dashed"
        ? "border border-dashed"
        : node.borderStyle === "none"
          ? "border-0 shadow-none"
          : "border-b-[3px] border-black/15";
    return `${base} justify-start text-left p-4 ${palette.text} ${tepi} rounded-md ${ringClass}`;
  }

  if (node.type === "rect") {
    // #655 — tanpa kelas radius: bawaan draw.io adalah `rounded=0`, dan `rect`
    // tidak digambar SVG (lihat `renderBasicShape`), jadi div INI yang terlihat.
    // Tebal tepinya ikut `node.strokeWidth` lewat gaya inline di FlowchartNode.
    // #666 — KECUALI berkas sumber yang menyetel `rounded=1`; untuk itu dipakai
    // langkah `rounded-lg` yang sudah ada di garis dasar `audit:radius`, bukan
    // langkah baru, dan `arcSize` bawaan draw.io (10) memang paling dekat ke 8.
    return `${base} ${borderStyleClass} ${node.rounded ? "rounded-lg" : ""} ${palette.text} ${ringClass}`;
  }

  // Tidak ada cabang untuk "oval" dan "circle": keduanya terdaftar di
  // `customSvgTypes`, sehingga pemeriksaan di atas sudah menanganinya lebih
  // dulu. Cabang khusus untuk keduanya pernah ada di sini dan tidak pernah
  // sekali pun tercapai. Menambahkannya kembali tidak akan berpengaruh —
  // yang perlu diubah adalah daftar di lib/shapes.tsx.

  if (node.type === "cylinder" || node.type === "database") {
    return `${base} ${borderStyleClass} rounded-t-[20px] rounded-b-[20px] ${palette.text} ${ringClass}`;
  }

  if (node.type === "cloud") {
    return `${base} ${borderStyleClass} rounded-[28px] ${palette.text} ${ringClass}`;
  }

  if (node.type === "card") {
    return `${base} border border-border-subtle/80 rounded-xl text-left items-start p-4 bg-white/95 backdrop-blur-sm shadow-sm ${palette.text} ${ringClass}`;
  }

  if (node.type === "document") {
    return `${base} ${borderStyleClass} rounded-tl-lg rounded-tr-2xl rounded-b-lg ${palette.text} ${ringClass}`;
  }

  if (node.type === "subprocess" || node.type === "predefined") {
    return `${base} ${borderStyleClass} rounded-lg ${palette.text} ${ringClass}`;
  }

  if (node.type === "actor") {
    return `${base} ${borderStyleClass} rounded-full aspect-square ${palette.text} ${ringClass}`;
  }

  if (node.type === "folder") {
    return `${base} ${borderStyleClass} rounded-b-lg rounded-tr-lg ${palette.text} ${ringClass}`;
  }

  return `${base} ${palette.text} border-0 bg-transparent text-left items-start ${ringClass}`;
};

/**
 * Inisial dua huruf untuk avatar penulis flowchart.
 *
 * "LP" (LanPro) dipakai bila nama tidak diketahui.
 */
export const getInitials = (name?: string): string => {
  if (!name) return "LP";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};
