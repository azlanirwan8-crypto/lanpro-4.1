/**
 * Test #495: Task Comments Save & Payload Compatibility
 *
 * Memastikan:
 * 1. taskRepository.createComment memasukkan kolom `text` (NOT NULL constraint di DB) dan `content`.
 * 2. Rute POST /api/projects/:projectId/tasks/:taskId/comments mendukung req.body.text maupun req.body.content.
 * 3. AppContainer menyertakan toast error bila pengiriman komentar gagal dan mengirimkan kedua field.
 */
import fs from "node:fs";
import path from "node:path";

describe("Item #495: Task Comments Save & Payload Compatibility", () => {
  const repoPath = path.resolve(__dirname, "../repositories/task.repository.ts");
  const routesPath = path.resolve(__dirname, "./task.routes.ts");
  const appContainerPath = path.resolve(__dirname, "../../src/AppContainer.tsx");

  const repoContent = fs.readFileSync(repoPath, "utf8");
  const routesContent = fs.readFileSync(routesPath, "utf8");
  const appContainerContent = fs.readFileSync(appContainerPath, "utf8");

  it("taskRepository.createComment menyertakan kolom text dan content pada INSERT INTO Comments", () => {
    expect(repoContent).toMatch(/INSERT INTO Comments \([^)]*text[^)]*content[^)]*\) VALUES/);
  });

  it("task.routes.ts menerima req.body.text dan req.body.content serta memvalidasi isinya", () => {
    expect(routesContent).toContain('const rawContent = req.body.text ?? req.body.content ?? "";');
    expect(routesContent).toContain('status: "fail", message: "Comment text is required"');
    expect(routesContent).toContain("text: content");
  });

  it("AppContainer.tsx mengirimkan text & content dan menangani error dengan toast.error", () => {
    expect(appContainerContent).toMatch(/import\s*\{[^}]*toast[^}]*\}\s*from\s*["']sonner["']/);
    expect(appContainerContent).toMatch(/content:\s*(?:newCommentText\.trim\(\)|textToSend)/);
    expect(appContainerContent).toMatch(/toast\.error\(.+Gagal menambahkan komentar/);
  });
});
