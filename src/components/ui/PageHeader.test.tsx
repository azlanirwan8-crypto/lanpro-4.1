import React from "react";
import { render, screen } from "@testing-library/react";
import { PageHeader } from "./PageHeader";

describe("PageHeader (#424)", () => {
  it("judul 15px semibold, tanpa breadcrumb dan tanpa subtitle", () => {
    render(
      <PageHeader
        breadcrumbs={[{ label: "PROJECT" }, { label: "Daftar Isu", current: true }]}
        title="Daftar Isu"
        subtitle="Proyek Uji (UJI)"
      />
    );

    const judul = screen.getByRole("heading", { name: "Daftar Isu" });
    expect(judul).toHaveClass("text-[15px]");
    expect(judul).toHaveClass("font-semibold");
    expect(judul).toHaveClass("uppercase");
    expect(screen.queryByLabelText("Breadcrumb")).not.toBeInTheDocument();
    expect(screen.queryByText("Proyek Uji (UJI)")).not.toBeInTheDocument();
    expect(screen.queryByText("PROJECT")).not.toBeInTheDocument();
  });

  it("masih merender aksi kanan bila di-pass", () => {
    render(<PageHeader title="Linimasa" actions={<button type="button">Ekspor</button>} />);
    expect(screen.getByRole("button", { name: "Ekspor" })).toBeInTheDocument();
  });
});
