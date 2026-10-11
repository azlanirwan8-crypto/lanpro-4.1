/** @jest-environment jsdom */
/**
 * #685 — impor yang bisa dibuktikan.
 *
 * Dua hal yang diuji di sini adalah PRASYARAT penerimaan #685, bukan fitur:
 *
 * 1. Determinisme. Selama bentuk tanpa koordinat ditempatkan dengan
 *    `Math.random()`, klaim "unggah → simpan → muat → hasil sama" tidak punya
 *    arti: berkas yang sama memberi papan yang berbeda tiap kali. Test ini
 *    MERAH terhadap kode sebelum tambalan dan hijau sesudahnya.
 *
 * 2. Berkas `.drawio` terkompresi. draw.io lama menyimpan `<diagram>` sebagai
 *    base64+deflate-raw. Root belum punya penjeraf inflate, jadi berkas nyata
 *    ditolak dengan pesan "bukan diagram" (batas #612 yang tercatat di
 *    `importers.ts:83-86`). Jalur barunya eksplisit: `bacaSumberDrawio` membuka
 *    kompresi pada SALINAN, `parseDrawIoXML` menjeraf salinan itu, dan sumber
 *    aslinya tetap utuh.
 */
import { deflateRawSync, inflateRawSync } from "node:zlib";
import { parseDrawIoXML, parseUniversalDiagram } from "./importers";
import { bacaSumberDrawio, type PenguraiDeflate } from "./sumberDrawio";

const pengurai: PenguraiDeflate = async (bytes) =>
  decodeURIComponent(inflateRawSync(Buffer.from(bytes)).toString("utf8"));

const kompres = (xml: string): string =>
  Buffer.from(deflateRawSync(Buffer.from(encodeURIComponent(xml), "utf8"))).toString("base64");

const tanpaPosisi =
  '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>' +
  '<mxCell id="2" value="A" vertex="1" parent="1"/>' +
  '<mxCell id="3" value="B" vertex="1" parent="1"/>' +
  '<mxCell id="4" value="C" vertex="1" parent="1"/></root></mxGraphModel>';

const posisiSah =
  '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>' +
  '<mxCell id="2" value="A" vertex="1" parent="1">' +
  '<mxGeometry x="420" y="310" width="100" height="50" as="geometry"/></mxCell></root></mxGraphModel>';

describe("#685 impor deterministik", () => {
  it("dua parse berkas sama menghasilkan posisi identik", () => {
    const pertama = parseDrawIoXML(tanpaPosisi).nodes.map((n) => [n.id, n.x, n.y]);
    const kedua = parseDrawIoXML(tanpaPosisi).nodes.map((n) => [n.id, n.x, n.y]);
    expect(pertama).toEqual(kedua);
  });

  it("bentuk tanpa koordinat tidak ditumpuk di satu titik", () => {
    const nodes = parseDrawIoXML(tanpaPosisi).nodes;
    const titik = nodes.map((n) => `${Math.round(n.x)},${Math.round(n.y)}`);
    expect(new Set(titik).size).toBe(titik.length);
  });

  /**
   * Yang dijamin jalur native adalah POSISI RELATIF, bukan angka absolut:
   * `autoCenterAndNormalizeDiagram` (importers.ts:176) menggeser papan ke asal
   * kanoniknya, dan itulah sebabnya test round-trip #659 mengecualikan koordinat
   * absolut. Assertion di sini membandingkan dua parse berkas yang sama — kalau
   * posisi masih acak, perbandingan ini tidak akan pernah sama.
   */
  it("koordinat asli menghasilkan papan yang sama tiap parse", () => {
    const satu = parseDrawIoXML(posisiSah).nodes[0];
    const dua = parseDrawIoXML(posisiSah).nodes[0];
    expect([satu.x, satu.y, satu.width, satu.height]).toEqual([
      dua.x,
      dua.y,
      dua.width,
      dua.height,
    ]);
    expect(Number.isFinite(satu.x)).toBe(true);
  });

  /**
   * `parseFloat("abc")` = NaN, dan NaN yang masuk ke posisi membuat bentuk tidak
   * ter-render sekaligus ikut tersimpan ke payload. Nomor geometry rusak adalah
   * hal yang benar-benar ada di berkas unduhan orang.
   */
  it("nomer geometry rusak jatuh ke posisi kisi, bukan NaN", () => {
    const rusak =
      '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>' +
      '<mxCell id="2" value="A" vertex="1" parent="1">' +
      '<mxGeometry x="abc" y="" width="xx" height="20" as="geometry"/></mxCell></root></mxGraphModel>';
    const [node] = parseDrawIoXML(rusak).nodes;
    expect(Number.isFinite(node.x)).toBe(true);
    expect(Number.isFinite(node.y)).toBe(true);
    expect(Number.isFinite(node.width)).toBe(true);
    expect(node.height).toBe(20);
  });
});

describe("#685 berkas .drawio terkompresi bisa dibuka dari root", () => {
  it("sumber tetap terkompresi, penjeraf menerima hasil bukaannya", async () => {
    const berkas = `<mxfile host="app.diagrams.net" version="21.0.0"><diagram id="p" name="Alur">${kompres(
      posisiSah
    )}</diagram></mxfile>`;

    // Sebelum #685 jalur ini berakhir sebagai "Tidak ditemukan <mxCell>" dan
    // pengguna melihat pesan bahwa berkasnya "bukan diagram".
    expect(() => parseDrawIoXML(berkas)).toThrow(/mxCell/);

    const sumber = await bacaSumberDrawio(berkas, "lama.drawio", pengurai);
    const hasil = parseDrawIoXML(sumber.teksSiapJeraf);
    expect(hasil.nodes).toHaveLength(1);
    expect(hasil.nodes[0].label).toBe("A");
    // Bukti terkuat yang bisa diberikan tanpa fixture pemilik: menjeraf hasil
    // bukaan HARUS sama dengan menjeraf berkas polos yang isinya sama.
    const setara = parseDrawIoXML(posisiSah);
    expect(JSON.stringify(hasil)).toEqual(JSON.stringify(setara));
    // Sumber kanonik tidak ikut berubah menjadi hasil bukaan.
    expect(sumber.xmlSumber).toBe(berkas.trim());
    expect(sumber.xmlSumber).toContain(kompres(posisiSah));
  });

  it("deteksi format lain tidak dialihkan paksa ke jalur draw.io", async () => {
    const miro = JSON.stringify({ items: [{ id: "a", title: "X" }] });
    const sumber = await bacaSumberDrawio(miro, "papan.json", pengurai).catch((e) => e);
    expect(sumber).toHaveProperty("sebab", "bukan-drawio");
    // Jalur sinkron lama tetap melayani Miro/Mermaid/LanPro JSON seperti sebelumnya.
    expect(() => parseUniversalDiagram(miro, "papan.json")).not.toThrow();
  });
});
