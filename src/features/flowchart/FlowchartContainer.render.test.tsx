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

// Item #520 — rute garis adalah pekerjaan termahal di kanvas, jadi ia dipasangi
// spy supaya test bisa membuktikan KAPAN ia boleh dijalankan. Implementasinya
// asli tetap dipakai (jest.config.cjs mereset mock sebelum tiap test, jadi
// implementationsya dipasang ulang di beforeEach).
jest.mock("./lib/routing", () => ({
  ...jest.requireActual("./lib/routing"),
  findSmartRoute: jest.fn(),
}));

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
import { findSmartRoute } from "./lib/routing";

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
    (findSmartRoute as jest.Mock).mockImplementation(
      jest.requireActual("./lib/routing").findSmartRoute
    );
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
    // #424 — subtitle PageHeader dihapus; penanda daftar = toolbar Search+Tambah.
    expect(screen.getByPlaceholderText(/Cari diagram alur berdasarkan judul/i)).toBeInTheDocument();
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

  // Item #519 — isi kanvas harus benar-benar berangkat ke basis data. Sebelum
  // perbaikan, tombol Simpan hanya menulis localStorage lalu membunyikan toast
  // "berhasil menyimpan", sehingga diagram yang baru digambar hilang saat
  // daftar disegarkan dan pemilik proyek tidak pernah melihat satu pun galat.
  it("mengirim isi kanvas ke backend saat tombol Simpan ditekan", async () => {
    const nodes = [
      { id: "n1", type: "rect", x: 10, y: 20, label: "Proses A", color: "indigo" },
      { id: "n2", type: "diamond", x: 200, y: 120, label: "Keputusan", color: "amber" },
    ];
    const edges = [{ id: "e1", fromNodeId: "n1", toNodeId: "n2", label: "ya" }];

    (fetchFlowcharts as jest.Mock).mockResolvedValue([
      {
        id: "fw9",
        name: "Alur Klaim",
        description: "",
        category: "Panduan",
        nodes,
        edges,
        theme: "miro",
        createdBy: "u1",
        createdByName: "Administrator",
      },
    ]);

    renderView();

    const baris = await screen.findAllByText("Alur Klaim");
    fireEvent.click(baris[0]);
    fireEvent.click(await screen.findByText("Diagram Alur", { selector: "button" }));

    const tombolSimpan = await screen.findByTitle(/Simpan seluruh diagram alur/i);
    fireEvent.click(tombolSimpan);

    await waitFor(() =>
      expect(updateFlowchart).toHaveBeenCalledWith(
        "p1",
        "fw9",
        expect.objectContaining({ name: "Alur Klaim", nodes, edges })
      )
    );
  });

  // Setengah kerusakan lagi: saat view di-mount ulang, salinan server dulu
  // MENIMPA state dan cache perangkat (`:1111-1113`). Karena salinan server
  // hanya berisi node seed hasil create, bentuk yang belum sempat terkirim
  // ikut terhapus. Kanvas yang masih menunggu pengiriman harus bertahan.
  it("mempertahankan kanvas yang belum terkirim saat daftar disegarkan dari server", async () => {
    window.localStorage.setItem(
      "lanpro_flowcharts_p1",
      JSON.stringify([
        {
          id: "fw7",
          name: "Alur Belum Terkirim",
          description: "",
          category: "Panduan",
          nodes: [{ id: "n9", type: "rect", x: 5, y: 5, label: "Bentuk Lokal", color: "indigo" }],
          edges: [],
          theme: "miro",
          createdBy: "u1",
          createdByName: "Administrator",
        },
      ])
    );
    window.localStorage.setItem("lanpro_flowcharts_unsynced_p1", JSON.stringify({ fw7: 1 }));

    // Server memulangkan flow yang sama TANPA bentuk — persis kondisi baris
    // hasil create yang hanya berisi node "Mulai".
    (fetchFlowcharts as jest.Mock).mockResolvedValue([
      {
        id: "fw7",
        name: "Alur Belum Terkirim",
        description: "",
        category: "Panduan",
        nodes: [],
        edges: [],
        theme: "miro",
        createdBy: "u1",
        createdByName: "Administrator",
      },
    ]);

    renderView();

    const baris = await screen.findAllByText("Alur Belum Terkirim");
    fireEvent.click(baris[0]);
    fireEvent.click(await screen.findByText("Diagram Alur", { selector: "button" }));

    const bentuk = await screen.findAllByText("Bentuk Lokal");
    expect(bentuk.length).toBeGreaterThan(0);
  });

  // Item #520 — menggerakkan mouse di atas kanvas tanpa menarik koneksi tidak
  // boleh memicu perhitungan ulang rute garis. Dulu setiap event mousemove
  // menyetel state posisi kursor, sehingga seluruh kanvas (dan rute semua
  // garis di dalamnya) dihitung ulang hanya karena pointer bergeser.
  it("tidak menghitung ulang rute garis saat mouse hanya bergerak", async () => {
    (fetchFlowcharts as jest.Mock).mockResolvedValue([
      {
        id: "fw5",
        name: "Alur Rute",
        description: "",
        category: "Panduan",
        nodes: [
          {
            id: "r1",
            type: "rect",
            x: 60,
            y: 80,
            label: "Proses A",
            color: "indigo",
            width: 155,
            height: 70,
          },
          {
            id: "r2",
            type: "rect",
            x: 420,
            y: 260,
            label: "Proses B",
            color: "sky",
            width: 155,
            height: 70,
          },
        ],
        edges: [{ id: "e1", fromNodeId: "r1", toNodeId: "r2", label: "" }],
        theme: "miro",
        createdBy: "u1",
        createdByName: "Administrator",
      },
    ]);

    renderView();

    const baris = await screen.findAllByText("Alur Rute");
    fireEvent.click(baris[0]);
    fireEvent.click(await screen.findByText("Diagram Alur", { selector: "button" }));

    // Garis harus benar-benar terhitung lebih dulu; tanpa ini test bisa hijau
    // karena spy yang memang tidak pernah aktif.
    await waitFor(() => expect(findSmartRoute).toHaveBeenCalled());

    (findSmartRoute as jest.Mock).mockClear();

    fireEvent.mouseMove(await screen.findByDisplayValue("Proses A"));

    expect(findSmartRoute).not.toHaveBeenCalled();
  });

  // Item #528 #529 #530 — rantai penderitanya, bukan satuannya. Test hook dan
  // test lapisan garis membuktikan tiap bagian sendiri; yang ini membuktikan
  // kanvas ASLI memasang listener gulir, klik garis memunculkan bilah gaya,
  // pilihan gaya benar-benar sampai ke backend lewat Simpan, dan tombol layar
  // penuh tidak merobohkan view di peramban tanpa API itu (jsdom tidak punya
  // Element.requestFullscreen — persis kondisi iOS di bawah 16.4).
  it("gulir memzoomkan papan, gaya garis tersimpan ke server, layar penuh tidak crash", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    (fetchFlowcharts as jest.Mock).mockResolvedValue([
      {
        id: "fw5",
        name: "Alur Gaya Garis",
        description: "",
        category: "Panduan",
        nodes: [
          {
            id: "n1",
            type: "rect",
            x: 40,
            y: 40,
            label: "A",
            color: "indigo",
            width: 155,
            height: 70,
          },
          {
            id: "n2",
            type: "rect",
            x: 420,
            y: 40,
            label: "B",
            color: "indigo",
            width: 155,
            height: 70,
          },
        ],
        edges: [{ id: "e1", fromNodeId: "n1", toNodeId: "n2" }],
        theme: "miro",
        createdBy: "u1",
        createdByName: "Administrator",
      },
    ]);

    const { container } = renderView();
    fireEvent.click((await screen.findAllByText("Alur Gaya Garis"))[0]);
    fireEvent.click(await screen.findByText("Diagram Alur", { selector: "button" }));
    await screen.findByTitle(/Snap to Grid|Snapping/i);

    const kanvas = container.querySelector(".grid-dots-light") as Element;
    expect(kanvas).toBeTruthy();
    const persen = () => screen.getByTitle(/Setel Ulang Zoom/i).textContent;
    const sebelum = persen();
    expect(sebelum).toBe("90%");

    fireEvent.wheel(kanvas, { deltaY: -100, clientX: 300, clientY: 200 });
    expect(persen()).not.toBe(sebelum);

    // Klik garis → bilah gaya. Sebelum #528 klik ini hanya mengisi panel kanan.
    const jalur = container.querySelector("path[marker-end]") as Element;
    fireEvent.click(jalur);
    const putus = await screen.findByTitle(/putus-putus|dashed/i);
    fireEvent.click(putus);
    expect(jalur.getAttribute("stroke-dasharray")).toBe("9, 6");

    // Gaya garis harus ikut berangkat ke basis data, bukan cuma ke state lokal.
    fireEvent.click(await screen.findByTitle(/Simpan seluruh diagram alur/i));
    await waitFor(() =>
      expect(updateFlowchart).toHaveBeenCalledWith(
        "p1",
        "fw5",
        expect.objectContaining({
          edges: [expect.objectContaining({ id: "e1", strokeStyle: "dashed" })],
        })
      )
    );

    // Layar penuh di lingkungan tanpa Element.requestFullscreen.
    const penuh = screen.getByTitle(/Layar Penuh|Full screen/i);
    expect(() => fireEvent.click(penuh)).not.toThrow();

    const renderErrors = errorSpy.mock.calls.filter((call) =>
      String(call[0]).includes("The above error occurred")
    );
    expect(renderErrors).toHaveLength(0);
    errorSpy.mockRestore();
  });

  // Item #539 — tombol tema dan snap di bilah atas papan jadi icon-only: namanya
  // tidak lagi ditulis di layar ("Free move" memang keadaan bawaan papan), tapi
  // keduanya tetap punya nama untuk pembaca layar lewat aria-label. Dua hal ini
  // diuji berdampingan justru karena yang satu menghapus teks yang dipakai yang
  // lain untuk mencari tombolnya.
  it("tombol tema dan snap tidak menulis namanya di layar, tapi tetap bernama", async () => {
    (fetchFlowcharts as jest.Mock).mockResolvedValue([
      {
        id: "fw8",
        name: "Alur Ikon Saja",
        description: "",
        category: "Panduan",
        nodes: [],
        edges: [],
        theme: "miro",
        createdBy: "u1",
        createdByName: "Administrator",
      },
    ]);

    renderView();
    fireEvent.click((await screen.findAllByText("Alur Ikon Saja"))[0]);
    fireEvent.click(await screen.findByText("Diagram Alur", { selector: "button" }));
    await screen.findByTitle(/Snap to Grid|Snapping/i);

    // Nama tombol HANYA boleh datang dari aria-label, bukan dari tooltip:
    // `title`-nya kalimat panjang ("Snap to Grid (Saat ini: …)"), jadi pola yang
    // dipagar dua sisi ini merah bila aria-label dilepas — itu justru yang
    // membuat tombol icon-only masih bisa dipakai pembaca layar.
    // Tombol snap menampilkan keadaan berjalan; bawaan papan Snap Grid NYALA
    // (`useFlowchartCanvas.ts:25`), jadi kedua keadaan diterima di sini.
    const snap = screen.getByRole("button", { name: /^snap grid$|^free move$/i });
    expect(snap.textContent).toBe("");

    // #547 — papan tidak punya tombol tema lagi; temanya ikut tema aplikasi.
    expect(
      screen.queryByRole("button", { name: /tema miro|miro theme|ubah tema kanvas/i })
    ).toBeNull();

    // #546 — kartu nama papan di bilah melayang juga hilang: namanya cuma boleh
    // muncul satu kali, di header editor.
    expect(await screen.findAllByText("Alur Ikon Saja")).toHaveLength(1);
  });

  // Item #540 — klik-tahan pada kanvas kosong harus MENGGESER papan. Dulu drag
  // biasa menggambar kerangka seleksi, sehingga papan terasa mati bagi orang yang
  // belum tahu ada tool tangan / spasi. Seleksi kotak tetap ada di Shift+drag.
  it("drag biasa menggeser papan, Shift+drag menggambar seleksi kotak", async () => {
    (fetchFlowcharts as jest.Mock).mockResolvedValue([
      {
        id: "fw6",
        name: "Alur Geser",
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
      },
    ]);

    const { container } = renderView();
    fireEvent.click((await screen.findAllByText("Alur Geser"))[0]);
    fireEvent.click(await screen.findByText("Diagram Alur", { selector: "button" }));
    await screen.findByTitle(/Snap to Grid|Snapping/i);

    const kanvas = container.querySelector(".grid-dots-light") as HTMLElement;
    const kotakSeleksi = () => container.querySelector(".z-\\[100\\]");
    const awal = kanvas.style.backgroundPosition;
    expect(awal).toBe("50px 50px");

    fireEvent.mouseDown(kanvas, { clientX: 300, clientY: 200, button: 0 });
    fireEvent.mouseMove(window, { clientX: 240, clientY: 150 });
    expect(kanvas.style.backgroundPosition).toBe("-10px 0px");
    expect(kotakSeleksi()).toBeNull();
    fireEvent.mouseUp(window);

    // Shift+drag: yang bergerak kotak seleksi, papan dibiarkan diam.
    const sesudahGeser = kanvas.style.backgroundPosition;
    fireEvent.mouseDown(kanvas, { clientX: 300, clientY: 200, button: 0, shiftKey: true });
    fireEvent.mouseMove(window, { clientX: 240, clientY: 150, shiftKey: true });
    expect(kotakSeleksi()).toBeTruthy();
    expect(kanvas.style.backgroundPosition).toBe(sesudahGeser);
    fireEvent.mouseUp(window);
  });

  // Item #546 — titik ungu di ujung garis bantu pernah menempel sendirian di
  // sudut papan: `hoverCoords` tidak pernah direset, dan mode sambung tidak
  // batal oleh klik kosong. Dua-duanya dikunci di sini lewat DOM sungguhan.
  it("garis bantu lahir di bentuk asal dan klik kosong membatalkan mode sambung", async () => {
    (fetchFlowcharts as jest.Mock).mockResolvedValue([
      {
        id: "fw8",
        name: "Alur Sambung",
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
            x: 420,
            y: 60,
            label: "Dua",
            color: "indigo",
            width: 155,
            height: 70,
          },
        ],
        edges: [],
        theme: "miro",
        createdBy: "u1",
        createdByName: "Administrator",
      },
    ]);

    const { container } = renderView();
    fireEvent.click((await screen.findAllByText("Alur Sambung"))[0]);
    fireEvent.click(await screen.findByText("Diagram Alur", { selector: "button" }));
    await screen.findByTitle(/Snap to Grid|Snapping/i);

    const titikUjung = () => container.querySelector("circle.animate-ping");
    expect(titikUjung()).toBeNull();

    // Paku hanya muncul saat bentuk disentuh kursor.
    fireEvent.mouseEnter(container.querySelector('[id="val-node-g1"]') as Element);
    fireEvent.mouseDown(await screen.findByTitle(/sisi atas|from the top/i), {
      clientX: 137,
      clientY: 60,
      button: 0,
    });

    const titik = titikUjung();
    expect(titik).toBeTruthy();
    // Ujungnya duduk di PUSAT bentuk asal (60+155/2, 60+70/2), bukan di posisi
    // kursor sesi sebelumnya.
    expect(Number(titik!.getAttribute("cx"))).toBeCloseTo(137.5, 0);
    expect(Number(titik!.getAttribute("cy"))).toBeCloseTo(95, 0);

    // Klik di kanvas kosong membatalkan mode sambung.
    fireEvent.mouseDown(container.querySelector(".grid-dots-light") as Element, {
      clientX: 900,
      clientY: 500,
      button: 0,
    });
    fireEvent.mouseUp(window);
    expect(titikUjung()).toBeNull();
  });

  // Item #548 — menarik garis dari paku harus menyelesaikan sambungan saat
  // dilepas di atas bentuk lain (selama ini hanya klik-lalu-klik yang jalan, dan
  // klik kedua wajib mengenai paku 14 px).
  it("tarik dari paku lalu lepas di atas bentuk lain menambahkan satu garis", async () => {
    (fetchFlowcharts as jest.Mock).mockResolvedValue([
      {
        id: "fw9b",
        name: "Alur Tarik",
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
            x: 420,
            y: 60,
            label: "Dua",
            color: "indigo",
            width: 155,
            height: 70,
          },
        ],
        edges: [],
        theme: "miro",
        createdBy: "u1",
        createdByName: "Administrator",
      },
    ]);

    const { container } = renderView();
    fireEvent.click((await screen.findAllByText("Alur Tarik"))[0]);
    fireEvent.click(await screen.findByText("Diagram Alur", { selector: "button" }));
    await screen.findByTitle(/Snap to Grid|Snapping/i);

    expect(container.querySelectorAll("path[marker-end]")).toHaveLength(0);

    // Ruang papan -> ruang layar: papan belum digeser (offset 50,50) dan zoom 0,9,
    // sedang jsdom tidak membuat layout sehingga persegi kanvas duduk di 0,0.
    const layar = (x: number, y: number) => ({ clientX: x * 0.9 + 50, clientY: y * 0.9 + 50 });

    fireEvent.mouseEnter(container.querySelector('[id="val-node-g1"]') as Element);
    const paku = await screen.findByTitle(/sisi atas|from the top/i);
    const awal = layar(137, 55);
    fireEvent.mouseDown(paku, { ...awal, button: 0 });

    fireEvent.mouseMove(window, layar(300, 90));
    fireEvent.mouseUp(window, layar(497, 95));

    await waitFor(() => expect(container.querySelectorAll("path[marker-end]")).toHaveLength(1));
    // Mode sambung selesai: titik ujung garis bantu tidak tertinggal.
    expect(container.querySelector("circle.animate-ping")).toBeNull();
  });

  it("melepas tarikan di tempat kosong membatalkan sambungan, tidak menambah garis", async () => {
    (fetchFlowcharts as jest.Mock).mockResolvedValue([
      {
        id: "fw9c",
        name: "Alur Batal",
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
            x: 420,
            y: 60,
            label: "Dua",
            color: "indigo",
            width: 155,
            height: 70,
          },
        ],
        edges: [],
        theme: "miro",
        createdBy: "u1",
        createdByName: "Administrator",
      },
    ]);

    const { container } = renderView();
    fireEvent.click((await screen.findAllByText("Alur Batal"))[0]);
    fireEvent.click(await screen.findByText("Diagram Alur", { selector: "button" }));
    await screen.findByTitle(/Snap to Grid|Snapping/i);

    const layar = (x: number, y: number) => ({ clientX: x * 0.9 + 50, clientY: y * 0.9 + 50 });
    fireEvent.mouseEnter(container.querySelector('[id="val-node-g1"]') as Element);
    const paku = await screen.findByTitle(/sisi atas|from the top/i);
    fireEvent.mouseDown(paku, { ...layar(137, 55), button: 0 });
    fireEvent.mouseMove(window, layar(300, 90));
    fireEvent.mouseUp(window, layar(1500, 1200));

    expect(container.querySelectorAll("path[marker-end]")).toHaveLength(0);
    expect(container.querySelector("circle.animate-ping")).toBeNull();
  });

  // Item #541 — pencarian palet dulu hanya membaca nama/keterangan bentuk, jadi
  // mengetik "bpmn" atau "cloud" tidak menemukan apa pun walaupun judul grupnya
  // persis begitu. Sekarang judul grup ikut dicocokkan.
  it("mencari nama grup menampilkan bentuk di dalam grup itu", async () => {
    (fetchFlowcharts as jest.Mock).mockResolvedValue([
      {
        id: "fw4",
        name: "Alur Palet",
        description: "",
        category: "Panduan",
        nodes: [],
        edges: [],
        theme: "miro",
        createdBy: "u1",
        createdByName: "Administrator",
      },
    ]);

    const { container } = renderView();
    fireEvent.click((await screen.findAllByText("Alur Palet"))[0]);
    fireEvent.click(await screen.findByText("Diagram Alur", { selector: "button" }));
    await screen.findByTitle(/Snap to Grid|Snapping/i);

    fireEvent.click(screen.getByTitle(/koleksi simbol|symbol collection/i));
    const kotakCari = await screen.findByPlaceholderText(/Cari bentuk|Search shapes/i);

    fireEvent.change(kotakCari, { target: { value: "bpmn" } });
    expect(await screen.findByText("Timer Event")).toBeInTheDocument();

    fireEvent.change(kotakCari, { target: { value: "network" } });
    // Judul grup (Cloud & Network) ikut dicocokkan, jadi isinya muncul.
    expect(await screen.findByText("Load Balancer")).toBeInTheDocument();

    // #541 — ukuran lahir: `handleAddNewNode` hanya punya kasus untuk sebagian
    // tipe, jadi tanpa peta UKURAN_BENTUK bentuk baru lahir kotak 140x70 dan
    // lingkaran jadi telur. Event BPMN harus datang sebagai 110x110.
    const kotak = (r: number) =>
      Array.from(container.querySelectorAll("*")).filter(
        (el) => (el as HTMLElement).style?.width === r + "px"
      ).length;
    expect(kotak(110)).toBe(0);

    fireEvent.change(kotakCari, { target: { value: "timer" } });
    fireEvent.click(await screen.findByText("Timer Event"));
    await waitFor(() => expect(kotak(110)).toBeGreaterThan(0));
  });
});
