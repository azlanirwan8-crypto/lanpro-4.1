/**
 * #753 — seluruh mata panah yang papan ini bisa gambar, dalam satu modul.
 *
 * KENAPA DIPECAH DARI `FlowchartEdges.tsx`. Berkas itu sudah 971 baris, di atas
 * batas 800 yang `agents.md` tetapkan, dan menambah 21 bentuk panah ke dalamnya
 * hanya memperdalam utang itu. Di sini ia justru menyusut.
 *
 * KENAPA 21, BUKAN 6. Diukur 15 Okt dengan memindai seluruh `endArrow=`/
 * `startArrow=` di korpus sidebar draw.io (2.900 gaya yang dihasilkan
 * `Sidebar-*.js` draw.io sendiri): ada **21 nilai berbeda**, dan papan hanya
 * menggambar 5 di antaranya — 23,8%. Yang hilang bukan kosmetik: ENAM nilai ER
 * (`ERone`, `ERmandOne`, `ERmany`, `ERoneToMany`, `ERzeroToOne`, `ERzeroToMany`)
 * adalah SELURUH palet Entity Relationship, dan `diamondThin` adalah agregasi
 * serta komposisi UML. Tanpa keduanya diagram ER dan diagram kelas dari draw.io
 * masuk sebagai panah segitiga biasa — 18 dari 29 entri `Sidebar-ER.js`.
 *
 * NILAI YANG TIDAK DIKENAL tetap jatuh ke `classic`, dan itu ditulis sebagai
 * batas (#665), bukan ditebak. Daftarnya diuji terhadap korpus, jadi menambah
 * panah baru di draw.io akan terlihat sebagai penurunan angka, bukan diam-diam.
 *
 * GEOMETRI. Semua bentuk digambar di kotak `viewBox="0 0 10 8"` dengan UJUNG di
 * `x=9.5, y=4`, menghadap kanan. `orient="auto-start-reverse"` di sisi pemakai
 * yang membalik untuk `markerStart`, jadi satu gambar melayani kedua ujung.
 * Bentuk yang butuh ruang lebih (seluruh keluarga ER) diperbesar lewat
 * `skalaKepala` — `markerWidth`/`markerHeight` dikalikan, `viewBox` dan `refX`
 * tetap, sehingga gambarnya membesar tanpa harus digambar ulang di kotak lain.
 */
import React from "react";

/** Nilai `endArrow`/`startArrow` draw.io, huruf kecil, yang bisa digambar. */
export const BENTUK_KEPALA = [
  "classic",
  "classicthin",
  "block",
  "blockthin",
  "open",
  "openthin",
  "oval",
  "circle",
  "circleplus",
  "cross",
  "dash",
  "halfcircle",
  "diamond",
  "diamondthin",
  "sysmlx",
  "erone",
  "ermandone",
  "ermany",
  "eronetomany",
  "erzerotoone",
  "erzerotomany",
  "none",
] as const;

/**
 * Ejaan KANONIK draw.io. mxGraph mencari penanda lewat `mxMarker.markers[nama]`
 * yang peka huruf besar/kecil, jadi berkas ekspor harus menulis `ERmany`, bukan
 * `ermany` — walau model internal menyimpannya huruf kecil (`gayaImpor.ts:291`
 * menurunkan semuanya). Tanpa peta ini round-trip ER rusak di sisi draw.io.
 */
export const EJAAN_KEPALA_DRAWIO: Readonly<Record<string, string>> = {
  classic: "classic",
  classicthin: "classicThin",
  block: "block",
  blockthin: "blockThin",
  open: "open",
  openthin: "openThin",
  oval: "oval",
  circle: "circle",
  circleplus: "circlePlus",
  cross: "cross",
  dash: "dash",
  halfcircle: "halfCircle",
  diamond: "diamond",
  diamondthin: "diamondThin",
  sysmlx: "sysMLx",
  erone: "ERone",
  ermandone: "ERmandOne",
  ermany: "ERmany",
  eronetomany: "ERoneToMany",
  erzerotoone: "ERzeroToOne",
  erzerotomany: "ERzeroToMany",
  none: "none",
};

/**
 * Bentuk yang digambar KOSONG bila sumber tidak menulis `endFill`/`startFill`.
 * Sisanya terisi. Ini meniru bawaan draw.io: `endArrow=open` tanpa `endFill`
 * adalah panah garis, `endArrow=block` tanpa `endFill` adalah segitiga pejal.
 */
const KEPALA_KOSONG_BAWAAN: ReadonlySet<string> = new Set([
  "open",
  "openthin",
  "oval",
  "diamond",
  "diamondthin",
  "circleplus",
  "halfcircle",
  "cross",
  "dash",
  "sysmlx",
  "erone",
  "ermandone",
  "ermany",
  "eronetomany",
  "erzerotoone",
  "erzerotomany",
]);

export const kepalaKosongBawaan = (bentuk: string): boolean => KEPALA_KOSONG_BAWAAN.has(bentuk);

/** Pengali ukuran penanda. Keluarga ER butuh ruang lebih supaya kakinya terbaca. */
export const skalaKepala = (bentuk: string): number => (bentuk.startsWith("er") ? 1.6 : 1);

const GARIS = (d: string, warna: string, lebar = 1) => (
  <path d={d} fill="none" stroke={warna} strokeWidth={lebar} />
);

/**
 * Gambar satu mata panah di kotak 10×8, ujung di kanan.
 *
 * `isi` hanya berpengaruh pada bentuk yang memang bisa diisi (segitiga,
 * belah ketupat, lingkaran, elips). Keluarga ER, `cross`, `dash`, `halfCircle`,
 * `circlePlus`, dan `sysMLx` adalah seni garis murni — draw.io tidak pernah
 * mengisinya, jadi `isi` diabaikan untuk mereka.
 */
export const gambarKepala = (bentuk: string, isi: boolean, warna: string) => {
  switch (bentuk) {
    case "oval":
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
    case "circle":
      return (
        <circle
          cx="6.8"
          cy="4"
          r="2.6"
          fill={isi ? warna : "none"}
          stroke={warna}
          strokeWidth="1"
        />
      );
    case "circleplus":
      return (
        <>
          <circle cx="6" cy="4" r="3.2" fill="none" stroke={warna} strokeWidth="1" />
          {GARIS("M6,0.8 L6,7.2", warna)}
          {GARIS("M2.8,4 L9.2,4", warna)}
        </>
      );
    case "diamond":
      return (
        <path
          d="M0.8,4 L5,0.8 L9.2,4 L5,7.2 Z"
          fill={isi ? warna : "none"}
          stroke={warna}
          strokeWidth="1"
        />
      );
    case "diamondthin":
      return (
        <path
          d="M0.5,4 L5,1.9 L9.5,4 L5,6.1 Z"
          fill={isi ? warna : "none"}
          stroke={warna}
          strokeWidth="1"
        />
      );
    case "open":
      return GARIS("M0.8,0.8 L9.5,4 L0.8,7.2", warna);
    case "openthin":
      return GARIS("M3.5,1.6 L9.5,4 L3.5,6.4", warna);
    case "classicthin":
    case "blockthin":
      return (
        <path
          d="M3.5,1.6 L9.5,4 L3.5,6.4 Z"
          fill={isi ? warna : "none"}
          stroke={warna}
          strokeWidth="1"
        />
      );
    case "cross":
    case "sysmlx":
      return GARIS("M3.5,0.8 L9.5,7.2 M9.5,0.8 L3.5,7.2", warna, 1.4);
    case "dash":
      return GARIS("M8.5,0.8 L8.5,7.2", warna, 1.4);
    case "halfcircle":
      return GARIS("M5.5,0.8 A3.2,3.2 0 0 1 5.5,7.2", warna, 1.2);

    // ── Entity Relationship. `ERone` satu palang, `ERmandOne` dua palang,
    //    `ERmany` kaki gagak, awalan `zero` menambah lingkaran, `oneToMany`
    //    menggabungkan palang dengan kaki gagak.
    case "erone":
      return GARIS("M7.5,0.6 L7.5,7.4", warna, 1.2);
    case "ermandone":
      return GARIS("M5.5,0.6 L5.5,7.4 M8.5,0.6 L8.5,7.4", warna, 1.2);
    case "ermany":
      return GARIS("M3.5,4 L9.5,0.6 M3.5,4 L9.5,7.2", warna, 1.2);
    case "eronetomany":
      return GARIS("M2.5,0.6 L2.5,7.4 M5.5,4 L9.5,0.6 M5.5,4 L9.5,7.2", warna, 1.2);
    case "erzerotoone":
      return (
        <>
          <circle cx="3.5" cy="4" r="2" fill="none" stroke={warna} strokeWidth="1.2" />
          {GARIS("M8,0.6 L8,7.4", warna, 1.2)}
        </>
      );
    case "erzerotomany":
      return (
        <>
          <circle cx="2.6" cy="4" r="2" fill="none" stroke={warna} strokeWidth="1.2" />
          {GARIS("M5.5,4 L9.5,0.6 M5.5,4 L9.5,7.2", warna, 1.2)}
        </>
      );

    // `classic`, `block`, dan apa pun yang lolos: segitiga pejal/berbingkai.
    default:
      return (
        <path
          d="M0.8,0.8 L9.5,4 L0.8,7.2 Z"
          fill={isi ? warna : "none"}
          stroke={warna}
          strokeWidth="1"
        />
      );
  }
};
