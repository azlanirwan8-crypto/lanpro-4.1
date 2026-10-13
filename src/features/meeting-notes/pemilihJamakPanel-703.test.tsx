/**
 * #703 — panel `PemilihJamak` dan dua cacat yang ditangkap pemilik proyek dari
 * tangkapan layar Meeting Notes 12 Okt malam: kotak cari di dalam dropdown
 * terbelah oleh tepi bawah wadahnya, dan baris cepat tidak lurus dengan kepala
 * tabel. Yang kedua dikunci oleh `diskusiJamak-703.test.tsx`; berkas ini mengunci
 * yang pertama dengan RENDER SUNGGUHAN, karena "terpotong" adalah perilaku tata
 * letak dan tidak bisa dibuktikan dengan membaca sumber.
 *
 * Wadah penampungnya ditiru apa adanya: `DiscussionPointsTable.tsx` membungkus
 * tabelnya dengan `overflow-x-auto`, dan `ResponsiveTable.tsx` menambahkan satu
 * lagi. CSS melipat `overflow-y: visible` menjadi `auto` begitu sumbu satunya
 * `auto`, jadi panel yang menempel di DOM sel PASTI terpotong — satu-satunya
 * jalan keluar yang sudah dipakai repo ini adalah portal, dan itu yang dilakukan
 * `LanproDatePicker` pada kontrol di baris yang sama.
 */
import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { PemilihJamak } from "./components/PemilihJamak";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const OPSI = [
  { id: "t1", label: "Onboarding EDC" },
  { id: "t2", label: "Gagal sync" },
];

/** Peniru wadah tabel: bisa digulir, jadi memotong apa pun yang menempel di dalamnya. */
const WADAH = "overflow-x-auto";

const panel = () => document.querySelector("[data-pemilih-jamak]") as HTMLElement | null;

const kotak = (top: number, bottom: number) => () => ({
  top,
  left: 40,
  bottom,
  right: 280,
  width: 240,
  height: 28,
  x: 40,
  y: top,
  toJSON: () => ({}),
});

/** Render di dalam tiruan tabel, lalu buka panelnya. */
function pasang(props: Partial<React.ComponentProps<typeof PemilihJamak>> = {}) {
  const hasil = render(
    <div className={WADAH}>
      <table>
        <tbody>
          <tr>
            <td>
              <PemilihJamak
                nilai={[]}
                opsi={OPSI}
                onChange={() => {}}
                kosong="belumAdaTag"
                cari="cariIsu"
                {...props}
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
  const pemicu = hasil.container.querySelector("button") as HTMLButtonElement;
  return { ...hasil, pemicu };
}

describe("#703 — panel pemilih jamak tidak terpotong wadahnya", () => {
  it("panelnya anak document.body, bukan anak sel tabel", () => {
    const { pemicu, container } = pasang();
    fireEvent.click(pemicu);
    const hidup = panel();

    expect(hidup).not.toBeNull();
    expect(hidup!.parentElement).toBe(document.body);
    // Selama panel masih menempel di dalam wadah yang bisa digulir, ia terpotong.
    expect(container.querySelector("[data-pemilih-jamak]")).toBeNull();
  });

  it("dipasang dengan position fixed di bawah pemicunya", () => {
    const { pemicu } = pasang();
    pemicu.getBoundingClientRect = kotak(120, 148);
    fireEvent.click(pemicu);
    const gaya = panel()!.style;

    expect(gaya.position).toBe("fixed");
    expect(gaya.top).toBe("152px");
    expect(gaya.left).toBe("40px");
    expect(gaya.bottom).toBe("");
  });

  it("berbalik ke atas saat ruang di bawah habis", () => {
    const tinggiAsli = window.innerHeight;
    Object.defineProperty(window, "innerHeight", {
      value: 720,
      writable: true,
      configurable: true,
    });
    const { pemicu } = pasang();
    pemicu.getBoundingClientRect = kotak(660, 688);
    fireEvent.click(pemicu);
    const gaya = panel()!.style;

    expect(gaya.bottom).toBe("64px");
    expect(gaya.top).toBe("");
    Object.defineProperty(window, "innerHeight", {
      value: tinggiAsli,
      writable: true,
      configurable: true,
    });
  });

  it("klik di dalam panel tidak menutupnya sebelum opsi terpilih", () => {
    const ubah = jest.fn();
    const { pemicu } = pasang({ onChange: ubah });
    fireEvent.click(pemicu);

    const opsi = Array.from(panel()!.querySelectorAll("button")).find((b) =>
      (b.textContent || "").includes("Onboarding EDC")
    ) as HTMLElement;
    fireEvent.click(opsi);

    expect(ubah).toHaveBeenCalledWith(["t1"]);
    expect(panel()).not.toBeNull();
  });

  it("klik di luar panel menutupnya", () => {
    const { pemicu } = pasang();
    fireEvent.click(pemicu);
    expect(panel()).not.toBeNull();

    fireEvent.mouseDown(document.body);
    expect(panel()).toBeNull();
  });
});
