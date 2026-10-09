/**
 * #657 — hex asli dari berkas sumber ikut disimpan dan dipakai.
 *
 * MENGAPA INI ITEM TERBESAR. `warnaPaletTerdekat()` (`lib/importers.ts:78`)
 * menghitung jarak HSL ke `colorPaletteHex` dan mengembalikan NAMA warna, jadi
 * `#fad992` tidak pernah tersimpan; dan pada baris `:98` hex dengan saturasi di
 * bawah 0,12 dikembalikan sebagai `null` - artinya kotak PUTIH dan abu-abu,
 * dua warna paling sering di draw.io, justru dilepas lalu jatuh ke tebakan nama
 * bentuk (`indigo`). Probe 09 Okt mengukur itu pada kolam `fillColor=#f5f5f5`.
 *
 * Yang di sini hanya jalur hex-nya. Palet dua belas nama tetap hidup untuk
 * bentuk yang dibuat dari nol di papan.
 */
import { gayaDrawIo } from "./gayaImpor";
import { warnaSumberBentuk } from "./gayaBentuk";
import { parseUniversalDiagram } from "./importers";

const pagar = (isi: string) =>
  '<mxfile><diagram id="d" name="a"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>' +
  isi +
  "</root></mxGraphModel></diagram></mxfile>";

const bentuk = (id: string, style: string, x = 40) =>
  `<mxCell id="${id}" value="${id}" style="${style}" vertex="1" parent="1"><mxGeometry x="${x}" y="40" width="120" height="60" as="geometry"/></mxCell>`;

describe("gayaDrawIo membaca fillColor dan strokeColor apa adanya (#657)", () => {
  it("hex bukan nama palet tetap tersimpan", () => {
    expect(gayaDrawIo("fillColor=#fad992;strokeColor=#d79b00")).toMatchObject({
      fillHex: "#fad992",
      strokeHex: "#d79b00",
    });
  });

  it("putih dan abu-abu TIDAK dilepas lagi", () => {
    expect(gayaDrawIo("fillColor=#ffffff;strokeColor=#f5f5f5")).toMatchObject({
      fillHex: "#ffffff",
      strokeHex: "#f5f5f5",
    });
  });

  it("default berarti ikut papan, bukan warna bernama default", () => {
    expect(gayaDrawIo("fillColor=default;strokeColor=default").fillHex).toBeUndefined();
    expect(gayaDrawIo("fillColor=default;strokeColor=default").strokeHex).toBeUndefined();
  });

  it("tanpa warna sama sekali tidak mengarang", () => {
    expect(gayaDrawIo("rounded=1;whiteSpace=wrap")).toMatchObject({});
  });
});

describe("hex sumber disimpan di bentuk hasil impor (#657)", () => {
  it("draw.io: warna yang bukan anggota palet tetap utuh", () => {
    const { nodes } = parseUniversalDiagram(
      pagar(bentuk("a", "rounded=1;fillColor=#fad992;strokeColor=#d79b00")),
      "papan.drawio"
    );
    expect(nodes[0].fillHex).toBe("#fad992");
    expect(nodes[0].strokeHex).toBe("#d79b00");
  });

  it("kolam abu-abu draw.io tidak lagi jatuh ke warna ungu", () => {
    const { nodes } = parseUniversalDiagram(
      pagar(bentuk("a", "swimlane;fillColor=#f5f5f5;strokeColor=#666666")),
      "papan.drawio"
    );
    expect(nodes[0].fillHex).toBe("#f5f5f5");
    expect(nodes[0].strokeHex).toBe("#666666");
  });

  it("Miro: jalur gayanya sendiri ikut menyimpan hex", () => {
    const { nodes } = parseUniversalDiagram(
      JSON.stringify([
        {
          id: "m1",
          type: "shape",
          data: { shape: "rectangle", content: "Satu" },
          style: { fillColor: "#e6d0de", borderColor: "#99618d" },
        },
      ]),
      "papan.json"
    );
    expect(nodes[0].fillHex).toBe("#e6d0de");
    expect(nodes[0].strokeHex).toBe("#99618d");
  });
});

describe("perender hanya memakai hex yang sah (#657, penjaga pintu)", () => {
  it("hex tiga dan enam digit diterima", () => {
    expect(warnaSumberBentuk({ fillHex: "#fff", strokeHex: "#d79b00" })).toEqual({
      isi: "#fff",
      tepi: "#d79b00",
    });
  });

  it("isi yang bukan hex TIDAK menemukan jalan ke pemilih warna", () => {
    for (const jahat of [
      "javascript:alert(1)",
      "red; } body {",
      "url(#x)",
      "#12345",
      "",
      undefined,
    ]) {
      expect(warnaSumberBentuk({ fillHex: jahat, strokeHex: jahat })).toEqual({
        isi: undefined,
        tepi: undefined,
      });
    }
  });

  it("bentuk buatan papan tidak punya hex, jadi palet yang berlaku", () => {
    expect(warnaSumberBentuk({})).toEqual({ isi: undefined, tepi: undefined });
  });
});
