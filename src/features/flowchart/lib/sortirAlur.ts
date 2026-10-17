/**
 * #772 — pembanding urutan untuk daftar Diagram Alur.
 *
 * Berbeda dengan Rapat dan Dokumentasi yang paginasinya dikerjakan server,
 * daftar flowchart sudah utuh di memori klien (`useFlowchartList`), jadi
 * mengurutnya di klien adalah satu-satunya versi yang jujur — mengirim
 * `?sort=` ke server untuk modul yang datanya tidak dibaca dari server berarti
 * parameter itu hanya bersolek di URL.
 *
 * `kolom` di sini adalah satu-satunya kunci yang dikenal kepala tabel
 * `FlowchartDashboard`. Nilai di luar itu jatuh ke `bawaan`, sehingga kepala
 * tabel yang tidak terdaftar tidak bisa menghasilkan urutan acak.
 */
import { tampilanNamaPembuat } from "./authorIdentity";
import { labelTautanIsu } from "./tautanIsu";
import type { FlowchartData } from "../types";
import type { Task } from "../../../types";

export type KunciSortirAlur =
  "name" | "category" | "description" | "linkedIssue" | "author" | "lastEditedAt";

interface KonteksSortir {
  /** Nama pembuat yang tampil di kolom Pembuat — identitas aktif sebagai cadangan. */
  penulisAktif: string;
  /** Sumber judul isu tertaut, sama seperti yang dibaca sel tabelnya. */
  tasks: Task[];
}

const teks = (nilai: string | null | undefined) => (nilai ?? "").toString();

/** Kunci yang dikenal kepala tabel — sama fungsinya dengan allow-list di server. */
const KUNCI_ALUR = new Set<string>([
  "name",
  "category",
  "description",
  "linkedIssue",
  "author",
  "lastEditedAt",
]);

/** Nilai pembanding satu baris untuk satu kolom. */
export const nilaiSortirAlur = (
  fw: FlowchartData,
  kolom: KunciSortirAlur,
  k: KonteksSortir
): string => {
  switch (kolom) {
    case "name":
      return teks(fw.name);
    case "category":
      return teks(fw.category);
    case "description":
      return teks(fw.description);
    case "linkedIssue": {
      const isu = k.tasks.find((t) => t.id === fw.epicTaskId);
      return isu ? labelTautanIsu(isu.key, isu.title) : "";
    }
    case "author":
      return teks(tampilanNamaPembuat(fw, k.penulisAktif));
    case "lastEditedAt":
      return teks(fw.lastEditedAt || fw.createdAt);
  }
};

/**
 * Urutan bawaan papan: paling akhir diubah lebih dulu — warisan perilaku sebelum
 * #772, dipertahankan supaya test #639 dan kebiasaan pemilik proyek tidak
 * berubah diam-diam saat kolom belum ditekan.
 */
const sortirAlurBawaan = (a: FlowchartData, b: FlowchartData): number =>
  teks(b.lastEditedAt || b.createdAt).localeCompare(teks(a.lastEditedAt || a.createdAt));

/**
 * Pembanding untuk satu kolom dan arah. Tanggal dibandingkan sebagai string ISO
 * — sama seperti selnya menampilkan — jadi format `YYYY-MM-DDTHH:mm:ss` sudah
 * terurut leksikografis. `id` menjadi penyeimbang agar dua baris bernilai sama
 * tidak saling bertukar tempat setiap render.
 *
 * Kolom di luar `KUNCI_ALUR` (termasuk `null` = belum ada kolom ditekan) jatuh
 * ke urutan bawaan, persis seperti server yang mengabaikan `?sort=` asing.
 */
export const buatPembandingSortirAlur =
  (kolom: string | null, arah: "asc" | "desc", k: KonteksSortir) =>
  (a: FlowchartData, b: FlowchartData): number => {
    if (!kolom || !KUNCI_ALUR.has(kolom)) return sortirAlurBawaan(a, b);
    const tanda = arah === "asc" ? 1 : -1;
    const selisih = nilaiSortirAlur(a, kolom as KunciSortirAlur, k).localeCompare(
      nilaiSortirAlur(b, kolom as KunciSortirAlur, k),
      "id",
      { sensitivity: "base", numeric: true }
    );
    if (selisih !== 0) return selisih * tanda;
    return teks(a.id).localeCompare(teks(b.id));
  };
