/**
 * #587 — CRUD metadata papan flowchart.
 *
 * Permintaan pemilik proyek: "cek lagi dan pastikan crud nya clean". Yang diuji
 * di sini adalah tiga jalur tulis yang bisa MENGHAPUS pekerjaan orang diam-diam:
 *
 * 1. Menyimpan dari modal metadata mengirim PUT sendiri, dan dulu ia tidak
 *    membawa `theme` maupun `epicTaskId` — padahal kedua nilai itu hidup di
 *    payload `canvasData` yang sama. Hasilnya: papan blueprint kembali jadi
 *    miro dan tautan epic hilang setelah muat ulang. Kelas bug yang sama dengan
 *    #570, dari jalur tulis yang berbeda.
 * 2. Modal hanya punya NAMA tampilan penulis, tapi menyalinkannya ke `createdBy`
 *    yang berisi ID — pemeriksaan kepemilikan (#268) lalu menolak pemiliknya
 *    sendiri.
 * 3. Lampiran hanya bisa ditambah, tidak pernah bisa dihapus.
 */
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Project, Task } from "../../types";

jest.mock("./services/flowchart.service", () => ({
  fetchFlowcharts: jest.fn(),
  createFlowchart: jest.fn(),
  updateFlowchart: jest.fn(),
  deleteFlowchart: jest.fn(),
}));

jest.mock("html-to-image", () => ({ toJpeg: jest.fn().mockResolvedValue("") }));

const mockKonfirmasi = jest.fn(async () => true);
jest.mock("../../lib/sweetalert", () => ({
  confirmDeleteAlert: () => mockKonfirmasi(),
  showSuccessAlert: jest.fn(),
}));

jest.mock("sonner", () => ({
  __esModule: true,
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    loading: jest.fn(),
    custom: jest.fn(),
    dismiss: jest.fn(),
    message: jest.fn(),
  },
  Toaster: () => null,
}));

import { FlowchartView } from "./FlowchartContainer";
import { fetchFlowcharts, updateFlowchart } from "./services/flowchart.service";

const project = { id: "p1", name: "Proyek Uji" } as Project;
const KUNCI_DAFTAR = "lanpro_flowcharts_p1";

const alur = () => ({
  id: "fw77",
  name: "Alur CRUD",
  description: "Masalah lama",
  category: "Panduan",
  epicTaskId: "epic-9",
  theme: "blueprint" as const,
  nodes: [{ id: "n1", type: "rect" as const, x: 40, y: 40, label: "A", color: "indigo" }],
  edges: [],
  createdBy: "u1",
  createdByName: "Administrator",
  documents: [
    {
      id: "doc-1",
      name: "BRD QRIS",
      link: "https://docs.google.com/document/d/abc",
      createdAt: "9/29/2026, 10.00.00",
      createdBy: "Administrator",
    },
  ],
  konteks: {
    masalah: "Merchant mengecek transaksi manual",
    titikNyeri: "Aplikasi harus dibuka tiap transaksi",
    cara: "Voice notification menyebut nominal",
    manfaat: "Konfirmasi lebih cepat",
  },
});

/** Salinan papan di perangkat — tempat ketiga bug itu meninggalkan jejaknya. */
const bacaDaftar = () => JSON.parse(window.localStorage.getItem(KUNCI_DAFTAR) || "[]");

async function bukaPapan() {
  (fetchFlowcharts as jest.Mock).mockResolvedValue([alur()]);
  const hasil = render(
    <FlowchartView
      selectedProject={project}
      tasks={[] as Task[]}
      projectMembers={[]}
      setSelectedTaskForDetail={jest.fn()}
      setIsTaskDetailModalOpen={jest.fn()}
      currentUserProfile={{ id: "u1", name: "Administrator", role: "admin" }}
    />
  );
  fireEvent.click((await screen.findAllByText("Alur CRUD"))[0]);
  fireEvent.click(await screen.findByText("Diagram Alur", { selector: "button" }));
  await screen.findByTitle(/Snap to Grid|Snapping/i);
  return hasil.container;
}

beforeEach(() => {
  window.localStorage.clear();
  // `resetMocks: true` menghapus implementasi jest.fn() di setiap test, jadi
  // jawaban konfirmasi dipasang lagi di sini — bukan hanya di pembuatannya.
  mockKonfirmasi.mockImplementation(async () => true);
  (updateFlowchart as jest.Mock).mockReset();
  (updateFlowchart as jest.Mock).mockResolvedValue(undefined);
});

describe("FlowchartView — simpan metadata tanpa merusak papan (#587)", () => {
  jest.setTimeout(30_000);

  it("PUT dari modal metadata tetap membawa tema papan dan tautan epic-nya", async () => {
    await bukaPapan();

    fireEvent.click(screen.getByTitle("Ubah metadata dokumen"));
    const nama = screen.getByDisplayValue("Alur CRUD") as HTMLInputElement;
    fireEvent.change(nama, { target: { value: "Alur CRUD Diganti" } });

    // Jeda autosave 4 detik (#538), jadi kiriman dalam 1,2 detik ke depan
    // pastilah milik modal ini — bukan autosave yang menyamar.
    (updateFlowchart as jest.Mock).mockClear();
    fireEvent.click(screen.getByText("Simpan Perubahan"));

    await waitFor(() => expect(updateFlowchart).toHaveBeenCalled(), { timeout: 1200 });
    const [, , isi] = (updateFlowchart as jest.Mock).mock.calls.find(
      ([, , d]: any) => d.name === "Alur CRUD Diganti"
    ) as any[];

    // Tema papan mengikuti tema aplikasi sejak #547, jadi yang dijaga di sini
    // adalah KEBERADAANNYA: sebelum #587 jalur ini tidak mengirim `theme` sama
    // sekali, dan payload papan ditulis ulang tanpa field itu.
    expect(["miro", "blueprint"]).toContain(isi.theme);
    expect(isi.epicTaskId).toBe("epic-9");
    expect(isi.konteks.masalah).toBe("Merchant mengecek transaksi manual");
  });

  it("menyunting metadata tidak menukar id penulis dengan namanya", async () => {
    await bukaPapan();

    fireEvent.click(screen.getByTitle("Ubah metadata dokumen"));
    const nama = screen.getByDisplayValue("Alur CRUD") as HTMLInputElement;
    fireEvent.change(nama, { target: { value: "Judul Baru" } });
    fireEvent.click(screen.getByText("Simpan Perubahan"));

    // Nama dulu: bukti bahwa yang terbaca di bawah adalah tulisan modal ini,
    // bukan salinan perangkat dari saat papan dimuat.
    await waitFor(() => expect(bacaDaftar()[0]?.name).toBe("Judul Baru"));
    expect(bacaDaftar()[0].createdBy).toBe("u1");
    expect(bacaDaftar()[0].createdByName).toBe("Administrator");
  });

  it("Problem Statement yang dikosongkan mengosongkan subjudul, bukan memunculkan teks lama", async () => {
    await bukaPapan();

    fireEvent.click(screen.getByTitle("Ubah metadata dokumen"));
    // Bukan textarea pertama di layar: tiap bentuk di papan membawa textarea
    // labelnya sendiri.
    const kotakMasalah = screen.getByPlaceholderText(
      /Apa yang sedang dialami/i
    ) as HTMLTextAreaElement;
    expect(kotakMasalah.value).toBe("Merchant mengecek transaksi manual");
    fireEvent.change(kotakMasalah, { target: { value: "" } });
    fireEvent.click(screen.getByText("Simpan Perubahan"));

    await waitFor(() => expect(bacaDaftar()[0]?.name).toBe("Alur CRUD"));
    expect(bacaDaftar()[0].description).toBe("");
    // Tiga blok lainnya tidak ikut terhapus.
    expect(bacaDaftar()[0].konteks.manfaat).toBe("Konfirmasi lebih cepat");
  });

  it("lampiran bisa dihapus lagi, dan hanya lampiran itu yang hilang", async () => {
    const container = await bukaPapan();
    fireEvent.click(screen.getAllByText("Daftar Dokumen")[0].closest("button") as HTMLElement);
    await screen.findByText("BRD QRIS");

    fireEvent.click(container.querySelector('button[title="Hapus dokumen"]') as HTMLElement);

    await waitFor(() => expect(screen.queryByText("BRD QRIS")).toBeNull());
    expect(mockKonfirmasi).toHaveBeenCalled();
    expect(bacaDaftar()[0].documents).toEqual([]);
    // Isi papannya tidak ikut tersentuh.
    expect(bacaDaftar()[0].nodes).toHaveLength(1);
  });
});
