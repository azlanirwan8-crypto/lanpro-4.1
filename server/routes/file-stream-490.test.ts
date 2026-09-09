/**
 * #490 — Test verifikasi streaming & unduh berkas aman:
 * - /api/v1/files/secure-stream terdaftar di RUTE_PUBLIK server.ts
 * - fileSecureStreamQuerySchema mendukung query download dan name
 * - file.routes.ts menetapkan Content-Type dan Content-Disposition
 * - TaskAttachmentsSection mendukung fallback icon saat broken image dan param download=1
 */
import fs from "node:fs";
import path from "node:path";

const serverTs = fs.readFileSync(path.join(__dirname, "..", "..", "server.ts"), "utf8");
const fileRoutes = fs.readFileSync(path.join(__dirname, "file.routes.ts"), "utf8");
const fileSchema = fs.readFileSync(path.join(__dirname, "..", "schemas", "file.schema.ts"), "utf8");
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

describe("#490 stream & unduh lampiran task", () => {
  it("/api/v1/files/secure-stream terdaftar di RUTE_PUBLIK server.ts", () => {
    expect(serverTs).toContain('"/api/v1/files/secure-stream"');
  });

  it("fileSecureStreamQuerySchema mendukung query download dan name", () => {
    expect(fileSchema).toContain("download:");
    expect(fileSchema).toContain("name:");
  });

  it("file.routes.ts menetapkan Content-Type dan Content-Disposition", () => {
    expect(fileRoutes).toContain('res.setHeader("Content-Type"');
    expect(fileRoutes).toContain("Content-Disposition");
    expect(fileRoutes).toContain("resolveContentType");
    expect(fileRoutes).toContain("525600");
  });

  it("TaskAttachmentsSection mendukung fallback icon dan parameter download=1", () => {
    expect(section).toContain("brokenImages");
    expect(section).toContain("download=1");
  });
});
