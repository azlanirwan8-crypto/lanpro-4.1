import { LANGKAH_PORT, geserPort, pilihPort, sebarPort } from "./portCabang";
import { ruteOrtogonal } from "./ruteOrtogonal";
import type { FlowNode, Point } from "../types";

/**
 * #849 — dua cabang yang keluar dari SISI yang sama tidak boleh berangkat dari
 * titik yang sama.
 *
 * GEJALA (terukur pada papan hasil "Rapikan Otomatis" #840 dengan router #833):
 * sebuah keputusan bercabang dua sama-sama memilih sisi `right`, jadi keduanya
 * keluar di (700,222) dan koridor pertama keduanya TINDIH sepanjang 80 px —
 * terbaca di layar sebagai satu garis yang bercabang sendiri. `getClosestPortsPoint`
 * memilih port per garis tanpa mengingat saudaranya, dan penggeseran #533 hanya
 * mengenal pasangan bentuk yang sama (`a|b`), jadi `fds→go` dan `fds→nogo` tidak
 * pernah dianggap kembar.
 */

const NODES: Simpul[] = [
  { id: "fds", x: 560, y: 187, width: 140, height: 70 },
  { id: "go", x: 860, y: 100, width: 155, height: 70 },
  { id: "nogo", x: 860, y: 300, width: 155, height: 70 },
];
type Simpul = { id: string; x: number; y: number; width: number; height: number };

const CABANG = [
  { id: "e5", fromNodeId: "fds", toNodeId: "go" },
  { id: "e6", fromNodeId: "fds", toNodeId: "nogo" },
];

/** Sisi bentuk `id` yang dipilih papan untuk tiap garis — dipakai untuk
 *  membuktikan garis itu memang SEKOLOMPOK sebelum disebar. */
const sisi = (id: string, edges = CABANG) =>
  edges.map((e) => {
    const src = NODES.find((n) => n.id === e.fromNodeId)!;
    const tgt = NODES.find((n) => n.id === e.toNodeId)!;
    const p = pilihPort(src, tgt);
    return e.fromNodeId === id ? p.source.nama : p.target.nama;
  });

describe("portCabang — sebaran saudara satu sisi (#849)", () => {
  it("dua cabang sekolompok bergeser 18 px, setangkai di kiri-kanan tengah tepi", () => {
    expect(sisi("fds")).toEqual(["right", "right"]);
    const sebar = sebarPort(CABANG, NODES);
    const a = sebar.get("e5")!.keluar;
    const b = sebar.get("e6")!.keluar;
    expect(a).not.toBe(b);
    expect(Math.abs(a - b)).toBeCloseTo(LANGKAH_PORT, 5);
    expect(a + b).toBeCloseTo(0, 5);
  });

  it("cabang ke bentuk di ATAS keluar paling atas, jadi kipasnya tidak menyilang", () => {
    const sebar = sebarPort(CABANG, NODES);
    expect(sebar.get("e5")!.keluar).toBeLessThan(0);
    expect(sebar.get("e6")!.keluar).toBeGreaterThan(0);
    // Urutan saudara mengikuti TEPI lawannya, bukan urutan array maupun id.
    const terbalik = sebarPort([...CABANG].reverse(), NODES);
    expect(terbalik.get("e5")).toEqual(sebar.get("e5"));
    expect(terbalik.get("e6")).toEqual(sebar.get("e6"));
  });

  it("garis tanpa saudara tidak digeser — papan tanpa cabang tidak berubah", () => {
    const sebar = sebarPort([CABANG[0]!], NODES);
    expect(sebar.get("e5")).toEqual({ keluar: 0, masuk: 0 });
    expect(sebar.get("e6")).toBeUndefined();
  });

  it("dua garis yang masuk ke sisi yang sama juga disebar", () => {
    const masuk = [
      { id: "m1", fromNodeId: "go", toNodeId: "fds" },
      { id: "m2", fromNodeId: "nogo", toNodeId: "fds" },
    ];
    expect(sisi("fds", masuk)).toEqual(["right", "right"]);
    const sebar = sebarPort(masuk, NODES);
    expect(Math.abs(sebar.get("m1")!.masuk - sebar.get("m2")!.masuk)).toBeCloseTo(LANGKAH_PORT, 5);
    expect(sebar.get("m1")!.keluar).toBe(0);
  });

  it("port yang dipaku pengguna tidak digeser dan tidak dihitung sebagai saudara", () => {
    const withPin = [{ ...CABANG[0]!, portSumber: { x: 0.5, y: 1 } }, CABANG[1]!];
    const sebar = sebarPort(withPin, NODES);
    expect(sebar.get("e5")!.keluar).toBe(0);
    // Saudaranya kini sendirian di sisi itu: tidak ada lagi yang perlu dihindari.
    expect(sebar.get("e6")!.keluar).toBe(0);
  });

  it("geserPort bergerak SEPANJANG tepi: sisi kiri/kanan vertikal, atas/bawah horizontal", () => {
    const { source } = pilihPort(NODES[0]!, NODES[1]!);
    expect(source.nama).toBe("right");
    const digeser = geserPort(source, 9);
    expect(digeser.x).toBe(source.x);
    expect(digeser.y).toBeCloseTo(source.y + 9, 5);

    const atas = pilihPort(NODES[0]!, { ...NODES[1]!, x: 560, y: -200 }).source;
    expect(atas.nama).toBe("top");
    const kesamping = geserPort(atas, 9);
    expect(kesamping.x).toBeCloseTo(atas.x + 9, 5);
    expect(kesamping.y).toBe(atas.y);

    expect(geserPort(source, 0)).toBe(source);
  });
});

describe("portCabang — koridor rute (#849)", () => {
  const bentuk = (s: Simpul): FlowNode =>
    ({ ...s, type: "rect", label: s.id, color: "indigo" }) as FlowNode;

  const ruas = (p: Point[]) => p.slice(0, -1).map((a, i) => ({ a, b: p[i + 1]! }));

  function tumpangTindih(A: Point[], B: Point[]): number {
    let total = 0;
    for (const s1 of ruas(A))
      for (const s2 of ruas(B)) {
        const h = s1.a.y === s1.b.y && s2.a.y === s2.b.y && s1.a.y === s2.a.y;
        const v = s1.a.x === s1.b.x && s2.a.x === s2.b.x && s1.a.x === s2.a.x;
        if (!h && !v) continue;
        const [p1, q1] = h ? [s1.a.x, s1.b.x] : [s1.a.y, s1.b.y];
        const [p2, q2] = h ? [s2.a.x, s2.b.x] : [s2.a.y, s2.b.y];
        total += Math.max(
          0,
          Math.min(Math.max(p1, q1), Math.max(p2, q2)) -
            Math.max(Math.min(p1, q1), Math.min(p2, q2))
        );
      }
    return Math.round(total * 100) / 100;
  }

  const ruteUntuk = (pakaiSebaran: boolean) => {
    const sebar = pakaiSebaran ? sebarPort(CABANG, NODES) : null;
    return CABANG.map((e) => {
      const src = NODES.find((n) => n.id === e.fromNodeId)!;
      const tgt = NODES.find((n) => n.id === e.toNodeId)!;
      const { source, target } = pilihPort(src, tgt);
      const o = sebar?.get(e.id) || { keluar: 0, masuk: 0 };
      return ruteOrtogonal(
        geserPort(source, o.keluar),
        geserPort(target, o.masuk),
        e.fromNodeId,
        e.toNodeId,
        NODES.map(bentuk)
      );
    });
  };

  it("sebelum disebar kedua rute berbagi koridor 80 px — angka yang dilaporkan pemilik proyek", () => {
    const [a, b] = ruteUntuk(false);
    expect(tumpangTindih(a!, b!)).toBeCloseTo(80, 1);
  });

  it("sesudah disebar kedua rute tidak berbagi satu ruas pun", () => {
    const [a, b] = ruteUntuk(true);
    expect(tumpangTindih(a!, b!)).toBe(0);
    expect(a![0]!.y).not.toBe(b![0]!.y);
  });
});
