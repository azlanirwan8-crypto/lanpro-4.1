/**
 * Test #496: Comment Author Resolution & Reply Feature
 *
 * Memastikan:
 * 1. taskRepository.getCommentsByTaskId melakukan JOIN ke tabel Users untuk authorName, authorAvatar, dan authorUsername.
 * 2. TaskCommentsSection.tsx meresolusi author dari projectMembers (id dan uid) serta fallback comment.authorName.
 * 3. TaskCommentsSection.tsx menyediakan tombol Reply dan indikator banner "Membalas".
 */
import fs from "node:fs";
import path from "node:path";

describe("Item #496: Comment Author Resolution & Reply Feature", () => {
  const repoPath = path.resolve(__dirname, "../repositories/task.repository.ts");
  const sectionPath = path.resolve(
    __dirname,
    "../../src/features/issues/components/modal/TaskCommentsSection.tsx"
  );

  const repoContent = fs.readFileSync(repoPath, "utf8");
  const sectionContent = fs.readFileSync(sectionPath, "utf8");

  it("taskRepository.getCommentsByTaskId melakukan JOIN ke Users untuk authorName dan authorAvatar", () => {
    expect(repoContent).toContain("LEFT JOIN Users u ON");
    expect(repoContent).toContain("authorName");
    expect(repoContent).toContain("authorAvatar");
    expect(repoContent).toContain("authorUsername");
  });

  it("TaskCommentsSection.tsx meresolusi author dengan uid dan id serta fallback authorName", () => {
    expect(sectionContent).toMatch(/m\.uid === comment\.authorId.*m\.id === comment\.authorId/);
    expect(sectionContent).toContain("authorDisplayName");
    expect(sectionContent).toContain("comment.authorName");
  });

  it("TaskCommentsSection.tsx memiliki fungsionalitas Reply dengan tombol dan banner balas", () => {
    expect(sectionContent).toContain("onReplyClick");
    expect(sectionContent).toContain("replyTo");
    expect(sectionContent).toContain("Membalas");
    expect(sectionContent).toContain("<span>Reply</span>");
  });
});
