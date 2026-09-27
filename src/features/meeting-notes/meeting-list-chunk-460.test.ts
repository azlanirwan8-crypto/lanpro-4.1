/**
 * #460 — daftar Catatan Rapat tidak boleh mengimpor DiscussionPointsTable /
 * AiMeetingCompanion / @ffmpeg secara statis (chunk daftar putih / hang).
 */
import fs from "fs";
import path from "path";

describe("MeetingNotes list chunk #460", () => {
  const sumber = fs.readFileSync(path.join(__dirname, "MeetingNotes.tsx"), "utf8");

  it("tidak mengimpor DiscussionPointsTable secara statis", () => {
    expect(sumber).not.toMatch(
      /import\s*\{[^}]*DiscussionPointsTable[^}]*\}\s*from\s*["']\.\/DiscussionPointsTable["']/
    );
  });

  it("memuat DiscussionPointsTable lewat lazyWithRetry", () => {
    expect(sumber).toMatch(/lazyWithRetry\s*\(/);
    expect(sumber).toMatch(/import\(["']\.\/DiscussionPointsTable["']\)/);
  });

  it("tidak mengimpor @ffmpeg atau AiMeetingCompanion di berkas daftar", () => {
    expect(sumber).not.toMatch(/@ffmpeg\//);
    expect(sumber).not.toMatch(/from\s+["']\.\/AiMeetingCompanion["']/);
    expect(sumber).not.toMatch(/import\s*\(\s*["']\.\/AiMeetingCompanion["']\s*\)/);
  });

  it("tidak merender null mentah saat detail tanpa activeMeeting", () => {
    // Cabang `: null` di detail adalah akar blank #460
    expect(sumber).not.toMatch(/\?\s*\([\s\S]*?DetailViewChrome[\s\S]*?\)\s*:\s*null/);
    expect(sumber).toMatch(/meetings\.backToList/);
  });
});
