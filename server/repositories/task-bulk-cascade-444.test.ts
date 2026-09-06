/**
 * #444 — bulk-delete harus cascade anak, bukan hanya DELETE Tasks.
 * Test sumber: memastikan deleteTasksByIds memuat DELETE Comments/Attachments.
 */
import fs from "node:fs";
import path from "node:path";

const sumber = fs.readFileSync(path.join(__dirname, "task.repository.ts"), "utf8");

describe("#444 deleteTasksByIds cascade", () => {
  it("deleteTasksByIds menghapus Comments dan Attachments sebelum Tasks", () => {
    const mulai = sumber.indexOf("async deleteTasksByIds");
    const selesai = sumber.indexOf("async deleteTaskCascade");
    expect(mulai).toBeGreaterThan(-1);
    expect(selesai).toBeGreaterThan(mulai);
    const blok = sumber.slice(mulai, selesai);
    expect(blok).toContain("DELETE FROM Comments");
    expect(blok).toContain("DELETE FROM Attachments");
    expect(blok).toContain("DELETE FROM LinkedTasks");
    expect(blok).toContain("DELETE FROM TaskCustomFields");
    expect(blok).toMatch(/DELETE FROM Tasks WHERE id IN/);
  });
});
