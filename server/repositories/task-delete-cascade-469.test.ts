/**
 * #469 — cascade hapus task: "TaskWorkLogs" dikutip + SAVEPOINT (bukan try/catch kosong).
 */
import fs from "node:fs";
import path from "node:path";

const sumber = fs.readFileSync(path.join(__dirname, "task.repository.ts"), "utf8");

describe("#469 deleteTaskCascade TaskWorkLogs", () => {
  it("deleteTaskCascade memakai tabel dikutip dan hapusAnakOpsional", () => {
    const mulai = sumber.indexOf("async deleteTaskCascade");
    const selesai = sumber.indexOf("async findCommentsByTaskId");
    expect(mulai).toBeGreaterThan(-1);
    expect(selesai).toBeGreaterThan(mulai);
    const blok = sumber.slice(mulai, selesai);
    expect(blok).toContain('DELETE FROM "TaskWorkLogs"');
    expect(blok).toContain("hapusAnakOpsional");
    expect(blok).not.toMatch(/DELETE FROM TaskWorkLogs WHERE/);
  });

  it("deleteTasksByIds bulk sama — kutip + hapusAnakOpsional", () => {
    const mulai = sumber.indexOf("async deleteTasksByIds");
    const selesai = sumber.indexOf("async deleteTaskCascade");
    const blok = sumber.slice(mulai, selesai);
    expect(blok).toContain('DELETE FROM "TaskWorkLogs"');
    expect(blok).toContain("hapusAnakOpsional");
  });

  it("helper hapusAnakOpsional memakai SAVEPOINT (bukan try/catch kosong)", () => {
    const mulai = sumber.indexOf("async function hapusAnakOpsional");
    const selesai = sumber.indexOf("export interface TaskEntity");
    expect(mulai).toBeGreaterThan(-1);
    const blok = sumber.slice(mulai, selesai > mulai ? selesai : mulai + 800);
    expect(blok).toContain("SAVEPOINT");
    expect(blok).toContain("ROLLBACK TO SAVEPOINT");
    expect(blok).toContain("adalahTabelTidakAda");
  });

  it("listWorkLogs / createWorkLog mengutip TaskWorkLogs", () => {
    expect(sumber).toContain('SELECT * FROM "TaskWorkLogs"');
    expect(sumber).toContain('INSERT INTO "TaskWorkLogs"');
    expect(sumber).toContain('FROM "TaskWorkLogs" WHERE "taskId" = ?');
    expect(sumber).toContain('"taskId"');
  });

  it("helper mengabaikan kolom tidak ada (42703) selain tabel tidak ada", () => {
    const mulai = sumber.indexOf("async function hapusAnakOpsional");
    const blok = sumber.slice(mulai, mulai + 900);
    expect(blok).toContain("adalahKolomTidakAda");
  });
});
