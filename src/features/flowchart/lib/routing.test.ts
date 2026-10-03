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
 * ketika #544 diperbaiki — dan ia memang berubah: delapan dari delapan kasus
 * terhalang sekarang memutar, blok itu sudah ditulis ulang di bawah.
 */
import {
  findSmartRoute,
  isSegmentIntersectingRect,
  isSegmentIntersectingSegment,
  memotongInteriorKotak,
} from "./routing";

const bentuk = (id: string, x: number, y: number, width = 155, height = 70) =>
  ({ id, x, y, width, height }) as any;

const titik = (x: number, y: number, dir?: { x: number; y: number }) =>
  dir ? ({ x, y, dir } as any) : ({ x, y } as any);

/**
 * Kotak BENTUK aslinya, tanpa pelebaran 26 px yang dipakai perutean.
 *
 * #572 sempat memakai kotak yang diperlebar, dan itu salah ukur: rute yang sah
 * setelah #544 justru berjalan di sepanjang tepi kotak pelebaran itu — 26 px di
 * sebelah bentuk — sementara kotak pelebaran menganggapnya "di dalam". Yang
 * pembaca lihat di kanvas adalah bentuknya, jadi bentuknya yang jadi penggaris.
 */
const kotakBentuk = (n: any) => ({
  x1: n.x,
  y1: n.y,
  x2: n.x + (n.width || 130),
  y2: n.y + (n.height || 70),
});

/** Apakah jalur itu benar-benar menembus salah satu bentuk (bukan ujungnya sendiri). */
function menembusBentuk(path: any[], nodes: any[], kecuali: string[]) {
  return nodes
    .filter((n) => !kecuali.includes(n.id))
    .some((n) =>
      path.slice(0, -1).some((p, i) => isSegmentIntersectingRect(p, path[i + 1], kotakBentuk(n)))
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
 * #544 — predikat baru tempat perutean dibangun.
 *
 * Ini akar penyebabnya, jadi ia dikunci langsung, bukan hanya lewat keluaran
 * `findSmartRoute`: SELAYANG TANGAN di tepi/sudut bukan halangan, sementara
 * memotong tetap halangan. `isSegmentIntersectingRect` di atas memberi true pada
 * kedua hal itu — dan karena graf keterlihatan dibangun DARI titik sudut
 * rintangan, true pada yang pertama membuat graf terputus total.
 */
describe("memotongInteriorKotak (#544)", () => {
  const kotak = { x1: 0, y1: 0, x2: 10, y2: 10 };

  it("tetap menandai ruas yang memotong atau berada di dalam", () => {
    expect(memotongInteriorKotak(titik(-5, 5), titik(15, 5), kotak)).toBe(true);
    expect(memotongInteriorKotak(titik(5, 5), titik(6, 6), kotak)).toBe(true);
    expect(memotongInteriorKotak(titik(-10, -10), titik(20, 20), kotak)).toBe(true);
  });

  it("membiarkan ruas yang hanya menyenggol sudut atau merapat di tepi", () => {
    // Ujung ruas tepat di sudut — inilah yang dulu mematikan seluruh graf.
    expect(memotongInteriorKotak(titik(-10, 5), titik(0, 0), kotak)).toBe(false);
    expect(memotongInteriorKotak(titik(0, 0), titik(10, 0), kotak)).toBe(false);
    // Sepanjang tepi luar, tanpa masuk.
    expect(memotongInteriorKotak(titik(0, 0), titik(10, 0), kotak)).toBe(false);
    expect(memotongInteriorKotak(titik(10, 0), titik(10, 10), kotak)).toBe(false);
    // Menyinggung satu titik tepi di tengah ruas.
    expect(memotongInteriorKotak(titik(-5, 0), titik(15, 0), kotak)).toBe(false);
    // Jauh di luar.
    expect(memotongInteriorKotak(titik(-20, -20), titik(-10, -10), kotak)).toBe(false);
  });

  it("menangkap ruas sudut-ke-sudut-seberang yang ujungnya berdua di tepi", () => {
    expect(memotongInteriorKotak(titik(0, 0), titik(10, 10), kotak)).toBe(true);
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
    // Garis y=30 menembusnya, dan TITIK TUJUANNYA SENDIRI ada di dalam bentuk
    // (80..210 x 10..80) — tidak ada rute yang mungkin, jadi fallback.
    const jalur = findSmartRoute(titik(0, 30), titik(200, 30), "s", "t", [tanpaUkuran]);
    expect(jalur).toHaveLength(4);
    expect(adalahFallback(titik(0, 30), titik(200, 30), jalur)).toBe(true);
  });
});

/**
 * #544 — SEMULA kasus menyerah.
 *
 * Kedelapan geometri di bawah TERHALANG, jadi yang benar adalah rute memutar,
 * dan sejak #544 itulah yang terjadi. Bentuk kunciannya dipindah dari "fallback
 * empat titik" ke "titik-titik yang benar-benar dipulangkan": angka-angka itu
 * adalah hasil ukur `routing.ts` hari ini, dan sudut yang dilewati (174 =
 * 200 - 26, 34 = 60 - 26) adalah kotak rintangan hasil pelebaran 26 px — jadi
 * kalau suatu hari pelebaran itu berubah, test ini merah, bukan diam-diam.
 *
 * Yang dulu dikunci di sini (delapan dari delapan memulangkan garis lurus tembus
 * bentuk) adalah gejala dari graf keterlihatan yang terputus: setiap simpul
 * dianggap terhalang oleh rintangan yang sudutnya baru saja ia sentuh. Lihat
 * #572 untuk aslinya jaring ini dipasang.
 */
describe("findSmartRoute — kasus terhalang: memutar di sekitar bentuk (#544)", () => {
  const terhalang: {
    nama: string;
    a: any;
    b: string;
    c: any;
    nodes: any[];
    golden: [number, number][];
  }[] = [
    {
      nama: "satu kotak di tengah",
      a: titik(100, 95),
      b: "s",
      c: titik(420, 95),
      nodes: [bentuk("k1", 200, 60)],
      golden: [
        [100, 95],
        [174, 34],
        [381, 34],
        [420, 95],
      ],
    },
    {
      nama: "satu kotak, port kiri dan kanan",
      a: titik(100, 95, { x: 1, y: 0 }),
      b: "s",
      c: titik(420, 95, { x: -1, y: 0 }),
      nodes: [bentuk("k1", 200, 60)],
      golden: [
        [100, 95],
        [174, 34],
        [381, 34],
        [420, 95],
      ],
    },
    {
      nama: "kotak digeser ke atas tapi masih memotong",
      a: titik(100, 120),
      b: "s",
      c: titik(420, 120),
      nodes: [bentuk("k1", 200, 80)],
      golden: [
        [100, 120],
        [174, 176],
        [381, 176],
        [420, 120],
      ],
    },
    {
      nama: "dua kotak berjajar",
      a: titik(60, 95),
      b: "s",
      c: titik(700, 95),
      nodes: [bentuk("k1", 200, 60), bentuk("k2", 420, 60)],
      golden: [
        [60, 95],
        [174, 34],
        [601, 34],
        [700, 95],
      ],
    },
    {
      nama: "vertikal menembus tiga kotak",
      a: titik(277, 40),
      b: "s",
      c: titik(277, 620),
      nodes: [bentuk("k1", 200, 100), bentuk("k2", 200, 250), bentuk("k3", 200, 400)],
      golden: [
        [277, 40],
        [174, 74],
        [174, 496],
        [277, 620],
      ],
    },
    {
      nama: "L terbuka dengan kotak di sudut",
      a: titik(80, 80),
      b: "s",
      c: titik(500, 400),
      nodes: [bentuk("k1", 240, 180)],
      golden: [
        [80, 80],
        [214, 276],
        [500, 400],
      ],
    },
    {
      nama: "kotak besar dengan sisa ruang lebar",
      a: titik(40, 40),
      b: "s",
      c: titik(900, 40),
      nodes: [bentuk("besar", 200, 20, 500, 400)],
      golden: [
        [40, 40],
        [174, -6],
        [726, -6],
        [900, 40],
      ],
    },
    {
      nama: "dua bentuk rapat, rute harus menyelinap",
      a: titik(100, 40),
      b: "s",
      c: titik(100, 400),
      nodes: [bentuk("k1", 60, 150, 40, 100), bentuk("k2", 140, 150, 40, 100)],
      golden: [
        [100, 40],
        [34, 124],
        [34, 276],
        [100, 400],
      ],
    },
  ];

  it.each(terhalang)("$nama -> memutar, nol menembus bentuk", ({ a, b, c, nodes, golden }) => {
    const jalur = findSmartRoute(a, c, b, "t", nodes);

    expect(jalur.map((p: any) => [p.x, p.y])).toEqual(golden);
    expect(menembusBentuk(jalur, nodes, [b, "t"])).toBe(false);
    expect(adalahFallback(a, c, jalur)).toBe(false);

    // Ujung-ujungnya hanya membawa KOORDINAT. Rute memutar dibangun dari array
    // simpul, jadi titik-titiknya objek baru; yang memulangkan objek input apa
    // adanya (dengan `dir`) hanya jalur fallback. #571 memindahkan ini ke Web
    // Worker, dan perbedaan bentuk itu harus terlihat sebelum pemanggil diubah.
    expect(jalur[0]).toEqual({ x: a.x, y: a.y });
    expect(jalur[jalur.length - 1]).toEqual({ x: c.x, y: c.y });
  });

  it("nol dari delapan kasus terhalang memakai fallback — sebelumnya delapan", () => {
    const menyerah = terhalang.filter(({ a, c, nodes }) =>
      adalahFallback(a, c, findSmartRoute(a, c, "s", "t", nodes))
    ).length;

    expect(menyerah).toBe(0);
  });

  it("delapan dari delapan tidak lagi menembus bentuk", () => {
    const tembus = terhalang.filter(({ a, c, nodes }) =>
      menembusBentuk(findSmartRoute(a, c, "s", "t", nodes), nodes, ["s", "t"])
    ).length;

    expect(tembus).toBe(0);
  });

  it("target yang benar-benar terkurung tetap memulangkan fallback, bukan rute palsu", () => {
    // Delapan bentuk mengepung sebuah gang sempit: titik asal berada di dalam
    // kotak rintangan yang diperlebar, jadi tidak ada simpul graf pun yang
    // bisa melihatnya. Fallback di sini JUJUR — garis memang tidak bisa lewat.
    const a = titik(260, 120);
    const c = titik(600, 120);
    const nodes = [
      bentuk("a", 150, 40),
      bentuk("b", 150, 100),
      bentuk("c", 150, 160),
      bentuk("d", 350, 40),
      bentuk("e", 350, 100),
      bentuk("f", 350, 160),
      bentuk("g", 250, 20),
      bentuk("h", 250, 220),
    ];

    const jalur = findSmartRoute(a, c, "s", "t", nodes);
    expect(adalahFallback(a, c, jalur)).toBe(true);
    expect(jalur).toHaveLength(4);
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

  /**
   * Anggaran kerja `routing.ts` (ANGGARAN_UJI) punya harga yang harus terlihat:
   * lintasan LEBAR JAUH melintasi kisi rapat — ujung baris ke awal baris
   * berikutnya — tidak selalu selesai dicari, dan yang tidak selesai memulangkan
   * garis lurus tembus bentuk. Angka di bawah adalah hasil ukur hari ini dan
   * hanya boleh TURUN.
   */
  it("28 lintasan jauh di kisi rapat: paling banyak 4 menyerah ke anggaran", () => {
    const jauh: [string, string][] = [];
    const id = (i: number) => `r${Math.floor(i / 5)}c${i % 5}`;
    for (let i = 0; i + 1 < 25; i++) jauh.push([id(i), id(i + 1)]);
    for (let i = 0; i + 6 < 25; i += 6) jauh.push([id(i), id(i + 6)]);

    const mulai = Date.now();
    const buruk = jauh.filter(([a, b]) =>
      menembusBentuk(findSmartRoute(pusat(a), pusat(b), a, b, kisi.nodes), kisi.nodes, [a, b])
    ).length;
    const ms = Date.now() - mulai;

    expect(buruk).toBeLessThanOrEqual(4);
    // Longgar (~90x hasil ukur 34 ms): yang ditangkap hanya pembekuan layar,
    // bukan getaran mesin. Angka itu nyata — begitu grafnya terhubung dan sebelum
    // koridor + anggaran dipasang, lintasan di papan 100 bentuk terukur 63 detik.
    expect(ms).toBeLessThan(3000);
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
