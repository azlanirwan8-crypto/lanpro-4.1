/**
 * #727 — pencarian di dalam `StyledDropdown`.
 *
 * KENAPA TEST INI ADA. Pemilik proyek 13 Okt: "dropdown nya tidak ada search
 * cek lagi untuk semua dropdown yang banyak begini harus ada search nya agar
 * gampang". Akar masalahnya bukan satu layar: `StyledDropdown` adalah SATU
 * primitif di balik 92 pemanggilan dan ia tidak punya pencarian sama sekali,
 * jadi perbaikannya harus di sini, bukan di pemanggilnya.
 *
 * Tiga hal yang dikunci di bawah ini dan TIDAK boleh regress:
 *  - daftar PENDEK tetap tanpa kotak cari — dan dengan itu kedua test penjaga
 *    lama (#594 papan ketik, #268b nama aksesibel) tetap berada di jalur lama
 *    tanpa diubah satu baris pun;
 *  - papan ketik #594 bekerja di atas daftar TERSARING, bukan daftar penuh —
 *    sorotan yang jatuh ke opsi yang tidak kelihatan adalah bug yang lebih
 *    halus dari tidak ada pencarian sama sekali;
 *  - nilai terpilih tidak pernah "hilang" hanya karena tidak cocok dengan
 *    kata yang diketik: yang disaring tampilan, bukan kebenarannya.
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { StyledDropdown } from "./CommonComponents";
import { readFileSync } from "fs";
import { join } from "path";

const PENDEK = [
  { id: "backlog", label: "Backlog" },
  { id: "sprint-1", label: "Sprint Satu" },
  { id: "sprint-2", label: "Sprint Dua" },
];

const PANJANG = [
  "Epic",
  "Story",
  "Task",
  "Bug",
  "Sub Bug",
  "Sub-task",
  "Research",
  "Deployment",
  "Review",
  "Release",
].map((label, i) => ({ id: `t${i}`, label }));

const kotakCari = () => screen.getByPlaceholderText(/Ketik untuk mencari|Type to search/i);
const buka = (lebih: Record<string, unknown> = {}) =>
  render(
    <StyledDropdown
      masterData={[]}
      value=""
      onChange={jest.fn()}
      options={PANJANG}
      {...(lebih as object)}
    />
  );

describe("ambang pencarian (#727)", () => {
  it("daftar pendek TIDAK mendapat kotak cari", () => {
    render(
      <StyledDropdown masterData={[]} value="backlog" onChange={jest.fn()} options={PENDEK} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Backlog" }));
    expect(screen.queryByPlaceholderText(/Ketik untuk mencari|Type to search/i)).toBeNull();
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("daftar panjang mendapat kotak cari begitu dibuka", () => {
    buka();
    fireEvent.click(screen.getByRole("button"));
    expect(kotakCari()).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(10);
  });

  it("prop penimpa: mati paksa di daftar panjang, hidup paksa di daftar pendek", () => {
    const { unmount } = buka({ cari: false });
    fireEvent.click(screen.getByRole("button"));
    expect(screen.queryByPlaceholderText(/Ketik untuk mencari|Type to search/i)).toBeNull();
    unmount();

    render(
      <StyledDropdown masterData={[]} value="backlog" onChange={jest.fn()} options={PENDEK} cari />
    );
    fireEvent.click(screen.getByRole("button", { name: "Backlog" }));
    expect(kotakCari()).toBeInTheDocument();
  });
});

describe("penyaringan (#727)", () => {
  it("menyaring opsi dan memulihkannya saat kata dihapus", () => {
    buka();
    fireEvent.click(screen.getByRole("button"));
    fireEvent.change(kotakCari(), { target: { value: "sub" } });
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      expect.stringContaining("Sub Bug"),
      expect.stringContaining("Sub-task"),
    ]);
    fireEvent.change(kotakCari(), { target: { value: "" } });
    expect(screen.getAllByRole("option")).toHaveLength(10);
  });

  it("mengabaikan huruf besar/kecil DAN spasi: 'sub bug' menemukan 'Sub Bug'", () => {
    buka();
    fireEvent.click(screen.getByRole("button"));
    fireEvent.change(kotakCari(), { target: { value: "sub bug" } });
    const opsi = screen.getAllByRole("option");
    expect(opsi).toHaveLength(1);
    expect(opsi[0].textContent).toContain("Sub Bug");
  });

  it("tanpa kecocokan menampilkan baris penjelasan, bukan panel hening", () => {
    buka();
    fireEvent.click(screen.getByRole("button"));
    fireEvent.change(kotakCari(), { target: { value: "zzz tidak ada" } });
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(
      screen.getByText(/Tidak ada pilihan yang cocok|No matching options/i)
    ).toBeInTheDocument();
  });

  it("memilih dari daftar tersaring memanggil onChange dengan id yang benar", () => {
    const onChange = jest.fn();
    buka({ onChange });
    fireEvent.click(screen.getByRole("button"));
    fireEvent.change(kotakCari(), { target: { value: "review" } });
    fireEvent.click(screen.getByRole("option"));
    expect(onChange).toHaveBeenCalledWith("t8");
  });
});

describe("papan ketik di atas daftar tersaring (#594 + #727)", () => {
  const renderPanjang = () => {
    render(<StyledDropdown masterData={[]} value="" onChange={jest.fn()} options={PANJANG} />);
    fireEvent.click(screen.getByRole("button"));
    return kotakCari();
  };

  it("ArrowDown dari kotak cari memfokus opsi TERLIHAT pertama", () => {
    const cari = renderPanjang();
    fireEvent.change(cari, { target: { value: "sub" } });
    fireEvent.keyDown(cari, { key: "ArrowDown" });
    expect(document.activeElement?.textContent).toContain("Sub Bug");
  });

  it("panah berikutnya berjalan di daftar tersaring, tidak melompat ke opsi tersembunyi", () => {
    const cari = renderPanjang();
    fireEvent.change(cari, { target: { value: "sub" } });
    fireEvent.keyDown(cari, { key: "ArrowDown" });
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: "ArrowDown" });
    expect(document.activeElement?.textContent).toContain("Sub-task");
  });

  it("Escape dari kotak cari menutup dan mengembalikan fokus ke pemicu", () => {
    const cari = renderPanjang();
    fireEvent.keyDown(cari, { key: "Escape" });
    expect(screen.queryByPlaceholderText(/Ketik untuk mencari|Type to search/i)).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button"));
  });
});

describe("kontrak lama tetap terjaga (#268b + pensiun combobox inline)", () => {
  it("nama aksesibel pemicu tidak berubah walau pencarian hidup", () => {
    render(<StyledDropdown masterData={[]} value="t4" onChange={jest.fn()} options={PANJANG} />);
    expect(screen.getByRole("button", { name: "Sub Bug" })).toBeInTheDocument();
  });

  it("CreateBugTicketModal tidak lagi menyimpan combobox bercari sendiri", () => {
    const s = readFileSync(join(__dirname, "../modals/CreateBugTicketModal.tsx"), "utf8");
    // Warna keras dan `truncate` pada data adalah dua pelanggaran yang membuat
    // combobox inline itu tidak boleh dijadikan contoh (#564, #645).
    expect(s).not.toMatch(/bg-rose-500\/10/);
    expect(s).not.toMatch(/isDropdownOpen/);
    expect(s).toMatch(/<StyledDropdown/);
    // State pencarian kini milik primitif, bukan milik modal maupun kontainer.
    expect(s).not.toMatch(/parentSearchTerm|onSearchTermChange/);
  });
});
