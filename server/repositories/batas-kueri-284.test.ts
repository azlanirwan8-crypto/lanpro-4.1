/**
 * Regresi ISSUE-284 — kueri yang tumbuh tanpa batas wajib punya batas atas.
 *
 * Ancamannya bukan tampilan yang lambat, melainkan KONEKSI: pool diklem
 * maksimal 20 (#175), jadi satu kueri panjang menahan koneksi dan permintaan
 * berikutnya mengantre sampai timeout — gejala yang sama dengan #163/#175
 * walau akarnya berbeda.
 *
 * Yang dijaga di sini adalah kueri yang benar-benar dikirim ke basis data,
 * bukan sekadar keberadaan konstanta. Riwayat chat mendapat perhatian khusus:
 * urutan tampilnya ASC, sehingga `LIMIT` polos akan memulangkan pesan TERTUA
 * dan membuang yang baru — kebalikan dari yang berguna.
 */

const mockKueri = jest.fn();

jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: {
    getConnection: async () => ({
      query: mockKueri,
      release: () => undefined,
    }),
  },
}));

import { chatRepository } from "./chat.repository";
import { userRepository } from "./user.repository";

beforeEach(() => {
  mockKueri.mockReset();
  mockKueri.mockResolvedValue([[]]);
});

/** Kueri terakhir yang dikirim, dirapatkan spasinya agar mudah dicocokkan. */
function kueriTerakhir(): string {
  const panggilan = mockKueri.mock.calls;
  return String(panggilan[panggilan.length - 1][0])
    .replace(/\s+/g, " ")
    .trim();
}

describe("#284 batas atas kueri yang tumbuh tanpa batas", () => {
  it("riwayat percakapan dibatasi DAN tetap dipulangkan urut terlama-dulu", async () => {
    await chatRepository.findConversationMessages("u-1", "u-2");
    const sql = kueriTerakhir();

    expect(sql).toMatch(/LIMIT \d+/);
    // Inti perbaikannya: yang diambil adalah n TERBARU (subkueri DESC),
    // lalu dibalik ke ASC untuk ditampilkan.
    expect(sql).toContain("ORDER BY timestamp DESC LIMIT");
    expect(sql).toMatch(/\) AS terbaru ORDER BY timestamp ASC$/);
  });

  it("riwayat grup mendapat perlakuan yang sama", async () => {
    await chatRepository.findConversationMessages("u-1", "group");
    const sql = kueriTerakhir();

    expect(sql).toContain("ORDER BY timestamp DESC LIMIT");
    expect(sql).toMatch(/\) AS terbaru ORDER BY timestamp ASC$/);
  });

  it("daftar pengguna dibatasi dan urutannya PASTI", async () => {
    await userRepository.findAll();
    const sql = kueriTerakhir();

    expect(sql).toMatch(/LIMIT \d+$/);
    // `LIMIT` tanpa urutan pasti memulangkan baris berbeda-beda antar
    // pemanggilan, dan daftar yang berubah tanpa sebab lebih membingungkan
    // daripada daftar yang terpotong.
    expect(sql).toContain("ORDER BY createdAt DESC");
  });
});
