/**
 * @jest-environment jsdom
 *
 * #754 — gesture kanvas yang membuat papan terasa seperti draw.io.
 *
 * EMPAT hal yang diuji di sini sebelumnya rusak, dan semuanya kelas kerusakan
 * yang sama: papan punya fiturnya, tetapi pintasannya tidak sampai ke pengguna.
 *
 * 1. **Bentuk tidak bisa diseret dari badannya.** Kotak label adalah
 *    `<textarea>` yang menutupi seluruh bentuk, dan `handleNodeMouseDown`
 *    menolak memulai seretan begitu targetnya textarea. Satu-satunya cara
 *    memindahkan bentuk adalah menyeret bingkainya yang beberapa piksel lebar.
 *    draw.io: klik tunggal memilih, seret memindahkan, KLIK GANDA baru membuka
 *    penyunting teks.
 * 2. **Ctrl/Cmd+klik tidak menambah ke seleksi.** #614 memasang perilaku itu
 *    untuk Shift, tetapi hanya `e.shiftKey` yang diuji — jadi Ctrl+klik, tombol
 *    yang dipakai draw.io/Figma, justru membuang seleksi yang sudah ada.
 * 3. **Ctrl+X tidak ada.** Ctrl+C dan Ctrl+V jalan, Ctrl+X diam total.
 * 4. **Panah hanya menggeser satu bentuk.** Memilih lima bentuk lalu menekan
 *    panah hanya menggerakkan yang terakhir diklik, karena `copiedNodes`
 *    diabaikan di cabang nudge.
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
jest.mock("html-to-image", () => ({ toJpeg: jest.fn().mockResolvedValue("") }));
jest.mock("../../lib/screenContext", () => ({
  setScreenSnapshot: jest.fn(),
  clearScreenSnapshot: jest.fn(),
  formatScreenContextForAI: jest.fn(() => ""),
}));

jest.setTimeout(30_000);

import { FlowchartView } from "./FlowchartContainer";
import { fetchFlowcharts, updateFlowchart } from "./services/flowchart.service";

const project = { id: "p1", name: "Proyek Uji" } as Project;

const PAPAN = [
  {
    id: "fw1",
    name: "Alur Gesture",
    description: "",
    category: "Panduan",
    nodes: [
      {
        id: "g0",
        type: "rect",
        x: 100,
        y: 100,
        label: "Satu",
        color: "indigo",
        width: 200,
        height: 100,
      },
      {
        id: "g1",
        type: "rect",
        x: 400,
        y: 100,
        label: "Dua",
        color: "blue",
        width: 200,
        height: 100,
      },
    ],
    edges: [{ id: "e0", fromNodeId: "g0", toNodeId: "g1" }],
    theme: "miro",
    createdBy: "u1",
    createdByName: "Administrator",
  },
];

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

async function masukKanvas(container: HTMLElement) {
  fireEvent.click((await screen.findAllByText("Alur Gesture"))[0]);
  fireEvent.click(await screen.findByText("Diagram Alur", { selector: "button" }));
  await screen.findByTitle(/Snap to Grid|Snapping/i);
  return container.querySelector(".kanvas-papan") as HTMLElement;
}

const bentuk = (container: HTMLElement, id: string) =>
  container.querySelector(`[id="val-node-${id}"]`) as HTMLElement;

const kotakLabel = (container: HTMLElement, id: string) =>
  bentuk(container, id).querySelector("textarea") as HTMLTextAreaElement;

const kiri = (container: HTMLElement, id: string) => bentuk(container, id).style.left;

const jumlahBentuk = (container: HTMLElement) =>
  container.querySelectorAll('[id^="val-node-"]').length;

beforeEach(() => {
  (fetchFlowcharts as jest.Mock).mockReset().mockResolvedValue(PAPAN);
  (updateFlowchart as jest.Mock).mockReset().mockResolvedValue(null);
});

describe("#754 bentuk bisa diseret dari badannya sendiri", () => {
  it("kotak label tidak menerima pointer selama tidak disunting", async () => {
    const { container } = renderView();
    await masukKanvas(container);

    const kotak = kotakLabel(container, "g0");
    expect(kotak.readOnly).toBe(true);
    expect(kotak.tabIndex).toBe(-1);
    expect(kotak.className).toContain("pointer-events-none");
  });

  it("seret lewat kotak label memindahkan bentuknya", async () => {
    const { container } = renderView();
    await masukKanvas(container);

    const sebelum = kiri(container, "g0");
    expect(sebelum).toBe("100px");

    fireEvent.mouseDown(kotakLabel(container, "g0"), {
      clientX: 200,
      clientY: 150,
      button: 0,
    });
    fireEvent.mouseMove(window, { clientX: 260, clientY: 190 });
    fireEvent.mouseUp(window);

    await waitFor(() => expect(kiri(container, "g0")).not.toBe(sebelum));
  });

  it("klik ganda membuka penyuntingan labelnya", async () => {
    const { container } = renderView();
    await masukKanvas(container);

    fireEvent.doubleClick(bentuk(container, "g0"));
    const kotak = kotakLabel(container, "g0");
    await waitFor(() => expect(kotak.readOnly).toBe(false));
    expect(kotak.className).toContain("pointer-events-auto");
  });

  it("mengetik satu huruf pada bentuk terpilih menimpa labelnya", async () => {
    const { container } = renderView();
    await masukKanvas(container);

    // Klik tunggal memilih TANPA membuka penyuntingan — inilah pemisahan yang
    // membuat bentuk tetap bisa diseret dari badannya.
    fireEvent.mouseDown(bentuk(container, "g1"), { clientX: 500, clientY: 150, button: 0 });
    fireEvent.mouseUp(window);
    expect(kotakLabel(container, "g1").readOnly).toBe(true);

    fireEvent.keyDown(window, { key: "H" });
    const kotak1 = kotakLabel(container, "g1");
    await waitFor(() => expect(kotak1.readOnly).toBe(false));
    expect(kotak1.value).toBe("H");

    fireEvent.change(kotak1, { target: { value: "Halo" } });
    await waitFor(() => expect(kotakLabel(container, "g1").value).toBe("Halo"));
  });

  it("Escape saat menyunting menutup kotak tanpa membuang teks", async () => {
    const { container } = renderView();
    await masukKanvas(container);

    fireEvent.doubleClick(bentuk(container, "g0"));
    const kotak = kotakLabel(container, "g0");
    await waitFor(() => expect(kotak.readOnly).toBe(false));

    fireEvent.change(kotak, { target: { value: "Label Baru" } });
    fireEvent.keyDown(kotak, { key: "Escape" });

    await waitFor(() => expect(kotak.readOnly).toBe(true));
    expect(kotak.value).toBe("Label Baru");
  });
});

describe("#754 Ctrl/Cmd+klik menambah ke kelompok", () => {
  it("dua bentuk terpilih bersama dan panah menggeser keduanya", async () => {
    const { container } = renderView();
    await masukKanvas(container);

    fireEvent.mouseDown(bentuk(container, "g0"), { clientX: 200, clientY: 150, button: 0 });
    fireEvent.mouseUp(window);
    fireEvent.mouseDown(bentuk(container, "g1"), {
      clientX: 500,
      clientY: 150,
      button: 0,
      ctrlKey: true,
    });
    fireEvent.mouseUp(window);

    // Kotak pemilih bersama hanya muncul bila keduanya benar-benar satu kelompok.
    await waitFor(() => expect(container.querySelector('[data-testid="kotak-grup"]')).toBeTruthy());

    const kiri0 = kiri(container, "g0");
    const kiri1 = kiri(container, "g1");
    fireEvent.keyDown(window, { key: "ArrowRight" });

    await waitFor(() => expect(kiri(container, "g0")).not.toBe(kiri0));
    expect(kiri(container, "g1")).not.toBe(kiri1);
  });
});

describe("#754 Ctrl+X memotong seleksi", () => {
  it("bentuk hilang dari papan dan bisa ditempel kembali", async () => {
    const { container } = renderView();
    await masukKanvas(container);

    fireEvent.mouseDown(bentuk(container, "g0"), { clientX: 200, clientY: 150, button: 0 });
    fireEvent.mouseUp(window);

    fireEvent.keyDown(window, { key: "x", ctrlKey: true });
    await waitFor(() => expect(bentuk(container, "g0")).toBeNull());
    expect(jumlahBentuk(container)).toBe(1);
    // Panah yang ujungnya terpotong ikut dihapus di `potongSeleksi`. Tidak
    // diasersi lewat DOM di sini: SVG lapisan garis selalu membawa dua `<path>`
    // penanda panah bawaan di dalam `<defs>`-nya, jadi jumlah path bukan jumlah
    // panah. Pembersihan panah yatim sendiri sudah dikunci
    // `FlowchartEdges.yatim-631.test.tsx`.

    // Hasil tempel mendapat ID BARU (`kumpulkanSalinan` menyalin dalam, supaya
    // bentuk tempelan tidak berbagi identitas dengan aslinya), jadi yang
    // dihitung adalah jumlah bentuk, bukan id-nya.
    fireEvent.keyDown(window, { key: "v", ctrlKey: true });
    await waitFor(() => expect(jumlahBentuk(container)).toBe(2));
  });

  it("tanpa seleksi Ctrl+X tidak menghapus apa pun", async () => {
    const { container } = renderView();
    await masukKanvas(container);

    fireEvent.keyDown(window, { key: "x", ctrlKey: true });
    expect(bentuk(container, "g0")).toBeTruthy();
    expect(bentuk(container, "g1")).toBeTruthy();
  });
});
