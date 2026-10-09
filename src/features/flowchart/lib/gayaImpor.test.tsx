/**
 * #650 — gaya asli diagram sumber harus ikut masuk, bukan hanya isinya.
 *
 * MENGAPA TEST INI ADA. Pemilik proyek mengimpor papan Miro-nya (08 Okt) dan
 * hasilnya "isinya sama tapi mukanya beda": catatan bergaris putus-putus jadi
 * kotak polos, label garis YA/TIDAK/EDC/QRIS lenyap, garis siku jadi lengkungan,
 * dan teks banyak baris MENEMPEL ("RingkasanData Merchant"). Yang terakhir itu
 * bukan soal Miro: parser membuang `<div>` tanpa jejak, padahal draw.io dan
 * Miro sama-sama menulis satu baris teks per `<div>`.
 *
 * DUA GENERASI API MIRO. Miro WebSDK dan REST memakai nama kunci yang berbeda
 * untuk hal yang sama (`strokeColor` vs `borderColor`; gaya bisa saudara `data`
 * atau ada `di dalam data`), dan berkas ekspor pemilik proyek belum di tangan.
 * Karena itu yang diuji di sini adalah KEDUA bentuk itu, bukan satu tebakan.
 */
import { parseMiroContent, parseUniversalDiagram } from "./importers";
import {
  gayaDariItem,
  gayaDrawIo,
  gayaGarisDariItem,
  gayaGarisDrawIo,
  potongTeks,
  tebalDariBitmask,
  tebalDariHtml,
  warnaTeksAman,
} from "./gayaImpor";

describe("warnaTeksAman: hanya hex yang boleh sampai ke DOM (#651)", () => {
  it("menerima hex tiga dan enam digit", () => {
    expect(warnaTeksAman("#b85450")).toBe("#b85450");
    expect(warnaTeksAman("#F8C")).toBe("#F8C");
  });

  it("menolak apa pun yang bukan hex — termasuk potongan CSS dan skrip", () => {
    for (const tolak of [
      "red",
      "#12345",
      "#gggggg",
      "#fff; position:fixed",
      "url(#pola)",
      "javascript:alert(1)",
      "",
      undefined,
      null,
    ]) {
      expect(warnaTeksAman(tolak as string)).toBeNull();
    }
  });
});

describe("tebal huruf dari sumber (#651)", () => {
  it("bitmask draw.io: bit 1 tebal, bit 2 miring bukan", () => {
    expect(tebalDariBitmask(1)).toBe(true);
    expect(tebalDariBitmask("3")).toBe(true);
    expect(tebalDariBitmask(2)).toBe(false);
    expect(tebalDariBitmask(0)).toBe(false);
    expect(tebalDariBitmask(undefined)).toBe(false);
  });

  it("Miro hanya menyimpan tebal di HTML teksnya", () => {
    expect(tebalDariHtml("<div><b>Kriteria</b> password:</div>")).toBe(true);
    expect(tebalDariHtml('<span style="font-weight:700">x</span>')).toBe(true);
    expect(tebalDariHtml("<div>Kriteria password:</div>")).toBe(false);
    expect(tebalDariHtml(undefined)).toBe(false);
  });
});

describe("potongTeks: baris sumber tidak boleh menempel (#650)", () => {
  it("setiap </div> adalah batas baris, bukan ruang yang dibuang", () => {
    expect(potongTeks("<div>Ringkasan</div><div>Data Merchant</div>")).toBe(
      "Ringkasan\nData Merchant"
    );
  });

  it("<br> dan </p> tetap batas baris; tag tebal dibuang tapi teksnya tinggal", () => {
    expect(potongTeks("<b>Input</b> nomor<br>hp")).toBe("Input nomor\nhp");
    expect(potongTeks("<p>1. Kirim OTP</p><p>2. Verifikasi</p>")).toBe(
      "1. Kirim OTP\n2. Verifikasi"
    );
  });

  it("baris kosong tunggal tetap ada, tumpukan kosong diringkas, tepi dipangkas", () => {
    expect(potongTeks("<p>a</p><p></p><p>b</p>")).toBe("a\n\nb");
    expect(potongTeks("<div>x</div><div></div><div></div><div></div><div>y</div>")).toBe("x\n\ny");
    expect(potongTeks("  Cek status  ")).toBe("Cek status");
  });

  it("teks polos tanpa markup tidak berubah sedikit pun", () => {
    expect(potongTeks("Kirim OTP SMS / WA")).toBe("Kirim OTP SMS / WA");
  });
});

describe("gayaDariItem: dua generasi API Miro dibaca keduanya (#650)", () => {
  it("REST: gaya saudara `data`, tepi bernama `borderColor`", () => {
    const item = {
      type: "shape",
      data: { shape: "rounded_rect", content: "Buka wondr merchant" },
      style: {
        fillColor: "#fff2cc",
        borderColor: "#d6b656",
        fontSize: 14,
        textAlign: "left",
        borderStyle: "dashed",
        borderWidth: 1,
      },
    };
    expect(gayaDariItem(item)).toMatchObject({
      fillHex: "#fff2cc",
      strokeHex: "#d6b656",
      fontSize: 14,
      align: "left",
      dashed: true,
      strokeWidth: 1,
      bentukHint: "shape rounded_rect",
    });
  });

  it("WebSDK: gaya di DALAM `data`, tepi bernama `strokeColor`", () => {
    const item = {
      type: "shape",
      data: {
        shape: "sticky_note",
        style: { fillColor: "#f8cecc", strokeColor: "#b85450", fontSize: 12 },
      },
    };
    const gaya = gayaDariItem(item);
    expect(gaya.fillHex).toBe("#f8cecc");
    expect(gaya.strokeHex).toBe("#b85450");
    expect(gaya.fontSize).toBe(12);
    expect(gaya.bentukHint).toContain("sticky_note");
  });

  it("item tanpa gaya tidak mengarang angka: kosong berarti kosong", () => {
    const gaya = gayaDariItem({ type: "shape", data: { content: "X" } });
    expect(gaya.fillHex).toBe("");
    expect(gaya.strokeHex).toBe("");
    expect(gaya.fontHex).toBe("");
    expect(gaya.fontSize).toBeUndefined();
    expect(gaya.align).toBeUndefined();
    expect(gaya.dashed).toBeFalsy();
    expect(gaya.bold).toBeFalsy();
    expect(gaya.strokeWidth).toBeUndefined();
  });

  it("warna huruf dan bitmask tebal ikut terbaca", () => {
    const gaya = gayaDariItem({
      type: "shape",
      data: { content: "X" },
      style: { color: "#b85450", fontStyle: 1 },
    });
    expect(gaya.fontHex).toBe("#b85450");
    expect(gaya.bold).toBe(true);
  });

  it("`fontStyle` Miro bukan medan `fontStyle` kita: miring tidak dianggap tebal", () => {
    // Nama kunci sama, arti beda. `fontStyle: 2` di draw.io/Miro = miring,
    // sedangkan `fontStyle` di FlowNode = sans/serif/mono. Yang pertama tidak
    // boleh bocor ke yang kedua.
    const gaya = gayaDariItem({ type: "shape", style: { fontStyle: 2 } });
    expect(gaya.bold).toBe(false);
    expect(gaya.fontHex).toBe("");
  });

  it("bukan objek sama sekali tidak melempar", () => {
    expect(gayaDariItem(null).fillHex).toBe("");
    expect(gayaDariItem("miro").bentukHint).toBe("");
  });
});

describe("gayaGarisDariItem: label dan bentuk jalur (#650)", () => {
  it("captions WebSDK + jalur elbowed + garis putus-putus", () => {
    const item = {
      type: "connector",
      style: { shape: "elbowed", strokeStyle: "dashed" },
      captions: [{ text: "YA" }],
    };
    expect(gayaGarisDariItem(item)).toEqual({
      label: "YA",
      connector: "orthogonal",
      strokeStyle: "dashed",
    });
  });

  it("captions REST di dalam data + jalur curved", () => {
    const item = {
      type: "connector",
      data: { captions: [{ text: "TIDAK" }] },
      style: { shape: "curved" },
    };
    expect(gayaGarisDariItem(item)).toMatchObject({ label: "TIDAK", connector: "bezier" });
  });

  it("sumber tanpa bentuk jalur tidak dikira-kira", () => {
    expect(gayaGarisDariItem({ label: "EDC" })).toEqual({ label: "EDC" });
  });
});

describe("gaya draw.io (#650)", () => {
  it("string style dibaca: dashed, fontSize, align, strokeWidth", () => {
    expect(
      gayaDrawIo("rounded=1;whiteSpace=wrap;html=1;dashed=1;fontSize=14;align=left;strokeWidth=1")
    ).toEqual({ dashed: true, fontSize: 14, align: "left", strokeWidth: 1 });
  });

  it("style tanpa gaya kembali kosong supaya bawaan papan yang berlaku", () => {
    expect(gayaDrawIo("rounded=1;whiteSpace=wrap")).toEqual({});
  });

  it("fontStyle bitmask dan fontColor ikut terbaca", () => {
    expect(gayaDrawIo("rounded=1;fontStyle=1;fontColor=#b85450")).toEqual({
      bold: true,
      fontHex: "#b85450",
    });
    // fontStyle=4 di draw.io adalah garis bawah — bukan tebal.
    expect(gayaDrawIo("fontStyle=4").bold).toBeUndefined();
  });

  it("edgeStyle orthogonal, curved=1, dan dashed=1 pada garis", () => {
    expect(gayaGarisDrawIo("edgeStyle=orthogonalEdgeStyle;html=1;")).toMatchObject({
      connector: "orthogonal",
    });
    expect(gayaGarisDrawIo("curved=1;dashed=1;")).toMatchObject({
      connector: "bezier",
      strokeStyle: "dashed",
    });
  });
});

describe("parseMiroContent JSON: gaya asli sampai ke node dan edge (#650)", () => {
  const papanMiro = JSON.stringify({
    data: [
      {
        id: "n1",
        type: "shape",
        position: { x: 100, y: 100 },
        width: 150,
        height: 70,
        data: {
          shape: "rounded_rect",
          textHtml: "<div>Ringkasan</div><div>Data Merchant</div>",
        },
        style: { fillColor: "#fff2cc", borderColor: "#d6b656", fontSize: 14, textAlign: "left" },
      },
      {
        id: "n2",
        type: "shape",
        position: { x: 320, y: 100 },
        width: 150,
        height: 70,
        data: { shape: "rounded_rect", content: "Keterangan catatan" },
        style: { fillColor: "#e1d5e7", borderStyle: "dashed" },
      },
      {
        id: "c1",
        type: "connector",
        start: { id: "n1" },
        end: { id: "n2" },
        captions: [{ text: "YA" }],
        style: { shape: "elbowed" },
      },
    ],
  });

  it("warna isian Miro dipetakan ke palet LanPro, bukan ditebak dari nama bentuk", () => {
    const { nodes } = parseMiroContent(papanMiro, false);
    expect(nodes[0].color).toBe("yellow");
    expect(nodes[1].color).toBe("purple");
  });

  it("ukuran huruf, perataan, dan garis putus-putus ikut masuk", () => {
    const { nodes } = parseMiroContent(papanMiro, false);
    expect(nodes[0].fontSize).toBe(14);
    expect(nodes[0].align).toBe("left");
    expect(nodes[1].borderStyle).toBe("dashed");
  });

  it("teks dua baris tidak menempel lagi", () => {
    expect(parseMiroContent(papanMiro, false).nodes[0].label).toBe("Ringkasan\nData Merchant");
  });

  it("tebal dari HTML teks dan warna huruf dari gaya ikut masuk (#651)", () => {
    const { nodes } = parseMiroContent(
      JSON.stringify({
        data: [
          {
            id: "b1",
            type: "shape",
            data: { shape: "rounded_rect", textHtml: "<div><b>Kriteria</b> password:</div>" },
            style: { color: "#b85450" },
          },
          {
            id: "b2",
            type: "shape",
            data: { shape: "rounded_rect", content: "biasa saja" },
          },
        ],
      }),
      false
    );
    expect(nodes[0].fontWeight).toBe("bold");
    expect(nodes[0].fontColor).toBe("#b85450");
    expect(nodes[0].label).toBe("Kriteria password:");
    expect(nodes[1].fontWeight).toBeUndefined();
    expect(nodes[1].fontColor).toBeUndefined();
  });

  it("label garis dan jalur bersiku dipulangkan", () => {
    const { edges } = parseMiroContent(papanMiro, false);
    expect(edges[0]).toMatchObject({ label: "YA", connector: "orthogonal" });
  });

  it("item tanpa gaya tetap dapat bawaan, dan bawaan itu tidak berubah diam-diam", () => {
    const { nodes } = parseMiroContent(
      JSON.stringify([{ id: "x", type: "shape", data: { shape: "ellipse", content: "Mulai" } }]),
      false
    );
    expect(nodes[0]).toMatchObject({
      color: "emerald",
      // #654 — 12 px, bukan 13: bawaan huruf papan disamakan dengan draw.io.
      fontSize: 12,
      align: "center",
      borderStyle: "solid",
      // #655 — bawaan tepi draw.io 1 px, dan angkanya sekarang benar-benar
      // dipakai perender, bukan disimpan lalu dibuang.
      strokeWidth: 1,
    });
  });
});

describe("parseUniversalDiagram draw.io: gaya string style ikut masuk (#650)", () => {
  const xml = `
    <mxGraphModel>
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="2" value="&lt;div&gt;Kriteria password:&lt;/div&gt;&lt;div&gt;1. 8-12 karakter&lt;/div&gt;" style="rounded=1;fillColor=#e1d5e7;dashed=1;fontSize=14;align=left;fontStyle=1;fontColor=#b85450" vertex="1">
          <mxGeometry x="40" y="80" width="160" height="120" />
        </mxCell>
        <mxCell id="3" value="Lanjut" style="edgeStyle=orthogonalEdgeStyle;dashed=1" edge="1" source="2" target="4" />
        <mxCell id="4" value="Selesai" style="ellipse" vertex="1">
          <mxGeometry x="300" y="80" width="120" height="60" />
        </mxCell>
      </root>
    </mxGraphModel>`;

  it("dashed, ukuran huruf, perataan, dan warna asli terbawa", () => {
    const { nodes } = parseUniversalDiagram(xml, "papan.drawio");
    const catatan = nodes.find((n) => n.id === "drawio-2");
    expect(catatan?.borderStyle).toBe("dashed");
    expect(catatan?.fontSize).toBe(14);
    expect(catatan?.align).toBe("left");
    expect(catatan?.color).toBe("purple");
  });

  it("tebal dan warna huruf draw.io ikut masuk (#651)", () => {
    const { nodes } = parseUniversalDiagram(xml, "papan.drawio");
    const catatan = nodes.find((n) => n.id === "drawio-2");
    expect(catatan?.fontWeight).toBe("bold");
    expect(catatan?.fontColor).toBe("#b85450");
    // Bentuk kedua tidak menuliskan keduanya: jangan sampai ikut terisi.
    const selesai = nodes.find((n) => n.id === "drawio-4");
    expect(selesai?.fontWeight).toBeUndefined();
    expect(selesai?.fontColor).toBeUndefined();
  });

  it("setiap baris <div> tetap baris terpisah", () => {
    const { nodes } = parseUniversalDiagram(xml, "papan.drawio");
    expect(nodes.find((n) => n.id === "drawio-2")?.label).toBe(
      "Kriteria password:\n1. 8-12 karakter"
    );
  });

  it("garis orthogonal dan putus-putus tidak lagi dilengkungkan bawaan papan", () => {
    const { edges } = parseUniversalDiagram(xml, "papan.drawio");
    expect(edges[0]).toMatchObject({ connector: "orthogonal", strokeStyle: "dashed" });
  });
});
