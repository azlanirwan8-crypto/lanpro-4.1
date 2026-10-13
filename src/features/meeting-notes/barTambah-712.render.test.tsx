/**
 * #712 — jalur tambah dan laci sunting di RENDER SUNGGUHAN.
 *
 * `barTambah-712.test.ts` membaca sumber dan itu perlu untuk hal yang hanya
 * terbaca dari urutan (baris tambah duduk di luar `tbody`). Yang TIDAK bisa
 * dibuktikan oleh membaca sumber adalah bahwa bentuk barunya benar-benar hidup:
 * komponen yang mount-nya melempar tetap terbaca rapi sebagai teks.
 *
 * Ini juga satu-satunya tempat di papan ini yang membuktikan perilaku yang
 * HILANG bersama krom karangan sendiri. Laci sunting lama tidak memasang
 * pendengar Escape dan tidak mengunci gulir body — keduanya datang gratis dari
 * `Modal`, dan "gratis" baru terbukti kalau ada test yang menekannya.
 */
import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import { BarisCepat, type NilaiCepat } from "./components/BarisCepat";
import { FormDiskusi } from "./components/FormDiskusi";
import type { OpsiJamak } from "./components/PemilihJamak";

jest.mock("react-i18next", () => ({
  // `LanproDatePicker` membaca `i18n.language` untuk memilih nama hari dan
  // bulan, jadi mock yang hanya menyodorkan `t` membuat seluruh baris tambah
  // melempar sebelum sempat ter-render.
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "id" } }),
}));

const KOSONG: NilaiCepat = {
  concern: "",
  keterangan: "",
  tindakanLanjut: "",
  assigneeIds: [],
  tags: [],
  targetDate: "",
  links: [],
  berkas: [],
};

const ANGGOTA: OpsiJamak[] = [
  { id: "u1", label: "Nabila Triana" },
  { id: "u2", label: "AZLAN IRWAN" },
];
const ISU: OpsiJamak[] = [{ id: "i1", label: "Enhancement Onboarding" }];

const pasangBaris = (props: Partial<React.ComponentProps<typeof BarisCepat>> = {}) =>
  render(
    <BarisCepat
      nilai={KOSONG}
      onUbah={() => {}}
      onTambah={() => {}}
      sedangMenyimpan={false}
      opsiPenerima={ANGGOTA}
      opsiIsu={ISU}
      {...props}
    />
  );

describe("#712 — baris tambah", () => {
  it("bukan baris tabel: tidak ada satu pun `<tr>` atau `<td>`", () => {
    const { container } = pasangBaris();
    // Bentuk lamanya `<tr>`, dan itulah sebabnya ia mewarisi gulir horizontal
    // tabel selebar 1.818 px. Kalau ini kembali, `barTambah-712.test.ts` juga
    // merah — yang dijaga di sini adalah ia benar-benar TERPASANG.
    expect(container.querySelector("tr")).toBeNull();
    expect(container.querySelector("td")).toBeNull();
    expect(container.querySelector("#quick-add-concern-desktop")).not.toBeNull();
  });

  it("Concern dan tombol Add duduk di SATU subtree, jadi tidak pernah terpisahkan oleh guliran", () => {
    const { container } = pasangBaris();
    const concern = container.querySelector("#quick-add-concern-desktop") as HTMLElement;
    const tambah = screen.getByTitle("discussion.addPoint");
    // Inti itemnya, dalam satu baris: yang diketik dan yang menyimpan harus
    // berada di dalam wadah yang sama. Di `<tr>` lama keduanya ada di kolom
    // pertama dan terakhir dari tabel 1.818 px.
    let simpul: HTMLElement | null = tambah;
    while (simpul && !simpul.contains(concern)) simpul = simpul.parentElement;
    expect(simpul).not.toBeNull();
  });

  it("Add hanya hidup setelah Concern terisi", () => {
    const onTambah = jest.fn();
    const { container, unmount } = pasangBaris({ onTambah });
    const tambah = screen.getByTitle("discussion.addPoint") as HTMLButtonElement;
    expect(tambah.disabled).toBe(true);
    fireEvent.change(container.querySelector("#quick-add-concern-desktop")!, {
      target: { value: "Terkahir dari Andreas APS" },
    });
    // `onUbah` di atas adalah noop: yang mengetik tidak mengubah nilai, jadi
    // tombolnya memang HARUS tetap mati selama Concern-nya masih kosong.
    expect(tambah.disabled).toBe(true);
    unmount();
    pasangBaris({
      nilai: { ...KOSONG, concern: "sudah terisi" },
      onTambah,
    });
    const kedua = screen.getAllByTitle("discussion.addPoint").pop() as HTMLButtonElement;
    expect(kedua.disabled).toBe(false);
    fireEvent.click(kedua);
    expect(onTambah).toHaveBeenCalled();
  });

  it("tautan dan berkas tersembunyi sampai tombol penghitungnya ditekan (#709 tidak dicabut)", () => {
    const { container } = pasangBaris();
    // Yang dibandingkan adalah PEMBUKA panelnya, bukan baris tautan: dengan
    // daftar kosong `PenyuntingTautan` memang belum menampilkan kotak url.
    expect(screen.queryByText("discussion.tambahTautan")).toBeNull();
    expect(container.querySelector('input[type="file"]')).toBeNull();
    fireEvent.click(screen.getByTitle("discussion.lampiran"));
    expect(screen.getByText("discussion.tambahTautan")).not.toBeNull();
    expect(container.querySelector('input[type="file"]')).not.toBeNull();
  });
});

describe("#712 — laci sunting di atas primitif Modal", () => {
  const pasangLaci = (props: Partial<React.ComponentProps<typeof FormDiskusi>> = {}) =>
    render(
      <FormDiskusi
        form={{ concern: "Terkahir dari Andreas APS" }}
        onUbah={() => {}}
        onSave={() => {}}
        onBatal={() => {}}
        isSaving={false}
        opsiPenerima={ANGGOTA}
        opsiIsu={ISU}
        masterData={[]}
        {...props}
      />
    );

  it("kontennya dipasang lewat Portal ke body, bukan menempel di pohon induk", () => {
    pasangLaci();
    const judul = screen.getByText("discussion.editPoint");
    expect(document.body.contains(judul)).toBe(true);
    // `Modal` memasang Portal; lapisan tutup karangan sendiri tidak, dan karena
    // itu ikut terpotong oleh setiap `overflow` di induknya.
    expect(judul.closest("[data-radix], .fixed")).not.toBeNull();
  });

  it("Escape menutup laci — perilaku yang tidak dimiliki krom lama", () => {
    const onBatal = jest.fn();
    pasangLaci({ onBatal });
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onBatal).toHaveBeenCalled();
  });

  it("gulir body dikunci selama laci terbuka dan dilepas sesudahnya", () => {
    const { unmount } = pasangLaci();
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("unset");
  });

  it("delapan isian papan muncul bersamaan, termasuk tautan dan berkas", () => {
    pasangLaci();
    for (const label of [
      "discussion.concernTopic",
      "discussion.notesLabel",
      "discussion.followUp",
      "discussion.picAssignedTo",
      "discussion.thContextTags",
      "discussion.feature",
      "discussion.targetDate",
      "discussion.tautan",
      "discussion.gambar",
    ]) {
      // `exact: false` karena label Concern membawa tanda wajib isi: teksnya
      // terbaca "discussion.concernTopic *", bukan nama kuncinya saja.
      expect(screen.getAllByText(label, { exact: false }).length).toBeGreaterThan(0);
    }
    // `screen`/`document`, BUKAN `container`: `Modal` memasang Portal ke body,
    // jadi pohon yang dikembalikan `render` memang kosong — dan itu justru
    // bukti kedua bahwa krom karangan sendiri sudah pergi.
    expect(document.querySelectorAll("textarea")).toHaveLength(3);
  });
});
