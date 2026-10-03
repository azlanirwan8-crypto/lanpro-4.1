/**
 * #598 — sisi klien dari pemisahan papan dan dokumen.
 *
 * Papan flowchart disimpan sebagai baris tabel Documents. Setelah katalog
 * Dokumentasi mengecualikan baris papan di server, menu Flowchart HARUS
 * menyebut jenisnya sendiri — kalau tidak, daftar papan justru jadi kosong.
 *
 * Nilai "flowchart" di sini dan `JENIS_PAPAN` di
 * `server/repositories/document.repository.ts` dijaga dua test yang sama:
 * yang satu mengunci URL permintaan, yang lain mengunci parameter pengecualian.
 */
import { fetchFlowcharts, createFlowchart } from "./flowchart.service";
import { apiRequest } from "../../../lib/api";

jest.mock("../../../lib/api", () => ({ apiRequest: jest.fn() }));

const panggil = apiRequest as jest.Mock;

const PAPAN = {
  id: "f-1",
  title: "Alur Pendaftaran",
  type: "flowchart",
  canvasData: JSON.stringify({ nodes: [{ id: "n1", label: "Mulai" }], edges: [] }),
};

const DOKUMEN = {
  id: "d-1",
  title: "BRD Pembayaran",
  type: "Business Requirements Document (BRD)",
  description: "Kebutuhan bisnis tingkat tinggi.",
};

beforeEach(() => panggil.mockReset());

describe("flowchart.service — papan meminta jenisnya sendiri (#598)", () => {
  it("menyebut type=flowchart dalam URL daftar", async () => {
    panggil.mockResolvedValue({ status: "success", data: [PAPAN] });
    const hasil = await fetchFlowcharts("p-1");

    expect(String(panggil.mock.calls[0][0])).toContain(
      "/api/projects/p-1/documents?type=flowchart"
    );
    expect(hasil).toHaveLength(1);
    expect(hasil[0].name).toBe("Alur Pendaftaran");
  });

  it("tetap hanya memulangkan papan bila baris lain ikut terkirim", async () => {
    panggil.mockResolvedValue({ status: "success", data: [PAPAN, DOKUMEN] });
    const hasil = await fetchFlowcharts("p-1");
    expect(hasil.map((f) => f.id)).toEqual(["f-1"]);
  });

  it("memulangkan array kosong bila backend tidak mengirim data", async () => {
    panggil.mockResolvedValue(undefined);
    expect(await fetchFlowcharts("p-1")).toEqual([]);
  });

  it("papan baru tetap ditulis dengan jenis yang sama dengan yang diminta", async () => {
    panggil.mockResolvedValue({ status: "success", data: { id: "f-2" } });
    await createFlowchart("p-1", {
      name: "Alur Baru",
      nodes: [{ id: "n1" }] as any,
      edges: [],
      createdBy: "admin",
    } as any);
    expect(panggil.mock.calls[0][1].body.type).toBe("flowchart");
  });
});
