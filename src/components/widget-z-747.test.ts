/**
 * #747 — widget mengambang tidak boleh menutupi lembar bawah notifikasi.
 *
 * Pemilik proyek 15 Okt 2026: "masih ada halaman ui yang tabrakan saat klik
 * notification", dan lokasinya dipastikan di HP pada panel lembar bawah.
 *
 * Yang membuat tabrakan itu mungkin adalah ANGKA, bukan niat: lembar bawah
 * notifikasi dirender portal di z-[44] (anggaran #729 — di atas bar 40, di bawah
 * scrim 45 dan modal 50), sementara tiga widget mengambang duduk di z-50 atau
 * lebih tinggi. Di HP jejak keduanya hampir identik: kotak obrolan
 * `max-md:fixed max-md:inset-x-0` dengan tinggi `min(72vh,520px)`, lembar
 * notifikasi `bottom: 0` selebar layar dengan tinggi yang sama.
 *
 * Gerbang `audit:z` TIDAK bisa menangkap ini — ia membekukan himpunan nilai dan
 * meratchet jumlah per berkas, dan mengganti z-50 jadi z-40 di berkas yang sama
 * tidak mengubah keduanya. Yang bisa menangkapnya hanya test yang MEMBANDINGKAN
 * angkanya, jadi itulah yang dilakukan berkas ini: ia membaca z widget dan z
 * portal dari sumbernya, bukan menghafal literalnya.
 */
import fs from "fs";
import path from "path";

const AKAR = path.join(__dirname, "..", "..");
const baca = (relatif: string) => fs.readFileSync(path.join(AKAR, relatif), "utf8");

/**
 * Komentar dibuang lebih dulu — persis seperti `scripts/validate/audit-z.cjs`.
 * Tanpa ini, penjelasan yang menyebut angka lama ("z-40, bukan z-50") terbaca
 * sebagai pemakaian dan test-nya gagal karena kalimatnya sendiri.
 */
const tanpaKomentar = (sumber: string) =>
  sumber.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/[^\n]*/g, "");

/** z tertinggi yang dipakai sebuah berkas, dari kelas `z-N` maupun `z-[N]`. */
const zTertinggi = (sumber: string): number => {
  const nilai = [...tanpaKomentar(sumber).matchAll(/\bz-\[?(\d+)\]?/g)].map((m) => Number(m[1]));
  expect(nilai.length).toBeGreaterThan(0);
  return Math.max(...nilai);
};

/** z panel portal milik lembar bawah notifikasi — jangkar tangga yang wajib dibaca. */
const zPortalNotifikasi = (): number => {
  const sumber = baca("src/components/NotificationsDropdown.tsx");
  const m = /className="z-\[(\d+)\][^"]*max-md:h-\[min\(72vh,520px\)\]/.exec(sumber);
  expect(m).not.toBeNull();
  return Number(m![1]);
};

describe("Widget mengambang di bawah lembar bawah notifikasi (#747)", () => {
  const zLembar = zPortalNotifikasi();

  it.each([
    ["src/components/LiveChatWidget.tsx"],
    ["src/features/issues/components/list/IssueBulkActionsBar.tsx"],
    ["src/features/issues/components/list/IssueQuickCreateBar.tsx"],
  ])("%s tidak memakai z setinggi panel portal", (relatif) => {
    expect(zTertinggi(baca(relatif))).toBeLessThan(zLembar);
  });

  it("lembar bawah notifikasi tetap di anak tangga #729: di atas bar 40, di bawah modal 50", () => {
    expect(zLembar).toBeGreaterThan(40);
    expect(zLembar).toBeLessThan(50);
  });

  it("wadah obrolan adalah konteks stacking, jadi satu angka mengurus tombol DAN kotaknya", () => {
    // Kotak obrolan di HP memakai `max-md:fixed`, yang membuatnya terlihat seperti
    // lapisan tersendiri. Ia tetap anak dari wadah `fixed … z-N`, sehingga z wadah
    // adalah langit-langitnya terhadap halaman — alasan penurunan satu baris di
    // wadah sudah cukup. Bila suatu saat kotaknya dipindah ke portal, test ini
    // harus ikut berubah, dan perbandingan di atas wajib dihitung ulang.
    const sumber = baca("src/components/LiveChatWidget.tsx");
    const wadah = /id="lanpro-live-chat-widget"\s+className="([^"]*)"/.exec(sumber);
    expect(wadah).not.toBeNull();
    expect(wadah![1]).toContain("fixed");
    expect(wadah![1]).toMatch(/\bz-\d+\b/);
  });
});
