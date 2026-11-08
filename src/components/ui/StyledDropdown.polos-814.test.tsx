/**
 * #814 — baris tabel isu: semua pemicu dropdown borderless sampai hover.
 *
 * Pemilik proyek, 06 Nov, menunjuk kolom SPRINT yang kotaknya baru muncul saat
 * kursor di atasnya, lalu meminta SEMUA dropdown di baris itu mengikuti gaya
 * yang sama. Kulit pemicu sebelumnya bergantung pada dua hal yang tidak
 * seragam: status/prioritas memakai `KONTROL_KECIL` (berbingkai), dan dropdown
 * yang opsinya membawa `color` (resolusi, kategori, rilis) memakai
 * `KONTROL_NETRAL` (berbingkai) sementara sprint tidak. Prop `polos` mencabut
 * bingkai itu untuk kedelapan dropdown di baris — ukuran huruf tetap mengikuti
 * jenis kontrolnya (status/prioritas 10 px uppercase, sisanya 12 px).
 */
import { readFileSync } from "fs";
import { join } from "path";
import { render } from "@testing-library/react";
import { StyledDropdown } from "./CommonComponents";

const tombol = (el: HTMLElement) => el.querySelector("button")!;
const token = (el: HTMLElement) => el.className.split(/\s+/);

const renderDrop = (props: Partial<Parameters<typeof StyledDropdown>[0]> = {}) =>
  render(
    <StyledDropdown
      value=""
      onChange={() => {}}
      options={[{ id: "", label: "Kosong" }]}
      masterData={[] as any}
      {...props}
    />
  ).container;

describe("#814 — pemicu dropdown polos di baris tabel isu", () => {
  it("status dengan `polos` borderless sampai hover, 10 px uppercase tetap", () => {
    const container = renderDrop({
      value: "To Do",
      options: [{ id: "To Do", label: "To Do" }],
      type: "status",
      polos: true,
    });
    const b = tombol(container);
    const label = b.querySelector("span.capitalize")!;

    expect(token(b)).toContain("border-transparent");
    expect(token(b)).not.toContain("border-border-subtle");
    expect(b.className).toContain("hover:border-border-subtle");
    expect(b.className).toContain("text-[10px]");
    expect(label.className).toContain("uppercase");
  });

  it("opsi berwarna (rilis) tetap borderless saat `polos`, apa pun warnanya", () => {
    const container = renderDrop({
      value: "",
      options: [{ id: "", label: "Tanpa Rilis", color: "#94a3b8" }],
      type: "release",
      polos: true,
    });
    const b = tombol(container);

    expect(token(b)).toContain("border-transparent");
    expect(token(b)).not.toContain("border-border-subtle");
  });

  it("tanpa `polos` perilaku lama tetap: opsi berwarna berbingkai", () => {
    const container = renderDrop({
      value: "",
      options: [{ id: "", label: "Tanpa Rilis", color: "#94a3b8" }],
      type: "release",
    });
    const b = tombol(container);

    expect(token(b)).toContain("border-border-subtle");
    expect(token(b)).not.toContain("border-transparent");
  });

  it("tanpa `polos` status/prioritas tetap kontrol kecil berbingkai (#782)", () => {
    const container = renderDrop({
      value: "To Do",
      options: [{ id: "To Do", label: "To Do" }],
      type: "status",
    });
    const b = tombol(container);

    expect(token(b)).toContain("border-border-subtle");
    expect(b.className).toContain("text-[10px]");
  });

  it("kedelapan dropdown di IssueTableRow memakai `polos`", () => {
    const isi = readFileSync(
      join(__dirname, "..", "..", "features", "issues", "components", "list", "IssueTableRow.tsx"),
      "utf8"
    ).replace(/\r\n/g, "\n");
    const potongan = isi.split("<StyledDropdown").slice(1);

    expect(potongan).toHaveLength(8);
    for (const p of potongan) {
      expect(p.slice(0, p.indexOf("/>"))).toContain("polos");
    }
  });
});
