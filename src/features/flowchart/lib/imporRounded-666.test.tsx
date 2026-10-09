/**
 * #666 — tiga kunci gaya draw.io yang selama ini dibuang: `rounded`,
 * `dashPattern`, dan `verticalAlign`.
 *
 * KENAPA INI PERBAIKAN, BUKAN TAMBAHAN. #655 menyamakan BENDELA papan dengan
 * draw.io (`rounded=0`), dan itu diam-diam merusak berkas yang justru menyetel
 * `rounded=1` — bentuk membulat datang bersudut tajam. Aturan yang benar:
 * nilai dari sumber menang, kosong berarti bawaan.
 */
import { gayaDrawIo } from "./gayaImpor";
import { parseUniversalDiagram } from "./importers";
import { getShapeThemeClasses } from "./nodeTheme";
import type { FlowNode } from "../types";

const bentuk = (lebih: Partial<FlowNode> = {}): FlowNode => ({
  id: "n1",
  type: "rect",
  x: 40,
  y: 40,
  label: "Satu",
  color: "yellow",
  width: 150,
  height: 70,
  ...lebih,
});

const pagar = (isi: string) =>
  '<mxfile><diagram id="d" name="a"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>' +
  isi +
  "</root></mxGraphModel></diagram></mxfile>";

describe("gayaDrawIo membaca tiga kunci yang dulu dibuang (#666)", () => {
  it("rounded=1, dashPattern dengan spasi, dan verticalAlign", () => {
    expect(gayaDrawIo("rounded=1;dashed=1;dashPattern=4 4;verticalAlign=top;html=1")).toMatchObject(
      { rounded: true, dashPattern: "4,4", verticalAlign: "top" }
    );
  });

  it("rounded=0 dan kunci yang tidak ada tidak menjadi pura-pura", () => {
    expect(gayaDrawIo("rounded=0;whiteSpace=wrap")).toMatchObject({});
    expect(gayaDrawIo("rounded=0").rounded).toBeUndefined();
    expect(gayaDrawIo("dashed=1").dashPattern).toBeUndefined();
  });

  it("verticalAlign yang bukan tiga nilai itu diabaikan, tidak ditebak", () => {
    expect(gayaDrawIo("verticalAlign=tengah").verticalAlign).toBeUndefined();
  });
});

describe("ketiga kunci itu sampai ke bentuk yang tersimpan (#666)", () => {
  const { nodes } = parseUniversalDiagram(
    pagar(
      '<mxCell id="a" value="Bulat" style="rounded=1;dashed=1;dashPattern=6 3;verticalAlign=bottom" vertex="1" parent="1"><mxGeometry x="40" y="40" width="120" height="60" as="geometry"/></mxCell>' +
        '<mxCell id="b" value="Tajam" style="rounded=0" vertex="1" parent="1"><mxGeometry x="300" y="40" width="120" height="60" as="geometry"/></mxCell>'
    ),
    "papan.drawio"
  );

  it("vertex dengan rounded=1 menyimpan permintaan itu", () => {
    expect(nodes[0].rounded).toBe(true);
    expect(nodes[0].dashPattern).toBe("6,3");
    expect(nodes[0].verticalAlign).toBe("bottom");
  });

  it("vertex tanpa rounded tetap memakai bawaan draw.io", () => {
    expect(nodes[1].rounded).toBeUndefined();
    expect(nodes[1].verticalAlign).toBeUndefined();
  });
});

describe("rect hanya membulat bila sumber memintanya (#666)", () => {
  it("tanpa rounded: tidak ada kelas radius sama sekali", () => {
    expect(getShapeThemeClasses(bentuk(), false)).not.toMatch(/rounded/);
  });

  it("rounded dari sumber: memakai langkah yang sudah ada di garis dasar", () => {
    const hasil = getShapeThemeClasses(bentuk({ rounded: true }), false);
    expect(hasil).toContain("rounded-lg");
    // `arcSize=10` draw.io paling dekat ke 8 px, bukan 12 px (#655 lama).
    expect(hasil).not.toContain("rounded-xl");
  });
});
