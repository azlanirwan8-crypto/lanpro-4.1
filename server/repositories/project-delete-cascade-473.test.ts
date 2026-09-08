/**
 * #473 — cascade proyek: discussion_point_comments (+ opsional ai_learning_logs)
 * sebelum DiscussionPoints.
 */
import fs from "node:fs";
import path from "node:path";

const sumber = fs.readFileSync(path.join(__dirname, "project.repository.ts"), "utf8");

describe("#473 project deleteCascade comments", () => {
  it("menghapus discussion_point_comments sebelum DiscussionPoints", () => {
    const mulai = sumber.indexOf("async deleteCascade");
    const selesai = sumber.indexOf("async updateMembers");
    expect(mulai).toBeGreaterThan(-1);
    const blok = sumber.slice(mulai, selesai > mulai ? selesai : mulai + 4000);
    expect(blok).toContain("DELETE FROM discussion_point_comments");
    expect(blok).toContain("DELETE FROM DiscussionPoints");
    expect(blok.indexOf("discussion_point_comments")).toBeLessThan(
      blok.indexOf("DELETE FROM DiscussionPoints")
    );
  });

  it("opsional menghapus ai_learning_logs by project_id", () => {
    const mulai = sumber.indexOf("async deleteCascade");
    const blok = sumber.slice(mulai, mulai + 4500);
    expect(blok).toContain("DELETE FROM ai_learning_logs WHERE project_id = ?");
  });
});
