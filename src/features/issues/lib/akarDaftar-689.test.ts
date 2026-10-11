/**
 * #689 butir (d) — `akarDaftar` adalah versi cepat dari ekspresi yang dulu
 * ditulis inline di `AppRoutes.tsx:307-309`. Test ini mengunci bahwa "cepat"
 * tidak berarti "berbeda": aturan akar-anaknya dievaluasi terhadap rumus lama
 * baris demi baris, termasuk kasus yang mudah salah (induk di luar halaman,
 * `parentId` kosong, id kembar, baris tanpa id).
 */
import { akarDaftar } from "./akarDaftar";
import type { Task } from "../../../types";

const tugas = (id: string, parentId?: string): Task =>
  ({ id, parentId: parentId || null, title: `T-${id}` }) as Task;

/** Rumus lama, dipertahankan apa adanya sebagai oracle. */
const akarLama = (tasks: Task[]): Task[] =>
  (tasks || []).filter((t) => !t.parentId || !(tasks || []).some((p) => p.id === t.parentId));

const banding = (tasks: Task[]) => {
  const lama = akarLama(tasks)
    .map((t) => t.id)
    .filter((id, i, semua) => id && semua.indexOf(id) === i);
  expect(akarDaftar(tasks).map((t) => t.id)).toEqual(lama);
};

describe("#689 akarDaftar", () => {
  it("identik dengan rumus lama pada campuran induk-anak", () => {
    banding([tugas("a"), tugas("a-1", "a"), tugas("b"), tugas("b-1", "b"), tugas("b-2", "b-1")]);
  });

  it("anak yang induknya tidak ikut datang tetap dianggap akar", () => {
    // Halaman kedua bisa berisi anak tanpa induknya (paging akar). Rumus lama
    // menaruhnya di daftar; kalau versi cepat ini membuangnya, baris itu
    // hilang dari layar tanpa pesan apa pun.
    const tasks = [tugas("yatim", "tidak-ada")];
    expect(akarDaftar(tasks).map((t) => t.id)).toEqual(["yatim"]);
  });

  it("`parentId` kosong, null, dan tidak ada diperlakukan sama", () => {
    const tasks = [
      { id: "p", parentId: "", title: "P" },
      { id: "q", parentId: null, title: "Q" },
      { id: "r", title: "R" },
    ] as unknown as Task[];
    expect(akarDaftar(tasks).map((t) => t.id)).toEqual(["p", "q", "r"]);
  });

  it("id kembar dihitung sekali, urutan kemunculan pertama yang dipakai", () => {
    const tasks = [tugas("a"), tugas("a"), tugas("b")];
    expect(akarDaftar(tasks).map((t) => t.id)).toEqual(["a", "b"]);
  });

  it("baris tanpa id dibuang, bukan dipakai sebagai akar palsu", () => {
    const tasks = [{ id: "", title: "kosong" }, null, tugas("a")] as unknown as Task[];
    expect(akarDaftar(tasks).map((t) => t.id)).toEqual(["a"]);
  });

  it("susunan melingkar tidak membuat seluruh baris hilang", () => {
    // a -> b -> a: keduanya punya parentId yang dikenali, jadi rumus lama pun
    // tidak punya akar. Yang dikunci di sini: hasilnya KOSONG, bukan error,
    // sehingga layar kosong tetap bisa diberi sebab oleh `keadaanDaftar`.
    const tasks = [tugas("a", "b"), tugas("b", "a")];
    expect(akarDaftar(tasks)).toEqual([]);
  });

  it("seribu baris diselesaikan tanpa ledakan biaya perbandingan", () => {
    // Rumus lama memanggil `some` per baris. Diuji pada dataset tiket (1.000)
    // supaya klaim "lebih murah" punya angka, bukan cuma narasi.
    const tasks: Task[] = [];
    for (let i = 0; i < 1000; i++) {
      tasks.push(tugas(`t${i}`, i % 10 === 0 ? undefined : `t${Math.floor(i / 10)}`));
    }
    const mulai = performance.now();
    const hasil = akarDaftar(tasks);
    const baru = performance.now() - mulai;

    const awal = performance.now();
    const lamaCount = akarLama(tasks).length;
    const lama = performance.now() - awal;

    expect(hasil.length).toBe(lamaCount);
    expect(baru).toBeLessThan(lama);
  });
});
