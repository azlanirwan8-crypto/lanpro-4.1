/**
 * #572 — jaring kunci-keluaran perutean garis.
 *
 * KENAPA ADA. #521 #522 #533 #543 #544 #571 semuanya bermuara ke berkas ini,
 * dan selama ini satu-satunya buktinya adalah test render komponen: mereka
 * melihat BAHWA sebuah garis digambar, bukan APA bentuk garisnya. Berkas test
 * ini tidak ada sampai sekarang.
 *
 * POLA (diwarisi dari #520): kunci BENTUK keluaran, bukan jumlah pemanggilan
 * fungsi. Semua test di bawah membandingkan titik-titik yang benar-benar
 * dipulangkan `findSmartRoute`.
 *
 * PERINGATAN UNTUK #544. Sebagian test di bawah mengunci perilaku yang SALAH —
 * itu memang tujuannya: jaring harus menutupi keadaan hari ini supaya perubahan
 * berikutnya tidak bisa diam-diam mengubah lebih banyak daripada yang
 * direncanakan. Test yang diberi tanda "MENYERAH" boleh (dan harus) berubah
 * ketika #544 diperbaiki — berubahnya ia adalah bukti perbaikan, bukan kegagalan.
 */
import { findSmartRoute, isSegmentIntersectingRect, isSegmentIntersectingSegment } from "./routing";

const bentuk = (id: string, x: number, y: number, width = 155, height = 70) =>
  ({ id, x, y, width, height }) as any;

const titik = (x: number, y: number, dir?: { x: number; y: number }) =>
  dir ? ({ x, y, dir } as any) : ({ x, y } as any);

/** Rintangan yang sama dipakai `findSmartRoute`: kotak diperlebar 26 px. */
const kotakRintangan = (n: any) => ({
  x1: n.x - 26,
  y1: n.y - 26,
  x2: n.x + (n.width || 130) + 26,
  y2: n.y + (n.height || 70) + 26,
});

/** Apakah jalur itu benar-benar menembus salah satu bentuk (bukan ujungnya sendiri). */
function menembusBentuk(path: any[], nodes: any[], kecuali: string[]) {
  return nodes
    .filter((n) => !kecuali.includes(n.id))
    .some((n) =>
      path.slice(0, -1).some((p, i) => isSegmentIntersectingRect(p, path[i + 1], kotakRintangan(n)))
    );
}

describe("isSegmentIntersectingSegment (#572)", () => {
  it("menandai silang, sentuh ujung, dan kolinear tumpang tindih", () => {
    expect(
      isSegmentIntersectingSegment(titik(0, 0), titik(10, 10), titik(0, 10), titik(10, 0))
    ).toBe(true);
    expect(
      isSegmentIntersectingSegment(titik(0, 0), titik(10, 0), titik(10, 0), titik(10, 10))
    ).toBe(true);
    expect(isSegmentIntersectingSegment(titik(0, 0), titik(10, 0), titik(5, 0), titik(15, 0))).toBe(
      true
    );
  });

  it("membiarkan dua ruas sejajar", () => {
    expect(isSegmentIntersectingSegment(titik(0, 0), titik(10, 0), titik(0, 5), titik(10, 5))).toBe(
      false
    );
  });
});

describe("isSegmentIntersectingRect (#572)", () => {
  const kotak = { x1: 0, y1: 0, x2: 10, y2: 10 };

  it("menandai ruas di dalam, memotong tepi, dan menembus penuh", () => {
    expect(isSegmentIntersectingRect(titik(5, 5), titik(6, 6), kotak)).toBe(true);
    expect(isSegmentIntersectingRect(titik(-5, 0), titik(15, 0), kotak)).toBe(true);
    expect(isSegmentIntersectingRect(titik(-10, 5), titik(20, 5), kotak)).toBe(true);
    expect(isSegmentIntersectingRect(titik(5, 5), titik(5, 5.5), kotak)).toBe(true);
  });

  it("membiarkan ruas yang berada di luar kotak", () => {
    expect(isSegmentIntersectingRect(titik(-20, -20), titik(-10, -10), kotak)).toBe(false);
    expect(isSegmentIntersectingRect(titik(-5, -5), titik(15, -5), kotak)).toBe(false);
  });
});

/**
 * Jalur "menyerah" `routing.ts:246`: `[start, startStub, endStub, end]`.
 * Dua titik tengahnya bukan hasil pencarian, hanya perpindahan 25 px dari
 * arah port — jadi bentuknya selalu persis empat titik dan tidak pernah
 * menyimpang dari garis lurus antar ujung.
 */
function adalahFallback(a: any, c: any, jalur: any[]) {
  const stub = (p: any) => ({
    x: p.x + (p.dir?.x || 0) * 25,
    y: p.y + (p.dir?.y || 0) * 25,
  });
  return jalur.length === 4 && JSON.stringify(jalur) === JSON.stringify([a, stub(a), stub(c), c]);
}

describe("findSmartRoute — jalur yang bebas (#572)", () => {
  it("mengembalikan dua titik saja bila garis lurus tidak terhalang", () => {
    expect(findSmartRoute(titik(0, 0), titik(50, 0), "s", "t", [bentuk("k1", 200, 60)])).toEqual([
      { x: 0, y: 0 },
      { x: 50, y: 0 },
    ]);
  });

  it("kecualikan bentuk asal dan tujuan, walau garis melewati kotaknya sendiri", () => {
    const s = bentuk("s", 40, 60, 60, 70);
    const t = bentuk("t", 420, 60, 60, 70);
    const jalur = findSmartRoute(titik(70, 95), titik(450, 95), "s", "t", [s, t]);
    expect(jalur).toEqual([
      { x: 70, y: 95 },
      { x: 450, y: 95 },
    ]);
  });

  it("pakai lebar 130 dan tinggi 70 untuk bentuk tanpa ukuran", () => {
    const tanpaUkuran = { id: "x", x: 80, y: 10 } as any;
    // Garis y=-40 lewat di atas kotak default (atas efektif = 10 - 26 = -16).
    expect(findSmartRoute(titik(0, -40), titik(200, -40), "s", "t", [tanpaUkuran])).toHaveLength(2);
    // Garis y=30 menembusnya.
    expect(findSmartRoute(titik(0, 30), titik(200, 30), "s", "t", [tanpaUkuran])).toHaveLength(4);
  });
});

/**
 * KASUS MENYERAH. Kedelapan geometri di bawah ini TERHALANG, jadi yang benar
 * adalah rute memutar. Yang dipulangkan hari ini tetap garis lurus start -> end
 * dengan dua titik tengah yang sama dengan ujungnya: `[start, startStub,
 * endStub, end]`. Itu jalur `dist === Infinity` di `routing.ts:246` — graf
 * keterlihatan tidak pernah terhubung, sebab setiap titik sudut rintangan
 * dianggap "terhalang" oleh rintangan yang sudutnya baru saja ia sentuh.
 *
 * #544 akan mengganti isi blok ini. Sampai saat itu, angka 8 dari 8 adalah
 * ukuran jujur keadaan sekarang.
 */
describe("findSmartRoute — kasus terhalang: terkunci pada jalur menyerah (#544 nanti)", () => {
  const terhalang: { nama: string; a: any; b: string; c: any; nodes: any[] }[] = [
    {
      nama: "satu kotak di tengah",
      a: titik(100, 95),
      b: "s",
      c: titik(420, 95),
      nodes: [bentuk("k1", 200, 60)],
    },
    {
      nama: "satu kotak, port kiri dan kanan",
      a: titik(100, 95, { x: 1, y: 0 }),
      b: "s",
      c: titik(420, 95, { x: -1, y: 0 }),
      nodes: [bentuk("k1", 200, 60)],
    },
    {
      nama: "kotak digeser ke atas tapi masih memotong",
      a: titik(100, 120),
      b: "s",
      c: titik(420, 120),
      nodes: [bentuk("k1", 200, 80)],
    },
    {
      nama: "dua kotak berjajar",
      a: titik(60, 95),
      b: "s",
      c: titik(700, 95),
      nodes: [bentuk("k1", 200, 60), bentuk("k2", 420, 60)],
    },
    {
      nama: "vertikal menembus tiga kotak",
      a: titik(277, 40),
      b: "s",
      c: titik(277, 620),
      nodes: [bentuk("k1", 200, 100), bentuk("k2", 200, 250), bentuk("k3", 200, 400)],
    },
    {
      nama: "L terbuka dengan kotak di sudut",
      a: titik(80, 80),
      b: "s",
      c: titik(500, 400),
      nodes: [bentuk("k1", 240, 180)],
    },
    {
      nama: "kotak besar dengan sisa ruang lebar",
      a: titik(40, 40),
      b: "s",
      c: titik(900, 40),
      nodes: [bentuk("besar", 200, 20, 500, 400)],
    },
    {
      nama: "dua bentuk rapat, rute harus menyelinap",
      a: titik(100, 40),
      b: "s",
      c: titik(100, 400),
      nodes: [bentuk("k1", 60, 150, 40, 100), bentuk("k2", 140, 150, 40, 100)],
    },
  ];

  it.each(terhalang)("$nama -> fallback 4 titik, bukan rute memutar", ({ a, b, c, nodes }) => {
    const jalur = findSmartRoute(a, c, b, "t", nodes);

    // Bentuk kunci-keluaran hari ini: [start, startStub, endStub, end].
    expect(jalur).toHaveLength(4);
    // Ujungnya adalah OBJEK INPUT apa adanya — `dir` ikut terbawa. #571 akan
    // memindahkan perhitungan ini ke Web Worker, dan struktur itu harus tetap
    // sama supaya pemanggil tidak perlu diubah dua kali.
    expect(jalur[0]).toEqual(a);
    expect(jalur[3]).toEqual(c);
    // Stub = 25 px keluar mengikuti arah port; tanpa arah, stub jatuh tepat di ujungnya.
    const stubAwal = a.dir ? { x: a.x + a.dir.x * 25, y: a.y + a.dir.y * 25 } : { x: a.x, y: a.y };
    const stubAkhir = c.dir ? { x: c.x + c.dir.x * 25, y: c.y + c.dir.y * 25 } : { x: c.x, y: c.y };
    expect(jalur[1]).toEqual(stubAwal);
    expect(jalur[2]).toEqual(stubAkhir);

    // Dan itulah sebabnya garisnya TEMBUS bentuk: hanya ada dua titik unik,
    // keduanya ujung, jadi jalurnya garis lurus antar ujung.
    expect(new Set(jalur.map((p: any) => `${p.x},${p.y}`)).size).toBeLessThanOrEqual(4);
    expect(menembusBentuk(jalur, nodes, [b, "t"])).toBe(true);
  });

  it("delapan dari delapan kasus terhalang memakai fallback — angka dasar #544", () => {
    const menyerah = terhalang.filter(({ a, c, nodes }) =>
      adalahFallback(a, c, findSmartRoute(a, c, "s", "t", nodes))
    ).length;

    // Ratchet: hanya boleh TURUN. #544 yang sebenarnya menargetkan 0.
    expect(menyerah).toBeLessThanOrEqual(8);
    expect(menyerah).toBe(8);
  });
});

describe("findSmartRoute — kisi bentuk bertetangga (#572)", () => {
  const kisi = (() => {
    const nodes: any[] = [];
    for (let baris = 0; baris < 5; baris++) {
      for (let kolom = 0; kolom < 5; kolom++) {
        nodes.push(bentuk(`r${baris}c${kolom}`, 60 + kolom * 220, 60 + baris * 150));
      }
    }
    const edges: [string, string][] = [];
    for (let baris = 0; baris < 5; baris++) {
      for (let kolom = 0; kolom < 5; kolom++) {
        if (kolom + 1 < 5) edges.push([`r${baris}c${kolom}`, `r${baris}c${kolom + 1}`]);
        if (baris + 1 < 5) edges.push([`r${baris}c${kolom}`, `r${baris + 1}c${kolom}`]);
      }
    }
    return { nodes, edges };
  })();

  const pusat = (id: string) => {
    const nd = kisi.nodes.find((x) => x.id === id)!;
    return titik(nd.x + 77, nd.y + 35);
  };

  it("40 garis antar-tetangga: semuanya lurus dan nol menembus bentuk", () => {
    const menembus = kisi.edges.filter(([a, b]) => {
      const jalur = findSmartRoute(pusat(a), pusat(b), a, b, kisi.nodes);
      return jalur.length !== 2 || menembusBentuk(jalur, kisi.nodes, [a, b]);
    });
    expect(menembus).toEqual([]);
  });
});

describe("findSmartRoute — murni dan pasti (#572, prasyarat #571)", () => {
  const nodes = [bentuk("k1", 200, 60), bentuk("k2", 420, 60)];
  const a = titik(100, 95, { x: 1, y: 0 });
  const b = titik(700, 95, { x: -1, y: 0 });

  it("memulangkan hasil yang sama persis untuk input yang sama (dipanggil dua kali)", () => {
    const pertama = findSmartRoute(a, b, "s", "t", nodes);
    const kedua = findSmartRoute(a, b, "s", "t", nodes);
    expect(kedua).toEqual(pertama);
    expect(JSON.stringify(kedua)).toBe(JSON.stringify(pertama));
  });

  it("tidak mengubah objek input", () => {
    const titikA = { x: 100, y: 95 };
    const rintangan = [bentuk("k1", 200, 60)];
    const sebelum = JSON.stringify({ titikA, rintangan });
    findSmartRoute(titikA as any, { x: 420, y: 95 }, "s", "t", rintangan);
    expect(JSON.stringify({ titikA, rintangan })).toBe(sebelum);
  });

  it("setiap titik keluaran berkoordinat hingga", () => {
    const jalur = findSmartRoute(a, b, "s", "t", nodes);
    expect(jalur.length).toBeGreaterThan(1);
    jalur.forEach((p: any) => {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
    });
  });
});
