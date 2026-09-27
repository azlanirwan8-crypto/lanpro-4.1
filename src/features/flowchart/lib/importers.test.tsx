/**
 * Test untuk parser impor diagram: Draw.io, Miro, Mermaid, LanPro JSON.
 *
 * Berekstensi .tsx supaya masuk proyek Jest "jsdom": parser memakai DOMParser
 * dan document.createElement, yang tidak ada di lingkungan node.
 */
import {
  parseDrawIoXML,
  parseMiroContent,
  parseMermaid,
  parseUniversalDiagram,
  autoCenterAndNormalizeDiagram,
  decodeHtmlEntity,
} from "./importers";

describe("decodeHtmlEntity", () => {
  it("mengembalikan entitas HTML menjadi karakter aslinya", () => {
    expect(decodeHtmlEntity("Tim &amp; Proses")).toBe("Tim & Proses");
    expect(decodeHtmlEntity("&lt;mulai&gt;")).toBe("<mulai>");
  });

  it("membiarkan teks tanpa entitas apa adanya", () => {
    expect(decodeHtmlEntity("Verifikasi Data")).toBe("Verifikasi Data");
  });
});

describe("parseDrawIoXML", () => {
  const drawio = `
    <mxGraphModel>
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="2" value="Mulai" style="ellipse;whiteSpace=wrap" vertex="1">
          <mxGeometry x="40" y="80" width="120" height="60" />
        </mxCell>
        <mxCell id="3" value="Cek&amp;nbsp;Saldo" style="rhombus" vertex="1">
          <mxGeometry x="200" y="80" width="140" height="90" />
        </mxCell>
        <mxCell id="4" value="ya" edge="1" source="2" target="3" />
      </root>
    </mxGraphModel>`;

  it("memetakan mxCell vertex menjadi node berikut posisi dan ukurannya", () => {
    const { nodes } = parseDrawIoXML(drawio);

    expect(nodes).toHaveLength(2);
    expect(nodes[0]).toMatchObject({
      id: "drawio-2",
      label: "Mulai",
      width: 120,
      height: 60,
    });
  });

  it("menerjemahkan style Draw.io menjadi tipe bentuk LanPro", () => {
    const { nodes } = parseDrawIoXML(drawio);

    expect(nodes[0].type).toBe("oval");
    expect(nodes[0].color).toBe("emerald");
    expect(nodes[1].type).toBe("diamond");
    expect(nodes[1].color).toBe("orange");
  });

  it("men-decode entitas HTML di dalam label", () => {
    const { nodes } = parseDrawIoXML(drawio);

    expect(nodes[1].label).toContain("Cek");
    expect(nodes[1].label).toContain("Saldo");
  });

  it("memetakan mxCell edge menjadi edge dengan label", () => {
    const { edges } = parseDrawIoXML(drawio);

    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({
      fromNodeId: "drawio-2",
      toNodeId: "drawio-3",
      label: "ya",
    });
  });

  it("melewati sel rangka id 0 dan 1", () => {
    const { nodes } = parseDrawIoXML(drawio);

    expect(nodes.map((n) => n.id)).not.toContain("drawio-0");
    expect(nodes.map((n) => n.id)).not.toContain("drawio-1");
  });

  it("membuang edge yang salah satu ujungnya tidak ada nodenya", () => {
    const menggantung = `
      <mxGraphModel><root>
        <mxCell id="2" value="Mulai" vertex="1"><mxGeometry x="0" y="0" /></mxCell>
        <mxCell id="9" edge="1" source="2" target="tidak-ada" />
      </root></mxGraphModel>`;

    const { nodes, edges } = parseDrawIoXML(menggantung);

    expect(nodes).toHaveLength(1);
    expect(edges).toHaveLength(0);
  });
});

describe("parseMermaid", () => {
  const mermaidGraph = `
    flowchart TD
      A[Mulai Proses] --> B{Validasi Akun}
      B -->|Ya| C[(Database User)]
      B -->|Tidak| D([Tolak Akses])
  `;

  it("memetakan syntax Mermaid flowchart ke nodes dan edges", () => {
    const { nodes, edges } = parseMermaid(mermaidGraph);

    expect(nodes.length).toBe(4);
    expect(edges.length).toBe(3);

    const nodeA = nodes.find((n) => n.label === "Mulai Proses");
    expect(nodeA).toBeDefined();
    expect(nodeA?.type).toBe("rect");

    const nodeB = nodes.find((n) => n.label === "Validasi Akun");
    expect(nodeB).toBeDefined();
    expect(nodeB?.type).toBe("diamond");

    const nodeC = nodes.find((n) => n.label === "Database User");
    expect(nodeC).toBeDefined();
    expect(nodeC?.type).toBe("cylinder");

    const edgeYa = edges.find((e) => e.label === "Ya");
    expect(edgeYa).toBeDefined();
  });
});

describe("parseMiroContent — CSV", () => {
  it("memetakan baris menjadi node dan edge", () => {
    const csv = [
      "id,text,x,y",
      "a,Mulai,0,0",
      "b,Selesai,100,0",
      "c,,0,0", // baris edge: dari a ke b
    ].join("\n");

    const denganEdge = csv.replace("c,,0,0", "e1,,0,0") + "\n";
    const csvLengkap = [
      "id,text,x,y,from,to",
      "a,Mulai,0,0,,",
      "b,Selesai,100,0,,",
      "e1,,,,a,b",
    ].join("\n");

    const { nodes, edges } = parseMiroContent(csvLengkap, true);

    expect(nodes).toHaveLength(2);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({ fromNodeId: "miro-a", toNodeId: "miro-b" });
  });

  it("menghormati tanda kutip sehingga koma di dalam teks tidak memecah kolom", () => {
    const csv = ["id,text", 'a,"Cek saldo, lalu lanjut"'].join("\n");

    expect(parseMiroContent(csv, true).nodes[0].label).toBe("Cek saldo, lalu lanjut");
  });

  it("melempar bila CSV tidak punya baris data", () => {
    expect(() => parseMiroContent("id,text", true)).toThrow(/CSV/);
  });
});

describe("parseMiroContent — JSON", () => {
  it("membaca widget dari kunci data", () => {
    const json = JSON.stringify({
      data: [
        {
          id: "s1",
          type: "shape",
          text: "Ambil Data",
          position: { x: 30, y: 40 },
          shape: "circle",
        },
        { id: "s2", type: "shape", text: "Simpan", position: { x: 300, y: 40 } },
        { id: "c1", type: "connector", start: { id: "s1" }, end: { id: "s2" } },
      ],
    });

    const { nodes, edges } = parseMiroContent(json, false);

    expect(nodes).toHaveLength(2);
    expect(nodes[0]).toMatchObject({ id: "miro-s1", label: "Ambil Data", type: "oval" });
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({ fromNodeId: "miro-s1", toNodeId: "miro-s2" });
  });

  it("menerima array telanjang tanpa kunci pembungkus", () => {
    const json = JSON.stringify([{ id: "x", text: "Satu" }]);

    expect(parseMiroContent(json, false).nodes[0].label).toBe("Satu");
  });

  it("membersihkan tag HTML dari teks widget", () => {
    const json = JSON.stringify([{ id: "x", text: "<p>Kirim <b>Notifikasi</b></p>" }]);

    expect(parseMiroContent(json, false).nodes[0].label).toBe("Kirim Notifikasi");
  });

  it("memberi label pengganti bila widget tidak punya teks", () => {
    const json = JSON.stringify([{ id: "x", type: "sticky" }]);

    expect(parseMiroContent(json, false).nodes[0].label).toBe("Miro sticky");
  });
});

describe("parseUniversalDiagram & autoCenterAndNormalizeDiagram", () => {
  it("mendeteksi berkas .drawio otomatis", () => {
    const xml = `<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="2" value="Test Node" vertex="1"><mxGeometry x="500" y="500"/></mxCell></root></mxGraphModel>`;
    const res = parseUniversalDiagram(xml, "my-chart.drawio");
    expect(res.nodes.length).toBe(1);
    expect(res.nodes[0].label).toBe("Test Node");
  });

  it("mendeteksi diagram Mermaid otomatis", () => {
    const mermaid = `flowchart LR\nA[Step 1] --> B[Step 2]`;
    const res = parseUniversalDiagram(mermaid, "diagram.mmd");
    expect(res.nodes.length).toBe(2);
    expect(res.edges.length).toBe(1);
  });

  it("menggeser koordinat agar mulai dari titik kanvas yang nyaman", () => {
    const diagram = {
      nodes: [
        {
          id: "1",
          x: 2000,
          y: 1500,
          label: "Jauh",
          type: "rect" as const,
          color: "indigo",
          fontSize: 13,
          align: "center" as const,
          width: 100,
          height: 60,
          borderStyle: "solid" as const,
          strokeWidth: 2,
        },
        {
          id: "2",
          x: 2200,
          y: 1500,
          label: "Jauh 2",
          type: "rect" as const,
          color: "indigo",
          fontSize: 13,
          align: "center" as const,
          width: 100,
          height: 60,
          borderStyle: "solid" as const,
          strokeWidth: 2,
        },
      ],
      edges: [],
    };
    const centered = autoCenterAndNormalizeDiagram(diagram, 100, 100);
    expect(centered.nodes[0].x).toBe(100);
    expect(centered.nodes[0].y).toBe(100);
    expect(centered.nodes[1].x).toBe(300);
  });
});
