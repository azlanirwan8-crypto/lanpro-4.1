/**
 * @jest-environment jsdom
 */
/**
 * #636 — garis draw.io yang TIDAK menempel ke bentuk dibuang penjeraf.
 *
 * Dikunci 05 Okt dari keluhan pemilik proyek setelah menempel salinan draw.io:
 * "duh kok tidak garis nya, kan di copy ada garis". #625 menguji garis yang
 * MEMPELEK (`source`/`target` ada di atribut) dan semuanya lolos. draw.io juga
 * menulis garis yang ujungnya hanya koordinat — `<mxPoint as="sourcePoint">` dan
 * `<mxPoint as="targetPoint">` tanpa `source`/`target` — yaitu garis yang secara
 * visual menyentuh bentuk tetapi tidak pernah di-glue. Penjeraf ini mensyaratkan
 * kedua atribut itu, jadi seluruh garis jenis itu hilang tanpa pesan: persis
 * gejala yang dilaporkan, dan inilah sebabnya test #625 tetap hijau.
 */
import { parseDrawIoXML } from "./importers";

const BENTUK =
  '<mxCell id="2" value="Start" style="ellipse;" vertex="1" parent="1"><mxGeometry x="40" y="120" width="120" height="80" as="geometry"/></mxCell>' +
  '<mxCell id="3" value="Langkah 1" style="rounded=1;" vertex="1" parent="1"><mxGeometry x="220" y="120" width="140" height="70" as="geometry"/></mxCell>' +
  '<mxCell id="4" value="Langkah 2" style="rounded=1;" vertex="1" parent="1"><mxGeometry x="420" y="120" width="140" height="70" as="geometry"/></mxCell>' +
  '<mxCell id="5" value="Selesai" style="ellipse;" vertex="1" parent="1"><mxGeometry x="620" y="120" width="120" height="80" as="geometry"/></mxCell>';

const pagar = (isi: string) =>
  '<mxfile host="app.diagrams.net"><diagram id="d" name="Alur"><mxGraphModel dx="800" dy="600" grid="1" gridSize="10"><root>' +
  '<mxCell id="0" /><mxCell id="1" parent="0" />' +
  isi +
  "</root></mxGraphModel></diagram></mxfile>";

/** Ujung garis yang hanya koordinat: (160,160) di tepi kanan bentuk #2, (220,160) di tepi kiri bentuk #3. */
const garisLepas = (id: string, sx: number, sy: number, tx: number, ty: number) =>
  `<mxCell id="${id}" value="" style="endArrow=classic;" edge="1" parent="1"><mxGeometry width="50" height="50" relative="1" as="geometry">` +
  `<mxPoint x="${sx}" y="${sy}" as="sourcePoint"/><mxPoint x="${tx}" y="${ty}" as="targetPoint"/>` +
  "</mxGeometry></mxCell>";

describe("garis draw.io ber-ujung koordinat (#636)", () => {
  it("ujung yang menyentuh dua bentuk tetap menjadi garis, bukan dibuang", () => {
    const hasil = parseDrawIoXML(pagar(BENTUK + garisLepas("e1", 160, 160, 220, 160)));

    expect(hasil.nodes).toHaveLength(4);
    expect(hasil.edges).toHaveLength(1);
    expect(hasil.edges[0].fromNodeId).toBe("drawio-2");
    expect(hasil.edges[0].toNodeId).toBe("drawio-3");
  });

  it("garis melekat dan garis lepas dihitung bersama, persis seperti yang dilihat pengguna di draw.io", () => {
    const xml = pagar(
      BENTUK +
        '<mxCell id="ea" style="edgeStyle=orthogonalEdgeStyle;" edge="1" parent="1" source="4" target="5"><mxGeometry relative="1" as="geometry"/></mxCell>' +
        garisLepas("eb", 360, 155, 420, 155)
    );
    const hasil = parseDrawIoXML(xml);

    expect(hasil.edges).toHaveLength(2);
    const ujung = hasil.edges.map((e) => `${e.fromNodeId}->${e.toNodeId}`).sort();
    expect(ujung).toEqual(["drawio-3->drawio-4", "drawio-4->drawio-5"]);
  });

  it("ujung yang tidak menyentuh bentuk apa pun TIDAK ditebak jadi garis", () => {
    // (1.000, 900) berada jauh di ruang kosong papan.
    const hasil = parseDrawIoXML(pagar(BENTUK + garisLepas("e1", 1000, 900, 1060, 940)));

    expect(hasil.nodes).toHaveLength(4);
    expect(hasil.edges).toHaveLength(0);
  });

  it("kedua ujung pada satu bentuk tidak menghasilkan garis nol panjang", () => {
    const hasil = parseDrawIoXML(pagar(BENTUK + garisLepas("e1", 240, 130, 350, 180)));

    expect(hasil.edges).toHaveLength(0);
  });
});
