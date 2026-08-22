import { getPgPool } from "../src/lib/db";
(async () => {
  const r = await getPgPool().query(
    `SELECT type, label, code, "order", color, icon FROM "MasterData"
      WHERE type IN ('sprint_status','qa_phase','qa_status','project_risk','resolution')
      ORDER BY type, "order"`);
  console.table(r.rows);
  const kosong = await getPgPool().query(`SELECT count(*)::int n FROM "MasterData" WHERE code IS NULL OR code=''`);
  console.log("baris tanpa code:", kosong.rows[0].n);
  process.exit(0);
})();
