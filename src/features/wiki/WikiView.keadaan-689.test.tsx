/**
 * @jest-environment jsdom
 *
 * #689 butir (c) — Document/Wiki tidak bisa membedakan situasinya sendiri.
 *
 * `fetchDocuments` (WikiView.tsx:418-444) TIDAK pernah menyetel `loading`, dan
 * keenam pemanggilnya mengirim `silent: true` sehingga cabang `toast.error` di
 * :440 tidak pernah terjangkau. Efeknya: selagi fetch jalan, layar sudah
 * menampilkan "Dokumen tidak ditemukan"; dan kalau fetch gagal, pesan yang sama
 * muncul juga — pengguna kehilangan dokumen karena satu jaringan yang putus,
 * tanpa jalur kembali.
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

jest.mock("../../lib/moduleDataCache", () => ({
  peekProjectDocuments: jest.fn(() => null),
  loadProjectDocuments: jest.fn(),
  writeProjectDocuments: jest.fn(),
}));
jest.mock("./services/wiki.service", () => ({
  resolveUserId: () => "u1",
  createDocument: jest.fn(),
  updateDocument: jest.fn(),
  deleteDocument: jest.fn(),
  downloadDocument: jest.fn(),
  cekSematBisa: jest.fn().mockResolvedValue({ bisa: true, sebab: "publik" }),
}));
jest.mock("../../contexts/MobileActionContext", () => ({
  useMobileAction: () => ({ registerAction: jest.fn(), unregisterAction: jest.fn() }),
}));

import { WikiView } from "./WikiView";
import { loadProjectDocuments } from "../../lib/moduleDataCache";

const DOKUMEN = [
  {
    id: "d1",
    projectId: "p1",
    title: "Dokumen dengan judul yang sangat panjang untuk diuji pemotongannya",
    description: "",
    type: "BRD",
    link: "https://example.com/a",
    fileName: "laporan-tahunan-versi-terakhir-final-2.pdf",
    fileType: "pdf",
    createdBy: "u1",
    createdAt: "2026-10-02",
    updatedAt: "2026-10-02",
  },
];

const renderView = () =>
  render(
    <WikiView
      projectId="p1"
      users={[{ id: "u1", name: "Administrator", email: "a@b.c" } as never]}
      currentUser={{ id: "u1", name: "Administrator", role: "admin" } as never}
      userRole="admin"
      permissions={{ document: { view: true, create: true, edit: true, delete: true } } as never}
    />
  );

describe("#689 keadaan daftar Dokumen", () => {
  beforeEach(() => {
    (loadProjectDocuments as jest.Mock).mockReset();
  });

  it("selagi fetch berjalan, daftar tidak mengaku kosong", async () => {
    let selesai: (v: { data: typeof DOKUMEN; meta: { total: number } }) => void = () => {};
    (loadProjectDocuments as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        selesai = resolve;
      })
    );

    const { container } = renderView();
    await waitFor(() => expect(loadProjectDocuments).toHaveBeenCalled());

    expect(container.querySelector('[data-testid="wiki-memuat"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="wiki-kosong"]')).toBeNull();

    selesai({ data: DOKUMEN, meta: { total: 1 } });
    await screen.findAllByText(DOKUMEN[0].title);
    expect(container.querySelector('[data-testid="wiki-memuat"]')).toBeNull();
  });

  it("fetch yang gagal memberi tahu, bukan memasang pesan kosong", async () => {
    (loadProjectDocuments as jest.Mock).mockRejectedValue(new Error("jaringan putus"));

    const { container } = renderView();
    await waitFor(() => expect(container.querySelector('[data-testid="wiki-galat"]')).toBeTruthy());

    expect(container.querySelector('[data-testid="wiki-kosong"]')).toBeNull();
    expect(container.textContent).toMatch(/jaringan putus/);
  });

  it("panel galat menawarkan percobaan lagi yang benar-benar mengambil ulang", async () => {
    (loadProjectDocuments as jest.Mock).mockRejectedValueOnce(new Error("gagal sekali"));
    const { container } = renderView();

    const tombol = await screen.findByTestId("wiki-coba-lgi");
    const sebelum = (loadProjectDocuments as jest.Mock).mock.calls.length;
    (loadProjectDocuments as jest.Mock).mockResolvedValue({ data: DOKUMEN, meta: { total: 1 } });

    fireEvent.click(tombol);

    await waitFor(() =>
      expect((loadProjectDocuments as jest.Mock).mock.calls.length).toBeGreaterThan(sebelum)
    );
    await screen.findAllByText(DOKUMEN[0].title);
    expect(container.querySelector('[data-testid="wiki-galat"]')).toBeNull();
  });

  it("judul dan nama berkas panjang tetap bisa dibaca penuh", async () => {
    (loadProjectDocuments as jest.Mock).mockResolvedValue({ data: DOKUMEN, meta: { total: 1 } });
    const { container } = renderView();
    await screen.findAllByText(DOKUMEN[0].title);

    // Dipotong dengan `line-clamp-1` TANPA `title` berarti isinya tidak pernah
    // bisa dibaca. Test ini menuntut atributnya, bukan menebak CSS.
    expect(screen.getAllByTitle(DOKUMEN[0].title).length).toBeGreaterThan(0);
    expect(screen.getAllByTitle(DOKUMEN[0].fileName).length).toBeGreaterThan(0);
    expect(container.textContent).toMatch(DOKUMEN[0].title.slice(0, 20));
  });

  it("proyek tanpa dokumen dan hasil pencarian tanpa cocok punya pesan sendiri", async () => {
    (loadProjectDocuments as jest.Mock).mockResolvedValue({ data: [], meta: { total: 0 } });
    const { container } = renderView();
    await waitFor(() =>
      expect(container.querySelector('[data-testid="wiki-kosong"]')).toBeTruthy()
    );
    expect(container.querySelector('[data-testid="wiki-kosong-filter"]')).toBeNull();

    const kotakCari = container.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(kotakCari, { target: { value: "tidak ada yang cocok" } });

    await waitFor(() =>
      expect((loadProjectDocuments as jest.Mock).mock.calls.length).toBeGreaterThan(1)
    );
    await waitFor(() =>
      expect(container.querySelector('[data-testid="wiki-kosong-filter"]')).toBeTruthy()
    );
  });
});
