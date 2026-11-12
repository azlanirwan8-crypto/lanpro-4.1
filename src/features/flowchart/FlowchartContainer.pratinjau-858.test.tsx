/**
 * @jest-environment jsdom
 *
 * #858 — membuat garis semudah draw.io: pratinjau yang jujur.
 *
 * TIGA PERILAKU YANG DIKUNCI (semuanya berbeda dari `main`):
 *
 * 1. Garis bantu berangkat dari PAKU yang digenggam. Di `main` pangkalnya
 *    pusat bentuk (`srcNode.x + sW/2`), jadi garis terlihat keluar dari tengah
 *    kotak lalu melompat ke tepi saat garisnya lahir.
 * 2. Selama mode sambung hidup — termasuk setelah paku DILEPAS tanpa gerak —
 *    pratinjau mengikuti kursor dan bentuk sasaran disorot. Di `main` efek
 *    pendengar gerak mati begitu tombol dilepas, dan tidak ada penanda sasaran
 *    sama sekali.
 * 3. Mengklik BADAN bentuk sasaran menyambung. Di `main` klik itu memilih dan
 *    menyeret bentuknya, padahal toast menyuruh "pilih bentuk sasaran".
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Project, Task } from "../../types";

jest.mock("./services/flowchart.service", () => ({
  fetchFlowcharts: jest.fn(),
  createFlowchart: jest.fn(),
  updateFlowchart: jest.fn().mockResolvedValue(null),
  deleteFlowchart: jest.fn(),
}));
jest.mock("html-to-image", () => ({
  toJpeg: jest.fn().mockResolvedValue("data:image/jpeg;base64,x"),
  toPng: jest.fn().mockResolvedValue("data:image/png;base64,x"),
  toSvg: jest.fn().mockResolvedValue("data:image/svg+xml,x"),
}));
jest.mock("../../lib/screenContext", () => ({
  setScreenSnapshot: jest.fn(),
  clearScreenSnapshot: jest.fn(),
  formatScreenContextForAI: jest.fn(() => ""),
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

jest.setTimeout(30_000);

import { FlowchartView } from "./FlowchartContainer";
import { fetchFlowcharts, updateFlowchart } from "./services/flowchart.service";
import { toast } from "sonner";

const project = { id: "p1", name: "Proyek Uji" } as Project;

const PAPAN = [
  {
    id: "fwPr",
    name: "Papan Pratinjau Garis",
    description: "",
    category: "Panduan",
    nodes: [
      {
        id: "a0",
        type: "rect",
        x: 100,
        y: 100,
        label: "A",
        color: "indigo",
        width: 200,
        height: 100,
      },
      {
        id: "a1",
        type: "rect",
        x: 500,
        y: 400,
        label: "B",
        color: "blue",
        width: 200,
        height: 100,
      },
    ],
    edges: [],
    theme: "miro",
    createdBy: "u1",
    createdByName: "Administrator",
  },
];

const bentuk = (container: HTMLElement, id: string) =>
  container.querySelector(`[id="val-node-${id}"]`) as HTMLElement;

const ukuran = (el: HTMLElement) => ({
  left: parseFloat(el.style.left),
  top: parseFloat(el.style.top),
  width: parseFloat(el.style.width),
  height: parseFloat(el.style.height),
});

async function bukaPapan() {
  const { container } = render(
    <FlowchartView
      selectedProject={project}
      tasks={[] as Task[]}
      projectMembers={[]}
      setSelectedTaskForDetail={jest.fn()}
      setIsTaskDetailModalOpen={jest.fn()}
      currentUserProfile={{ id: "u1", name: "Administrator", role: "admin" }}
    />
  );
  fireEvent.click((await screen.findAllByText("Papan Pratinjau Garis"))[0]);
  fireEvent.click(await screen.findByText("Diagram Alur", { selector: "button" }));
  await screen.findByTitle(/Snap to Grid|Snapping/i);
  return container;
}

/** Pilih bentuk A lalu pulangkan paku kanannya (posisi 300,150 di papan uji). */
async function pakuKananA(container: HTMLElement) {
  const a0 = ukuran(bentuk(container, "a0"));
  fireEvent.mouseDown(bentuk(container, "a0"), {
    clientX: a0.left + a0.width / 2,
    clientY: a0.top + a0.height / 2,
    button: 0,
  });
  fireEvent.mouseUp(window);
  fireEvent.mouseEnter(bentuk(container, "a0"));
  return screen.findByTitle(/Tarik panah dari sisi kanan/i);
}

const jalurPratinjau = (container: HTMLElement) =>
  container.querySelector('[data-testid="pratinjau-sambung"] path') as SVGPathElement | null;

beforeEach(() => {
  (fetchFlowcharts as jest.Mock).mockReset().mockResolvedValue(PAPAN);
  (updateFlowchart as jest.Mock).mockReset().mockResolvedValue(null);
  (toast.info as jest.Mock).mockReset();
});

describe("#858 pratinjau garis seperti draw.io", () => {
  it("pangkal pratinjau duduk di paku yang digenggam, bukan di pusat bentuk", async () => {
    const container = await bukaPapan();
    const a0 = ukuran(bentuk(container, "a0"));
    const paku = await pakuKananA(container);

    fireEvent.mouseDown(paku, {
      clientX: a0.left + a0.width,
      clientY: a0.top + a0.height / 2,
      button: 0,
    });

    const jalur = await waitFor(() => {
      const el = jalurPratinjau(container);
      if (!el) throw new Error("pratinjau belum tampil");
      return el;
    });
    const d = jalur.getAttribute("d") || "";

    expect(d.startsWith(`M ${a0.left + a0.width} ${a0.top + a0.height / 2}`)).toBe(true);
    expect(d.startsWith(`M ${a0.left + a0.width / 2} ${a0.top + a0.height / 2}`)).toBe(false);
    // Gaya pratinjau = gaya garis yang akan lahir: ortogonal bertoken, bukan
    // kurva ungu keras. Tiga segmen berarti bentuk sikunya benar-benar dipakai.
    expect(jalur.getAttribute("stroke")).toBe("var(--color-primary)");
    expect((d.match(/ L /g) || []).length).toBe(3);
    // Tidak ada toast pengganggu saat mulai menyeret.
    expect(toast.info).not.toHaveBeenCalled();
  });

  it("setelah paku dilepas, pratinjau tetap mengikuti kursor dan sasaran disorot", async () => {
    const container = await bukaPapan();
    const a0 = ukuran(bentuk(container, "a0"));
    const paku = await pakuKananA(container);

    // Klik paku (tekan lalu lepas di tempat): mode sambung harus tetap hidup.
    fireEvent.mouseDown(paku, {
      clientX: a0.left + a0.width,
      clientY: a0.top + a0.height / 2,
      button: 0,
    });
    fireEvent.mouseUp(window, {
      clientX: a0.left + a0.width,
      clientY: a0.top + a0.height / 2,
    });
    fireEvent.mouseMove(window, { clientX: 600, clientY: 450 });

    const sorot = await waitFor(() => {
      const el = container.querySelector('[data-testid="sasaran-sambung"]');
      if (!el) throw new Error("bentuk sasaran belum disorot");
      return el as HTMLElement;
    });
    // Penanda digambar DI DALAM bentuk sasaran, bukan lapisan absolut tambahan
    // di papan: itu cara menaruhnya di atas bentuk tanpa menambah tangga z.
    expect(sorot.closest('[id="val-node-a1"]')).not.toBeNull();
    const a1 = ukuran(bentuk(container, "a1"));

    const jalur = jalurPratinjau(container);
    expect(jalur).not.toBeNull();
    const d = jalur!.getAttribute("d") || "";
    const ujung = /L\s*([-\d.]+)\s+([-\d.]+)\s*$/.exec(d);
    expect(ujung).toBeTruthy();
    const ex = parseFloat(ujung![1]);
    const ey = parseFloat(ujung![2]);
    const diTepi =
      ((Math.abs(ex - a1.left) < 0.01 || Math.abs(ex - (a1.left + a1.width)) < 0.01) &&
        ey >= a1.top - 0.01 &&
        ey <= a1.top + a1.height + 0.01) ||
      ((Math.abs(ey - a1.top) < 0.01 || Math.abs(ey - (a1.top + a1.height)) < 0.01) &&
        ex >= a1.left - 0.01 &&
        ex <= a1.left + a1.width + 0.01);
    expect(diTepi).toBe(true);
  });

  it("klik badan bentuk sasaran menyambung, bukan menyeret bentuknya", async () => {
    const container = await bukaPapan();
    const a0 = ukuran(bentuk(container, "a0"));
    const paku = await pakuKananA(container);

    fireEvent.mouseDown(paku, {
      clientX: a0.left + a0.width,
      clientY: a0.top + a0.height / 2,
      button: 0,
    });
    fireEvent.mouseUp(window, {
      clientX: a0.left + a0.width,
      clientY: a0.top + a0.height / 2,
    });

    // Klik BADAN bentuk B — satu klik, tanpa menyeret.
    fireEvent.mouseDown(bentuk(container, "a1"), { clientX: 600, clientY: 450, button: 0 });
    fireEvent.mouseUp(window, { clientX: 600, clientY: 450 });

    fireEvent.click(await screen.findByTitle(/Simpan seluruh diagram alur/i));
    await waitFor(() => expect(updateFlowchart).toHaveBeenCalled());

    const payload = (updateFlowchart as jest.Mock).mock.calls
      .map((c) => c[2])
      .find((p) => Array.isArray(p?.edges) && p.edges.some((e: any) => e.fromNodeId === "a0"));
    expect(payload).toBeTruthy();
    const garis = payload.edges.find((e: any) => e.fromNodeId === "a0");
    expect(garis.toNodeId).toBe("a1");
    expect(garis.connector).toBe("orthogonal");
  });
});
