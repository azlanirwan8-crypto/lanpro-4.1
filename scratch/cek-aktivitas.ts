import { getPgPool } from "../src/lib/db";
(async () => {
  const r = await getPgPool().query(`SELECT action, details FROM "ActivityLogs" ORDER BY "createdAt" DESC LIMIT 3`);
  console.table(r.rows);
  process.exit(0);
})();
