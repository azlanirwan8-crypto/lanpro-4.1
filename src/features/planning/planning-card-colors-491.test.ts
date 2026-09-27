/**
 * #491 - Test verifikasi perbaikan Planning Cards & Task Key:
 * 1. Gambar 1: Subtask list di TaskSubtasksSection tidak menampilkan ID issue/key
 * 2. Gambar 1 (Linked): TaskLinksSection tidak menampilkan target.key di badge
 * 3. Gambar 2: Planning card menampilkan border-l-4 sesuai priority, priority dipindah ke samping status
 * 4. Gambar 3: Planning row menampilkan border-l-4 sesuai status, priority ditampilkan sebelum status
 * 5. Penggunaan warna semantik (token) tanpa hardcoded Tailwind colors (red-600, red-500)
 */
import fs from "node:fs";
import path from "node:path";

const subtasksSectionPath = path.join(
  __dirname,
  "..",
  "issues",
  "components",
  "modal",
  "TaskSubtasksSection.tsx"
);
const linksSectionPath = path.join(
  __dirname,
  "..",
  "issues",
  "components",
  "modal",
  "TaskLinksSection.tsx"
);
const planningIndexPath = path.join(__dirname, "index.tsx");

describe("#491: Planning Card Colors & Issue Key Removal", () => {
  it("TaskSubtasksSection tidak menampilkan {st.key}", () => {
    const content = fs.readFileSync(subtasksSectionPath, "utf8");
    expect(content).not.toContain("{st.key}");
  });

  it("TaskLinksSection tidak menampilkan {target.key}", () => {
    const content = fs.readFileSync(linksSectionPath, "utf8");
    expect(content).not.toContain("{target.key}");
  });

  it("planning/index.tsx memiliki border-l-4 untuk card dan row", () => {
    const content = fs.readFileSync(planningIndexPath, "utf8");
    expect(content).toContain("border-l-4");
    expect(content).toContain("border-l-danger");
    expect(content).toContain("border-l-warning");
    expect(content).toContain("border-l-primary");
    expect(content).toContain("border-l-success");
  });

  it("planning/index.tsx menempatkan priority berdampingan dengan status pada card dan sebelum status pada row", () => {
    const content = fs.readFileSync(planningIndexPath, "utf8");
    // Pada card (variant === "card"), priority tidak lagi berada di atas title
    expect(content).not.toMatch(/task\.priority === "Highest"/);
    // Priority chip di samping status
    expect(content).toContain("text-danger-text bg-danger/10 border-danger/30");
    expect(content).toContain("text-warning-text bg-warning/10 border-warning/30");
  });

  it("planning/index.tsx tidak memuat hardcoded Tailwind red-500/red-600", () => {
    const content = fs.readFileSync(planningIndexPath, "utf8");
    expect(content).not.toContain("text-red-600");
    expect(content).not.toContain("border-red-500");
    expect(content).not.toContain("bg-red-500");
  });
});
