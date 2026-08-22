import { getPgPool } from "../src/lib/db";
const ID = "327ebd06-8be3-4ebb-b04b-32a01628c9b1";
(async () => {
  const p = getPgPool();
  console.log("environment tugas LAIN:",
    JSON.stringify((await p.query(`SELECT DISTINCT environment FROM "Tasks" WHERE id<>$1`, [ID])).rows));
  console.log("projectRisk tugas LAIN:",
    JSON.stringify((await p.query(`SELECT DISTINCT "projectRisk" FROM "Tasks" WHERE id<>$1`, [ID])).rows));
  process.exit(0);
})();
