/**
 * #313 — helper status terminal vs label yang diganti.
 */
import { statusSelesai, statusSelesaiLamaSubstring, kumpulanTerminal } from "./statusSelesai";

describe("statusSelesai (#313)", () => {
  const master = [
    { type: "status", code: "todo", label: "To Do", isTerminal: false },
    { type: "status", code: "done", label: "Tuntas", isTerminal: true },
    { type: "status", code: "uat", label: "UAT", isTerminal: true },
    { type: "status", code: "progress", label: "In Progress", isTerminal: false },
  ];

  it("TES MERAH: label Done diganti — substring lama masih menganggap belum selesai", () => {
    // Label baru tanpa substring done/selesai/completed/uat/closed/resolved
    expect(statusSelesaiLamaSubstring("Tuntas")).toBe(false);
    expect(statusSelesaiLamaSubstring("done")).toBe(true);
  });

  it("helper baru mengenali lewat isTerminal meskipun label berubah", () => {
    expect(statusSelesai("Tuntas", master)).toBe(true);
    expect(statusSelesai("done", master)).toBe(true);
    expect(statusSelesai("uat", master)).toBe(true);
    expect(statusSelesai("In Progress", master)).toBe(false);
  });

  it("UAT terminal sesuai keputusan pemilik", () => {
    expect(statusSelesai("UAT", master)).toBe(true);
  });

  it("fallback seed bila belum ada flag isTerminal", () => {
    const tanpaFlag = [
      { type: "status", code: "done", label: "Done" },
      { type: "status", code: "todo", label: "To Do" },
    ];
    expect(statusSelesai("Done", tanpaFlag)).toBe(true);
    expect(statusSelesai("uat", tanpaFlag)).toBe(true);
    expect(kumpulanTerminal(tanpaFlag).has("done")).toBe(true);
  });
});
