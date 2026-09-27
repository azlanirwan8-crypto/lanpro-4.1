/**
 * #313 — salinan tes helper di server.
 */
import { statusSelesai, statusSelesaiLamaSubstring, sqlStatusBukanTerminal } from "./statusSelesai";

describe("server statusSelesai (#313)", () => {
  const master = [
    { type: "status", code: "done", label: "Tuntas", isTerminal: true },
    { type: "status", code: "uat", label: "UAT", isTerminal: true },
    { type: "status", code: "todo", label: "To Do", isTerminal: false },
  ];

  it("TES MERAH substring lama vs helper baru", () => {
    expect(statusSelesaiLamaSubstring("Tuntas")).toBe(false);
    expect(statusSelesai("Tuntas", master)).toBe(true);
  });

  it("sqlStatusBukanTerminal mengutip kunci", () => {
    const sql = sqlStatusBukanTerminal("t.status", ["done", "uat"]);
    expect(sql).toContain("LOWER(t.status) NOT IN");
    expect(sql).toContain("'done'");
    expect(sql).toContain("'uat'");
  });
});
