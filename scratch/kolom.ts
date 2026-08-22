import { getPgPool } from "../src/lib/db";
(async () => {
  for (const t of ["QATestSuites","QATestCases","Tasks"]) {
    const r = await getPgPool().query(
      `SELECT column_name FROM information_schema.columns WHERE table_name=$1 ORDER BY column_name`, [t]);
    console.log(t + ":", r.rows.map((x: any) => x.column_name).join(", "));
    console.log("");
  }
  process.exit(0);
})();
