/**
 * #475 — hapus sprint: null Tasks.sprintId + MilestoneSprints (#461 unlock via SQL langsung).
 */
import fs from "node:fs";
import path from "node:path";

const sumber = fs.readFileSync(path.join(__dirname, "sprint.repository.ts"), "utf8");

describe("#475 sprint delete cascade", () => {
  it("delete menull-kan Tasks.sprintId sebelum hapus Sprints", () => {
    const mulai = sumber.indexOf("async delete(id: string, projectId: string)");
    expect(mulai).toBeGreaterThan(-1);
    const blok = sumber.slice(mulai, mulai + 1200);
    expect(blok).toContain("UPDATE Tasks SET sprintId = NULL WHERE sprintId = ? AND projectId = ?");
    expect(blok).toContain("DELETE FROM MilestoneSprints WHERE sprintId = ?");
    expect(blok).toContain("DELETE FROM Sprints WHERE id = ? AND projectId = ?");
    expect(blok.indexOf("UPDATE Tasks SET sprintId")).toBeLessThan(
      blok.indexOf("DELETE FROM Sprints")
    );
    expect(blok.indexOf("MilestoneSprints")).toBeLessThan(blok.indexOf("DELETE FROM Sprints"));
    expect(blok).toContain("beginTransaction");
  });
});
