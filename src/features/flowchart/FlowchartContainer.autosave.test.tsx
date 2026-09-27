/**
 * Rantai autosave papan flowchart (#538) di komponen ASLINYA.
 *
 * Test hook (useFlowchartAutosave.test.tsx) membuktikan kebijakannya; yang ini
 * membuktikan papan benar-benar tersambung ke kebijakan itu: perubahan garis
 * berangkat ke service tanpa ada yang menekan Simpan, dan pengunjung baca-saja
 * yang mengganti tema kanvas TIDAK menulis papan milik pembuatnya.
 *
 * Dua test ini mahal (menunggu jeda bawaan 4 detik) karena jeda itu bagian dari
 * perjanjian: test yang memendekkan jeda lewat parameter tidak akan menangkap
 * papan yang salah memasang penjaga `boleh`.
 */
import React from "react";
import { act, render, screen, waitFor, fireEvent } from "@testing-library/react";
import type { Project, Task } from "../../types";

jest.mock("./services/flowchart.service", () => ({
  fetchFlowcharts: jest.fn(),
  createFlowchart: jest.fn(),
  updateFlowchart: jest.fn(),
  deleteFlowchart: jest.fn(),
}));

jest.mock("html-to-image", () => ({ toJpeg: jest.fn().mockResolvedValue("") }));

import { FlowchartView } from "./FlowchartContainer";
import { fetchFlowcharts, updateFlowchart } from "./services/flowchart.service";

const project = { id: "p1", name: "Proyek Uji" } as Project;

const alur = {
  id: "fw9",
  name: "Alur Autosave",
  description: "",
  category: "Panduan",
  nodes: [
    { id: "n1", type: "rect", x: 40, y: 40, label: "A", color: "indigo", width: 155, height: 70 },
    { id: "n2", type: "rect", x: 420, y: 40, label: "B", color: "indigo", width: 155, height: 70 },
  ],
  edges: [{ id: "e1", fromNodeId: "n1", toNodeId: "n2" }],
  theme: "miro",
  createdBy: "u1",
  createdByName: "Administrator",
};

const renderView = (over: Partial<React.ComponentProps<typeof FlowchartView>> = {}) =>
  render(
    <FlowchartView
      selectedProject={project}
      tasks={[] as Task[]}
      projectMembers={[]}
      setSelectedTaskForDetail={jest.fn()}
      setIsTaskDetailModalOpen={jest.fn()}
      currentUserProfile={{ id: "u1", name: "Administrator", role: "admin" }}
      {...over}
    />
  );

describe("FlowchartView — autosave papan (#538)", () => {
  jest.setTimeout(30_000);

  beforeEach(() => {
    (fetchFlowcharts as jest.Mock).mockResolvedValue([alur]);
    (updateFlowchart as jest.Mock).mockResolvedValue({});
  });

  /** Buka papan sampai kanvas editor terlihat. */
  async function bukaPapan() {
    const hasil = renderView();
    fireEvent.click((await screen.findAllByText("Alur Autosave"))[0]);
    fireEvent.click(await screen.findByText("Diagram Alur", { selector: "button" }));
    await screen.findByTitle(/Snap to Grid|Snapping/i);
    return hasil.container;
  }

  // Mengubah gaya garis adalah perubahan sekecil mungkin yang tetap menempuh
  // seluruh jalur: state edges → snapshot JSON → PUT.
  it("garis yang diganti gaya-nya sampai ke server tanpa ada yang menekan Simpan", async () => {
    const container = await bukaPapan();
    expect(updateFlowchart).not.toHaveBeenCalled();

    const jalur = container.querySelector("path[marker-end]") as Element;
    fireEvent.click(jalur);
    fireEvent.click(await screen.findByTitle(/putus-putus|dashed/i));

    await waitFor(
      () =>
        expect(updateFlowchart).toHaveBeenCalledWith(
          "p1",
          "fw9",
          expect.objectContaining({
            edges: [expect.objectContaining({ id: "e1", strokeStyle: "dashed" })],
          })
        ),
      { timeout: 9000 }
    );

    // Pengguna harus bisa melihat papan-nya sudah aman — tanpa menekan apa pun.
    expect(await screen.findByTitle(/beberapa detik|a few seconds/i)).toHaveTextContent(
      /tersimpan otomatis|auto-saved/i
    );

    // Dan hanya sekali: setelah mendarat, autosave tidak mengulang tulisan yang sama.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 2500));
    });
    expect(updateFlowchart).toHaveBeenCalledTimes(1);
  });

  it("pengunjung baca-saja yang menyeret bentuk tidak menulis papan orang lain", async () => {
    const hasil = renderView({
      currentUserProfile: { id: "u9", name: "Orang Lain", role: "viewer" } as never,
    });
    fireEvent.click((await screen.findAllByText("Alur Autosave"))[0]);
    fireEvent.click(await screen.findByText("Diagram Alur", { selector: "button" }));
    await screen.findByTitle(/Snap to Grid|Snapping/i);

    // #547 menghapus tombol tema papan, jadi penjaga "pembaca tidak menulis"
    // diuji lewat interaksi yang paling sering dilakukan orang di papan: menyeret
    // bentuk. Untuk pembaca saja, `handleNodeMouseDown` hanya memilih — tidak ada
    // perubahan papan yang bisa berangkat ke server.
    const bentuk = hasil.container.querySelector('[id^="val-node-"]') as Element;
    fireEvent.mouseDown(bentuk, { clientX: 120, clientY: 120, button: 0 });
    fireEvent.mouseMove(bentuk, { clientX: 320, clientY: 240, button: 0 });
    fireEvent.mouseUp(bentuk, { clientX: 320, clientY: 240 });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 6000));
    });

    expect(updateFlowchart).not.toHaveBeenCalled();
  });
});
