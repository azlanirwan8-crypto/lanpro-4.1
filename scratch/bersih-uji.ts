import { getPgPool } from "../src/lib/db";
(async () => {
  const p = getPgPool();
  await p.query(`DELETE FROM "MasterData" WHERE id='uji-140-e2e'`);
  const r = await p.query(`SELECT label, code FROM "MasterData" WHERE type='qa_phase' ORDER BY "order"`);
  console.log("qa_phase tersisa:", JSON.stringify(r.rows));
  process.exit(0);
})();
