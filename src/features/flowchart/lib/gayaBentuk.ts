import { warnaTeksAman } from "./gayaImpor";
import type { FlowNode } from "../types";

/**
 * Geometri satu bentuk saat disentuh — item #629.
 *
 * MENGAPA DI SINI, BUKAN DI DALAM PERENDER. `FlowchartNode.tsx` dulu menulis
 * `scale: 1.07` plus bayangan `0 25px 40px` SAAT DISERET, dan dua cincin
 * seleksi sekaligus (box-shadow 3 px + ring `border-2`) ketika terpilih. Bentuk
 * yang membesar saat disentuh adalah sebab papan terasa "gemuk": isinya
 * berpindah-pindah ukuran di mata pengguna, dan garis tetangganya tidak ikut.
 * draw.io dan Miro tidak mengubah ukuran bentuk saat diseret maupun saat
 * dipilih — yang berubah hanya penanda di sekelilingnya.
 *
 * Ditulis sebagai fungsi murni karena papan ini memakai `transform: scale()`
 * pada DIV pembungkus (`FlowchartContainer.tsx:4018`), jadi angka yang benar
 * tidak bisa dibuktikan dari render jsdom; yang bisa dibuktikan adalah nilainya.
 */
export interface KeadaanBentuk {
  isDragging: boolean;
  isSelected: boolean;
  isHovered: boolean;
  isSourceOfConnect: boolean;
  /** Ada bentuk yang sedang menjadi sumber sambungan (mode menarik garis). */
  adaSumberSambung: boolean;
  /** Bentuk SVG menggambar tepinya sendiri, jadi tidak boleh dibayangi. */
  isSvgShape: boolean;
}

/** Ukuran bentuk TIDAK PERNAH berubah karena interaksi. */
export const SKALA_BENTUK = 1;

/** Sudut bentuk TIDAK PERNAH berubah karena interaksi (getaran bukan informasi). */
export const PUTAR_BENTUK = 0;

const BAYANG_SERET = "0 2px 8px -2px rgba(0, 0, 0, 0.18)";
const BAYANG_SANTAI = "0 1px 3px 0 rgba(0, 0, 0, 0.10)";

export function gayaBentuk(keadaan: KeadaanBentuk): {
  scale: number;
  rotate: number;
  boxShadow: string;
} {
  const { isDragging, isHovered, isSvgShape } = keadaan;
  return {
    scale: SKALA_BENTUK,
    rotate: PUTAR_BENTUK,
    // #627 — bentuk diam tidak membawa bayangan; #629 — yang dipilih pun tidak
    // lagi mendapat glow, cukup cincin border-nya.
    boxShadow: isSvgShape ? "none" : isDragging ? BAYANG_SERET : isHovered ? BAYANG_SANTAI : "none",
  };
}

/**
 * Cincin yang boleh digambar untuk satu keadaan. Seleksi dan sumber sambungan
 * dulu DUA lapis (box-shadow + border); kini satu, dan tidak lagi berdenyut
 * selamanya — denyut tak berhenti membuat papan terasa ramai dan membuat tab
 * tetap sibuk padahal pengguna diam.
 */
export function cincinBentuk(keadaan: KeadaanBentuk): {
  seleksi: boolean;
  sumberSambung: boolean;
} {
  return {
    seleksi: !keadaan.isSvgShape && keadaan.isSelected,
    sumberSambung: !keadaan.isSvgShape && keadaan.isSourceOfConnect,
  };
}

/**
 * #657 - warna yang ditulis berkas sumber, bila ada.
 *
 * Fungsinya SENGAJA hanya mengembalikan hex sumber atau `undefined`. Palet dua
 * belas nama tetap menjadi pemegang terakhir, karena `color` dipakai pemilih
 * warna, kepala garis, dan gradioen `url(#grad-..)` papan - menyatunya kedua
 * jalur itu lewat satu fungsi yang selalu berisi akan mengubah papan yang tidak
 * pernah diimpor.
 *
 * Nilainya datang dari berkas unggahan orang, jadi `warnaTeksAman()` adalah
 * satu-satunya pintunya: hex tiga atau enam digit, bukan yang lain.
 */
export const warnaSumberBentuk = (
  node: Pick<FlowNode, "fillHex" | "strokeHex">
): { isi?: string; tepi?: string } => ({
  isi: warnaTeksAman(node.fillHex) ?? undefined,
  tepi: warnaTeksAman(node.strokeHex) ?? undefined,
});
