/**
 * #772 — daftar Diagram Alur diurut di KELIEN (datanya sudah utuh di memori,
 * berbeda dari Rapat dan Dokumentasi yang di-page server). Yang dikunci di sini
 * dua hal yang tidak bisa dibuktikan `tsc`:
 *
 * (1) setiap kunci yang bisa ditekan di kepala tabel memang punya nilai
 *     pembanding — kunci asing tidak boleh menghasilkan urutan acak;
 * (2) baris bernilai sama TIDAK bertukar tempat antar render, karena papan ini
 *     diurut ulang pada setiap render dan pengguna bisa kehilangan satu baris di
 *     tengah halaman bila pembandingnya tidak stabil.
 */
import { buatPembandingSortirAlur, nilaiSortirAlur } from "./sortirAlur";
import type { FlowchartData } from "../types";
import type { Task } from "../../../types";

const papan = (bagian: Partial<FlowchartData> & { id: string }): FlowchartData =>
  ({ name: "", description: "", nodes: [], edges: [], theme: {}, ...bagian }) as FlowchartData;

const ISU: Task[] = [
  { id: "t1", key: "PRJ-2", title: "Setting & Services" } as Task,
  { id: "t2", key: "PRJ-9", title: "Alur ekspor" } as Task,
];

const KONTEKS = { penulisAktif: "Administrator", tasks: ISU };

const urutkan = (daftar: FlowchartData[], kolom: string | null, arah: "asc" | "desc") =>
  [...daftar].sort(buatPembandingSortirAlur(kolom, arah, KONTEKS));

describe("#772 — pembanding daftar diagram alur", () => {
  const sampel = [
    papan({
      id: "a",
      name: "Zeta",
      category: "PRD",
      description: "isi panjang",
      epicTaskId: "t2",
      createdByName: "Budi",
      createdAt: "2026-01-01T00:00:00.000Z",
    }),
    papan({
      id: "b",
      name: "alpha",
      category: "Panduan",
      description: "isi pendek",
      epicTaskId: "t1",
      createdByName: "Ani",
      createdAt: "2026-03-01T00:00:00.000Z",
    }),
    papan({
      id: "c",
      name: "Middel",
      category: "Laporan",
      createdAt: "2026-02-01T00:00:00.000Z",
      lastEditedAt: "2026-09-01T00:00:00.000Z",
    }),
  ];

  it("nama dibandingkan tanpa peduli kapital, jadi 'alpha' tidak jatuh ke bawah", () => {
    expect(urutkan(sampel, "name", "asc").map((f) => f.id)).toEqual(["b", "c", "a"]);
    expect(urutkan(sampel, "name", "desc").map((f) => f.id)).toEqual(["a", "c", "b"]);
  });

  it("kolom yang ditampilkan tabel punya nilai pembanding sendiri", () => {
    expect(nilaiSortirAlur(sampel[0], "category", KONTEKS)).toBe("PRD");
    expect(nilaiSortirAlur(sampel[0], "description", KONTEKS)).toBe("isi panjang");
    expect(nilaiSortirAlur(sampel[2], "description", KONTEKS)).toBe("");
    expect(nilaiSortirAlur(sampel[0], "author", KONTEKS)).toBe("Budi");
    expect(nilaiSortirAlur(sampel[2], "author", KONTEKS)).toBe("Administrator");
  });

  it("isu tertaut diurut lewat label yang sama dengan yang dibaca di sel", () => {
    // Baris tanpa isu tidak membuang label kosong ke bawah: selnya menampilkan
    // "-" untuk nilai yang sama, jadi ia memang paling depan saat ASC.
    expect(urutkan(sampel, "linkedIssue", "asc").map((f) => f.id)).toEqual(["c", "b", "a"]);
  });

  it("pembuat diurut lewat nama yang tampil, bukan id auth", () => {
    expect(urutkan(sampel, "author", "asc").map((f) => f.id)).toEqual(["c", "b", "a"]);
  });

  it("kolom asing jatuh ke urutan bawaan, bukan urutan acak", () => {
    const bawaan = urutkan(sampel, null, "asc")
      .map((f) => f.id)
      .join();
    for (const asing of ["password", "nodes", "", "createdAt; DROP"]) {
      expect(
        urutkan(sampel, asing, "desc")
          .map((f) => f.id)
          .join()
      ).toBe(bawaan);
    }
  });

  it("bawaan tetap paling akhir diubah lebih dulu", () => {
    expect(urutkan(sampel, null, "asc").map((f) => f.id)).toEqual(["c", "b", "a"]);
  });

  it("dua baris bernilai sama tidak bertukar tempat", () => {
    const kembar = [
      papan({ id: "z", name: "Sama" }),
      papan({ id: "y", name: "Sama" }),
      papan({ id: "x", name: "Sama" }),
    ];
    const sekali = urutkan(kembar, "name", "asc")
      .map((f) => f.id)
      .join();
    for (let i = 0; i < 5; i++)
      expect(
        urutkan(kembar, "name", "asc")
          .map((f) => f.id)
          .join()
      ).toBe(sekali);
    expect(sekali).toBe("x,y,z");
  });
});
