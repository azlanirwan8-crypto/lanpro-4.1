import { getPgPool } from "../src/lib/db";
(async () => {
  const r = await getPgPool().query(
    `SELECT resolution, release, category, environment, "projectRisk" FROM "Tasks" WHERE id='327ebd06-8be3-4ebb-b04b-32a01628c9b1'`);
  console.log("tersimpan di DB:", JSON.stringify(r.rows[0]));
  process.exit(0);
})();
