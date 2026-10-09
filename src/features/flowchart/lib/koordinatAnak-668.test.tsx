/**
 * #668 — koordinat anak di dalam kolam, wadah, atau kelompok.
 *
 * draw.io menyimpan geometry anak RELATIF ke induknya. Penjeraf lama memakai
 * angka itu apa adanya, jadi anak pada `x=30 y=50` di dalam kolam `x=40 y=200`
 * mendarat di kiri-atas kolam, bukan di dalamnya. Ini aritmetika, jadi buktinya
 * angka - bukan tangkapan layar.
 */
import { parseUniversalDiagram } from "./importers";
import type { FlowNode } from "../types";

const pagar = (isi: string) =>
  '<mxfile><diagram id="d" name="a"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>' +
  isi +
  "</root></mxGraphModel></diagram></mxfile>";

const vertex = (
  id: string,
  parent: string,
  x: number,
  y: number,
  w: number,
  h: number,
  style = ""
) =>
  `<mxCell id="${id}" value="B${id}"${style ? ` style="${style}"` : ""} vertex="1" parent="${parent}"><mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/></mxCell>`;

const diDalam = (anak: FlowNode, induk: FlowNode) =>
  anak.x >= induk.x &&
  anak.y >= induk.y &&
  anak.x + anak.width! <= induk.x + induk.width! + 1 &&
  anak.y + anak.height! <= induk.y + induk.height! + 1;

describe("anak kolam mendarat di dalam induknya (#668)", () => {
  const KOLAM = vertex("k", "1", 40, 200, 300, 160, "swimlane;startSize=30");
  const ANAK = vertex("a", "k", 30, 50, 120, 60);

  it("satu tingkat: anak berada di dalam bbox induknya", () => {
    const { nodes } = parseUniversalDiagram(pagar(KOLAM + ANAK), "papan.drawio");
    const kolam = nodes.find((n) => n.id === "drawio-k")!;
    const anak = nodes.find((n) => n.id === "drawio-a")!;
    expect(diDalam(anak, kolam)).toBe(true);
  });

  it("angkanya persis, bukan cuma kebetulan masuk", () => {
    const { nodes } = parseUniversalDiagram(pagar(KOLAM + ANAK), "papan.drawio");
    const kolam = nodes.find((n) => n.id === "drawio-k")!;
    const anak = nodes.find((n) => n.id === "drawio-a")!;
    // Relatif (30,50) di atas induk (40,200) = (70,250); pemindahan papan
    // memakai SELISIH yang sama untuk keduanya, jadi jarak relatifnya utuh.
    expect(anak.x - kolam.x).toBe(30);
    expect(anak.y - kolam.y).toBe(50);
  });

  it("kolam bertingkat dua: cucu tetap di dalam keduanya", () => {
    const XML = pagar(
      KOLAM + vertex("a", "k", 20, 40, 200, 100) + vertex("c", "a", 10, 10, 60, 40)
    );
    const { nodes } = parseUniversalDiagram(XML, "papan.drawio");
    const kolam = nodes.find((n) => n.id === "drawio-k")!;
    const anak = nodes.find((n) => n.id === "drawio-a")!;
    const cucu = nodes.find((n) => n.id === "drawio-c")!;
    expect(diDalam(anak, kolam)).toBe(true);
    expect(diDalam(cucu, anak)).toBe(true);
    expect(diDalam(cucu, kolam)).toBe(true);
  });

  it("bentuk yang induknya papan itu sendiri (parent=1) tidak digeser dua kali", () => {
    const { nodes } = parseUniversalDiagram(
      pagar(KOLAM + ANAK + vertex("l", "1", 600, 40, 120, 60)),
      "papan.drawio"
    );
    const lepas = nodes.find((n) => n.id === "drawio-l")!;
    const kolam = nodes.find((n) => n.id === "drawio-k")!;
    // Jarak ke kolam sama seperti di berkas sumber (600-40, 40-200).
    expect(lepas.x - kolam.x).toBe(560);
    expect(lepas.y - kolam.y).toBe(-160);
  });

  it("induk yang tidak dikenal tidak memindahkan siapa pun, dan tidak jadi NaN", () => {
    const { nodes } = parseUniversalDiagram(
      pagar(vertex("a", "z", 30, 50, 120, 60)),
      "papan.drawio"
    );
    expect(Number.isFinite(nodes[0].x)).toBe(true);
    expect(Number.isFinite(nodes[0].y)).toBe(true);
  });

  it("garis yang menempel ke anak kolam masih menemukan kedua bentuk", () => {
    const { nodes, edges } = parseUniversalDiagram(
      pagar(
        KOLAM +
          ANAK +
          vertex("b", "1", 500, 220, 120, 60) +
          '<mxCell id="e1" edge="1" source="a" target="b" parent="1"/>'
      ),
      "papan.drawio"
    );
    expect(edges).toHaveLength(1);
    expect(nodes.find((n) => n.id === "drawio-a")).toBeTruthy();
  });
});
