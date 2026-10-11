/**
 * #685 — bagian MURNI dari penjaga sumber: pengukuran byte, pengenalan berkas,
 * dekompresi, dan hash. Sengaja di lingkungan `node` (bukan jsdom) karena tidak
 * satu pun dari itu butuh DOM, dan `crypto.subtle` hanya dijamin ada di Node.
 */
import { deflateRawSync, inflateRawSync } from "node:zlib";
import {
  BATAS_BYTE_SUMBER,
  TolakSumber,
  adalahDrawio,
  dekompresDrawio,
  hashSumber,
  panjangByte,
  type PenguraiDeflate,
} from "./sumberDrawio";

/** draw.io meng-URI-encode teks UTF-8 SEBELUM deflate — fixture harus meniru itu. */
const kompres = (xml: string): string =>
  Buffer.from(deflateRawSync(Buffer.from(encodeURIComponent(xml), "utf8"))).toString("base64");

const penguraiUji: PenguraiDeflate = async (bytes) =>
  decodeURIComponent(inflateRawSync(Buffer.from(bytes)).toString("utf8"));

describe("#685 ukuran dan pengenalan berkas", () => {
  it("menghitung BYTE, bukan karakter", () => {
    // Tiga karakter non-ASCII yang masing-masing 3 byte: kalau yang diukur
    // `.length`, berkas 1,5 MB berhuruf Indonesia/Arab akan lolos penjagaan.
    expect(panjangByte("áéó")).toBe(6);
    expect(panjangByte("<mxfile>abc</mxfile>")).toBe(20);
  });

  it("mengenali mxfile dan mxGraphModel, menolak selain itu", () => {
    expect(adalahDrawio('<mxfile host="app.diagrams.net"><diagram/></mxfile>')).toBe(true);
    expect(adalahDrawio("  \n<mxGraphModel><root/></mxGraphModel>")).toBe(true);
    expect(adalahDrawio('{"nodes":[],"edges":[]}')).toBe(false);
    expect(adalahDrawio("flowchart TD; A-->B")).toBe(false);
    expect(adalahDrawio("")).toBe(false);
  });

  it("batas sumber lebih kecil dari batas payload server", () => {
    // Server menolak SELURUH canvasData di 8 MB (document.schema.ts:19). Sumber
    // harus selalu punya ruang bersama nodes/edges di dalam anggaran yang sama.
    expect(BATAS_BYTE_SUMBER).toBeLessThan(8 * 1024 * 1024);
  });
});

describe("#685 berkas terkompresi (#612, jalur nyata dari draw.io)", () => {
  const XML =
    '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>' +
    '<mxCell id="2" value="Ringkasan & Data Merchant" vertex="1" parent="1">' +
    '<mxGeometry x="40" y="20" width="100" height="50" as="geometry"/></mxCell></root></mxGraphModel>';

  it("membuka isi deflate-raw + base64 menjadi XML yang sama", async () => {
    const hasil = await dekompresDrawio(kompres(XML), penguraiUji);
    expect(hasil).toBe(XML);
  });

  it("menolak base64 yang bukan XML, bukan menghasilkan sampah", async () => {
    const bukan = Buffer.from("halo dunia").toString("base64");
    await expect(dekompresDrawio(bukan, async () => "halo dunia")).rejects.toThrow(TolakSumber);
  });

  it("menolak karakter di luar alfabet base64 sebelum menyentuh stream", async () => {
    await expect(dekompresDrawio("%%%rusak%%%", penguraiUji)).rejects.toThrow(/bukan base64/);
  });

  it("menjelaskan peramban tanpa dukungan, tidak diam-diam mengembalikan teks mentah", async () => {
    // Tanpa pengurai yang disuntik DAN tanpa DecompressionStream, hasilnya dulu
    // "kembali apa adanya" dan pengguna melihat satu kotak berisi base64.
    const sebelumnya = (globalThis as any).DecompressionStream;
    delete (globalThis as any).DecompressionStream;
    try {
      await expect(dekompresDrawio(kompres(XML))).rejects.toThrow(/DecompressionStream/);
    } finally {
      (globalThis as any).DecompressionStream = sebelumnya;
    }
  });
});

describe("#685 hash sumber", () => {
  it("hash stabil untuk byte yang sama dan beda untuk byte yang berbeda", async () => {
    const a = await hashSumber('<mxfile><diagram id="p">x</diagram></mxfile>');
    const b = await hashSumber('<mxfile><diagram id="p">x</diagram></mxfile>');
    const c = await hashSumber('<mxfile><diagram id="q">x</diagram></mxfile>');
    expect(a).not.toBeNull();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  // SHA-256 vektor uji publik: kalau implementasi hash salah, angka ini tidak cocok.
  it("menghasilkan SHA-256 yang benar untuk vektor Known", async () => {
    expect(await hashSumber("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
  });
});
