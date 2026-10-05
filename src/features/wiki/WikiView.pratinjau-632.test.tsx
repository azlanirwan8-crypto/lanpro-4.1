/**
 * @jest-environment jsdom
 */
/**
 * #632 — panel "Pratinjau Dokumen Utama" tidak boleh jadi jalan buntu.
 *
 * MENGAPA TEST INI ADA. Untuk dokumen bertautan, yang dipasang sebelumnya HANYA
 * sebuah <iframe>. Kalau Google menolak dibingkai — berkas tidak dibagi publik,
 * atau sesi Google tidak ikut ke dalam iframe lintas-asal — yang tampil adalah
 * halaman abu-abu "This content is blocked" milik Google, tanpa tautan yang bisa
 * diklik atau disalin, dan tanpa satu pun keterangan. Penolakan itu TIDAK BISA
 * dideteksi dari sisi kita: `onLoad` tetap terpicu untuk dokumen lintas-asal dan
 * isinya tidak terbaca. Jadi yang dikunci di sini bukan deteksinya, tapi
 * jaminannya: tautan selalu ada, dan frame tetap dipasang.
 *
 * Butir dua yang ikut dikunci: `sandbox="allow-scripts allow-same-origin ..."`
 * dicabut. Kombinasi itu justru mengizinkan dokumen di dalamnya melepas
 * sandbox-nya sendiri, jadi ia bukan pagar keamanan — hanya variabel yang bisa
 * membuat sematan Google ditolak. `referrerPolicy` turun dari `no-referrer` ke
 * `origin`: permintaan dari tab biasa juga tidak mengirim referrer penuh, jadi
 * nilai lama tidak meniru "Open in new tab" yang justru berhasil.
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

jest.mock("../../lib/moduleDataCache", () => ({
  peekProjectDocuments: jest.fn(),
  loadProjectDocuments: jest.fn(),
  writeProjectDocuments: jest.fn(),
}));
jest.mock("./services/wiki.service", () => ({
  resolveUserId: () => "u1",
  createDocument: jest.fn(),
  updateDocument: jest.fn(),
  deleteDocument: jest.fn(),
  downloadDocument: jest.fn(),
  cekSematBisa: jest.fn(),
}));
jest.mock("../../contexts/MobileActionContext", () => ({
  useMobileAction: () => ({
    registerAction: jest.fn(),
    unregisterAction: jest.fn(),
  }),
}));

import { WikiView } from "./WikiView";
import { peekProjectDocuments, loadProjectDocuments } from "../../lib/moduleDataCache";
import { cekSematBisa } from "./services/wiki.service";

const TAUTAN = "https://docs.google.com/spreadsheets/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ/edit#gid=123";
const SEMATAN =
  "https://docs.google.com/spreadsheets/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ/preview#gid=123";

const DOKUMEN = [
  {
    id: "d1",
    projectId: "p1",
    title: "Error List Wondr Merchant",
    description: "",
    type: "BRD",
    link: TAUTAN,
    fileName: "",
    fileType: "",
    createdBy: "u1",
    createdAt: "2026-10-02",
    updatedAt: "2026-10-02",
  },
];

const renderView = () =>
  render(
    <WikiView
      projectId="p1"
      users={[]}
      currentUser={{ id: "u1", name: "Administrator", role: "admin" } as never}
      userRole="admin"
      permissions={{ document: { view: true, create: true, edit: true, delete: true } } as never}
    />
  );

async function bukaDokumen() {
  renderView();
  const judul = await screen.findAllByText("Error List Wondr Merchant");
  fireEvent.click(judul[0]);
}

beforeEach(() => {
  (peekProjectDocuments as jest.Mock).mockReturnValue(DOKUMEN);
  (loadProjectDocuments as jest.Mock).mockResolvedValue({ data: DOKUMEN });
  (cekSematBisa as jest.Mock).mockReset().mockResolvedValue({ bisa: true, sebab: "publik" });
});

describe("kartu tautan di atas sematan (#632)", () => {
  it("tautan asli SELALU tampil, dalam bentuk yang bisa diklik dan disalin", async () => {
    await bukaDokumen();

    const tautan = await screen.findByTestId("pratinjau-tautan");
    expect(tautan.getAttribute("href")).toBe(TAUTAN);
    expect(tautan.textContent).toBe(TAUTAN);
    expect(tautan.getAttribute("target")).toBe("_blank");
    expect(tautan.getAttribute("rel")).toContain("noopener");
  });

  it("frame tetap dipasang, memakai bentuk sematan bukan bentuk editor", async () => {
    await bukaDokumen();
    await screen.findByTestId("pratinjau-tautan");

    const frame = document.querySelector("iframe") as HTMLIFrameElement;
    expect(frame).toBeTruthy();
    expect(frame.getAttribute("src")).toBe(SEMATAN);
    expect(frame.getAttribute("src")).not.toContain("/edit");
  });

  it("sandbox dicabut dan referrerPolicy tidak lagi no-referrer", async () => {
    await bukaDokumen();
    await screen.findByTestId("pratinjau-tautan");

    const frame = document.querySelector("iframe") as HTMLIFrameElement;
    expect(frame.getAttribute("sandbox")).toBeNull();
    expect(frame.getAttribute("referrerpolicy")).toBe("origin");
  });
});

describe("bingkai hanya dipasang kalau memang bisa (#633)", () => {
  it("berkas tertutup: TIDAK ada iframe, yang ada keterangan kita sendiri", async () => {
    (cekSematBisa as jest.Mock).mockResolvedValue({ bisa: false, sebab: "butuh-akses" });
    await bukaDokumen();

    expect(await screen.findByTestId("pratinjau-tertutup")).toBeTruthy();
    expect(document.querySelector("iframe")).toBeNull();
    // Jalan keluarnya tetap ada di layar, bukan halaman abu-abu milik Google.
    const tautan = await screen.findByTestId("pratinjau-tautan");
    expect(tautan.getAttribute("href")).toBe(TAUTAN);
  });

  it("berkas publik: iframe dipasang setelah ujian selesai", async () => {
    await bukaDokumen();
    await screen.findByTestId("pratinjau-tautan");

    await waitFor(() => expect(document.querySelector("iframe")).toBeTruthy());
    expect(screen.queryByTestId("pratinjau-tertutup")).toBeNull();
  });

  it("yang ditanyakan adalah bentuk sematan, dan ia ditanya SATU kali per dokumen", async () => {
    await bukaDokumen();
    await screen.findByTestId("pratinjau-tautan");

    await waitFor(() => expect(cekSematBisa).toHaveBeenCalled());
    expect((cekSematBisa as jest.Mock).mock.calls[0][2]).toBe(SEMATAN);
    expect((cekSematBisa as jest.Mock).mock.calls.length).toBe(1);
  });
});

describe("SharePoint langsung dibingkai lewat penampil Office (#634)", () => {
  const SHAREPOINT =
    "https://bankbnitbk.sharepoint.com/:x:/s/RetailChannelService/IQCu8HIAFrnvR7O4FPQ-vURAbayHtk4L?e=Ab1c2D";

  beforeEach(() => {
    (peekProjectDocuments as jest.Mock).mockReturnValue([
      { ...DOKUMEN[0], link: SHAREPOINT, title: "Error List SharePoint" },
    ]);
    (loadProjectDocuments as jest.Mock).mockResolvedValue({
      data: [{ ...DOKUMEN[0], link: SHAREPOINT, title: "Error List SharePoint" }],
    });
  });

  it("iframe memakai view.officeapps.live.com, bukan tautan SharePoint mentah", async () => {
    renderView();
    const judul = await screen.findAllByText("Error List SharePoint");
    fireEvent.click(judul[0]);

    await waitFor(() => expect(document.querySelector("iframe")).toBeTruthy());
    const frame = document.querySelector("iframe") as HTMLIFrameElement;
    expect(frame.getAttribute("src")).toBe(
      `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(SHAREPOINT)}`
    );
  });

  it("tidak ditanyakan ke server: penampil Office menjawab 200 walau berkasnya tertolak", async () => {
    renderView();
    const judul = await screen.findAllByText("Error List SharePoint");
    fireEvent.click(judul[0]);

    await waitFor(() => expect(document.querySelector("iframe")).toBeTruthy());
    expect(cekSematBisa).not.toHaveBeenCalled();
  });

  it("tombol 'Buka di Tab Baru' tidak lagi dobel di baris tautan", async () => {
    renderView();
    const judul = await screen.findAllByText("Error List SharePoint");
    fireEvent.click(judul[0]);
    await screen.findByTestId("pratinjau-tautan");

    const buka = screen.getAllByText(/Open in New Tab|Buka di Tab Baru/i);
    expect(buka).toHaveLength(1);
  });
});
