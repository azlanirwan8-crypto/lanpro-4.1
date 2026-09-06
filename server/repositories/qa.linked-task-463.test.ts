import fs from "fs";
import path from "path";

const REPO = fs.readFileSync(path.join(__dirname, "qa.repository.ts"), "utf8");

describe("#463 QA linkedTaskId FK lunak", () => {
  it("create bug menulis linkedTaskId bersama linkedBugKey", () => {
    expect(REPO).toMatch(/linkedBugKey = \?, "linkedTaskId" = \?/s);
  });

  it("findLinked memakai linkedTaskId atau linkedBugKey", () => {
    expect(REPO).toMatch(/"linkedTaskId" = \?/);
    expect(REPO).toContain("linkedBugKey = ?");
  });

  it("mapRow mengekspos linkedTaskId", () => {
    expect(REPO).toMatch(/linkedTaskId:\s*row\.linkedTaskId/);
  });
});
