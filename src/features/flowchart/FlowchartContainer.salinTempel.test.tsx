/**
 * #582 — salin-tempel papan lewat jalan yang sebenarnya dipakai pemilik
 * proyek: sapu dua bentuk, Ctrl+C, klik ke tempat lain, Ctrl+V.
 *
 * Rantai ini dulu putus di tengah dan tidak ada yang bilang begitu: Ctrl+C atas
 * seleksi marquee hanya membunyikan "disalin", klik berikutnya menghapus array
 * yang sama (seleksi = clipboard), lalu Ctrl+V diam tanpa toast. Yang dijaga di
 * sini karena itu perilaku, bukan fungsi.
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

// `<Toaster/>` hidup di AppContainer, jadi toast tidak akan pernah muncul di
// pohon test ini. Yang dibuktikan karena itu adalah PANGGILANNYA: clipboard
// kosong harus bicara, bukan diam.
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

const project = { id: "p1", name: "Proyek Uji" } as Project;

const papanDuaBentuk = {
  id: "fw10",
  name: "Alur Salin",
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
    {
      id: "g2",
      type: "rect",
      x: 300,
      y: 60,
      label: "Dua",
      color: "indigo",
      width: 155,
      height: 70,
    },
  ],
  edges: [{ id: "e1", fromNodeId: "g1", toNodeId: "g2" }],
  theme: "miro",
  createdBy: "u1",
  createdByName: "Administrator",
};

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

/** Buka papan sampai kanvas editor muncul. */
async function bukaPapan() {
  const hasil = renderView();
  fireEvent.click((await screen.findAllByText("Alur Salin"))[0]);
  fireEvent.click(await screen.findByText("Diagram Alur", { selector: "button" }));
  await screen.findByTitle(/Snap to Grid|Snapping/i);
  return hasil.container;
}

const jumlahBentuk = (c: Element) => c.querySelectorAll('[id^="val-node-"]').length;
const jumlahPanah = (c: Element) => c.querySelectorAll("path[marker-end]").length;

/**
 * #607 — meniru peristiwa `paste` peramban: isi clipboard datang lewat
 * `clipboardData` dengan SATU RASA PER RASA (text/html, text/plain, image/…),
 * bukan lewat `navigator.clipboard.readText()` yang hanya melihat teks polos.
 */
const tempelPeramban = (isi: Record<string, string>) => {
  const e = new Event("paste", { bubbles: true, cancelable: true }) as Event & {
    clipboardData?: unknown;
  };
  e.clipboardData = {
    getData: (jenis: string) => isi[jenis] || "",
    types: Object.keys(isi),
  };
  fireEvent(window, e);
  return e;
};

beforeEach(() => {
  (fetchFlowcharts as jest.Mock).mockResolvedValue([papanDuaBentuk]);
  spyToast(toast.info).mockClear();
  spyToast(toast.success).mockClear();
});

describe("FlowchartView — salin-tempel papan (#582)", () => {
  it("seleksi marquee yang disalin lalu diklik tetap bisa ditempel, lengkap dengan panahnya", async () => {
    const container = await bukaPapan();
    const kanvas = container.querySelector(".kanvas-papan") as HTMLElement;
    expect(jumlahBentuk(container)).toBe(2);
    expect(jumlahPanah(container)).toBe(1);

    // Sapu BOTH bentuk: shift+drag menghasilkan kotak seleksi (pola test #546).
    fireEvent.mouseDown(kanvas, { clientX: 20, clientY: 20, button: 0, shiftKey: true });
    fireEvent.mouseMove(window, { clientX: 500, clientY: 180, shiftKey: true });
    fireEvent.mouseUp(window);

    fireEvent.keyDown(window, { key: "c", ctrlKey: true });

    // Klik di kanvas: dulu ini menghapus "salinan" karena seleksi dan clipboard
    // adalah array yang sama.
    fireEvent.mouseDown(kanvas, { clientX: 8, clientY: 400, button: 0 });
    fireEvent.mouseUp(window);

    // Kursor dipindah jauh: hasil tempel harus mengikuti tangan, bukan menindih
    // bentuk asalnya.
    fireEvent.mouseMove(kanvas, { clientX: 700, clientY: 300 });

    fireEvent.keyDown(window, { key: "v", ctrlKey: true });

    await waitFor(() => expect(jumlahBentuk(container)).toBe(4));

    const asli = container.querySelector('[id="val-node-g1"]') as HTMLElement;
    const hasil = container.querySelector('[id^="val-node-g1-c"]') as HTMLElement;
    const hasilDua = container.querySelector('[id^="val-node-g2-c"]') as HTMLElement;
    const x = (el: HTMLElement) => parseInt(el.style.left || "0", 10);
    const y = (el: HTMLElement) => parseInt(el.style.top || "0", 10);

    // Dulu Ctrl+V hanya menggeser 30px, jadi paste di papan yang sudah penuh
    // menindih bentuk asal dan terlihat seperti tidak terjadi apa-apa.
    expect(x(hasil)).toBeGreaterThan(x(asli) + 300);
    expect(y(hasil)).toBeGreaterThan(y(asli) + 100);
    // Jarak antar bentuk dalam kelompok bertahan — yang pindah whole group.
    expect(x(hasilDua) - x(hasil)).toBe(240);
    // Yang membedakan salin-tempel sungguhan dari duplikat: panah ikut pindah
    // dan menghubungkan hasil tempelnya sendiri, bukan bentuk asalnya.
    expect(jumlahPanah(container)).toBe(2);
    expect(container.querySelectorAll('[id^="val-node-g1-c"]').length).toBe(1);
    expect(container.querySelectorAll('[id^="val-node-g2-c"]').length).toBe(1);
  });

  it("menempel tanpa isi clipboard bicara, bukan diam", async () => {
    const container = await bukaPapan();
    expect(jumlahBentuk(container)).toBe(2);

    fireEvent.keyDown(window, { key: "v", ctrlKey: true });
    // #607 — di peramban sungguhan Ctrl+V selalu diikuti peristiwa `paste`, dan
    // hanya peristiwa itu yang membawa isi clipboard aplikasi lain. Test meniru
    // urutannya: keydown (papan kosong, tidak mencegah apa pun) lalu paste kosong.
    tempelPeramban({});

    // Dulu: nol bentuk bertambah DAN nol pesan - pengguna tidak tahu apa yang
    // terjadi, persis "kenapa tidak bisa" yang dilaporkan 30 Sep.
    expect(jumlahBentuk(container)).toBe(2);
    expect(spyToast(toast.info)).toHaveBeenCalledWith(expect.stringMatching(/kosong|empty/i));
  });

  it("menu klik kanan bentuk punya Salin dan papan tidak kehilangan panah yang ujungnya di luar seleksi", async () => {
    const container = await bukaPapan();
    const bentuk = container.querySelector('[id="val-node-g1"]') as Element;

    fireEvent.contextMenu(bentuk);
    const itemSalin = await screen.findByText(/Salin Komponen|Copy Component/i);
    fireEvent.click(itemSalin);

    // Jujur soal isinya: satu bentuk tanpa panah yang nyangkut ke luar seleksi.
    expect(spyToast(toast.success)).toHaveBeenCalledWith(
      expect.stringMatching(/0 panah|0 arrows/i)
    );

    fireEvent.keyDown(window, { key: "v", ctrlKey: true });
    await waitFor(() => expect(jumlahBentuk(container)).toBe(3));
    // Panah e1 tidak ikut tersalin karena "Dua" tidak diseleksi: 1 tetap 1.
    expect(jumlahPanah(container)).toBe(1);
  });
});
