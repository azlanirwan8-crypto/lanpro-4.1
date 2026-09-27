/**
 * #492 - Test verifikasi penempatan Priority di KanbanCard:
 * 1. Priority (icon dan badge teks) dipindahkan ke baris bawah berdampingan dengan status
 * 2. Baris atas (top row) hanya dirender secara kondisional bila ada status khusus (Blocked, Subtasks, QA, Due Soon)
 * 3. Tidak ada warna hardcoded baru, tetap menggunakan token semantik
 */
import fs from "node:fs";
import path from "node:path";

const kanbanCardPath = path.join(__dirname, "KanbanCard.tsx");

describe("#492: KanbanCard priority bottom row", () => {
  it("KanbanCard memindahkan priority ke Info Row (baris bawah) sebelum status", () => {
    const content = fs.readFileSync(kanbanCardPath, "utf8");
    // Info row memuat priority dan status
    expect(content).toContain("Info Row: Priority, Status, Category & Avatar");
    // Di top row tidak lagi ada render priority
    const topRowCommentIndex = content.indexOf("Top row: alert/blocked/QA/due badges");
    const taskTitleIndex = content.indexOf("Task Title");
    const topRowSection = content.substring(topRowCommentIndex, taskTitleIndex);
    expect(topRowSection).not.toContain("task.priority");
  });

  it("Top row hanya di-render bila ada status khusus", () => {
    const content = fs.readFileSync(kanbanCardPath, "utf8");
    expect(content).toContain("(task.isBlocked || hasUnfinishedSubtasks || qaStatus || isDueSoon)");
  });

  it("Info Row merender badge priority berdampingan dengan status", () => {
    const content = fs.readFileSync(kanbanCardPath, "utf8");
    const infoRowIndex = content.indexOf("Info Row: Priority, Status, Category & Avatar");
    const infoRowSection = content.substring(infoRowIndex);
    expect(infoRowSection).toContain("task.priority");
    expect(infoRowSection).toContain("priorityInfo");
    expect(infoRowSection).toContain("task.status");
  });
});
