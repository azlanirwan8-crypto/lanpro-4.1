/**
 * #501: Test verifikasi header card swimlane Epic Kanban tersusun 1 baris sejajar (Icon + Title + Counter).
 */
import fs from "node:fs";
import path from "node:path";

const kanbanIndexPath = path.join(__dirname, "index.tsx");

describe("#501: Kanban Epic Swimlane Single Row Layout", () => {
  it("menyusun icon, title, dan counter dalam 1 baris horizontal flex pada Epic Card Content", () => {
    const content = fs.readFileSync(kanbanIndexPath, "utf8");

    // Ambil bagian Epic Card Content
    const epicCardBlock =
      content.split("{/* Epic Card Content */}")[1]?.split("{/* Bagian B Row Cells")[0] || "";

    // Container 1 baris
    expect(epicCardBlock).toContain('<div className="flex items-center gap-2">');
    // Title fleksibel dan ter-truncate
    expect(epicCardBlock).toContain("truncate flex-1 min-w-0");
    // Counter shrink-0 di sisi kanan
    expect(epicCardBlock).toContain("shrink-0 bg-primary-surface/10 text-primary");
    // Tidak ada mb-1.5 di Epic card
    expect(epicCardBlock).not.toContain("mb-1.5");
  });
});
