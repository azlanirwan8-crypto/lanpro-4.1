/**
 * @jest-environment jsdom
 *
 * #753 — peta BALIK: tipe native papan → ejaan `style=` draw.io.
 *
 * KENAPA TEST INI ADA TERPISAH DARI `eksporDrawio-659.test.tsx`. #659 menguji
 * mekanika berkas (warna, huruf, tepi, geometri, titik sambung) bolak-balik.
 * Yang diuji DI SINI adalah klaim yang lebih tajam dan lebih mudah dipalsukan:
 * **setiap ejaan bentuk yang kita tulis benar-benar ejaan draw.io**, dan
 * **setiap tipe native sudah diputuskan nasibnya** — dipetakan, atau dinyatakan
 * tidak punya padanan beserta alasannya.
 *
 * KENAPA INI PENTING SECARA KHUSUS. mxGraph menggambar sel dengan `shape=X`
 * yang tidak dikenal sebagai sel TANPA BENTUK SAMA SEKALI — bukan persegi
 * panjang. Jadi satu nama karangan di peta ini lebih merusak daripada tidak
 * menulis apa pun, dan round-trip kita sendiri akan tetap HIJAU karena penjeraf
 * kita membaca karangan yang sama. Test nomor 2 di bawah memutus lingkaran itu
 * dengan membaca `kamusBentukDrawio.ts` (diekstrak dari `app.min.js` draw.io),
 * bukan membaca peta yang sedang diuji.
 *
 * CATATAN KEJUJURAN. Yang TIDAK bisa diuji dari mesin ini adalah apakah
 * draw.io benar-benar MENGGAMBAR ejaan itu dengan benar — `AUDIT.md` §15.3
 * mencatat tidak ada cara membandingkan layar ke layar dari sini. Yang bisa
 * dihitung: namanya nyata, dan membaca namanya kembali menghasilkan tipe yang
 * kita akui. Keduanya dijaga di sini.
 */
import React from "react";
import { DIAGRAM_SHAPE_GROUPS } from "../constants";
import { BENTUK_BARE_DRAWIO, BENTUK_PUSTAKA_DRAWIO } from "./kamusBentukDrawio";
import { EJAAN_KEPALA_DRAWIO, BENTUK_KEPALA, gambarKepala } from "../components/kepalaPanah";
import { PETA_BALIK, TANPA_PADANAN_DRAWIO, ejaanUntuk } from "./petaEksporDrawio";
import { bentukDariGayaDrawio } from "./petaBentukDrawio";
import { eksporDrawIo } from "./eksporDrawio";
import { parseDrawIoXML } from "./importers";
import type { FlowNodeType } from "../types";

/** Seluruh tipe sah papan: 206 dari palet + `decision` + `text`. */
const TIPE_NATIVE = new Set<FlowNodeType>([
  ...DIAGRAM_SHAPE_GROUPS.flatMap((g) => g.items.map((i) => i.type as FlowNodeType)),
  "decision" as FlowNodeType,
  "text" as FlowNodeType,
]);

/** Nama bentuk draw.io yang nyata, dinormalkan kecil. */
const BARE_SAH = new Set(BENTUK_BARE_DRAWIO.map((n) => n.toLowerCase()));
const PUSTAKA_SAH = new Set(
  Object.entries(BENTUK_PUSTAKA_DRAWIO).flatMap(([lib, nama]) =>
    nama.map((n) => `${lib}.${n}`.toLowerCase())
  )
);

describe("#753 setiap tipe native sudah diputuskan nasibnya", () => {
  it("177 punya ejaan + 31 dinyatakan tanpa padanan = seluruh palet, tidak lebih", () => {
    const dipetakan = Object.keys(PETA_BALIK);
    const dinyatakan = Object.keys(TANPA_PADANAN_DRAWIO);

    // Tidak boleh ada tipe yang lolos dari kedua daftar: kalau ada, ia keluar
    // sebagai persegi panjang tanpa pernah dihitung sebagai kerugian.
    const terlewat = [...TIPE_NATIVE].filter(
      (t) => !dipetakan.includes(t) && !dinyatakan.includes(t)
    );
    expect(terlewat).toEqual([]);

    // Dan tidak boleh ada nama yang bukan tipe native — entri hantu membuat
    // angka cakupan terlihat lebih besar daripada kenyataannya.
    const hantu = [...dipetakan, ...dinyatakan].filter((t) => !TIPE_NATIVE.has(t as FlowNodeType));
    expect(hantu).toEqual([]);

    // Satu tipe tidak boleh muncul di kedua daftar sekaligus.
    expect(dipetakan.filter((t) => dinyatakan.includes(t))).toEqual([]);

    expect(dipetakan.length + dinyatakan.length).toBe(TIPE_NATIVE.size);
  });

  it("setiap entri 'tanpa padanan' membawa alasan, bukan sekadar nama", () => {
    const kosong = Object.entries(TANPA_PADANAN_DRAWIO).filter(
      ([, alas]) => alas.trim().length < 8
    );
    expect(kosong.map(([nama]) => nama)).toEqual([]);
  });

  it("`ejaanUntuk` mengembalikan null persis untuk yang dinyatakan tanpa padanan", () => {
    for (const tipe of TIPE_NATIVE) {
      const ejaan = ejaanUntuk(tipe);
      if (tipe in TANPA_PADANAN_DRAWIO) expect(ejaan).toBeNull();
      else expect(ejaan).not.toBeNull();
    }
  });
});

describe("#753 tidak ada satu pun ejaan draw.io yang dikarang", () => {
  it("setiap `shape=` yang ditulis adalah nama draw.io yang nyata", () => {
    const karangan: string[] = [];
    for (const [tipe, ejaan] of Object.entries(PETA_BALIK)) {
      for (const bagian of ejaan.gaya.split(";")) {
        const token = bagian.trim().toLowerCase();
        if (!token.startsWith("shape=")) continue;
        const nama = token.slice("shape=".length);
        if (!BARE_SAH.has(nama) && !PUSTAKA_SAH.has(nama)) karangan.push(`${tipe}: ${nama}`);
      }
    }
    expect(karangan).toEqual([]);
  });

  it("tiga namespace karangan v1 tidak dipakai lagi", () => {
    // `mxgraph.uml`, `mxgraph.er`, dan `mxgraph.aws` TIDAK PERNAH ada di
    // draw.io. v1 peta balik memakainya untuk ~40 baris; draw.io akan
    // menampilkan sel kosong untuk semuanya.
    const gaya = Object.values(PETA_BALIK)
      .map((e) => e.gaya)
      .join("\n");
    for (const palsu of ["mxgraph.uml.", "mxgraph.er.", "mxgraph.aws.", "mxgraph.gcp."]) {
      expect(gaya).not.toContain(palsu);
    }
  });
});

describe("#753 round-trip: apa yang ditulis bisa dibaca balik", () => {
  it("membaca ejaan sendiri mengembalikan tipe aslinya, atau kerugian yang diakui", () => {
    const rusak: string[] = [];
    for (const [tipe, ejaan] of Object.entries(PETA_BALIK)) {
      const dibaca = bentukDariGayaDrawio(ejaan.gaya);
      const diharap = ejaan.kembali ?? (tipe as FlowNodeType);
      if (dibaca !== diharap) rusak.push(`${tipe}: ditulis "${ejaan.gaya}", dibaca ${dibaca}`);
    }
    expect(rusak).toEqual([]);
  });

  it("setiap `kembali` memang kerugian — bukan entri yang sama dengan kuncinya", () => {
    // `kembali` ada supaya kerugian NYATA tertulis di satu tempat. Entri yang
    // `kembali`-nya sama dengan kuncinya bukan kerugian, hanya kebisingan yang
    // membuat daftar ini terlihat lebih jujur daripada kenyataannya.
    const bising = Object.entries(PETA_BALIK)
      .filter(([tipe, e]) => e.kembali !== undefined && e.kembali === tipe)
      .map(([tipe]) => tipe);
    expect(bising).toEqual([]);
  });
});

describe("#753 mata panah: 21 nilai draw.io semuanya tergambar", () => {
  // Diukur 15 Okt dari corpus `endArrow`/`startArrow` berkas draw.io nyata.
  // Sebelum #753 papan hanya menggambar 5 di antaranya (23,8%) — seluruh palet
  // ER (6 nilai) dan seluruh penanda UML keluar sebagai garis polos.
  const KEPALA_KORPUS = [
    "none",
    "open",
    "openThin",
    "block",
    "blockThin",
    "classic",
    "classicThin",
    "oval",
    "circle",
    "circlePlus",
    "cross",
    "dash",
    "halfCircle",
    "diamondThin",
    "sysMLx",
    "ERone",
    "ERmandOne",
    "ERmany",
    "ERoneToMany",
    "ERzeroToOne",
    "ERzeroToMany",
  ];

  it("setiap nilai corpus bisa digambar papan", () => {
    const belum = KEPALA_KORPUS.filter(
      (k) => !(BENTUK_KEPALA as readonly string[]).includes(k.toLowerCase())
    );
    expect(belum).toEqual([]);
  });

  it("setiap nilai punya ejaan kanonik yang kembali ke dirinya sendiri", () => {
    // mxGraph mencari penanda lewat `mxMarker.markers[nama]` yang PEKA huruf
    // besar/kecil. Model internal menyimpan huruf kecil, jadi tanpa peta ini
    // berkas ekspor menulis `ermany` dan draw.io tidak mengenalinya.
    for (const k of KEPALA_KORPUS) {
      const ejaan = EJAAN_KEPALA_DRAWIO[k.toLowerCase()];
      expect(ejaan).toBe(k);
    }
  });

  it("semuanya menghasilkan gambar, bukan null diam-diam", () => {
    const kosong = BENTUK_KEPALA.filter(
      (b) => !gambarKepala(b, true, "#000") && !gambarKepala(b, false, "#000")
    );
    expect(kosong).toEqual([]);
  });
});

describe("#753 ujung ke ujung: papan -> berkas -> papan", () => {
  const node = (tipe: FlowNodeType, id: string, x: number) =>
    ({
      id,
      type: tipe,
      x,
      y: 40,
      width: 140,
      height: 70,
      label: tipe,
      color: "indigo",
    }) as never;

  it("tipe bentuk selamat melewati ekspor dan impor kembali", () => {
    const tipe: FlowNodeType[] = [
      "oval",
      "circle",
      "diamond",
      "hexagon",
      "trapezoid",
      "triangle",
      "cloud",
      "subprocess",
      "document",
      "cylinder",
      "database",
      "parallelogram",
      "sticky",
      "callout",
      "actor",
      "laneVertical",
      "laneHorizontal",
      "bpmnUserTask",
      "bpmnXorGateway",
      "gateAnd",
      "elResistor",
      "server",
      "netRouter",
      "arrowRight",
      "uiButton",
      "star",
      "cross",
      "lens",
    ];
    const xml = eksporDrawIo(
      tipe.map((t, i) => node(t, `n${i}`, i * 200)),
      []
    );
    const { nodes } = parseDrawIoXML(xml);

    const berubah = nodes
      .map((n, i) => ({ dari: tipe[i], jadi: n.type }))
      .filter(({ dari, jadi }) => dari !== jadi);

    // `kembali` yang dinyatakan di peta balik adalah SATU-SATUNYA sumber
    // perbedaan yang diizinkan di sini. Kalau daftar ini bertambah, ada ejaan
    // baru yang kehilangan bentuknya saat dibaca balik dan kerugiannya belum
    // diakui.
    const diakui = new Map(
      Object.entries(PETA_BALIK).map(([t, e]) => [t, e.kembali ?? (t as FlowNodeType)])
    );
    const takDiakui = berubah.filter(({ dari, jadi }) => diakui.get(dari) !== jadi);
    expect(takDiakui).toEqual([]);
  });
});
