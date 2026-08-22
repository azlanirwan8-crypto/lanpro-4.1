import { getPgPool } from "../src/lib/db";
const q = async (label: string, sql: string) => {
  try { const r = await getPgPool().query(sql); console.log(label, JSON.stringify(r.rows)); }
  catch (e: any) { console.log(label, "ERR", e.message); }
};
(async () => {
  await q("sprint.status     :", `SELECT DISTINCT status FROM "Sprints"`);
  await q("qa.suite phase    :", `SELECT DISTINCT "tipeTesting" FROM "QATestSuites"`);
  await q("qa.case status    :", `SELECT DISTINCT "executionStatus" FROM "QATestCases"`);
  await q("task.resolution   :", `SELECT DISTINCT resolution FROM "Tasks"`);
  await q("task.projectRisk  :", `SELECT DISTINCT "projectRisk" FROM "Tasks"`);
  process.exit(0);
})();
