import { getPgPool } from "../src/lib/db";
(async () => {
  const r = await getPgPool().query(`SELECT type, count(*)::int AS n FROM "MasterData" GROUP BY type ORDER BY type`);
  console.table(r.rows);
  process.exit(0);
})().catch((e) => { console.error("GAGAL:", e.message); process.exit(1); });
