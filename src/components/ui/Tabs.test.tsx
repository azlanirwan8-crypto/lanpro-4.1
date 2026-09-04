import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Tabs } from "./Tabs";

describe("Tabs (#432)", () => {
  it("memilih tab lewat onChange tanpa menyentuh routing", () => {
    const onChange = jest.fn();
    render(
      <Tabs
        value="satu"
        onChange={onChange}
        tabs={[
          { id: "satu", label: "Satu" },
          { id: "dua", label: "Dua" },
        ]}
      />
    );

    fireEvent.click(screen.getByRole("tab", { name: "Dua" }));
    expect(onChange).toHaveBeenCalledWith("dua");
    expect(screen.getByRole("tab", { name: "Satu" })).toHaveAttribute("aria-selected", "true");
  });
});
