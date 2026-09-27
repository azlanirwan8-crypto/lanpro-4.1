/**
 * #472 — hapus meeting: meeting_details ikut; cascade discussion tidak di-swallow.
 */
import fs from "node:fs";
import path from "node:path";

const repoSrc = fs.readFileSync(path.join(__dirname, "meeting.repository.ts"), "utf8");
const routeSrc = fs.readFileSync(
  path.join(__dirname, "..", "routes", "meetings.routes.ts"),
  "utf8"
);

describe("#472 meeting delete cascade meeting_details", () => {
  it("meeting.repository.delete menghapus meeting_details sebelum Meetings", () => {
    const mulai = repoSrc.indexOf("async delete(id: string)");
    expect(mulai).toBeGreaterThan(-1);
    const blok = repoSrc.slice(mulai, mulai + 900);
    expect(blok).toContain("DELETE FROM meeting_details WHERE meeting_id = ?");
    expect(blok).toContain("DELETE FROM Meetings WHERE id = ?");
    expect(blok.indexOf("meeting_details")).toBeLessThan(blok.indexOf("DELETE FROM Meetings"));
    expect(blok).toContain("beginTransaction");
  });

  it("rute DELETE meeting tidak swallow cascade discussion sebelum parent delete", () => {
    const idx = routeSrc.indexOf("await meetingRepository.delete(id)");
    expect(idx).toBeGreaterThan(-1);
    const blok = routeSrc.slice(Math.max(0, idx - 1200), idx + 80);
    expect(blok).toContain("discussionPointsRepository.deletePoint");
    expect(blok).not.toMatch(/Cascade discussion gagal/);
    expect(blok).not.toMatch(/catch\s*\(\s*cascadeErr/);
  });
});
