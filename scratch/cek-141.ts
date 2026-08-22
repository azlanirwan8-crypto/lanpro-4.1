import { getPgPool } from "../src/lib/db";
(async () => {
  const p = getPgPool();
  console.log("distinct Tasks.category :", JSON.stringify((await p.query(`SELECT DISTINCT category FROM "Tasks"`)).rows));
  console.log("distinct Tasks.type     :", JSON.stringify((await p.query(`SELECT DISTINCT type FROM "Tasks"`)).rows));
  const c = await p.query(`SELECT column_name FROM information_schema.columns WHERE table_name='Tasks' AND column_name IN ('issue_type','category','type')`);
  console.log("kolom terkait ada       :", c.rows.map((r: any) => r.column_name).join(", "));
  process.exit(0);
})();
