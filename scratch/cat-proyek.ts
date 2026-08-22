import { getPgPool } from "../src/lib/db";
(async () => {
  console.table((await getPgPool().query(`SELECT name, status, category, department FROM "Projects"`)).rows);
  process.exit(0);
})().catch((e) => { console.error("GAGAL:", e.message); process.exit(1); });
