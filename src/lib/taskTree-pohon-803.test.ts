/**
 * #803 — `pohonKeturunan`: seluruh keturunan, berurut baca pohon, aman lingkaran.
 *
 * Yang diuji di sini adalah URUTAN, bukan hanya keanggotaan. `getAllDescendants`
 * sudah lama bisa memulangkan cucu, tetapi per tingkat (semua anak dulu, baru
 * semua cucu) — untuk daftar yang dibaca sebagai pohon, urutan itu menempatkan
 * cucu dari anak pertama setelah anak terakhir, jadi barisnya tidak berdampingan
 * dengan induknya sendiri.
 */
import { pohonKeturunan, getAllDescendants, getTaskDepth } from "./taskTree";

type Baris = { id: string; parentId?: string | null };

const b = (id: string, parentId?: string): Baris => ({ id, parentId });

// Pohon yang dipakai seluruh kasus di bawah:
//
//   root
//   ├── a
//   │   ├── a1
//   │   └── a2
//   │       └── a2x
//   └── d
describe("#803 — pohonKeturunan", () => {
  const pohon: Baris[] = [
    b("root"),
    b("a", "root"),
    b("d", "root"),
    b("a1", "a"),
    b("a2", "a"),
    b("a2x", "a2"),
  ];

  const bentuk = (daftar: { task: Baris; kedalaman: number }[]) =>
    daftar.map(({ task, kedalaman }) => `${task.id}:${kedalaman}`);

  it("memulangkan anak DAN cucu dalam urutan baca pohon", () => {
    expect(bentuk(pohonKeturunan("root", pohon))).toEqual(["a:1", "a1:2", "a2:2", "a2x:3", "d:1"]);
  });

  it("kedalaman sebuah baris sama dengan yang dijawab getTaskDepth", () => {
    // Dua sumber kedalaman yang berbeda jawaban adalah bibit temuan berikutnya;
    // test ini mengikat keduanya.
    pohonKeturunan("root", pohon).forEach(({ task, kedalaman }) => {
      expect(getTaskDepth(task, pohon)).toBe(kedalaman);
    });
  });

  it("anak tanpa keturunan hanya menampilkan dirinya sendiri", () => {
    expect(bentuk(pohonKeturunan("d", pohon))).toEqual([]);
    expect(bentuk(pohonKeturunan("a1", pohon))).toEqual([]);
  });

  it("himpunan barisnya sama dengan getAllDescendants, urutan berbeda", () => {
    const pohonIds = pohonKeturunan("root", pohon)
      .map(({ task }) => task.id)
      .sort();
    const datarIds = getAllDescendants("root", pohon)
      .map((t) => t.id)
      .sort();
    expect(pohonIds).toEqual(datarIds);
    // Peringkat urutan: yang datar menumpuk semua anak di depan.
    expect(getAllDescendants("root", pohon).map((t) => t.id)).toEqual([
      "a",
      "d",
      "a1",
      "a2",
      "a2x",
    ]);
  });

  it("parentId yang melingkar tidak membuat rekursi tak berakhir", () => {
    const lingkaran: Baris[] = [b("x", "y"), b("y", "x")];
    expect(bentuk(pohonKeturunan("x", lingkaran))).toEqual(["y:1"]);

    const diriSendiri: Baris[] = [b("z", "z")];
    expect(bentuk(pohonKeturunan("z", diriSendiri))).toEqual([]);
  });

  it("induk yang tidak punya anak memulangkan daftar kosong, bukan error", () => {
    expect(pohonKeturunan("tidak-ada", pohon)).toEqual([]);
    expect(pohonKeturunan("root", [])).toEqual([]);
  });
});
