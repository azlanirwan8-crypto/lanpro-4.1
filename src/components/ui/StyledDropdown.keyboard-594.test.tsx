/**
 * #594 — StyledDropdown bisa dipakai tanpa mouse.
 *
 * Sebelum ini pemicunya memang sebuah <button> (jadi Enter/Space membukanya lewat
 * klik bawaan), tetapi panel opsinya tidak punya satu pun jalur keyboard: tidak
 * ada panah, tidak ada Escape, dan tidak ada yang menandai opsi mana yang sedang
 * disorot. Pola yang dipakai di sini FOKUS NYATA ke tombol opsi — bukan
 * `aria-activedescendant` — karena percobaan dengan `role="combobox"` menghapus
 * nama aksesibel pemicunya (nama <button> datang dari isinya, role combobox tidak
 * mengambil nama dari konten).
 *
 * Catatan jsdom: menekan Enter pada <button> TIDAK menghasilkan event click di
 * jsdom (itu perilaku peramban sungguhan), jadi tes yang mewakili "Enter memilih"
 * mengirim click dengan `detail: 0` — nilai yang sama dipakai peramban untuk klik
 * hasil papan ketik, dan kode komponen membacanya untuk memutuskan apakah fokus
 * harus dikembalikan ke pemicu.
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { StyledDropdown } from "./CommonComponents";

const PILIHAN = [
  { id: "backlog", label: "Backlog" },
  { id: "sprint-1", label: "Sprint Satu" },
  { id: "sprint-2", label: "Sprint Dua" },
];

/** Pemicu menampilkan label nilainya, jadi namanya = nilai terpilih. */
const pemicu = (nama = "Backlog") => screen.getByRole("button", { name: new RegExp(`^${nama}$`) });
const opsi = (nama: RegExp) => screen.getByRole("option", { name: nama });

const pasang = (lebih: Record<string, unknown> = {}) => {
  const onChange = jest.fn();
  render(
    <form onSubmit={jest.fn()}>
      <StyledDropdown
        masterData={[]}
        value="backlog"
        onChange={onChange}
        options={PILIHAN}
        {...(lebih as object)}
      />
    </form>
  );
  return { onChange };
};

describe("StyledDropdown papan ketik (#594)", () => {
  it("panah bawah membuka daftar dan memindahkan fokus ke opsi terpilih", () => {
    pasang();
    expect(pemicu().getAttribute("aria-expanded")).toBe("false");
    expect(pemicu().getAttribute("aria-haspopup")).toBe("listbox");

    fireEvent.keyDown(pemicu(), { key: "ArrowDown" });

    expect(pemicu().getAttribute("aria-expanded")).toBe("true");
    expect(screen.getAllByRole("option")).toHaveLength(3);
    expect(document.activeElement).toBe(opsi(/Backlog/));
  });

  it("panah naik dari pemicu membuka daftar di opsi terakhir", () => {
    pasang();
    fireEvent.keyDown(pemicu(), { key: "ArrowUp" });
    expect(document.activeElement).toBe(opsi(/Sprint Dua/));
  });

  it("panah berpindah di dalam daftar, Home dan End melompat ke ujung, dan dijepit", () => {
    pasang();
    fireEvent.keyDown(pemicu(), { key: "ArrowDown" });

    fireEvent.keyDown(opsi(/Backlog/), { key: "ArrowDown" });
    expect(document.activeElement).toBe(opsi(/Sprint Satu/));

    fireEvent.keyDown(opsi(/Sprint Satu/), { key: "End" });
    expect(document.activeElement).toBe(opsi(/Sprint Dua/));

    fireEvent.keyDown(opsi(/Sprint Dua/), { key: "ArrowDown" });
    expect(document.activeElement).toBe(opsi(/Sprint Dua/));

    fireEvent.keyDown(opsi(/Sprint Dua/), { key: "Home" });
    expect(document.activeElement).toBe(opsi(/Backlog/));
  });

  it("Enter pada opsi memilih nilainya, menutup daftar, dan mengembalikan fokus ke pemicu", () => {
    const { onChange } = pasang();
    fireEvent.keyDown(pemicu(), { key: "ArrowDown" });
    fireEvent.keyDown(opsi(/Backlog/), { key: "ArrowDown" });

    // Klik dengan detail 0 = klik yang disintesis peramban dari tombol Enter.
    fireEvent.click(opsi(/Sprint Satu/), { detail: 0 });

    expect(onChange).toHaveBeenCalledWith("sprint-1");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(document.activeElement).toBe(pemicu());
  });

  it("Escape menutup daftar tanpa memilih dan fokus kembali ke pemicu", () => {
    const { onChange } = pasang();
    fireEvent.keyDown(pemicu(), { key: "ArrowDown" });
    fireEvent.keyDown(opsi(/Backlog/), { key: "Escape" });

    expect(screen.queryByRole("listbox")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(pemicu());
  });

  it("Escape dari pemicu juga menutup daftar", () => {
    pasang();
    fireEvent.keyDown(pemicu(), { key: "ArrowDown" });
    fireEvent.keyDown(pemicu(), { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("klik mouse tidak merebut fokus ke pemicu setelah memilih", () => {
    const { onChange } = pasang();
    fireEvent.click(pemicu(), { detail: 1 });
    fireEvent.click(opsi(/Sprint Dua/), { detail: 1 });

    expect(onChange).toHaveBeenCalledWith("sprint-2");
    expect(document.activeElement).not.toBe(pemicu());
  });

  it("opsi terpilih ditandai lewat aria-selected", () => {
    pasang({ value: "sprint-2" });
    fireEvent.click(pemicu("Sprint Dua"), { detail: 1 });

    expect(opsi(/Sprint Dua/).getAttribute("aria-selected")).toBe("true");
    expect(opsi(/Backlog/).getAttribute("aria-selected")).toBe("false");
  });

  it("pemicu yang disabled tidak membuka apa pun", () => {
    pasang({ disabled: true });
    fireEvent.keyDown(pemicu(), { key: "ArrowDown" });
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});
