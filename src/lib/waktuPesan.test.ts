/**
 * #791 — satu stempel waktu untuk semua permukaan pesan.
 *
 * Semua tanggal di sini TETAP, termasuk `sekarang`. Tidak ada satu pun
 * assertion yang membandingkan waktu dinding: #789 mencatat bahwa
 * `akarDaftar-689.test.ts:81` merah-hijau tergantung beban mesin, dan test ini
 * tidak boleh menambah contoh kedua.
 */
import { bentukWaktu, waktuPesan } from "./waktuPesan";
import { readFileSync } from "fs";
import { join } from "path";

const AKAR = join(__dirname, "..");
const baca = (relatif: string) => readFileSync(join(AKAR, relatif), "utf8").replace(/\r\n/g, "\n");

const SEKARANG = new Date(2026, 9, 18, 14, 0); // 18 Okt 2026, 14.00
const t = (kunci: string) => `⟨${kunci}⟩`;
const jalankan = (d: unknown, bahasa = "id") => waktuPesan(d, { t, bahasa, sekarang: SEKARANG });

const HARI_ID = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
const HARI_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

describe("bentukWaktu (#791)", () => {
  it("memilih bentuk menurut hari kalender, bukan selisih 24 jam", () => {
    expect(bentukWaktu(new Date(2026, 9, 18, 0, 5), SEKARANG)).toBe("jam");
    expect(bentukWaktu(new Date(2026, 9, 17, 23, 50), SEKARANG)).toBe("kemarin");
    expect(bentukWaktu(new Date(2026, 9, 16), SEKARANG)).toBe("hari");
    expect(bentukWaktu(new Date(2026, 9, 11), SEKARANG)).toBe("tanggal");
    expect(bentukWaktu(new Date(2025, 9, 12), SEKARANG)).toBe("tanggalTahun");
  });

  it("batas enam hari masih 'hari', hari ketujuh sudah 'tanggal'", () => {
    expect(bentukWaktu(new Date(2026, 9, 12), SEKARANG)).toBe("hari"); // 6 hari
    expect(bentukWaktu(new Date(2026, 9, 11), SEKARANG)).toBe("tanggal"); // 7 hari
  });

  it("31 Desember melawan 1 Januari jatuh ke tanggalTahun, bukan 'hari'", () => {
    const awal = new Date(2027, 0, 1, 9, 0);
    expect(bentukWaktu(new Date(2026, 11, 31), awal)).toBe("kemarin");
    expect(bentukWaktu(new Date(2026, 11, 30), awal)).toBe("hari");
    expect(bentukWaktu(new Date(2026, 11, 25), awal)).toBe("tanggalTahun");
  });
});

describe("waktuPesan (#791)", () => {
  it("hari ini tetap jam — tidak ada regresi diam-diam pada pesan terbaru", () => {
    const hasil = jalankan(new Date(2026, 9, 18, 9, 5));
    expect(hasil).toMatch(/^\d{1,2}[.:]\d{2}$/);
    expect(hasil).not.toMatch(/Okt| Okt|December/);
  });

  it("kemarin lewat kamus, bukan teks jadi di komponen", () => {
    expect(jalankan(new Date(2026, 9, 17, 20, 0))).toBe("⟨waktuPesan.kemarin⟩");
  });

  it("enam hari terakhir memakai nama hari yang ikut bahasa", () => {
    expect(HARI_ID).toContain(jalankan(new Date(2026, 9, 15), "id"));
    expect(HARI_EN).toContain(jalankan(new Date(2026, 9, 15), "en"));
  });

  it("tahun yang sama memakai tanggal pendek, tahun lain memakai tahun", () => {
    expect(jalankan(new Date(2026, 8, 3), "id")).toBe("3 Sep");
    expect(jalankan(new Date(2025, 9, 12), "id")).toBe("12 Okt 2025");
    // polanya "d MMM yyyy" untuk kedua bahasa: yang berubah nama bulannya,
    // bukan urutannya — jadi "12 Oct 2025", bukan format Amerika.
    expect(jalankan(new Date(2025, 9, 12), "en")).toBe("12 Oct 2025");
  });

  it("menerima Timestamp Firestore, bukan hanya Date dan ISO", () => {
    const stub = { toDate: () => new Date(2026, 8, 12) };
    expect(jalankan(stub as any, "id")).toBe("12 Sep");
    expect(jalankan("2026-09-12T12:00:00.000Z", "id")).toBe("12 Sep");
  });
});

describe("satu sumber stempel waktu untuk permukaan pesan (#791)", () => {
  const permukaan: [string, string][] = [
    [join("features", "meeting-notes", "components", "LaciUtas.tsx"), "utas diskusi"],
    [join("components", "LiveChatWidget.tsx"), "LiveChat"],
    [join("features", "qa", "components", "QADetailDrawer.tsx"), "komentar QA"],
  ];

  for (const [relatif, nama] of permukaan) {
    it(`${nama} memakai waktuPesan(), bukan toLocaleTimeString sendiri`, () => {
      const isi = baca(relatif);
      expect(isi).toContain("waktuPesan(");
      expect(isi).not.toContain("toLocaleTimeString");
    });
  }

  it("kunci kamusnya ada di kedua bahasa", () => {
    const id = baca(join("i18n", "locales", "id.ts"));
    const en = baca(join("i18n", "locales", "en.ts"));
    expect(id).toMatch(/waktuPesan:\s*\{\s*kemarin:/);
    expect(en).toMatch(/waktuPesan:\s*\{\s*kemarin:/);
  });
});
