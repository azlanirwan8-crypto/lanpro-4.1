/** @jest-environment jsdom */
/**
 * #685 — keputusan impor, termasuk bagian yang paling mudah salah: kapan
 * sumber HARUS tetap disimpan walau konversinya gagal.
 */
import { deflateRawSync, inflateRawSync } from "node:zlib";
import { BATAS_BYTE_SUMBER, type PenguraiDeflate } from "./sumberDrawio";
import { putuskanImporDiagram } from "./putuskanImpor";

const pengurai: PenguraiDeflate = async (bytes) =>
  decodeURIComponent(inflateRawSync(Buffer.from(bytes)).toString("utf8"));

const kompres = (xml: string): string =>
  Buffer.from(deflateRawSync(Buffer.from(encodeURIComponent(xml), "utf8"))).toString("base64");

const model = (isiSel: string) =>
  `<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>${isiSel}</root></mxGraphModel>`;

const bentukDikenal =
  '<mxCell id="2" value="Mulai" vertex="1" parent="1"><mxGeometry x="10" y="10" width="80" height="40" as="geometry"/></mxCell>';
const bentukAsing =
  '<mxCell id="3" value="Antrian" vertex="1" parent="1" style="shape=mxgraph.aws4.queue;fillColor=#ED7014;sketch=1">' +
  '<mxGeometry x="20" y="20" width="80" height="40" as="geometry"/></mxCell>';

describe("#685 keputusan impor berkas diagram", () => {
  it("draw.io polos: sumber utuh, konversi punya bentuk dan garis", async () => {
    const berkas = `<mxfile host="app.diagrams.net">${model(bentukDikenal)}</mxfile>`;
    const keputusan = await putuskanImporDiagram(berkas, "alur.drawio", pengurai);

    expect(keputusan.sebab).toBeUndefined();
    expect(keputusan.sumber?.xmlSumber).toBe(berkas);
    expect(keputusan.hasil.nodes).toHaveLength(1);
    expect(keputusan.batas).not.toBeNull();
  });

  it("draw.io terkompresi tetap bisa diputuskan, sumbernya tetap byte terkompresi", async () => {
    const terkompresi = `<mxfile version="21.0.0"><diagram id="p">${kompres(model(bentukDikenal))}</diagram></mxfile>`;
    const keputusan = await putuskanImporDiagram(terkompresi, "lama.drawio", pengurai);

    expect(keputusan.hasil.nodes).toHaveLength(1);
    expect(keputusan.sumber?.xmlSumber).toBe(terkompresi);
    expect(keputusan.sumber?.halaman[0].terkompresi).toBe(true);
  });

  /**
   * Ini isi "fitur yang tidak didukung" yang demanded pemilik: bentuk khusus
   * dan kunci gaya yang hilang TIDAK BOLEH baru diketahui pengguna setelah
   * papannya jadi kotak biasa.
   */
  it("melaporkan bentuk asing dan kunci gaya yang tidak dipertahankan SEBELUM konversi", async () => {
    const berkas = `<mxfile>${model(bentukDikenal + bentukAsing)}</mxfile>`;
    const keputusan = await putuskanImporDiagram(berkas, "aws.drawio", pengurai);

    expect(keputusan.hasil.nodes).toHaveLength(2);
    expect(keputusan.batas?.bentukTakDikenal).toEqual(["mxgraph.aws4.queue"]);
    expect(keputusan.batas?.kunciHilang).toEqual(expect.arrayContaining(["sketch"]));
  });

  it("multi-page dinyatakan jumlah halamannya, bukan digabung diam-diam", async () => {
    const berkas =
      `<mxfile>${'<diagram id="a" name="Satu">' + model(bentukDikenal) + "</diagram>"}` +
      `${'<diagram id="b" name="Dua">' + model(bentukDikenal) + "</diagram>"}</mxfile>`;
    const keputusan = await putuskanImporDiagram(berkas, "dua.drawio", pengurai);

    expect(keputusan.sumber?.halaman.map((h) => h.nama)).toEqual(["Satu", "Dua"]);
    expect(keputusan.batas?.halaman).toHaveLength(2);
  });

  it("Miro/Mermaid/JSON tetap lewat jalur lama dan TIDAK punya sumber kanonik", async () => {
    const keputusan = await putuskanImporDiagram(
      JSON.stringify({ nodes: [{ id: "a", label: "X", x: 0, y: 0 }], edges: [] }),
      "papan.json",
      pengurai
    );
    expect(keputusan.sumber).toBeNull();
    expect(keputusan.sebab).toBeUndefined();
    expect(keputusan.hasil.nodes).toHaveLength(1);
  });

  /**
   * Bagian yang paling mudah salah: berkas draw.io yang SAH tetapi tidak punya
   * bentuk. Ini bukan kerusakan — dua sel akar (`id="0"` dan `id="1"`) memang
   * selalu ditulis draw.io — jadi tidak boleh disebut "xml-rusak". Hasilnya tetap
   * kosong, dan sumbernya tetap disimpan supaya pengguna masih bisa
   * menyimpan/mengekspor berkas aslinya. UI sudah punya jalur untuk ini
   * ("tidak ada bentuk di berkas", `toast.noShapesInFile`).
   */
  it("draw.io sah tanpa bentuk: sumber disimpan, hasil kosong tanpa disebut rusak", async () => {
    const berkas = '<mxfile host="x"><diagram id="p">' + model("") + "</diagram></mxfile>";
    const keputusan = await putuskanImporDiagram(berkas, "kosong.drawio", pengurai);

    expect(keputusan.hasil.nodes).toHaveLength(0);
    expect(keputusan.sebab).toBeUndefined();
    expect(keputusan.sumber?.xmlSumber).toBe(berkas);
    expect(keputusan.sumber?.halaman[0].sel).toBe(2);
  });

  it("berkas lewat batas ditolak dengan sebab, tanpa sumber yang boleh disimpan", async () => {
    const besar = `<mxfile>${"<mxGraphModel/>".padEnd(BATAS_BYTE_SUMBER + 5, "x")}</mxfile>`;
    const keputusan = await putuskanImporDiagram(besar, "raksasa.drawio", pengurai);

    expect(keputusan.sebab).toBe("terlalu-besar");
    expect(keputusan.sumber).toBeNull();
    expect(keputusan.hasil.nodes).toHaveLength(0);
    expect(keputusan.pesan).toMatch(/tidak akan dipotong/);
  });

  it("XML rusak tidak menghasilkan papan kosong yang terlihat sukses", async () => {
    const keputusan = await putuskanImporDiagram(
      '<mxfile><diagram id="a">oops',
      "rusak.drawio",
      pengurai
    );
    expect(keputusan.sebab).toBe("xml-rusak");
    expect(keputusan.pesan).toBeTruthy();
  });
});
