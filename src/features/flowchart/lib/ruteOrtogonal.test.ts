/**
 * #833 — jaring kunci untuk perutean ortogonal.
 *
 * Yang dikunci BUKAN "garisnya bagus" (itu soal rasa), melainkan sifat-sifat
 * yang bisa dibuktikan: seluruh segmen horizontal/vertikal, ujung tidak bergeser,
 * segmen pertama/terakhir mengikuti arah port, tidak ada NaN, dan fillet tidak
 * memindahkan titik akhir.
 */
import type { FlowNode, Point } from "../types";
import {
  ortogonalDariTitik,
  pathDOrtogonal,
  ruteOrtogonal,
  waypointsSetelahGeserSegmen,
} from "./ruteOrtogonal";
import { memotongInteriorKotak } from "./routing";

const bentuk = (id: string, x: number, y: number, width = 155, height = 70): FlowNode =>
  ({ id, x, y, width, height }) as FlowNode;

const titik = (x: number, y: number, dir?: { x: number; y: number }) =>
  dir ? ({ x, y, dir } as Point & { dir: { x: number; y: number } }) : ({ x, y } as Point);

const kotakBentuk = (n: FlowNode) => ({
  x1: n.x - 26,
  y1: n.y - 26,
  x2: n.x + (n.width || 130) + 26,
  y2: n.y + (n.height || 70) + 26,
});

const ortogonal = (jalur: Point[]) =>
  jalur.every((p, i) => i === 0 || p.x === jalur[i - 1].x || p.y === jalur[i - 1].y);

const menembus = (jalur: Point[], nodes: FlowNode[], kecuali: string[]) =>
  nodes
    .filter((n) => !kecuali.includes(n.id))
    .some((n) =>
      jalur.slice(0, -1).some((p, i) => memotongInteriorKotak(p, jalur[i + 1], kotakBentuk(n)))
    );

describe("ortogonalDariTitik (#833)", () => {
  it("mengubah diagonal menjadi siku, tanpa memindahkan kedua ujung", () => {
    const jalur = ortogonalDariTitik([titik(0, 0), titik(100, 60)]);
    expect(ortogonal(jalur)).toBe(true);
    expect(jalur[0]).toEqual({ x: 0, y: 0 });
    expect(jalur[jalur.length - 1]).toEqual({ x: 100, y: 60 });
  });

  it("segmen pertama mengikuti arah port asal", () => {
    // Port kanan (arah horizontal) wajib keluar mendatar lebih dulu.
    const jalur = ortogonalDariTitik([titik(100, 95), titik(300, 250)], { x: 1, y: 0 }, undefined);
    expect(jalur[1]).toEqual({ x: 300, y: 95 });
  });

  it("segmen terakhir mengikuti arah port tujuan", () => {
    // Port atas (arah vertikal) wajib dimasuki dari bawah, bukan menyamping.
    const jalur = ortogonalDariTitik(
      [titik(100, 95), titik(300, 250)],
      { x: 1, y: 0 },
      { x: 0, y: -1 }
    );
    const sebelumAkhir = jalur[jalur.length - 2];
    expect(sebelumAkhir.x).toBe(300);
  });

  it("membuang titik kembar dan titik yang hanya meneruskan garis lurus", () => {
    const jalur = ortogonalDariTitik([
      titik(0, 0),
      titik(0, 0),
      titik(50, 0),
      titik(100, 0),
      titik(100, 80),
    ]);
    expect(jalur).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 80 },
    ]);
  });

  it("dua port berarah sama yang tidak segaris memakai dua belokan", () => {
    // Kanan ke kiri: satu belokan saja memaksa garis masuk menyamping ke sisi
    // kiri bentuk tujuan. draw.io memakai dua — mendatar, tegak, mendatar.
    const jalur = ortogonalDariTitik(
      [titik(100, 95), titik(420, 335)],
      { x: 1, y: 0 },
      { x: -1, y: 0 }
    );
    expect(jalur).toHaveLength(4);
    expect(jalur[0].y).toBe(jalur[1].y);
    expect(jalur[2].y).toBe(jalur[3].y);
    expect(jalur[1].x).toBe(jalur[2].x);
  });

  it("rapikan=false mempertahankan tekukan manual yang kebetulan segaris", () => {
    const jalur = ortogonalDariTitik(
      [titik(0, 0), titik(50, 0), titik(100, 0), titik(100, 80)],
      undefined,
      undefined,
      false
    );
    // (50,0) memang tidak mengubah bentuk, tetapi ia adalah tekukan yang
    // dipegang pengguna: membuangnya akan menghilangkan satu gagang.
    expect(jalur).toEqual([
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 80 },
    ]);
  });

  it("tidak pernah menulis NaN walau inputnya rusak", () => {
    const jalur = ortogonalDariTitik([
      titik(0, 0),
      { x: Number.NaN, y: 10 } as Point,
      titik(60, 40),
    ]);
    jalur.forEach((p) => {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
    });
  });
});

describe("ruteOrtogonal (#833) — menghindari bentuk, tetap siku", () => {
  const kasus: { nama: string; a: Point; c: Point; nodes: FlowNode[] }[] = [
    {
      nama: "satu kotak di tengah",
      a: titik(100, 95),
      c: titik(420, 95),
      nodes: [bentuk("k1", 200, 60)],
    },
    {
      nama: "dua kotak berjajar",
      a: titik(60, 95),
      c: titik(700, 95),
      nodes: [bentuk("k1", 200, 60), bentuk("k2", 420, 60)],
    },
    {
      nama: "vertikal menembus tiga kotak",
      a: titik(277, 40),
      c: titik(277, 620),
      nodes: [bentuk("k1", 200, 100), bentuk("k2", 200, 250), bentuk("k3", 200, 400)],
    },
    {
      nama: "dua bentuk rapat, rute harus menyelinap",
      a: titik(100, 40),
      c: titik(100, 400),
      nodes: [bentuk("k1", 60, 150, 40, 100), bentuk("k2", 140, 150, 40, 100)],
    },
  ];

  it.each(kasus)("$nama: seluruh segmen siku dan nol menembus bentuk", ({ a, c, nodes }) => {
    const jalur = ruteOrtogonal(a, c, "s", "t", nodes);
    expect(ortogonal(jalur)).toBe(true);
    expect(menembus(jalur, nodes, ["s", "t"])).toBe(false);
    expect(jalur[0]).toMatchObject({ x: a.x, y: a.y });
    expect(jalur[jalur.length - 1]).toMatchObject({ x: c.x, y: c.y });
  });

  it("garis bebas tetap dua titik, bukan dipaksa berbelok", () => {
    const jalur = ruteOrtogonal(titik(0, 0), titik(50, 0), "s", "t", [bentuk("k1", 200, 60)]);
    expect(jalur).toEqual([
      { x: 0, y: 0 },
      { x: 50, y: 0 },
    ]);
  });

  it("deterministik: input sama, keluaran sama persis", () => {
    const nodes = [bentuk("k1", 200, 60), bentuk("k2", 420, 60)];
    const a = titik(60, 95, { x: 1, y: 0 });
    const c = titik(700, 95, { x: -1, y: 0 });
    expect(ruteOrtogonal(a, c, "s", "t", nodes)).toEqual(ruteOrtogonal(a, c, "s", "t", nodes));
  });
});

describe("waypointsSetelahGeserSegmen (#833) — seret seluruh segmen", () => {
  const jalur: Point[] = [
    { x: 100, y: 100 },
    { x: 300, y: 100 },
    { x: 300, y: 300 },
    { x: 500, y: 300 },
  ];

  it("segmen mendatar bergeser tegak, hanya ujung dalamnya yang disimpan", () => {
    // #834 — model lama menyimpan SELURUH simpul dalam jalur (dua titik di
    // sini), sehingga satu seretan langsung memunculkan dua lingkaran ungu.
    // Kontrak baru: hanya ujung ruas yang benar-benar bergeser.
    const wp = waypointsSetelahGeserSegmen(jalur, 0, 999, 40);
    expect(wp).toEqual([{ x: 300, y: 140 }]);
    // dx diabaikan: segmen mendatar hanya bergerak naik/turun.
    expect(waypointsSetelahGeserSegmen(jalur, 0, 50, 0)).toBeNull();
  });

  it("segmen tegak bergeser mendatar, ujung port tidak ikut", () => {
    const wp = waypointsSetelahGeserSegmen(jalur, 1, 25, 999);
    expect(wp).toEqual([
      { x: 325, y: 100 },
      { x: 325, y: 300 },
    ]);
  });

  it("segmen yang menyentuh port hanya menggeser ujung dalamnya", () => {
    // #834 — ujung yang menempel pada port tidak boleh ikut disimpan sebagai
    // tekukan; hanya ujung dalam yang bergeser.
    const wp = waypointsSetelahGeserSegmen(jalur, 2, 0, 40);
    expect(wp).toEqual([{ x: 300, y: 340 }]);
  });

  it("satu ruas langsung antara dua port melahirkan dua tekukan berbentuk Z", () => {
    const wp = waypointsSetelahGeserSegmen(
      [
        { x: 100, y: 100 },
        { x: 400, y: 100 },
      ],
      0,
      0,
      30
    );
    expect(wp).toEqual([
      { x: 100, y: 130 },
      { x: 400, y: 130 },
    ]);
  });

  it("segmen diagonal dan geseran nol tidak mengubah apa pun", () => {
    expect(
      waypointsSetelahGeserSegmen(
        [
          { x: 0, y: 0 },
          { x: 100, y: 100 },
        ],
        0,
        5,
        5
      )
    ).toBeNull();
    expect(waypointsSetelahGeserSegmen(jalur, 0, 0, 0)).toBeNull();
    expect(waypointsSetelahGeserSegmen(jalur, 9, 10, 10)).toBeNull();
  });
});

describe("pathDOrtogonal (#833) — sudut membulat tanpa memindahkan ujung", () => {
  it("memakai perintah Q di setiap belokan", () => {
    const d = pathDOrtogonal([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ]);
    expect(d).toContain("Q");
    expect(d.startsWith("M 0 0")).toBe(true);
    expect(d.endsWith("L 100 100")).toBe(true);
  });

  it("radius dipangkas pada segmen pendek sehingga tidak melewati ujung", () => {
    const d = pathDOrtogonal(
      [
        { x: 0, y: 0 },
        { x: 6, y: 0 },
        { x: 6, y: 6 },
      ],
      10
    );
    const angka = (d.match(/-?\d*\.?\d+/g) || []).map(Number);
    angka.forEach((n) => expect(Number.isFinite(n)).toBe(true));
    // Titik masuk belokan tidak boleh melewati awal segmen (x negatif).
    expect(d).not.toContain("L -");
  });

  it("jalur dua titik tidak menghasilkan belokan palsu", () => {
    expect(
      pathDOrtogonal([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ])
    ).toBe("M 0 0 L 10 0");
  });
});
