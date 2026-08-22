import { getPgPool } from "../src/lib/db";
(async () => {
  const r = await getPgPool().query(
    `SELECT title, type, category FROM "Documents" WHERE id='557b2ede-e1c8-46fc-ab2a-974e42230c0c'`);
  console.log("di basis data:", JSON.stringify(r.rows[0]));
  process.exit(0);
})();
