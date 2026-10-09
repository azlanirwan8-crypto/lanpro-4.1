/**
 * #659 - ekspor `.drawio` dan test BOLAK-BALIK.
 *
 * INI ALAT UKUR, BUKAN HIASAN. Selama impornya searah, klaim "papan ini sama
 * dengan draw.io" hanya bisa dibandingkan oleh mata. Setelah papan bisa ditulis
 * menjadi mxfile, klaim itu punya bentuk yang bisa dihitung: berkas X diimpor,
 * diekspor, diimpor lagi, lalu propertinya dibandingkan - kalau ada gaya yang
 * hilang di salah satu arah, selisihnya muncul di sini sebagai angka, bukan
 * sebagai komentar di papan.
 *
 * YANG TIDAK DIBANDINGKAN, dan itu tertulis: koordinat SERET dan id. Penjeraf
 * menormalkan asal papan setiap kali mengimpor (berkas (40,40) mendarat di
 * (180,140)) dan memberi prefix `drawio-` pada setiap id, jadi kedua hal itu
 * berubah SATU KALI SECARA SISTEMATIS, bukan karena gaya hilang. Geometri yang
 * dibandingkan adalah SELISIH antar bentuk, yang tidak dipengaruhi pergeseran.
 */
import { parseUniversalDiagram } from "./importers";
import { eksporDrawIo } from "./eksporDrawio";
import type { FlowEdge, FlowNode } from "../types";

const SUMBER = [
  '<mxfile><diagram id="d" name="Uji"><mxGraphModel><root>',
  '<mxCell id="0"/><mxCell id="1" parent="0"/>',
  // bentuk 1: warna + huruf + tepi penuh
  '<mxCell id="v1" value="Kriteria&lt;br&gt;password" style="rounded=1;whiteSpace=wrap;html=1;' +
    "fillColor=#dae8fc;strokeColor=#6c8ebf;strokeWidth=3;dashed=1;dashPattern=8 2;" +
    "fontSize=18;fontColor=#b85450;fontStyle=3;fontFamily=Courier New;align=left;verticalAlign=top;" +
    'rotation=15;opacity=60;shadow=1;gradientColor=#0000ff" vertex="1" parent="1">',
  '<mxGeometry x="40" y="40" width="160" height="80" as="geometry"/></mxCell>',
  // bentuk 2: tanpa isian, tanpa tepi
  '<mxCell id="v2" value="Catatan" style="ellipse;fillColor=none;strokeColor=none" vertex="1" parent="1">',
  '<mxGeometry x="320" y="40" width="120" height="120" as="geometry"/></mxCell>',
  // bentuk 3: awan (bukti urutan pengenal #667)
  '<mxCell id="v3" value="Awan" style="ellipse;shape=cloud;whiteSpace=wrap;html=1" vertex="1" parent="1">',
  '<mxGeometry x="320" y="240" width="140" height="90" as="geometry"/></mxCell>',
  // garis: gaya penuh + tekukan manual + titik sambung
  '<mxCell id="e1" value="YA" style="edgeStyle=orthogonalEdgeStyle;html=1;dashed=1;dashPattern=4 4;' +
    "strokeColor=#b85450;strokeWidth=4;endArrow=classic;endFill=1;startArrow=oval;startFill=0;" +
    'fontSize=11;fontColor=#0066cc;exitX=0.5;exitY=1;entryX=0.5;entryY=0" edge="1" parent="1" source="v1" target="v2">',
  '<mxGeometry relative="1" as="geometry"><Array as="points"><mxPoint x="240" y="160"/><mxPoint x="300" y="200"/></Array></mxGeometry></mxCell>',
  "</root></mxGraphModel></diagram></mxfile>",
].join("");

/** Papan dari berkas, lalu berkas dari papan, lalu papan dari berkas itu. */
const bolakBalik = (teks: string) => {
  const masuk = parseUniversalDiagram(teks, "sumber.drawio");
  const hasilEkspor = eksporDrawIo(masuk.nodes, masuk.edges, "Uji");
  const kembali = parseUniversalDiagram(hasilEkspor, "hasil.drawio");
  return { masuk, hasilEkspor, kembali };
};

describe("ekspor draw.io menulis balik apa yang dibaca (#659)", () => {
  const { masuk, hasilEkspor, kembali } = bolakBalik(SUMBER);

  it("berkasnya XML mxfile yang bisa dibaca penjeraf itu sendiri", () => {
    expect(hasilEkspor.startsWith("<mxfile")).toBe(true);
    expect(hasilEkspor).toContain("<diagram");
    expect(hasilEkspor).toContain('vertex="1"');
    expect(hasilEkspor).toContain('edge="1"');
    // Kalau tidak bisa dibaca penjeraf, seluruh test di bawah tidak berarti.
    expect(kembali.nodes.length).toBe(masuk.nodes.length);
    expect(kembali.edges.length).toBe(masuk.edges.length);
  });

  it("sisi BENTUK bertahan utuh satu putaran penuh", () => {
    const a = masuk.nodes[0];
    const b = kembali.nodes[0];
    const banding = {
      rounded: [a.rounded, b.rounded],
      fillHex: [a.fillHex, b.fillHex],
      strokeHex: [a.strokeHex, b.strokeHex],
      strokeWidth: [a.strokeWidth, b.strokeWidth],
      borderStyle: [a.borderStyle, b.borderStyle],
      dashPattern: [a.dashPattern, b.dashPattern],
      fontSize: [a.fontSize, b.fontSize],
      fontColor: [a.fontColor, b.fontColor],
      fontWeight: [a.fontWeight, b.fontWeight],
      italic: [a.italic, b.italic],
      fontFamily: [a.fontFamily, b.fontFamily],
      align: [a.align, b.align],
      verticalAlign: [a.verticalAlign, b.verticalAlign],
      rotation: [a.rotation, b.rotation],
      opacity: [a.opacity, b.opacity],
      shadow: [a.shadow, b.shadow],
      gradientHex: [a.gradientHex, b.gradientHex],
    } as Record<string, [unknown, unknown]>;
    const hilang = Object.entries(banding).filter(([, [x, y]]) => x !== y);
    // Daftar NAMA-nya, bukan hanya `toEqual({})`, supaya yang bolak-balik gagal
    // bisa dibaca tanpa membuka test.
    expect(hilang.map(([k]) => k)).toEqual([]);
  });

  it("garis bawah bitmask ikut kembali, bukan hanya tebal dan miring", () => {
    const { kembali: kb } = bolakBalik(SUMBER.replace("fontStyle=3", "fontStyle=7"));
    expect(kb.nodes[0].underline).toBe(true);
    expect(kb.nodes[0].fontWeight).toBe("bold");
    expect(kb.nodes[0].italic).toBe(true);
  });

  it("sisi GARIS bertahan utuh, termasuk tekukan dan titik sambung", () => {
    const a = masuk.edges[0];
    const b = kembali.edges[0];
    expect(b.connector).toBe(a.connector);
    expect(b.strokeStyle).toBe(a.strokeStyle);
    expect(b.dashPattern).toBe(a.dashPattern);
    expect(b.strokeColor).toBe(a.strokeColor);
    expect(b.strokeWidth).toBe(a.strokeWidth);
    expect(b.endArrow).toBe(a.endArrow);
    expect(b.endFill).toBe(a.endFill);
    expect(b.startArrow).toBe(a.startArrow);
    expect(b.startFill).toBe(a.startFill);
    expect(b.labelFontSize).toBe(a.labelFontSize);
    expect(b.labelColor).toBe(a.labelColor);
    expect(b.portSumber).toEqual(a.portSumber);
    expect(b.portTujuan).toEqual(a.portTujuan);
    expect(b.waypoints?.length).toBe(2);
  });

  it("tekukan manual mendarat di tempat yang sama secara RELATIF", () => {
    // Koordinat absolut bergeser oleh normalisasi penjeraf, jadi yang diuji
    // adalah jarak tekukan ke bentuk asalnya - itu yang dilihat pengguna.
    const jarak = (nodes: FlowNode[], edges: FlowEdge[]) => {
      const asal = nodes[0];
      const titik = edges[0].waypoints?.[0];
      if (!titik) return null;
      return `${titik.x - asal.x},${titik.y - asal.y}`;
    };
    expect(jarak(kembali.nodes, kembali.edges)).toBe(jarak(masuk.nodes, masuk.edges));
  });

  it("label multi-baris tidak menempel lagi setelah satu putaran", () => {
    expect(masuk.nodes[0].label).toBe("Kriteria\npassword");
    expect(kembali.nodes[0].label).toBe(masuk.nodes[0].label);
  });

  it("fillColor=none dan strokeColor=none tetap tanpa isian dan tanpa tepi", () => {
    const a = masuk.nodes[1];
    const b = kembali.nodes[1];
    expect(b.fillNone).toBe(a.fillNone);
    expect(b.borderStyle).toBe(a.borderStyle);
  });

  it("awan tetap awan, bukan jatuh jadi oval (urutan pengenal #667)", () => {
    expect(masuk.nodes[2].type).toBe("cloud");
    expect(kembali.nodes[2].type).toBe("cloud");
  });

  it("geometri RELATIF antar bentuk bertahan", () => {
    const selisih = (nodes: FlowNode[]) => {
      const [p, q, r] = nodes;
      return [q.x - p.x, q.y - p.y, r.x - q.x, r.y - q.y].join("|");
    };
    expect(selisih(kembali.nodes)).toBe(selisih(masuk.nodes));
  });
});

describe("keluaran ekspor dijaga sendiri (#659)", () => {
  const node = (lebih: Partial<FlowNode> = {}): FlowNode =>
    ({
      id: "n1",
      type: "rect",
      x: 10,
      y: 20,
      label: "Satu",
      color: "blue",
      width: 120,
      height: 60,
      ...lebih,
    }) as FlowNode;

  const teks = (nodes: FlowNode[], edges: FlowEdge[] = []) => eksporDrawIo(nodes, edges, "Papan");

  it("heks palet papan ditulis apa adanya karena paletnya memang heks draw.io", () => {
    const hasil = teks([node()]);
    expect(hasil).toContain("fillColor=#dae8fc");
    expect(hasil).toContain("strokeColor=#6c8ebf");
  });

  it("nilai label di-escape, jadi teks tidak bisa menutup atribut", () => {
    const hasil = teks([node({ label: 'A" onload="alert(1)' })]);
    expect(hasil).toContain("&quot;");
    expect(hasil).not.toContain('onload="alert');
  });

  it("tanda ampersand dan kurung sudut pada label tidak merusak XML", () => {
    const hasil = teks([node({ label: "a & b < c > d" })]);
    expect(hasil).toContain("a &amp; b &lt; c &gt; d");
  });

  it("baris baru ditulis sebagai br supaya draw.io tidak menyatukannya", () => {
    expect(teks([node({ label: "atas\nbawah" })])).toContain("atas&lt;br&gt;bawah");
  });

  it("papan kosong menghasilkan dokumen yang tetap sah", () => {
    const hasil = teks([]);
    expect(hasil).toContain('<mxCell id="0"/><mxCell id="1" parent="0"/>');
    expect(hasil.endsWith("</mxfile>")).toBe(true);
  });

  it("nama papan ikut diatribut diagram dan di-escape", () => {
    expect(eksporDrawIo([], [], 'A"B')).toContain('name="A&quot;B"');
  });
});
