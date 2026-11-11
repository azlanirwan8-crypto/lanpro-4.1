/**
 * @jest-environment jsdom
 *
 * #840 — "Auto Align" di layar, bukan hanya di modul.
 *
 * `rapiAuto-840.test.ts` mengunci geometrinya. Yang di sini dikunci adalah
 * JALURNYA: tombol di dock benar-benar memindahkan bentuk yang terlihat, bentuk
 * yang tadinya bertumpuk berhenti bertumpuk, rute tangan yang mengikat ke
 * koordinat lama dibuang, dan satu kali Batalkan mengembalikan papan persis
 * seperti semula. Empat hal itulah yang dirasakan pemilik proyek; semuanya
 * bisa salah walau modulnya benar (salah state, lupa recordHistory, lupa
 * menghapus waypoint).
 *
 * Papan ujinya dibuat buruk dengan sengaja dan sekaligus menjadi bukti merah di
 * `main`: dua bentuk tumpang-tindih, satu bentuk di kiri-bawah yang justru
 * dituju oleh alur ke kanan, satu garis yang rute-nya dikunci waypoint jauh di
 * (2000, 2000), dan satu jalan pintas `awal → selesai` di samping
 * `awal → cek → selesai`. Jalan pintas itulah yang membuka cacat pertama:
 * perataan lama menghitung level dari jalur PERTAMA, jadi "selesai" mendarat di
 * kolom yang sama dengan "cek" dan anak panahnya menjadi garis vertikal pendek.
 */
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  toSvg: jest.fn().mockResolvedValue("data:image/svg+xml;base64,x"),
}));
jest.mock("../../lib/screenContext", () => ({
  setScreenSnapshot: jest.fn(),
  clearScreenSnapshot: jest.fn(),
  formatScreenContextForAI: jest.fn(() => ""),
}));

jest.setTimeout(30_000);

import { FlowchartView } from "./FlowchartContainer";
import { fetchFlowcharts } from "./services/flowchart.service";

const project = { id: "p1", name: "Proyek Uji" } as Project;

const LEBAR = 200;
const TINGGI = 100;

const AWAL = {
  awal: { x: 300, y: 250 },
  // sengaja bertumpuk dengan "awal": selisih 10 px, bentuk 200x100
  cek: { x: 310, y: 255 },
  // di KIRI-BATAS bawah, padahal alurnya mengalir ke sana
  selesai: { x: 60, y: 700 },
};

const bentuk = (id: string, tipe: "rect" | "decision", label: string) => ({
  id,
  type: tipe,
  x: AWAL[id as keyof typeof AWAL].x,
  y: AWAL[id as keyof typeof AWAL].y,
  label,
  color: "blue",
  width: LEBAR,
  height: TINGGI,
});

const PAPAN = [
  {
    id: "fwRapi",
    name: "Papan Berantakan",
    description: "",
    category: "Panduan",
    nodes: [
      bentuk("awal", "rect", "Mulai"),
      bentuk("cek", "decision", "Cek"),
      bentuk("selesai", "rect", "Selesai"),
    ],
    edges: [
      { id: "e0", fromNodeId: "awal", toNodeId: "cek" },
      {
        id: "e1",
        fromNodeId: "cek",
        toNodeId: "selesai",
        waypoints: [
          { x: 2000, y: 2000 },
          { x: 2000, y: 300 },
        ],
      },
      // jalan pintas: rute TERPANJANG-nya awal→cek→selesai, bukan awal→selesai
      { id: "e2", fromNodeId: "awal", toNodeId: "selesai" },
    ],
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

async function bukaPapan() {
  const { container } = renderView();
  fireEvent.click((await screen.findAllByText("Papan Berantakan"))[0]);
  fireEvent.click(await screen.findByText("Diagram Alur", { selector: "button" }));
  await screen.findByTitle(/Snap to Grid|Snapping/i);
  return container;
}

/** posisi TERLIHAT sebuah bentuk — dibaca dari DOM, bukan dari state React */
const posisi = (container: HTMLElement, id: string) => {
  const el = container.querySelector(`#val-node-${id}`) as HTMLElement;
  expect(el).toBeTruthy();
  return { x: parseFloat(el.style.left), y: parseFloat(el.style.top) };
};

const kotak = (p: { x: number; y: number }) => ({
  x1: p.x,
  y1: p.y,
  x2: p.x + LEBAR,
  y2: p.y + TINGGI,
});

const bertindih = (a: ReturnType<typeof kotak>, b: ReturnType<typeof kotak>) =>
  a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;

const semuaJalur = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('path[stroke="transparent"]')).map(
    (p) => p.getAttribute("d") || ""
  );

const tekanRapikan = async (container: HTMLElement) => {
  fireEvent.click(await screen.findByText(/Rapikan Otomatis|Auto-Align/i));
};

beforeEach(() => {
  (fetchFlowcharts as jest.Mock).mockReset().mockResolvedValue(PAPAN);
});

describe("#840 Auto Align di dalam editor", () => {
  it("bentuk yang bertumpuk berhenti bertumpuk dan alurnya membaca kiri ke kanan", async () => {
    const container = await bukaPapan();

    // keadaan awal memang buruk (kalau tidak, test ini tidak mengunci apa pun)
    expect(bertindih(kotak(posisi(container, "awal")), kotak(posisi(container, "cek")))).toBe(true);
    expect(posisi(container, "selesai").x).toBeLessThan(posisi(container, "awal").x);

    await tekanRapikan(container);

    await waitFor(() => {
      const awal = posisi(container, "awal");
      const cek = posisi(container, "cek");
      const selesai = posisi(container, "selesai");
      expect(bertindih(kotak(awal), kotak(cek))).toBe(false);
      expect(bertindih(kotak(cek), kotak(selesai))).toBe(false);
      expect(bertindih(kotak(awal), kotak(selesai))).toBe(false);
      // arah baca: mulai → cek → selesai selalu ke kanan
      expect(cek.x).toBeGreaterThan(awal.x);
      expect(selesai.x).toBeGreaterThan(cek.x);
    });
  });

  it("rute tangan yang mengikat ke koordinat lama dibuang bersama papan lamanya", async () => {
    const container = await bukaPapan();

    // waypoint (2000, 2000) masih ikut tergambar sebelum perataan
    expect(semuaJalur(container).some((d) => d.includes("2000"))).toBe(true);

    await tekanRapikan(container);

    await waitFor(() => {
      expect(semuaJalur(container).some((d) => d.includes("2000"))).toBe(false);
    });
  });

  it("satu kali Batalkan mengembalikan posisi persis seperti sebelum dirapikan", async () => {
    const container = await bukaPapan();
    const sebelum = {
      awal: posisi(container, "awal"),
      cek: posisi(container, "cek"),
      selesai: posisi(container, "selesai"),
    };

    await tekanRapikan(container);
    await waitFor(() => expect(posisi(container, "selesai")).not.toEqual(sebelum.selesai));

    fireEvent.click(await screen.findByTitle(/Batalkan Langkah|Undo step/i));

    await waitFor(() => {
      expect(posisi(container, "awal")).toEqual(sebelum.awal);
      expect(posisi(container, "cek")).toEqual(sebelum.cek);
      expect(posisi(container, "selesai")).toEqual(sebelum.selesai);
    });
  });
});
