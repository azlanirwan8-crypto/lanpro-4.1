/**
 * #477 — cascade hapus task: ActivityLogs + Notifications; buang helper mati.
 */
import fs from "node:fs";
import path from "node:path";

const repo = fs.readFileSync(path.join(__dirname, "task.repository.ts"), "utf8");
const svc = fs.readFileSync(path.join(__dirname, "..", "services", "task.service.ts"), "utf8");

describe("#477 task cascade ActivityLogs/Notifications", () => {
  it("deleteTaskCascade menghapus ActivityLogs by taskId sebelum Tasks", () => {
    const mulai = repo.indexOf("async deleteTaskCascade");
    const selesai = repo.indexOf("async findCommentsByTaskId");
    const blok = repo.slice(mulai, selesai);
    expect(blok).toContain('DELETE FROM ActivityLogs WHERE "taskId" = ?');
    expect(blok).toContain("DELETE FROM Notifications WHERE relatedId = ?");
    expect(blok.indexOf("ActivityLogs")).toBeLessThan(blok.indexOf("DELETE FROM Tasks"));
    expect(blok.indexOf("Notifications")).toBeLessThan(blok.indexOf("DELETE FROM Tasks"));
  });

  it("deleteTasksByIds bulk sama untuk ActivityLogs/Notifications", () => {
    const mulai = repo.indexOf("async deleteTasksByIds");
    const selesai = repo.indexOf("async deleteTaskCascade");
    const blok = repo.slice(mulai, selesai);
    expect(blok).toContain('DELETE FROM ActivityLogs WHERE "taskId" IN (?)');
    expect(blok).toContain("DELETE FROM Notifications WHERE relatedId IN (?)");
  });

  it("task.service tidak lagi mengekspor recordExecutionRunLog mati", () => {
    expect(svc).not.toMatch(/export async function recordExecutionRunLog/);
    expect(svc).not.toMatch(/evaluationNotes,\s*evidences/);
    expect(svc).not.toMatch(/INSERT INTO QATestCaseExecutionLogs/);
  });
});
