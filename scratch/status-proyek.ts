import { getPgPool } from "../src/lib/db";
(async () => {
  const p = getPgPool();
  console.table((await p.query(`SELECT id, name, status FROM "Projects"`)).rows);
  console.table((await p.query(`SELECT DISTINCT status FROM "Projects"`)).rows);
  process.exit(0);
})().catch((e) => { console.error("GAGAL:", e.message); process.exit(1); });
