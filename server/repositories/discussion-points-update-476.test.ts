/**
 * #476 — DiscussionPoints UPDATE wajib kutip kolom camelCase (hindari twin lowercase).
 */
import fs from "node:fs";
import path from "node:path";

const sumber = fs.readFileSync(path.join(__dirname, "discussion-points.repository.ts"), "utf8");

describe("#476 DiscussionPoints UPDATE quote camelCase", () => {
  it("updatePoint mengutip parentPointId assignTo tindakanLanjut targetDate tanggalUpdateStatus", () => {
    const mulai = sumber.indexOf("async updatePoint");
    const selesai = sumber.indexOf("async deletePoint");
    expect(mulai).toBeGreaterThan(-1);
    const blok = sumber.slice(mulai, selesai > mulai ? selesai : mulai + 2000);
    expect(blok).toContain('"parentPointId" = ?');
    expect(blok).toContain('"assignTo" = ?');
    expect(blok).toContain('"tindakanLanjut" = ?');
    expect(blok).toContain('"targetDate" = ?');
    expect(blok).toContain('"tanggalUpdateStatus" = ?');
    expect(blok).not.toMatch(/sqlUpdates\.push\("parentPointId = \?"\)/);
    expect(blok).not.toMatch(/sqlUpdates\.push\("assignTo = \?"\)/);
    expect(blok).not.toMatch(/sqlUpdates\.push\("tindakanLanjut = \?"\)/);
    expect(blok).not.toMatch(/sqlUpdates\.push\("targetDate = \?"\)/);
    expect(blok).not.toMatch(/sqlUpdates\.push\("tanggalUpdateStatus = \?"\)/);
  });
});
