/**
 * #796 — `teksCari`: yang dicari tidak harus sama dengan yang dibaca.
 *
 * KENAPA TEST INI ADA. Pemilik proyek 20 Okt: "linked issue ini kenapa masih
 * ada kode nya, kan saya bilang hanya nama saja tidak pakai issue, cek semua
 * nya di dropdown ny juga ada". Permintaan itu KELIHATANNYA cuma menghapus
 * prefiks, padahal #727 sengaja mempertahankan pencarian lewat kunci saat
 * combobox inline dipensiunkan — aturannya tertulis di `src/lib/labelIndukTugas.ts`
 * ("pemilik proyek yang mengetik PRJ-73 harus menemukan tugasnya"). Karena
 * `StyledDropdown` menyaring pada `label`, menghapus prefiks itu MENURUT
 * DEFINISI membunuh pencarian kunci, dan tidak satu pun test lama yang
 * menyadarinya. Test ini yang membuatnya terdengar.
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { readFileSync } from "fs";
import { join } from "path";
import { StyledDropdown } from "./CommonComponents";
import { carianTautanIsu } from "../../features/flowchart/lib/tautanIsu";

const kotakCari = () => screen.getByPlaceholderText(/Ketik untuk mencari|Type to search/i);

/** Sembilan isu biasa + satu yang dicari, supaya `AMBANG_CARI` (8) terlampaui
 *  tanpa penimpa — jalur yang sama dengan yang dipakai layar Flowchart. */
const ISU = [
  ...Array.from({ length: 9 }, (_, i) => ({
    id: `lain-${i}`,
    label: `Judul lain ${i}`,
  })),
  {
    id: "t73",
    label: "Setting voice nominal",
    teksCari: carianTautanIsu("WMIR-171", "Setting voice nominal"),
  },
];

const pasang = (options = ISU) => {
  render(<StyledDropdown masterData={[]} value="" onChange={jest.fn()} options={options} />);
  fireEvent.click(screen.getByRole("button"));
  return kotakCari();
};

describe("teksCari memisahkan teks cari dari teks tampil (#796)", () => {
  it("mengetik KUNCI menemukan opsi yang labelnya hanya JUDUL", () => {
    const cari = pasang();
    fireEvent.change(cari, { target: { value: "WMIR-171" } });
    const opsi = screen.getAllByRole("option");
    expect(opsi).toHaveLength(1);
    expect(opsi[0].textContent).toContain("Setting voice nominal");
    // Yang dibuktikan di baris berikut justru ketiadaan kuncinya.
    expect(opsi[0].textContent).not.toContain("WMIR-171");
  });

  it("mengetik sebagian JUDUL tetap bekerja walau labelnya tanpa kunci", () => {
    const cari = pasang();
    fireEvent.change(cari, { target: { value: "voice nominal" } });
    expect(screen.getAllByRole("option")).toHaveLength(1);
  });

  it("opsi TANPA teksCari masih disaring lewat label — 91 pemanggil lain tidak tersentuh", () => {
    const cari = pasang();
    fireEvent.change(cari, { target: { value: "Judul lain 3" } });
    const opsi = screen.getAllByRole("option");
    expect(opsi).toHaveLength(1);
    expect(opsi[0].textContent).toContain("Judul lain 3");
  });

  it("pencarian tidak cocok menghasilkan nol opsi, bukan opsi yang tersamar", () => {
    const cari = pasang();
    fireEvent.change(cari, { target: { value: "PRJ-999" } });
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });
});

describe("carianTautanIsu (#796)", () => {
  it("menggabungkan kunci dan judul dengan satu spasi, tanpa prefiks kurung", () => {
    expect(carianTautanIsu("WMIR-165", "Report Settlement")).toBe("WMIR-165 Report Settlement");
  });

  it("isu tanpa kunci tidak menyisakan spasi nyempil di kepala kata", () => {
    expect(carianTautanIsu(undefined, "Tanpa kunci")).toBe("Tanpa kunci");
  });
});

/**
 * Penjaga statis. Yang di bawah ini bukan gaya penulisan — masing-masing adalah
 * satu permukaan yang pemilik proyek sebut "masih ada kodenya", dan satu
 * permukaan yang harus TETAP membawa kunci.
 */
describe("permukaan Flowchart hanya menampilkan judul (#796)", () => {
  const baca = (relatif: string) =>
    readFileSync(join(__dirname, "../../features/flowchart", relatif), "utf8");
  const TABEL = "components/FlowchartDashboard.tsx";
  const KARTU = "components/FlowchartMobileCardView.tsx";
  const MODAL = "components/FlowchartDocumentModal.tsx";
  const SORIR = "lib/sortirAlur.ts";

  it("tidak ada satu pun dari tiga permukaan tampil yang merakit `[kunci] judul`", () => {
    for (const berkas of [TABEL, KARTU, MODAL, SORIR]) {
      expect(baca(berkas)).not.toMatch(/labelTautanIsu/);
      expect(baca(berkas)).not.toMatch(/\[\s*\$\{?\s*\w*\.*key\b/);
    }
  });

  it("chip tabel dan kartu HP membaca judulnya langsung", () => {
    expect(baca(TABEL)).toContain("{linkedIsu.title}");
    // #797 membuat kartu HP memegang TASK-nya, bukan string labelnya, supaya
    // chipnya bisa membuka rincian. Yang tetap harus benar di sini: yang
    // dibaca mata hanyalah judulnya.
    expect(baca(KARTU)).toContain("{isu.title}");
    expect(baca(KARTU)).not.toMatch(/isu\.key/);
  });

  it("label opsi dropdown berisi judul DAN teksCarinya berisi kunci", () => {
    const modal = baca(MODAL);
    expect(modal).toMatch(/label:\s*isu\.title/);
    expect(modal).toMatch(/teksCari:\s*carianTautanIsu\(isu\.key,\s*isu\.title\)/);
  });

  it("kunci sortir kolom linkedIssue adalah judul — seisi dengan yang dibaca di sel", () => {
    expect(baca(SORIR)).toMatch(/isu \? isu\.title : ""/);
  });
});
