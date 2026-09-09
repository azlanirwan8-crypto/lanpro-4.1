/**
 * #494 - Test verifikasi icon komentar dan total jumlah komentar di KanbanCard:
 * 1. KanbanCard mengimpor MessageSquare dan merender total komentar di samping UserAvatar bila > 0
 * 2. task.repository.ts memuat query agregasi jumlah komentar dari tabel Comments
 * 3. types/task.ts mendefinisikan commentsCount pada interface Task
 * 4. AppContainer.tsx memperbarui commentsCount saat penambahan komentar berhasil
 */
import fs from "node:fs";
import path from "node:path";

const kanbanCardPath = path.join(__dirname, "components", "KanbanCard.tsx");
const taskRepoPath = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "server",
  "repositories",
  "task.repository.ts"
);
const taskTypesPath = path.join(__dirname, "..", "..", "types", "task.ts");
const appContainerPath = path.join(__dirname, "..", "..", "AppContainer.tsx");

describe("#494: KanbanCard comments count icon", () => {
  it("KanbanCard mengimpor MessageSquare dan merender total komentar bila commentsCount > 0", () => {
    const content = fs.readFileSync(kanbanCardPath, "utf8");
    expect(content).toContain("MessageSquare");
    expect(content).toContain("Number(task.commentsCount || 0) > 0");
    expect(content).toContain("{task.commentsCount}");
  });

  it("task.repository.ts mengagregasi commentsCount dari tabel Comments", () => {
    const content = fs.readFileSync(taskRepoPath, "utf8");
    expect(content).toContain("SELECT taskId, COUNT(*)::int AS count FROM Comments");
    expect(content).toContain("commentsCountMap.get(t.id) || 0");
  });

  it("types/task.ts memiliki field commentsCount?: number", () => {
    const content = fs.readFileSync(taskTypesPath, "utf8");
    expect(content).toContain("commentsCount?: number;");
  });

  it("AppContainer.tsx memperbarui commentsCount saat tambah komentar", () => {
    const content = fs.readFileSync(appContainerPath, "utf8");
    expect(content).toContain("commentsCount: (t.commentsCount || 0) + 1");
  });
});
