/**
 * Test #497: Facebook-style Threaded Comments & parentId persistence
 *
 * Memastikan:
 * 1. pg-migrate.ts menyertakan migrasi ALTER TABLE "Comments" ADD COLUMN IF NOT EXISTS "parentId".
 * 2. taskRepository.createComment menyimpan parentId ke tabel Comments.
 * 3. task.routes.ts menerima parentId dari req.body dan menyertakannya di data kembalian.
 * 4. TaskCommentsSection.tsx mengelompokkan rootComments dan getReplies serta menyediakan inline reply input.
 */
import fs from "node:fs";
import path from "node:path";

describe("Item #497: Facebook-style Threaded Comments & parentId", () => {
  const migratePath = path.resolve(__dirname, "../../src/lib/pg-migrate.ts");
  const repoPath = path.resolve(__dirname, "../repositories/task.repository.ts");
  const routesPath = path.resolve(__dirname, "./task.routes.ts");
  const sectionPath = path.resolve(
    __dirname,
    "../../src/features/issues/components/modal/TaskCommentsSection.tsx"
  );

  const migrateContent = fs.readFileSync(migratePath, "utf8");
  const repoContent = fs.readFileSync(repoPath, "utf8");
  const routesContent = fs.readFileSync(routesPath, "utf8");
  const sectionContent = fs.readFileSync(sectionPath, "utf8");

  it("pg-migrate.ts memiliki migrasi kolom parentId pada tabel Comments", () => {
    expect(migrateContent).toContain(
      'ALTER TABLE "Comments" ADD COLUMN IF NOT EXISTS "parentId" VARCHAR(36);'
    );
  });

  it('taskRepository.createComment menyimpan parentId ke kolom "parentId"', () => {
    expect(repoContent).toContain(
      'INSERT INTO Comments (id, taskId, text, content, authorId, "parentId") VALUES (?, ?, ?, ?, ?, ?)'
    );
  });

  it("task.routes.ts menerima parentId dan mengembalikannya dalam respon", () => {
    expect(routesContent).toContain("const { authorId, parentId } = req.body;");
    expect(routesContent).toContain("parentId: parentId || null");
  });

  it("TaskCommentsSection.tsx mengelompokkan rootComments dan merender inline reply", () => {
    expect(sectionContent).toContain("const rootComments = comments.filter((c) => !c.parentId);");
    expect(sectionContent).toContain("const getReplies = (parentId: string)");
    expect(sectionContent).toContain("handleOpenReply");
    expect(sectionContent).toContain("handleSendReply");
  });
});
