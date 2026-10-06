/**
 * @jest-environment jsdom
 */
/**
 * #643 + #644 — dua keluhan pemilik proyek 06 Okt dari satu tangkapan layar
 * papan: "tidak bisa di edit" dan "jika di paste, posisinya tidak berdasarkan
 * cursor, malah di pojok bawah".
 *
 * SEBABNYA DIUKUR DULU, bukan ditebak (delapan percobaan dijalankan sebelum
 * file ini ditulis; angkanya tercatat di `AUDIT.md`):
 *
 *  #644 NYATA. Kotak label di dalam bentuk menulis ke `handleUpdateActiveNode`
 *  — yaitu ke bentuk TERPILIH. Tanpa seleksi (keadaan biasa setelah menempel
 *  kelompok: `komitTempel` hanya menyetel satu bentuk terpilih bila hasilnya
 *  satu bentuk) fungsi itu keluar tanpa arti, jadi huruf yang diketik hilang
 *  tanpa pesan. Terukur: label tidak berubah sama sekali.
 *
 *  #643 TIDAK bisa direproduksi sebagai "salah tempat" pada build ini — enam
 *  jalur tempel diukur dan semuanya mendarat sesuai aturan (di kursor; atau
 *  tengah layar bila kursor tidak diketahui; +30 dari sumber untuk salinan
 *  internal, lalu layar mengikutinya). Yang RAPIH dan dihapus di sini: titik
 *  kursor hanya dicatat oleh `onMouseMove` ELEMEN PAPAN, dan elemen itu pun
 *  dilepas saat sedang menyeret/marque/pan. Kursor di luar papan — di atas
 *  menu konteks, toolbar, atau jendela lain — membuat acuannya basi atau
 *  kosong, dan itu satu-satunya jalur yang tersisa di mana tempel bisa
 *  mengabaikan kursor. Sekarang dicatat di level `window`.
 *
 * Semua test memakai peristiwa pengguna sungguhan: `paste` bawaan peramban,
 * `keydown` di window, `mouseDown` pada bentuk, `change` pada textarea.
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
import { fetchFlowcharts } from "./services/flowchart.service";

const project = { id: "p1", name: "Proyek Uji" } as Project;
const KANVAS = { lebar: 800, tinggi: 600 };

const papanDari = (nodes: unknown[]) => [
  {
    id: "fw1",
    name: "Alur Uji",
    description: "",
    category: "Panduan",
    nodes,
    edges: [],
    theme: "miro",
    createdBy: "u1",
    createdByName: "Administrator",
  },
];

const bentuk = (id: string, x: number, y: number, label: string) =>
  `<mxCell id="${id}" value="${label}" style="rounded=1;" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="140" height="60" as="geometry"/></mxCell>`;

const pagar = (isi: string) =>
  '<mxfile><diagram id="d" name="a"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>' +
  isi +
  "</root></mxGraphModel></diagram></mxfile>";

const htmlDrawio = (xml: string) => {
  const lup = JSON.stringify({ xml })
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return `<div class="mxgraph" data-mxgraph="${lup}"></div>`;
};

const tempelPeramban = (isi: Record<string, string>) => {
  const e = new Event("paste", { bubbles: true, cancelable: true }) as Event & {
    clipboardData?: unknown;
  };
  e.clipboardData = { getData: (jenis: string) => isi[jenis] || "", types: Object.keys(isi) };
  fireEvent(window, e);
};

/** `transform: translate(Xpx, Ypx) scale(Z)` lapisan papan, dibaca dari DOM. */
const lapisan = (container: HTMLElement) => {
  const gaya = Array.from(container.querySelectorAll<HTMLElement>("div"))
    .map((d) => d.getAttribute("style") || "")
    .find((g) => /scale\(/.test(g) && /translate\(/.test(g));
  if (!gaya) throw new Error("lapisan papan (translate+scale) tidak ketemu di DOM");
  const [, px, py, z] = gaya.match(/translate\((-?[\d.]+)px, ?(-?[\d.]+)px\) ?scale\(([\d.]+)\)/)!;
  return { pan: { x: parseFloat(px), y: parseFloat(py) }, zoom: parseFloat(z) };
};

const daftarBentuk = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>('[id^="val-node-"]')).map((el) => ({
    id: el.id,
    x: parseFloat(el.style.left || "0"),
    y: parseFloat(el.style.top || "0"),
    w: parseFloat(el.style.width || "130"),
    h: parseFloat(el.style.height || "70"),
    label: el.querySelector("textarea")?.value ?? "",
  }));

/** Titik tengah sebuah bentuk dalam KOORDINAT LAYAR — yang dilihat pengguna. */
const tengahLayar = (container: HTMLElement, id: string) => {
  const v = lapisan(container);
  const b = daftarBentuk(container).find((s) => s.id === id);
  if (!b) throw new Error(`bentuk ${id} tidak ada di DOM`);
  return { x: v.pan.x + (b.x + b.w / 2) * v.zoom, y: v.pan.y + (b.y + b.h / 2) * v.zoom };
};

const renderView = async (nodes: unknown[] = []) => {
  (fetchFlowcharts as jest.Mock).mockReset().mockResolvedValue(papanDari(nodes));
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

  fireEvent.click((await screen.findAllByText("Alur Uji"))[0]);
  fireEvent.click(await screen.findByText("Diagram Alur", { selector: "button" }));
  await screen.findByTitle(/Snap to Grid|Snapping/i);

  const kanvas = hasil.container.querySelector(".kanvas-papan") as HTMLElement;
  kanvas.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    right: KANVAS.lebar,
    bottom: KANVAS.tinggi,
    width: KANVAS.lebar,
    height: KANVAS.tinggi,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  Object.defineProperty(kanvas, "clientWidth", { value: KANVAS.lebar, configurable: true });
  Object.defineProperty(kanvas, "clientHeight", { value: KANVAS.tinggi, configurable: true });
  return { ...hasil, kanvas };
};

const duaBentuk = [
  {
    id: "n1",
    type: "rect",
    x: 100,
    y: 100,
    label: "Satu",
    color: "indigo",
    width: 140,
    height: 60,
  },
  { id: "n2", type: "rect", x: 400, y: 100, label: "Dua", color: "indigo", width: 140, height: 60 },
];

const satuBentukJauh = [
  {
    id: "j1",
    type: "rect",
    x: 2400,
    y: 2400,
    label: "Sebelah",
    color: "indigo",
    width: 140,
    height: 60,
  },
];

const jeda = () => new Promise((r) => setTimeout(r, 0));

describe("#644 — mengetik di label mengubah bentuk ITU", () => {
  it("bentuk yang tidak terpilih tetap bisa disunting", async () => {
    const { container } = await renderView(duaBentuk);
    await waitFor(() => expect(daftarBentuk(container)).toHaveLength(2));

    const kotak = container.querySelector("#val-node-n2 textarea") as HTMLTextAreaElement;
    if (!kotak) throw new Error("kotak label bentuk kedua tidak ada");
    fireEvent.change(kotak, { target: { value: "Diubah" } });
    await jeda();

    expect(daftarBentuk(container).find((b) => b.id === "val-node-n2")?.label).toBe("Diubah");
  });

  it("seleksi yang dilepas tidak membuat ketikan hilang diam-diam", async () => {
    const { container, kanvas } = await renderView(duaBentuk);
    await waitFor(() => expect(daftarBentuk(container)).toHaveLength(2));

    fireEvent.mouseDown(container.querySelector("#val-node-n1") as Element, { button: 0 });
    fireEvent.mouseDown(kanvas, { clientX: 700, clientY: 520, button: 0 });

    const kotak = container.querySelector("#val-node-n2 textarea") as HTMLTextAreaElement;
    fireEvent.change(kotak, { target: { value: "Lagi" } });
    await jeda();

    expect(daftarBentuk(container).find((b) => b.id === "val-node-n2")?.label).toBe("Lagi");
  });

  it("ketikan tidak mampir ke bentuk lain yang sedang terpilih", async () => {
    const { container } = await renderView(duaBentuk);
    await waitFor(() => expect(daftarBentuk(container)).toHaveLength(2));

    fireEvent.mouseDown(container.querySelector("#val-node-n1") as Element, { button: 0 });
    await jeda();

    const kotak = container.querySelector("#val-node-n2 textarea") as HTMLTextAreaElement;
    fireEvent.change(kotak, { target: { value: "Punya dua" } });
    await jeda();

    const sesudah = daftarBentuk(container);
    expect(sesudah.find((b) => b.id === "val-node-n2")?.label).toBe("Punya dua");
    expect(sesudah.find((b) => b.id === "val-node-n1")?.label).toBe("Satu");
  });

  it("label hasil tempel kelompok bisa langsung disunting tanpa klik pertama", async () => {
    // Inilah keadaan yang dilaporkan: menempel KELOMPOK membuat
    // `selectedNodeId` null (#635), jadi bentuk mana pun yang diklik lalu
    // diketik dulu membuang ketikannya.
    const { container, kanvas } = await renderView();
    fireEvent.mouseMove(kanvas, { clientX: 400, clientY: 300 });
    tempelPeramban({
      "text/html": htmlDrawio(pagar(bentuk("a", 100, 100, "Satu") + bentuk("b", 400, 100, "Dua"))),
    });
    await jeda();

    const hasil = daftarBentuk(container);
    expect(hasil).toHaveLength(2);
    // id DOM bentuk hanya huruf, angka, dan strip — aman sebagai selektor.
    const sasaran = hasil[0].id;
    const kotak = container.querySelector(`#${sasaran} textarea`) as HTMLTextAreaElement;
    fireEvent.change(kotak, { target: { value: "Sunting" } });
    await jeda();

    expect(daftarBentuk(container).find((b) => b.id === sasaran)?.label).toBe("Sunting");
  });
});

describe("#643 — hasil tempel mendarat di kursor, dari jalur mana pun", () => {
  it("peristiwa paste: pusat kelompok duduk di titik kursor", async () => {
    const { container, kanvas } = await renderView();
    fireEvent.mouseMove(kanvas, { clientX: 400, clientY: 300 });

    tempelPeramban({ "text/html": htmlDrawio(pagar(bentuk("a", 200, 1900, "Jauh"))) });
    await jeda();

    const baru = daftarBentuk(container)[0];
    const tengah = tengahLayar(container, baru.id);
    expect(Math.round(tengah.x)).toBeCloseTo(400, 0);
    expect(Math.round(tengah.y)).toBeCloseTo(300, 0);
  });

  it("tanpa kursor sama sekali: mendarat di layar yang terlihat, bukan di luar", async () => {
    const { container } = await renderView();

    tempelPeramban({ "text/html": htmlDrawio(pagar(bentuk("a", 200, 1900, "Jauh"))) });
    await jeda();

    const baru = daftarBentuk(container)[0];
    const tengah = tengahLayar(container, baru.id);
    expect(tengah.x).toBeGreaterThan(0);
    expect(tengah.x).toBeLessThan(KANVAS.lebar);
    expect(tengah.y).toBeGreaterThan(0);
    expect(tengah.y).toBeLessThan(KANVAS.tinggi);
  });

  it("Ctrl+V salinan internal dengan kursor DI LUAR papan tetap mengikuti kursor", async () => {
    // Sebelum #643 satu-satunya pencatat kursor adalah `onMouseMove` ELEMEN
    // PAPAN (FlowchartContainer.tsx:2940), dan ia dilepas selama menyeret /
    // marque / pan. Jadi gerakan di luar papan tidak pernah memperbarui
    // acuannya, dan tempel jatuh ke aturan "+30 dari sumber".
    //
    // `mouseUp` di bawah bukan hiasan: tanpanya `draggingNodeId` masih terisi
    // sehingga `berinteraksi` tetap true dan pendengar jendela SEMENTARA (milik
    // mekanisme seret) yang mencatat kursornya — test ini tidak membuktikan
    // apa-apa tentang perubahan #643. Dengan mouseUp, keadaan kembali santai
    // dan satu-satunya yang tersisa adalah pencatatan di level jendela.
    const { container } = await renderView(satuBentukJauh);
    await waitFor(() => expect(daftarBentuk(container)).toHaveLength(1));

    const bentukAwal = container.querySelector("#val-node-j1") as Element;
    fireEvent.mouseDown(bentukAwal, { button: 0 });
    fireEvent.mouseUp(bentukAwal, { button: 0 });
    await jeda();

    fireEvent.keyDown(window, { ctrlKey: true, key: "c" });
    await jeda();

    const diLuarPapan = document.createElement("div");
    document.body.appendChild(diLuarPapan);
    fireEvent.mouseMove(diLuarPapan, { clientX: 250, clientY: 150 });
    fireEvent.keyDown(window, { ctrlKey: true, key: "v" });
    await jeda();
    diLuarPapan.remove();

    const semua = daftarBentuk(container);
    expect(semua).toHaveLength(2);
    const tengah = tengahLayar(container, semua[1].id);
    expect(tengah.x).toBeCloseTo(250, 0);
    expect(tengah.y).toBeCloseTo(150, 0);
  });
});
