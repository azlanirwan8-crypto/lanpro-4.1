/**
 * #664 — tekukan manual draw.io ikut masuk ke papan.
 *
 * draw.io menyimpan garis yang pembelokannya dibuat tangan sebagai
 * `<Array as="points"><mxPoint .../></Array>` di dalam geometry tepi. Papan ini
 * sudah punya kolom dan pemegangnya sejak #653, tapi jalurnya masuk tidak ada:
 * berkas probe 09 Okt kehilangan kedua titik itu dan garisnya datang sebagai
 * hasil rute otomatis.
 *
 * YANG DIUJI ANGKA, BUKAN GAMBAR. Titik tekukan harus digeser sama seperti
 * bentuknya (`autoCenterAndNormalizeDiagram` memindah papan ke x=180, y=140),
 * karena mengeser satu dan membiarkan yang lain adalah garis yang melengkung ke
 * tempat yang tidak pernah dimaksud penulis berkasnya.
 */
import { parseUniversalDiagram } from "./importers";

const pagar = (isi: string) =>
  '<mxfile><diagram id="d" name="a"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>' +
  isi +
  "</root></mxGraphModel></diagram></mxfile>";

const bentuk = (id: string, x: number, y: number) =>
  `<mxCell id="${id}" value="B${id}" style="rounded=0" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="120" height="60" as="geometry"/></mxCell>`;

const TITIK_AWAL = { x: 40, y: 40 };

describe("waypoint draw.io ikut ke papan (#664)", () => {
  const XML_TEKUK = pagar(
    bentuk("a", TITIK_AWAL.x, TITIK_AWAL.y) +
      bentuk("b", 400, 40) +
      '<mxCell id="e1" edge="1" source="a" target="b" parent="1" style="edgeStyle=orthogonalEdgeStyle">' +
      '<mxGeometry relative="1" as="geometry"><Array as="points">' +
      '<mxPoint x="230" y="160"/><mxPoint x="300" y="190"/>' +
      "</Array></mxGeometry></mxCell>"
  );

  it("dua titik tekukan masuk sebagai waypoints", () => {
    const { edges } = parseUniversalDiagram(XML_TEKUK, "papan.drawio");
    expect(edges[0].waypoints).toHaveLength(2);
  });

  it("titiknya digeser sama seperti bentuknya, bukan dituang mentah", () => {
    const { nodes, edges } = parseUniversalDiagram(XML_TEKUK, "papan.drawio");
    const geserX = nodes[0].x - TITIK_AWAL.x;
    const geserY = nodes[0].y - TITIK_AWAL.y;
    expect(geserX).toBeGreaterThan(0);
    expect(edges[0].waypoints![0]).toEqual({ x: 230 + geserX, y: 160 + geserY });
    expect(edges[0].waypoints![1]).toEqual({ x: 300 + geserX, y: 190 + geserY });
  });

  it("garis tanpa Array TIDAK mendapat waypoints kosong — perender #653 membeda-kan keduanya", () => {
    const { edges } = parseUniversalDiagram(
      pagar(
        bentuk("a", 40, 40) +
          bentuk("b", 400, 40) +
          '<mxCell id="e1" edge="1" source="a" target="b" parent="1"/>'
      ),
      "papan.drawio"
    );
    expect(edges[0].waypoints).toBeUndefined();
  });

  it("ujung yang hanya koordinat (tanpa source/target) tetap membawa tekukannya", () => {
    const XML = pagar(
      bentuk("a", 40, 40) +
        bentuk("b", 400, 40) +
        '<mxCell id="e1" edge="1" parent="1" style="endArrow=classic">' +
        '<mxGeometry relative="1" as="geometry">' +
        '<mxPoint as="sourcePoint" x="160" y="70"/><mxPoint as="targetPoint" x="400" y="70"/>' +
        '<Array as="points"><mxPoint x="260" y="150"/></Array></mxGeometry></mxCell>'
    );
    const { edges } = parseUniversalDiagram(XML, "papan.drawio");
    expect(edges).toHaveLength(1);
    expect(edges[0].waypoints).toHaveLength(1);
  });

  it("titik tanpa angka yang sah tidak ikut masuk", () => {
    const XML = pagar(
      bentuk("a", 40, 40) +
        bentuk("b", 400, 40) +
        '<mxCell id="e1" edge="1" source="a" target="b" parent="1"><mxGeometry relative="1" as="geometry">' +
        '<Array as="points"><mxPoint x="abc" y="150"/><mxPoint x="260" y="150"/></Array></mxGeometry></mxCell>'
    );
    const { nodes, edges } = parseUniversalDiagram(XML, "papan.drawio");
    expect(edges[0].waypoints).toEqual([{ x: 260 + nodes[0].x - 40, y: 150 + nodes[0].y - 40 }]);
  });
});
