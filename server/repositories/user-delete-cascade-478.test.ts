/**
 * #478 — hapus user membersihkan ProjectMembers.
 */
import fs from "node:fs";
import path from "node:path";

const sumber = fs.readFileSync(path.join(__dirname, "user.repository.ts"), "utf8");

describe("#478 user delete ProjectMembers", () => {
  it("delete menghapus ProjectMembers sebelum Users (txn)", () => {
    const mulai = sumber.indexOf("async delete(id: string)");
    expect(mulai).toBeGreaterThan(-1);
    const selesai = sumber.indexOf("async getUserProjectRoles");
    const blok = sumber.slice(mulai, selesai > mulai ? selesai : mulai + 1500);
    expect(blok).toContain("beginTransaction");
    expect(blok).toContain("DELETE FROM ProjectMembers WHERE userId IN (?)");
    expect(blok).toContain("DELETE FROM Users WHERE id = ?");
    expect(blok.indexOf("ProjectMembers")).toBeLessThan(blok.indexOf("DELETE FROM Users"));
    expect(blok).toContain("SELECT id, uid FROM Users WHERE id = ? OR uid = ?");
  });
});
