/**
 * #493 - Test verifikasi keselarasan (alignment) header status dan kolom kartu tugas di Kanban Board:
 * 1. Grid sidebar kiri (Bagian A) memiliki ukuran identik antara Header Bar, Epic Row, dan Assignee Row (260px di desktop)
 * 2. Padding horizontal kolom identik (px-4) antara Header Bar dan Row cells
 * 3. Gap antar kolom identik (gap-3 sm:gap-4) antara Header Bar dan Row cells
 * 4. KanbanColumn menggunakan w-full untuk mengikuti lebar kolom pembungkusnya
 */
import fs from "node:fs";
import path from "node:path";

const kanbanIndexPath = path.join(__dirname, "index.tsx");
const kanbanColumnPath = path.join(__dirname, "components", "KanbanColumn.tsx");

describe("#493: Kanban Header Status & Column Alignment", () => {
  it("Header Bar, Epic Row, dan Assignee Row memiliki grid-cols sidebar kiri yang identik (260px di md)", () => {
    const content = fs.readFileSync(kanbanIndexPath, "utf8");
    const targetGridClass =
      "grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] md:grid-cols-[260px_1fr]";

    // Pastikan tidak ada lagi grid 240px atau 280px
    expect(content).not.toContain("md:grid-cols-[240px_1fr]");
    expect(content).not.toContain("md:grid-cols-[280px_1fr]");

    // Pastikan targetGridClass muncul minimal 3 kali (Header, Epic row, Assignee row)
    const matches = content.split(targetGridClass).length - 1;
    expect(matches).toBeGreaterThanOrEqual(3);
  });

  it("Header status dan Row cells memiliki padding px-4 dan gap-3 sm:gap-4 yang identik", () => {
    const content = fs.readFileSync(kanbanIndexPath, "utf8");
    // Header baris B
    expect(content).toContain("px-4 py-2 gap-3 sm:gap-4");
    // Row cells
    expect(content).toContain("gap-3 sm:gap-4 px-4 py-3");
    // Tidak ada lagi px-3 atau gap-2.5 di header
    expect(content).not.toContain("px-3 py-2 gap-2.5");
  });

  it("KanbanColumn menggunakan w-full untuk mengikuti lebar parent", () => {
    const columnContent = fs.readFileSync(kanbanColumnPath, "utf8");
    expect(columnContent).toContain("w-full");
    expect(columnContent).not.toMatch(/isCompact \? "w-\[240px\]" : "w-\[270px\]"/);
  });
});
