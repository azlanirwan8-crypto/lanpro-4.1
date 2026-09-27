import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { DetailViewChrome } from "./DetailViewChrome";

describe("DetailViewChrome #425", () => {
  it("menempatkan Back, Edit, Delete di kiri dan memicu handler", () => {
    const onBack = jest.fn();
    const onEdit = jest.fn();
    const onDelete = jest.fn();

    render(
      <DetailViewChrome
        backLabel="Kembali"
        onBack={onBack}
        title="Dokumen Uji"
        canEdit
        canDelete
        onEdit={onEdit}
        onDelete={onDelete}
        editTitle="Ubah"
        deleteTitle="Hapus"
      />
    );

    expect(screen.getByText("Dokumen Uji")).toHaveClass("truncate");
    fireEvent.click(screen.getByText("Kembali"));
    expect(onBack).toHaveBeenCalled();
    fireEvent.click(screen.getByTitle("Ubah"));
    expect(onEdit).toHaveBeenCalled();
    fireEvent.click(screen.getByTitle("Hapus"));
    expect(onDelete).toHaveBeenCalled();
  });

  it("judul memakai tipografi Velzon 15px semibold", () => {
    const { container } = render(
      <DetailViewChrome backLabel="Back" onBack={() => {}} title="Judul" />
    );
    const h2 = container.querySelector("h2");
    expect(h2?.className).toMatch(/text-\[15px]/);
    expect(h2?.className).toMatch(/font-medium/);
    expect(h2?.className).toMatch(/tracking-normal/);
  });
});
