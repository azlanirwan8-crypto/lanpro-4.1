/**
 * @jest-environment jsdom
 *
 * #572 — sisi BACA dari jaring perutean: apa yang dipulangkan backend baris
 * `Documents` menjadi `FlowchartData`.
 *
 * KENAPA IKUT DIKUNCI. #571 akan memindahkan perhitungan rute ke Web Worker dan
 * #567/#568 adalah dua laporan "papan saya hilang" yang jalurnya sama: satu
 * pembacaan yang gagal menghasilkan papan KOSONG, dan papan kosong itulah yang
 * kemudian dikirim balik oleh autosave. Tanpa kunci bentuk keluaran di bawah,
 * kedua pekerjaan itu dikerjakan tanpa jaring.
 *
 * Test yang menandai "#567" mengunci perilaku yang SALAH — sama seperti
 * `lib/routing.test.ts` mengunci jalur menyerah untuk #544.
 */
import { fetchFlowcharts, createFlowchart } from "./flowchart.service";
import { apiRequest } from "../../../lib/api";

jest.mock("../../../lib/api", () => ({ apiRequest: jest.fn() }));

const panggil = apiRequest as jest.Mock;

const baris = (isi: Record<string, unknown>) => ({
  id: "f1",
  title: "Alur Bayar",
  category: "PRD",
  type: "flowchart",
  createdBy: "u1",
  createdByName: "Administrator",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-02T00:00:00.000Z",
  ...isi,
});

beforeEach(() => panggil.mockReset());

describe("flowchart.service — baca baris menjadi papan (#572)", () => {
  it("memulangkan bentuk dan garis yang terbaca utuh", async () => {
    panggil.mockResolvedValue({
      status: "success",
      data: [
        baris({
          description: "Alur pembayaran pelanggan",
          link: "https://contoh.id/flow",
          canvasData: JSON.stringify({
            nodes: [{ id: "n1", type: "rect", x: 10, y: 20, label: "Mulai" }],
            edges: [{ id: "e1", fromNodeId: "n1", toNodeId: "n1" }],
            theme: "blueprint",
            epicTaskId: "PROJ-7",
          }),
        }),
      ],
    });

    const [papan] = await fetchFlowcharts("p1");

    expect(papan.name).toBe("Alur Bayar");
    expect(papan.category).toBe("PRD");
    expect(papan.description).toBe("Alur pembayaran pelanggan");
    expect(papan.externalUrl).toBe("https://contoh.id/flow");
    expect(papan.theme).toBe("blueprint");
    expect(papan.epicTaskId).toBe("PROJ-7");
    expect(papan.nodes).toEqual([{ id: "n1", type: "rect", x: 10, y: 20, label: "Mulai" }]);
    expect(papan.edges).toHaveLength(1);
  });

  it("canvasData yang tidak terbaca menjadi papan KOSONG, bukan error (#567)", async () => {
    panggil.mockResolvedValue({
      status: "success",
      data: [baris({ canvasData: "{ nodes: [ ..., terpotong", description: "Tiga langkah" })],
    });

    const [papan] = await fetchFlowcharts("p1");

    // Inilah lubang #567: tidak ada satu pun sinyal bahwa isinya dibuang, dan
    // papan kosong ini yang akan ditimpa ke baris yang sama oleh autosave.
    expect(papan.nodes).toEqual([]);
    expect(papan.edges).toEqual([]);
    expect(papan.description).toBe("Tiga langkah");
  });

  it("baris lama membaca payload dari description dan tidak membocorkannya ke layar (#136)", async () => {
    const payloadLama = JSON.stringify({ nodes: [{ id: "n9" }], edges: [] });
    panggil.mockResolvedValue({
      status: "success",
      data: [baris({ canvasData: null, description: payloadLama })],
    });

    const [papan] = await fetchFlowcharts("p1");
    expect(papan.nodes).toEqual([{ id: "n9" }]);
    expect(papan.description).toBe("");
  });

  it("tema yang tidak dikenal jatuh ke bawaan, bukan ikut tersimpan apa adanya", async () => {
    panggil.mockResolvedValue({
      status: "success",
      data: [baris({ canvasData: JSON.stringify({ nodes: [], edges: [], theme: "gelap-pekat" }) })],
    });
    const [papan] = await fetchFlowcharts("p1");
    expect(papan.theme).toBe("miro");
  });

  it("tulis lalu baca kembali tidak menghilangkan satu pun bidang papan (#571)", async () => {
    panggil.mockResolvedValue({ status: "success", data: { id: "f2" } });
    await createFlowchart("p1", {
      name: "Alur Kiriman",
      nodes: [{ id: "n1", type: "rect", x: 1, y: 2, label: "A" }] as any,
      edges: [{ id: "e1", fromNodeId: "n1", toNodeId: "n1", label: "terus" }] as any,
      externalUrl: "https://contoh.id/x",
      description: "Deskripsi manusia",
      category: "FSD",
      theme: "blueprint",
      epicTaskId: "PROJ-9",
      createdBy: "u1",
    } as any);

    const body = panggil.mock.calls[0][1].body;
    expect(body.title).toBe("Alur Kiriman");
    expect(body.type).toBe("flowchart");

    // Baris yang dikirim tadi dibaca balik lewat jalur yang sama seperti server.
    panggil.mockResolvedValue({
      status: "success",
      data: [
        baris({
          id: "f2",
          title: body.title,
          category: body.category,
          description: body.description,
          link: body.link,
          canvasData: body.canvasData,
        }),
      ],
    });
    const [papan] = await fetchFlowcharts("p1");

    expect(papan.nodes).toHaveLength(1);
    expect(papan.edges).toHaveLength(1);
    expect(papan.theme).toBe("blueprint");
    expect(papan.epicTaskId).toBe("PROJ-9");
    expect(papan.description).toBe("Deskripsi manusia");
    expect(papan.externalUrl).toBe("https://contoh.id/x");
    expect(papan.category).toBe("FSD");
  });
});
