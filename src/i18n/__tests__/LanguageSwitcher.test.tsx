/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { LanguageSwitcher } from "../LanguageSwitcher";
import i18n, { siapBahasa } from "../index";

describe("LanguageSwitcher component", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await act(async () => {
      await siapBahasa;
      await i18n.changeLanguage("en");
    });
  });

  it("renders with current language and toggles on click", async () => {
    render(<LanguageSwitcher />);
    const btn = screen.getByTestId("language-switcher");
    expect(btn).toBeInTheDocument();

    // Default is English -> should show English flag
    expect(i18n.language).toBe("en");
    expect(btn.getAttribute("title")).toContain("Indonesia");

    // Click to toggle to Indonesian
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(i18n.language).toBe("id");
    expect(btn.getAttribute("title")).toContain("English");
    expect(window.localStorage.getItem("bahasa")).toBe("id");

    // Click again to toggle back to English
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(i18n.language).toBe("en");
    expect(btn.getAttribute("title")).toContain("Indonesia");
    expect(window.localStorage.getItem("bahasa")).toBe("en");
  });
});
