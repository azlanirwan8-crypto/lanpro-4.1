/**
 * #489 — Test verifikasi lampiran task:
 * - findTasksWithRelations memuat Attachments dari database
 * - Repository menyediakan addAttachment, deleteAttachment, findAttachmentById
 * - Rute POST dan DELETE attachments terdaftar dengan penjaga matriks jagaProyek("list", "U")
 */
import fs from "node:fs";
import path from "node:path";

const repo = fs.readFileSync(path.join(__dirname, "task.repository.ts"), "utf8");
const routes = fs.readFileSync(path.join(__dirname, "..", "routes", "task.routes.ts"), "utf8");
const section = fs.readFileSync(
  path.join(
    __dirname,
    "..",
    "..",
    "src",
    "features",
    "issues",
    "components",
    "modal",
    "TaskAttachmentsSection.tsx"
  ),
  "utf8"
);

describe("#489 upload berkas & gambar detail issue", () => {
  it("findTasksWithRelations melakukan query ke tabel Attachments", () => {
    expect(repo).toContain('SELECT * FROM Attachments WHERE "taskId" IN');
    expect(repo).toContain("attachments: attachmentsMap.get(t.id) || []");
  });

  it("taskRepository memiliki method addAttachment, deleteAttachment, dan findAttachmentById", () => {
    expect(repo).toContain("async addAttachment(data:");
    expect(repo).toContain("async deleteAttachment(attachmentId: string, taskId: string):");
    expect(repo).toContain("async findAttachmentById(attachmentId: string):");
  });

  it("rute POST dan DELETE attachment terdaftar dengan penjaga matriks yang tepat", () => {
    expect(routes).toMatch(
      /router\.post\(\s*["']\/api\/projects\/:projectId\/tasks\/:id\/attachments["']/
    );
    expect(routes).toMatch(
      /router\.delete\(\s*["']\/api\/projects\/:projectId\/tasks\/:id\/attachments\/:attachmentId["']/
    );
    expect(routes).toContain('jagaProyek("list", "U")');
    expect(routes).toContain('jagaProyek("list", "D")');
  });

  it("TaskAttachmentsSection mendukung multiple upload dan icon mata untuk preview/download", () => {
    expect(section).toContain('type="file"');
    expect(section).toContain("multiple");
    expect(section).toContain("<Eye");
    expect(section).toContain("isImageAttachment");
    expect(section).toContain("handleDownloadAttachment");
    expect(section).toContain("ImagePreviewModal");
  });
});
