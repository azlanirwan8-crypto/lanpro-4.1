/**
 * #589 — tempel alur yang disalin dari APLIKASI LAIN.
 *
 * Keluhan pemilik proyek (30 Sep lalu diulang 02 Okt dengan tangkapan layar
 * toast "The canvas clipboard is empty"): "saya melakukan copy flow dari
 * (miro, drawio) terus paste ke papan flowchart, kenapa tidak bisa ya".
 * Diulang 03 Okt dengan tangkapan layar papan kosong: "ketika saya paste kok ngk
 * ada gambar nya ... tadi saya copy flow yang dari drawio" (#607).
 *
 * #582 memperbaiki salin-tempel DI DALAM papan; yang ini separuh yang lain:
 * clipboard peramban. Isinya adalah tulisan asing, jadi jalur masuknya lewat
 * penyanding yang sama dengan menu Impor dan hanya bentuk yang benar-benar
 * terbaca yang boleh mendarat di papan. Yang tidak terbaca harus berkata
 * tidak terbaca — bukan menambah bentuk kosong, dan bukan diam.
 *
 * CATATAN #607, dan ini sebab tes-nya berubah bentuk: draw.io TIDAK menaruh
 * modelnya di `text/plain`. Ctrl+C menulis `<div class="mxgraph"
 * data-mxgraph="{…xml…}">` di rasa `text/html`, sementara `readText()` hanya
 * melihat teks polos — dan div itu tidak punya teks, jadi yang terbaca kosong.
 * Test di bawah karena itu menembak peristiwa `paste` sungguhan, sama seperti
 * yang dilakukan peramban, bukan lagi `readText`.
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

/**
 * #607 — peramban mengirim isi clipboard lewat peristiwa `paste` dengan SATU
 * RASA PER RASA (`text/html`, `text/plain`, `image/png`…). `readText()` hanya
 * melihat yang terakhir, jadi test menembak peristiwanya, bukan API-nya.
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

/** Persis `<div class="mxgraph" data-mxgraph="…">` yang ditulis draw.io saat Ctrl+C. */
const htmlDrawio = (xml: string) => {
  const json = JSON.stringify({
    highlight: "#0000ff",
    nav: true,
    resize: true,
    "dark-mode": "auto",
    toolbar: "zoom layers tags lightbox",
    edit: "_blank",
    xml,
  });
  const lup = json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return `<div class="mxgraph" style="max-width:100%;border:1px solid transparent;" data-mxgraph="${lup}"></div>`;
};

const geserKursor = (container: Element) =>
  fireEvent.mouseMove(container.querySelector(".kanvas-papan") as HTMLElement, {
    clientX: 620,
    clientY: 320,
  });

describe("FlowchartView — tempel dari clipboard peramban (#589, #607)", () => {
  it("salinan draw.io yang SESUNGGUHNYA dikirim Ctrl+C mendarat sebagai flow", async () => {
    // Inilah bentuk nyata app.diagrams.net: XML duduk di atribut data-mxgraph
    // di dalam rasa text/html. Sebelum #607 hasilnya nol bentuk dan papan tetap
    // kosong — "tadi saya copy flow yang dari drawio, paste kok ngak muncul".
    const container = await bukaPapan();
    expect(jumlahBentuk(container)).toBe(1);
    geserKursor(container);

    tempelPeramban({ "text/html": htmlDrawio(XML_DRAWIO) });

    await waitFor(() => expect(jumlahBentuk(container)).toBe(3));
    expect(jumlahPanah(container)).toBe(1);
    expect(container.textContent).toContain("Verifikasi");
    expect(spyToast(toast.success)).toHaveBeenCalledWith(
      expect.stringMatching(/2 bentuk dan 1 panah|2 shapes and 1 arrows?/i)
    );
  });

  it("Ctrl+V atas salinan draw.io memindahkan bentuk dan panahnya ke papan", async () => {
    readText.mockResolvedValue(XML_DRAWIO);
    const container = await bukaPapan();
    expect(jumlahBentuk(container)).toBe(1);
    geserKursor(container);

    // Peramban juga menempelkan `text/plain` untuk salinan yang sama.
    tempelPeramban({ "text/plain": XML_DRAWIO });

    await waitFor(() => expect(jumlahBentuk(container)).toBe(3));
    expect(jumlahPanah(container)).toBe(1);
    expect(container.textContent).toContain("Verifikasi");
  });

  it("clipboard draw.io yang TER-ENCODE URI ikut terbaca, bukan jadi kotak %3C… (#595)", async () => {
    readText.mockResolvedValue(encodeURIComponent(XML_DRAWIO));
    const container = await bukaPapan();
    expect(jumlahBentuk(container)).toBe(1);
    geserKursor(container);

    tempelPeramban({ "text/plain": encodeURIComponent(XML_DRAWIO) });

    await waitFor(() => expect(jumlahBentuk(container)).toBe(3));
    expect(jumlahPanah(container)).toBe(1);
    expect(container.textContent).toContain("Verifikasi");
    expect(container.textContent).not.toContain("%3C");
  });

  it("clipboard berisi teks biasa tidak menambah apa pun dan mengatakannya", async () => {
    const container = await bukaPapan();
    geserKursor(container);

    tempelPeramban({ "text/plain": "rapatkan jadwal sprint minggu depan ya" });

    await waitFor(() =>
      expect(spyToast(toast.info)).toHaveBeenCalledWith(
        expect.stringMatching(/bukan diagram|not .*diagram/i)
      )
    );
    expect(jumlahBentuk(container)).toBe(1);
    expect(spyToast(toast.success)).not.toHaveBeenCalled();
  });

  it("yang disalin hanya GAMBAR dikatakan begitu, bukan didiamkan (#607)", async () => {
    // draw.io "Copy as Image" -> cuma PNG. Tidak ada yang bisa disunting, dan
    // diam total dulu membuat pengguna mengira fitur ini rusak.
    const container = await bukaPapan();
    const e = tempelPeramban({ "image/png": "" });

    expect(e.defaultPrevented).toBe(true);
    await waitFor(() =>
      expect(spyToast(toast.info)).toHaveBeenCalledWith(
        expect.stringMatching(/hanya GAMBAR|Only an IMAGE/i)
      )
    );
    expect(jumlahBentuk(container)).toBe(1);
  });

  it("peramban yang menolak dibacakan lewat menu klik kanan tetap berkata jujur", async () => {
    readText.mockRejectedValue(new Error("NotAllowedError"));
    const container = await bukaPapan();

    // Jalur menu tidak memicu peristiwa `paste`, jadi ia satu-satunya pemakai
    // navigator.clipboard.readText() yang tersisa.
    fireEvent.contextMenu(container.querySelector(".kanvas-papan") as HTMLElement, {
      clientX: 620,
      clientY: 320,
    });
    fireEvent.click(await screen.findByText(/Tempel di Titik Ini|Paste at This Point/));

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

  it("Ctrl+V tidak lagi membunuh peristiwa paste saat papan tidak punya salinan (#607)", async () => {
    // Inilah pembunuh diam-diamnya: `e.preventDefault()` tanpa syarat pada
    // Ctrl+V membatalkan perintah peramban, jadi peristiwa `paste` TIDAK PERNAH
    // terjadi dan draw.io tidak pernah bisa sampai ke papan sama sekali.
    const container = await bukaPapan();
    geserKursor(container);

    const ketik = fireEvent.keyDown(window, { key: "v", ctrlKey: true });
    expect(ketik).toBe(true); // tidak dicegah -> peramban lanjut membunyikan `paste`

    tempelPeramban({ "text/html": htmlDrawio(XML_DRAWIO) });
    await waitFor(() => expect(jumlahBentuk(container)).toBe(3));
  });

  it("salinan papan sendiri tetap menang dan peristiwa paste dicegah (#582)", async () => {
    const container = await bukaPapan();
    const kanvas = container.querySelector(".kanvas-papan") as HTMLElement;

    // Seleksi lewat marquee, sama seperti test #582: mengklik bentuk saja tidak
    // enough untuk masuk clipboard papan.
    fireEvent.mouseDown(kanvas, { clientX: 20, clientY: 20, button: 0, shiftKey: true });
    fireEvent.mouseMove(window, { clientX: 500, clientY: 300, shiftKey: true });
    fireEvent.mouseUp(window);
    fireEvent.keyDown(window, { key: "c", ctrlKey: true });
    expect(spyToast(toast.success)).toHaveBeenCalled();

    // Sekarang papan punya isi sendiri: Ctrl+V harus memakainya dan MENCEGAH
    // peristiwa `paste`, supaya isi peramban tidak menimpa salinan papan.
    const ketik = fireEvent.keyDown(window, { key: "v", ctrlKey: true });
    expect(ketik).toBe(false);
    await waitFor(() => expect(jumlahBentuk(container)).toBe(2));
  });

  it("menempel di dalam kolom teks tidak merampas paste pengguna", async () => {
    // Peristiwa `paste` dipasang di window; mengetik di textarea dokumen harus
    // tetap menempelkan teks ke textarea itu, bukan menambah bentuk papan.
    const container = await bukaPapan();
    const kolom = document.createElement("textarea");
    document.body.appendChild(kolom);
    kolom.focus();

    const e = tempelPeramban({ "text/plain": XML_DRAWIO });
    expect(e.defaultPrevented).toBe(false);
    expect(jumlahBentuk(container)).toBe(1);
    kolom.remove();
  });
});
