/**
 * #474 — cascade QA: QATestCaseExecutionLogs sebelum case/suite/module.
 */
import fs from "node:fs";
import path from "node:path";

const qa = fs.readFileSync(path.join(__dirname, "qa.repository.ts"), "utf8");
const modul = fs.readFileSync(path.join(__dirname, "project-module.repository.ts"), "utf8");

describe("#474 QA cascade execution logs", () => {
  it("deleteSuiteWithCases menghapus QATestCaseExecutionLogs dulu", () => {
    const mulai = qa.indexOf("async deleteSuiteWithCases");
    const selesai = qa.indexOf("async bulkUploadSuiteWithCases");
    const blok = qa.slice(mulai, selesai > mulai ? selesai : mulai + 1200);
    expect(blok).toContain("DELETE FROM QATestCaseExecutionLogs");
    expect(blok.indexOf("QATestCaseExecutionLogs")).toBeLessThan(
      blok.indexOf("DELETE FROM QATestCases")
    );
  });

  it("deleteTestCase menghapus logs sebelum case", () => {
    const mulai = qa.indexOf("async deleteTestCase");
    const selesai = qa.indexOf("async syncTestCases");
    const blok = qa.slice(mulai, selesai > mulai ? selesai : mulai + 800);
    expect(blok).toContain("DELETE FROM QATestCaseExecutionLogs");
    expect(blok).toContain('DELETE FROM QATestCaseExecutionLogs WHERE "testCaseId"');
    expect(blok.indexOf("QATestCaseExecutionLogs")).toBeLessThan(
      blok.indexOf("DELETE FROM QATestCases")
    );
  });

  it("deleteWithTestCases (modul) menghapus logs sebelum cases", () => {
    const mulai = modul.indexOf("async deleteWithTestCases");
    const blok = modul.slice(mulai, mulai + 900);
    expect(blok).toContain("DELETE FROM QATestCaseExecutionLogs");
    expect(blok.indexOf("QATestCaseExecutionLogs")).toBeLessThan(
      blok.indexOf("DELETE FROM QATestCases")
    );
  });
});
