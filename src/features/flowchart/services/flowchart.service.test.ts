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

/**
 * #570 — `canvasTheme` ikut ke dalam `isiPapan` autosave, jadi menggantinya
 * memicu pengiriman dan bilah status bilang "Tersimpan" — padahal payload PUT
 * hanya berisi name/nodes/edges/description/category, dan pembacanya mengeraskan
 * `theme: "miro"`. Muat ulang kembali ke tema awal. `epicTaskId` sama: dikirim
 * saat membuat di layar, tidak pernah pulang.
 *
 * Yang dijaga di sini adalah ROUND-TRIP: nilai yang ditulis harus nilai yang
 * dibaca kembali. Mengetes sisi kirim saja akan hijau walau pembacanya masih
 * mengeraskan "miro".
 */
describe("flowchart.service — tema dan tautan epic pulang-pergi (#570)", () => {
  it("menulis tema dan epicTaskId ke payload kanvas", async () => {
    panggil.mockResolvedValue({ status: "success" });

    await updateFlowchart("p-1", "f-1", {
      name: "Alur",
      nodes: [],
      edges: [],
      theme: "blueprint",
      epicTaskId: "epic-7",
    });

    const payload = JSON.parse(panggil.mock.calls[0][1].body.canvasData);
    expect(payload.theme).toBe("blueprint");
    expect(payload.epicTaskId).toBe("epic-7");
  });

  it("membaca kembali tema dan epicTaskId yang barusan ditulis", async () => {
    panggil.mockResolvedValue({ status: "success" });
    await updateFlowchart("p-1", "f-1", {
      name: "Alur",
      nodes: [{ id: "n1" }],
      edges: [],
      theme: "blueprint",
      epicTaskId: "epic-7",
    });
    const body = panggil.mock.calls[0][1].body;

    panggil.mockResolvedValue({
      status: "success",
      data: [{ id: "f-1", title: "Alur", type: "flowchart", canvasData: body.canvasData }],
    });
    const hasil = await fetchFlowcharts("p-1");

    expect(hasil[0].theme).toBe("blueprint");
    expect(hasil[0].epicTaskId).toBe("epic-7");
  });

  it("diagram lama tanpa tema di payload tetap terbaca, tidak hilang", async () => {
    panggil.mockResolvedValue({
      status: "success",
      data: [{ id: "f-1", title: "Alur", type: "flowchart", canvasData: PAYLOAD }],
    });

    const hasil = await fetchFlowcharts("p-1");
    expect(hasil[0].nodes).toHaveLength(1);
    expect(hasil[0].theme).toBe("miro");
    expect(hasil[0].epicTaskId).toBeUndefined();
  });
});

describe("flowchart.service - empat blok detail dokumen ikut pulang-pergi (#583)", () => {
  const KONTEKS = {
    masalah: "Merchant harus mengecek transaksi QRIS manual",
    titikNyeri: "Aplikasi harus dibuka tiap transaksi masuk",
    cara: "Voice notification otomatis menyebut nominal",
    manfaat: "Konfirmasi pembayaran lebih cepat untuk merchant",
  };

  it("menulis keempat blok ke payload kanvas saat membuat", async () => {
    panggil.mockResolvedValue({ status: "success", data: { id: "f-1" } });

    await createFlowchart("p-1", {
      name: "Alur QRIS",
      nodes: [],
      edges: [],
      externalUrl: "",
      createdBy: "admin",
      description: KONTEKS.masalah,
      konteks: KONTEKS,
    } as never);

    const body = panggil.mock.calls[0][1].body;
    expect(JSON.parse(body.canvasData).konteks).toEqual(KONTEKS);
    // description tetap teks manusia - bukan payload (pelajaran #136).
    expect(body.description).toBe(KONTEKS.masalah);
  });

  it("kiriman papan yang hanya membawa nodes/edges TIDAK menghapus detail dokumen", async () => {
    panggil.mockResolvedValue({ status: "success" });

    await updateFlowchart("p-1", "f-1", {
      name: "Alur QRIS",
      nodes: [{ id: "n1" }],
      edges: [],
      konteks: KONTEKS,
    });

    const payload = JSON.parse(panggil.mock.calls[0][1].body.canvasData);
    expect(payload.konteks.cara).toBe(KONTEKS.cara);
  });

  it("membaca kembali keempat blok dari baris yang tersimpan", async () => {
    panggil.mockResolvedValue({
      status: "success",
      data: [
        {
          id: "f-1",
          title: "Alur QRIS",
          type: "flowchart",
          canvasData: JSON.stringify({ nodes: [], edges: [], konteks: KONTEKS }),
        },
      ],
    });

    const hasil = await fetchFlowcharts("p-1");
    expect(hasil[0].konteks).toEqual(KONTEKS);
  });

  it("diagram lama tanpa blok detail tetap terbuka, nilainya tidak dikarang", async () => {
    panggil.mockResolvedValue({
      status: "success",
      data: [{ id: "f-1", title: "Lama", type: "flowchart", canvasData: PAYLOAD }],
    });

    const hasil = await fetchFlowcharts("p-1");
    expect(hasil[0].konteks).toBeUndefined();
    expect(hasil[0].nodes).toHaveLength(1);
  });

  it("blok yang isinya bukan teks dibuang, tidak ikut tersimpan sebagai objek", async () => {
    panggil.mockResolvedValue({
      status: "success",
      data: [
        {
          id: "f-1",
          title: "Aneh",
          type: "flowchart",
          canvasData: JSON.stringify({
            nodes: [],
            edges: [],
            konteks: { masalah: { berbahaya: true }, cara: "tetap teks" },
          }),
        },
      ],
    });

    const hasil = await fetchFlowcharts("p-1");
    expect(hasil[0].konteks?.masalah).toBe("");
    expect(hasil[0].konteks?.cara).toBe("tetap teks");
  });
});
