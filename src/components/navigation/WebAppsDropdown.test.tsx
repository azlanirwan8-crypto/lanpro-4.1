import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { WebAppsDropdown } from "./WebAppsDropdown";

describe("WebAppsDropdown", () => {
  it("merender tombol trigger aplikasi web apps", () => {
    render(<WebAppsDropdown />);
    const trigger = screen.getByRole("button", { name: /web apps/i });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("membuka dan menutup dropdown saat trigger diklik", () => {
    render(<WebAppsDropdown />);
    const trigger = screen.getByRole("button", { name: /web apps/i });

    // Klik untuk membuka
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Maps Cabang")).toBeInTheDocument();

    const link = screen.getByRole("menuitem");
    expect(link).toHaveAttribute("href", "https://match-sepia.vercel.app/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");

    // Klik lagi untuk menutup
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Maps Cabang")).not.toBeInTheDocument();
  });

  it("menutup dropdown saat menekan tombol Escape", () => {
    render(<WebAppsDropdown />);
    const trigger = screen.getByRole("button", { name: /web apps/i });

    fireEvent.click(trigger);
    expect(screen.getByText("Maps Cabang")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByText("Maps Cabang")).not.toBeInTheDocument();
  });
});
