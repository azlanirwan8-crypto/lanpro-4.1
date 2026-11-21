/**
 * #864 — pencarian Daftar Isu kedalaman penuh, bagian CLIENT.
 *
 * BUG. Ketik satu kata di kotak cari Daftar Isu dan isu yang jawabannya duduk
 * di kedalaman dua atau lebih tidak pernah muncul. Tiga lapis ikut bersalah dan
 * ketiganya berhenti di anak LANGSUNG: `halamanAkar` di server, `childMatches`
 * di `displayRoots`, dan saringan baris anak di `IssueTableRow` — padahal
 * render-nya sendiri sudah rekursif (`depth + 1`, tanpa batas). Data cucu ada
 * di memori, jalurnya tidak.
 *
 * KENAPA TEST INI ADA. Yang diuji di sini bukan React-nya, tapi dua aturan yang
 * membuat "kedalaman penuh" bisa dipercaya: (1) penelusuran HARUS menemukan
 * match di kedalaman berapa pun, dan (2) penelusuran HARUS berhenti — `parentId`
 * yang melingkar dari impor buruk pernah membuat RECURSIVE berjalan tanpa akhir
 * di server (#701 mencatat pool 20 koneksi), dan klien tidak punya pengaman itu
 * sama sekali. Test ini mengunci keduanya sebelum ditempel ke layar.
 */
import { indeksAnak, indeksId, keturunanCocok, rantaiLeluhur } from "./cariKedalaman";

type Simpul = { id: string; parentId?: string | null; judul?: string };

const pohon = (kedalaman: number): Simpul[] => {
  const arr: Simpul[] = [{ id: "akar", parentId: null, judul: "akar" }];
  for (let i = 1; i <= kedalaman; i++)
    arr.push({ id: `n${i}`, parentId: i === 1 ? "akar" : `n${i - 1}`, judul: `simpul ${i}` });
  return arr;
};

const akhir = (arr: Simpul[]) => arr[arr.length - 1].id;

describe("#864 indeksAnak / indeksId", () => {
  it("anak mengelompok di bawah induknya dan akar tidak punya kunci", () => {
    const anak = indeksAnak([
      { id: "a", parentId: null },
      { id: "b", parentId: "a" },
      { id: "c", parentId: "a" },
      { id: "d", parentId: "" },
    ]);
    expect(anak.get("a")?.map((s) => s.id)).toEqual(["b", "c"]);
    expect(anak.has("d")).toBe(false);
    expect(anak.size).toBe(1);
  });

  it("indeksId memetakan id ke simpul", () => {
    const byId = indeksId([
      { id: "a", parentId: null },
      { id: "b", parentId: "a" },
    ]);
    expect(byId.get("b")?.parentId).toBe("a");
  });
});

describe("#864 keturunanCocok menemukan match di kedalaman berapa pun", () => {
  it("cucu (kedalaman 2) ditemukan — inilah yang tidak bisa dilakukan perilaku lama", () => {
    const arr = pohon(2);
    const anak = indeksAnak(arr);
    const target = akhir(arr);
    const hasil = keturunanCocok("akar", anak, (s) => s.id === target);
    expect(hasil.map((s) => s.id)).toEqual([target]);
  });

  it("keturunan kedalaman 5 ditemukan walau induknya tidak cocok", () => {
    const arr = pohon(5);
    const hasil = keturunanCocok("akar", indeksAnak(arr), (s) => s.id === akhir(arr));
    expect(hasil.map((s) => s.id)).toEqual([akhir(arr)]);
  });

  it("semua match di cabang berbeda ikut terkumpul", () => {
    const arr: Simpul[] = [
      { id: "akar", parentId: null },
      { id: "c1", parentId: "akar" },
      { id: "c2", parentId: "akar" },
      { id: "g1", parentId: "c1" },
      { id: "g2", parentId: "c2" },
    ];
    const hasil = keturunanCocok("akar", indeksAnak(arr), (s) => s.id.startsWith("g"));
    expect(hasil.map((s) => s.id).sort()).toEqual(["g1", "g2"]);
  });

  it("akar tanpa anak mengembalikan daftar kosong, bukan error", () => {
    expect(
      keturunanCocok("akar", indeksAnak([{ id: "akar", parentId: null }]), () => true)
    ).toEqual([]);
  });
});

describe("#864 penelusuran dalam dan siklus", () => {
  it("menemukan hasil dan membuka semua leluhur melewati 20 tingkat", () => {
    const arr = pohon(40);
    const target = akhir(arr);
    expect(
      keturunanCocok("akar", indeksAnak(arr), (s) => s.id === target).map((s) => s.id)
    ).toEqual([target]);
    expect(rantaiLeluhur(target, indeksId(arr))).toHaveLength(40);
    expect(rantaiLeluhur(target, indeksId(arr)).at(-1)).toBe("akar");
  });

  it("siklus di indeks anak tidak mengurung penelusuran", () => {
    // Peta dibangun tangan karena `parentId` tunggal tidak bisa membentuk siklus
    // yang terjangkau dari akar; yang diuji di sini GUARD-nya: simpul yang sudah
    // dilihat tidak boleh dibuka lagi, walaupun datanya melingkar x -> y -> x.
    const x: Simpul = { id: "x", parentId: "akar" };
    const y: Simpul = { id: "y", parentId: "x" };
    const anak = new Map<string, Simpul[]>([
      ["akar", [x]],
      ["x", [y]],
      ["y", [{ id: "x", parentId: "y" }]],
    ]);
    const mulai = Date.now();
    expect(keturunanCocok("akar", anak, (s) => s.id === "y").map((s) => s.id)).toEqual(["y"]);
    expect(Date.now() - mulai).toBeLessThan(1000);
  });

  it("dua simpul yang saling mengaku induk tidak membuat jalan kaki menggantung", () => {
    const byId = indeksId([
      { id: "a", parentId: "b" },
      { id: "b", parentId: "a" },
    ]);
    const mulai = Date.now();
    expect(rantaiLeluhur("a", byId)).toEqual(["b"]);
    expect(Date.now() - mulai).toBeLessThan(1000);
  });

  it("simpul yang sudah dilihat tidak dihitung dua kali", () => {
    const arr = pohon(3);
    const anak = indeksAnak(arr);
    let jumlah = 0;
    const catat = () => {
      jumlah += 1;
      return true;
    };
    keturunanCocok("akar", anak, catat);
    expect(jumlah).toBe(3);
  });
});

describe("#864 rantaiLeluhur untuk auto-expand", () => {
  it("mengembalikan simpul antara SAMPAI AKAR, tanpa diri sendiri", () => {
    // Akar ikut karena yang harus dibuka saat mencari ialah seluruh rantai,
    // bukan hanya simpul antara.
    const arr = pohon(3);
    expect(rantaiLeluhur(akhir(arr), indeksId(arr))).toEqual(["n2", "n1", "akar"]);
  });

  it("anak langsung hanya punya satu leluhur", () => {
    const arr = pohon(1);
    expect(rantaiLeluhur("n1", indeksId(arr))).toEqual(["akar"]);
  });

  it("parentId menggantung berhenti diam-diam", () => {
    const arr: Simpul[] = [
      { id: "a", parentId: "tidak-ada" },
      { id: "b", parentId: "a" },
    ];
    expect(rantaiLeluhur("b", indeksId(arr))).toEqual(["a"]);
  });

  it("siklus tidak mengurung rantai", () => {
    const arr: Simpul[] = [
      { id: "a", parentId: "b" },
      { id: "b", parentId: "a" },
      { id: "c", parentId: "a" },
    ];
    const mulai = Date.now();
    const hasil = rantaiLeluhur("c", indeksId(arr));
    expect(Date.now() - mulai).toBeLessThan(1000);
    expect(hasil).toEqual(["a", "b"]);
  });
});
