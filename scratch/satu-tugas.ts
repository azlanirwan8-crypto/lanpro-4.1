import { getPgPool } from "../src/lib/db";
(async () => {
  const r = await getPgPool().query(
    `SELECT id, "taskKey", title, status FROM "Tasks" WHERE "projectId"='2SGXiPUTwHnF8D576hfO' ORDER BY "createdAt" LIMIT 3`);
  console.table(r.rows);
  process.exit(0);
})();
