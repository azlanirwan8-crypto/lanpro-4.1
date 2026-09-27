/**
 * Item #136 — payload kanvas tidak boleh lagi menumpang kolom `description`.
 *
 * Cacat aslinya tidak terlihat di fitur flowchart sendiri: diagramnya terbuka
 * dengan benar. Yang rusak adalah daftar Dokumentasi, yang menampilkan
 * `description` sebagai subjudul manusia untuk SEMUA dokumen — sehingga baris
 * flowchart memuntahkan JSON mentah ke layar.
 *
 * Karena itu test ini menjaga dua sisi sekaligus: payload masuk ke
 * `canvasData`, dan `description` tidak pernah berisi payload.
 */
import { fetchFlowcharts, createFlowchart, updateFlowchart } from "./flowchart.service";
import { apiRequest } from "../../../lib/api";

jest.mock("../../../lib/api", () => ({ apiRequest: jest.fn() }));

const panggil = apiRequest as jest.Mock;

const PAYLOAD = JSON.stringify({
  nodes: [{ id: "node_start", type: "oval", label: "Mulai" }],
  edges: [],
});

beforeEach(() => panggil.mockReset());

describe("flowchart.service — pemisahan canvasData dari description (#136)", () => {
  it("menyimpan payload ke canvasData, bukan description, saat membuat", async () => {
    panggil.mockResolvedValue({ status: "success" });

    await createFlowchart("p-1", {
      name: "Alur Baru",
      nodes: [{ id: "n1" }] as any,
      edges: [],
      externalUrl: "",
      createdBy: "admin",
      description: "Alur pendaftaran pengguna",
    } as any);

    const body = panggil.mock.calls[0][1].body;
    expect(body.description).toBe("Alur pendaftaran pengguna");
    expect(body.canvasData).toContain('"nodes"');
    expect(body.description).not.toContain('"nodes"');
  });

  it("meneruskan deskripsi manusia saat memperbarui, bukan menimpanya", async () => {
    panggil.mockResolvedValue({ status: "success" });

    await updateFlowchart("p-1", "f-1", {
      name: "Alur Lama",
      nodes: [{ id: "n1" }],
      edges: [],
      description: "Deskripsi yang diketik pengguna",
    });

    const body = panggil.mock.calls[0][1].body;
    expect(body.description).toBe("Deskripsi yang diketik pengguna");
    expect(body.canvasData).toContain('"nodes"');
  });

  it("membaca node dari canvasData", async () => {
    panggil.mockResolvedValue({
      status: "success",
      data: [
        {
          id: "f-1",
          title: "Alur",
          type: "flowchart",
          description: "Teks manusia",
          canvasData: PAYLOAD,
        },
      ],
    });

    const hasil = await fetchFlowcharts("p-1");
    expect(hasil[0].nodes).toHaveLength(1);
    expect(hasil[0].description).toBe("Teks manusia");
  });

  it("masih membuka diagram lama yang payload-nya belum dipindah migrasi", async () => {
    panggil.mockResolvedValue({
      status: "success",
      data: [{ id: "f-1", title: "Alur Lama", type: "flowchart", description: PAYLOAD }],
    });

    const hasil = await fetchFlowcharts("p-1");
    expect(hasil[0].nodes).toHaveLength(1);
    // Inti cacat #136: payload tidak boleh menetes keluar sebagai deskripsi.
    expect(hasil[0].description).toBe("");
  });
});

describe("flowchart.service — kategori benar-benar tersimpan (#144)", () => {
  it("mengirim kategori saat membuat, bukan membuangnya", async () => {
    panggil.mockResolvedValue({ status: "success" });

    await createFlowchart("p-1", {
      name: "Alur",
      nodes: [],
      edges: [],
      externalUrl: "",
      createdBy: "admin",
      category: "Test Plan",
    } as never);

    expect(panggil.mock.calls[0][1].body.category).toBe("Test Plan");
  });

  it("mengirim kategori saat memperbarui", async () => {
    panggil.mockResolvedValue({ status: "success" });

    await updateFlowchart("p-1", "f-1", {
      name: "Alur",
      nodes: [],
      edges: [],
      category: "Meeting Minutes",
    });

    expect(panggil.mock.calls[0][1].body.category).toBe("Meeting Minutes");
  });

  it("membaca kategori dari baris, bukan mengeraskan 'Panduan'", async () => {
    panggil.mockResolvedValue({
      status: "success",
      data: [{ id: "f-1", title: "Alur", type: "flowchart", category: "Architecture Diagram" }],
    });

    const hasil = await fetchFlowcharts("p-1");
    expect(hasil[0].category).toBe("Architecture Diagram");
  });

  it("membiarkan kategori kosong tetap kosong bila baris belum punya nilai", async () => {
    // Dulu baris tanpa kategori pun tampil 'Panduan', sehingga mustahil
    // membedakan "memang Panduan" dari "belum pernah tersimpan".
    panggil.mockResolvedValue({
      status: "success",
      data: [{ id: "f-1", title: "Alur", type: "flowchart" }],
    });

    const hasil = await fetchFlowcharts("p-1");
    expect(hasil[0].category).toBe("");
  });
});
