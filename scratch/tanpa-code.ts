import { getPgPool } from "../src/lib/db";
(async () => {
  const r = await getPgPool().query(`SELECT type, label, code FROM "MasterData" WHERE code IS NULL OR code=''`);
  console.table(r.rows);
  process.exit(0);
})();
