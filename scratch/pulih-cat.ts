import { getPgPool } from "../src/lib/db";
(async () => {
  await getPgPool().query(`UPDATE "Projects" SET category='Agile' WHERE id='2SGXiPUTwHnF8D576hfO'`);
  console.table((await getPgPool().query(`SELECT name, status, category FROM "Projects"`)).rows);
  process.exit(0);
})().catch((e) => { console.error("GAGAL:", e.message); process.exit(1); });
