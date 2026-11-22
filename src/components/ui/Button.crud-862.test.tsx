import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { Plus } from "lucide-react";
import { Button } from "./CoreUI";

describe("#862 tombol CRUD", () => {
  it("menjajarkan ikon dengan label dan meneruskan pengiriman form", () => {
    const onSubmit = jest.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <>
        <form id="add-suite-form" onSubmit={onSubmit} />
        <Button type="submit" form="add-suite-form" className="gap-1.5">
          <Plus aria-hidden="true" /> Create Document
        </Button>
      </>
    );

    const submit = screen.getByRole("button", { name: "Create Document" });
    const content = within(submit).getByText("Create Document");
    expect(content).toHaveClass("inline-flex", "items-center");
    expect(content.querySelector("svg")?.parentElement).toBe(content);
    expect(submit).toHaveClass("min-h-9");
    fireEvent.click(submit);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("mempertahankan keadaan nonaktif dan memakai garis panel pada tombol outline", () => {
    const onClick = jest.fn();
    render(
      <Button variant="outline" disabled onClick={onClick}>
        Delete
      </Button>
    );

    const remove = screen.getByRole("button", { name: "Delete" });
    expect(remove).toBeDisabled();
    expect(remove).toHaveClass("border-border-panel-divider");
    fireEvent.click(remove);
    expect(onClick).not.toHaveBeenCalled();
  });
});
