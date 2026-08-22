import { getPgPool } from "../src/lib/db";
(async () => {
  const r = await getPgPool().query(
    `SELECT type, label FROM "MasterData" WHERE type IN ('project_status','methodology','surrounding','system','resolution') ORDER BY type, "order"`
  );
  console.table(r.rows);
  process.exit(0);
})().catch((e) => { console.error("GAGAL:", e.message); process.exit(1); });
