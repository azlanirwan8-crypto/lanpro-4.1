/**
 * @jest-environment jsdom
 *
 * #752 — peta bentuk draw.io → tipe native.
 *
 * SEBELUM ITEM INI. Papan bisa menggambar 208 bentuk (dijaga
 * `katalog-bentuk.test.ts`), tetapi penjeraf impor hanya punya 13 cabang
 * `style.includes(...)`, jadi dari seluruh perbendaharaan itu hanya **12 tipe**
 * yang pernah bisa dihasilkan dari berkas draw.io.
 *
 * PELAJARAN YANG MEMBENTUK TEST INI. Versi pertama tabel #752 berisi 206 kunci
 * `shape=` yang DIKARANG dari ingatan (`mxgraph.bpmn.user_task`,
 * `mxgraph.uml.note`, `mxgraph.er.entity`, `mxgraph.aws.*`). Angka "190 tipe
 * terjangkau" yang dilaporkannya mengukur karangan itu, bukan draw.io. Ketahuan
 * hanya karena corpus sungguhan (`Sidebar-*.js` draw.io, 3067 gaya) dijalankan
 * melintasi penjeraf: 206 dari 248 kunci tidak ada di draw.io sama sekali.
 * Karena itu penjaga nomor 3 di bawah membaca `kamusBentukDrawio.ts`, bukan
 * mengukur dirinya sendiri.
 *
 * YANG DIJAGA DI SINI, dan kenapa tiap penjaga ada:
 *
 * 1. **Setiap tipe yang dipetakan HARUS tergambar.** Memetakan `shape=tape` ke
 *    tipe yang tidak punya gambar menghasilkan bentuk TAK TERLIHAT di kanvas —
 *    lebih buruk daripada `rect` polos, dan tidak ada test lain yang
 *    menangkapnya. #620 menutup lubang yang sama dari sisi palet; baris ini
 *    menutupnya dari sisi impor.
 * 2. **Setiap NAMA yang dipetakan HARUS ada di draw.io.** Baca paragraf
 *    pelajaran di atas.
 * 3. **Perilaku yang dikunci #667 tidak boleh berubah.** Tabel baru menimpa
 *    tipe, bukan menulis ulang sejarah.
 * 4. **Stensil vendor asing tetap tak dikenal, dan karena itu tetap dilaporkan.**
 *    #685 mengunci "fitur yang tidak didukung harus dinyatakan, bukan dibuang
 *    diam-diam"; `putuskanImpor-685.test.tsx:55` mengasersi lapornya.
 */
import React from "react";
import { DIAGRAM_SHAPE_GROUPS } from "../constants";
import { customSvgTypes } from "./shapes";
import { BENTUK_BARE_DRAWIO, BENTUK_PUSTAKA_DRAWIO } from "./kamusBentukDrawio";
import {
  KATA_BENTUK_DIKENALI,
  PETA_KELUARGA,
  PETA_PUSTAKA,
  PETA_SHAPE,
  PETA_TOKEN,
  bentukDariGayaDrawio,
  hitungTipeTerjangkau,
} from "./petaBentukDrawio";
import { parseDrawIoXML } from "./importers";

const TIPE_PALET = new Set<string>(
  DIAGRAM_SHAPE_GROUPS.flatMap((g) => g.items.map((i) => i.type as string))
);

/**
 * Dua tipe sah yang DIGAMBAR khusus tetapi tidak ditawarkan palet kiri, jadi
 * pengecualiannya harus disebut, bukan disembunyikan di dalam set longgar:
 *  - `decision` — `FlowchartNode.tsx:155` memperlakukannya sebagai varian
 *    belah ketupat (`isDiamond`), dan `FlowchartMinimap.tsx:228` memutarnya 45°.
 *    draw.io `mxgraph.flowchart.decision` memang belah ketupat, jadi petanya
 *    benar secara visual, bukan kebetulan.
 *  - `text` — jatuh ke bingkai div, dan itu persis yang benar untuk label
 *    draw.io `style=text`: penjeraf sudah memaksa `fillNone` (`importers.ts:546`)
 *    sehingga bingkainya transparan dan yang tampak hanya tulisannya.
 */
const TIPE_LAMA_TERGAMBAR = new Set<string>(["decision", "text"]);

const TIPE_TERGAMBAR = new Set<string>([...TIPE_PALET, ...customSvgTypes, ...TIPE_LAMA_TERGAMBAR]);

/** Nama draw.io sah, dinormalkan kecil karena `bentukDariGayaDrawio` mengecilkan. */
const BARE_SAH = new Set(BENTUK_BARE_DRAWIO.map((n) => n.toLowerCase()));
const PUSTAKA_SAH: Record<string, Set<string>> = Object.fromEntries(
  Object.entries(BENTUK_PUSTAKA_DRAWIO).map(([lib, nama]) => [
    lib,
    new Set(nama.map((n) => n.toLowerCase())),
  ])
);

const SEMUA_PETAAN: [string, string][] = [
  ...Object.entries(PETA_SHAPE).map(([k, v]) => [`shape=${k}`, v] as [string, string]),
  ...Object.entries(PETA_TOKEN).map(([k, v]) => [k, v] as [string, string]),
  ...Object.entries(PETA_PUSTAKA).flatMap(([lib, tabel]) =>
    Object.entries(tabel).map(([suf, v]) => [`shape=${lib}.${suf}`, v] as [string, string])
  ),
];

describe("#752 setiap bentuk yang dipetakan benar-benar tergambar", () => {
  it("tidak ada satu pun tipe hasil peta yang gaib di kanvas", () => {
    const gaib = SEMUA_PETAAN.filter(([, tipe]) => !TIPE_TERGAMBAR.has(tipe));
    expect(gaib).toEqual([]);
  });

  it("petanya tidak merosot kembali menjadi 'semua ke rect'", () => {
    // `rect` adalah JATUHAN BAWAAN penjeraf, jadi memetakan sesuatu ke sana
    // tidak menambah informasi apa pun — persis kerusakan yang #752 perbaiki.
    // Beberapa entri memang benar berakhir di `rect` (terminator draw.io adalah
    // persegi panjang bersudut tumpul), tetapi ia tidak boleh jadi tujuan utama.
    const frekuensi = new Map<string, number>();
    for (const [, tipe] of SEMUA_PETAAN) frekuensi.set(tipe, (frekuensi.get(tipe) ?? 0) + 1);
    const tersering = [...frekuensi.entries()].sort((a, b) => b[1] - a[1])[0];
    expect(tersering[0]).not.toBe("rect");
    expect(frekuensi.get("rect") ?? 0).toBeLessThan(SEMUA_PETAAN.length / 20);
    // Ratchet: diukur 15 Okt = 142. Turun berarti ada bentuk kehilangan petanya.
    expect(frekuensi.size).toBeGreaterThanOrEqual(142);
  });

  it("kunci petanya tidak dobel antar-lapisan dengan arti berbeda", () => {
    // `shape=X` (lapis 1) dan token telanjang `X` (lapis 3) boleh menunjuk tipe
    // yang sama; yang dilarang adalah keduanya menunjuk tipe BERBEDA, karena
    // saat itu satu berkas draw.io bisa berarti dua hal tergantung letak tokennya.
    const bentrok: string[] = [];
    for (const [kunci, tipe] of Object.entries(PETA_SHAPE)) {
      const dariToken = (PETA_TOKEN as Record<string, string>)[kunci];
      if (dariToken && dariToken !== tipe) bentrok.push(`${kunci}: ${tipe} vs ${dariToken}`);
    }
    expect(bentrok).toEqual([]);
  });
});

describe("#752 setiap NAMA yang dipetakan ada di draw.io sungguhan", () => {
  it("kunci lapis `shape=` adalah nama bentuk telanjang draw.io", () => {
    // Sumber kebenaran: `kamusBentukDrawio.ts`, diekstrak dari `app.min.js`
    // draw.io — bukan dari tabel yang sedang diuji.
    const karangan = Object.keys(PETA_SHAPE).filter((k) => !BARE_SAH.has(k.toLowerCase()));
    expect(karangan).toEqual([]);
  });

  it("kunci lapis pustaka adalah stensil `mxgraph.<lib>.<nama>` yang nyata", () => {
    const karangan: string[] = [];
    for (const [lib, tabel] of Object.entries(PETA_PUSTAKA)) {
      const sah = PUSTAKA_SAH[lib];
      if (!sah) {
        karangan.push(`${lib}: namespace ini tidak ada di draw.io`);
        continue;
      }
      for (const suf of Object.keys(tabel)) {
        // `cariDiPustaka` mengupas titik demi titik, jadi sufiks bertitik
        // (`forms.combobox`) cocok bila segmen akhirnya terdaftar.
        const cocok = suf.split(".").some((_, i, a) => sah.has(a.slice(i).join(".")));
        if (!cocok) karangan.push(`${lib}.${suf}`);
      }
    }
    expect(karangan).toEqual([]);
  });

  it("kunci lapis keluarga adalah segmen pertama yang nyata di pustakanya", () => {
    const karangan: string[] = [];
    for (const [lib, tabel] of Object.entries(PETA_KELUARGA)) {
      const sah = PUSTAKA_SAH[lib];
      if (!sah) {
        karangan.push(`${lib}: namespace ini tidak ada di draw.io`);
        continue;
      }
      for (const keluarga of Object.keys(tabel)) {
        const ada = [...sah].some((n) => n === keluarga || n.startsWith(`${keluarga}.`));
        if (!ada) karangan.push(`${lib}.${keluarga}`);
      }
    }
    expect(karangan).toEqual([]);
  });

  it("namespace yang TIDAK PERNAH ada di draw.io tidak dipakai lagi", () => {
    // v1 tabel memetakan ke `mxgraph.uml.*`, `mxgraph.er.*`, dan `mxgraph.aws.*`.
    // Ketiganya karangan: draw.io memakai `mxgraph.uml25`, menyusun diagram ER
    // dari bentuk dasar, dan memakai `mxgraph.aws4`.
    for (const palsu of ["mxgraph.uml", "mxgraph.er", "mxgraph.aws", "mxgraph.gcp"]) {
      expect(PETA_PUSTAKA[palsu]).toBeUndefined();
      expect(PETA_KELUARGA[palsu]).toBeUndefined();
    }
  });
});

describe("#752 cakupan peta terukur, bukan diklaim", () => {
  it("menjangkau jauh lebih dari 12 tipe native", () => {
    // Sebelum #752: 12. Diukur 15 Okt sesudah tabel dikoreksi ke nama nyata: 145.
    // Angka ini tidak boleh turun — penurunan berarti ada bentuk yang diam-diam
    // kehilangan petanya.
    expect(hitungTipeTerjangkau()).toBeGreaterThanOrEqual(145);
  });

  it("laporan batas membaca perbendaharaan yang sama dengan penjeraf", () => {
    expect(KATA_BENTUK_DIKENALI.size).toBeGreaterThan(200);
    // Kata yang dikenali rantai lama harus tetap dikenali, supaya tidak ada
    // bentuk yang dilaporkan hilang padahal tergambar.
    for (const lama of ["db", "preprocess", "class", "lambda", "sticky", "cloud", "note"]) {
      expect(KATA_BENTUK_DIKENALI.has(lama)).toBe(true);
    }
  });
});

describe("#752 perilaku yang dikunci #667 tidak berubah", () => {
  it.each([
    ["shape=process;whiteSpace=wrap;html=1", "subprocess"],
    ["ellipse;shape=cloud;whiteSpace=wrap;html=1", "cloud"],
    ["ellipse;whiteSpace=wrap", "oval"],
    ["rhombus;whiteSpace=wrap", "diamond"],
    ["shape=note;whiteSpace=wrap", "sticky"],
    ["shape=cylinder3;whiteSpace=wrap", "cylinder"],
    ["shape=parallelogram;perimeter=parallelogramPerimeter", "parallelogram"],
  ])("%s -> %s", (gaya, harap) => {
    expect(bentukDariGayaDrawio(gaya.toLowerCase())).toBe(harap);
  });
});

describe("#752 bentuk yang dulu jatuh ke rect polos", () => {
  // Setiap gaya di bawah adalah ejaan VERBATIM dari corpus sidebar draw.io,
  // termasuk huruf besar-kecilnya yang asli — penjeraf harus mengecilkan sendiri.
  it.each([
    ["shape=hexagon;perimeter=hexagonPerimeter2", "hexagon"],
    ["shape=trapezoid;perimeter=trapezoidPerimeter", "trapezoid"],
    ["triangle;direction=north", "triangle"],
    ["shape=step;perimeter=stepPerimeter", "homePlate"],
    ["shape=cube", "cube"],
    ["swimlane;html=1;startSize=20", "laneVertical"],
    ["shape=mxgraph.bpmn.task2;taskMarker=user", "bpmnUserTask"],
    ["shape=note2", "umlNote"],
    ["shape=associativeEntity;whiteSpace=wrap;html=1", "erEntity"],
    ["shape=mxgraph.flowchart.extract_or_measurement", "extract"],
    ["shape=mxgraph.networks.wireless_hub", "netWirelessAp"],
    ["shape=mxgraph.mockup.forms.comboBox", "uiDropdown"],
    ["shape=doubleArrow", "arrowLeftRight"],
    ["shape=tape", "draftDocument"],
  ])("%s -> %s", (gaya, harap) => {
    expect(bentukDariGayaDrawio(gaya)).toBe(harap);
  });

  it("namespace bersarang dua tingkat tetap dikenali", () => {
    expect(bentukDariGayaDrawio("shape=mxgraph.electrical.logic_gates.inverter_2")).toBe("gateNot");
  });

  it("stensil berparameter dibaca lewat parameternya, bukan namanya", () => {
    // draw.io menggambar 217 entri sidebar BPMN dari ENAM stensil saja, dan enam
    // gerbang logika dari SATU stensil. Memetakan nama saja tidak akan pernah
    // cukup; pembedanya ada di parameter.
    expect(
      bentukDariGayaDrawio("shape=mxgraph.electrical.logic_gates.logic_gate;operation=and")
    ).toBe("gateAnd");
    expect(
      bentukDariGayaDrawio(
        "shape=mxgraph.electrical.logic_gates.logic_gate;operation=and;negating=1"
      )
    ).toBe("gateNand");
    expect(bentukDariGayaDrawio("shape=mxgraph.bpmn.gateway2;gwType=parallel")).toBe(
      "bpmnAndGateway"
    );
    expect(bentukDariGayaDrawio("shape=mxgraph.bpmn.event;symbol=timer")).toBe("bpmnTimerEvent");
    // Tiga jenis aktivitas BPMN (call, subprocess, transaction) semuanya
    // digambar draw.io sebagai kotak berlapis; palet native hanya punya satu
    // tipe aktivitas, jadi ketiganya berkumpul di sana.
    expect(bentukDariGayaDrawio("shape=mxgraph.bpmn.task2;bpmnShapeType=subprocess")).toBe(
      "bpmnActivity"
    );
  });

  it("poligon beraturan dibedakan dari jumlah titiknya", () => {
    // `mxgraph.basic.polygon` adalah SATU stensil untuk semua poligon; tanpa
    // `polyCoords` ia tidak menggambar apa pun yang bisa dikenali. Jumlah titik
    // = jumlah `[` dikurangi kurung pembungkus.
    const poligon = (titik: number) =>
      `shape=mxgraph.basic.polygon;polyCoords=[${Array.from(
        { length: titik },
        (_, i) => `[${i},0]`
      ).join(",")}]`;
    expect(bentukDariGayaDrawio(poligon(5))).toBe("pentagon");
    expect(bentukDariGayaDrawio(poligon(6))).toBe("hexagon");
    expect(bentukDariGayaDrawio(poligon(8))).toBe("octagon");
    expect(bentukDariGayaDrawio(poligon(9))).toBe("nonagon");
    // draw.io memang punya poligon 10 titik, tetapi palet native berhenti di 9.
    // Ini kerugian yang dinyatakan, bukan tebakan yang salah.
    expect(bentukDariGayaDrawio(poligon(10))).toBeNull();
  });

  it("swimlane membalik arah bila sumber meminta judul di kiri", () => {
    expect(bentukDariGayaDrawio("swimlane;horizontal=0;startSize=20")).toBe("laneHorizontal");
    expect(bentukDariGayaDrawio("swimlane;html=1;startSize=20")).toBe("laneVertical");
  });

  it("arah panah draw.io dibaca dari `direction=`, bukan dari nama", () => {
    // Sidebar Arrows2 draw.io: "Arrow Up" = `shape=mxgraph.arrows2.arrow;dy=0.6;
    // dx=40;direction=north`. TIDAK ADA `up_arrow`/`down_arrow`/`left_arrow` di
    // `mxgraph.arrows2` — v1 tabel mengarang ketiganya.
    expect(bentukDariGayaDrawio("shape=mxgraph.arrows2.arrow;dy=0.6;dx=40;direction=north")).toBe(
      "arrowUp"
    );
    expect(bentukDariGayaDrawio("shape=mxgraph.arrows2.arrow;dy=0.6;dx=40;direction=south")).toBe(
      "arrowDown"
    );
    expect(bentukDariGayaDrawio("shape=mxgraph.arrows2.arrow;dy=0.6;dx=40")).toBe("arrowRight");
  });

  it("teks bebas jadi tipe text, dan gambar jadi penanda tempat — bukan kotak berisi", () => {
    expect(bentukDariGayaDrawio("text;html=1;strokecolor=none;fillcolor=none")).toBe("text");
    expect(bentukDariGayaDrawio("shape=image;image=data:image/png;base64,aa")).toBe(
      "uiImagePlaceholder"
    );
  });
});

describe("#752 yang tidak dikenal TIDAK ditebak", () => {
  it.each([
    // Stensil vendor yang tidak kita punya ikonnya. `aws4.queue` nyata di
    // draw.io tetapi palet native hanya punya 7 ikon AWS, jadi ia SENGAJA tidak
    // dipetakan dan tetap dilaporkan.
    "shape=mxgraph.aws4.queue",
    "shape=mxgraph.gcp.some_service",
    "shape=mxgraph.signs.healthcare.heart",
    // Gaya persegi panjang biasa: tidak mendeklarasikan bentuk sama sekali.
    "rounded=1;whiteSpace=wrap;html=1",
    "whiteSpace=wrap;html=1;fillColor=#dae8fc",
  ])("%s -> null (jadi rect DAN dilaporkan)", (gaya) => {
    expect(bentukDariGayaDrawio(gaya.toLowerCase())).toBeNull();
  });

  it("`shape=or` dan `shape=xor` BUKAN lingkaran logika, jadi tidak dipetakan", () => {
    // Sidebar General draw.io "And"/"Or" memakai `shape=or`/`shape=xor`, dan
    // `app.min.js` menunjukkan keduanya menurunkan `mxActor` — `or` berbentuk D,
    // `xor` berbentuk bulan sabit. Memetakannya ke `gateOr`/`gateXor` akan
    // menggambar gerbang logika untuk bentuk yang bukan gerbang logika.
    // Lingkaran logika yang sebenarnya adalah `mxgraph.flowchart.or_2` dan
    // `mxgraph.flowchart.summing_junction`.
    expect(bentukDariGayaDrawio("shape=or;whiteSpace=wrap;html=1;shapeInside=1")).toBeNull();
    expect(bentukDariGayaDrawio("shape=xor;whiteSpace=wrap;html=1;shapeInside=1")).toBeNull();
  });

  it("stensil yang HANYA berarti lewat parameternya tidak ditebak tanpanya", () => {
    expect(bentukDariGayaDrawio("shape=mxgraph.electrical.logic_gates.logic_gate")).toBeNull();
    expect(bentukDariGayaDrawio("shape=mxgraph.basic.polygon")).toBeNull();
    // Sebaliknya, stensil yang punya bentuk bawaan tetap jatuh ke bawaannya:
    // `task2` tanpa `taskMarker` adalah Generic Task, `gateway2` tanpa `gwType`
    // adalah gerbang polos. Menolak keduanya akan membuang bentuk yang benar.
    expect(bentukDariGayaDrawio("shape=mxgraph.bpmn.task2")).toBe("bpmnTask");
    expect(bentukDariGayaDrawio("shape=mxgraph.bpmn.gateway2")).toBe("bpmnGateway");
  });

  it("string kosong tidak melempar", () => {
    expect(bentukDariGayaDrawio("")).toBeNull();
  });
});

describe("#752 ujung ke ujung: berkas draw.io nyata", () => {
  const pagar = (isi: string) =>
    `<mxfile><diagram id="d" name="a"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>${isi}</root></mxGraphModel></diagram></mxfile>`;

  const nodeDari = (style: string) => {
    const { nodes } = parseDrawIoXML(
      pagar(
        `<mxCell id="s1" value="Teks" vertex="1" parent="1" style="${style}">` +
          '<mxGeometry x="40" y="40" width="160" height="80" as="geometry"/></mxCell>'
      )
    );
    return nodes[0];
  };

  it("bentuk yang dulu rect polos sekarang sampai ke model dengan tipenya sendiri", () => {
    expect(nodeDari("shape=hexagon;perimeter=hexagonPerimeter2").type).toBe("hexagon");
    expect(nodeDari("swimlane;html=1;startSize=20").type).toBe("laneVertical");
    expect(nodeDari("shape=mxgraph.bpmn.task2;taskMarker=script").type).toBe("bpmnScriptTask");
    expect(nodeDari("shape=image;image=data:image/png;base64,aa").type).toBe("uiImagePlaceholder");
  });

  it("warna bawaan rantai lama tidak berubah walau tipenya ditimpa tabel", () => {
    // `ellipse` dulu memberi `emerald`; tabel hanya boleh menimpa TIPE.
    expect(nodeDari("ellipse;whiteSpace=wrap").color).toBe("emerald");
    expect(nodeDari("rhombus;whiteSpace=wrap").color).toBe("orange");
  });

  it("fillColor sumber tetap menang atas warna bawaan", () => {
    const n = nodeDari("shape=hexagon;fillColor=#f8cecc;strokeColor=#b85450");
    expect(n.type).toBe("hexagon");
    expect(n.fillHex).toBe("#f8cecc");
  });

  it("dari 24 bentuk umum, yang jatuh ke rect polos tinggal persegi panjang sungguhan", () => {
    const gaya = [
      "ellipse",
      "rhombus",
      "shape=hexagon",
      "shape=trapezoid",
      "triangle",
      "shape=step",
      "shape=cube",
      "shape=cylinder3",
      "ellipse;shape=cloud",
      "shape=document",
      "shape=parallelogram",
      "shape=process",
      "shape=note",
      "shape=mxgraph.bpmn.task2;taskMarker=abstract",
      "shape=umlActor",
      "swimlane;startSize=20",
      "shape=datastore",
      "shape=cross",
      "shape=mxgraph.flowchart.extract_or_measurement",
      "shape=callout",
      "shape=mxgraph.arrows2.arrow",
      "text;html=1;fillColor=none;strokeColor=none",
      "shape=image;image=data:image/png;base64,aa",
      "shape=tape",
    ];
    const tipe = gaya.map((g) => nodeDari(g).type);
    const rectPolos = tipe.filter((t) => t === "rect").length;
    // Sebelum #752 seluruh 24 gaya ini menghasilkan 19 `rect`. Tidak ada satu pun
    // dari daftar di atas yang memang persegi panjang, jadi nol adalah targetnya.
    expect(rectPolos).toBe(0);
    expect(new Set(tipe).size).toBeGreaterThanOrEqual(20);
  });
});
