import { getPgPool } from "../src/lib/db";
const ID = "327ebd06-8be3-4ebb-b04b-32a01628c9b1";
(async () => {
  const p = getPgPool();
  await p.query(
    `UPDATE "Tasks" SET resolution=NULL, release=NULL, category=NULL,
            environment=NULL, "projectRisk"='Low' WHERE id=$1`, [ID]);
  console.log("tugas uji:", JSON.stringify(
    (await p.query(`SELECT resolution, release, category, environment, "projectRisk" FROM "Tasks" WHERE id=$1`, [ID])).rows[0]));
  console.log("distinct projectRisk semua:", JSON.stringify(
    (await p.query(`SELECT DISTINCT "projectRisk" FROM "Tasks"`)).rows));
  process.exit(0);
})();
