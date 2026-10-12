/**
 * @jest-environment jsdom
 *
 * #562 — satu baris di pohon Timeline: judul + label status berikon, TANPA kode
 * tugas. Permintaan pemilik proyek 28 Sep: "id di buang", "status diganti label
 * sesuai ikon itu, warna dan status ikutin".
 *
 * Yang ikut dikunci di sini: pembuka detail tugas tidak ikut terbuang bersama
 * chip kodenya. Chip itulah satu-satunya jalan membuka modal detail di tampilan
 * pohon, jadi aksinya dipindah ke judul -- dan itu harus tetap terbukti.
 */
import React from "react";
import { render, fireEvent, act, waitFor } from "@testing-library/react";
import { TimelinePanel } from "./TimelinePanel";
import { BAKU } from "../../lib/warnaLabel";

const epic = {
  id: "p-1",
  title: "Onboarding NTB",
  key: "PRJ-6",
  status: "To Do",
  type: "Epic",
  projectId: "proj-1",
} as any;

const tugas = {
  id: "t-1",
  title: "Enhancement homepage",
  key: "WMIR-168",
  status: "In Progress",
  priority: "High",
  type: "Task",
  projectId: "proj-1",
  parentId: "p-1",
} as any;

const setSelectedTaskForDetail = jest.fn();
const setIsTaskDetailModalOpen = jest.fn();

const renderPanel = () =>
  render(
    <TimelinePanel
      tasks={[epic, tugas]}
      selectedProject={{ id: "proj-1", name: "Wondr" } as any}
      updateTaskField={async () => {}}
      setSelectedTaskForDetail={setSelectedTaskForDetail}
      setIsTaskDetailModalOpen={setIsTaskDetailModalOpen}
      currentUser={{ id: "u-1", role: "admin" }}
    />
  );

describe("TimelinePanel — baris pohon tanpa kode tugas (#562)", () => {
  beforeEach(() => {
    setSelectedTaskForDetail.mockClear();
    setIsTaskDetailModalOpen.mockClear();
  });

  it("menampilkan judul dan status, tanpa kode tugas", () => {
    const { container } = renderPanel();
    const teks = container.textContent || "";

    expect(teks).toContain("Enhancement homepage");
    expect(teks).toContain("In Progress");
    expect(teks).not.toContain("WMIR-168");
    expect(teks).not.toContain("PRJ-6");
  });

  it("judul tetap membuka detail tugas, dan barisnya membawa ikon jenisnya", () => {
    const { container } = renderPanel();

    const judul = Array.from(container.querySelectorAll("button")).find((b) =>
      (b.textContent || "").includes("Enhancement homepage")
    ) as HTMLButtonElement;
    expect(judul).toBeTruthy();

    fireEvent.click(judul);
    expect(setSelectedTaskForDetail).toHaveBeenCalledWith(expect.objectContaining({ id: "t-1" }));
    expect(setIsTaskDetailModalOpen).toHaveBeenCalledWith(true);

    // #700 — ikon jenis baris (folder/dokumen) pindah ke KOLOM nama, di luar
    // tombol judul, jadi yang diperiksa barisnya, bukan tombolnya.
    const baris = judul.closest("div")?.parentElement as HTMLElement;
    expect(baris.querySelector("svg")).toBeTruthy();
  });
});

/**
 * #565 dulu mengunci `status  prioritas  nama` dalam SATU tombol, dengan alasan
 * "tidak ada tulisan kepotong" — panelnya yang melebar. #700 (12 Okt, pemilik
 * proyek menunjuk layar acuan berkolom): Roadmap dibaca sebagai tabel, jadi
 * keempatnya kolom sendiri. Kode tugas TETAP tidak tampil (#562).
 *
 * B1 (12 Okt, pemilik proyek menunjuk layar judul terpotong): konsekuensi yang
 * dulu ditarik dari "panel berlebar pasti" — memotong judul dengan `truncate`
 * dan menyimpan teks lengkapnya di `title=` — DICABUT. Yang panjang turun ke
 * baris dua, dan barisnya yang tumbuh. Konsekuensi yang sekarang diterima sadar:
 * 40 px (#608) bukan lagi tinggi SEMUA baris, melainkan LANTAINYA, dan posisi
 * vertikal panah dependensi tidak bisa lagi dihitung `indeks × 40`.
 */
describe("TimelinePanel — empat kolom pohon (#700)", () => {
  const barisTugas = (container: HTMLElement) => {
    const judul = Array.from(container.querySelectorAll("button")).find((b) =>
      (b.textContent || "").includes("Enhancement homepage")
    ) as HTMLElement;
    const kolomNama = judul.parentElement as HTMLElement;
    const baris = kolomNama.parentElement as HTMLElement;
    const chip = Array.from(baris.querySelectorAll("span.label-chip")) as HTMLElement[];
    const tanggal = Array.from(baris.querySelectorAll("span")).find(
      (s) => (s.textContent || "").trim() === "—"
    ) as HTMLElement;
    return { baris, kolomNama, judul, chip, tanggal };
  };

  const mendahului = (a: HTMLElement, b: HTMLElement) =>
    !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

  it("dibaca: nama, lalu status, lalu prioritas, lalu rentang tanggal", () => {
    const { container } = renderPanel();
    const { chip, tanggal } = barisTugas(container);

    expect(chip.map((c) => (c.textContent || "").trim())).toEqual(["In Progress", "High"]);
    expect(tanggal).toBeTruthy();
    expect(mendahului(chip[0], chip[1])).toBe(true);
    expect(mendahului(chip[1], tanggal)).toBe(true);
  });

  it("status dan prioritas duduk di kolomnya sendiri, bukan di dalam tombol judul", () => {
    const { container } = renderPanel();
    const { judul, baris, chip } = barisTugas(container);

    expect(judul.querySelector("span.label-chip")).toBeNull();
    // Kolom status/prioritas adalah anak langsung baris yang sama.
    for (const c of chip) expect(c.parentElement?.parentElement).toBe(baris);
  });

  it("nama tidak dipotong sama sekali: ia wrap, dan `title=` ikut dicabut", () => {
    const { container } = renderPanel();
    const { baris, judul } = barisTugas(container);

    expect(judul.className).not.toContain("truncate");
    expect(judul.className).toContain("break-words");
    // `title=` adalah penambal teks yang HILANG. Tidak ada yang hilang lagi,
    // jadi penambalnya ikut dicabut — kalau ia tinggal, itu tanda `truncate`
    // diam-diam masuk kembali.
    expect(judul.getAttribute("title")).toBeNull();
    expect(baris.className).toContain("w-full");
    expect(baris.className).not.toContain("w-max");
  });

  it("anak tertulis lebih kecil dari induknya, dan ukurannya tidak ditumpuk", () => {
    const { container } = renderPanel();
    const { judul } = barisTugas(container); // t-1 adalah ANAK dari p-1
    const induk = Array.from(container.querySelectorAll("button")).find((b) =>
      (b.textContent || "").includes("Onboarding NTB")
    ) as HTMLElement;

    expect(judul.className).toMatch(/sm:text-\[10px\]/);
    expect(induk.className).toMatch(/sm:text-\[11px\]/);
    // SATU ukuran per elemen. `cn()` di repo ini hanyalah gabung spasi
    // (lib/utils.ts:4), jadi dua `sm:text-[..]` akan dimenangkan oleh urutan
    // stylesheet, bukan oleh niat penulisnya — pelajaran #692.
    expect(judul.className.match(/sm:text-\[\d+px\]/g)).toHaveLength(1);
    expect(induk.className.match(/sm:text-\[\d+px\]/g)).toHaveLength(1);
  });

  it("panel hierarki punya lebar pasti, dengan lantai dan batas", () => {
    const { container } = renderPanel();
    const panel = Array.from(container.querySelectorAll("div")).find(
      (d) => /shrink-0/.test(d.className) && /border-r/.test(d.className)
    ) as HTMLElement;

    expect(panel).toBeTruthy();
    // Tanpa lantai dan batas, satu judul 200 karakter akan memakan papan Gantt —
    // alasan #566 memasang keduanya, dan alasannya tetap berlaku di #700.
    expect(panel.className).toMatch(/w-\[/);
    expect(panel.className).toMatch(/min-w-\[/);
    expect(panel.className).toMatch(/max-w-\[/);
  });

  it("chip prioritas ikut warna labelnya (#564)", () => {
    const { container } = renderPanel();
    const { chip } = barisTugas(container);

    expect(chip[1].className).toContain("label-chip");
    expect(chip[1].style.getPropertyValue("--lbr")).toBe(BAKU.priority.high);
  });
});

/**
 * #700 B1 — tinggi baris diukur dari isinya, bukan dipaku ke satu angka.
 *
 * KENAPA TEST INI ADA. Panel hierarki dan lajur Gantt adalah dua loop render
 * yang terpisah; yang membuat keduanya sejajar baris-per-baris hanyalah angka
 * tinggi yang sama. Begitu satu baris lebih tinggi dari angka itu dan kolom
 * lain tidak ikut, kerusakannya bukan di baris itu saja — SEMUA baris di
 * bawahnya bergeser, dan panah dependensi mulai menunjuk pekerjaan yang salah.
 *
 * jsdom tidak punya `ResizeObserver` dan tidak punya layout: `offsetHeight`
 * selalu 0. Karena itu stub di bawah yang mengirim entrinya, persis seperti
 * browser mengirimkannya setelah layout. Tanpa stub, komponen jatuh ke angka
 * lantainya — perilaku lama yang juga benar, dan itu dijaga test pertama.
 */
describe("TimelinePanel — tinggi baris diukur, bukan dipaku (#700 B1)", () => {
  class PengamatPalsu {
    els = new Set<Element>();
    cb: ResizeObserverCallback;
    constructor(cb: ResizeObserverCallback) {
      this.cb = cb;
      instans.add(this);
    }
    observe(el: Element) {
      this.els.add(el);
    }
    unobserve(el: Element) {
      this.els.delete(el);
    }
    disconnect() {
      this.els.clear();
    }
    kirim() {
      this.cb(
        [...this.els].map((el) => ({ target: el }) as ResizeObserverEntry),
        this as unknown as ResizeObserver
      );
    }
  }

  const asli = global.ResizeObserver;
  const instans = new Set<PengamatPalsu>();

  beforeEach(() => {
    instans.clear();
    global.ResizeObserver = PengamatPalsu as unknown as typeof ResizeObserver;
    // jsdom tidak mengenal `Element.scrollTo`, dan panel ini memanggilnya dari
    // efek auto-scroll 150 ms setelah mount. Test di bawah menunggu satu
    // keredupan, jadi efek itu sempat jalan dan melempar kalau dibiarkan.
    (Element.prototype as unknown as { scrollTo: () => void }).scrollTo = () => {};
  });

  afterEach(() => {
    global.ResizeObserver = asli;
  });

  /** Elemen yang DIAMATI pengukur = baris panel hierarki. Sisanya lajur Gantt. */
  const sepasangBaris = (container: HTMLElement, id: string) => {
    const pengamat = [...instans][0];
    const semua = Array.from(container.querySelectorAll(`[data-row-id="${id}"]`)) as HTMLElement[];
    const panel = semua.find((el) => pengamat?.els.has(el)) as HTMLElement;
    const gantt = semua.find((el) => el !== panel) as HTMLElement;
    return { pengamat, panel, gantt };
  };

  it("hanya panel hierarki yang mengukur dirinya, dan lantainya tetap 40 px (#608)", () => {
    const { container } = renderPanel();
    const { pengamat, panel, gantt } = sepasangBaris(container, "t-1");

    expect(panel).toBeTruthy();
    expect(gantt).toBeTruthy();
    // Dua kolom, SATU pengukur. Kalau lajur Gantt ikut diamati, keduanya akan
    // saling menulis dan tinggi baris tidak pernah berhenti bergerak.
    expect(pengamat?.els.has(panel)).toBe(true);
    expect(pengamat?.els.has(gantt)).toBe(false);
    expect(panel.style.minHeight).toBe("40px");
    expect(gantt.style.minHeight).toBe("");
  });

  it("tanpa hasil ukur, lajur Gantt duduk di angka lantainya — bukan di nol", () => {
    const { container } = renderPanel();
    const { panel, gantt } = sepasangBaris(container, "t-1");

    // Panel menyerahkan tingginya ke isi (`height: auto`) dengan lantai 40 px;
    // lajur Gantt memakai lantai yang sama sampai pengukuran pertama tiba.
    // Kalau lantainya hilang, baris grid jadi 0 px dan seluruh papan naik.
    expect(panel.style.height).toBe("auto");
    expect(gantt.style.height).toBe("40px");
  });

  it("nama yang turun ke baris dua ikut menaikkan lajur Gantt, bukan hanya panelnya", async () => {
    const { container } = renderPanel();
    const { pengamat, panel, gantt } = sepasangBaris(container, "t-1");

    Object.defineProperty(panel, "offsetHeight", { value: 64, configurable: true });
    act(() => {
      pengamat.kirim();
    });

    await waitFor(() => expect(gantt.style.height).toBe("64px"));
    expect(panel.style.height).not.toBe("40px");
  });
});
