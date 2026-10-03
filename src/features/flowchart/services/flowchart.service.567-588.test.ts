/**
 * @jest-environment jsdom
 *
 * #567 dan #588 — dua-duanya tentang SATU kolom, `canvasData`.
 *
 * #567: dulu SEMUA galat JSON ditelan dan dipulangkan sebagai 0 node, jadi baris
 * yang rusak terasa seperti "papan kosong yang berhasil dimuat" — dan papan
 * kosong itulah yang dikirim balik oleh autosave (#538). Yang dikunci di sini:
 * BEDA antara "kosong karena memang kosong" dan "kosong karena tidak terbaca".
 *
 * #588: daftar "Tautan Dokumen" tidak pernah ikut ke server, jadi ia hidup hanya
 * di localStorage perangkat — berpindah laptop menghapusnya. Yang dikunci: tautan
 * ikut terkirim, dan `fileData` base64 (jalur unggah lama) TIDAK pernah ikut,
 * sebab satu lampiran 5 MB = ~6,7 MB teks dan batas 8 MB (#584) akan menolak
 * SELURUH papan, bukan hanya lampirannya.
 */
import { fetchFlowcharts, updateFlowchart, createFlowchart } from "./flowchart.service";
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

const muat = (isi: Record<string, unknown>) => {
  panggil.mockResolvedValue({ status: "success", data: [baris(isi)] });
  return fetchFlowcharts("p1");
};

beforeEach(() => panggil.mockReset());

describe("#567 — muat yang rusak bukan papan kosong", () => {
  it("kolom yang tidak bisa diuraikan ditandai muatGagal, bukan 0 node biasa", async () => {
    const [papan] = await muat({ canvasData: '{"nodes": [terpotong' });

    expect(papan.nodes).toEqual([]);
    expect(papan.muatGagal).toBe(true);
  });

  it("kolom yang kosong sungguhan TIDAK boleh ikut terkunci", async () => {
    const kosongLurus = await muat({ canvasData: undefined });
    expect(kosongLurus[0].muatGagal).toBeUndefined();

    const kolomKosong = await muat({ canvasData: "" });
    expect(kolomKosong[0].muatGagal).toBeUndefined();
  });

  it("JSON yang terbaca tapi bukan payload kanvas ikut ditandai rusak", async () => {
    const [tertulisLain] = await muat({ canvasData: JSON.stringify({ teks: "bukan papan" }) });
    expect(tertulisLain.muatGagal).toBe(true);
  });

  it("payload yang utuh tidak pernah muatGagal", async () => {
    const [utuh] = await muat({
      canvasData: JSON.stringify({
        nodes: [{ id: "n1", type: "rect", x: 10, y: 10, label: "A", color: "indigo" }],
        edges: [],
        theme: "miro",
      }),
    });

    expect(utuh.nodes).toHaveLength(1);
    expect(utuh.muatGagal).toBeUndefined();
  });
});

describe("#588 — tautan ikut ke server, byte tidak", () => {
  const dokumenLama = {
    id: "doc-1",
    name: "BRD QRIS",
    link: "https://sharepoint.contoh/brd",
    createdAt: "9/29/2026, 10.00.00",
    createdBy: "Administrator",
  };
  const dokumenBase64 = {
    id: "doc-2",
    name: "Lampiran Lama",
    fileData: "data:application/pdf;base64," + "A".repeat(200_000),
    fileName: "brd.pdf",
    createdAt: "9/29/2026, 10.00.00",
    createdBy: "Administrator",
  };

  const payloadTerkirim = () => JSON.parse(panggil.mock.calls[0][1].body.canvasData);

  it("PUT membawa daftar tautan", async () => {
    panggil.mockResolvedValue({ status: "success" });

    await updateFlowchart("p1", "f1", {
      name: "Alur Bayar",
      nodes: [],
      edges: [],
      documents: [dokumenLama],
    });

    expect(payloadTerkirim().documents).toEqual([
      {
        id: "doc-1",
        name: "BRD QRIS",
        link: "https://sharepoint.contoh/brd",
        createdAt: "9/29/2026, 10.00.00",
        createdBy: "Administrator",
      },
    ]);
  });

  it("fileData base64 tidak pernah ikut tersandikan", async () => {
    panggil.mockResolvedValue({ status: "success" });

    await updateFlowchart("p1", "f1", {
      name: "Alur Bayar",
      nodes: [],
      edges: [],
      documents: [dokumenLama, dokumenBase64],
    });

    const terkirim = payloadTerkirim();
    expect(JSON.stringify(terkirim)).not.toContain("base64");
    // Tanpa tautan = tidak ada yang bisa dibuka di laptop lain = tidak diunggah.
    expect(terkirim.documents.map((d: { id: string }) => d.id)).toEqual(["doc-1"]);
  });

  it("papan tanpa lampiran tidak mengirim kunci documents sama sekali", async () => {
    panggil.mockResolvedValue({ status: "success" });

    await updateFlowchart("p1", "f1", { name: "Alur Bayar", nodes: [], edges: [] });

    expect("documents" in payloadTerkirim()).toBe(false);
  });

  it("jalur buat baru membawa tautan yang sama", async () => {
    panggil.mockResolvedValue({ status: "success", data: { id: "f9" } });

    await createFlowchart("p1", {
      name: "Alur Baru",
      nodes: [],
      edges: [],
      createdBy: "u1",
      documents: [dokumenLama],
    } as never);

    expect(payloadTerkirim().documents).toHaveLength(1);
  });

  it("tautan yang tersimpan kembali terbaca saat papan dimuat", async () => {
    await muat({
      canvasData: JSON.stringify({
        nodes: [{ id: "n1", type: "rect", x: 10, y: 10, label: "A", color: "indigo" }],
        edges: [],
        documents: [dokumenLama],
      }),
    });

    const papan = await fetchFlowcharts("p1");
    expect(papan[0].documents).toEqual([dokumenLama]);
  });

  it("entri rusak di dalam documents tidak merembet ke layar", async () => {
    await muat({
      canvasData: JSON.stringify({
        nodes: [],
        edges: [],
        documents: [{ namaTanpaId: true }, dokumenLama],
      }),
    });

    const papan = await fetchFlowcharts("p1");
    expect(papan[0].documents).toHaveLength(1);
  });
});
