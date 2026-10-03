/**
 * #595 — salinan draw.io dari clipboard adalah XML TER-ENCODE URI.
 *
 * Pemilik proyek 03 Okt: "kok ketika di paste bukan flow, tapi begini" — lewat
 * tangkapan layar papan berisi SATU kotak bertuliskan "%3CmxGraphModel%3E%3Croot%3E"
 * dengan toast hijau "1 bentuk dan 0 panah ditempel". Dua hal salah di situ:
 * XML-nya tidak pernah dilepas dari encode-nya, dan teks yang tidak dikenali
 * diubah menjadi bentuk sungguhan alih-alih ditolak.
 */
import {
  parseUniversalDiagram,
  parseDrawIoXML,
  uraikanSandiwara,
  warnaPaletTerdekat,
} from "./importers";

/** Sampel seukuran clipboard nyata: lima bentuk, empat panah, warna dari draw.io. */
const XML_ASLI = `<mxGraphModel><root>
  <mxCell id="0" />
  <mxCell id="1" parent="0" />
  <mxCell id="2" value="Start" style="ellipse;fillColor=#d5e8d4;strokeColor=#82b366;" vertex="1" parent="1"><mxGeometry x="80" y="40" width="120" height="60" as="geometry" /></mxCell>
  <mxCell id="3" value="Buka rekening di wondr" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#ffe6cc;strokeColor=#d79b00;" vertex="1" parent="1"><mxGeometry x="80" y="160" width="160" height="60" as="geometry" /></mxCell>
  <mxCell id="4" value="Data Rekening Kontan?" style="rhombus;fillColor=#fff2cc;strokeColor=#d6b656;" vertex="1" parent="1"><mxGeometry x="80" y="280" width="160" height="80" as="geometry" /></mxCell>
  <mxCell id="5" value="Kirim OTP SMS / WA" style="rounded=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1"><mxGeometry x="320" y="280" width="160" height="60" as="geometry" /></mxCell>
  <mxCell id="6" value="End" style="ellipse;fillColor=#f8cecc;strokeColor=#b85450;" vertex="1" parent="1"><mxGeometry x="320" y="400" width="120" height="60" as="geometry" /></mxCell>
  <mxCell id="e1" style="edgeStyle=orthogonalEdgeStyle;" edge="1" source="2" target="3" parent="1" />
  <mxCell id="e2" value="YES" style="edgeStyle=orthogonalEdgeStyle;" edge="1" source="3" target="4" parent="1" />
  <mxCell id="e3" value="NO" style="edgeStyle=orthogonalEdgeStyle;" edge="1" source="4" target="5" parent="1" />
  <mxCell id="e4" style="edgeStyle=orthogonalEdgeStyle;" edge="1" source="5" target="6" parent="1" />
</root></mxGraphModel>`;

describe("uraikanSandiwara (#595)", () => {
  it("melepas encode URI pada XML clipboard draw.io", () => {
    const keluar = uraikanSandiwara(encodeURIComponent(XML_ASLI));
    expect(keluar.startsWith("<mxGraphModel>")).toBe(true);
    expect(keluar).toContain('value="Buka rekening di wondr"');
  });

  it("membiarkan XML yang sudah mentah apa adanya", () => {
    expect(uraikanSandiwara(XML_ASLI)).toBe(XML_ASLI);
  });

  it("tidak menyentuh teks bebas dan tidak melempar bila encode-nya terpotong", () => {
    expect(uraikanSandiwara("rapatkan jadwal sprint")).toBe("rapatkan jadwal sprint");
    // "%3CmxGraphModel%3E%" berakhir dengan '%' tunggal: decodeURIComponent
    // melempar di sini, dan helpernya wajib mengembalikan teks asal, bukan meledak.
    expect(uraikanSandiwara("%3CmxGraphModel%3E%")).toBe("%3CmxGraphModel%3E%");
  });
});

describe("parseUniversalDiagram atas teks clipboard (#595)", () => {
  it("XML ter-encode menghasilkan bentuk DAN panah yang sama dengan XML mentah", () => {
    const mentah = parseUniversalDiagram(XML_ASLI);
    const tersandi = parseUniversalDiagram(encodeURIComponent(XML_ASLI));

    expect(mentah.nodes).toHaveLength(5);
    expect(mentah.edges).toHaveLength(4);
    expect(tersandi.nodes).toHaveLength(mentah.nodes.length);
    expect(tersandi.edges).toHaveLength(mentah.edges.length);
    expect(tersandi.nodes.map((n) => n.label)).toEqual(mentah.nodes.map((n) => n.label));
  });

  it("tidak ada satu pun label yang masih berisi sisa encode", () => {
    const { nodes } = parseUniversalDiagram(encodeURIComponent(XML_ASLI));
    for (const n of nodes) expect(n.label).not.toMatch(/%3C|%3E|%22/);
    expect(nodes.map((n) => n.label)).toContain("Kirim OTP SMS / WA");
  });

  it("posisi dan ukuran tiap bentuk ikut aslinya, bukan ditumpuk di satu titik", () => {
    const { nodes } = parseUniversalDiagram(encodeURIComponent(XML_ASLI));
    const mulai = nodes.find((n: any) => n.label === "Start") as any;
    const akhir = nodes.find((n: any) => n.label === "End") as any;

    expect(mulai.width).toBe(120);
    expect(mulai.height).toBe(60);
    expect(akhir.x - mulai.x).toBe(240);
    expect(akhir.y - mulai.y).toBe(360);
  });

  it("jenis dan warna bentuk ikut aslinya, bukan kotak indigo semua", () => {
    const { nodes } = parseUniversalDiagram(encodeURIComponent(XML_ASLI));
    const oleh = Object.fromEntries(nodes.map((n: any) => [n.label, n]));

    expect(oleh["Start"].type).toBe("oval");
    expect(oleh["Start"].color).toBe("green");
    expect(oleh["Data Rekening Kontan?"].type).toBe("diamond");
    expect(oleh["Data Rekening Kontan?"].color).toBe("yellow");
    expect(oleh["Kirim OTP SMS / WA"].color).toBe("blue");
    expect(oleh["End"].color).toBe("rose");
    expect(oleh["Buka rekening di wondr"].color).toBe("orange");
  });

  it("teks bebas tidak lagi diubah menjadi bentuk sungguhan", () => {
    const hasil = parseUniversalDiagram("rapatkan jadwal sprint minggu depan ya");
    expect(hasil.nodes).toEqual([]);
    expect(hasil.edges).toEqual([]);
  });

  it("mermaid yang asli tetap terbaca lewat jalur yang sama", () => {
    const hasil = parseUniversalDiagram("flowchart TD\n  A[Mulai] --> B[Selesai]");
    expect(hasil.nodes.length).toBeGreaterThanOrEqual(2);
    expect(hasil.edges.length).toBe(1);
  });
});

describe("warnaPaletTerdekat (#595)", () => {
  it("memetakan hex pastel bawaan draw.io ke nama palet LanPro", () => {
    expect(warnaPaletTerdekat("#d5e8d4")).toBe("green");
    expect(warnaPaletTerdekat("#ffe6cc")).toBe("orange");
    expect(warnaPaletTerdekat("#fff2cc")).toBe("yellow");
    expect(warnaPaletTerdekat("#dae8fc")).toBe("blue");
    expect(warnaPaletTerdekat("#f8cecc")).toBe("rose");
    expect(warnaPaletTerdekat("#e1d5e7")).toBe("purple");
  });

  it("putih, abu, hitam, dan 'none' TIDAK dipetakan", () => {
    expect(warnaPaletTerdekat("#ffffff")).toBeNull();
    expect(warnaPaletTerdekat("#f5f5f5")).toBeNull();
    expect(warnaPaletTerdekat("#000000")).toBeNull();
    expect(warnaPaletTerdekat("none")).toBeNull();
    expect(warnaPaletTerdekat(undefined)).toBeNull();
  });
});

describe("parseDrawIoXML masih menolak XML rusak", () => {
  it("XML tanpa mxCell tetap melempar, bukan menghasilkan papan kosong", () => {
    expect(() => parseDrawIoXML("<halo><dunia/></halo>")).toThrow();
  });
});
