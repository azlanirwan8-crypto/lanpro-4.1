/**
 * #567 + #588 di komponen aslinya — bukan di lapisan service saja.
 *
 * #567: papan yang kolom kanvasnya tidak terbaca pernah tampil sebagai papan
 * KOSONG, dan papan kosong itulah yang dikirim balik oleh autosave (#538) sambil
 * menghapus diagram yang benar. Yang diuji di sini: salinan perangkat yang
 * dipakai, jalur tulis terkunci, dan tidak ada satu pun PUT yang keluar.
 *
 * #588: daftar "Tautan Dokumen" hanya hidup di localStorage perangkat. Yang
 * diuji: menambahkan satu tautan lewat modal aslinya benar-benar berangkat ke
 * server tanpa ada yang menekan Simpan.
 */
import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Project, Task } from "../../types";

jest.mock("./services/flowchart.service", () => ({
  fetchFlowcharts: jest.fn(),
  createFlowchart: jest.fn(),
  updateFlowchart: jest.fn(),
  deleteFlowchart: jest.fn(),
}));

jest.mock("html-to-image", () => ({ toJpeg: jest.fn().mockResolvedValue("") }));

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

jest.setTimeout(40_000);

const project = { id: "p1", name: "Proyek Uji" } as Project;
const kunciDaftar = "lanpro_flowcharts_p1";

const bentuk = (id: string, x: number) => ({
  id,
  type: "rect",
  x,
  y: 60,
  label: id,
  color: "indigo",
  width: 155,
  height: 70,
});

const papan = (isi: Record<string, unknown>) =>
  ({
    id: "fw7",
    name: "Alur Ukur",
    description: "",
    category: "Panduan",
    nodes: [bentuk("n1", 40), bentuk("n2", 420)],
    edges: [{ id: "e1", fromNodeId: "n1", toNodeId: "n2" }],
    theme: "miro",
    createdBy: "u1",
    createdByName: "Administrator",
    documents: [],
    ...isi,
  }) as never;

const renderView = () =>
  render(
    <FlowchartView
      selectedProject={project}
      tasks={[] as Task[]}
      projectMembers={[]}
      setSelectedTaskForDetail={jest.fn()}
      setIsTaskDetailModalOpen={jest.fn()}
      currentUserProfile={{ id: "u1", name: "Administrator", role: "admin" }}
    />
  );

async function bukaEditor() {
  const hasil = renderView();
  fireEvent.click((await screen.findAllByText("Alur Ukur", undefined, { timeout: 8000 }))[0]);
  fireEvent.click(await screen.findByText("Diagram Alur", { selector: "button" }));
  await screen.findByTitle(/Snap to Grid|Snapping/i);
  return hasil;
}

/** Jumlah bentuk yang benar-benar terpasang di kanvas. */
const jumlahBentuk = (container: HTMLElement) =>
  container.querySelectorAll('[id^="val-node-"]').length;

beforeEach(() => {
  localStorage.clear();
  (updateFlowchart as jest.Mock).mockReset().mockResolvedValue({});
});

describe("#567 — baris yang tidak terbaca tidak pernah menang atas perangkat", () => {
  it("salinan perangkat terakhir yang ditampilkan, dan papan dikunci", async () => {
    // Perangakat ini masih punya pekerjaan aslinya: dua bentuk.
    localStorage.setItem(kunciDaftar, JSON.stringify([papan({})]));
    // Server pulang membawa baris yang kolom kanvasnya rusak.
    (fetchFlowcharts as jest.Mock).mockResolvedValue([
      papan({ nodes: [], edges: [], muatGagal: true }),
    ]);

    const hasil = await bukaEditor();

    // Bukan papan kosong: yang tampil salinan perangkat.
    expect(jumlahBentuk(hasil.container)).toBe(2);
    // Dan pengguna diberi tahu kenapa papan ini tidak bisa disimpan.
    expect(screen.getAllByText(/tidak terbaca/i).length).toBeGreaterThan(0);
    expect(screen.queryByTitle(/Simpan seluruh diagram/i)).toBeNull();
  });

  /** Kunci tanpa palang hanya memindahkan kerusakan ke layar. */
  it("setelah pemilik memutuskan memulihkan, papan bisa disimpan lagi", async () => {
    localStorage.setItem(kunciDaftar, JSON.stringify([papan({})]));
    (fetchFlowcharts as jest.Mock).mockResolvedValue([
      papan({ nodes: [], edges: [], muatGagal: true }),
    ]);

    const hasil = await bukaEditor();
    fireEvent.click(await screen.findByText(/pulihkan/i));

    await waitFor(() => expect(screen.getByTitle(/Simpan seluruh diagram/i)).toBeTruthy());

    // Dan pemulihannya nyata: papan menulis ulang baris yang rusak.
    const jalur = hasil.container.querySelector("path[marker-end]") as Element;
    fireEvent.click(jalur);
    fireEvent.click(await screen.findByTitle(/putus-putus|dashed/i));

    await waitFor(() => expect(updateFlowchart).toHaveBeenCalled(), { timeout: 9000 });
    expect(jumlahBentuk(hasil.container)).toBe(2);
  });

  it("menyeret bentuk di papan yang rusak tidak melepas satu PUT pun", async () => {
    localStorage.setItem(kunciDaftar, JSON.stringify([papan({})]));
    (fetchFlowcharts as jest.Mock).mockResolvedValue([
      papan({ nodes: [], edges: [], muatGagal: true }),
    ]);

    const hasil = await bukaEditor();
    const target = hasil.container.querySelector('[id^="val-node-"]') as Element;
    fireEvent.mouseDown(target, { clientX: 120, clientY: 120, button: 0 });
    fireEvent.mouseMove(target, { clientX: 320, clientY: 240, button: 0 });
    fireEvent.mouseUp(target, { clientX: 320, clientY: 240 });

    // Jeda autosave bawaan 4 detik (useFlowchartAutosave) — penjaganya diuji
    // terhadap waktu asli, bukan terhadap jeda yang dipendekkan lewat parameter.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 6000));
    });

    expect(updateFlowchart).not.toHaveBeenCalled();
  });

  it("papan yang memang kosong tidak ikut terkunci", async () => {
    (fetchFlowcharts as jest.Mock).mockResolvedValue([papan({ nodes: [], edges: [] })]);

    const hasil = await bukaEditor();

    expect(jumlahBentuk(hasil.container)).toBe(0);
    expect(screen.queryAllByText(/tidak terbaca/i)).toHaveLength(0);
    expect(screen.getByTitle(/Simpan seluruh diagram/i)).toBeTruthy();
  });
});

describe("#588 — tautan dokumen benar-benar sampai ke server", () => {
  it("satu tautan yang ditambahkan berangkat sendiri", async () => {
    (fetchFlowcharts as jest.Mock).mockResolvedValue([papan({})]);

    const hasil = await bukaEditor();
    fireEvent.click(screen.getAllByText("Daftar Dokumen")[0].closest("button") as HTMLElement);
    fireEvent.click(await screen.findByText("Tambah Dokumen"));

    const [nama, tautan] = hasil.container.querySelectorAll(
      "input"
    ) as NodeListOf<HTMLInputElement>;
    fireEvent.change(nama, { target: { value: "BRD QRIS" } });
    fireEvent.change(tautan, {
      target: { value: "https://contoh.sharepoint.com/sites/brd" },
    });
    fireEvent.click(screen.getByText("Simpan Tautan"));

    await waitFor(
      () =>
        expect(updateFlowchart).toHaveBeenCalledWith(
          "p1",
          "fw7",
          expect.objectContaining({
            documents: [
              expect.objectContaining({
                name: "BRD QRIS",
                link: "https://contoh.sharepoint.com/sites/brd",
              }),
            ],
          })
        ),
      { timeout: 9000 }
    );
  });

  it("tautan yang dimuat dari server tampil sebagai kartu LanPro, dan berkas lama diberi tanda jujur", async () => {
    (fetchFlowcharts as jest.Mock).mockResolvedValue([
      papan({
        documents: [
          {
            id: "doc-1",
            name: "BRD QRIS",
            link: "https://contoh.sharepoint.com/sites/brd",
            createdAt: "9/29/2026, 10.00.00",
            createdBy: "Administrator",
          },
          {
            id: "doc-2",
            name: "Lampiran Lama",
            fileName: "brd.pdf",
            fileData: "data:application/pdf;base64,JVBERi0xLjQK",
            createdAt: "9/29/2026, 10.00.00",
            createdBy: "Administrator",
          },
        ],
      }),
    ]);

    const hasil = await bukaEditor();
    fireEvent.click(screen.getAllByText("Daftar Dokumen")[0].closest("button") as HTMLElement);

    // Yang server punya: dibuka di tab baru, tautan apa adanya.
    const buka = await screen.findByText("Buka Tautan");
    expect(buka.closest("a")?.getAttribute("href")).toBe("https://contoh.sharepoint.com/sites/brd");

    // Yang hanya ada di perangkat ini: tidak pura-pura sudah tersimpan.
    expect(hasil.container.textContent).toMatch(/hanya ada di perangkat ini/i);
  });
});
