/**
 * Test render untuk FlowchartView.
 *
 * ALASAN TEST INI ADA: Fase 5 membelah ±2.400 baris JSX. Test render yang sudah
 * ada hanya me-mount AppContainer pada jalur BELUM login, sehingga FlowchartView
 * tidak pernah ikut ter-render — kerusakan di dalamnya tidak akan terdeteksi
 * oleh apa pun kecuali membuka browser dan login.
 *
 * Yang diuji: komponen bisa di-mount pada kedua tampilannya (daftar flowchart
 * dan kanvas editor) tanpa melempar. Bukan perilaku fiturnya. Nilainya ada pada
 * cakupan — pemindahan JSX yang merusak struktur akan gagal di sini.
 */
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import type { Project, Task } from "../../types";

// Lapisan service adalah satu-satunya jalur ke backend (ARCHITECTURE.md §2),
// jadi cukup satu titik ini yang perlu diisolasi agar test tidak menyentuh
// jaringan.
jest.mock("./services/flowchart.service", () => ({
  fetchFlowcharts: jest.fn(),
  createFlowchart: jest.fn(),
  updateFlowchart: jest.fn(),
  deleteFlowchart: jest.fn(),
}));

// html-to-image menyentuh canvas sungguhan yang tidak ada di jsdom, dan hanya
// dipakai saat pengguna menekan Export JPG.
jest.mock("html-to-image", () => ({ toJpeg: jest.fn().mockResolvedValue("") }));

/**
 * Item #142 — anggaran waktu untuk suite ini.
 *
 * Bawaan Jest 5 detik per test. Suite ini me-mount FlowchartContainer — ±3.700
 * baris JSX — sebanyak empat kali. Diukur sendirian: 5,3 detik untuk KESELURUHAN
 * suite, jadi satu mount ±1,3 detik. Di bawah beban (jest menjalankan 70 suite
 * paralel; mesin juga sedang membangun atau menjalankan server dev) satu test
 * bisa melewati 5 detik dan tumbang.
 *
 * Yang tumbang selalu berbeda-beda dan bukan karena asersinya salah — pesannya
 * `Exceeded timeout of 5000 ms`. Peringatan "A worker process has failed to
 * exit gracefully" yang menyertainya ternyata AKIBAT timeout itu, bukan sebab
 * terpisah: test yang diputus di tengah render meninggalkan pekerjaan React
 * menggantung. Dijalankan dengan --detectOpenHandles, baik suite ini sendirian
 * maupun seluruh 71 suite, tidak melaporkan satu pun handle bocor.
 *
 * 30 detik dipilih sebagai ±6x waktu solo seluruh suite: cukup longgar untuk
 * mesin yang sibuk, tetapi tetap berbatas sehingga komponen yang benar-benar
 * menggantung masih gagal alih-alih membeku tanpa akhir.
 */
jest.setTimeout(30_000);

import { FlowchartView } from "./FlowchartContainer";
import {
  fetchFlowcharts,
  createFlowchart,
  updateFlowchart,
  deleteFlowchart,
} from "./services/flowchart.service";

const project = { id: "p1", name: "Proyek Uji" } as Project;

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

describe("FlowchartView", () => {
  // jest.config.cjs memasang `resetMocks: true`, yang menghapus implementasi
  // mock sebelum tiap test. Implementasi karena itu HARUS dipasang di sini,
  // bukan di dalam factory jest.mock di atas — kalau di sana, service akan
  // mengembalikan undefined dan komponen gagal pada `.then()`.
  beforeEach(() => {
    (fetchFlowcharts as jest.Mock).mockResolvedValue([]);
    (createFlowchart as jest.Mock).mockResolvedValue({});
    (updateFlowchart as jest.Mock).mockResolvedValue({});
    (deleteFlowchart as jest.Mock).mockResolvedValue(undefined);
  });

  it("ter-mount tanpa melempar dan tanpa memicu error boundary", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderView()).not.toThrow();

    // React melaporkan kegagalan render lewat console.error, bukan lewat
    // lemparan yang bisa ditangkap di atas. Tanpa pemeriksaan ini, komponen
    // yang crash tetap lolos.
    const renderErrors = errorSpy.mock.calls.filter((call) =>
      String(call[0]).includes("The above error occurred")
    );
    expect(renderErrors).toHaveLength(0);

    errorSpy.mockRestore();
  });

  it("mengambil daftar flowchart milik proyek yang sedang dipilih", async () => {
    renderView();

    await waitFor(() => expect(fetchFlowcharts).toHaveBeenCalledWith("p1"));
  });

  it("menampilkan tampilan daftar, bukan pohon kosong", async () => {
    renderView();

    // Assertion pada isi nyata: "body tidak kosong" akan tetap hijau meski yang
    // ter-render hanya sisa kerangka.
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /Editor Diagram Alur/i })).toBeInTheDocument()
    );
    // #135 — subjudul kini datang dari kamus i18n. Bahasa bawaan aplikasi
    // adalah Indonesia, jadi penandanya ikut Indonesia. Yang dijaga tetap
    // sama: tampilan daftar benar-benar ter-render, bukan sisa kerangka.
    expect(screen.getByText(/Kelola diagram interaktif, alur proses/i)).toBeInTheDocument();
  });

  // Tampilan kanvas adalah bagian yang dibelah pada Fase 5, jadi justru ia yang
  // paling perlu ikut ter-render. Editor menyala ketika sebuah baris flowchart
  // diklik, sehingga daftarnya perlu berisi satu entri.
  it("me-render kanvas editor setelah sebuah flowchart dibuka", async () => {
    (fetchFlowcharts as jest.Mock).mockResolvedValue([
      {
        id: "fw1",
        name: "Alur Onboarding",
        description: JSON.stringify({ nodes: [], edges: [] }),
        createdBy: "Administrator",
        createdAt: "2026-08-01T00:00:00.000Z",
        lastEditedAt: "2026-08-10T00:00:00.000Z",
      },
    ]);

    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    renderView();

    const barisList = await screen.findAllByText("Alur Onboarding");
    fireEvent.click(barisList[0]);

    // Kerangka editor: hanya ada setelah sebuah flowchart dibuka.
    await waitFor(() =>
      expect(screen.getByText(/Kembali ke Daftar Diagram Alur/i)).toBeInTheDocument()
    );
    // #135 — tab dan judul panel kiri sama-sama berbunyi "Daftar Dokumen"
    // karena keduanya menunjuk hal yang sama dan kini memakai satu kunci i18n.
    // Sebelumnya lolos getByText hanya karena yang satu Inggris ("Document
    // List") dan yang lain Indonesia — inkonsistensi yang justru diperbaiki.
    expect(screen.getAllByText(/Daftar Dokumen/i).length).toBeGreaterThan(0);

    // Editor terbuka pada mode dokumen. Kanvasnya — bagian terbesar dari JSX
    // yang dibelah pada fase ini — baru ter-render setelah beralih ke
    // "Diagram Alur" (dulu "Flow Diagram", diterjemahkan di #149), jadi
    // peralihan itu ikut dijalankan di sini.
    // Pemilihnya harus PERSIS: setelah "Flow Diagram" diterjemahkan menjadi
    // "Diagram Alur" (#149), teks itu juga cocok dengan judul halaman
    // "Editor Diagram Alur".
    fireEvent.click(screen.getByText("Diagram Alur", { selector: "button" }));

    await waitFor(() => expect(screen.getByTitle(/Snap to Grid|Snapping/i)).toBeInTheDocument());

    const renderErrors = errorSpy.mock.calls.filter((call) =>
      String(call[0]).includes("The above error occurred")
    );
    expect(renderErrors).toHaveLength(0);

    errorSpy.mockRestore();
  });
});
