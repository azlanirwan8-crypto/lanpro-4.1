/**
 * @jest-environment jsdom
 *
 * #559 — keliru paham yang membuat tombol bendera terlihat mati: `fallbackLng`
 * membuat kegagalan memuat kamus TIDAK bersuara sama sekali. Berkas ini
 * mensimulasikan kamus Indonesia tidak tersedia (build basi / jaringan hotspot)
 * dan menuntut supaya keadaan itu tercatat, bukan ditelan.
 */
jest.mock("../locales/id", () => {
  throw new Error("Failed to fetch chunk id-legacy.js (404)");
});

import React from "react";
import { act } from "@testing-library/react";
import i18n from "../index";

describe("i18n — kegagalan muat kamus harus terdengar (#559)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("mencatat penyebabnya di log, tanpa menghentikan aplikasi", async () => {
    const catat = jest.spyOn(console, "warn").mockImplementation(() => {});

    await act(async () => {
      await i18n.changeLanguage("id");
    });

    const semuaLog = catat.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(semuaLog).toContain("kamus id gagal dimuat");
    expect(semuaLog).toContain("404");
    catat.mockRestore();
  });
});
