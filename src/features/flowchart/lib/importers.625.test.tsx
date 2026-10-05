/**
 * @jest-environment jsdom
 */
/**
 * #625 — salinan draw.io yang punya garis menempel TANPA satu garis pun.
 *
 * Dikunci lewat jalur SUNGGUH yang dipakai pengguna: peristiwa `paste` dari
 * peramban (draw.io menaruh modelnya di `data-mxgraph` dalam `text/html`),
 * bukan lewat pemanggil parser langsung.
 */
import { parseUniversalDiagram } from "./importers";
import { kumpulkanSalinan, hasilTempel } from "./salinTempel";

const XML =
  '<mxfile host="app.diagrams.net"><diagram id="d" name="Alur"><mxGraphModel dx="800" dy="600" grid="1" gridSize="10"><root>' +
  '<mxCell id="0" /><mxCell id="1" parent="0" />' +
  '<mxCell id="2" value="Start" style="ellipse;fillColor=#d5e8d4;strokeColor=#82b366;" vertex="1" parent="1"><mxGeometry x="40" y="120" width="120" height="80" as="geometry"/></mxCell>' +
  '<mxCell id="3" value="Buka wondr merchant" style="rounded=1;fillColor=#ffe6cc;strokeColor=#d79b00;" vertex="1" parent="1"><mxGeometry x="220" y="120" width="140" height="70" as="geometry"/></mxCell>' +
  '<mxCell id="4" value="Daftar Sekarang/masuk" style="rounded=1;fillColor=#ffe6cc;strokeColor=#d79b00;" vertex="1" parent="1"><mxGeometry x="420" y="120" width="140" height="70" as="geometry"/></mxCell>' +
  '<mxCell id="5" value="Malware?" style="rhombus;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1"><mxGeometry x="620" y="110" width="100" height="90" as="geometry"/></mxCell>' +
  '<mxCell id="6" value="Lanjut" style="rounded=1;fillColor=#ffe6cc;strokeColor=#d79b00;" vertex="1" parent="1"><mxGeometry x="800" y="120" width="140" height="70" as="geometry"/></mxCell>' +
  '<mxCell id="7" value="End" style="ellipse;fillColor=#f8cecc;strokeColor=#b85450;" vertex="1" parent="1"><mxGeometry x="1000" y="120" width="120" height="80" as="geometry"/></mxCell>' +
  '<mxCell id="8" value="Blocked" style="rounded=1;fillColor=#ffe6cc;strokeColor=#d79b00;" vertex="1" parent="1"><mxGeometry x="620" y="260" width="140" height="70" as="geometry"/></mxCell>' +
  '<mxCell id="e1" style="edgeStyle=orthogonalEdgeStyle;" edge="1" parent="1" source="2" target="3"><mxGeometry relative="1" as="geometry"/></mxCell>' +
  '<mxCell id="e2" style="edgeStyle=orthogonalEdgeStyle;" edge="1" parent="1" source="3" target="4"><mxGeometry relative="1" as="geometry"/></mxCell>' +
  '<mxCell id="e3" style="edgeStyle=orthogonalEdgeStyle;" edge="1" parent="1" source="4" target="5"><mxGeometry relative="1" as="geometry"/></mxCell>' +
  '<mxCell id="e4" value="Ya" style="edgeStyle=orthogonalEdgeStyle;" edge="1" parent="1" source="5" target="6"><mxGeometry relative="1" as="geometry"/></mxCell>' +
  '<mxCell id="e5" value="Tidak" style="edgeStyle=orthogonalEdgeStyle;" edge="1" parent="1" source="5" target="8"><mxGeometry relative="1" as="geometry"/></mxCell>' +
  '<mxCell id="e6" style="edgeStyle=orthogonalEdgeStyle;" edge="1" parent="1" source="6" target="7"><mxGeometry relative="1" as="geometry"/></mxCell>' +
  "</root></mxGraphModel></diagram></mxfile>";

const htmlDrawio = (xml: string) => {
  const json = JSON.stringify({ xml });
  const lup = json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return `<div class="mxgraph" data-mxgraph="${lup}"></div>`;
};

describe("salinan draw.io yang bergaris (#625)", () => {
  it("parser memulangkan 7 bentuk dan 6 garis", () => {
    const hasil = parseUniversalDiagram(XML);
    expect(hasil.nodes).toHaveLength(7);
    expect(hasil.edges).toHaveLength(6);
  });

  it("lewat clipboard draw.io sungguhan (data-mxgraph) juga 6 garis", () => {
    const hasil = parseUniversalDiagram(htmlDrawio(XML));
    expect(hasil.nodes).toHaveLength(7);
    expect(hasil.edges).toHaveLength(6);
  });

  it("setelah ditempel, SETIAP garis masih menunjuk ke bentuk yang ada", () => {
    const hasil = parseUniversalDiagram(htmlDrawio(XML));
    const salinan = kumpulkanSalinan(hasil.nodes, hasil.edges);
    expect(salinan.edges).toHaveLength(6);

    const ditempel = hasilTempel(salinan, { x: 300, y: 300 });
    const idBentuk = new Set(ditempel.nodes.map((n) => n.id));
    const yatim = ditempel.edges.filter(
      (e) => !idBentuk.has(e.fromNodeId) || !idBentuk.has(e.toNodeId)
    );
    expect(yatim).toEqual([]);
  });
});
