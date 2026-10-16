/**
 * @jest-environment jsdom
 *
 * #759 — "flow" draw.io: interaksi saat diagramnya DIBUAT, bukan kamus bentuk.
 *
 * Pemilik proyek meminta batas yang terukur: "flow nya harus sama dengan di
 * drawio 90%, jangan berhenti jika belum bisa 90%". Kamus bentuk sudah diukur
 * dan dikunci #755; angka itu tidak berkata apa-apa tentang RASA membuat
 * diagram, dan pertanyaan pemilik proyek justru tentang rasa itu. Berkas ini
 * mengukur dan mengunci sisi yang satunya.
 *
 * EMPAT hal yang diuji di sini rusak sebelum dikerjakan:
 *
 * 1. **Tiga gagang ukuran, bukan delapan.** draw.io memasang gagang pada
 *    keempat sudut DAN keempat tepi bentuk terpilih. Papan ini hanya punya
 *    `e`, `s`, `se` — sisi kiri dan atas tidak bisa ditarik sama sekali, jadi
 *    memperlekan bentuk ke kiri berarti memindahkan bentuk lalu menyusutkannya
 *    balik: dua langkah untuk satu gerakan.
 * 2. **Tidak ada kunci rasio.** Shift+seret sudut di draw.io menjaga proporsi.
 *    Tanpa itu, lingkaran menjadi telur dan persegi menjadi papan saat diperbesar.
 * 3. **Palet tidak bisa diseret, dan bentuk yang diklik mendarat SEMBARANGAN.**
 *    `handleAddNewNode` menambahkan `Math.random() * 40 - 20` pada kedua sumbu,
 *    jadi dua bentuk identik tidak pernah mendarat di titik yang sama. draw.io
 *    menaruh bentuk di titik yang Anda lepaskan, dan titik itu bisa ditebak.
 * 4. **Mata panah tidak bisa dipilih.** #753 membuat 21 kepala panah draw.io
 *    bisa DIGAMBAR, tetapi tidak ada satu pun antarmuka yang menulis
 *    `endArrow`/`startArrow`. Kekayaan yang tidak bisa dipakai sama dengan
 *    tidak ada: diagram ER tetap harus digambar di draw.io lalu diimpor.
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

jest.setTimeout(30_000);

import { FlowchartView } from "./FlowchartContainer";
import { fetchFlowcharts, updateFlowchart } from "./services/flowchart.service";
import { MIME_BENTUK_PALET } from "./constants";
import { ShapePalette } from "./components/ShapePalette";
import { BENTUK_KEPALA } from "./components/kepalaPanah";

const project = { id: "p1", name: "Proyek Uji" } as Project;

const PAPAN = [
  {
    id: "fw9",
    name: "Alur Tujuh Lima Sembilan",
    description: "",
    category: "Panduan",
    nodes: [
      {
        id: "a0",
        type: "rect",
        x: 100,
        y: 100,
        label: "Satu",
        color: "indigo",
        width: 200,
        height: 100,
      },
      {
        id: "a1",
        type: "rect",
        x: 500,
        y: 100,
        label: "Dua",
        color: "blue",
        width: 200,
        height: 100,
      },
      // Sasaran retarget yang jelas berbeda: jauh di bawah, pusatnya (400,450).
      {
        id: "a2",
        type: "rect",
        x: 300,
        y: 400,
        label: "Tiga",
        color: "green",
        width: 200,
        height: 100,
      },
    ],
    edges: [{ id: "e0", fromNodeId: "a0", toNodeId: "a1" }],
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
  fireEvent.click((await screen.findAllByText("Alur Tujuh Lima Sembilan"))[0]);
  fireEvent.click(await screen.findByText("Diagram Alur", { selector: "button" }));
  await screen.findByTitle(/Snap to Grid|Snapping/i);
  return container.querySelector(".kanvas-papan") as HTMLElement;
}

const bentuk = (container: HTMLElement, id: string) =>
  container.querySelector(`[id="val-node-${id}"]`) as HTMLElement;

/** `style.left`/`width` papan ruang kanvas; dibaca sebagai angka piksel. */
const kotak = (container: HTMLElement, id: string) => {
  const s = bentuk(container, id).style;
  return {
    x: parseFloat(s.left),
    y: parseFloat(s.top),
    w: parseFloat(s.width),
    h: parseFloat(s.height),
  };
};

const pilih = (container: HTMLElement, id: string) => {
  const awal = { clientX: 200, clientY: 150 };
  fireEvent.mouseDown(bentuk(container, id), { ...awal, button: 0 });
  fireEvent.mouseUp(window);
};

const gagang = (container: HTMLElement, arah: string) =>
  container.querySelector(`[data-testid="gagang-ukur-${arah}"]`) as HTMLElement;

/** Tiruan `DataTransfer`: jsdom tidak menyediakannya untuk event drag. */
const tiruDataTransfer = (isi: Record<string, string> = {}) => {
  const penyimpanan = { ...isi };
  return {
    types: Object.keys(penyimpanan),
    files: [] as File[],
    effectAllowed: "",
    dropEffect: "",
    getData: (t: string) => penyimpanan[t] ?? "",
    setData: (t: string, v: string) => {
      penyimpanan[t] = v;
    },
  };
};

const dibaca = (dt: ReturnType<typeof tiruDataTransfer>) => dt.getData(MIME_BENTUK_PALET);

beforeEach(() => {
  (fetchFlowcharts as jest.Mock).mockReset().mockResolvedValue(PAPAN);
  (updateFlowchart as jest.Mock).mockReset().mockResolvedValue(null);
});

describe("#759 delapan gagang ukuran, sama seperti draw.io", () => {
  it("bentuk terpilih memasang delapan gagang, satu untuk tiap arah", async () => {
    const { container } = renderView();
    await masukKanvas(container);
    pilih(container, "a0");

    const terpasang = container.querySelectorAll('[data-testid^="gagang-ukur-"]').length;
    expect(terpasang).toBe(8);
    for (const arah of ["nw", "n", "ne", "e", "se", "s", "sw", "w"]) {
      expect(gagang(container, arah)).toBeTruthy();
    }
  });

  it("gagang barat menggeser titik asal DAN lebar: tepi kanan tetap diam", async () => {
    const { container } = renderView();
    await masukKanvas(container);
    pilih(container, "a0");

    const sebelum = kotak(container, "a0");
    expect(sebelum.w).toBeGreaterThan(0);

    // draw.io: pada gagang barat yang bergerak ADALAH sisi kirinya, jadi menarik
    // ke KIRI memperlebar bentuk dan menggeser x ke kiri dengan jumlah yang sama.
    fireEvent.mouseDown(gagang(container, "w"), { clientX: 300, clientY: 200, button: 0 });
    fireEvent.mouseMove(window, { clientX: 220, clientY: 200 });
    fireEvent.mouseUp(window);

    const sesudah = kotak(container, "a0");
    expect(sesudah.w).toBeGreaterThan(sebelum.w);
    expect(sesudah.x).toBeLessThan(sebelum.x);
    expect(sesudah.x + sesudah.w).toBeCloseTo(sebelum.x + sebelum.w, 0);
  });

  it("gagang utara menggeser sumbu y, bukan hanya tingginya", async () => {
    const { container } = renderView();
    await masukKanvas(container);
    pilih(container, "a0");

    const sebelum = kotak(container, "a0");
    fireEvent.mouseDown(gagang(container, "n"), { clientX: 300, clientY: 300, button: 0 });
    fireEvent.mouseMove(window, { clientX: 300, clientY: 220 });
    fireEvent.mouseUp(window);

    const sesudah = kotak(container, "a0");
    expect(sesudah.h).toBeGreaterThan(sebelum.h);
    expect(sesudah.y).toBeLessThan(sebelum.y);
    expect(sesudah.y + sesudah.h).toBeCloseTo(sebelum.y + sebelum.h, 0);
  });

  it("Shift pada gagang sudut mengunci rasio", async () => {
    const { container } = renderView();
    await masukKanvas(container);
    pilih(container, "a0");

    const sebelum = kotak(container, "a0");
    const rasioSemula = sebelum.w / sebelum.h;

    // Tarikan sangat lebar ke kanan dan hampir tidak ada ke bawah. Tanpa kunci
    // rasio hasilnya sekitar 320x110 (rasio 2,9); dengan kunci rasio bentuknya
    // tetap proporsional. Toleransinya longgar karena perlekatan kisi membulatkan
    // tiap sumbu ke kelipatan 20 px — yang diuji di sini kuncinya, bukan kisinya.
    fireEvent.mouseDown(gagang(container, "se"), { clientX: 300, clientY: 200, button: 0 });
    fireEvent.mouseMove(window, { clientX: 420, clientY: 205, shiftKey: true });
    fireEvent.mouseUp(window);

    const sesudah = kotak(container, "a0");
    expect(sesudah.w).toBeGreaterThan(sebelum.w);
    expect(Math.abs(sesudah.w / sesudah.h - rasioSemula)).toBeLessThan(0.4);
  });
});

describe("#759 palet bisa diseret dan mendarat di titik yang ditebak", () => {
  it("item palet ditulis sebagai benda yang bisa diseret, membawa tipenya", () => {
    // Palet dirender sendiri, bukan lewat kanvas: yang diuji di sini adalah
    // SISI TULIS kontrak serah-terima, dan sisi bacanya diuji pada papan
    // sungguhan di test berikutnya.
    const { container } = render(
      <ShapePalette
        isShapeDropdownOpen
        setIsShapeDropdownOpen={jest.fn()}
        selectedAddColor="amber"
        setSelectedAddColor={jest.fn()}
        shapeSearchQuery="rect"
        setShapeSearchQuery={jest.fn()}
        expandedGroups={{}}
        toggleGroupExpanded={jest.fn()}
        handleAddNewNode={jest.fn()}
      />
    );

    const item = container.querySelector("[data-item-palet]") as HTMLElement;
    expect(item).toBeTruthy();
    expect(item.getAttribute("draggable")).toBe("true");

    const dt = tiruDataTransfer();
    fireEvent.dragStart(item, { dataTransfer: dt });
    const muatan = JSON.parse(dibaca(dt) || "{}");
    expect(muatan.type).toBeTruthy();
    expect(muatan.warna).toBe("amber");
  });

  it("dua kali lepas di titik yang sama menghasilkan koordinat yang sama", async () => {
    const { container } = renderView();
    const papan = await masukKanvas(container);

    const sebelum = container.querySelectorAll('[id^="val-node-"]').length;
    const dt = tiruDataTransfer({
      [MIME_BENTUK_PALET]: JSON.stringify({ type: "diamond", nama: "Keputusan", warna: "amber" }),
    });
    fireEvent.drop(papan, { dataTransfer: dt, clientX: 340, clientY: 260 });

    const sesudah = container.querySelectorAll('[id^="val-node-"]').length;
    expect(sesudah).toBe(sebelum + 1);

    const baru = [...container.querySelectorAll('[id^="val-node-"]')].pop() as HTMLElement;
    const pertama = { x: parseFloat(baru.style.left), y: parseFloat(baru.style.top) };

    const dt2 = tiruDataTransfer({
      [MIME_BENTUK_PALET]: JSON.stringify({ type: "diamond", nama: "Keputusan", warna: "amber" }),
    });
    fireEvent.drop(papan, { dataTransfer: dt2, clientX: 340, clientY: 260 });
    const lagi = [...container.querySelectorAll('[id^="val-node-"]')].pop() as HTMLElement;

    // Getaran ±20 px yang dulu ada di jalur klik dibuang, dan jalur seret tidak
    // pernah mengenalnya: titik lepas adalah titik mendarat.
    expect({ x: parseFloat(lagi.style.left), y: parseFloat(lagi.style.top) }).toEqual(pertama);
  });
});

describe("#759 mata panah draw.io bisa dipilih, bukan cuma digambar", () => {
  const semua = BENTUK_KEPALA.filter((k) => k !== "none");

  it("bilah gaya garis membuka pemilih dan memasang delapan belas+ kepala panah dua sisi", async () => {
    const { container } = renderView();
    await masukKanvas(container);

    // Pilih garisnya: path garis pertama di SVG tepi.
    const jalur = container.querySelector(
      '[data-edge-id="e0"] path[stroke="transparent"]'
    ) as SVGElement;
    expect(jalur).toBeTruthy();
    fireEvent.click(jalur);

    const pemilih = screen.getByTestId("tombol-mata-panah");
    fireEvent.click(pemilih);

    const papan = await screen.findByTestId("pemilih-mata-panah");
    // Dua baris (awal + akhir), masing-masing memuat seluruh kosakata draw.io.
    for (const kepala of semua) {
      expect(papan.querySelector(`[data-testid="mata-panah-akhir-${kepala}"]`)).toBeTruthy();
      expect(papan.querySelector(`[data-testid="mata-panah-awal-${kepala}"]`)).toBeTruthy();
    }
    expect(semua.length).toBe(21);
  });

  it("memilih kepala panah akhir mengubah garis yang digambar", async () => {
    const { container } = renderView();
    await masukKanvas(container);

    const jalur = container.querySelector(
      '[data-edge-id="e0"] path[stroke="transparent"]'
    ) as SVGElement;
    fireEvent.click(jalur);

    const pemilih = screen.getByTestId("tombol-mata-panah");
    fireEvent.click(pemilih);
    const papan = await screen.findByTestId("pemilih-mata-panah");

    const gugus = () => container.querySelector('[data-edge-id="e0"]') as SVGGElement;
    const sebelum = gugus().outerHTML;

    fireEvent.click(papan.querySelector('[data-testid="mata-panah-akhir-ermany"]') as HTMLElement);

    // Dua bukti, bukan satu: tombolnya menyala (state papan menerima tambalan)
    // DAN garis yang digambar benar-benar berubah. Yang kedua ini yang penting —
    // tanpa ia, pilihan kepala panah bisa tersimpan tanpa pernah sampai ke
    // perender, dan kegagalan seperti itu tidak terlihat di layar sama sekali.
    // Yang dibandingkan adalah seluruh gugus garis, bukan atribut tertentu:
    // #665 menempatkan sebagian kepala panah sebagai path di DALAM gugusnya
    // sendiri, bukan sebagai `marker-end`, jadi satu selector atribut akan
    // melewatkan separuh kosakata yang justru sedang diuji.
    const terpilih = papan.querySelector(
      '[data-testid="mata-panah-akhir-ermany"]'
    ) as HTMLButtonElement;
    await waitFor(() => {
      expect(terpilih.getAttribute("aria-pressed")).toBe("true");
      expect(gugus().outerHTML).not.toBe(sebelum);
      expect(gugus().outerHTML.toLowerCase()).toContain("ermany");
    });
  });
});

describe("#759 gagang putar draw.io", () => {
  const gagangPutar = (container: HTMLElement) =>
    container.querySelector('[data-testid="gagang-putar"]') as HTMLElement;

  const rotasi = (container: HTMLElement) => {
    // Rotasi dipasang pada Bingkai Bentuk bagian DALAM (`FlowchartNode.tsx:398`,
    // lewat `gayaSumber`), bukan pada pembungkus luarnya: pembungkus itu adalah
    // `motion.div` dan motion menulis `transform`-nya sendiri, sehingga gaya
    // rotasi kita akan tertimpa kalau ditumpuk di elemen yang sama. Membaca
    // elemen luar akan selalu memberi 0 dan terbaca seperti "putar tidak jalan".
    const akar = bentuk(container, "a0");
    const kandidat = [akar, ...Array.from(akar.querySelectorAll("*"))] as HTMLElement[];
    for (const el of kandidat) {
      const cocok = (el.getAttribute("style") || "").match(/rotate\((-?[\d.]+)deg\)/);
      if (cocok) return parseFloat(cocok[1]);
    }
    return 0;
  };

  it("gagang putar muncul di atas bentuk terpilih", async () => {
    const { container } = renderView();
    await masukKanvas(container);
    pilih(container, "a0");
    expect(gagangPutar(container)).toBeTruthy();
  });

  it("menyeret gagang mengubah rotasi bentuknya", async () => {
    const { container } = renderView();
    await masukKanvas(container);
    pilih(container, "a0");
    expect(rotasi(container)).toBe(0);

    fireEvent.mouseDown(gagangPutar(container), { clientX: 200, clientY: 60, button: 0 });
    fireEvent.mouseMove(window, { clientX: 290, clientY: 150 });
    fireEvent.mouseUp(window);

    // Besarnya TIDAK dikunci di sini. Papan dibuka lewat pas-ke-layar, jadi
    // zoom dan pan-nya bergantung ukuran viewport yang di jsdom nol — angka
    // derajatnya tidak bisa dipastikan dari test. Yang diuji adalah bahwa
    // genggaman benar-benar mengubah `rotation`, dan itu yang dulu tidak terjadi.
    expect(rotasi(container)).not.toBe(0);
  });

  it("kembali ke titik genggaman mengembalikan rotasi ke 0", async () => {
    const { container } = renderView();
    await masukKanvas(container);
    pilih(container, "a0");

    // Invariant yang tidak bergantung zoom/pan, dan justru itu yang membedakan
    // "rotasi dihitung dari pusat" dari "rotasi = selisih gerak tetikus": kalau
    // kursor kembali ke tempat ia digenggam, bentuknya harus kembali tegak.
    fireEvent.mouseDown(gagangPutar(container), { clientX: 200, clientY: 60, button: 0 });
    fireEvent.mouseMove(window, { clientX: 290, clientY: 150 });
    expect(rotasi(container)).not.toBe(0);
    fireEvent.mouseMove(window, { clientX: 200, clientY: 60 });
    fireEvent.mouseUp(window);

    expect(rotasi(container)).toBeCloseTo(0, 0);
  });

  it("Shift mengunci hasil ke kelipatan 15 derajat", async () => {
    const { container } = renderView();
    await masukKanvas(container);
    pilih(container, "a0");

    fireEvent.mouseDown(gagangPutar(container), { clientX: 200, clientY: 60, button: 0 });
    fireEvent.mouseMove(window, { clientX: 283, clientY: 121, shiftKey: true });
    fireEvent.mouseUp(window);

    const hasil = rotasi(container);
    // `!== 0` wajib di sini: tanpa itu test ini lolos tanpa melakukan apa-apa,
    // karena 0 juga kelipatan 15.
    expect(hasil).not.toBe(0);
    expect(hasil % 15).toBe(0);
  });
});

describe("#759 ujung panah bisa digenggam dan dipindahkan", () => {
  const gagangUjung = (container: HTMLElement, ujung: string) =>
    container.querySelector(`[data-ujung-garis="${ujung}"]`) as SVGGElement;

  it("garis terpilih memasang dua gagang ujung", async () => {
    const { container } = renderView();
    await masukKanvas(container);
    fireEvent.click(
      container.querySelector('[data-edge-id="e0"] path[stroke="transparent"]') as SVGElement
    );
    expect(gagangUjung(container, "awal")).toBeTruthy();
    expect(gagangUjung(container, "akhir")).toBeTruthy();
  });

  it("melepas gagang akhir di bentuk lain memindah sasarannya", async () => {
    const { container } = renderView();
    await masukKanvas(container);
    const jalur = () =>
      (
        container.querySelector('[data-edge-id="e0"] path[stroke="transparent"]') as SVGPathElement
      ).getAttribute("d") || "";
    fireEvent.click(
      container.querySelector('[data-edge-id="e0"] path[stroke="transparent"]') as SVGElement
    );
    const sebelum = jalur();
    expect(sebelum).toContain("150");

    // a2 duduk jauh di bawah (pusat 400,450). Kalau gagang akhir benar-benar
    // dipindah ke sana, ujung garis tidak lagi berada di tinggi a0/a1 (y=150).
    fireEvent.mouseDown(gagangUjung(container, "akhir"), { clientX: 500, clientY: 150 });
    fireEvent.mouseMove(window, { clientX: 400, clientY: 450 });
    fireEvent.mouseUp(window, { clientX: 400, clientY: 450 });

    const sesudah = jalur();
    expect(sesudah).not.toBe(sebelum);
    expect(parseFloat(sesudah.split(" ").pop() || "0")).toBeGreaterThan(300);
  });

  it("melepas di tempat kosong TIDAK membuang garisnya", async () => {
    const { container } = renderView();
    await masukKanvas(container);
    const sebelum = container.querySelectorAll("[data-edge-id]").length;
    fireEvent.click(
      container.querySelector('[data-edge-id="e0"] path[stroke="transparent"]') as SVGElement
    );

    fireEvent.mouseDown(gagangUjung(container, "akhir"), { clientX: 500, clientY: 150 });
    fireEvent.mouseMove(window, { clientX: 1200, clientY: 900 });
    fireEvent.mouseUp(window, { clientX: 1200, clientY: 900 });

    // Membuang garis karena jari meleset adalah kerusakan yang lebih besar
    // daripada tidak memindahkan apa pun.
    expect(container.querySelectorAll("[data-edge-id]").length).toBe(sebelum);
  });
});

describe("#759 ekspor PNG dan SVG memakai jalur potret yang sama", () => {
  it("tombol PNG dan ada di bilah, dan keduanya benar-benar memotret", async () => {
    const { container } = renderView();
    await masukKanvas(container);

    const png = container.querySelector('[data-testid="ekspor-png"]') as HTMLElement;
    const svg = container.querySelector('[data-testid="ekspor-svg"]') as HTMLElement;
    expect(png).toBeTruthy();
    expect(svg).toBeTruthy();

    const mod = await import("html-to-image");
    fireEvent.click(png);
    await waitFor(() => expect(mod.toPng).toHaveBeenCalled());
    fireEvent.click(svg);
    await waitFor(() => expect(mod.toSvg).toHaveBeenCalled());

    // Yang disaring adalah subtree papan, jadi filter buang-chrome (#537) juga
    // harus ikut ke PNG dan SVG — kalau tidak, kedua format baru itu memotret
    // bilah gaya yang sedang terbuka, kegagalan yang sudah pernah diperbaiki.
    const opsi = (mod.toPng as jest.Mock).mock.calls[0][1];
    expect(typeof opsi.filter).toBe("function");
  });
});
