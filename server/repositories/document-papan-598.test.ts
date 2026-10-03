/**
 * #598 — papan flowchart menumpang tabel Documents (`type: "flowchart"`, isinya
 * di `canvasData`), jadi daftar Dokumentasi yang tidak menyebut jenis pernah
 * memulangkan papan sebagai kartu dokumen.
 *
 * Adapter database di-mock — tidak ada koneksi Postgres sungguhan. Yang diuji
 * adalah KLAUSUL WHERE dan PARAMETER-nya, sebab di situlah pemisahan itu hidup.
 */
const kueriPalsu = jest.fn();

jest.mock("../../src/lib/db", () => ({
  __esModule: true,
  default: {
    query: (...a: unknown[]) => kueriPalsu(...a),
    getConnection: async () => ({
      query: (...a: unknown[]) => kueriPalsu(...a),
      release: () => {},
    }),
  },
}));

import { DocumentRepository, JENIS_PAPAN } from "./document.repository";

const repo = new DocumentRepository();

const kueri = (i = 0) => String(kueriPalsu.mock.calls[i][0]);
const parameter = (i = 0) => kueriPalsu.mock.calls[i][1] as unknown[];

beforeEach(() => jest.clearAllMocks());

describe("document.repository — katalog dokumen tidak mencampur papan (#598)", () => {
  it("penanda papan persis 'flowchart' huruf kecil", () => {
    // Dua-duanya huruf kecil dan sama-sama dikunci: server membandingkan `=`
    // (bukan ILIKE), jadi dokumen yang jenisnya berlabel "Flowchart" dari master
    // data tetap milik Dokumentasi.
    expect(JENIS_PAPAN).toBe("flowchart");
  });

  it("daftar tanpa jenis mengecualikan baris papan", async () => {
    kueriPalsu.mockResolvedValue([[]]);
    await repo.findByProjectId("p-1");
    expect(kueri()).toMatch(/COALESCE\(type, ''\) <> \?/);
    expect(parameter()).toEqual(["p-1", JENIS_PAPAN]);
  });

  it("daftar berjenis eksplisit memakai pencocokan tepat, bukan ILIKE", async () => {
    kueriPalsu.mockResolvedValue([[]]);
    await repo.findByProjectId("p-1", undefined, "Flowchart");
    expect(kueri()).toMatch(/type = \?/);
    expect(kueri()).not.toMatch(/ILIKE/i);
    expect(kueri()).not.toMatch(/<>/);
    expect(parameter()).toEqual(["p-1", "Flowchart"]);
  });

  it("menu Flowchart tetap bisa meminta barisnya sendiri", async () => {
    kueriPalsu.mockResolvedValue([[]]);
    await repo.findByProjectId("p-1", undefined, JENIS_PAPAN);
    expect(kueri()).toMatch(/type = \?/);
    expect(parameter()).toEqual(["p-1", JENIS_PAPAN]);
  });

  it('"Semua" diperlakukan sama dengan tanpa jenis', async () => {
    kueriPalsu.mockResolvedValue([[]]);
    await repo.findByProjectId("p-1", undefined, "Semua");
    expect(kueri()).toMatch(/<>/);
    expect(parameter()).toEqual(["p-1", JENIS_PAPAN]);
  });

  it("jumlah dan baris berpaginasi memakai penjaga yang sama", async () => {
    // Kalau hanya satu dari dua kueri yang dijaga, total di sudut layar akan
    // menghitung papan yang tidak pernah tampil di daftar.
    kueriPalsu.mockResolvedValueOnce([[{ total: 3 }]]).mockResolvedValueOnce([[]]);
    await repo.findByProjectIdPaged("p-1", { page: 1, limit: 25, offset: 0 });

    expect(kueriPalsu).toHaveBeenCalledTimes(2);
    expect(kueri(0)).toMatch(/COUNT\(\*\)::int AS total/);
    expect(kueri(0)).toMatch(/COALESCE\(type, ''\) <> \?/);
    expect(parameter(0)).toEqual(["p-1", JENIS_PAPAN]);
    expect(kueri(1)).toMatch(/COALESCE\(type, ''\) <> \?/);
    expect(parameter(1)).toEqual(["p-1", JENIS_PAPAN, 25, 0]);
  });

  it("pencarian di katalog tetap mengecualikan papan", async () => {
    kueriPalsu.mockResolvedValue([[]]);
    await repo.findByProjectId("p-1", "alur");
    expect(kueri()).toMatch(/<>/);
    expect(kueri()).toMatch(/LOWER\(title\) LIKE \?/);
    expect(parameter()).toEqual(["p-1", JENIS_PAPAN, "%alur%", "%alur%", "%alur%"]);
  });

  it("baris tanpa type sama sekali tetap ikut katalog", async () => {
    // COALESCE bukan `type <> ?`: pada SQL, NULL <> 'flowchart' bernilai NULL
    // sehingga dokumen lama tanpa jenis justru HILANG dari daftar.
    kueriPalsu.mockResolvedValue([[]]);
    await repo.findByProjectId("p-1");
    expect(kueri()).toMatch(/COALESCE\(type, ''\)/);
    expect(kueri()).not.toMatch(/(^|[^()])type <> \?/);
  });
});
