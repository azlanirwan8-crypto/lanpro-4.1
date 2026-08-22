import { getPgPool } from "../src/lib/db";
const q = async (l: string, s: string) => {
  try { console.log(l, JSON.stringify((await getPgPool().query(s)).rows)); }
  catch (e: any) { console.log(l, "ERR", e.message); }
};
(async () => {
  await q("suite.phase   :", `SELECT DISTINCT phase FROM "QATestSuites"`);
  await q("case.status   :", `SELECT DISTINCT status FROM "QATestCases"`);
  await q("case.tipeTest :", `SELECT DISTINCT "tipeTesting" FROM "QATestCases"`);
  await q("case.prioritas:", `SELECT DISTINCT prioritas FROM "QATestCases"`);
  process.exit(0);
})();
