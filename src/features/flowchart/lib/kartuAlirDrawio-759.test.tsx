/**
 * #759 — kartu skor "flow" draw.io.
 *
 * Aturan yang membuat berkas ini berarti: tiap baris `ada: true` di
 * `alirDrawio.ts` menyebut satu `penanda` — potongan kode yang harus sungguh-
 * sungguh tertulis di berkas yang ditunjuk. Test ini MEMBACA BERKAS SOURCE dari
 * disk dan menggagalkan papan bila penandanya tidak ada. Jadi klaim "interaksi
 * ini sudah jalan" tidak bisa ditulis lalu dibiarkan membusuk: ia albo terbukti
 * di kode, albo merah.
 *
 * Presedennya sudah ada di repo ini dan bukan kebetulan: `tabelKesetiaan-660
 * .test.tsx` membaca `AUDIT.md`, dan `petaBentukDrawio-752.test.tsx` memeriksa
 * setiap nama bentuk terhadap korpus nyata. Keduanya lahir dari pelajaran yang
 * sama — #752, ketika 206 nama karangan membuat sebuah angka cakupan mengukur
 * karangannya sendiri dan tetap hijau.
 *
 * Batas yang dinyatakan: test ini membuktikan penadanya ADA, bukan bahwa
 * interaksinya benar-benar BEKERJA. Bukti perilaku ada di test gesturnya sendiri — #754 untuk
 * enam gesture dasar, #759 untuk delapan gagang ukuran, seret palet, dan pemilih
 * mata panah. Yang dijaga di sini adalah DAFTARNYA tetap jujur.
 */
import fs from "node:fs";
import path from "node:path";
import { ALIR_DRAWIO, skorAlir, type BarisAlir } from "./alirDrawio";

const AKAR = path.resolve(__dirname, "../../../..");

const baca = (berkas: string): string => {
  const penuh = path.join(AKAR, berkas);
  if (!fs.existsSync(penuh)) throw new Error(`berkas tidak ada: ${berkas}`);
  return fs.readFileSync(penuh, "utf8");
};

describe("#759 setiap klaim 'ada' terbukti di kode sungguhan", () => {
  const terpenuhi = ALIR_DRAWIO.filter((b) => b.ada);

  it("tidak ada baris yang mengaku ada tanpa menyebut bukti", () => {
    const tanpa = ALIR_DRAWIO.filter((b) => b.ada && !b.bukti).map((b) => b.id);
    expect(tanpa).toEqual([]);
  });

  it("setiap berkas yang dirujuk benar-benar ada", () => {
    const hilang = [...new Set(terpenuhi.map((b) => b.bukti!.berkas))].filter(
      (berkas) => !fs.existsSync(path.join(AKAR, berkas))
    );
    expect(hilang).toEqual([]);
  });

  it("setiap penanda benar-benar tertulis di berkas yang ditunjuk", () => {
    const palsu = terpenuhi
      .filter((b) => !buktiBerlaku(b))
      .map((b) => `${b.id} -> ${b.bukti!.berkas}: "${b.bukti!.penanda}"`);
    expect(palsu).toEqual([]);
  });
});

function buktiBerlaku(b: BarisAlir): boolean {
  const isi = baca(b.bukti!.berkas);
  return isi.includes(b.bukti!.penanda);
}

describe("#759 setiap kerugian dinyatakan, tidak disembunyikan", () => {
  it("tiap baris 'belum' punya sebab, dan sebabnya cukup panjang untuk dibaca", () => {
    const tanpa = ALIR_DRAWIO.filter((b) => !b.ada && (b.sebab ?? "").trim().length < 20).map(
      (b) => b.id
    );
    expect(tanpa).toEqual([]);
  });

  it("tiap baris 'belum' menunjuk nomor papan atau menjelaskan sendiri", () => {
    // Kerugian tanpa tindak lanjut adalah cara sebuah daftar berhenti diperbaiki.
    const yatim = ALIR_DRAWIO.filter((b) => !b.ada && !b.tiket && (b.sebab ?? "").length < 60).map(
      (b) => b.id
    );
    expect(yatim).toEqual([]);
  });

  it("tidak ada id ganda", () => {
    const id = ALIR_DRAWIO.map((b) => b.id);
    expect(new Set(id).size).toBe(id.length);
  });
});

describe("#759 angka flow vs draw.io", () => {
  it("daftarnya memuat seluruh aspek membuat diagram", () => {
    // Sengaja dikunci sebagai angka bulat: memperpendek daftar adalah cara
    // paling murah menaikkan persentase, dan itu bukan perbaikan.
    expect(ALIR_DRAWIO.length).toBe(50);
  });

  it("skor terukur dilaporkan apa adanya", () => {
    const terpenuhi = ALIR_DRAWIO.filter((b) => b.ada).length;
    const skor = skorAlir();
    console.log(
      `#759 FLOW draw.io: ${terpenuhi}/${ALIR_DRAWIO.length} = ${skor.toFixed(1)}%  |  belum: ` +
        ALIR_DRAWIO.filter((b) => !b.ada)
          .map((b) => `${b.id}${b.tiket ? ` (${b.tiket})` : ""}`)
          .join(" ")
    );
    // Batasnya angka Bapak, bukan angka saya: "flow nya harus sama dengan di
    // drawio 90%". Dikunci sebagai syarat lulus, jadi kemunduran interaksi apa
    // pun — hilang satu gagang, hilang satu pintasan — membuat papan merah
    // alih-alih diam-diam turun ke 88%.
    expect(terpenuhi).toBe(46);
    expect(skor).toBeGreaterThanOrEqual(90);
  });

  it("delapan interaksi inti membuat diagram wajib ada", () => {
    // Inti yang tidak bisa ditawar kalau papan ini mau disebut "flow seperti
    // draw.io": mereka diuji terpisah, dan klaimnya di sini.
    const inti = [
      "pilih-klik",
      "marquee",
      "pan-papan",
      "seret-bentuk",
      "resize-delapan",
      "sunting-dobel",
      "sambung-port",
      "garis-mata-panah",
    ];
    for (const id of inti) {
      const baris = ALIR_DRAWIO.find((b) => b.id === id);
      expect(baris).toBeDefined();
      expect(baris!.ada).toBe(true);
    }
  });
});
