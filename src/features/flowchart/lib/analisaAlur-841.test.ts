/**
 * #841 Fase 1 — test modul analisa alur.
 *
 * Proyek jest `node` (pola `*.test.ts`): modulnya murni, jadi tidak perlu
 * jsdom untuk membuktikan bahwa "papan ini punya cabang yatim" terjawab benar.
 * Setiap test memegang SATU aturan laporan; urutan id asserted harfiah karena
 * determinisme keluaran adalah bagian dari kontrak (lihat header modul).
 */
import {
  analisaAlur,
  ringkasJejak,
  skenarioAlur,
  type KodeTemuan,
  type SimpulAlur,
  type TepiAlur,
} from "./analisaAlur";

const simpul = (id: string, type = "rect", label = id): SimpulAlur => ({ id, type, label });
const tepi = (id: string, fromNodeId: string, toNodeId: string, label?: string): TepiAlur => ({
  id,
  fromNodeId,
  toNodeId,
  label,
});

const temuan = (nodes: SimpulAlur[], edges: TepiAlur[], kode: KodeTemuan) =>
  analisaAlur(nodes, edges).temuan.find((t) => t.kode === kode);

describe("#841 laporan validasi alur", () => {
  it("papan yang benar (Mulai → Kerja → Selesai) tidak memunculkan temuan apa pun", () => {
    const nodes = [simpul("s", "oval", "Mulai"), simpul("k"), simpul("e", "oval", "Selesai")];
    const edges = [tepi("e1", "s", "k"), tepi("e2", "k", "e")];
    const hasil = analisaAlur(nodes, edges);
    expect(hasil.temuan).toEqual([]);
    expect(hasil.awalIds).toEqual(["s"]);
    expect(hasil.akhirIds).toEqual(["e"]);
    expect(hasil.terjangkauIds).toEqual(["e", "k", "s"]);
    expect(hasil.jumlahGalat).toBe(0);
    expect(hasil.jumlahPeringatan).toBe(0);
  });

  it("papan kosong bukan galat: tidak ada awal berarti tidak ada yang salah", () => {
    expect(analisaAlur([], []).temuan).toEqual([]);
  });

  it("membentuk yatim yang dilewati simulasi lama sebagai galat, dengan id-nya", () => {
    const nodes = [
      simpul("s", "oval"),
      simpul("a"),
      simpul("e", "oval"),
      simpul("potong"),
      simpul("yatim"),
    ];
    const edges = [tepi("e1", "s", "a"), tepi("e2", "a", "e"), tepi("e3", "potong", "yatim")];
    const hasil = temuan(nodes, edges, "tak_terjangkau");
    expect(hasil?.tingkat).toBe("galat");
    // "potong" tidak ikut: ia awal yang lain, dan itu baris laporannya sendiri.
    expect(hasil?.simpulIds).toEqual(["yatim"]);
    expect(temuan(nodes, edges, "banyak_awal")?.simpulIds).toEqual(["potong"]);
    // Ranting terputus tidak digandakan menjadi jalan buntu: satu cacat satu baris.
    expect(temuan(nodes, edges, "jalan_buntu")).toBeUndefined();
  });

  it("graf yang seluruhnya lingkaran tidak punya awal sama sekali", () => {
    const nodes = [simpul("a"), simpul("b")];
    const edges = [tepi("e1", "a", "b"), tepi("e2", "b", "a")];
    expect(temuan(nodes, edges, "tanpa_awal")?.tingkat).toBe("galat");
    expect(analisaAlur(nodes, edges).awalIds).toEqual([]);
  });

  it("dua titik awal dilaporkan sebagai peringatan, bukan galat", () => {
    const nodes = [simpul("s1", "oval"), simpul("s2", "oval"), simpul("k")];
    const edges = [tepi("e1", "s1", "k"), tepi("e2", "s2", "k")];
    // Hanya awal KEDUA yang disebut: yang pertama justru acuan perjalanan.
    expect(temuan(nodes, edges, "banyak_awal")?.simpulIds).toEqual(["s2"]);
    expect(temuan(nodes, edges, "tak_terjangkau")).toBeUndefined();
  });

  it("jalan buntu berbentuk kotak itu temuan; berbentuk oval itu memang akhir", () => {
    const kotak = [simpul("s", "oval"), simpul("k")];
    expect(temuan(kotak, [tepi("e1", "s", "k")], "jalan_buntu")?.simpulIds).toEqual(["k"]);
    const bulat = [simpul("s", "oval"), simpul("e", "oval")];
    expect(temuan(bulat, [tepi("e1", "s", "e")], "jalan_buntu")).toBeUndefined();
  });

  it("keputusan bercabang tiga atau satu dilaporkan, yang bercabang dua tidak", () => {
    const tiga = [
      simpul("s", "oval"),
      simpul("d", "diamond", "Cek"),
      simpul("x"),
      simpul("y"),
      simpul("z"),
    ];
    const tepiTiga = [
      tepi("e1", "s", "d"),
      tepi("e2", "d", "x", "A"),
      tepi("e3", "d", "y", "B"),
      tepi("e4", "d", "z", "C"),
    ];
    expect(temuan(tiga, tepiTiga, "cabang_bukan_dua")?.simpulIds).toEqual(["d"]);

    const dua = [simpul("s", "oval"), simpul("d", "decision", "Cek"), simpul("x"), simpul("y")];
    const tepiDua = [
      tepi("e1", "s", "d"),
      tepi("e2", "d", "x", "Ya"),
      tepi("e3", "d", "y", "Tidak"),
    ];
    expect(temuan(dua, tepiDua, "cabang_bukan_dua")).toBeUndefined();
  });

  it("garis keluar keputusan tanpa label dicatat sebagai tepi, supaya bisa ditunjuk", () => {
    const nodes = [simpul("s", "oval"), simpul("d", "diamond", "Lolos?"), simpul("x"), simpul("y")];
    const edges = [tepi("e1", "s", "d"), tepi("e2", "d", "x", "Ya"), tepi("e3", "d", "y", "   ")];
    const hasil = temuan(nodes, edges, "cabang_tanpa_label");
    expect(hasil?.tepiIds).toEqual(["e3"]);
    expect(hasil?.simpulIds).toEqual([]);
  });

  it("lingkaran yang bisa keluar bukan jerat; yang tidak bisa keluar, dan gelung sendiri, adalah galat", () => {
    const adaJalan = [simpul("s", "oval"), simpul("a"), simpul("b"), simpul("e", "oval")];
    const tepiAdaJalan = [
      tepi("e1", "s", "a"),
      tepi("e2", "a", "b"),
      tepi("e3", "b", "a"),
      tepi("e4", "b", "e"),
    ];
    expect(temuan(adaJalan, tepiAdaJalan, "siklus_terjebak")).toBeUndefined();

    const terjebak = [simpul("s", "oval"), simpul("a"), simpul("b"), simpul("e", "oval")];
    const tepiTerjebak = [
      tepi("e1", "s", "a"),
      tepi("e2", "a", "b"),
      tepi("e3", "b", "a"),
      tepi("e4", "a", "e"),
      tepi("e5", "b", "b"),
    ];
    // a dan b masih punya jalan keluar lewat e4, jadi lingkarannya sah.
    expect(temuan(terjebak, tepiTerjebak, "siklus_terjebak")).toBeUndefined();

    const tertutup = [simpul("s", "oval"), simpul("a"), simpul("b")];
    const tepiTertutup = [tepi("e1", "s", "a"), tepi("e2", "a", "b"), tepi("e3", "b", "a")];
    expect(temuan(tertutup, tepiTertutup, "siklus_terjebak")?.simpulIds).toEqual(["a", "b"]);

    const memutar = [simpul("s", "oval"), simpul("a")];
    const tepiMemutar = [tepi("e1", "s", "a"), tepi("e2", "a", "a")];
    expect(temuan(memutar, tepiMemutar, "siklus_terjebak")?.simpulIds).toEqual(["a"]);
  });

  it("garis yang ujungnya sudah hilang tidak menghasilkan bentuk yatim palsu", () => {
    const nodes = [simpul("s", "oval"), simpul("a")];
    const edges = [tepi("e1", "s", "a"), tepi("e2", "a", "hantu")];
    const hasil = analisaAlur(nodes, edges);
    expect(temuan(nodes, edges, "tak_terjangkau")).toBeUndefined();
    expect(hasil.terjangkauIds).toEqual(["a", "s"]);
    expect(hasil.awalIds).toEqual(["s"]);
  });

  it("urutan array masukan tidak mengubah laporan", () => {
    const nodes = [
      simpul("s", "oval"),
      simpul("d", "diamond", "Cek"),
      simpul("x"),
      simpul("yatim"),
    ];
    const edges = [tepi("e1", "s", "d"), tepi("e2", "d", "x", "Ya")];
    const maju = analisaAlur(nodes, edges);
    const balik = analisaAlur(
      [...nodes].reverse(),
      [...edges].reverse().map((e) => ({ ...e }))
    );
    expect(balik).toEqual(maju);
  });
});

describe("#841 jejak skenario", () => {
  const berlian = () => ({
    nodes: [
      simpul("s", "oval", "Mulai"),
      simpul("d", "diamond", "Cek"),
      simpul("y", "rect", "Kerja"),
      simpul("e", "oval", "Selesai"),
    ],
    edges: [
      tepi("e1", "s", "d"),
      tepi("e2", "d", "y", "Tidak"),
      tepi("e3", "d", "e", "Ya"),
      tepi("e4", "y", "e"),
    ],
  });

  it("memilih satu perjalanan deterministik dan menghitung saudaranya", () => {
    const { nodes, edges } = berlian();
    const skenario = skenarioAlur(nodes, edges)!;
    expect(skenario.simpulIds).toEqual(["s", "d", "y", "e"]);
    expect(skenario.tepiIds).toEqual(["e1", "e2", "e4"]);
    expect(skenario.jumlahSkenario).toBe(2);
    expect(skenario.mungkinLebih).toBe(false);
  });

  it("mencatat cabang yang tidak dilewati supaya jejak tunggal tidak terbaca lengkap", () => {
    const { nodes, edges } = berlian();
    expect(skenarioAlur(nodes, edges)!.tepiTakDilewati).toEqual(["e3"]);
  });

  it("jejak selalu berjangkar di simpul: tepiIds = simpulIds dikurangi satu", () => {
    const { nodes, edges } = berlian();
    const skenario = skenarioAlur(nodes, edges)!;
    expect(skenario.tepiIds.length).toBe(skenario.simpulIds.length - 1);
    skenario.tepiIds.forEach((id, i) => {
      const t = edges.find((e) => e.id === id)!;
      expect([t.fromNodeId, t.toNodeId]).toEqual([
        skenario.simpulIds[i],
        skenario.simpulIds[i + 1],
      ]);
    });
  });

  it("lingkaran tidak membuat jejak berputar selamanya", () => {
    const nodes = [simpul("s", "oval"), simpul("a"), simpul("b"), simpul("e", "oval")];
    const edges = [
      tepi("e1", "s", "a"),
      tepi("e2", "a", "b"),
      tepi("e3", "b", "a"),
      tepi("e4", "b", "e"),
    ];
    const skenario = skenarioAlur(nodes, edges)!;
    expect(skenario.simpulIds).toEqual(["s", "a", "b", "e"]);
    expect(new Set(skenario.simpulIds).size).toBe(skenario.simpulIds.length);
  });

  it("tanpa titik awal, tidak ada jejak yang bisa diputar", () => {
    const nodes = [simpul("a"), simpul("b")];
    expect(skenarioAlur(nodes, [tepi("e1", "a", "b"), tepi("e2", "b", "a")])).toBeNull();
  });

  it("titik awal dipilih dari BETUK, bukan dari teks label atau urutan array", () => {
    // Kode lama: label.toLowerCase().includes("mulai") || type === "oval", lalu
    // jatuh ke nodes[0]. Papan ini membuat kedua jalan itu salah — bentuk
    // pertama array bernama "Awal manual" dan tidak bulat.
    const nodes = [
      simpul("a1", "rect", "Awal manual"),
      simpul("s", "oval", "Mulai"),
      simpul("x"),
      simpul("e", "oval", "Selesai"),
    ];
    const edges = [tepi("e1", "a1", "x"), tepi("e2", "s", "e")];
    const skenario = skenarioAlur(nodes, edges)!;
    expect(skenario.simpulIds).toEqual(["s", "e"]);
    expect(temuan(nodes, edges, "banyak_awal")?.simpulIds).toEqual(["a1"]);
    expect(temuan(nodes, edges, "tak_terjangkau")?.simpulIds).toEqual(["x"]);
  });

  it("ringkasan jejak memuat label bentuk dan label cabang", () => {
    const { nodes, edges } = berlian();
    expect(ringkasJejak(skenarioAlur(nodes, edges)!, nodes, edges)).toBe(
      "Mulai → Cek (Tidak) → Kerja → Selesai"
    );
  });
});
