/**
 * @jest-environment jsdom
 *
 * #599 — jalur kursor papan flowchart.
 *
 * Diukur dengan probe pada papan tiga bentuk, sepuluh `mousemove` saat menyeret
 * satu bentuk (SEBELUM perbaikan):
 *   pendengar keydown  : 11 dipasang + 22 dibongkar
 *   snapshot asisten   : 10 publikasi (Map atas seluruh bentuk + dua slice)
 *   handler pergerakan : dijalankan DUA KALI per gerakan (div kanvas dan
 *                        pendengar global sama-sama memanggilnya)
 *   tiap Modal tertutup: 1 efek Escape dibongkar + `body.style.overflow` ditulis ulang
 * Sesudah: nol pasang-surut pendengar, satu publikasi saat interaksi selesai,
 * satu pemilik pergerakan per gerakan.
 *
 * Yang dijaga test ini adalah ANGKA-ANGKA ITU, supaya "ringan" tidak bisa
 * diam-diam kembali menjadi "teras".
 */
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import type { Project, Task } from "../../types";

jest.mock("./services/flowchart.service", () => ({
  fetchFlowcharts: jest.fn(),
  createFlowchart: jest.fn(),
  updateFlowchart: jest.fn(),
  deleteFlowchart: jest.fn(),
}));
jest.mock("html-to-image", () => ({ toJpeg: jest.fn().mockResolvedValue("") }));

const publikasiSnapshot = jest.fn();
jest.mock("../../lib/screenContext", () => ({
  setScreenSnapshot: (...a: unknown[]) => publikasiSnapshot(...a),
  clearScreenSnapshot: jest.fn(),
  formatScreenContextForAI: jest.fn(() => ""),
}));

jest.setTimeout(30_000);

import { FlowchartView } from "./FlowchartContainer";
import { fetchFlowcharts } from "./services/flowchart.service";

const project = { id: "p1", name: "Proyek Uji" } as Project;

const bentuk = (i: number) => ({
  id: `g${i}`,
  type: "rect" as const,
  x: 60 + i * 240,
  y: 60,
  label: `Bentuk ${i}`,
  color: "indigo",
  width: 155,
  height: 70,
});

const PAPAN = [
  {
    id: "fw1",
    name: "Alur Ukur",
    description: "",
    category: "Panduan",
    nodes: [bentuk(0), bentuk(1), bentuk(2)],
    edges: [
      { id: "e1", fromNodeId: "g0", toNodeId: "g1" },
      { id: "e2", fromNodeId: "g1", toNodeId: "g2" },
    ],
    theme: "miro",
    createdBy: "u1",
    createdByName: "Administrator",
  },
];

/** Menghitung pasang-surut pendengar papan ketik selama sebuah blok dijalankan. */
function ukurPendengarKetik() {
  const tambah = jest.spyOn(window, "addEventListener");
  const lepas = jest.spyOn(window, "removeEventListener");
  const jumlah = () =>
    tambah.mock.calls.filter((c) => c[0] === "keydown").length +
    lepas.mock.calls.filter((c) => c[0] === "keydown").length;
  const kembalikan = () => {
    tambah.mockRestore();
    lepas.mockRestore();
  };
  return { jumlah, kembalikan };
}

const renderPapan = () => {
  let commits = 0;
  const hasil = render(
    <React.Profiler
      id="papan"
      onRender={() => {
        commits += 1;
      }}
    >
      <FlowchartView
        selectedProject={project}
        tasks={[] as Task[]}
        projectMembers={[]}
        setSelectedTaskForDetail={jest.fn()}
        setIsTaskDetailModalOpen={jest.fn()}
        currentUserProfile={{ id: "u1", name: "Administrator", role: "admin" }}
      />
    </React.Profiler>
  );
  return { ...hasil, hitungCommit: () => commits, resetCommit: () => (commits = 0) };
};

/** Masuk ke kanvas editor dan kembalikan elemen lapisan kanvas. */
async function masukKanvas(container: HTMLElement) {
  fireEvent.click((await screen.findAllByText("Alur Ukur"))[0]);
  fireEvent.click(await screen.findByText("Diagram Alur", { selector: "button" }));
  await screen.findByTitle(/Snap to Grid|Snapping/i);
  return container.querySelector(".grid-dots-light") as HTMLElement;
}

const GERAKAN = 10;

/** Sepuluh gerakan kursor sambil menahan tombol di atas satu bentuk. */
async function seretSepuluhGerakan(kanvas: HTMLElement, container: HTMLElement) {
  const sasaran = container.querySelector('[id="val-node-g0"]') as HTMLElement;
  fireEvent.mouseDown(sasaran, { clientX: 104, clientY: 104, button: 0 });
  for (let i = 0; i < GERAKAN; i++) {
    await act(async () => {
      fireEvent.mouseMove(kanvas, { clientX: 104 + i * 12, clientY: 104 + i * 6, button: 0 });
    });
  }
}

beforeEach(() => {
  publikasiSnapshot.mockClear();
  (fetchFlowcharts as jest.Mock).mockReset().mockResolvedValue(PAPAN);
});

describe("jalur kursor papan flowchart (#599)", () => {
  it("tidak membongkar-pasang pendengar papan ketik saat menyeret bentuk", async () => {
    const { container } = renderPapan();
    const kanvas = await masukKanvas(container);
    const alat = ukurPendengarKetik();

    await seretSepuluhGerakan(kanvas, container);

    expect(alat.jumlah()).toBe(0);
    await act(async () => {
      fireEvent.mouseUp(window, { clientX: 224, clientY: 164 });
    });
    alat.kembalikan();
  });

  it("menunda snapshot asisten sampai papan berhenti bergerak", async () => {
    const { container } = renderPapan();
    const kanvas = await masukKanvas(container);
    publikasiSnapshot.mockClear();

    await seretSepuluhGerakan(kanvas, container);
    expect(publikasiSnapshot).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.mouseUp(window, { clientX: 224, clientY: 164 });
    });
    // Interaksi selesai -> satu publikasi berisi posisi TERAKHIR, bukan posisi tengah lintasan.
    expect(publikasiSnapshot).toHaveBeenCalledTimes(1);
    const isi = publikasiSnapshot.mock.calls[0][0] as { nodes: { id: string }[] };
    expect(isi.nodes.map((n) => n.id)).toEqual(["g0", "g1", "g2"]);
  });

  it("bentuk tetap mengikuti kursor walau hanya satu jalur yang mengurus pergerakan", async () => {
    const { container } = renderPapan();
    const kanvas = await masukKanvas(container);
    const sasaran = () => container.querySelector('[id="val-node-g0"]') as HTMLElement;

    const awal = sasaran().style.left;
    await seretSepuluhGerakan(kanvas, container);
    expect(sasaran().style.left).not.toBe(awal);

    const akhir = sasaran().style.left;
    await act(async () => {
      fireEvent.mouseUp(window, { clientX: 224, clientY: 164 });
    });
    // Gerakan sesudah lepas tidak boleh lagi menggeser bentuk: pendengar global
    // sudah dilepas, dan div kanvas tidak menjalankan handler interaksi.
    await act(async () => {
      fireEvent.mouseMove(kanvas, { clientX: 900, clientY: 700 });
    });
    expect(sasaran().style.left).toBe(akhir);
  });

  it("melepas tombol di luar lapisan kanvas tetap mengakhiri seretan", async () => {
    const { container } = renderPapan();
    const kanvas = await masukKanvas(container);
    await seretSepuluhGerakan(kanvas, container);

    await act(async () => {
      fireEvent.mouseUp(document.body, { clientX: 224, clientY: 164 });
    });

    const posisi = (container.querySelector('[id="val-node-g0"]') as HTMLElement).style.left;
    await act(async () => {
      fireEvent.mouseMove(kanvas, { clientX: 1200, clientY: 900 });
    });
    expect((container.querySelector('[id="val-node-g0"]') as HTMLElement).style.left).toBe(posisi);
  });
});
