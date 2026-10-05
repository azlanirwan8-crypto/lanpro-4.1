/**
 * #639 — satu ukuran halaman untuk semua datatable daftar.
 *
 * MENGAPA TEST INI ADA. Keluhan pemilik proyek 05 Okt lewat tangkapan layar
 * daftar Flowchart: "saya lihat ada spasi yang kosong padahal datanya 6 - cek
 * semua datatable, hal yang sama begini". Sebabnya: daftar Flowchart mengunci
 * 5 baris per halaman (`useFlowchartList.ts:23`) dan `setItemsPerPage` tidak
 * pernah dipanggil dari mana pun, jadi papan ke-6 masuk halaman 2 sementara
 * kartu tabel yang memanjang menyisakan ruang kosong. Dokumentasi 8, Meeting
 * Notes 8, Discussion Points 5 - empat angka untuk satu kata "halaman",
 * sedangkan Pengguna dan Isu sudah lama punya pemilih baris per halaman.
 *
 * Test ini MEMBACA SUMBERnya, bukan merender empat layar penuh, karena yang
 * harus dijamin adalah KONSISTENSI angka dan adanya pemilih di kaki tabel -
 * dan supaya gerbang ini tetap merah kalau suatu hari ada fitur baru yang
 * kembali menaruh angka kecil sendiri.
 */
import { readFileSync } from "fs";
import { join } from "path";

const AKAR = join(__dirname, "..", "..");
const baca = (relatif: string) => readFileSync(join(AKAR, relatif), "utf8").replace(/\r\n/g, "\n");

/** Berkas yang memegang ukuran halaman daftar yang dilihat pengguna. */
const DAFTAR = [
  "src/hooks/useFlowchartList.ts",
  "src/features/wiki/WikiView.tsx",
  "src/features/meeting-notes/MeetingNotes.tsx",
  "src/features/meeting-notes/DiscussionPointsTable.tsx",
];

/** Kaki tabel tempat pemilih baris per halaman dipasang. */
const KAKI_TABEL = [
  "src/features/flowchart/components/FlowchartDashboard.tsx",
  "src/features/wiki/WikiView.tsx",
  "src/features/meeting-notes/MeetingNotes.tsx",
  "src/features/meeting-notes/DiscussionPointsTable.tsx",
];

describe("ukuran halaman datatable (#639)", () => {
  it.each(DAFTAR)("%s memakai bawaan 10 baris, bukan angka kecil sendiri", (relatif) => {
    const sumber = baca(relatif);
    const cocok = /itemsPerPage[^\n]*useState(?:<number>)?\((\d+)\)/.exec(sumber);

    expect(cocok).not.toBeNull();
    expect(cocok![1]).toBe("10");
  });

  it.each(KAKI_TABEL)("%s memasang pemilih baris per halaman", (relatif) => {
    expect(baca(relatif)).toContain("ListPerPageSelect");
  });

  it("tidak ada lagi angka halaman yang ditulis sebagai konstanta mati", () => {
    const mati = DAFTAR.filter((f) => /const itemsPerPage = \d+;/.test(baca(f)));
    expect(mati).toEqual([]);
  });

  it("pilihan terbesar tidak dipotong server diam-diam", () => {
    const paginasi = baca("server/lib/pagination.ts");
    const batas = /MAX_LIMIT = (\d+)/.exec(paginasi);

    expect(batas).not.toBeNull();
    // Pemilih menawarkan 100; kalau batas server turun di bawah itu, opsi
    // terbesar akan mengembalikan lebih sedikit baris daripada yang diminta.
    expect(Number(batas![1])).toBeGreaterThanOrEqual(100);
  });
});
