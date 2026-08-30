/**
 * Regression: dropdown di dalam form mengirim form saat diklik.
 * Dilaporkan pemilik proyek 30 Agustus 2026: "klik kategori flowchart langsung
 * ke simpan."
 *
 * Sebabnya satu atribut yang hilang. Sebuah `<button>` tanpa `type` di dalam
 * `<form>` berperilaku sebagai `type="submit"` menurut HTML — jadi membuka
 * daftar pilihan kategori ikut mengirim formnya, dan dialognya tertutup
 * menyimpan sebelum pengguna sempat memilih apa pun.
 *
 * Bukan cuma Flowchart: `StyledDropdown` dipakai di lima form (AddCaseModal,
 * AddSuiteModal, CreateBugTicketModal, FlowchartContainer, QADetailDrawer),
 * jadi seluruhnya punya gejala yang sama.
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { StyledDropdown } from "./CommonComponents";

const PILIHAN = [
  { id: "proses", label: "Proses" },
  { id: "panduan", label: "Panduan" },
];

describe("StyledDropdown di dalam <form>", () => {
  it("tidak mengirim form ketika pemicunya diklik", () => {
    const onSubmit = jest.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <StyledDropdown masterData={[]} value="proses" onChange={jest.fn()} options={PILIHAN} />
      </form>
    );

    fireEvent.click(screen.getByRole("button"));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("tidak mengirim form ketika salah satu pilihan diklik", () => {
    const onSubmit = jest.fn((e: React.FormEvent) => e.preventDefault());
    const onChange = jest.fn();
    render(
      <form onSubmit={onSubmit}>
        <StyledDropdown masterData={[]} value="proses" onChange={onChange} options={PILIHAN} />
      </form>
    );

    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByText("Panduan"));

    expect(onChange).toHaveBeenCalledWith("panduan");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("memberi type=button pada SETIAP tombol yang direndernya", () => {
    // Menjaga langsung atribut penyebabnya, bukan hanya gejalanya: pilihan yang
    // ditambahkan kelak tidak boleh lupa membawa `type`.
    const { baseElement } = render(
      <form>
        <StyledDropdown masterData={[]} value="proses" onChange={jest.fn()} options={PILIHAN} />
      </form>
    );
    fireEvent.click(screen.getByRole("button", { name: /proses/i }));

    const tombol = baseElement.querySelectorAll("button");
    expect(tombol.length).toBeGreaterThan(1);
    tombol.forEach((b) => expect(b.getAttribute("type")).toBe("button"));
  });
});
