/**
 * #589 — tempel alur yang disalin dari APLIKASI LAIN.
 *
 * Keluhan pemilik proyek (30 Sep lalu diulang 02 Okt dengan tangkapan layar
 * toast "The canvas clipboard is empty"): "saya melakukan copy flow dari
 * (miro, drawio) terus paste ke papan flowchart, kenapa tidak bisa ya".
 *
 * #582 memperbaiki salin-tempel DI DALAM papan; yang ini separuh yang lain:
 * clipboard peramban. Isinya adalah tulisan asing, jadi jalur masuknya lewat
 * penyanding yang sama dengan menu Impor dan hanya bentuk yang benar-benar
 * terbaca yang boleh mendarat di papan. Yang tidak terbaca harus berkata
 * tidak terbaca — bukan menambah bentuk kosong, dan bukan diam.
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Project, Task } from "../../types";

jest.mock("./services/flowchart.service", () => ({
  fetchFlowcharts: jest.fn(),
  createFlowchart: jest.fn(),
  updateFlowchart: jest.fn(),
  deleteFlowchart: jest.fn(),
}));

jest.mock("html-to-image", () => ({ toJpeg: jest.fn().mockResolvedValue("") }));

jest.mock("sonner", () => {
  const toastMock = Object.assign(jest.fn(), {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    loading: jest.fn(),
    custom: jest.fn(),
    dismiss: jest.fn(),
    message: jest.fn(),
  });
  return { __esModule: true, toast: toastMock, Toaster: () => null };
});

import { toast } from "sonner";
import { FlowchartView } from "./FlowchartContainer";
import { fetchFlowcharts } from "./services/flowchart.service";

const spyToast = (f: unknown) => f as jest.Mock;
const readText = jest.fn();

const project = { id: "p1", name: "Proyek Uji" } as Project;

const papan = {
  id: "fw12",
  name: "Alur Tempel",
  description: "",
  category: "Panduan",
  nodes: [
    {
      id: "g1",
      type: "rect",
      x: 60,
      y: 60,
      label: "Satu",
      color: "indigo",
      width: 155,
      height: 70,
    },
  ],
  edges: [],
  theme: "miro",
  createdBy: "u1",
  createdByName: "Administrator",
};

/** Salinan draw.io: dua kotak dan satu panah di antaranya. */
const XML_DRAWIO = `<mxfile><diagram><mxGraphModel><root>
  <mxCell id="0" />
  <mxCell id="1" parent="0" />
  <mxCell id="2" value="Ajukan" style="rounded=1" vertex="1"><mxGeometry x="40" y="40" width="140" height="60" /></mxCell>
  <mxCell id="3" value="Verifikasi" style="rounded=1" vertex="1"><mxGeometry x="40" y="200" width="140" height="60" /></mxCell>
  <mxCell id="4" value="" edge="1" source="2" target="3" />
</root></mxGraphModel></diagram></mxfile>`;

async function bukaPapan() {
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
  fireEvent.click((await screen.findAllByText("Alur Tempel"))[0]);
  fireEvent.click(await screen.findByText("Diagram Alur", { selector: "button" }));
  await screen.findByTitle(/Snap to Grid|Snapping/i);
  return hasil.container;
}

const jumlahBentuk = (c: Element) => c.querySelectorAll('[id^="val-node-"]').length;
const jumlahPanah = (c: Element) => c.querySelectorAll("path[marker-end]").length;

beforeEach(() => {
  (fetchFlowcharts as jest.Mock).mockResolvedValue([papan]);
  Object.defineProperty(navigator, "clipboard", { value: { readText }, configurable: true });
  readText.mockReset();
  spyToast(toast.info).mockClear();
  spyToast(toast.success).mockClear();
});

describe("FlowchartView — tempel dari clipboard peramban (#589)", () => {
  it("Ctrl+V atas salinan draw.io memindahkan bentuk dan panahnya ke papan", async () => {
    readText.mockResolvedValue(XML_DRAWIO);
    const container = await bukaPapan();
    expect(jumlahBentuk(container)).toBe(1);

    fireEvent.mouseMove(container.querySelector(".grid-dots-light") as HTMLElement, {
      clientX: 620,
      clientY: 320,
    });
    fireEvent.keyDown(window, { key: "v", ctrlKey: true });

    await waitFor(() => expect(jumlahBentuk(container)).toBe(3));
    expect(jumlahPanah(container)).toBe(1);
    // Labelnya ikut terbaca, bukan jadi kotak kosong.
    expect(container.textContent).toContain("Verifikasi");
    expect(spyToast(toast.success)).toHaveBeenCalledWith(
      expect.stringMatching(/2 bentuk dan 1 panah|2 shapes and 1 arrows?/i)
    );
  });

  it("clipboard berisi teks biasa tidak menambah apa pun dan mengatakannya", async () => {
    readText.mockResolvedValue("rapatkan jadwal sprint minggu depan ya");
    const container = await bukaPapan();

    fireEvent.keyDown(window, { key: "v", ctrlKey: true });

    await waitFor(() =>
      expect(spyToast(toast.info)).toHaveBeenCalledWith(
        expect.stringMatching(/bukan diagram|not .*diagram/i)
      )
    );
    expect(jumlahBentuk(container)).toBe(1);
    expect(spyToast(toast.success)).not.toHaveBeenCalled();
  });

  it("peramban yang menolak dibacakan tidak membuat papan berubah diam-diam", async () => {
    readText.mockRejectedValue(new Error("NotAllowedError"));
    const container = await bukaPapan();

    fireEvent.keyDown(window, { key: "v", ctrlKey: true });

    await waitFor(() =>
      expect(spyToast(toast.info)).toHaveBeenCalledWith(
        expect.stringMatching(/tidak mengizinkan|refused/i)
      )
    );
    expect(jumlahBentuk(container)).toBe(1);
  });

  it("Ctrl+C tanpa seleksi juga bicara — dulu ia diam total", async () => {
    await bukaPapan();

    fireEvent.keyDown(window, { key: "c", ctrlKey: true });

    await waitFor(() =>
      expect(spyToast(toast.info)).toHaveBeenCalledWith(
        expect.stringMatching(/tidak ada bentuk|no shape/i)
      )
    );
    expect(readText).not.toHaveBeenCalled();
  });
});
