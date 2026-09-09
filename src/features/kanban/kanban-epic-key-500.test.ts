/**
 * #500: Test verifikasi penghapusan issue/epic key di swimlane Kanban.
 * Sesuai kebijakan #488 (sembunyikan task key/ID dari seluruh tampilan UI),
 * badge key/ID seperti PRJ-6, PRJ-73 tidak boleh ditampilkan di card header swimlane Epic.
 */
import fs from "node:fs";
import path from "node:path";

const kanbanIndexPath = path.join(__dirname, "index.tsx");

describe("#500: Kanban Epic Swimlane Key Removal", () => {
  it("tidak lagi menampilkan badge epic.key pada header swimlane Epic", () => {
    const content = fs.readFileSync(kanbanIndexPath, "utf8");
    // Pastikan tidak ada rendering epic.key
    expect(content).not.toContain("{epic.key");
    expect(content).not.toContain("epic.key ||");
  });

  it("tetap mempertahankan ikon Layers dan badge counter pada header swimlane Epic", () => {
    const content = fs.readFileSync(kanbanIndexPath, "utf8");
    expect(content).toContain('<Layers className="w-3 h-3" />');
    expect(content).toContain("tasksForStatusLane(groupedTasks, epic.id, status).length");
  });
});
